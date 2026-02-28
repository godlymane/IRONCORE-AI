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

      // Update challenger
      const challengerUpdates = {
        eloRating: elo.newRatingA,
        xp: newChallengerXp,
        league: getLeagueForXp(newChallengerXp).name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (winnerId === challengerUid) {
        challengerUpdates.wins = (challengerData.wins || 0) + 1;
      } else if (winnerId !== null) {
        challengerUpdates.losses = (challengerData.losses || 0) + 1;
      }
      transaction.update(challengerRef, challengerUpdates);

      // Update opponent
      const opponentUpdates = {
        eloRating: elo.newRatingB,
        xp: newOpponentXp,
        league: getLeagueForXp(newOpponentXp).name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (winnerId === opponentUid) {
        opponentUpdates.wins = (opponentData.wins || 0) + 1;
      } else if (winnerId !== null) {
        opponentUpdates.losses = (opponentData.losses || 0) + 1;
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
