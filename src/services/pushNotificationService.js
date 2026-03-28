// Push Notification Service
// Setup and manage push notifications for workout reminders

import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, getMessagingInstance } from '../firebase';

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
    return 'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = () => {
    if (!isPushSupported()) return 'unsupported';
    return Notification.permission;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
    if (!isPushSupported()) {
        return { success: false, error: 'Push notifications not supported' };
    }

    try {
        const permission = await Notification.requestPermission();
        return {
            success: permission === 'granted',
            permission
        };
    } catch (error) {
        console.error('Error requesting permission:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Register service worker
 */
export const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
        return { success: false, error: 'Service worker not supported' };
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        // Service worker registered
        return { success: true, registration };
    } catch (error) {
        console.error('Service worker registration failed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check and request POST_NOTIFICATIONS permission on Android 13+ (Capacitor).
 * Returns true if permission is granted, false otherwise.
 */
const ensureNativeNotificationPermission = async () => {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            const pkg = '@capacitor/' + 'local-notifications';
            const { LocalNotifications } = await import(/* @vite-ignore */ pkg);
            const permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display !== 'granted') {
                const reqResult = await LocalNotifications.requestPermissions();
                return reqResult.display === 'granted';
            }
            return true;
        }
    } catch {
        // Capacitor plugins not available (web context) — fall through
    }
    return true; // Non-Android or web — permission handled elsewhere
};

/**
 * Show a local notification (doesn't require server)
 */
export const showLocalNotification = async (title, options = {}) => {
    try {
        // On Android 13+, check POST_NOTIFICATIONS permission via Capacitor
        const nativePermGranted = await ensureNativeNotificationPermission();
        if (!nativePermGranted) {
            return { success: false, error: 'Notification permission denied on Android' };
        }
    } catch (err) {
        console.warn('Native permission check failed:', err);
    }

    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        const result = await requestNotificationPermission();
        if (!result.success) return result;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            ...options,
        });
        return { success: true };
    } catch (error) {
        // Fallback to regular notification
        try {
            new Notification(title, options);
            return { success: true };
        } catch (err) {
            console.error('Notification failed:', err);
            return { success: false, error: err.message };
        }
    }
};

/**
 * Schedule a workout reminder
 */
export const scheduleWorkoutReminder = (hour, minute, message) => {
    // Store reminder preferences in localStorage
    let reminders = [];
    try {
        reminders = JSON.parse(localStorage.getItem('workoutReminders') || '[]');
    } catch { /* corrupted data — reset */ }
    const id = `reminder_${Date.now()}`;

    reminders.push({
        id,
        hour,
        minute,
        message: message || "Time to crush your workout! 💪",
        enabled: true,
        createdAt: new Date().toISOString(),
    });

    try { localStorage.setItem('workoutReminders', JSON.stringify(reminders)); } catch { /* private browsing / quota */ }

    // Set up check interval if not already running
    startReminderChecker();

    return { success: true, id };
};

/**
 * Remove a workout reminder
 */
export const removeWorkoutReminder = (id) => {
    const reminders = JSON.parse(localStorage.getItem('workoutReminders') || '[]');
    const filtered = reminders.filter(r => r.id !== id);
    localStorage.setItem('workoutReminders', JSON.stringify(filtered));
    return { success: true };
};

/**
 * Get all reminders
 */
export const getWorkoutReminders = () => {
    return JSON.parse(localStorage.getItem('workoutReminders') || '[]');
};

// Reminder checker interval
let reminderCheckInterval = null;
let lastCheckedMinute = -1;

/**
 * Start checking for reminder times
 */
export const startReminderChecker = () => {
    if (reminderCheckInterval) return;

    reminderCheckInterval = setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Only check once per minute
        if (currentMinute === lastCheckedMinute) return;
        lastCheckedMinute = currentMinute;

        const reminders = getWorkoutReminders();

        reminders.forEach(reminder => {
            if (reminder.enabled &&
                reminder.hour === currentHour &&
                reminder.minute === currentMinute) {
                showLocalNotification('Workout Reminder', {
                    body: reminder.message,
                    tag: reminder.id,
                });
            }
        });
    }, 30000); // Check every 30 seconds
};

/**
 * Stop reminder checker
 */
export const stopReminderChecker = () => {
    if (reminderCheckInterval) {
        clearInterval(reminderCheckInterval);
        reminderCheckInterval = null;
    }
};

/**
 * Register FCM token and save to Firestore for server-side push.
 * @param {string} userId - Firebase Auth UID
 * @returns {{ success: boolean, token?: string }}
 */
export const registerFCMToken = async (userId) => {
    if (!userId) return { success: false, error: 'No user ID' };

    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return { success: false, error: 'Messaging not supported' };

        const swReg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: swReg
        });

        if (token) {
            // Save token to Firestore — Cloud Functions read this to send push
            await setDoc(doc(db, 'users', userId, 'data', 'fcm'), {
                token,
                platform: navigator.userAgent.includes('Android') ? 'android' : 'web',
                updatedAt: new Date()
            }, { merge: true });

            return { success: true, token };
        }

        return { success: false, error: 'No token returned' };
    } catch (error) {
        console.warn('FCM registration failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Listen for foreground FCM messages and show as local notification.
 */
export const setupForegroundListener = async () => {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        return onMessage(messaging, (payload) => {
            const { title, body } = payload.notification || {};
            if (title) {
                showLocalNotification(title, {
                    body: body || '',
                    data: payload.data
                });
            }
        });
    } catch {
        return null;
    }
};

/**
 * Initialize push notifications.
 * Returns a cleanup function to tear down the reminder interval and FCM listener.
 */
export const initializePushNotifications = async () => {
    // Register service worker
    const swResult = await registerServiceWorker();
    if (!swResult.success) {
        console.warn('Service worker failed:', swResult.error);
    }

    // Start local reminder checker
    startReminderChecker();

    // Set up foreground FCM listener
    const unsubscribeFCM = await setupForegroundListener();

    const result = {
        supported: isPushSupported(),
        permission: getNotificationPermission(),
        serviceWorker: swResult.success,
    };

    // Return cleanup function for callers to invoke on unmount / logout
    result.cleanup = () => {
        stopReminderChecker();
        if (typeof unsubscribeFCM === 'function') unsubscribeFCM();
    };

    return result;
};
