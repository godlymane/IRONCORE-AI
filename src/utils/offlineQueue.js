/**
 * Offline Queue — stores pending server-only operations (XP, leaderboard, boss damage)
 * that couldn't run while offline. Replays them when connectivity returns.
 *
 * Firestore's persistentLocalCache handles doc writes (addDoc/setDoc) automatically.
 * This queue handles Cloud Function calls and multi-step operations that need the network.
 */

const STORAGE_KEY = 'ironcore_offline_queue';

const loadQueue = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveQueue = (queue) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
        // localStorage full or unavailable
    }
};

/**
 * Add a pending operation to the offline queue.
 * @param {'xp_update'|'leaderboard_sync'|'boss_damage'} type
 * @param {Object} data - serializable payload for replay
 */
export const enqueueOfflineOp = (type, data) => {
    const queue = loadQueue();
    queue.push({ type, data, queuedAt: Date.now() });
    // Cap at 50 entries to prevent localStorage bloat
    if (queue.length > 50) {
        console.warn('[offlineQueue] Queue full (50 ops) — dropping oldest entry:', queue[0]?.type);
        queue.shift();
    }
    saveQueue(queue);
};

/**
 * Replay all queued operations. Call this when connectivity is restored.
 * @param {Object} handlers - { xp_update, leaderboard_sync, boss_damage } async functions
 * @returns {number} count of successfully replayed operations
 */
export const replayOfflineQueue = async (handlers) => {
    const queue = loadQueue();
    if (queue.length === 0) return 0;

    // Mark queue as being replayed to prevent double-replay
    // (don't clear yet — if all ops fail we'd lose data)
    saveQueue([{ _replaying: true }]);

    let replayed = 0;
    const failed = [];

    for (const op of queue) {
        // Stop replay if we've gone offline mid-replay
        if (!navigator.onLine) {
            failed.push(op);
            continue;
        }

        // Skip ops older than 24 hours — stale data
        if (Date.now() - op.queuedAt > 86400000) continue;

        const handler = handlers[op.type];
        if (!handler) continue;

        try {
            await handler(op.data);
            replayed++;
        } catch (err) {
            console.error(`Offline replay failed for ${op.type}:`, err);
            failed.push(op);
        }
    }

    // Always update queue: save failures for retry, or clear if all succeeded
    saveQueue(failed);

    return replayed;
};

/**
 * @returns {number} Number of pending operations
 */
export const getQueueSize = () => loadQueue().length;
