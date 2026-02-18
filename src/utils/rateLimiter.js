/**
 * Client-side rate limiter for AI Coach requests.
 * Two layers:
 *   1. Debounce — min gap between consecutive requests (prevents spam)
 *   2. Daily cap — max AI calls per user per day (stored in localStorage)
 */

const STORAGE_KEY = 'ironcore_ai_usage';
const DAILY_CAP_FREE = 20;
const DAILY_CAP_PREMIUM = 100;
const MIN_REQUEST_GAP_MS = 1500; // 1.5s minimum between requests

let _lastRequestTime = 0;

const getUsageRecord = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveUsageRecord = (record) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage unavailable — skip persistence
  }
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

/**
 * Check if a request is allowed and record it if so.
 * @param {boolean} isPremium - Whether the user has a premium subscription
 * @returns {{ allowed: boolean, reason?: string, remaining?: number }}
 */
export const checkRateLimit = (isPremium = false) => {
  const now = Date.now();

  // Layer 1: Debounce check
  const gap = now - _lastRequestTime;
  if (gap < MIN_REQUEST_GAP_MS) {
    return { allowed: false, reason: 'Slow down — one request at a time.' };
  }

  // Layer 2: Daily cap
  const today = getTodayKey();
  const cap = isPremium ? DAILY_CAP_PREMIUM : DAILY_CAP_FREE;
  const record = getUsageRecord();

  let count = 0;
  if (record && record.date === today) {
    count = record.count || 0;
  }

  if (count >= cap) {
    const reset = isPremium ? 'Resets at midnight.' : 'Upgrade to Elite for 100 daily requests.';
    return {
      allowed: false,
      reason: `Daily AI limit reached (${cap} requests). ${reset}`,
      remaining: 0,
    };
  }

  // All clear — record the request
  _lastRequestTime = now;
  saveUsageRecord({ date: today, count: count + 1 });

  return { allowed: true, remaining: cap - count - 1 };
};

/**
 * Get current usage stats without recording a new request.
 * @param {boolean} isPremium
 * @returns {{ used: number, cap: number, remaining: number }}
 */
export const getUsageStats = (isPremium = false) => {
  const today = getTodayKey();
  const cap = isPremium ? DAILY_CAP_PREMIUM : DAILY_CAP_FREE;
  const record = getUsageRecord();

  const used = (record && record.date === today) ? (record.count || 0) : 0;
  return { used, cap, remaining: Math.max(0, cap - used) };
};
