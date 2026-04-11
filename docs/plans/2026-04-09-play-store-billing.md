# Play Store Billing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all Razorpay payment code with Google Play Billing via `cordova-plugin-purchase`, so the Capacitor app can ship on the Play Store.

**Architecture:** Client uses `cordova-plugin-purchase` (v13+) to handle the Google Play purchase flow. On successful purchase, the receipt (purchase token) is sent to a new `verifyGooglePlayPurchase` Cloud Function, which validates it against the Google Play Developer API and writes the subscription to Firestore. All Razorpay code (client + server + webhook) is deleted.

**Tech Stack:** cordova-plugin-purchase v13, Firebase Cloud Functions v2, Google Play Developer API (googleapis npm), Capacitor 8

---

### Task 1: Install cordova-plugin-purchase

**Files:**
- Modify: `package.json`

**Step 1: Install the plugin**

Run:
```bash
cd C:/Users/devda/iron-ai
npm install cordova-plugin-purchase
npx cap sync android
```

Expected: package.json updated with `cordova-plugin-purchase` dependency, android project synced.

**Step 2: Verify installation**

Run:
```bash
grep "cordova-plugin-purchase" package.json
```

Expected: Shows the dependency line.

**Step 3: Commit**

```bash
git add package.json package-lock.json android/
git commit -m "feat: add cordova-plugin-purchase for Google Play Billing"
```

---

### Task 2: Create playBillingService.js

**Files:**
- Create: `src/services/playBillingService.js`

**Step 1: Create the Play Billing service**

This service wraps `cordova-plugin-purchase` and exposes: `initStore()`, `purchaseSubscription()`, `restorePurchases()`.

```js
// IronCore AI - Google Play Billing Service
// Wraps cordova-plugin-purchase for Capacitor Android

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import 'cordova-plugin-purchase/www/store';

const { CdvPurchase } = window;

// Google Play product IDs — must match Play Console entries
const PRODUCT_IDS = [
    'pro_monthly',
    'pro_yearly',
    'elite_monthly',
    'elite_yearly',
];

let storeInitialized = false;

/**
 * Initialize the CdvPurchase store and register products.
 * Call once on app start (after deviceready / Capacitor ready).
 */
export const initStore = () => {
    if (storeInitialized || !CdvPurchase) return;

    const store = CdvPurchase.store;

    // Register all subscription products
    PRODUCT_IDS.forEach(id => {
        store.register({
            id,
            type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
            platform: CdvPurchase.Platform.GOOGLE_PLAY,
        });
    });

    // Set up receipt verification via Cloud Function
    store.validator = async (receipt, callback) => {
        try {
            const transaction = receipt.transactions?.[0];
            if (!transaction) {
                callback({ ok: false, message: 'No transaction found' });
                return;
            }

            const purchaseToken = transaction.purchaseToken || transaction.receipt;
            const productId = transaction.products?.[0]?.id || receipt.products?.[0]?.id;

            if (!purchaseToken || !productId) {
                callback({ ok: false, message: 'Missing purchase token or product ID' });
                return;
            }

            const functions = getFunctions(getApp());
            const verify = httpsCallable(functions, 'verifyGooglePlayPurchase');
            const result = await verify({ purchaseToken, productId });

            if (result.data?.success) {
                callback({ ok: true, data: { transaction: { type: 'android-playstore' } } });
            } else {
                callback({ ok: false, message: result.data?.error || 'Verification failed' });
            }
        } catch (err) {
            console.error('[PlayBilling] Verification error:', err);
            callback({ ok: false, message: err.message });
        }
    };

    store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    storeInitialized = true;
};

/**
 * Get the CdvPurchase product object for a given plan ID.
 */
export const getProduct = (planId) => {
    if (!CdvPurchase) return null;
    return CdvPurchase.store.get(planId, CdvPurchase.Platform.GOOGLE_PLAY);
};

/**
 * Get all registered products with their Play Store prices.
 */
export const getProducts = () => {
    if (!CdvPurchase) return [];
    return PRODUCT_IDS.map(id => CdvPurchase.store.get(id, CdvPurchase.Platform.GOOGLE_PLAY)).filter(Boolean);
};

/**
 * Launch the Google Play purchase flow for a subscription.
 * Returns a promise that resolves when the purchase is verified or rejects on error.
 */
export const purchaseSubscription = (planId) => {
    return new Promise((resolve, reject) => {
        if (!CdvPurchase) {
            reject(new Error('Billing not available'));
            return;
        }

        const product = getProduct(planId);
        if (!product) {
            reject(new Error(`Product ${planId} not found`));
            return;
        }

        const offer = product.getOffer();
        if (!offer) {
            reject(new Error(`No offer found for ${planId}`));
            return;
        }

        const store = CdvPurchase.store;

        // Listen for this specific product's verified/unverified events
        const onApproved = (transaction) => {
            transaction.verify();
        };

        const onVerified = (receipt) => {
            receipt.finish();
            cleanup();
            resolve({ success: true, planId });
        };

        const onError = (error) => {
            cleanup();
            reject(new Error(error.message || 'Purchase failed'));
        };

        const cleanup = () => {
            store.off(onApproved);
            store.off(onVerified);
            store.off(onError);
        };

        store.when()
            .approved(onApproved)
            .verified(onVerified);
        store.error(onError);

        // Initiate the purchase
        offer.order()
            .then(error => {
                if (error) {
                    cleanup();
                    reject(new Error(error.message || 'Order failed'));
                }
                // If no error, the purchase flow has started — wait for approved/verified callbacks
            });
    });
};

/**
 * Restore previous purchases (e.g., after reinstall or device switch).
 * Triggers re-verification of owned subscriptions.
 */
export const restorePurchases = async () => {
    if (!CdvPurchase) return { restored: false, message: 'Billing not available' };

    try {
        await CdvPurchase.store.restorePurchases();
        return { restored: true };
    } catch (err) {
        return { restored: false, message: err.message || 'Restore failed' };
    }
};
```

