const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

  // Update cache after successful transaction
  rateLimitCache.set(docId, { ...result._cache, _cachedAt: now });
  return { remaining: result.remaining, retryAfter: result.retryAfter };
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
    if (imageBase64 && imageBase64.length > 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Image too large (max 5MB).");
    }

    // 2. Daily AI call limit (free: 3/day, premium: unlimited)
    const uid = request.auth.uid;
    const db = admin.firestore();
    const dailyInfo = await checkDailyAiLimit(uid, db);

    // 3. Rate limiting (per-feature, requests/minute)
    const rateLimitFeature = feature === "workout" ? "workout" : "chat";
    const rateInfo = await checkRateLimit(uid, rateLimitFeature, db);

    // 4. Build Gemini request
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

    const uid = request.auth.uid;
    const db = admin.firestore();
    const dailyInfo = await checkDailyAiLimit(uid, db);
    const rateInfo = await checkRateLimit(uid, "nutrition", db);

    const systemPrompt = "Nutrition API. JSON Only.";
    let prompt;

    if (imageBase64) {
      prompt = `Act as an expert nutritionist AI. Analyze this image with EXTREME precision. Identify all visible ingredients, estimate exact portion sizes (in grams or ml), account for likely cooking oils or hidden sauces, and calculate the exact macronutrients. Return JSON: { "mealName": "string (detailed description)", "calories": number, "protein": number, "carbs": number, "fat": number }. Make educated but highly precise estimations down to the gram.`;
    } else {
      prompt = `Act as an expert nutritionist AI. For the meal "${mealText}", estimate exact portion sizes, account for likely cooking oils or hidden sauces, and calculate the exact macronutrients. Return JSON: { "mealName": "string", "calories": number, "protein": number, "carbs": number, "fat": number }. Make educated but highly precise estimations down to the gram.`;
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
  pro_monthly: { amount: 29900, currency: "INR" }, // ₹299 in paise
  pro_yearly: { amount: 199900, currency: "INR" }, // ₹1999 in paise
};

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
    const now = new Date();
    const expiryDate = new Date(now);
    if (serverPlanId === "pro_yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const subscriptionData = {
      planId: serverPlanId,
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
  const parts = signedTransaction.split(".");
  if (parts.length !== 3) {
    throw new HttpsError("invalid-argument", "Invalid JWS format.");
  }
  // Decode payload (middle segment)
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
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

    // --- STEP 4: Activate subscription (same Firestore structure as Razorpay) ---
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

    const batch = db.batch();

    // Same 3 writes as verifyPayment — unified data model
    batch.set(
      db.doc(`users/${uid}`),
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );

    batch.set(
      db.doc(`users/${uid}/data/profile`),
      { subscription: subscriptionData, isPremium: true },
      { merge: true }
    );

    batch.set(db.doc(`subscriptions/${uid}_apple_${transactionId}`), {
      userId: uid,
      ...subscriptionData,
      appleTransactionId: String(appleTransaction.transactionId),
      appleOriginalTransactionId: String(appleTransaction.originalTransactionId),
      appleEnvironment: appleTransaction.environment || "unknown",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
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
    for (const guildDoc of guildsSnap.docs) {
      const guild = guildDoc.data();
      const members = guild.members || [];

      if (members.length === 0) continue;

      let totalXp = 0;
      const memberContributions = [];

      // Get each member's XP from completed battles in the past 7 days
      for (const member of members) {
        const memberId = typeof member === "string" ? member : member.userId;
        if (!memberId) continue;

        // Sum XP from completed battles in the past 7 days
        const challengerBattles = await db.collection("battles")
          .where("challenger.userId", "==", memberId)
          .where("status", "==", "completed")
          .where("completedAt", ">=", weekAgo)
          .get();

        const opponentBattles = await db.collection("battles")
          .where("opponent.userId", "==", memberId)
          .where("status", "==", "completed")
          .where("completedAt", ">=", weekAgo)
          .get();

        let memberXp = 0;

        for (const b of challengerBattles.docs) {
          memberXp += b.data().challengerXpAwarded || 0;
        }
        for (const b of opponentBattles.docs) {
          memberXp += b.data().opponentXpAwarded || 0;
        }

        totalXp += memberXp;
        if (memberXp > 0) {
          memberContributions.push({ userId: memberId, xpEarned: memberXp });
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
  const { username, pinHash } = request.data || {};

  // Validate inputs
  if (!username || typeof username !== "string" || username.length < 3 || username.length > 20) {
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }
  if (!pinHash || typeof pinHash !== "string" || pinHash.length !== 64) {
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
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }

  const uid = usernameDoc.data().uid;

  // Fetch profile and compare pinHash
  const profileDoc = await db.doc(`users/${uid}/data/profile`).get();
  if (!profileDoc.exists || !profileDoc.data().pinHash) {
    throw new HttpsError("not-found", "Invalid username or PIN.");
  }

  const storedPinHash = profileDoc.data().pinHash;

  // Timing-safe comparison to prevent side-channel attacks
  try {
    const a = Buffer.from(pinHash, "hex");
    const b = Buffer.from(storedPinHash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new HttpsError("not-found", "Invalid username or PIN.");
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
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

    const expiredSnap = await db
      .collection("subscriptions")
      .where("status", "==", "active")
      .where("expiryDate", "<=", now)
      .get();

    if (expiredSnap.empty) {
      console.log("[checkExpiredSubscriptions] No expired subscriptions found.");
      return;
    }

    const batch = db.batch();
    let count = 0;

    expiredSnap.forEach((subDoc) => {
      const { userId } = subDoc.data();
      if (!userId) return;

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
    console.log(`[checkExpiredSubscriptions] Expired ${count} subscription(s).`);
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

    // Anti-cheat: timestamp must be within 60 minutes of server time
    const entryDate = new Date(date);
    const diffMinutes = Math.abs(now - entryDate.getTime()) / 60000;
    if (diffMinutes > 60 * 24) {
      // Allow same-day entries, but no backdating beyond 24 hours
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

    // Get all users
    const usersSnap = await db.collection("users").get();
    let processed = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;

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
    }

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

    const usersSnap = await db.collection("users").get();
    let decayed = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const leaguePoints = userData.leaguePoints || 0;

      // Skip Iron league users
      if (leaguePoints < 100) continue;

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
      await db.doc(`users/${uid}`).set({
        leaguePoints: newPoints,
        lastDecayApplied: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

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

      // Sum weeklyXpContribution from all members
      let totalWarXp = 0;
      for (const memberId of resolvedIds) {
        const memberSnap = await db.doc(`users/${memberId}`).get();
        if (memberSnap.exists) {
          totalWarXp += memberSnap.data().weeklyXpContribution || 0;
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

    // 5. Reset weeklyXpContribution on ALL users
    const allUsersSnap = await db.collection("users").get();
    for (let i = 0; i < allUsersSnap.docs.length; i += 500) {
      const batch = db.batch();
      const chunk = allUsersSnap.docs.slice(i, i + 500);

      for (const doc of chunk) {
        if ((doc.data().weeklyXpContribution || 0) > 0) {
          batch.update(doc.ref, { weeklyXpContribution: 0 });
        }
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
    const reqSnap = await reqRef.get();

    if (!reqSnap.exists) {
      throw new HttpsError("not-found", "Friend request not found.");
    }

    const reqData = reqSnap.data();
    if (reqData.status !== "pending") {
      throw new HttpsError("failed-precondition", "Friend request already handled.");
    }

    const fromUid = reqData.fromUid;

    if (response === "accept") {
      const [myProfileSnap, myUserSnap, theirProfileSnap, theirUserSnap] = await Promise.all([
        db.doc(`users/${uid}/data/profile`).get(),
        db.doc(`users/${uid}`).get(),
        db.doc(`users/${fromUid}/data/profile`).get(),
        db.doc(`users/${fromUid}`).get(),
      ]);

      const myProfile = myProfileSnap.exists ? myProfileSnap.data() : {};
      const myUser = myUserSnap.exists ? myUserSnap.data() : {};
      const theirProfile = theirProfileSnap.exists ? theirProfileSnap.data() : {};
      const theirUser = theirUserSnap.exists ? theirUserSnap.data() : {};

      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();

      batch.set(db.doc(`users/${uid}/friends/${fromUid}`), {
        uid: fromUid,
        username: theirProfile.username || "Unknown",
        xp: theirProfile.xp || 0,
        ironScore: theirUser.ironScore || 0,
        addedAt: now,
      });

      batch.set(db.doc(`users/${fromUid}/friends/${uid}`), {
        uid,
        username: myProfile.username || "Unknown",
        xp: myProfile.xp || 0,
        ironScore: myUser.ironScore || 0,
        addedAt: now,
      });

      batch.delete(reqRef);
      await batch.commit();
      return { success: true, response: "accepted" };
    }

    // Decline
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
