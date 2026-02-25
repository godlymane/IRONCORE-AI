/**
 * Performance Monitor for AI Camera
 * Tracks inference FPS, detects sustained frame drops, and prompts
 * the user to switch to Manual Mode on low-end devices.
 *
 * Usage:
 *   const monitor = createPerformanceMonitor({ onLowFPS: () => {...} });
 *   // In your rAF loop after each inference:
 *   monitor.tick();
 *   // On unmount:
 *   monitor.destroy();
 */

const LOW_FPS_THRESHOLD = 10;
const SAMPLE_WINDOW = 30;        // frames to average over
const SUSTAINED_DROP_COUNT = 3;  // consecutive windows below threshold = trigger

/**
 * @param {{ onLowFPS: () => void }} opts
 */
export function createPerformanceMonitor({ onLowFPS }) {
    let timestamps = [];
    let lowWindows = 0;
    let triggered = false;
    let currentFPS = 0;

    return {
        /** Call once per inference frame */
        tick() {
            timestamps.push(performance.now());

            if (timestamps.length < SAMPLE_WINDOW) return;

            // Calculate average FPS over the window
            const oldest = timestamps[0];
            const newest = timestamps[timestamps.length - 1];
            const elapsed = (newest - oldest) / 1000; // seconds
            currentFPS = Math.round(SAMPLE_WINDOW / elapsed);

            // Reset window
            timestamps = [];

            if (currentFPS < LOW_FPS_THRESHOLD) {
                lowWindows++;
                if (lowWindows >= SUSTAINED_DROP_COUNT && !triggered) {
                    triggered = true;
                    onLowFPS();
                }
            } else {
                // Reset if we get a good window
                lowWindows = 0;
            }
        },

        /** @returns {number} Current measured FPS */
        getFPS() {
            return currentFPS;
        },

        /** Reset state (e.g. when restarting camera) */
        reset() {
            timestamps = [];
            lowWindows = 0;
            triggered = false;
            currentFPS = 0;
        },

        destroy() {
            timestamps = [];
        }
    };
}

// ── Performance Mode Persistence ──

const PERF_MODE_KEY = 'ironcore_performance_mode';

/** @typedef {'auto' | 'low_power' | 'manual'} PerformanceMode */

/** @returns {PerformanceMode} */
export function getPerformanceMode() {
    return localStorage.getItem(PERF_MODE_KEY) || 'auto';
}

/** @param {PerformanceMode} mode */
export function setPerformanceMode(mode) {
    localStorage.setItem(PERF_MODE_KEY, mode);
}