**Step 2: Commit**

```bash
git add src/services/playBillingService.js
git commit -m "feat: add playBillingService wrapping cordova-plugin-purchase"
```

---

### Task 3: Rewrite paymentService.js (remove Razorpay)

**Files:**
- Modify: `src/services/paymentService.js` (full rewrite)

**Step 1: Rewrite paymentService.js**

Keep: FEATURE_ACCESS, PRICING_PLANS, getTierFromPlan, meetsMinTier, checkPremiumStatus, startFreeTrial, getFeatureLimit, canUseFeature.

Remove: initializeRazorpay, createPaymentOrder, openCheckout, activateSubscription (lines 88-218).

Add: purchasePlan() that delegates to playBillingService.

The new file should be:

```js
// IronCore AI - Payment Service (Google Play Billing)
// Handles subscriptions and premium status

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../firebase';
import { throttleAction } from '../utils/rateLimiter';
import { purchaseSubscription, restorePurchases as restorePlayPurchases } from './playBillingService';

// ─── Feature access matrix (3-tier: free / pro / elite) ────────────────────
export const FEATURE_ACCESS = {
    aiCoachCalls:          { free: 3,     pro: Infinity, elite: Infinity },
    progressPhotos:        { free: 5,     pro: Infinity, elite: Infinity },
    workoutHistory:        { free: 7,     pro: Infinity, elite: Infinity },
    arenaBattles:          { free: false, pro: true,     elite: true },
    guilds:                { free: false, pro: false,    elite: true },
    guildWars:             { free: false, pro: false,    elite: true },
    battlePassPremiumTrack:{ free: false, pro: false,    elite: true },
    formCorrectionBasic:   { free: true,  pro: true,     elite: true },
    formCorrection:        { free: false, pro: false,    elite: true },
    priorityAI:            { free: false, pro: false,    elite: true },
    customPrograms:        { free: false, pro: false,    elite: true },
    advancedStats:         { free: false, pro: true,     elite: true },
};

// Derive tier from planId
export const getTierFromPlan = (planId) => {
    if (!planId || planId === 'free') return 'free';
    if (planId.startsWith('elite')) return 'elite';
    if (planId.startsWith('pro')) return 'pro';
    return 'free';
};

// Tier hierarchy for comparisons
const TIER_RANK = { free: 0, pro: 1, elite: 2 };
export const meetsMinTier = (currentTier, minTier) =>
    (TIER_RANK[currentTier] || 0) >= (TIER_RANK[minTier] || 0);

// Pricing Plans
export const PRICING_PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        tier: 'free',
        priceUSD: 0,
        priceINR: 0,
        period: null,
        features: FEATURE_ACCESS,
    },
    pro_monthly: {
        id: 'pro_monthly',
        name: 'Pro',
        tier: 'pro',
        priceUSD: 9.99,
        priceINR: 799,
        period: 'monthly',
        features: FEATURE_ACCESS,
    },
    pro_yearly: {
        id: 'pro_yearly',
        name: 'Pro',
        tier: 'pro',
        priceUSD: 59.99,
        priceINR: 4999,
        period: 'yearly',
        features: FEATURE_ACCESS,
    },
    elite_monthly: {
        id: 'elite_monthly',
        name: 'Elite',
        tier: 'elite',
        priceUSD: 16.99,
        priceINR: 1399,
        period: 'monthly',
        features: FEATURE_ACCESS,
    },
    elite_yearly: {
        id: 'elite_yearly',
        name: 'Elite',
        tier: 'elite',
        priceUSD: 99.99,
        priceINR: 7999,
        period: 'yearly',
        features: FEATURE_ACCESS,
    },
};

// Purchase a subscription via Google Play Billing
export const purchasePlan = async (planId) => {
    const plan = PRICING_PLANS[planId];
    if (!plan || plan.priceUSD === 0) {
        throw new Error('Invalid plan selected');
    }

    const { allowed } = throttleAction('payment_order', 30000);
    if (!allowed) {
        throw new Error('Payment already in progress — please wait before retrying.');
    }

    return purchaseSubscription(planId);
};

// Restore purchases from Google Play
export const restorePurchase = async () => {
    return restorePlayPurchases();
};

// Check if user has active premium subscription
export const checkPremiumStatus = async (userId) => {
    if (!userId) return { isPremium: false, plan: 'free' };

    try {
        const profileRef = doc(db, 'users', userId, 'data', 'profile');
        const profileDoc = await getDoc(profileRef);

        if (!profileDoc.exists()) {
            return { isPremium: false, plan: 'free' };
        }

        const profileData = profileDoc.data();
        const subscription = profileData.subscription;

        const isActive = subscription?.status === 'active';
        const isTrial = subscription?.status === 'trial';

        if (!subscription || (!isActive && !isTrial)) {
            return { isPremium: false, plan: 'free', tier: 'free' };
        }

        const expiry = isTrial ? subscription.trialEnd : subscription.expiryDate;
        if (expiry && new Date(expiry) < new Date()) {
            await updateDoc(profileRef, {
                'subscription.status': 'expired'
            });
            return { isPremium: false, plan: 'free', tier: 'free', expired: true };
        }

        const planId = subscription.planId || 'free';
        const tier = getTierFromPlan(planId);

        return {
            isPremium: true,
            plan: planId,
            tier,
            isTrial,
            expiryDate: expiry,
        };
    } catch (error) {
        console.error('Error checking premium status:', error);
        return { isPremium: false, plan: 'free' };
    }
};

// Start 7-day free trial via Cloud Function
export const startFreeTrial = async (userId) => {
    if (!userId) throw new Error('Not signed in');

    try {
        const functions = getFunctions(getApp());
        const startTrial = httpsCallable(functions, 'startFreeTrial');
        const result = await startTrial({});
        return result.data.subscription;
    } catch (e) {
        console.error('Failed to start free trial:', e);
        if (e.code === 'functions/already-exists') {
            throw new Error(e.message);
        }
        throw new Error('Could not start free trial. Try again later.');
    }
};

// Get the limit value for a feature at a given tier
export const getFeatureLimit = (feature, tier = 'free') => {
    const access = FEATURE_ACCESS[feature];
    if (!access) return false;
    return access[tier] ?? access.free ?? false;
};

// Check if a specific feature is available for a tier
export const canUseFeature = (feature, planId = 'free') => {
    const tier = getTierFromPlan(planId);
    const limit = getFeatureLimit(feature, tier);

    if (limit === Infinity || limit === true) return true;
    if (limit === false || limit === 0) return false;

    return limit;
};
```

