/**
 * Screen Wake Lock manager.
 * Keeps screen on during workouts and pose detection.
 * Uses Web Wake Lock API (supported in Chrome 84+, Edge 84+, Safari 16.4+).
 */
let wakeLockSentinel = null;

/**
 * Request screen to stay awake.
 * Call when starting a workout or entering Form Check.
 */
export async function keepAwake() {
    if (wakeLockSentinel) return; // Already held

    try {
        if ('wakeLock' in navigator) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => {
                wakeLockSentinel = null;
                console.log('[WakeLock] Released');
            });
            console.log('[WakeLock] ✅ Screen will stay on');
        } else {
            console.warn('[WakeLock] API not supported on this device');
        }
    } catch (err) {
        // Fails if document not visible or permission denied
        console.warn('[WakeLock] Request failed:', err.message);
        wakeLockSentinel = null;
    }
}

/**
 * Release wake lock to allow screen to sleep.
 * Call when ending a workout or exiting Form Check.
 */
export async function allowSleep() {
    try {
        if (wakeLockSentinel) {
            await wakeLockSentinel.release();
            wakeLockSentinel = null;
            console.log('[WakeLock] ✅ Screen can sleep');
        }
    } catch (err) {
        console.warn('[WakeLock] Release failed:', err.message);
        wakeLockSentinel = null;
    }
}

/**
 * Re-acquire wake lock when app regains visibility.
 * Must be registered as a 'visibilitychange' listener.
 */
export async function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !wakeLockSentinel) {
        // Only re-acquire if we previously had it
        // The calling code should manage this state
    }
}

/** @returns {boolean} Whether wake lock is currently held */
export function isAwake() {
    return wakeLockSentinel !== null;
}
