// IronCore AI Service Worker — versioned cache with security hardening
const CACHE_VERSION = 2;
const CACHE_NAME = `ironcore-v${CACHE_VERSION}`;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate - clean up ALL old caches (version-based invalidation)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache. Only cache same-origin assets.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Only cache same-origin requests — skip all external/API requests
    if (url.origin !== self.location.origin) return;

    // Skip Firebase and API requests
    if (url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/__')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                });
            })
    );
});

// Push notification handling — sanitize all FCM payload fields
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data?.json() || {}; } catch { data = {}; }

    // Sanitize: cap string lengths and restrict URL to same origin
    const sanitize = (str, maxLen) => (typeof str === 'string' ? str.slice(0, maxLen) : '');
    const title = sanitize(data.title, 100) || 'IronCore AI';
    const body = sanitize(data.body, 200) || 'Time to get moving!';

    // Only allow relative URLs or same-origin — prevent open redirect
    let notifUrl = '/';
    if (typeof data.url === 'string') {
        try {
            const parsed = new URL(data.url, self.location.origin);
            if (parsed.origin === self.location.origin) notifUrl = parsed.pathname;
        } catch { notifUrl = '/'; }
    }

    const options = {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: { url: notifUrl },
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
