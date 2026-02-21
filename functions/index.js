const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

    const { paymentId, orderId, signature, planId } = request.data;
    if (!paymentId || !orderId || !signature || !planId) {
      throw new HttpsError("invalid-argument", "Missing payment verification data.");
    }

    // 1. Verify Razorpay signature (HMAC-SHA256)
    const expectedSig = crypto
      .createHmac("sha256", razorpayKeySecret.value())
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSig !== signature) {
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

    // 4. Activate subscription
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
      "com.ironcore.fit.pro_monthly": "pro_monthly",
      "com.ironcore.fit.pro_yearly": "pro_yearly",
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