**Step 2: Commit**

```bash
git add src/services/paymentService.js
git commit -m "feat: rewrite paymentService to use Google Play Billing, remove Razorpay"
```

---

### Task 4: Update PremiumContext.jsx

**Files:**
- Modify: `src/context/PremiumContext.jsx`

**Step 1: Update imports**

Replace lines 5-15 (the Razorpay imports) with:

```js
import {
    checkPremiumStatus,
    purchasePlan as purchasePlanService,
    restorePurchase as restorePurchaseService,
    startFreeTrial,
    PRICING_PLANS,
    FEATURE_ACCESS,
    canUseFeature,
    getTierFromPlan,
    meetsMinTier,
} from '../services/paymentService';
```

**Step 2: Rewrite the purchasePlan callback (lines 82-126)**

Replace with:

```js
    const purchasePlan = useCallback(async (planId, onSuccess, onError) => {
        if (!user?.uid) {
            onError?.(new Error('Please sign in to purchase'));
            return;
        }

        const capturedUid = user.uid;

        try {
            await purchasePlanService(planId);

            // Purchase verified server-side — refresh local state
            try {
                const status = await checkPremiumStatus(capturedUid);
                setIsPremium(status.isPremium);
                setPlan(status.plan);
                setTier(status.tier || getTierFromPlan(status.plan));
                setIsTrial(status.isTrial || false);
                setExpiryDate(status.expiryDate || null);
                setShowPaywall(false);
            } catch (err) {
                console.error('Error refreshing premium status:', err);
            }
            onSuccess?.({ planId });
        } catch (error) {
            console.error('Purchase failed:', error);
            onError?.(error);
        }
    }, [user?.uid]);
```

