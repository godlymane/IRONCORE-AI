import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Cloud Functions callable — the ONLY path to Gemini API.
// No direct API fallback. All AI calls go through server-side Cloud Functions.
let _callGeminiCF = null;
const getCallGeminiCF = () => {
  if (!_callGeminiCF) {
    const functions = getFunctions(getApp());
    _callGeminiCF = httpsCallable(functions, 'callGemini');
  }
  return _callGeminiCF;
};

// Lazy-init analyzeFood callable
let _analyzeFoodCF = null;
const getAnalyzeFoodCF = () => {
  if (!_analyzeFoodCF) {
    try {
      const functions = getFunctions(getApp());
      _analyzeFoodCF = httpsCallable(functions, 'analyzeFood');
    } catch (e) { console.debug('[helpers] Parse error:', e.message); }
  }
  return _analyzeFoodCF;
};

/**
 * Call Gemini via Cloud Function. All AI traffic goes through server-side functions
 * to keep API keys secure and enforce rate limiting.
 */
export const callGemini = async (userQuery, systemPrompt, imageBase64 = null, expectJson = false, retries = 0, feature = 'chat') => {
  const cf = getCallGeminiCF();
  try {
    const result = await cf({
      prompt: userQuery,
      systemPrompt,
      imageBase64,
      expectJson,
      feature,
    });
    return result.data.text;
  } catch (e) {
    if (e.code === 'functions/unauthenticated') return "Error: Not logged in.";
    if (e.code === 'functions/resource-exhausted') return "Error: Rate limit exceeded. Wait a moment.";

    // Retry on transient network errors
    if (retries < 2) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      return callGemini(userQuery, systemPrompt, imageBase64, expectJson, retries + 1, feature);
    }
    if (expectJson) {
      return JSON.stringify({ error: 'Network connection failed. Check your internet.' });
    }
    return "Error: AI service unavailable. Check your internet connection.";
  }
};

/**
 * Specialized caller for food analysis, using the new server-side Cloud Function.
 */
export const analyzeFood = async (mealText, imageBase64 = null, retries = 0) => {
  const cf = getAnalyzeFoodCF();
  try {
    const result = await cf({ mealText, imageBase64 });
    return result.data.text;
  } catch (e) {
    if (e.code === 'functions/unauthenticated') return "Error: Not logged in.";
    if (e.code === 'functions/resource-exhausted') return "Error: Rate limit exceeded. Wait a moment.";

    // Retry on transient errors
    if (retries < 2) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      return analyzeFood(mealText, imageBase64, retries + 1);
    }
    return JSON.stringify({ error: 'Food analysis unavailable. Check your internet.' });
  }
};

export const cleanAIResponse = (text) => {
  if (!text || typeof text !== 'string') return null;
  if (text.startsWith("Error:")) return null;

  try {
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');

    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    } else {
      return null;
    }

    return JSON.parse(clean);
  } catch (e) {
    console.warn("JSON Parse Failed:", e);
    return null;
  }
};

export const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
};

export const getLevel = (xp, levels) => {
  return levels.slice().reverse().find(l => xp >= l.min) || levels[0];
};

/**
 * Calculate forge streak — consecutive days with logged meals counting back from today.
 * @param {Array} meals - Array of meal objects, each with a `date` string (YYYY-MM-DD).
 * @returns {number} Number of consecutive days with meals.
 */
export const calculateForgeStreak = (meals) => {
  // Use local date to avoid UTC/DST timezone shift issues
  const now = new Date();
  const toLocalDateStr = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const today = toLocalDateStr(now);
  const dates = [...new Set(meals.map(m => m.date))].sort().reverse();
  let count = 0;
  // Start from midnight local time to ensure day-only comparison
  let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dates.includes(today)) checkDate.setDate(checkDate.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const dateStr = toLocalDateStr(checkDate);
    if (dates.includes(dateStr)) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
};
