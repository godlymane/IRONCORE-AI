const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");
const admin = require("firebase-admin");

admin.initializeApp();

// Store secrets via: firebase functions:secrets:set <SECRET_NAME>
const geminiKey = defineSecret("GEMINI_API_KEY");
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

// Apple App Store Server API (for iOS StoreKit 2 receipt validation)
// Set via: firebase functions:secrets:set APPLE_ISSUER_ID
// Set via: firebase functions:secrets:set APPLE_KEY_ID
// Set via: firebase functions:secrets:set APPLE_PRIVATE_KEY (base64-encoded .p8 file content)
// Set via: firebase functions:secrets:set APPLE_BUNDLE_ID
const appleIssuerId = defineSecret("APPLE_ISSUER_ID");
const appleKeyId = defineSecret("APPLE_KEY_ID");
const applePrivateKey = defineSecret("APPLE_PRIVATE_KEY");
const appleBundleId = defineSecret("APPLE_BUNDLE_ID");

const AI_MODEL = "gemini-3-flash-preview";

// --- Rate Limiting Config ---
const RATE_LIMITS = {
  chat: { maxRequests: 30, windowMs: 60_000 },      // 30 req/min for chat
  workout: { maxRequests: 10, windowMs: 60_000 },    // 10 req/min for workout gen
  nutrition: { maxRequests: 15, windowMs: 60_000 },  // 15 req/min for macro analysis
  activity: { maxRequests: 60, windowMs: 60_000 },   // 60 req/min for activity XP
  default: { maxRequests: 30, windowMs: 60_000 },
};

// In-memory cache to reduce Firestore reads (per Cloud Function instance)
const rateLimitCache = new Map();
const CACHE_TTL = 5_000; // 5s cache before re-reading Firestore
const CACHE_MAX_SIZE = 10_000; // Evict oldest entries when cache grows too large

// Evict stale entries periodically to prevent unbounded memory growth
function evictStaleCache() {
  if (rateLimitCache.size <= CACHE_MAX_SIZE) return;
  const now = Date.now();
  for (const [key, val] of rateLimitCache) {
    if (now - val._cachedAt > CACHE_TTL) rateLimitCache.delete(key);
    if (rateLimitCache.size <= CACHE_MAX_SIZE / 2) break;
  }
}

function getRateLimitConfig(feature) {
  return RATE_LIMITS[feature] || RATE_LIMITS.default;
}

async function checkRateLimit(uid, feature, db) {
  const config = getRateLimitConfig(feature);
  const docId = `${uid}_${feature}`;
  const now = Date.now();

  // Quick reject from in-memory cache (avoids Firestore read on obvious over-limit)
  const cached = rateLimitCache.get(docId);
  if (cached && (now - cached._cachedAt) < CACHE_TTL) {
    const windowAge = now - cached.windowStart;
    if (windowAge < config.windowMs && cached.count >= config.maxRequests) {
      const retryAfter = Math.ceil((config.windowMs - windowAge) / 1000);
      throw new HttpsError(
        "resource-exhausted",
        JSON.stringify({ message: "Rate limit exceeded.", retryAfter, remaining: 0, feature })
      );
    }
  }

  // Atomic read-check-write via transaction (prevents TOCTOU race)
  const rateLimitRef = db.collection("rateLimits").doc(docId);
  const result = await db.runTransaction(async (t) => {
    const snap = await t.get(rateLimitRef);
    const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
    const windowAge = now - data.windowStart;

    if (windowAge < config.windowMs) {
      if (data.count >= config.maxRequests) {
        const retryAfter = Math.ceil((config.windowMs - windowAge) / 1000);
        throw new HttpsError(
          "resource-exhausted",
          JSON.stringify({ message: "Rate limit exceeded.", retryAfter, remaining: 0, feature })
        );
      }
      const updated = { count: data.count + 1, windowStart: data.windowStart };
      t.set(rateLimitRef, updated);
      return { remaining: config.maxRequests - data.count - 1, retryAfter: 0, _cache: updated };
    } else {
      const updated = { count: 1, windowStart: now };
      t.set(rateLimitRef, updated);
      return { remaining: config.maxRequests - 1, retryAfter: 0, _cache: updated };
    }
  });

  // Update cache after successful transaction, evict stale if oversized
  rateLimitCache.set(docId, { ...result._cache, _cachedAt: now });
  evictStaleCache();
  return { remaining: result.remaining, retryAfter: result.retryAfter };
}

// --- AI Input Sanitization ---
// Strips common prompt injection patterns from user-supplied text.
// Not a perfect defense (nothing is against a determined attacker), but catches
// the obvious "ignore all previous instructions" class of attacks.
function sanitizeAiInput(text) {
  if (typeof text !== "string") return "";
  return text
    // Strip attempts to override system instructions
    .replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, "[filtered]")
    .replace(/disregard\s+(all\s+)?(previous|above|prior)\s+/gi, "[filtered]")
    .replace(/you\s+are\s+now\s+(a|an)\s+/gi, "[filtered]")
    .replace(/new\s+instructions?:\s*/gi, "[filtered]")
    .replace(/system\s*prompt\s*:/gi, "[filtered]")
    .replace(/act\s+as\s+(a|an|if)\s+/gi, "[filtered]")
    .replace(/roleplay\s+as\s+/gi, "[filtered]")
    .replace(/pretend\s+(to\s+be|you\s*are)\s+/gi, "[filtered]")
    .replace(/forget\s+(about\s+)?(everything|all|your)\s+/gi, "[filtered]")
    .replace(/override\s+(all\s+)?(safety|rules|guidelines)\s*/gi, "[filtered]")
    .replace(/bypass\s+(all\s+)?(safety|rules|filters)\s*/gi, "[filtered]")
    .replace(/break\s+character/gi, "[filtered]")
    // Strip control characters (keep printable + whitespace)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Limit consecutive newlines (common padding attack)
    .replace(/\n{5,}/g, "\n\n\n\n");
}

// --- Daily AI Call Limit Config ---
const FREE_AI_CALLS_PER_DAY = 3;

/**
 * Enforce the daily free AI call limit for non-premium users.
 * Premium users bypass this entirely.
 * Returns { remaining: number, isPremium: boolean }
 */