**Step 3: Update restorePurchase callback (lines 135-154)**

Replace with:

```js
    const restorePurchase = useCallback(async () => {
        if (!user?.uid) return { restored: false, message: 'Not signed in.' };

        try {
            const result = await restorePurchaseService();
            if (result.restored) {
                const status = await checkPremiumStatus(user.uid);
                if (status.isPremium) {
                    setIsPremium(true);
                    setPlan(status.plan);
                    setTier(status.tier || getTierFromPlan(status.plan));
                    setIsTrial(status.isTrial || false);
                    setExpiryDate(status.expiryDate || null);
                    setShowPaywall(false);
                    return { restored: true };
                }
            }
            return { restored: false, message: 'No active subscription found. Contact support if you believe this is wrong.' };
        } catch (err) {
            console.error('[Premium] restorePurchase failed:', err.message);
            return { restored: false, message: 'Connection error. Try again.' };
        }
    }, [user?.uid]);
```

**Step 4: Commit**

```bash
git add src/context/PremiumContext.jsx
git commit -m "feat: update PremiumContext to use Play Billing instead of Razorpay"
```

---

### Task 5: Add googleapis to Cloud Functions + verifyGooglePlayPurchase

**Files:**
- Modify: `functions/package.json`
- Modify: `functions/index.js`

**Step 1: Add googleapis dependency**

Run:
```bash
cd C:/Users/devda/iron-ai/functions
npm install googleapis
```

**Step 2: Add the Google Play service account secret definition to functions/index.js**

At the top of functions/index.js (around line 12-13), remove the Razorpay secret definitions:

```
DELETE these lines:
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");
```

And add:

```js
const googlePlayServiceAccount = defineSecret("GOOGLE_PLAY_SERVICE_ACCOUNT");
```

**Step 3: Remove createRazorpayOrder (lines 379-455) and verifyPayment (lines 457-562)**

Delete everything from `/** Create a Razorpay order server-side.` (line 379) through to the closing `);` of verifyPayment (line 562).

**Step 4: Remove razorpayWebhook (lines 2018-2140)**

Delete the entire razorpayWebhook export and the `razorpayWebhookSecret` definition (line 2022).

**Step 5: Add verifyGooglePlayPurchase Cloud Function**

Insert the following in place of the removed Razorpay functions (after line 378):

```js
/**
 * Verify a Google Play purchase token server-side.
 * Called by the client after a successful in-app purchase.
 *
 * 1. Authenticates with Google Play Developer API via service account
 * 2. Validates the purchase token for the given product
 * 3. Writes subscription data to Firestore
 * 4. Returns success/failure
 */
exports.verifyGooglePlayPurchase = onCall(
  { secrets: [googlePlayServiceAccount], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const { purchaseToken, productId } = request.data;
    if (!purchaseToken || !productId) {
      throw new HttpsError("invalid-argument", "Missing purchaseToken or productId.");
    }

    // Map product IDs to plan data
    const PLAY_PLANS = {
      pro_monthly:   { planId: "pro_monthly",   tier: "pro",   months: 1 },
      pro_yearly:    { planId: "pro_yearly",    tier: "pro",   months: 12 },
      elite_monthly: { planId: "elite_monthly", tier: "elite", months: 1 },
      elite_yearly:  { planId: "elite_yearly",  tier: "elite", months: 12 },
    };

    const planInfo = PLAY_PLANS[productId];
    if (!planInfo) {
      throw new HttpsError("invalid-argument", `Unknown product: ${productId}`);
    }

    try {
      // Parse the service account JSON from the secret
      const serviceAccount = JSON.parse(googlePlayServiceAccount.value());

      // Authenticate with Google Play Developer API
      const { google } = require("googleapis");
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });

      const androidPublisher = google.androidpublisher({ version: "v3", auth });

      // Verify the subscription purchase
      const response = await androidPublisher.purchases.subscriptions.get({
        packageName: "com.ironcore.ai",
        subscriptionId: productId,
        token: purchaseToken,
      });

      const purchaseData = response.data;

      // Check if the subscription is valid
      // paymentState: 0 = pending, 1 = received, 2 = free trial, 3 = deferred
      if (!purchaseData.expiryTimeMillis) {
        throw new HttpsError("failed-precondition", "Purchase has no expiry — invalid.");
      }

      const expiryTime = parseInt(purchaseData.expiryTimeMillis, 10);
      if (expiryTime < Date.now()) {
        throw new HttpsError("failed-precondition", "Subscription has expired.");
      }

      // Build subscription data (same schema as all other payment flows)
      const uid = request.auth.uid;
      const now = new Date();
      const expiryDate = new Date(expiryTime);

      const subscriptionData = {
        planId: planInfo.planId,
        tier: planInfo.tier,
        status: "active",
        startDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        paymentProvider: "google_play",
        purchaseToken,
        googleOrderId: purchaseData.orderId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Write to Firestore (same paths as all other payment flows)
      const db = admin.firestore();
      const batch = db.batch();

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

      batch.set(db.doc(`subscriptions/${uid}_gp_${Date.now()}`), {
        userId: uid,
        ...subscriptionData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      return { success: true, subscription: subscriptionData };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      functions.logger.error("[verifyGooglePlayPurchase] Error:", e);
      throw new HttpsError("internal", "Purchase verification failed. Contact support if charged.");
    }
  }
);
```

