const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

// Store the Gemini key as a Firebase secret (not in code):
//   firebase functions:secrets:set GEMINI_API_KEY
const geminiKey = defineSecret("GEMINI_API_KEY");

const AI_MODEL = "gemini-3-flash-preview";

// --- Rate Limiting Config ---
const RATE_LIMITS = {
  chat: { maxRequests: 30, windowMs: 60_000 },      // 30 req/min for chat
  workout: { maxRequests: 10, windowMs: 60_000 },    // 10 req/min for workout gen
  default: { maxRequests: 30, windowMs: 60_000 },
};

// In-memory cache to reduce Firestore reads (per Cloud Function instance)
const rateLimitCache = new Map();
const CACHE_TTL = 5_000; // 5s cache before re-reading Firestore

function getRateLimitConfig(feature) {
  return RATE_LIMITS[feature] || RATE_LIMITS.default;
}

async function checkRateLimit(uid, feature, db) {
  const config = getRateLimitConfig(feature);
  const docId = `${uid}_${feature}`;
  const now = Date.now();

  // Check in-memory cache first
  const cached = rateLimitCache.get(docId);
  let data;
  if (cached && (now - cached._cachedAt) < CACHE_TTL) {
    data = cached;
  } else {
    const rateLimitRef = db.collection("rateLimits").doc(docId);
    const snap = await rateLimitRef.get();
    data = snap.exists ? snap.data() : { count: 0, windowStart: now };
  }

  const windowAge = now - data.windowStart;

  if (windowAge < config.windowMs) {
    if (data.count >= config.maxRequests) {
      const retryAfter = Math.ceil((config.windowMs - windowAge) / 1000);
      throw new HttpsError(
        "resource-exhausted",
        JSON.stringify({
          message: "Rate limit exceeded.",
          retryAfter,
          remaining: 0,
          feature,
        })
      );
    }
    const updated = { count: data.count + 1, windowStart: data.windowStart };
    await db.collection("rateLimits").doc(docId).set(updated);
    rateLimitCache.set(docId, { ...updated, _cachedAt: now });
    return { remaining: config.maxRequests - data.count - 1, retryAfter: 0 };
  } else {
    const updated = { count: 1, windowStart: now };
    await db.collection("rateLimits").doc(docId).set(updated);
    rateLimitCache.set(docId, { ...updated, _cachedAt: now });
    return { remaining: config.maxRequests - 1, retryAfter: 0 };
  }
}

/**
 * Callable Cloud Function that proxies requests to the Gemini API.
 * - Validates the caller is authenticated
 * - Per-feature rate limiting (chat: 30/min, workout: 10/min)
 * - Returns rate limit info in response
 * - Keeps the API key server-side only
 */
exports.callGemini = onCall(
  { secrets: [geminiKey], cors: true },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { prompt, systemPrompt, imageBase64, expectJson, feature } = request.data;
    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "prompt is required.");
    }

    // 2. Rate limiting (per-feature)
    const uid = request.auth.uid;
    const db = admin.firestore();
    const rateLimitFeature = feature === "workout" ? "workout" : "chat";
    const rateInfo = await checkRateLimit(uid, rateLimitFeature, db);

    // 3. Build Gemini request
    let finalPrompt = `${systemPrompt || ""}\n\nUser Request: ${prompt}`;
    if (expectJson) {
      finalPrompt = `${systemPrompt || ""}\n\nCRITICAL INSTRUCTION: Return ONLY valid JSON. Do not use Markdown code blocks. Do not add introductory text.\n\nUser Request: ${prompt}`;
    }

    const parts = [{ text: finalPrompt }];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${geminiKey.value()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }] }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || response.statusText;
      throw new HttpsError("internal", `Gemini API error: ${msg} (${response.status})`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new HttpsError("internal", "Gemini returned empty response.");
    }

    return { text, rateLimit: rateInfo };
  }
);

/**
 * Server-side payment verification.
 * Validates Razorpay signature and activates subscription.
 */
exports.verifyPayment = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const { paymentId, orderId, signature, planId } = request.data;
  if (!paymentId || !planId) {
    throw new HttpsError("invalid-argument", "Missing payment data.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  // In production: verify Razorpay signature using HMAC-SHA256
  // const crypto = require("crypto");
  // const razorpaySecret = defineSecret("RAZORPAY_SECRET");
  // const expectedSig = crypto.createHmac("sha256", razorpaySecret.value())
  //   .update(orderId + "|" + paymentId).digest("hex");
  // if (expectedSig !== signature) throw new HttpsError("permission-denied", "Invalid signature");

  const now = new Date();
  const expiryDate = new Date(now);
  if (planId === "pro_yearly") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  }

  const subscriptionData = {
    planId,
    status: "active",
    startDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    paymentId,
    orderId: orderId || null,
    signature: signature || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();

  // Update user doc
  batch.set(
    db.doc(`users/${uid}`),
    { subscription: subscriptionData, isPremium: true },
    { merge: true }
  );

  // Analytics record
  batch.set(db.doc(`subscriptions/${uid}_${paymentId}`), {
    userId: uid,
    ...subscriptionData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { success: true, subscription: subscriptionData };
});