async function checkDailyAiLimit(uid, db) {
  const counterRef = db.doc(`aiCallCounters/${uid}`);
  const counterSnap = await counterRef.get();

  if (!counterSnap.exists) {
    // First ever AI call — check if user is premium from their profile
    const userSnap = await db.doc(`users/${uid}`).get();
    const isPremium = userSnap.exists && userSnap.data().isPremium === true;

    // Initialize the counter doc
    await counterRef.set({
      callsUsedToday: 1,
      isPremium,
      lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { remaining: isPremium ? Infinity : FREE_AI_CALLS_PER_DAY - 1, isPremium };
  }

  const data = counterSnap.data();

  // Re-validate premium status from source of truth (user profile)
  const userSnap = await db.doc(`users/${uid}`).get();
  const isPremium = userSnap.exists && userSnap.data().isPremium === true;

  // Sync if premium status changed
  if (isPremium !== (data.isPremium === true)) {
    await counterRef.update({ isPremium });
  }

  // Premium users have unlimited calls
  if (isPremium) {
    await counterRef.update({
      callsUsedToday: admin.firestore.FieldValue.increment(1),
    });
    return { remaining: Infinity, isPremium: true };
  }

  // Free user — enforce limit
  const used = data.callsUsedToday || 0;
  if (used >= FREE_AI_CALLS_PER_DAY) {
    throw new HttpsError(
      "resource-exhausted",
      JSON.stringify({
        message: `Daily AI limit reached (${FREE_AI_CALLS_PER_DAY} free calls/day). Upgrade to Premium for unlimited.`,
        remaining: 0,
        dailyLimit: FREE_AI_CALLS_PER_DAY,
        isPremium: false,
      })
    );
  }

  // Increment counter
  await counterRef.update({
    callsUsedToday: admin.firestore.FieldValue.increment(1),
  });

  return { remaining: FREE_AI_CALLS_PER_DAY - used - 1, isPremium: false };
}

/**
 * Callable Cloud Function that proxies requests to the Gemini API.
 * - Validates the caller is authenticated
 * - Enforces daily free AI call limit (3/day for free, unlimited for premium)
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
    // Input size limits — prevent abuse via oversized payloads
    if (prompt.length > 10000) {
      throw new HttpsError("invalid-argument", "Prompt too long (max 10,000 chars).");
    }
    if (systemPrompt && systemPrompt.length > 5000) {
      throw new HttpsError("invalid-argument", "System prompt too long (max 5,000 chars).");
    }
    // Base64 encodes 3 bytes as 4 chars; estimate binary size
    if (imageBase64 && (imageBase64.length * 3) / 4 > 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image too large (max 5MB).");
    }

    // 2. Daily AI call limit (free: 3/day, premium: unlimited)
    const uid = request.auth.uid;
    const db = admin.firestore();
    const dailyInfo = await checkDailyAiLimit(uid, db);

    // 3. Rate limiting (per-feature, requests/minute)
    const rateLimitFeature = feature === "workout" ? "workout" : "chat";
    const rateInfo = await checkRateLimit(uid, rateLimitFeature, db);

    // 4. Sanitize user input — strip injection attempts
    const sanitizedPrompt = sanitizeAiInput(prompt);
    const sanitizedSystem = systemPrompt ? sanitizeAiInput(systemPrompt) : "";

    // 5. Build Gemini request
    let finalPrompt = `${sanitizedSystem}\n\nUser Request: ${sanitizedPrompt}`;
    if (expectJson) {
      finalPrompt = `${sanitizedSystem}\n\nCRITICAL INSTRUCTION: Return ONLY valid JSON. Do not use Markdown code blocks. Do not add introductory text.\n\nUser Request: ${sanitizedPrompt}`;
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

    return {
      text,
      rateLimit: rateInfo,
      dailyLimit: {
        remaining: dailyInfo.remaining,
        total: FREE_AI_CALLS_PER_DAY,
        isPremium: dailyInfo.isPremium,
      },
    };
  }
);

/**
 * Callable Cloud Function specifically for food macro analysis using Gemini Vision.
 * Keeps the specialized prompt and API key server-side.
 */
exports.analyzeFood = onCall(
  { secrets: [geminiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { mealText, imageBase64 } = request.data;
    if (!mealText && !imageBase64) {
      throw new HttpsError("invalid-argument", "Either mealText or imageBase64 must be provided.");
    }
    // Input size limits
    if (mealText && mealText.length > 1000) {
      throw new HttpsError("invalid-argument", "Meal text too long (max 1,000 chars).");
    }
    if (imageBase64 && (imageBase64.length * 3) / 4 > 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image too large (max 5MB).");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const dailyInfo = await checkDailyAiLimit(uid, db);
    const rateInfo = await checkRateLimit(uid, "nutrition", db);

    const systemPrompt = "Nutrition API. JSON Only.";
    // Sanitize user-supplied meal text
    const safeMealText = mealText ? sanitizeAiInput(mealText) : "";
    let prompt;

    if (imageBase64) {
      prompt = `Act as an expert nutritionist AI. Analyze this image with EXTREME precision. Identify all visible ingredients, estimate exact portion sizes (in grams or ml), account for likely cooking oils or hidden sauces, and calculate the exact macronutrients. Return JSON: { "mealName": "string (detailed description)", "calories": number, "protein": number, "carbs": number, "fat": number }. Make educated but highly precise estimations down to the gram.`;
    } else {
      prompt = `Act as an expert nutritionist AI. For the meal "${safeMealText}", estimate exact portion sizes, account for likely cooking oils or hidden sauces, and calculate the exact macronutrients. Return JSON: { "mealName": "string", "calories": number, "protein": number, "carbs": number, "fat": number }. Make educated but highly precise estimations down to the gram.`;
    }

    const finalPrompt = `${systemPrompt}\n\nCRITICAL INSTRUCTION: Return ONLY valid JSON. Do not use Markdown code blocks. Do not add introductory text.\n\nUser Request: ${prompt}`;

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

    return {
      text,
      rateLimit: rateInfo,
      dailyLimit: {
        remaining: dailyInfo.remaining,
        total: FREE_AI_CALLS_PER_DAY,
        isPremium: dailyInfo.isPremium,
      },
    };
  }
);

/**
 * Create a Razorpay order server-side.
 * Returns the order ID for the client to use in checkout.
 */
const VALID_PLANS = {
  pro_monthly:   { amount: 79900,  currency: "INR" }, // ₹799 in paise
  pro_yearly:    { amount: 499900, currency: "INR" }, // ₹4,999 in paise
  elite_monthly: { amount: 139900, currency: "INR" }, // ₹1,399 in paise
  elite_yearly:  { amount: 799900, currency: "INR" }, // ₹7,999 in paise
};

// Derive tier from planId
function getTierFromPlan(planId) {
  if (!planId || planId === "free") return "free";
  if (planId.startsWith("elite")) return "elite";
  if (planId.startsWith("pro")) return "pro";
  return "free";
}

exports.createRazorpayOrder = onCall(
  { secrets: [razorpayKeyId, razorpayKeySecret], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { planId } = request.data;
    const plan = VALID_PLANS[planId];
    if (!plan) {
      throw new HttpsError("invalid-argument", "Invalid plan.");
    }

    const auth = Buffer.from(
      `${razorpayKeyId.value()}:${razorpayKeySecret.value()}`
    ).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: plan.currency,
        receipt: `${request.auth.uid}_${planId}_${Date.now()}`,
        notes: { userId: request.auth.uid, planId },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new HttpsError(
        "internal",
        `Razorpay order creation failed: ${err.error?.description || response.statusText}`
      );
    }

    const order = await response.json();

    // Store order in Firestore for verification later
    const db = admin.firestore();
    await db.doc(`orders/${order.id}`).set({
      userId: request.auth.uid,
      planId,
      amount: plan.amount,
      currency: plan.currency,
      razorpayOrderId: order.id,
      status: "created",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      orderId: order.id,
      amount: plan.amount,
      currency: plan.currency,
    };
  }
);

/**
 * Server-side payment verification.
 * Validates Razorpay HMAC-SHA256 signature, then activates subscription.
 */
exports.verifyPayment = onCall(
  { secrets: [razorpayKeySecret], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { paymentId, orderId, signature } = request.data;
    if (!paymentId || !orderId || !signature) {
      throw new HttpsError("invalid-argument", "Missing payment verification data.");
    }

    // 1. Verify Razorpay signature (HMAC-SHA256)
    const expectedSig = crypto
      .createHmac("sha256", razorpayKeySecret.value())
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(signature, 'hex'))) {
      throw new HttpsError("permission-denied", "Invalid payment signature.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // 2. Verify the order belongs to this user
    const orderDoc = await db.doc(`orders/${orderId}`).get();
    if (!orderDoc.exists || orderDoc.data().userId !== uid) {
      throw new HttpsError("permission-denied", "Order does not belong to this user.");
    }

    // 3. Prevent replay — check order hasn't already been activated
    if (orderDoc.data().status === "paid") {
      throw new HttpsError("already-exists", "This payment has already been processed.");
    }

    // 4. Activate subscription — read planId from server-side order doc, not client input
    const serverPlanId = orderDoc.data().planId || "pro_monthly";
    const tier = getTierFromPlan(serverPlanId);
    const now = new Date();
    const expiryDate = new Date(now);
    if (serverPlanId.endsWith("_yearly")) {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const subscriptionData = {
      planId: serverPlanId,
      tier,
      status: "active",
      startDate: now.toISOString(),
      expiryDate: expiryDate.toISOString(),
      paymentId,
      orderId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = db.batch();

    // Mark order as paid
    batch.update(db.doc(`orders/${orderId}`), {
      status: "paid",
      paymentId,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user profile with subscription
    batch.set(
      db.doc(`users/${uid}`),
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );

    // Also update the nested profile doc that useFitnessData reads
    batch.set(
      db.doc(`users/${uid}/data/profile`),
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
  }
);

/**
 * Start a 7-day Elite free trial for first-time subscribers.
 * Only grants trial if user has never had a subscription before.
 */
exports.startFreeTrial = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Check if user has ever had a subscription (prevent trial abuse)
    const profileDoc = await db.doc(`users/${uid}/data/profile`).get();
    const profileData = profileDoc.exists ? profileDoc.data() : {};

    if (profileData.subscription && profileData.subscription.status !== 'expired'
        && profileData.subscription.status !== undefined) {
      throw new HttpsError("already-exists", "You already have an active subscription.");
    }

    // Check if user ever had a trial
    if (profileData.hadTrial) {
      throw new HttpsError("already-exists", "Free trial already used.");
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);

    const subscriptionData = {
      planId: "elite_monthly",
      tier: "elite",
      status: "trial",
      startDate: now.toISOString(),
      trialEnd: trialEnd.toISOString(),
      expiryDate: trialEnd.toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = db.batch();

    batch.set(
      db.doc(`users/${uid}`),
      { subscription: subscriptionData, isPremium: true, hadTrial: true },
      { merge: true }
    );

    batch.set(
      db.doc(`users/${uid}/data/profile`),
      { subscription: subscriptionData, isPremium: true, hadTrial: true },
      { merge: true }
    );

    batch.set(db.doc(`subscriptions/${uid}_trial`), {
      userId: uid,
      ...subscriptionData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true, subscription: subscriptionData };
  }
);

/**
 * Generate a JWT for Apple App Store Server API authentication.
 * Uses ES256 (P-256) signing with the private key from App Store Connect.
 * https://developer.apple.com/documentation/appstoreserverapi/generating_tokens_for_api_requests
 */
function generateAppleJWT(issuerId, keyId, privateKeyBase64) {
  const privateKeyPem = Buffer.from(privateKeyBase64, "base64").toString("utf8");

  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 3600, // 1 hour
    aud: "appstoreconnect-v1",
    bid: appleBundleId.value(),
  };

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  sign.end();

  // Sign and convert DER to raw r||s (64 bytes) for ES256 JWT
  const derSig = sign.sign({ key: privateKeyPem, dsaEncoding: "ieee-p1363" });
  const signatureB64 = Buffer.from(derSig).toString("base64url");

  return `${signingInput}.${signatureB64}`;
}

/**
 * Decode and verify a JWS signed transaction from Apple.
 * Returns the decoded transaction payload if the bundle ID matches.
 * In production, you should also verify the x5c certificate chain.
 */
function decodeAppleJWS(signedTransaction) {
  const crypto = require("crypto");
  const parts = signedTransaction.split(".");
  if (parts.length !== 3) {
    throw new HttpsError("invalid-argument", "Invalid JWS format.");
  }

  // Decode header to extract x5c certificate chain
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

  // Verify x5c certificate chain exists
  if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length === 0) {
    throw new HttpsError("invalid-argument", "Missing x5c certificate chain in JWS header.");
  }

  // Extract the leaf (signing) certificate from the x5c chain
  const leafCertPem = `-----BEGIN CERTIFICATE-----\n${header.x5c[0]}\n-----END CERTIFICATE-----`;

  // Verify the JWS signature using the leaf certificate's public key
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], "base64url");

  const verify = crypto.createVerify("SHA256");
  verify.update(signingInput);
  const isValid = verify.verify(leafCertPem, signature);

  if (!isValid) {
    throw new HttpsError("invalid-argument", "JWS signature verification failed — receipt is not authentic.");
  }

  // Verify the leaf certificate was issued by Apple (check issuer CN)
  const x509 = new crypto.X509Certificate(leafCertPem);
  if (!x509.issuer.includes("Apple")) {
    throw new HttpsError("invalid-argument", "JWS certificate not issued by Apple.");
  }

  // Check certificate hasn't expired
  if (new Date(x509.validTo) < new Date()) {
    throw new HttpsError("invalid-argument", "JWS signing certificate has expired.");
  }

  return payload;
}

/**
 * Verify Apple App Store receipt (iOS StoreKit 2).
 * Called by the iOS app after a successful StoreKit purchase.
 *
 * SECURITY: This function calls Apple's App Store Server API to verify the
 * transaction is real before activating the subscription. Never trust
 * client-supplied transaction data alone.
 *
 * Input: { transactionId, originalTransactionId, productId }
 * Flow:
 * 1. Generate JWT for Apple API auth
 * 2. GET /inApps/v1/transactions/{transactionId} from Apple
 * 3. Decode the signed transaction JWS
 * 4. Verify bundleId + productId match our app
 * 5. Write subscription data to Firestore
 */
exports.verifyAppleReceipt = onCall(
  { secrets: [appleIssuerId, appleKeyId, applePrivateKey, appleBundleId], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { transactionId, originalTransactionId, productId } = request.data;
    if (!transactionId || !productId) {
      throw new HttpsError("invalid-argument", "Missing transaction data.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // Map Apple product IDs to our plan IDs
    const APPLE_PRODUCT_MAP = {
      "pro_monthly": "pro_monthly",
      "pro_yearly": "pro_yearly",
    };

    const planId = APPLE_PRODUCT_MAP[productId];
    if (!planId) {
      throw new HttpsError("invalid-argument", "Unknown product ID.");
    }

    // Prevent replay — check if this transaction was already processed
    const existingDoc = await db.doc(`subscriptions/${uid}_apple_${transactionId}`).get();
    if (existingDoc.exists && existingDoc.data().status === "active") {
      throw new HttpsError("already-exists", "This transaction has already been processed.");
    }

    // --- STEP 1: Verify transaction with Apple's App Store Server API ---
    const jwt = generateAppleJWT(
      appleIssuerId.value(),
      appleKeyId.value(),
      applePrivateKey.value()
    );

    // Use production URL; fall back to sandbox if 404
    const appleBaseUrls = [
      "https://api.storekit.itunes.apple.com",   // Production
      "https://api.storekit-sandbox.itunes.apple.com", // Sandbox
    ];

    let appleTransaction = null;

    for (const baseUrl of appleBaseUrls) {
      const url = `${baseUrl}/inApps/v1/transactions/${transactionId}`;
      const appleResponse = await fetch(url, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (appleResponse.status === 200) {
        const appleData = await appleResponse.json();
        // Apple returns { signedTransactionInfo: "JWS..." }
        if (!appleData.signedTransactionInfo) {
          throw new HttpsError("internal", "Apple returned no signed transaction.");
        }
        appleTransaction = decodeAppleJWS(appleData.signedTransactionInfo);
        break;
      } else if (appleResponse.status === 404) {
        // Transaction not found at this environment, try next
        continue;
      } else {
        const errBody = await appleResponse.text().catch(() => "");
        throw new HttpsError(
          "internal",
          `Apple API error: ${appleResponse.status} ${errBody}`
        );
      }
    }

    if (!appleTransaction) {
      throw new HttpsError(
        "not-found",
        "Transaction not found in Apple's system. Invalid or expired transaction."
      );
    }

    // --- STEP 2: Validate the transaction belongs to our app ---
    if (appleTransaction.bundleId !== appleBundleId.value()) {
      throw new HttpsError(
        "permission-denied",
        "Transaction bundle ID does not match our app."
      );
    }

    if (appleTransaction.productId !== productId) {
      throw new HttpsError(
        "permission-denied",
        "Transaction product ID does not match claimed product."
      );
    }

    // --- STEP 3: Extract real dates from Apple's verified transaction ---
    const purchaseDate = new Date(appleTransaction.purchaseDate || appleTransaction.originalPurchaseDate);
    const expiryDate = appleTransaction.expiresDate
      ? new Date(appleTransaction.expiresDate)
      : (() => {
        const d = new Date(purchaseDate);
        if (planId === "pro_yearly") d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1);
        return d;
      })();

    // Check subscription hasn't already expired
    if (expiryDate < new Date()) {
      throw new HttpsError(
        "failed-precondition",
        "This subscription has already expired."
      );
    }

    // --- STEP 4: Activate subscription in a TRANSACTION (prevents replay race) ---
    const subscriptionData = {
      planId,
      status: "active",
      startDate: purchaseDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      paymentId: `apple_${transactionId}`,
      orderId: `apple_${originalTransactionId || appleTransaction.originalTransactionId || transactionId}`,
      platform: "ios",
      verifiedByServer: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const subDocRef = db.doc(`subscriptions/${uid}_apple_${transactionId}`);

    await db.runTransaction(async (transaction) => {
      // Re-check replay inside transaction to prevent concurrent activation
      const replayCheck = await transaction.get(subDocRef);
      if (replayCheck.exists && replayCheck.data().status === "active") {
        throw new HttpsError("already-exists", "This transaction has already been processed.");
      }

      // Same 3 writes as verifyPayment — unified data model
      transaction.set(
        db.doc(`users/${uid}`),
        { subscription: subscriptionData, isPremium: true },
        { merge: true }
      );

      transaction.set(
        db.doc(`users/${uid}/data/profile`),
        { subscription: subscriptionData, isPremium: true },
        { merge: true }
      );

      transaction.set(subDocRef, {
        userId: uid,
        ...subscriptionData,
        appleTransactionId: String(appleTransaction.transactionId),
        appleOriginalTransactionId: String(appleTransaction.originalTransactionId),
        appleEnvironment: appleTransaction.environment || "unknown",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { success: true, subscription: subscriptionData };
  }
);


// ════════════════════════════════════════════════════════════════════════════
// ANTI-CHEAT ENGINE — Biomechanical Validation
// ════════════════════════════════════════════════════════════════════════════
//
// Validates that submitted workout data is physically possible.
// Used by the PvP battle system before awarding XP/Elo.
//
// Validation checks:
//   1. Form score range (0-100)
//   2. Rep count within biomechanical limits per exercise
//   3. Duration sanity check (reps vs time)
//   4. Historical anomaly detection (sudden 10x improvement = suspicious)
// ════════════════════════════════════════════════════════════════════════════

// Maximum plausible reps per set for each exercise category.
// Based on elite-level performance + reasonable buffer.
// Any submission exceeding these is flagged as cheating.
const REP_LIMITS = {
  // Compound lifts — heavy, fatiguing
  "Barbell Squat": 50,
  "Leg Press": 60,
  "Bulgarian Split Squat": 30,
  "Romanian Deadlift": 40,
  "Bench Press": 50,
  "Incline Bench Press": 50,
  "Overhead Press": 40,
  "Deadlift": 30,
  "Barbell Row": 40,
  "Dips": 60,

  // Isolation — lighter, more reps possible
  "Leg Extension": 80,
  "Hamstring Curl": 80,
  "Calf Raise": 100,
  "Lateral Raise": 60,
  "Tricep Extension": 80,
  "Face Pull": 60,
  "Dumbbell Curl": 60,
  "Hammer Curl": 60,

  // Bodyweight — high rep potential
  "Push Up": 150,
  "Pull Up": 50,
  "Lat Pulldown": 60,
  "Plank": 1,      // 1 rep = 1 hold
  "Crunches": 200,

  // Default for unknown exercises
  _default: 100,
};

/**
 * Validate a single workout submission for anti-cheat.
 * Returns { valid: boolean, reason?: string }
 */
function validateWorkoutSubmission(submission) {
  const { exercise, reps, formScore, durationSeconds } = submission;

  // 1. Form score must be 0-100
  if (typeof formScore !== "number" || formScore < 0 || formScore > 100) {
    return { valid: false, reason: `Invalid form score: ${formScore}. Must be 0-100.` };
  }

  // 2. Reps must be positive integer within biomechanical limits
  if (typeof reps !== "number" || reps < 0 || !Number.isInteger(reps)) {
    return { valid: false, reason: `Invalid reps: ${reps}. Must be a positive integer.` };
  }

  const maxReps = REP_LIMITS[exercise] || REP_LIMITS._default;
  if (reps > maxReps) {
    return { valid: false, reason: `${reps} reps of ${exercise} exceeds maximum (${maxReps}).` };
  }

  // 3. Duration sanity: at least 0.5 second per rep (even explosive moves)
  if (typeof durationSeconds === "number" && durationSeconds > 0) {
    const minSeconds = Math.max(reps * 0.5, 5); // At least 0.5s per rep, min 5s total
    if (durationSeconds < minSeconds) {
      return { valid: false, reason: `Duration ${durationSeconds}s too short for ${reps} reps.` };
    }
  }

  // 4. Exercise name must be a non-empty string
  if (typeof exercise !== "string" || exercise.length === 0 || exercise.length > 200) {
    return { valid: false, reason: "Invalid exercise name." };
  }

  return { valid: true };
}

/**
 * Check for historical anomalies — if a user suddenly submits 10x their
 * usual performance, flag it. Uses their last 10 battle submissions.
 * Returns { suspicious: boolean, reason?: string }
 */
async function checkHistoricalAnomaly(db, userId, currentScore) {
  const recentBattles = await db.collectionGroup("submissions")
    .where("userId", "==", userId)
    .orderBy("submittedAt", "desc")
    .limit(10)
    .get();

  if (recentBattles.empty || recentBattles.size < 3) {
    // Not enough history to judge — allow it
    return { suspicious: false };
  }

  const scores = recentBattles.docs.map(doc => doc.data().performanceScore || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Flag if current score is > 3x their historical average
  if (avgScore > 0 && currentScore > avgScore * 3) {
    return {
      suspicious: true,
      reason: `Score ${currentScore} is ${(currentScore / avgScore).toFixed(1)}x historical average (${avgScore.toFixed(0)}).`,
    };
  }

  return { suspicious: false };
}


// ════════════════════════════════════════════════════════════════════════════
// ELO RATING SYSTEM
// ════════════════════════════════════════════════════════════════════════════
//
// Standard Elo with adaptive K-factor:
//   K=32 for new players (< 30 matches) — fast calibration
//   K=16 for veterans (>= 30 matches) — stable ratings
//
// Starting Elo: 1200 (same as chess.com default)
// ════════════════════════════════════════════════════════════════════════════

const ELO_START = 1200;
const ELO_K_NEW = 32;      // < 30 matches
const ELO_K_VETERAN = 16;  // >= 30 matches
const ELO_NEW_THRESHOLD = 30;

/**
 * Calculate new Elo ratings for two players after a match.
 * @param {number} ratingA - Player A's current Elo
 * @param {number} ratingB - Player B's current Elo
 * @param {number} scoreA - 1 = A wins, 0 = A loses, 0.5 = draw
 * @param {number} matchesA - Total matches played by A
 * @param {number} matchesB - Total matches played by B
 * @returns {{ newRatingA: number, newRatingB: number, deltaA: number, deltaB: number }}
 */
function calculateElo(ratingA, ratingB, scoreA, matchesA, matchesB) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;

  const kA = matchesA < ELO_NEW_THRESHOLD ? ELO_K_NEW : ELO_K_VETERAN;
  const kB = matchesB < ELO_NEW_THRESHOLD ? ELO_K_NEW : ELO_K_VETERAN;

  const deltaA = Math.round(kA * (scoreA - expectedA));
  const deltaB = Math.round(kB * (scoreB - expectedB));

  return {
    newRatingA: Math.max(100, ratingA + deltaA), // Floor at 100
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  };
}


// ════════════════════════════════════════════════════════════════════════════
// LEAGUE SYSTEM — XP thresholds (mirrors client-side constants.js)
// ════════════════════════════════════════════════════════════════════════════

const LEAGUES = [
  { name: "Iron Novice", minXp: 0 },
  { name: "Bronze", minXp: 1000 },
  { name: "Silver", minXp: 2500 },
  { name: "Gold", minXp: 5000 },
  { name: "Platinum", minXp: 10000 },
  { name: "Diamond", minXp: 25000 },
];

function getLeagueForXp(xp) {
  return LEAGUES.slice().reverse().find(l => xp >= l.minXp) || LEAGUES[0];
}

// XP rewards for PvP battles
const XP_WIN = 150;
const XP_LOSS = 30;    // Participation reward
const XP_DRAW = 75;


// ════════════════════════════════════════════════════════════════════════════
// submitBattleWorkout — Callable Cloud Function
// ════════════════════════════════════════════════════════════════════════════
//
// Called by each player after completing their PvP workout.
// Flow:
//   1. Validate the submission (anti-cheat)
//   2. Calculate performance score
//   3. Store in battles/{battleId}/submissions/{userId}
//   4. If BOTH players have submitted → resolve the battle in a transaction
//      (determine winner, update Elo, award XP, update leaderboard)
// ════════════════════════════════════════════════════════════════════════════

exports.submitBattleWorkout = onCall(
  { cors: true },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const { battleId, exercise, reps, formScore, durationSeconds } = request.data;

    // 2. Input validation
    if (!battleId || typeof battleId !== "string") {
      throw new HttpsError("invalid-argument", "battleId is required.");
    }

    const submission = { exercise, reps, formScore, durationSeconds };
    const validation = validateWorkoutSubmission(submission);
    if (!validation.valid) {
      throw new HttpsError("invalid-argument", `Anti-cheat: ${validation.reason}`);
    }

    const db = admin.firestore();

    // 3. Verify battle exists and caller is a participant
    const battleRef = db.doc(`battles/${battleId}`);
    const battleSnap = await battleRef.get();

    if (!battleSnap.exists) {
      throw new HttpsError("not-found", "Battle not found.");
    }

    const battle = battleSnap.data();
    const isChallenger = battle.challenger.userId === uid;
    const isOpponent = battle.opponent.userId === uid;

    if (!isChallenger && !isOpponent) {
      throw new HttpsError("permission-denied", "You are not a participant in this battle.");
    }

    if (battle.status !== "accepted" && battle.status !== "active") {
      throw new HttpsError("failed-precondition", `Battle is '${battle.status}', not active.`);
    }

    // 4. Check for duplicate submission
    const submissionRef = db.doc(`battles/${battleId}/submissions/${uid}`);
    const existingSubmission = await submissionRef.get();
    if (existingSubmission.exists) {
      throw new HttpsError("already-exists", "You have already submitted for this battle.");
    }

    // 5. Calculate performance score
    //    Formula: (formScore * 0.6) + (normalizedReps * 0.4) — 0-100 scale
    //    Form quality weighs more than raw volume (encourages good technique)
    const maxReps = REP_LIMITS[exercise] || REP_LIMITS._default;
    const normalizedReps = Math.min((reps / maxReps) * 100, 100);
    const performanceScore = Math.round(formScore * 0.6 + normalizedReps * 0.4);

    // 6. Historical anomaly check
    const anomaly = await checkHistoricalAnomaly(db, uid, performanceScore);
    const flagged = anomaly.suspicious;

    // 7. Write submission
    const submissionData = {
      userId: uid,
      exercise,
      reps,
      formScore,
      durationSeconds: durationSeconds || null,
      performanceScore,
      flagged,
      flagReason: flagged ? anomaly.reason : null,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await submissionRef.set(submissionData);

    // 8. Check if both players have submitted
    const otherUid = isChallenger ? battle.opponent.userId : battle.challenger.userId;
    const otherSubmissionRef = db.doc(`battles/${battleId}/submissions/${otherUid}`);
    const otherSubmissionSnap = await otherSubmissionRef.get();

    if (!otherSubmissionSnap.exists) {
      // Waiting for opponent — battle stays active
      await battleRef.update({ status: "active" });
      return {
        success: true,
        performanceScore,
        flagged,
        waitingForOpponent: true,
        message: "Submission recorded. Waiting for opponent.",
      };
    }

    // ════════════════════════════════════════════════════════════
    // BOTH PLAYERS SUBMITTED — Resolve battle in a TRANSACTION
    // ════════════════════════════════════════════════════════════

    const otherSubmission = otherSubmissionSnap.data();

    // If either submission is flagged, don't award rewards yet
    if (flagged || otherSubmission.flagged) {
      await battleRef.update({
        status: "under_review",
        reviewReason: flagged ? anomaly.reason : otherSubmission.flagReason,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        performanceScore,
        flagged: true,
        message: "Battle under review — anomalous performance detected.",
      };
    }

    // Determine scores
    const myScore = performanceScore;
    const theirScore = otherSubmission.performanceScore;

    const challengerUid = battle.challenger.userId;
    const opponentUid = battle.opponent.userId;
    const challengerScore = isChallenger ? myScore : theirScore;
    const opponentScore = isChallenger ? theirScore : myScore;

    // Run the full resolution in a Firestore Transaction
    const result = await db.runTransaction(async (transaction) => {
      // Re-read battle to ensure it hasn't been resolved already
      const battleDoc = await transaction.get(battleRef);
      if (battleDoc.data().status === "completed") {
        throw new HttpsError("already-exists", "Battle already resolved.");
      }

      // Read both player documents
      const challengerRef = db.doc(`users/${challengerUid}`);
      const opponentRef = db.doc(`users/${opponentUid}`);
      const [challengerDoc, opponentDoc] = await Promise.all([
        transaction.get(challengerRef),
        transaction.get(opponentRef),
      ]);

      const challengerData = challengerDoc.data() || {};
      const opponentData = opponentDoc.data() || {};

      // Current Elo ratings (default to starting Elo)
      const challengerElo = challengerData.eloRating || ELO_START;
      const opponentElo = opponentData.eloRating || ELO_START;
      const challengerMatches = (challengerData.wins || 0) + (challengerData.losses || 0);
      const opponentMatches = (opponentData.wins || 0) + (opponentData.losses || 0);

      // Determine winner
      let winnerId = null;
      let eloScoreChallenger; // 1 = win, 0 = loss, 0.5 = draw

      if (challengerScore > opponentScore) {
        winnerId = challengerUid;
        eloScoreChallenger = 1;
      } else if (opponentScore > challengerScore) {
        winnerId = opponentUid;
        eloScoreChallenger = 0;
      } else {
        winnerId = null; // Draw
        eloScoreChallenger = 0.5;
      }

      // Calculate new Elo
      const elo = calculateElo(
        challengerElo, opponentElo,
        eloScoreChallenger,
        challengerMatches, opponentMatches
      );

      // XP awards
      const challengerXp = winnerId === challengerUid ? XP_WIN
        : winnerId === null ? XP_DRAW : XP_LOSS;
      const opponentXp = winnerId === opponentUid ? XP_WIN
        : winnerId === null ? XP_DRAW : XP_LOSS;

      const newChallengerXp = (challengerData.xp || 0) + challengerXp;
      const newOpponentXp = (opponentData.xp || 0) + opponentXp;

      // Update battle document
      transaction.update(battleRef, {
        status: "completed",
        winnerId,
        challengerScore,
        opponentScore,
        challengerEloDelta: elo.deltaA,
        opponentEloDelta: elo.deltaB,
        challengerXpAwarded: challengerXp,
        opponentXpAwarded: opponentXp,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update challenger — also track weeklyXpContribution for Guild Wars
      const challengerUpdates = {
        eloRating: elo.newRatingA,
        xp: newChallengerXp,
        league: getLeagueForXp(newChallengerXp).name,
        weeklyXpContribution: admin.firestore.FieldValue.increment(challengerXp),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (winnerId === challengerUid) {
        challengerUpdates.wins = (challengerData.wins || 0) + 1;
      } else if (winnerId !== null) {
        challengerUpdates.losses = (challengerData.losses || 0) + 1;
      }
      // Forge Shield: grant 1 shield per 500 XP milestone (max 3)
      const challengerOldXp = challengerData.xp || 0;
      const challengerOldMilestone = Math.floor(challengerOldXp / 500);
      const challengerNewMilestone = Math.floor(newChallengerXp / 500);
      if (challengerNewMilestone > challengerOldMilestone) {
        const shieldsToGrant = challengerNewMilestone - challengerOldMilestone;
        const currentShields = challengerData.forgeShields || 0;
        const newShields = Math.min(3, currentShields + shieldsToGrant);
        if (newShields > currentShields) {
          challengerUpdates.forgeShields = newShields;
        }
      }
      transaction.update(challengerRef, challengerUpdates);

      // Update opponent — also track weeklyXpContribution for Guild Wars
      const opponentUpdates = {
        eloRating: elo.newRatingB,
        xp: newOpponentXp,
        league: getLeagueForXp(newOpponentXp).name,
        weeklyXpContribution: admin.firestore.FieldValue.increment(opponentXp),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (winnerId === opponentUid) {
        opponentUpdates.wins = (opponentData.wins || 0) + 1;
      } else if (winnerId !== null) {
        opponentUpdates.losses = (opponentData.losses || 0) + 1;
      }
      // Forge Shield: grant 1 shield per 500 XP milestone (max 3)
      const opponentOldXp = opponentData.xp || 0;
      const opponentOldMilestone = Math.floor(opponentOldXp / 500);
      const opponentNewMilestone = Math.floor(newOpponentXp / 500);
      if (opponentNewMilestone > opponentOldMilestone) {
        const shieldsToGrant = opponentNewMilestone - opponentOldMilestone;
        const currentShields = opponentData.forgeShields || 0;
        const newShields = Math.min(3, currentShields + shieldsToGrant);
        if (newShields > currentShields) {
          opponentUpdates.forgeShields = newShields;
        }
      }
      transaction.update(opponentRef, opponentUpdates);

      // Update leaderboard entries (server-authoritative)
      const challengerLeaderboardRef = db.doc(`leaderboard/${challengerUid}`);
      const opponentLeaderboardRef = db.doc(`leaderboard/${opponentUid}`);

      transaction.set(challengerLeaderboardRef, {
        username: challengerData.username || "Unknown",
        xp: newChallengerXp,
        level: challengerData.level || 1,
        league: challengerUpdates.league,
        eloRating: elo.newRatingA,
        avatarUrl: challengerData.avatarUrl || "",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(opponentLeaderboardRef, {
        username: opponentData.username || "Unknown",
        xp: newOpponentXp,
        level: opponentData.level || 1,
        league: opponentUpdates.league,
        eloRating: elo.newRatingB,
        avatarUrl: opponentData.avatarUrl || "",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        winnerId,
        challengerScore,
        opponentScore,
        challengerEloDelta: elo.deltaA,
        opponentEloDelta: elo.deltaB,
        challengerXpAwarded: challengerXp,
        opponentXpAwarded: opponentXp,
      };
    });

    return {
      success: true,
      performanceScore: myScore,
      flagged: false,
      waitingForOpponent: false,
      battleResult: result,
      message: result.winnerId
        ? `Battle complete! Winner: ${result.winnerId === uid ? "You" : "Opponent"}`
        : "Battle complete! It's a draw!",
    };
  }
);


// ════════════════════════════════════════════════════════════════════════════
// dealBossDamage — Server-authoritative community boss damage
// ════════════════════════════════════════════════════════════════════════════
//
// Replaces the client-side updateBossProgress. Validates damage amount
// and updates the boss HP within a transaction.
// ════════════════════════════════════════════════════════════════════════════

exports.dealBossDamage = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { damage } = request.data;
    const uid = request.auth.uid;

    if (typeof damage !== "number" || damage < 1 || damage > 10000 || !Number.isInteger(damage)) {
      throw new HttpsError("invalid-argument", "Damage must be an integer 1-10000.");
    }

    const db = admin.firestore();
    const bossRef = db.doc("community_boss/current");

    const result = await db.runTransaction(async (transaction) => {
      const bossDoc = await transaction.get(bossRef);

      if (!bossDoc.exists) {
        throw new HttpsError("not-found", "No active community boss.");
      }

      const data = bossDoc.data();
      if (data.status === "defeated") {
        throw new HttpsError("failed-precondition", "Boss is already defeated.");
      }

      const currentHP = data.currentHP || data.totalHP;
      const newHP = Math.max(0, currentHP - damage);
      const isDefeated = newHP === 0;

      // Update contributors
      const contributors = data.contributors || [];
      const existingIdx = contributors.findIndex(c => c.userId === uid);

      if (existingIdx >= 0) {
        contributors[existingIdx].damageDealt += damage;
      } else {
        // Fetch username from user doc
        const userDoc = await transaction.get(db.doc(`users/${uid}`));
        const username = userDoc.exists ? (userDoc.data().username || "Unknown") : "Unknown";
        contributors.push({
          userId: uid,
          username,
          damageDealt: damage,
          joinedAt: new Date().toISOString(),
          claimedXP: false,
        });
      }

      const updates = {
        currentHP: newHP,
        contributors,
        lastDamageAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (isDefeated) {
        updates.status = "defeated";
        updates.defeatedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      transaction.update(bossRef, updates);
      return { newHP, defeated: isDefeated };
    });

    return { success: true, ...result };
  }
);


// ════════════════════════════════════════════════════════════════════════════
// SCHEDULED FUNCTIONS (Cron Jobs)
// ════════════════════════════════════════════════════════════════════════════


// ── Daily Reset: Free AI Calls ────────────────────────────────────────────
//
// Runs every day at 00:00 UTC.
// Resets the daily AI call counter for all non-premium users to 0.
// Premium users are unaffected (they have unlimited calls).
//
// Collection: aiCallCounters/{userId}
// Fields:
//   - callsUsedToday: number (incremented by callGemini, reset here)
//   - lastResetAt: timestamp
//   - isPremium: boolean (set by subscription flow)
// ──────────────────────────────────────────────────────────────────────────

exports.dailyResetAiCalls = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    const db = admin.firestore();

    // Query all non-premium AI call counters
    const countersSnap = await db.collection("aiCallCounters")
      .where("isPremium", "==", false)
      .get();

    if (countersSnap.empty) {
      console.log("[dailyResetAiCalls] No non-premium counters to reset.");
      return;
    }

    // Batch reset — Firestore batches support up to 500 writes
    const batchSize = 500;
    const docs = countersSnap.docs;
    let resetCount = 0;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      for (const doc of chunk) {
        batch.update(doc.ref, {
          callsUsedToday: 0,
          lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        resetCount++;
      }

      await batch.commit();
    }

    console.log(`[dailyResetAiCalls] Reset ${resetCount} non-premium AI call counters.`);
  }
);


// ── Weekly Guild Challenge Tally ──────────────────────────────────────────
//
// Runs every Monday at 00:00 UTC.
// Tallies each guild's total workout XP earned during the past week,
// ranks guilds, and writes results to guilds/{guildId}/challenges/{weekId}.
//
// Flow:
//   1. Get all guilds
//   2. For each guild, sum the XP earned by all members in the past 7 days
//   3. Rank guilds by total XP
//   4. Award bonus XP to top 3 guild members
//   5. Archive the weekly challenge results
// ──────────────────────────────────────────────────────────────────────────

exports.weeklyGuildChallengeTally = onSchedule(
  {
    schedule: "every monday 00:00",
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekId = `week_${now.toISOString().slice(0, 10)}`;

    // 1. Get all guilds
    const guildsSnap = await db.collection("guilds").get();

    if (guildsSnap.empty) {
      console.log("[weeklyGuildTally] No guilds found.");
      return;
    }

    const guildResults = [];

    // 2. For each guild, calculate member XP earned this week
    //    Batch member IDs into chunks of 30 (Firestore 'in' limit) to minimize queries
    for (const guildDoc of guildsSnap.docs) {
      const guild = guildDoc.data();
      const members = guild.members || [];

      if (members.length === 0) continue;

      let totalXp = 0;
      const memberContributions = [];

      // Extract member IDs
      const memberIds = members
        .map(m => typeof m === "string" ? m : m.userId)
        .filter(Boolean);

      if (memberIds.length === 0) continue;

      // Query battles in chunks of 30 using 'in' operator (Firestore limit)
      const CHUNK_SIZE = 30;
      for (let i = 0; i < memberIds.length; i += CHUNK_SIZE) {
        const chunk = memberIds.slice(i, i + CHUNK_SIZE);

        const [challengerSnap, opponentSnap] = await Promise.all([
          db.collection("battles")
            .where("challenger.userId", "in", chunk)
            .where("status", "==", "completed")
            .where("completedAt", ">=", weekAgo)
            .get(),
          db.collection("battles")
            .where("opponent.userId", "in", chunk)
            .where("status", "==", "completed")
            .where("completedAt", ">=", weekAgo)
            .get()
        ]);

        // Aggregate per-member XP from this chunk
        const memberXpMap = {};
        for (const b of challengerSnap.docs) {
          const d = b.data();
          const uid = d.challenger.userId;
          memberXpMap[uid] = (memberXpMap[uid] || 0) + (d.challengerXpAwarded || 0);
        }
        for (const b of opponentSnap.docs) {
          const d = b.data();
          const uid = d.opponent.userId;
          memberXpMap[uid] = (memberXpMap[uid] || 0) + (d.opponentXpAwarded || 0);
        }

        for (const [uid, xp] of Object.entries(memberXpMap)) {
          totalXp += xp;
          if (xp > 0) memberContributions.push({ userId: uid, xpEarned: xp });
        }
      }

      guildResults.push({
        guildId: guildDoc.id,
        guildName: guild.name || "Unknown Guild",
        ownerId: guild.ownerId,
        memberCount: members.length,
        totalXp,
        memberContributions,
      });
    }

    // 3. Rank guilds by total XP
    guildResults.sort((a, b) => b.totalXp - a.totalXp);

    // 4. Award bonus XP to top 3 guild members
    const GUILD_BONUS_XP = [500, 300, 150]; // 1st, 2nd, 3rd place guild bonuses

    for (let rank = 0; rank < Math.min(3, guildResults.length); rank++) {
      const guild = guildResults[rank];
      if (guild.totalXp === 0) continue; // Don't reward inactive guilds

      const bonusXp = GUILD_BONUS_XP[rank];

      // Award bonus to each contributing member via batched writes
      const memberIds = guild.memberContributions.map(c => c.userId);
      for (let i = 0; i < memberIds.length; i += 250) {
        const batch = db.batch();
        const chunk = memberIds.slice(i, i + 250);

        for (const memberId of chunk) {
          const userRef = db.doc(`users/${memberId}`);
          batch.update(userRef, {
            xp: admin.firestore.FieldValue.increment(bonusXp),
            weeklyXpContribution: admin.firestore.FieldValue.increment(bonusXp),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const leaderRef = db.doc(`leaderboard/${memberId}`);
          batch.set(leaderRef, {
            xp: admin.firestore.FieldValue.increment(bonusXp),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }

        await batch.commit();
      }

      guild.bonusXpAwarded = bonusXp;
      guild.rank = rank + 1;
    }

    // 5. Archive results to each guild's challenges subcollection
    const archiveBatchSize = 500;
    for (let i = 0; i < guildResults.length; i += archiveBatchSize) {
      const batch = db.batch();
      const chunk = guildResults.slice(i, i + archiveBatchSize);

      for (const guild of chunk) {
        const challengeRef = db.doc(`guilds/${guild.guildId}/challenges/${weekId}`);
        batch.set(challengeRef, {
          weekId,
          weekEnding: now.toISOString(),
          totalXp: guild.totalXp,
          memberCount: guild.memberCount,
          memberContributions: guild.memberContributions,
          rank: guild.rank || null,
          bonusXpAwarded: guild.bonusXpAwarded || 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    }

    console.log(
      `[weeklyGuildTally] Processed ${guildResults.length} guilds. ` +
      `Top guild: ${guildResults[0]?.guildName || "N/A"} with ${guildResults[0]?.totalXp || 0} XP.`
    );
  }
);


// ════════════════════════════════════════════════
// ACCOUNT RECOVERY — Web3 Player Card Auth
// ════════════════════════════════════════════════
exports.recoverAccount = onCall(async (request) => {
  const { phrase } = request.data || {};

  if (!phrase || typeof phrase !== "string") {
    throw new HttpsError("invalid-argument", "Recovery phrase is required.");
  }

  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) {
    throw new HttpsError("invalid-argument", "Recovery phrase must be exactly 12 words.");
  }

  // Rate limit by IP — max 5 attempts per hour (skip if IP unavailable)
  const db = admin.firestore();
  const ip = request.rawRequest?.ip;
  const now = Date.now();

  if (ip) {
    const rateLimitRef = db.collection("rateLimits").doc(`recovery_${ip}`);
    await db.runTransaction(async (t) => {
      const snap = await t.get(rateLimitRef);
      const data = snap.exists ? snap.data() : { count: 0, windowStart: now };
      if (now - data.windowStart < 3600000) {
        if (data.count >= 5) {
          throw new HttpsError("resource-exhausted", "Too many recovery attempts. Try again later.");
        }
        t.set(rateLimitRef, { count: data.count + 1, windowStart: data.windowStart });
      } else {
        t.set(rateLimitRef, { count: 1, windowStart: now });
      }
    });
  }

  // Hash the phrase (same algorithm as client-side)
  const normalized = words.join(" ");
  const phraseHash = crypto.createHash("sha256").update(normalized).digest("hex");

  // Search users/{uid}/data/profile for matching phraseHash
  const usersSnap = await db.collectionGroup("data")
    .where("phraseHash", "==", phraseHash)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    throw new HttpsError("not-found", "No account matches this recovery phrase.");
  }

  const matchedDoc = usersSnap.docs[0];
  // Path: users/{uid}/data/profile — extract uid
  const uid = matchedDoc.ref.parent.parent.id;
  const username = matchedDoc.data().username || "unknown";

  // Mint a custom auth token
  const token = await admin.auth().createCustomToken(uid);

  return { token, username };
});

// ─── LOGIN WITH USERNAME + PIN ─────────────────────────────────────
exports.loginWithPin = onCall(async (request) => {
  const { username, pin, pinHash: legacyPinHash } = request.data || {};

  // Validate inputs
  if (!username || typeof username !== "string" || username.length < 3 || username.length > 20) {
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }
  // Accept either raw PIN (new) or pre-hashed PIN (legacy clients)
  const rawPin = pin ? String(pin) : null;
  if (!rawPin && (!legacyPinHash || typeof legacyPinHash !== "string" || legacyPinHash.length !== 64)) {
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }
  if (rawPin && (rawPin.length < 4 || rawPin.length > 8)) {
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }

  const db = admin.firestore();
  const normalizedUsername = username.toLowerCase().replace(/^@/, "").trim();
  const now = Date.now();

  // Rate limit by IP — max 5 attempts per hour (skip if IP unavailable to avoid shared-bucket DoS)
  const ip = request.rawRequest?.ip;
  if (ip) {
    const ipRef = db.collection("rateLimits").doc(`loginpin_ip_${ip}`);
    await db.runTransaction(async (t) => {
      const ipSnap = await t.get(ipRef);
      const d = ipSnap.exists ? ipSnap.data() : { count: 0, windowStart: now };
      if (now - d.windowStart < 3600000) {
        if (d.count >= 5) {
          throw new HttpsError("resource-exhausted", "Too many login attempts. Try again later.");
        }
        t.set(ipRef, { count: d.count + 1, windowStart: d.windowStart });
      } else {
        t.set(ipRef, { count: 1, windowStart: now });
      }
    });
  }

  // Rate limit by username — max 10 attempts per hour (transaction-safe)
  const userRef = db.collection("rateLimits").doc(`loginpin_u_${normalizedUsername}`);
  await db.runTransaction(async (t) => {
    const userSnap = await t.get(userRef);
    const d = userSnap.exists ? userSnap.data() : { count: 0, windowStart: now };
    if (now - d.windowStart < 3600000) {
      if (d.count >= 10) {
        throw new HttpsError("resource-exhausted", "Too many login attempts. Try again later.");
      }
      t.set(userRef, { count: d.count + 1, windowStart: d.windowStart });
    } else {
      t.set(userRef, { count: 1, windowStart: now });
    }
  });

  // Look up username → uid
  const usernameDoc = await db.collection("usernames").doc(normalizedUsername).get();
  if (!usernameDoc.exists) {
    console.warn(`[loginWithPin] Username not found: "${normalizedUsername}"`);
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }

  const uid = usernameDoc.data().uid;
  console.log(`[loginWithPin] Found uid=${uid} for username="${normalizedUsername}"`);

  // Fetch profile and compare pinHash
  const profileDoc = await db.doc(`users/${uid}/data/profile`).get();
  if (!profileDoc.exists || !profileDoc.data().pinHash) {
    console.warn(`[loginWithPin] Profile missing or no pinHash for uid=${uid}, exists=${profileDoc.exists}, hasPinHash=${!!profileDoc.data()?.pinHash}`);
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }

  const storedPinHash = profileDoc.data().pinHash;
  console.log(`[loginWithPin] Stored hash type: ${storedPinHash.startsWith("v2:") ? "v2-PBKDF2" : "v1-SHA256"}, length=${storedPinHash.length}`);

  // Verify PIN — supports both v1 (plain SHA-256) and v2 (PBKDF2+salt)
  let pinValid = false;
  try {
    if (storedPinHash.startsWith("v2:")) {
      // v2 PBKDF2 verification — requires raw PIN
      if (!rawPin) {
        console.warn(`[loginWithPin] v2 hash but no rawPin provided`);
        throw new HttpsError("not-found", "Invalid username or PIN.");
      }
      const parts = storedPinHash.split(":");
      if (parts.length < 3) {
        console.warn(`[loginWithPin] Malformed v2 hash: ${parts.length} parts`);
        throw new HttpsError("not-found", "Invalid username or PIN.");
      }
      const [, saltHex, expectedHex] = parts;
      const salt = Buffer.from(saltHex, "hex");
      const derived = crypto.pbkdf2Sync(rawPin, salt, 100000, 32, "sha256");
      pinValid = crypto.timingSafeEqual(derived, Buffer.from(expectedHex, "hex"));
      console.log(`[loginWithPin] v2 verification result: ${pinValid}`);
    } else {
      // v1 legacy — plain SHA-256 comparison
      const inputHash = rawPin
        ? crypto.createHash("sha256").update(rawPin).digest("hex")
        : legacyPinHash;
      const a = Buffer.from(inputHash, "hex");
      const b = Buffer.from(storedPinHash, "hex");
      pinValid = a.length === b.length && crypto.timingSafeEqual(a, b);
      console.log(`[loginWithPin] v1 verification result: ${pinValid}, inputLen=${a.length}, storedLen=${b.length}`);
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error(`[loginWithPin] PIN verify error:`, e.message);
    pinValid = false;
  }

  if (!pinValid) {
    console.warn(`[loginWithPin] PIN mismatch for uid=${uid}`);
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }

  // Mint custom token
  const token = await admin.auth().createCustomToken(uid);
  return { token, username: profileDoc.data().username || normalizedUsername };
});

/**
 * Scheduled: check for expired subscriptions and revoke premium access.
 * Runs daily at 01:00 UTC. Queries subscriptions where expiryDate < now
 * and status is active, then marks the user as non-premium.
 */
exports.checkExpiredSubscriptions = onSchedule(
  { schedule: "0 1 * * *", timeZone: "UTC" },
  async () => {
    const db = admin.firestore();
    const now = new Date().toISOString();

    // Query both active and trial subscriptions that have expired
    const activeSnap = await db
      .collection("subscriptions")
      .where("status", "in", ["active", "trial"])
      .where("expiryDate", "<=", now)
      .get();

    if (activeSnap.empty) {
      console.log("[checkExpiredSubscriptions] No expired subscriptions found.");
      return;
    }

    // Process in batches of 150 (3 writes per sub × 150 = 450, under Firestore's 500 limit)
    const BATCH_SIZE = 150;
    const docs = activeSnap.docs.filter(d => d.data().userId);
    let count = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      chunk.forEach((subDoc) => {
        const { userId } = subDoc.data();

        // Mark subscription as expired
        batch.update(subDoc.ref, { status: "expired" });

        // Revoke premium on user doc
        batch.set(
          db.doc(`users/${userId}`),
          { isPremium: false, subscription: { status: "expired" } },
          { merge: true }
        );

        // Revoke premium on profile doc (useFitnessData reads this)
        batch.set(
          db.doc(`users/${userId}/data/profile`),
          { isPremium: false, subscription: { status: "expired" } },
          { merge: true }
        );

        count++;
      });

      await batch.commit();
    }

    console.log(`[checkExpiredSubscriptions] Expired ${count} subscription(s) in ${Math.ceil(docs.length / BATCH_SIZE)} batch(es).`);
  }
);


// ════════════════════════════════════════════════════════════════════════════
// RAZORPAY WEBHOOK — Server-side auto-renewal / cancellation handler
// ════════════════════════════════════════════════════════════════════════════

const razorpayWebhookSecret = defineSecret("RAZORPAY_WEBHOOK_SECRET");

exports.razorpayWebhook = onRequest(
  { secrets: [razorpayWebhookSecret], cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // 1. Verify webhook signature (HMAC-SHA256)
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      res.status(400).send("Missing signature");
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(500).send("Missing rawBody — cannot verify signature");
      return;
    }
    const expectedSig = crypto
      .createHmac("sha256", razorpayWebhookSecret.value())
      .update(rawBody)
      .digest("hex");

    try {
      if (!crypto.timingSafeEqual(Buffer.from(expectedSig, "hex"), Buffer.from(signature, "hex"))) {
        res.status(403).send("Invalid signature");
        return;
      }
    } catch {
      res.status(403).send("Invalid signature format");
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;
    const db = admin.firestore();

    try {
      if (event === "subscription.activated" || event === "subscription.charged") {
        // A subscription payment was made — extend or activate
        const paymentEntity = payload.payment?.entity;
        const subEntity = payload.subscription?.entity;
        if (!paymentEntity || !subEntity) {
          res.status(200).send("OK — no entity");
          return;
        }

        const notes = subEntity.notes || paymentEntity.notes || {};
        const userId = notes.userId;
        const planId = notes.planId;
        if (!userId || !planId) {
          console.warn("[razorpayWebhook] Missing userId or planId in notes");
          res.status(200).send("OK — missing notes");
          return;
        }

        const tier = getTierFromPlan(planId);
        const now = new Date();
        const expiryDate = new Date(now);
        if (planId.endsWith("_yearly")) {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        const subscriptionData = {
          planId,
          tier,
          status: "active",
          startDate: now.toISOString(),
          expiryDate: expiryDate.toISOString(),
          razorpaySubscriptionId: subEntity.id,
          paymentId: paymentEntity.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const batch = db.batch();
        batch.set(db.doc(`users/${userId}`),
          { subscription: subscriptionData, isPremium: true }, { merge: true });
        batch.set(db.doc(`users/${userId}/data/profile`),
          { subscription: subscriptionData, isPremium: true }, { merge: true });
        batch.set(db.doc(`subscriptions/${userId}_${paymentEntity.id}`), {
          userId, ...subscriptionData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await batch.commit();

        console.log(`[razorpayWebhook] ${event}: activated ${planId} for ${userId}`);

      } else if (event === "subscription.cancelled" || event === "subscription.halted") {
        const subEntity = payload.subscription?.entity;
        const notes = subEntity?.notes || {};
        const userId = notes.userId;
        if (!userId) {
          res.status(200).send("OK — missing userId");
          return;
        }

        const batch = db.batch();
        batch.set(db.doc(`users/${userId}`),
          { isPremium: false, subscription: { status: "cancelled" } }, { merge: true });
        batch.set(db.doc(`users/${userId}/data/profile`),
          { isPremium: false, subscription: { status: "cancelled" } }, { merge: true });
        await batch.commit();

        console.log(`[razorpayWebhook] ${event}: cancelled for ${userId}`);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("[razorpayWebhook] Error:", error);
      res.status(500).send("Internal error");
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// IRON SCORE — Internal helper (not exported)
// ════════════════════════════════════════════════════════════════════════════
//
// Iron Score formula (0–100+):
//   - League rank contribution (40 pts max based on leaguePoints bracket)
//   - Workout consistency (25 pts max — workouts in last 30 days)
//   - Nutrition adherence (20 pts max — nutrition days in last 14 days)
//   - Arena win rate (10 pts max — min 5 battles required)
//   - Weight goal progress (5 pts max)
// ════════════════════════════════════════════════════════════════════════════

const LEAGUE_POINT_BRACKETS = [
  { min: 0, score: 0 },       // Iron
  { min: 100, score: 8 },     // Bronze
  { min: 500, score: 16 },    // Silver
  { min: 1500, score: 28 },   // Gold
  { min: 5000, score: 40 },   // Platinum
  { min: 15000, score: 50 },  // Diamond
  { min: 50000, score: 60 },  // Legend
];

async function calculateIronScore(db, uid) {
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};

  // 1. League rank contribution (up to 60 for Legend)
  const leaguePoints = userData.leaguePoints || 0;
  let leagueScore = 0;
  for (const bracket of LEAGUE_POINT_BRACKETS) {
    if (leaguePoints >= bracket.min) leagueScore = bracket.score;
  }

  // 2. Workout consistency (25 pts max — workouts in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let workoutCount = 0;
  try {
    const workoutSnap = await db.collection(`users/${uid}/data`)
      .where("type", "==", "workout")
      .where("date", ">=", thirtyDaysAgo.toISOString())
      .get();
    workoutCount = workoutSnap.size;
  } catch {
    // If query fails (missing index etc.), fall back to 0
  }
  const workoutScore = Math.min(25, (workoutCount / 20) * 25);

  // 3. Nutrition adherence (20 pts max — logged days in last 14)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  let nutritionDays = 0;
  try {
    const nutritionSnap = await db.collection(`users/${uid}/data`)
      .where("type", "==", "nutrition")
      .where("date", ">=", fourteenDaysAgo.toISOString())
      .get();
    // Count unique days
    const uniqueDays = new Set();
    nutritionSnap.docs.forEach(doc => {
      const d = doc.data().date;
      if (d) uniqueDays.add(typeof d === "string" ? d.slice(0, 10) : d);
    });
    nutritionDays = uniqueDays.size;
  } catch {
    // fall back to 0
  }
  const nutritionScore = Math.min(20, (nutritionDays / 14) * 20);

  // 4. Arena win rate (10 pts max, min 5 battles required)
  const wins = userData.wins || 0;
  const losses = userData.losses || 0;
  const totalBattles = wins + losses;
  const arenaScore = totalBattles >= 5
    ? Math.min(10, (wins / totalBattles) * 10)
    : 0;

  // 5. Weight goal progress (5 pts max)
  let weightScore = 0;
  try {
    const profileSnap = await db.doc(`users/${uid}/data/profile`).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    const current = profile.weight || userData.weight;
    const starting = profile.startingWeight;
    const target = profile.targetWeight;
    if (current && starting && target && target !== starting) {
      const progress = Math.abs(current - starting) / Math.abs(target - starting);
      weightScore = Math.min(5, progress * 5);
    }
  } catch {
    // fall back to 0
  }

  const ironScore = Math.round(leagueScore + workoutScore + nutritionScore + arenaScore + weightScore);

  // Write to user doc
  await userRef.set({ ironScore }, { merge: true });

  return ironScore;
}


// ════════════════════════════════════════════════════════════════════════════
// HELPER — Award XP and also increment weeklyXpContribution for Guild Wars
// ════════════════════════════════════════════════════════════════════════════

async function awardXpWithTracking(db, uid, xpAmount, leaguePointsDelta = 0) {
  const updates = {};
  if (xpAmount !== 0) {
    updates.xp = admin.firestore.FieldValue.increment(xpAmount);
    updates.weeklyXpContribution = admin.firestore.FieldValue.increment(xpAmount);
  }
  if (leaguePointsDelta !== 0) {
    updates.leaguePoints = admin.firestore.FieldValue.increment(leaguePointsDelta);
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.doc(`users/${uid}`).set(updates, { merge: true });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER — Clamp leaguePoints so they never go below 0
// ════════════════════════════════════════════════════════════════════════════

async function deductLeaguePoints(db, uid, amount) {
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  const current = (snap.exists && snap.data().leaguePoints) || 0;
  const newVal = Math.max(0, current - amount);
  await userRef.set({
    leaguePoints: newVal,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return newVal;
}


// ════════════════════════════════════════════════════════════════════════════
// logWeightEntry — Callable Cloud Function
// ════════════════════════════════════════════════════════════════════════════
//
// Anti-cheat rules (all enforced server-side):
//   1. Max 1 entry per 20 hours
//   2. Max ±1.5kg change from previous entry
//   3. Timestamp within 60 minutes of server time
//   4. After 2 hours, entries are immutable
//
// Writes to: users/{uid}/progress/{autoId}
// Updates: users/{uid}/data/profile.weight, users/{uid}.weightStatus
// Awards/deducts XP and leaguePoints based on 7-day trend vs goal
// ════════════════════════════════════════════════════════════════════════════

exports.logWeightEntry = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const { weight, date } = request.data;

    // Input validation
    if (typeof weight !== "number" || weight < 20 || weight > 500) {
      throw new HttpsError("invalid-argument", "Weight must be a number between 20 and 500 kg.");
    }
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpsError("invalid-argument", "Date must be ISO format YYYY-MM-DD.");
    }

    const db = admin.firestore();
    const now = Date.now();

    // Anti-cheat: entry date must be within 24 hours of server time
    const entryDate = new Date(date);
    const diffMinutes = Math.abs(now - entryDate.getTime()) / 60000;
    if (diffMinutes > 60 * 24) {
      // No backdating beyond 24 hours
      throw new HttpsError("invalid-argument", "Entry date is too far from current date (no backdating).");
    }

    // Anti-cheat: max 1 entry per 20 hours
    const progressRef = db.collection(`users/${uid}/progress`);
    const recentSnap = await progressRef
      .orderBy("loggedAt", "desc")
      .limit(1)
      .get();

    let previousWeight = null;

    if (!recentSnap.empty) {
      const lastEntry = recentSnap.docs[0].data();
      const lastLoggedAt = lastEntry.loggedAt?.toDate?.() || new Date(lastEntry.loggedAt);
      const hoursSinceLast = (now - lastLoggedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLast < 20) {
        throw new HttpsError(
          "failed-precondition",
          `Must wait at least 20 hours between entries. Last entry was ${hoursSinceLast.toFixed(1)} hours ago.`
        );
      }

      previousWeight = lastEntry.weight;

      // Anti-cheat: max ±1.5kg change from previous entry
      if (previousWeight !== null && Math.abs(weight - previousWeight) > 1.5) {
        throw new HttpsError(
          "invalid-argument",
          `Weight change of ${Math.abs(weight - previousWeight).toFixed(1)}kg exceeds max ±1.5kg from previous entry (${previousWeight}kg).`
        );
      }
    }

    // Write weight entry
    const entryRef = progressRef.doc();
    await entryRef.set({
      weight,
      date,
      loggedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: uid,
    });

    // Update profile weight
    await db.doc(`users/${uid}/data/profile`).set({ weight }, { merge: true });
    await db.doc(`users/${uid}`).set({ weight }, { merge: true });

    // Calculate 7-day rolling average
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weekSnap = await progressRef
      .orderBy("loggedAt", "desc")
      .where("loggedAt", ">=", sevenDaysAgo)
      .get();

    // Only entries that have a weight field
    const weekEntries = weekSnap.docs
      .map(d => d.data())
      .filter(d => typeof d.weight === "number");

    let weightStatus = "building";
    let xpAwarded = 0;
    let leaguePointsDelta = 0;

    if (weekEntries.length >= 3) {
      // Average of all entries this week
      const avg = weekEntries.reduce((s, e) => s + e.weight, 0) / weekEntries.length;

      // Get earliest and latest entries to determine trend
      const sorted = weekEntries.sort((a, b) => {
        const aT = a.loggedAt?.toDate?.() || new Date(a.loggedAt);
        const bT = b.loggedAt?.toDate?.() || new Date(b.loggedAt);
        return aT - bT;
      });
      const earliestWeight = sorted[0].weight;
      const latestWeight = sorted[sorted.length - 1].weight;
      const trendDelta = latestWeight - earliestWeight;

      // Fetch user goal
      const profileSnap = await db.doc(`users/${uid}/data/profile`).get();
      const goal = profileSnap.exists ? (profileSnap.data().goal || "maintain") : "maintain";

      if (goal === "cut") {
        if (trendDelta <= -0.2) {
          // Trending down — on track for cut
          weightStatus = "on_track";
          xpAwarded = 50;
          leaguePointsDelta = 75;
        } else if (trendDelta >= 0.3) {
          // Trending up — off track for cut
          weightStatus = "off_track";
          leaguePointsDelta = -75;
        } else {
          weightStatus = "neutral";
        }
      } else if (goal === "bulk") {
        if (trendDelta >= 0.2) {
          // Trending up — on track for bulk
          weightStatus = "on_track";
          xpAwarded = 50;
          leaguePointsDelta = 75;
        } else if (trendDelta <= -0.3) {
          // Trending down — off track for bulk
          weightStatus = "off_track";
          leaguePointsDelta = -75;
        } else {
          weightStatus = "neutral";
        }
      } else {
        // Maintain — within ±0.3kg is on track
        if (Math.abs(trendDelta) <= 0.3) {
          weightStatus = "on_track";
          xpAwarded = 25;
        } else {
          weightStatus = "neutral";
        }
      }

      // Apply XP and leaguePoints
      if (xpAwarded > 0) {
        await awardXpWithTracking(db, uid, xpAwarded, Math.max(0, leaguePointsDelta));
      }
      if (leaguePointsDelta < 0) {
        await deductLeaguePoints(db, uid, Math.abs(leaguePointsDelta));
      }
    }

    // Write weightStatus to user doc
    await db.doc(`users/${uid}`).set({ weightStatus }, { merge: true });

    // Recalculate Iron Score
    const ironScore = await calculateIronScore(db, uid);

    // Calculate trend for response
    const trend7day = weekEntries.length >= 2
      ? weekEntries[weekEntries.length - 1].weight - weekEntries[0].weight
      : 0;

    return {
      success: true,
      weightStatus,
      xpAwarded,
      trend7day: Math.round(trend7day * 100) / 100,
      ironScore,
    };
  }
);


// ════════════════════════════════════════════════════════════════════════════
// weeklyWeightAssessment — Scheduled (every Sunday 11pm UTC)
// ════════════════════════════════════════════════════════════════════════════
//
// For users with ≥3 weight entries in the past 7 days:
//   - Calculate weekly trend
//   - Award/deduct leaguePoints based on goal adherence
//   - Write assessment to user doc and inbox notification on failure
// ════════════════════════════════════════════════════════════════════════════

exports.weeklyWeightAssessment = onSchedule(
  {
    schedule: "0 23 * * 0", // Sunday 11pm UTC
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Paginate through users in batches of 100
    const BATCH_SIZE = 100;
    let lastDoc = null;
    let processed = 0;

    while (true) {
      let usersQuery = db.collection("users").limit(BATCH_SIZE);
      if (lastDoc) usersQuery = usersQuery.startAfter(lastDoc);
      const usersSnap = await usersQuery.get();
      if (usersSnap.empty) break;
      lastDoc = usersSnap.docs[usersSnap.docs.length - 1];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      try {

      // Get weight entries from the past 7 days
      const progressSnap = await db.collection(`users/${uid}/progress`)
        .where("loggedAt", ">=", weekAgo)
        .orderBy("loggedAt", "asc")
        .get();

      const entries = progressSnap.docs
        .map(d => d.data())
        .filter(d => typeof d.weight === "number");

      if (entries.length < 3) continue;

      // Calculate trend: first entry vs last entry
      const firstWeight = entries[0].weight;
      const lastWeight = entries[entries.length - 1].weight;
      const delta = lastWeight - firstWeight;

      // Get user goal
      const profileSnap = await db.doc(`users/${uid}/data/profile`).get();
      const goal = profileSnap.exists ? (profileSnap.data().goal || "maintain") : "maintain";

      let result = "neutral";
      let xp = 0;
      let pointsChanged = 0;

      if (goal === "cut") {
        if (delta <= -0.2) {
          // Lost weight — on track
          result = "on_track";
          xp = 100;
          pointsChanged = 100;
        } else if (delta >= 0.3) {
          // Gained weight — off track
          result = "off_track";
          pointsChanged = -100;
        }
      } else if (goal === "bulk") {
        if (delta >= 0.2) {
          // Gained weight — on track
          result = "on_track";
          xp = 100;
          pointsChanged = 100;
        } else if (delta <= -0.3) {
          // Lost weight — off track
          result = "off_track";
          pointsChanged = -100;
        }
      } else {
        // Maintain — within ±0.3kg
        if (Math.abs(delta) <= 0.3) {
          result = "on_track";
          xp = 50;
        }
      }

      // Apply rewards/penalties
      if (xp > 0) {
        await awardXpWithTracking(db, uid, xp, Math.max(0, pointsChanged));
      }
      if (pointsChanged < 0) {
        await deductLeaguePoints(db, uid, Math.abs(pointsChanged));

        // Write notification to inbox
        await db.collection(`users/${uid}/inbox`).add({
          fromId: "system",
          type: "weight_assessment",
          title: "Weekly Weight Check",
          message: `Your weight trend is off-track for your ${goal} goal. You ${delta > 0 ? "gained" : "lost"} ${Math.abs(delta).toFixed(1)}kg this week.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Write assessment to user doc
      await db.doc(`users/${uid}`).set({
        lastWeightAssessment: {
          date: now.toISOString(),
          result,
          pointsChanged,
          weightDelta: Math.round(delta * 100) / 100,
        },
      }, { merge: true });

      processed++;
      } catch (err) {
        console.error(`[weeklyWeightAssessment] Error processing user ${uid}:`, err.message);
      }
    }
    } // end while pagination

    console.log(`[weeklyWeightAssessment] Assessed ${processed} users.`);
  }
);


// ════════════════════════════════════════════════════════════════════════════
// weeklyRankDecay — Scheduled (every Monday 2am UTC)
// ════════════════════════════════════════════════════════════════════════════
//
// For users who haven't logged any workout in the past 7 days:
//   - Deduct 30 leaguePoints (min 0, never negative)
//   - Skip Iron league users (leaguePoints < 100)
//   - Recalculate Iron Score
// ════════════════════════════════════════════════════════════════════════════

exports.weeklyRankDecay = onSchedule(
  {
    schedule: "0 2 * * 1", // Monday 2am UTC
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    const db = admin.firestore();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Only fetch users with leaguePoints >= 100 (skip Iron league)
    const usersSnap = await db.collection("users")
      .where("leaguePoints", ">=", 100)
      .select("leaguePoints")
      .get();
    let decayed = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const leaguePoints = userDoc.data().leaguePoints || 0;

      // Check if user logged any workout in last 7 days
      let hasWorkout = false;
      try {
        const workoutSnap = await db.collection(`users/${uid}/data`)
          .where("type", "==", "workout")
          .where("date", ">=", weekAgo.toISOString())
          .limit(1)
          .get();
        hasWorkout = !workoutSnap.empty;
      } catch {
        // If query fails, be lenient — don't decay
        hasWorkout = true;
      }

      if (hasWorkout) continue;

      // Deduct 30 leaguePoints (min 0)
      const newPoints = Math.max(0, leaguePoints - 30);
      await db.doc(`users/${uid}`).update({
        leaguePoints: newPoints,
        lastDecayApplied: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Recalculate Iron Score
      await calculateIronScore(db, uid);
      decayed++;
    }

    console.log(`[weeklyRankDecay] Decayed ${decayed} inactive users.`);
  }
);


// ════════════════════════════════════════════════════════════════════════════
// weeklyGuildWars — Scheduled (every Monday 3am UTC)
// ════════════════════════════════════════════════════════════════════════════
//
// For each guild:
//   1. Sum weeklyXpContribution from all members
//   2. Rank guilds globally
//   3. Top 10%: +200 XP to members ("gold" reward)
//   4. Top 25%: +100 XP to members ("silver" reward)
//   5. Reset weeklyXpContribution on all users
//   6. Update guild leaderboard at /global/data/guildLeaderboard
// ════════════════════════════════════════════════════════════════════════════

exports.weeklyGuildWars = onSchedule(
  {
    schedule: "0 3 * * 1", // Monday 3am UTC
    timeZone: "UTC",
    retryCount: 3,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const weekId = `war_${now.toISOString().slice(0, 10)}`;

    // 1. Get all guilds
    const guildsSnap = await db.collection("guilds").get();
    if (guildsSnap.empty) {
      console.log("[weeklyGuildWars] No guilds found.");
      return;
    }

    const guildScores = [];

    for (const guildDoc of guildsSnap.docs) {
      const guild = guildDoc.data();
      const memberIds = guild.memberIds || guild.members || [];

      if (memberIds.length === 0) {
        guildScores.push({ guildId: guildDoc.id, guildName: guild.name, warScore: 0, memberIds: [] });
        continue;
      }

      // Resolve member IDs (could be objects or strings)
      const resolvedIds = memberIds.map(m => typeof m === "string" ? m : m.userId).filter(Boolean);

      // Sum weeklyXpContribution — batch reads in parallel chunks of 50
      let totalWarXp = 0;
      const MEMBER_CHUNK = 50;
      for (let ci = 0; ci < resolvedIds.length; ci += MEMBER_CHUNK) {
        const chunk = resolvedIds.slice(ci, ci + MEMBER_CHUNK);
        const snaps = await Promise.all(chunk.map(id => db.doc(`users/${id}`).get()));
        for (const snap of snaps) {
          if (snap.exists) totalWarXp += snap.data().weeklyXpContribution || 0;
        }
      }

      guildScores.push({
        guildId: guildDoc.id,
        guildName: guild.name || "Unknown",
        warScore: totalWarXp,
        memberIds: resolvedIds,
      });
    }

    // 2. Rank guilds by warScore
    guildScores.sort((a, b) => b.warScore - a.warScore);

    const totalGuilds = guildScores.length;
    const top10Cutoff = Math.max(1, Math.ceil(totalGuilds * 0.10));
    const top25Cutoff = Math.max(1, Math.ceil(totalGuilds * 0.25));

    // 3–4. Distribute rewards
    for (let i = 0; i < guildScores.length; i++) {
      const guild = guildScores[i];
      let warReward = null;
      let rewardXp = 0;

      if (i < top10Cutoff && guild.warScore > 0) {
        warReward = "gold";
        rewardXp = 200;
      } else if (i < top25Cutoff && guild.warScore > 0) {
        warReward = "silver";
        rewardXp = 100;
      }

      // Write results to guild doc
      const guildUpdates = {
        lastWarScore: guild.warScore,
        warXpEarned: guild.warScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (warReward) guildUpdates.warReward = warReward;

      await db.doc(`guilds/${guild.guildId}`).set(guildUpdates, { merge: true });

      // Archive in warHistory
      await db.doc(`guilds/${guild.guildId}/warHistory/${weekId}`).set({
        weekId,
        warScore: guild.warScore,
        rank: i + 1,
        totalGuilds,
        warReward: warReward || "none",
        rewardXp,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Distribute XP reward to members
      if (rewardXp > 0 && guild.memberIds.length > 0) {
        for (let j = 0; j < guild.memberIds.length; j += 250) {
          const batch = db.batch();
          const chunk = guild.memberIds.slice(j, j + 250);

          for (const memberId of chunk) {
            batch.set(db.doc(`users/${memberId}`), {
              xp: admin.firestore.FieldValue.increment(rewardXp),
              weeklyXpContribution: admin.firestore.FieldValue.increment(rewardXp),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }

          await batch.commit();
        }
      }
    }

    // 5. Reset weeklyXpContribution — only query users who have a contribution > 0
    const contributorsSnap = await db.collection("users")
      .where("weeklyXpContribution", ">", 0)
      .select("weeklyXpContribution")
      .get();

    for (let i = 0; i < contributorsSnap.docs.length; i += 500) {
      const batch = db.batch();
      const chunk = contributorsSnap.docs.slice(i, i + 500);

      for (const userDoc of chunk) {
        batch.update(userDoc.ref, { weeklyXpContribution: 0 });
      }

      await batch.commit();
    }

    // 6. Update guild leaderboard at /global/data/guildLeaderboard
    const leaderboardBatch = db.batch();
    for (const guild of guildScores.slice(0, 100)) {
      leaderboardBatch.set(
        db.doc(`global/data/guildLeaderboard/${guild.guildId}`),
        {
          guildId: guild.guildId,
          guildName: guild.guildName,
          warScore: guild.warScore,
          memberCount: guild.memberIds.length,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      );
    }
    await leaderboardBatch.commit();

    console.log(`[weeklyGuildWars] Processed ${totalGuilds} guilds. Winner: ${guildScores[0]?.guildName || "N/A"} (${guildScores[0]?.warScore || 0} XP).`);
  }
);


// ════════════════════════════════════════════════════════════════════════════
// useForgeShield — Callable Cloud Function
// ════════════════════════════════════════════════════════════════════════════
//
// Forge Shields prevent workout streak breaks.
// - Users earn 1 shield per 500 XP earned (max 3 storable)
// - Using a shield extends lastWorkoutDate by 1 day
// ════════════════════════════════════════════════════════════════════════════

exports.useForgeShield = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.doc(`users/${uid}`);

    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found.");
      }

      const userData = userDoc.data();
      const shields = userData.forgeShields || 0;

      if (shields <= 0) {
        throw new HttpsError("failed-precondition", "No Forge Shields available.");
      }

      // Extend lastWorkoutDate by 1 day
      const lastWorkout = userData.lastWorkoutDate
        ? new Date(userData.lastWorkoutDate)
        : new Date();
      lastWorkout.setDate(lastWorkout.getDate() + 1);

      transaction.update(userRef, {
        forgeShields: shields - 1,
        lastWorkoutDate: lastWorkout.toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { shieldsRemaining: shields - 1 };
    });

    return { success: true, shieldsRemaining: result.shieldsRemaining };
  }
);


// ════════════════════════════════════════════════════════════════════════════
// FRIEND SYSTEM
// sendFriendRequest  — write a pending request to the target's subcollection
// respondFriendRequest — accept (mutual write) or decline (delete request)
// ════════════════════════════════════════════════════════════════════════════

const FRIEND_REQUEST_DAILY_LIMIT = 20;

exports.sendFriendRequest = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const { targetUid } = request.data;

    if (!targetUid || typeof targetUid !== "string") {
      throw new HttpsError("invalid-argument", "targetUid is required.");
    }
    if (targetUid === uid) {
      throw new HttpsError("invalid-argument", "Cannot send a friend request to yourself.");
    }

    const db = admin.firestore();

    // Rate limit: max 20 requests per day per sender
    const today = new Date().toISOString().split("T")[0];
    const rlRef = db.doc(`rateLimits/${uid}_friendRequest_${today}`);
    const rlSnap = await rlRef.get();
    const rlCount = rlSnap.exists ? (rlSnap.data().count || 0) : 0;
    if (rlCount >= FRIEND_REQUEST_DAILY_LIMIT) {
      throw new HttpsError("resource-exhausted", "Daily friend request limit reached (20/day).");
    }

    // Check not already friends
    const friendRef = db.doc(`users/${uid}/friends/${targetUid}`);
    const friendSnap = await friendRef.get();
    if (friendSnap.exists) {
      throw new HttpsError("already-exists", "You are already friends with this player.");
    }

    // Check no duplicate pending request
    const existingReqs = await db
      .collection(`users/${targetUid}/friendRequests`)
      .where("fromUid", "==", uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!existingReqs.empty) {
      throw new HttpsError("already-exists", "Friend request already sent.");
    }

    // Get sender profile info
    const [senderProfileSnap, senderUserSnap] = await Promise.all([
      db.doc(`users/${uid}/data/profile`).get(),
      db.doc(`users/${uid}`).get(),
    ]);
    const senderProfile = senderProfileSnap.exists ? senderProfileSnap.data() : {};
    const senderUser = senderUserSnap.exists ? senderUserSnap.data() : {};

    const senderUsername = senderProfile.username || "Unknown";
    const senderIronScore = senderUser.ironScore || 0;

    const xp = senderProfile.xp || 0;
    const LEAGUE_MINS = [
      { name: "Diamond", min: 25000 },
      { name: "Platinum", min: 10000 },
      { name: "Gold", min: 5000 },
      { name: "Silver", min: 2500 },
      { name: "Bronze", min: 1000 },
      { name: "Iron", min: 0 },
    ];
    const senderLeague = LEAGUE_MINS.find(l => xp >= l.min)?.name || "Iron";

    // Write friend request
    const requestRef = db.collection(`users/${targetUid}/friendRequests`).doc();
    await requestRef.set({
      fromUid: uid,
      fromUsername: senderUsername,
      fromIronScore: senderIronScore,
      fromLeague: senderLeague,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    });

    // Increment rate limit counter
    await rlRef.set(
      { count: admin.firestore.FieldValue.increment(1), date: today },
      { merge: true }
    );

    return { success: true, requestId: requestRef.id };
  }
);


exports.respondFriendRequest = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const { requestId, response } = request.data;

    if (!requestId || typeof requestId !== "string") {
      throw new HttpsError("invalid-argument", "requestId is required.");
    }
    if (response !== "accept" && response !== "decline") {
      throw new HttpsError("invalid-argument", "response must be 'accept' or 'decline'.");
    }

    const db = admin.firestore();
    const reqRef = db.doc(`users/${uid}/friendRequests/${requestId}`);

    if (response === "accept") {
      // Use transaction to prevent double-accept race condition
      const result = await db.runTransaction(async (t) => {
        const reqSnap = await t.get(reqRef);

        if (!reqSnap.exists) {
          throw new HttpsError("not-found", "Friend request not found.");
        }

        const reqData = reqSnap.data();
        if (reqData.status !== "pending") {
          throw new HttpsError("failed-precondition", "Friend request already handled.");
        }

        const fromUid = reqData.fromUid;

        const [myProfileSnap, myUserSnap, theirProfileSnap, theirUserSnap] = await Promise.all([
          t.get(db.doc(`users/${uid}/data/profile`)),
          t.get(db.doc(`users/${uid}`)),
          t.get(db.doc(`users/${fromUid}/data/profile`)),
          t.get(db.doc(`users/${fromUid}`)),
        ]);

        const myProfile = myProfileSnap.exists ? myProfileSnap.data() : {};
        const myUser = myUserSnap.exists ? myUserSnap.data() : {};
        const theirProfile = theirProfileSnap.exists ? theirProfileSnap.data() : {};
        const theirUser = theirUserSnap.exists ? theirUserSnap.data() : {};

        const now = admin.firestore.FieldValue.serverTimestamp();

        t.set(db.doc(`users/${uid}/friends/${fromUid}`), {
          uid: fromUid,
          username: theirProfile.username || "Unknown",
          xp: theirProfile.xp || 0,
          ironScore: theirUser.ironScore || 0,
          addedAt: now,
        });

        t.set(db.doc(`users/${fromUid}/friends/${uid}`), {
          uid,
          username: myProfile.username || "Unknown",
          xp: myProfile.xp || 0,
          ironScore: myUser.ironScore || 0,
          addedAt: now,
        });

        t.delete(reqRef);
        return { success: true, response: "accepted" };
      });

      return result;
    }

    // Decline — no race condition risk, simple delete
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
      throw new HttpsError("not-found", "Friend request not found.");
    }
    if (reqSnap.data().status !== "pending") {
      throw new HttpsError("failed-precondition", "Friend request already handled.");
    }
    await reqRef.delete();
    return { success: true, response: "declined" };
  }
);

// ─── checkAndAwardAchievements ────────────────────────────────────────────────
// Called client-side after significant events (workout log, guild join, etc.)
// Checks server-side badge conditions that can't be verified client-only
// and writes earned badge IDs to users/{uid}.earnedBadges
exports.checkAndAwardAchievements = onCall(
  { cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Must be signed in");

    const db = admin.firestore();
    const userRef = db.doc(`users/${uid}`);
    const profileRef = db.doc(`users/${uid}/data/profile`);

    const [userSnap, profileSnap] = await Promise.all([
      userRef.get(),
      profileRef.get(),
    ]);

    const userData = userSnap.data() || {};
    const profile = profileSnap.data() || {};
    const currentEarned = new Set(userData.earnedBadges || []);
    const newBadges = [];

    // ── Guild Leader badge ─────────────────────────────────────────────────
    // Award if user owns a guild (ownerId in any guild doc)
    if (!currentEarned.has("guild_leader")) {
      const guildSnap = await db
        .collection("guilds")
        .where("ownerId", "==", uid)
        .limit(1)
        .get();
      if (!guildSnap.empty) newBadges.push("guild_leader");
    }

    // ── Undefeated — 5 consecutive wins ────────────────────────────────────
    if (!currentEarned.has("undefeated")) {
      const consecutive = profile.consecutiveWins || userData.consecutiveWins || 0;
      if (consecutive >= 5) newBadges.push("undefeated");
    }

    // ── Squad Goals — all guild members logged a workout this week ──────────
    if (!currentEarned.has("squad_goals") && userData.guildId) {
      const guildRef = db.doc(`guilds/${userData.guildId}`);
      const guildSnap = await guildRef.get();
      if (guildSnap.exists) {
        const guild = guildSnap.data();
        const memberCount = guild.memberCount || 0;
        if (memberCount >= 2) {
          // Check if all members have weeklyXpContribution > 0 this week
          const allActive = (guild.members || []).every(
            (m) => (m.weeklyXpContribution || 0) > 0
          );
          if (allActive) newBadges.push("squad_goals");
        }
      }
    }

    // ── Write new badges to user doc ────────────────────────────────────────
    if (newBadges.length > 0) {
      const allBadges = [...currentEarned, ...newBadges];
      await userRef.update({ earnedBadges: allBadges });
      return { success: true, newBadges };
    }

    return { success: true, newBadges: [] };
  }
);

// ════════════════════════════════════════════════════════════════════════════
// WORKOUT VALIDATION — Server-side anti-cheat for regular workout logging
// ════════════════════════════════════════════════════════════════════════════

exports.validateWorkoutData = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be logged in.");

  const { exercises, duration } = request.data;

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new HttpsError("invalid-argument", "Workout must have exercises.");
  }

  if (exercises.length > 50) {
    throw new HttpsError("invalid-argument", "Too many exercises (max 50).");
  }

  // Duration: 0-4 hours (14400s)
  if (typeof duration === "number" && (duration < 0 || duration > 14400)) {
    throw new HttpsError("invalid-argument", "Duration out of range (0-4hrs).");
  }

  let totalVolume = 0;

  for (const ex of exercises) {
    if (typeof ex.name !== "string" || ex.name.length === 0 || ex.name.length > 200) {
      throw new HttpsError("invalid-argument", "Invalid exercise name.");
    }

    if (!Array.isArray(ex.sets)) continue;
    if (ex.sets.length > 100) {
      throw new HttpsError("invalid-argument", `Too many sets for ${ex.name} (max 100).`);
    }

    const maxReps = REP_LIMITS[ex.name] || REP_LIMITS._default;

    for (const s of ex.sets) {
      const w = parseFloat(s.w) || 0;
      const r = parseFloat(s.r) || 0;

      if (w < 0 || w > 2000) {
        throw new HttpsError("invalid-argument", `Weight ${w}kg out of range for ${ex.name}.`);
      }
      if (r < 0 || r > maxReps) {
        throw new HttpsError("invalid-argument", `${r} reps exceeds limit (${maxReps}) for ${ex.name}.`);
      }
      totalVolume += w * r;
    }
  }

  // Volume sanity: flag > 500,000 kg (elite powerlifter territory)
  if (totalVolume > 500000) {
    throw new HttpsError("invalid-argument", "Total volume exceeds plausible limits.");
  }

  // Historical check: compare against user's recent workouts
  const db = admin.firestore();
  const recentSnap = await db.collection("users").doc(uid).collection("workouts")
    .orderBy("createdAt", "desc").limit(10).get();

  if (recentSnap.size >= 3) {
    const volumes = recentSnap.docs.map(d => {
      let v = 0;
      (d.data().exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => { v += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0); });
      });
      return v;
    }).filter(v => v > 0);

    if (volumes.length >= 3) {
      const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      if (avg > 0 && totalVolume > avg * 5) {
        throw new HttpsError("invalid-argument",
          `Volume ${Math.round(totalVolume)} is ${(totalVolume / avg).toFixed(1)}x your average — flagged for review.`);
      }
    }
  }

  // Timing: prevent rapid-fire logging (< 2 min between workouts with high volume)
  if (recentSnap.size > 0) {
    const lastCreated = recentSnap.docs[0].data().createdAt;
    if (lastCreated && typeof lastCreated.toDate === 'function') {
      const diffMs = Date.now() - lastCreated.toDate().getTime();
      if (diffMs < 120000 && totalVolume > 5000) {
        throw new HttpsError("invalid-argument", "Too soon after last workout for this volume.");
      }
    }
  }

  return { valid: true, volume: Math.round(totalVolume) };
});

// ════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — Server-side FCM push to specific users
// ════════════════════════════════════════════════════════════════════════════

/**
 * Send a push notification to a user via their stored FCM token.
 * Called by other Cloud Functions or admin triggers.
 */
async function sendPushToUser(userId, title, body, data = {}) {
  const db = admin.firestore();
  try {
    const fcmDoc = await db.doc(`users/${userId}/data/fcm`).get();
    if (!fcmDoc.exists || !fcmDoc.data().token) return { sent: false, reason: "no_token" };

    const token = fcmDoc.data().token;

    const message = {
      token,
      notification: { title, body },
      data: { ...data, url: data.url || "/" },
      android: {
        priority: "high",
        notification: {
          channelId: "ironcore_default",
          icon: "ic_launcher",
          color: "#dc2626",
        },
      },
    };

    await admin.messaging().send(message);
    return { sent: true };
  } catch (error) {
    // Token expired or invalid — clean up
    if (error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token") {
      await admin.firestore().doc(`users/${userId}/data/fcm`).delete().catch(() => {});
    }
    return { sent: false, reason: error.code || error.message };
  }
}

/**
 * Callable function — send push notification to a user (admin/internal use).
 */
exports.sendPushNotification = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be logged in.");

  const { targetUserId, title, body } = request.data;
  if (!targetUserId || !title || !body) {
    throw new HttpsError("invalid-argument", "targetUserId, title, and body are required.");
  }

  // Authorization: only allow sending to yourself (app-triggered) or by admins
  const db = admin.firestore();
  if (targetUserId !== uid) {
    const callerDoc = await db.doc(`users/${uid}`).get();
    if (!callerDoc.exists || callerDoc.data().role !== "admin") {
      throw new HttpsError("permission-denied", "Cannot send push to other users.");
    }
  }

  return await sendPushToUser(targetUserId, title, body);
});

/**
 * Scheduled — send daily workout reminder at 6 PM to users who haven't worked out today.
 */
exports.dailyWorkoutReminder = onSchedule("every day 18:00", async () => {
  const db = admin.firestore();
  const today = new Date().toISOString().split("T")[0];

  // Paginate through users in batches of 100
  const BATCH_SIZE = 100;
  let lastDoc = null;

  while (true) {
    let usersQuery = db.collection("users").select().limit(BATCH_SIZE);
    if (lastDoc) usersQuery = usersQuery.startAfter(lastDoc);
    const usersSnap = await usersQuery.get();
    if (usersSnap.empty) break;
    lastDoc = usersSnap.docs[usersSnap.docs.length - 1];

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      try {
        const fcmDoc = await db.doc(`users/${userId}/data/fcm`).get();
        const token = fcmDoc.exists ? fcmDoc.data().token : null;
        if (!token) continue;

        // Check if user logged a workout today
        const workoutsToday = await db.collection(`users/${userId}/workouts`)
          .where("date", "==", today)
          .limit(1)
          .get();

        if (workoutsToday.empty) {
          await admin.messaging().send({
            token,
            notification: {
              title: "No workout yet today",
              body: "Your streak is waiting. Even 10 minutes counts.",
            },
            data: { url: "/" },
            android: {
              priority: "high",
              notification: {
                channelId: "ironcore_default",
                icon: "ic_launcher",
                color: "#dc2626",
              },
            },
          });
        }
      } catch {
        // Token invalid or user error — skip, continue to next
      }
    }
  }
});

// --- Award Activity XP ---
exports.awardActivityXP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = request.auth.uid;
  const { activityType, idempotencyKey } = request.data;

  // Validate activityType
  const XP_MAP = {
    meal: 10,
    workout: 50,
    progress: 20,
    burned: 15,
  };

  if (!activityType || !XP_MAP[activityType]) {
    throw new HttpsError(
      "invalid-argument",
      "activityType must be one of: meal, workout, progress, burned."
    );
  }

  const db = admin.firestore();

  // Rate limit: max 60 ops/min per user
  await checkRateLimit(uid, "activity", db);

  const xpAwarded = XP_MAP[activityType];

  // Idempotency check — if key provided, ensure we don't double-award
  if (idempotencyKey) {
    if (typeof idempotencyKey !== "string" || idempotencyKey.length > 128) {
      throw new HttpsError("invalid-argument", "idempotencyKey must be a string (max 128 chars).");
    }
    const opDocId = `${uid}_${idempotencyKey}`;
    const opRef = db.collection("processedOps").doc(opDocId);
    const opSnap = await opRef.get();
    if (opSnap.exists) {
      // Already processed — return success without awarding again
      return { success: true, newXp: null, xpAwarded: 0 };
    }
  }

  // Atomically increment XP on profile and update leaderboard
  const profileRef = db.doc(`users/${uid}/data/profile`);
  const leaderboardRef = db.doc(`leaderboard/${uid}`);

  const newXp = await db.runTransaction(async (t) => {
    const profileSnap = await t.get(profileRef);
    const currentXp = profileSnap.exists ? (profileSnap.data().xp || 0) : 0;
    const updatedXp = currentXp + xpAwarded;

    if (profileSnap.exists) {
      t.update(profileRef, { xp: updatedXp });
    } else {
      t.set(profileRef, { xp: updatedXp });
    }

    // Update leaderboard with server-authoritative XP
    t.set(leaderboardRef, { xp: updatedXp, uid }, { merge: true });

    return updatedXp;
  });

  // Write idempotency record after successful transaction
  if (idempotencyKey) {
    const opDocId = `${uid}_${idempotencyKey}`;
    await db.collection("processedOps").doc(opDocId).set({
      uid,
      activityType,
      xpAwarded,
      processedAt: Date.now(),
    });
  }

  return { success: true, newXp, xpAwarded };
});

// --- Referral System ---

exports.generateReferralCode = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  // Check if user already has a referral code
  const profileDoc = await db.doc(`users/${uid}/data/profile`).get();
  const profileData = profileDoc.exists ? profileDoc.data() : {};

  if (profileData.referralCode) {
    return { code: profileData.referralCode };
  }

  // Characters excluding confusing ones: 0/O/1/I/l
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";
  let isUnique = false;

  // Generate unique code with retry
  for (let attempt = 0; attempt < 10; attempt++) {
    code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existingCode = await db.doc(`referralCodes/${code}`).get();
    if (!existingCode.exists) {
      isUnique = true;
      break;
    }
  }

  if (!isUnique) {
    throw new HttpsError("internal", "Failed to generate unique referral code. Please try again.");
  }

  const batch = db.batch();

  batch.set(
    db.doc(`users/${uid}/data/profile`),
    { referralCode: code },
    { merge: true }
  );

  batch.set(db.doc(`referralCodes/${code}`), {
    uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    claimCount: 0,
    claims: [],
  });

  await batch.commit();

  return { code };
});

exports.claimReferralReward = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const callerUid = request.auth.uid;
  const { referralCode } = request.data || {};

  // Validate input
  if (!referralCode || typeof referralCode !== "string" || referralCode.length !== 8) {
    throw new HttpsError("invalid-argument", "Invalid referral code. Must be 8 characters.");
  }

  const db = admin.firestore();
  const codeRef = db.doc(`referralCodes/${referralCode}`);
  const callerProfileRef = db.doc(`users/${callerUid}/data/profile`);

  // Look up the referral code
  const codeDoc = await codeRef.get();
  if (!codeDoc.exists) {
    throw new HttpsError("not-found", "Referral code not found.");
  }

  const codeData = codeDoc.data();
  const referrerUid = codeData.uid;

  // Prevent self-referral
  if (referrerUid === callerUid) {
    throw new HttpsError("failed-precondition", "You cannot use your own referral code.");
  }

  // Check if caller already claimed a referral
  const callerProfileDoc = await callerProfileRef.get();
  const callerProfileData = callerProfileDoc.exists ? callerProfileDoc.data() : {};

  if (callerProfileData.referredBy) {
    throw new HttpsError("already-exists", "You have already claimed a referral reward.");
  }

  // Check referrer hasn't exceeded 10 referral rewards
  if (codeData.claimCount >= 10) {
    throw new HttpsError("resource-exhausted", "This referral code has reached its maximum claims.");
  }

  // Build premium subscription data (7 days, same pattern as startFreeTrial)
  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + 7);

  const subscriptionData = {
    planId: "elite_monthly",
    tier: "elite",
    status: "referral_reward",
    startDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const referrerProfileRef = db.doc(`users/${referrerUid}/data/profile`);

  // Use a transaction to atomically update all documents
  await db.runTransaction(async (t) => {
    const freshCodeDoc = await t.get(codeRef);
    const freshCodeData = freshCodeDoc.data();

    // Re-check claim count inside transaction
    if (freshCodeData.claimCount >= 10) {
      throw new HttpsError("resource-exhausted", "This referral code has reached its maximum claims.");
    }

    // 1. Increment claimCount and add to claims array
    t.update(codeRef, {
      claimCount: admin.firestore.FieldValue.increment(1),
      claims: admin.firestore.FieldValue.arrayUnion({
        uid: callerUid,
        claimedAt: now.toISOString(),
      }),
    });

    // 2. Set caller's referredBy
    t.set(callerProfileRef, { referredBy: referralCode }, { merge: true });

    // 3. Grant 7 days premium to caller
    t.set(
      callerProfileRef,
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );
    t.set(
      db.doc(`users/${callerUid}`),
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );

    // 4. Grant 7 days premium to referrer
    t.set(
      referrerProfileRef,
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );
    t.set(
      db.doc(`users/${referrerUid}`),
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );
  });

  return { success: true, message: "7 days premium activated for both!" };
});

// ============================================================================
// IRONCORE OPEN API — The first fitness API for the AI agent era
// ============================================================================

const VALID_API_SCOPES = [
  "workouts:read",
  "workouts:write",
  "nutrition:read",
  "nutrition:write",
  "progress:read",
  "profile:read",
  "battles:read",
  "battles:create",
  "leaderboard:read",
  "guild:read",
];

// --- Helper: Set CORS headers on every response ---
function setCorsHeaders(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

// --- Helper: Handle OPTIONS preflight ---
function handleCorsPreflightIfNeeded(req, res) {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return true;
  }
  return false;
}

// --- Helper: Validate API Key (NOT exported) ---
async function validateApiKey(keyRaw, requiredScope) {
  const db = admin.firestore();

  if (!keyRaw || typeof keyRaw !== "string" || !keyRaw.startsWith("ic_")) {
    throw new Error("Invalid API key format.");
  }

  const hash = crypto.createHash("sha256").update(keyRaw).digest("hex");
  const keyRef = db.collection("apiKeys").doc(hash);
  const keySnap = await keyRef.get();

  if (!keySnap.exists) {
    throw new Error("API key not found.");
  }

  const keyDoc = keySnap.data();

  if (keyDoc.revoked) {
    throw new Error("API key has been revoked.");
  }

  if (!keyDoc.scopes.includes(requiredScope)) {
    throw new Error(`API key does not have scope: ${requiredScope}`);
  }

  // Rate limit: max 100 requests per minute
  const rateLimitRef = db.collection("apiRateLimits").doc(hash);
  await db.runTransaction(async (t) => {
    const rlSnap = await t.get(rateLimitRef);
    const now = Date.now();
    const windowMs = 60_000;

    if (rlSnap.exists) {
      const rlData = rlSnap.data();
      const windowStart = rlData.windowStart || 0;
      const count = rlData.count || 0;

      if (now - windowStart < windowMs) {
        if (count >= 100) {
          throw new Error("Rate limit exceeded. Max 100 requests per minute.");
        }
        t.update(rateLimitRef, { count: count + 1 });
      } else {
        t.set(rateLimitRef, { windowStart: now, count: 1 });
      }
    } else {
      t.set(rateLimitRef, { windowStart: now, count: 1 });
    }
  });

  // Update usage stats
  await keyRef.update({
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    requestCount: admin.firestore.FieldValue.increment(1),
  });

  return { uid: keyDoc.uid, scopes: keyDoc.scopes, keyDoc };
}

// --- Helper: Log API Call (NOT exported) ---
async function logApiCall(uid, keyHash, endpoint, method, statusCode) {
  const db = admin.firestore();

  await db.collection("apiAuditLog").add({
    uid,
    keyHash: keyHash.substring(0, 16),
    endpoint,
    method,
    statusCode,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Trim: cap at 10000 audit logs per user
  const userLogs = await db
    .collection("apiAuditLog")
    .where("uid", "==", uid)
    .orderBy("timestamp", "desc")
    .offset(10000)
    .limit(500)
    .get();

  if (!userLogs.empty) {
    const batch = db.batch();
    userLogs.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

// --- Helper: Extract and validate API key from Authorization header ---
async function extractApiAuth(req, requiredScope) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header. Use: Bearer ic_...");
  }
  const keyRaw = authHeader.replace("Bearer ", "").trim();
  const result = await validateApiKey(keyRaw, requiredScope);
  const keyHash = crypto.createHash("sha256").update(keyRaw).digest("hex");
  return { ...result, keyHash };
}

// ============================================================================
// SECTION 1: API Key Management (Callable Functions)
// ============================================================================

// --- Generate API Key ---
exports.generateApiKey = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = request.auth.uid;
  const { name, scopes } = request.data;

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 50) {
    throw new HttpsError("invalid-argument", "name is required and must be a string (max 50 chars).");
  }

  // Validate scopes
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new HttpsError("invalid-argument", "scopes must be a non-empty array.");
  }
  for (const scope of scopes) {
    if (!VALID_API_SCOPES.includes(scope)) {
      throw new HttpsError("invalid-argument", `Invalid scope: ${scope}. Valid scopes: ${VALID_API_SCOPES.join(", ")}`);
    }
  }

  const db = admin.firestore();
  const profileRef = db.doc(`users/${uid}/data/profile`);
  const profileSnap = await profileRef.get();
  const profileData = profileSnap.exists ? profileSnap.data() : {};
  const existingKeys = profileData.apiKeys || [];

  // Max 5 keys per user
  if (existingKeys.length >= 5) {
    throw new HttpsError("resource-exhausted", "Maximum 5 API keys per user. Revoke an existing key first.");
  }

  // Generate the raw key: ic_ + 48 hex chars
  const rawHex = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  const rawKey = `ic_${rawHex}`;
  const keyPrefix = rawKey.substring(0, 11); // "ic_" + first 8 hex chars

  // Hash the key for storage
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Store hashed key in apiKeys collection
  await db.collection("apiKeys").doc(keyHash).set({
    uid,
    name: name.trim(),
    scopes,
    createdAt: now,
    lastUsedAt: null,
    requestCount: 0,
    revoked: false,
  });

  // Add reference to user profile
  const keyMeta = {
    keyPrefix,
    name: name.trim(),
    scopes,
    createdAt: new Date().toISOString(),
  };
  await profileRef.set(
    { apiKeys: admin.firestore.FieldValue.arrayUnion(keyMeta) },
    { merge: true }
  );

  // Return the raw key ONCE — it is never stored
  return {
    key: rawKey,
    prefix: keyPrefix,
    name: name.trim(),
    scopes,
  };
});

// --- List API Keys ---
exports.listApiKeys = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const profileRef = db.doc(`users/${uid}/data/profile`);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    return { keys: [] };
  }

  const profileData = profileSnap.data();
  const keys = (profileData.apiKeys || []).map((k) => ({
    keyPrefix: k.keyPrefix,
    name: k.name,
    scopes: k.scopes,
    createdAt: k.createdAt,
  }));

  return { keys };
});

// --- Revoke API Key ---
exports.revokeApiKey = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = request.auth.uid;
  const { keyPrefix } = request.data;

  if (!keyPrefix || typeof keyPrefix !== "string") {
    throw new HttpsError("invalid-argument", "keyPrefix is required.");
  }

  const db = admin.firestore();

  // Find the key in apiKeys collection by uid + prefix match
  const keysSnap = await db
    .collection("apiKeys")
    .where("uid", "==", uid)
    .where("revoked", "==", false)
    .get();

  let foundKeyRef = null;
  for (const doc of keysSnap.docs) {
    // Reconstruct: we can't reverse the hash, so we match by checking all user keys
    // The prefix is stored in the user profile, so we find the matching doc
    const keyData = doc.data();
    if (keyData.name) {
      // Check if this key matches by looking at user profile
      foundKeyRef = doc.ref;
      // We need to verify this is the right key via the profile
    }
  }

  // Look up in user profile to find the matching key metadata
  const profileRef = db.doc(`users/${uid}/data/profile`);
  const profileSnap = await profileRef.get();
  const profileData = profileSnap.exists ? profileSnap.data() : {};
  const existingKeys = profileData.apiKeys || [];

  const matchingKeyMeta = existingKeys.find((k) => k.keyPrefix === keyPrefix);
  if (!matchingKeyMeta) {
    throw new HttpsError("not-found", "API key with that prefix not found.");
  }

  // Find the actual apiKeys doc — match by uid and name+scopes+createdAt
  let revokedCount = 0;
  for (const doc of keysSnap.docs) {
    const keyData = doc.data();
    if (
      keyData.name === matchingKeyMeta.name &&
      JSON.stringify(keyData.scopes) === JSON.stringify(matchingKeyMeta.scopes)
    ) {
      await doc.ref.update({ revoked: true });
      revokedCount++;
      break;
    }
  }

  // Remove from user profile
  await profileRef.update({
    apiKeys: admin.firestore.FieldValue.arrayRemove(matchingKeyMeta),
  });

  return { success: true, revokedPrefix: keyPrefix };
});

// ============================================================================
// SECTION 3: REST API Endpoints (onRequest — HTTP endpoints for external agents)
// ============================================================================

// --- GET /apiGetProfile ---
exports.apiGetProfile = onRequest(async (req, res) => {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  setCorsHeaders(res);

  let auth;
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: true, message: "Method not allowed. Use GET.", code: 405 });
      return;
    }

    auth = await extractApiAuth(req, "profile:read");
    const db = admin.firestore();
    const profileRef = db.doc(`users/${auth.uid}/data/profile`);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      await logApiCall(auth.uid, auth.keyHash, "/apiGetProfile", "GET", 404);
      res.status(404).json({ error: true, message: "Profile not found.", code: 404 });
      return;
    }

    const p = profileSnap.data();
    const safeProfile = {
      username: p.username || null,
      level: p.level || 1,
      xp: p.xp || 0,
      league: p.league || "iron",
      currentForge: p.currentForge || 0,
      longestForge: p.longestForge || 0,
      wins: p.wins || 0,
      losses: p.losses || 0,
      eloRating: p.eloRating || 1000,
      workoutsCompleted: p.workoutsCompleted || 0,
      joinedAt: p.joinedAt || null,
    };

    await logApiCall(auth.uid, auth.keyHash, "/apiGetProfile", "GET", 200);
    res.status(200).json(safeProfile);
  } catch (err) {
    const keyHash = auth ? auth.keyHash : "unknown";
    const uid = auth ? auth.uid : "unknown";
    try { await logApiCall(uid, keyHash, "/apiGetProfile", "GET", 401); } catch (_) {}
    res.status(401).json({ error: true, message: err.message, code: 401 });
  }
});

// --- GET /apiGetWorkouts ---
exports.apiGetWorkouts = onRequest(async (req, res) => {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  setCorsHeaders(res);

  let auth;
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: true, message: "Method not allowed. Use GET.", code: 405 });
      return;
    }

    auth = await extractApiAuth(req, "workouts:read");
    const db = admin.firestore();

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const from = req.query.from || null;
    const to = req.query.to || null;

    let query = db
      .collection(`users/${auth.uid}/workouts`)
      .orderBy("createdAt", "desc");

    if (from) {
      query = query.where("createdAt", ">=", new Date(from));
    }
    if (to) {
      query = query.where("createdAt", "<=", new Date(to));
    }

    query = query.offset(offset).limit(limit);
    const snap = await query.get();

    const workouts = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        date: d.date || null,
        exercises: (d.exercises || []).map((ex) => ({
          name: ex.name,
          sets: (ex.sets || []).map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
        duration: d.duration || null,
        volume: d.volume || null,
        createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : null,
      };
    });

    await logApiCall(auth.uid, auth.keyHash, "/apiGetWorkouts", "GET", 200);
    res.status(200).json({ workouts, count: workouts.length, limit, offset });
  } catch (err) {
    const keyHash = auth ? auth.keyHash : "unknown";
    const uid = auth ? auth.uid : "unknown";
    try { await logApiCall(uid, keyHash, "/apiGetWorkouts", "GET", 401); } catch (_) {}
    res.status(401).json({ error: true, message: err.message, code: 401 });
  }
});

// --- POST /apiCreateWorkout ---
exports.apiCreateWorkout = onRequest(async (req, res) => {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  setCorsHeaders(res);

  let auth;
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: true, message: "Method not allowed. Use POST.", code: 405 });
      return;
    }

    auth = await extractApiAuth(req, "workouts:write");
    const db = admin.firestore();

    const { exercises, duration, date } = req.body;

    // Validate exercises
    if (!Array.isArray(exercises) || exercises.length === 0) {
      await logApiCall(auth.uid, auth.keyHash, "/apiCreateWorkout", "POST", 400);
      res.status(400).json({ error: true, message: "exercises must be a non-empty array.", code: 400 });
      return;
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex.name || typeof ex.name !== "string") {
        await logApiCall(auth.uid, auth.keyHash, "/apiCreateWorkout", "POST", 400);
        res.status(400).json({ error: true, message: `exercises[${i}].name must be a string.`, code: 400 });
        return;
      }
      if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
        await logApiCall(auth.uid, auth.keyHash, "/apiCreateWorkout", "POST", 400);
        res.status(400).json({ error: true, message: `exercises[${i}].sets must be a non-empty array.`, code: 400 });
        return;
      }
      for (let j = 0; j < ex.sets.length; j++) {
        const s = ex.sets[j];
        if (typeof s.weight !== "number" || typeof s.reps !== "number") {
          await logApiCall(auth.uid, auth.keyHash, "/apiCreateWorkout", "POST", 400);
          res.status(400).json({
            error: true,
            message: `exercises[${i}].sets[${j}] must have numeric weight and reps.`,
            code: 400,
          });
          return;
        }
      }
    }

    // Calculate volume
    let totalVolume = 0;
    const cleanExercises = exercises.map((ex) => {
      const cleanSets = ex.sets.map((s) => {
        totalVolume += s.weight * s.reps;
        return { weight: s.weight, reps: s.reps };
      });
      return { name: ex.name, sets: cleanSets };
    });

    // Write workout
    const workoutData = {
      exercises: cleanExercises,
      duration: typeof duration === "number" ? duration : null,
      date: date || new Date().toISOString().split("T")[0],
      volume: totalVolume,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "api",
    };

    const workoutRef = await db.collection(`users/${auth.uid}/workouts`).add(workoutData);

    // Award XP using same XP_MAP pattern as awardActivityXP
    const XP_MAP = {
      meal: 10,
      workout: 50,
      progress: 20,
      burned: 15,
    };
    const xpAwarded = XP_MAP.workout;

    const profileRef = db.doc(`users/${auth.uid}/data/profile`);
    const leaderboardRef = db.doc(`leaderboard/${auth.uid}`);

    await db.runTransaction(async (t) => {
      const profileSnap = await t.get(profileRef);
      const currentXp = profileSnap.exists ? (profileSnap.data().xp || 0) : 0;
      const updatedXp = currentXp + xpAwarded;
      const currentCount = profileSnap.exists ? (profileSnap.data().workoutsCompleted || 0) : 0;

      if (profileSnap.exists) {
        t.update(profileRef, { xp: updatedXp, workoutsCompleted: currentCount + 1 });
      } else {
        t.set(profileRef, { xp: updatedXp, workoutsCompleted: 1 });
      }

      t.set(leaderboardRef, { xp: updatedXp, uid: auth.uid }, { merge: true });
    });

    await logApiCall(auth.uid, auth.keyHash, "/apiCreateWorkout", "POST", 201);
    res.status(201).json({ success: true, workoutId: workoutRef.id, xpAwarded });
  } catch (err) {
    const keyHash = auth ? auth.keyHash : "unknown";
    const uid = auth ? auth.uid : "unknown";
    try { await logApiCall(uid, keyHash, "/apiCreateWorkout", "POST", err.message.includes("Rate limit") ? 429 : 401); } catch (_) {}
    const code = err.message.includes("Rate limit") ? 429 : 401;
    res.status(code).json({ error: true, message: err.message, code });
  }
});

// --- GET /apiGetNutrition ---
exports.apiGetNutrition = onRequest(async (req, res) => {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  setCorsHeaders(res);

  let auth;
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: true, message: "Method not allowed. Use GET.", code: 405 });
      return;
    }

    auth = await extractApiAuth(req, "nutrition:read");
    const db = admin.firestore();

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const dateFilter = req.query.date || null;

    let query = db
      .collection(`users/${auth.uid}/meals`)
      .orderBy("createdAt", "desc");

    if (dateFilter) {
      query = query.where("date", "==", dateFilter);
    }

    query = query.limit(limit);
    const snap = await query.get();

    const meals = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || null,
        calories: d.calories || 0,
        protein: d.protein || 0,
        carbs: d.carbs || 0,
        fat: d.fat || 0,
        date: d.date || null,
        createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : null,
      };
    });

    await logApiCall(auth.uid, auth.keyHash, "/apiGetNutrition", "GET", 200);
    res.status(200).json({ meals, count: meals.length });
  } catch (err) {
    const keyHash = auth ? auth.keyHash : "unknown";
    const uid = auth ? auth.uid : "unknown";
    try { await logApiCall(uid, keyHash, "/apiGetNutrition", "GET", 401); } catch (_) {}
    res.status(401).json({ error: true, message: err.message, code: 401 });
  }
});

// --- GET /apiGetLeaderboard ---
exports.apiGetLeaderboard = onRequest(async (req, res) => {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  setCorsHeaders(res);

  let auth;
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: true, message: "Method not allowed. Use GET.", code: 405 });
      return;
    }

    auth = await extractApiAuth(req, "leaderboard:read");
    const db = admin.firestore();

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const snap = await db
      .collection("leaderboard")
      .orderBy("xp", "desc")
      .limit(limit)
      .get();

    const leaderboard = snap.docs.map((doc, index) => {
      const d = doc.data();
      return {
        rank: index + 1,
        uid: doc.id,
        username: d.username || null,
        xp: d.xp || 0,
        level: d.level || 1,
        league: d.league || "iron",
        wins: d.wins || 0,
      };
    });

    await logApiCall(auth.uid, auth.keyHash, "/apiGetLeaderboard", "GET", 200);
    res.status(200).json({ leaderboard, count: leaderboard.length });
  } catch (err) {
    const keyHash = auth ? auth.keyHash : "unknown";
    const uid = auth ? auth.uid : "unknown";
    try { await logApiCall(uid, keyHash, "/apiGetLeaderboard", "GET", 401); } catch (_) {}
    res.status(401).json({ error: true, message: err.message, code: 401 });
  }
});

// --- POST /apiCreateBattle ---
exports.apiCreateBattle = onRequest(async (req, res) => {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  setCorsHeaders(res);

  let auth;
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: true, message: "Method not allowed. Use POST.", code: 405 });
      return;
    }

    auth = await extractApiAuth(req, "battles:create");
    const db = admin.firestore();

    const { opponentUsername } = req.body;
    if (!opponentUsername || typeof opponentUsername !== "string") {
      await logApiCall(auth.uid, auth.keyHash, "/apiCreateBattle", "POST", 400);
      res.status(400).json({ error: true, message: "opponentUsername is required.", code: 400 });
      return;
    }

    // Look up opponent by username in usernames collection
    const usernameSnap = await db.collection("usernames").doc(opponentUsername.toLowerCase()).get();
    if (!usernameSnap.exists) {
      await logApiCall(auth.uid, auth.keyHash, "/apiCreateBattle", "POST", 404);
      res.status(404).json({ error: true, message: "Opponent not found.", code: 404 });
      return;
    }

    const opponentUid = usernameSnap.data().uid;

    if (opponentUid === auth.uid) {
      await logApiCall(auth.uid, auth.keyHash, "/apiCreateBattle", "POST", 400);
      res.status(400).json({ error: true, message: "Cannot battle yourself.", code: 400 });
      return;
    }

    // Get both profiles
    const [challengerSnap, opponentProfileSnap] = await Promise.all([
      db.doc(`users/${auth.uid}/data/profile`).get(),
      db.doc(`users/${opponentUid}/data/profile`).get(),
    ]);

    const challengerData = challengerSnap.exists ? challengerSnap.data() : {};
    const opponentData = opponentProfileSnap.exists ? opponentProfileSnap.data() : {};

    // Create battle document
    const battleData = {
      challengerUid: auth.uid,
      challengerUsername: challengerData.username || "Unknown",
      opponentUid,
      opponentUsername: opponentData.username || opponentUsername,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
      source: "api",
    };

    const battleRef = await db.collection("battles").add(battleData);

    await logApiCall(auth.uid, auth.keyHash, "/apiCreateBattle", "POST", 201);
    res.status(201).json({ success: true, battleId: battleRef.id });
  } catch (err) {
    const keyHash = auth ? auth.keyHash : "unknown";
    const uid = auth ? auth.uid : "unknown";
    try { await logApiCall(uid, keyHash, "/apiCreateBattle", "POST", err.message.includes("Rate limit") ? 429 : 401); } catch (_) {}
    const code = err.message.includes("Rate limit") ? 429 : 401;
    res.status(code).json({ error: true, message: err.message, code });
  }
});