**Step 6: Commit**

```bash
cd C:/Users/devda/iron-ai
git add functions/
git commit -m "feat: add verifyGooglePlayPurchase CF, remove all Razorpay CFs"
```

---

### Task 6: Remove Razorpay from firebase.json CSP

**Files:**
- Modify: `firebase.json` (line 27)

**Step 1: Update CSP header**

In `firebase.json`, line 27, the CSP header references `https://checkout.razorpay.com` in both `script-src` and `frame-src`. Remove those references.

Change the CSP value from:
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com; frame-src https://checkout.razorpay.com; object-src 'none'
```

To:
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com; frame-src 'none'; object-src 'none'
```

**Step 2: Commit**

```bash
git add firebase.json
git commit -m "chore: remove Razorpay CSP rules from firebase.json"
```

---

### Task 7: Initialize billing on app start

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add store initialization**

At the top of App.jsx, add the import:

```js
import { initStore } from './services/playBillingService';
```

Then inside the App component, add a useEffect that initializes the store on mount:

```js
useEffect(() => {
    initStore();
}, []);
```

This should fire once when the app loads. The store needs to be initialized before any purchase can happen.

**Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: initialize Play Billing store on app startup"
```

---

### Task 8: Verify the build compiles

**Step 1: Run the Vite build**

```bash
cd C:/Users/devda/iron-ai
npm run build
```

Expected: Build succeeds with no errors related to Razorpay imports or missing modules.

**Step 2: Sync with Capacitor**

```bash
npx cap sync android
```

Expected: Syncs successfully with the new plugin.

**Step 3: Fix any import errors**

If any component still imports Razorpay functions (`openCheckout`, `createPaymentOrder`, `initializeRazorpay`, `activateSubscription`), update those imports. Check:

```bash
grep -r "openCheckout\|createPaymentOrder\|initializeRazorpay\|activateSubscription\|VITE_RAZORPAY" src/
```

Expected: No matches.

**Step 4: Commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any remaining Razorpay references"
```

---

### Task 9: Google Play Console setup (manual — instructions for developer)

These steps must be done manually in the Google Play Console. They cannot be automated.

**Step 1: Create subscription products in Google Play Console**

Go to Google Play Console > Your app > Monetize > Products > Subscriptions. Create:

| Product ID | Name | Base plan | Price |
|-----------|------|-----------|-------|
| `pro_monthly` | IronCore Pro | Monthly auto-renewing | $9.99/mo |
| `pro_yearly` | IronCore Pro | Yearly auto-renewing | $59.99/yr |
| `elite_monthly` | IronCore Elite | Monthly auto-renewing | $16.99/mo |
| `elite_yearly` | IronCore Elite | Yearly auto-renewing | $99.99/yr |

**Step 2: Create Google Cloud service account**

1. Go to Google Cloud Console > IAM & Admin > Service Accounts
2. Create a service account (e.g., `play-billing-verifier`)
3. No special IAM roles needed at GCP level
4. Create a JSON key and download it

**Step 3: Grant Play Console access**

1. Go to Google Play Console > Settings > API access
2. Link the Google Cloud project
3. Grant the service account "View financial data" permission

**Step 4: Store the service account as a Firebase secret**

```bash
firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT
```

Paste the entire JSON content of the service account key file when prompted.

**Step 5: Deploy Cloud Functions**

```bash
firebase deploy --only functions
```
