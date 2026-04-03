/**
 * Offline Queue — stores pending server-only operations (XP, leaderboard, boss damage)
 * that couldn't run while offline. Replays them when connectivity returns.
 *
 * Firestore's persistentLocalCache handles doc writes (addDoc/setDoc) automatically.
 * This queue handles Cloud Function calls and multi-step operations that need the network.
 */

const STORAGE_KEY = 'ironcore_offline_queue';
const MAX_QUEUE_SIZE = 200;
const MAX_AGE_MS = 86400000; // 24 hours

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
    } catch (e) {
        // localStorage full — notify via callback if registered
        if (_onQueueError) _onQueueError('storage_full', 'Offline queue storage is full. Some workout data may not sync.');
    }
};

// Generate a unique idempotency key to prevent double-execution on replay
const generateIdempotencyKey = () =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Optional error/notification callback — set via registerQueueNotifier()
let _onQueueError = null;
let _onQueueDrop = null;

/**
 * Register callbacks for queue events (dropped ops, storage full, etc.)
 * @param {{ onDrop?: Function, onError?: Function }} callbacks
 */
export const registerQueueNotifier = ({ onDrop, onError } = {}) => {
    _onQueueDrop = onDrop || null;
    _onQueueError = onError || null;
};

/**
 * Add a pending operation to the offline queue.
 * @param {'xp_update'|'leaderboard_sync'|'boss_damage'} type
 * @param {Object} data - serializable payload for replay
 */
export const enqueueOfflineOp = (type, data) => {
    const queue = loadQueue();
    const idempotencyKey = generateIdempotencyKey();
    queue.push({ type, data, queuedAt: Date.now(), idempotencyKey });

    if (queue.length > MAX_QUEUE_SIZE) {
        const dropped = queue.shift();
        if (_onQueueDrop) {
            _onQueueDrop(dropped.type, `Offline queue full (${MAX_QUEUE_SIZE} ops). Oldest ${dropped.type} operation was dropped.`);
        }
    }
    saveQueue(queue);
};

/**
 * Replay all queued operations. Call this when connectivity is restored.
 * @param {Object} handlers - { xp_update, leaderboard_sync, boss_damage } async functions
 * @returns {{ replayed: number, dropped: number, failed: number }}
 */
export const replayOfflineQueue = async (handlers) => {
    const queue = loadQueue();
    if (queue.length === 0) return { replayed: 0, dropped: 0, failed: 0 };

    // Mark queue as being replayed to prevent double-replay
    saveQueue([{ _replaying: true }]);

    let replayed = 0;
    let dropped = 0;
    const failed = [];
    const processedKeys = new Set();

    for (const op of queue) {
        if (op._replaying) continue;

        // Stop replay if we've gone offline mid-replay
        if (!navigator.onLine) {
            failed.push(op);
            continue;
        }

        // Skip ops older than 24 hours — notify user about dropped stale data
        if (Date.now() - op.queuedAt > MAX_AGE_MS) {
            dropped++;
            if (_onQueueDrop) {
                _onQueueDrop(op.type, `A queued ${op.type} operation expired (older than 24h) and was discarded.`);
            }
            continue;
        }

        // Idempotency: skip if we already replayed this key in this batch
        if (op.idempotencyKey && processedKeys.has(op.idempotencyKey)) {
            continue;
        }

        const handler = handlers[op.type];
        if (!handler) continue;

        try {
            await handler(op.data, op.idempotencyKey);
            if (op.idempotencyKey) processedKeys.add(op.idempotencyKey);
            replayed++;
        } catch (err) {
            console.error(`Offline replay failed for ${op.type}:`, err);
            failed.push(op);
        }
    }

    // Always update queue: save failures for retry, or clear if all succeeded
    saveQueue(failed);

    return { replayed, dropped, failed: failed.length };
};

/**
 * @returns {number} Number of pending operations
 */
export const getQueueSize = () => loadQueue().filter(op => !op._replaying).length;
