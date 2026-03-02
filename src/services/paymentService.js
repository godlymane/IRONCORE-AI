// IronCore AI - Payment Service (Razorpay Integration)
// Handles subscriptions and premium status

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../firebase';

// ─── Feature access matrix (3-tier: free / pro / elite) ────────────────────
export const FEATURE_ACCESS = {
    aiCoachCalls:          { free: 3,     pro: Infinity, elite: Infinity },
    progressPhotos:        { free: 5,     pro: Infinity, elite: Infinity },
    workoutHistory:        { free: 7,     pro: Infinity, elite: Infinity },
    arenaBattles:          { free: false, pro: true,     elite: true },
    guilds:                { free: false, pro: false,    elite: true },
    guildWars:             { free: false, pro: false,    elite: true },
    battlePassPremiumTrack:{ free: false, pro: false,    elite: true },
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

// Initialize Razorpay checkout
export const initializeRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Create a payment order via Cloud Function (server-side Razorpay order creation)
// Amount is determined server-side only — client never sends price
export const createPaymentOrder = async (planId, userId) => {
    const plan = PRICING_PLANS[planId];
    if (!plan || plan.price === 0) {
        throw new Error('Invalid plan selected');
    }

    try {
        const functions = getFunctions(getApp());
        const createOrder = httpsCallable(functions, 'createRazorpayOrder');
        const result = await createOrder({ planId });

        if (!result.data?.orderId) {
            throw new Error('Server did not return a valid order ID');
        }

        return {
            planId,
            orderId: result.data.orderId,
            amount: result.data.amount,
            currency: result.data.currency,
            userId,
        };
    } catch (e) {
        console.error('Failed to create Razorpay order:', e);
        throw new Error('Could not create payment order. Try again later.');
    }
};

// Open Razorpay checkout
export const openCheckout = async (orderData, userInfo, onSuccess, onFailure) => {
    const isLoaded = await initializeRazorpay();

    if (!isLoaded) {
        onFailure(new Error('Failed to load Razorpay SDK'));
        return;
    }

    const plan = PRICING_PLANS[orderData.planId];

    if (!orderData.orderId) {
        onFailure(new Error('Missing order ID — payment cannot be verified securely.'));
        return;
    }

    const options = {
        key: (() => {
            const k = import.meta.env.VITE_RAZORPAY_KEY_ID;
            if (!k) throw new Error('VITE_RAZORPAY_KEY_ID is not set — cannot initialize payment.');
            return k;
        })(),
        order_id: orderData.orderId, // Server-generated Razorpay order ID — required for signature verification
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'IronCore AI',
        description: `${plan.name} Subscription`,
        image: '/icon-192.png',
        prefill: {
            name: userInfo.displayName || '',
            email: userInfo.email || '',
            contact: userInfo.phone || ''
        },
        theme: {
            color: '#DC2626'
        },
        handler: async function (response) {
            // Payment successful — verify server-side with order_id + signature
            if (!response.razorpay_order_id || !response.razorpay_signature) {
                onFailure(new Error('Payment response missing verification data.'));
                return;
            }
            try {
                await activateSubscription(orderData.userId, orderData.planId, response);
                onSuccess(response);
            } catch (error) {
                onFailure(error);
            }
        },
        modal: {
            ondismiss: function () {
                console.log('Payment modal closed');
            }
        }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', function (response) {
        onFailure(new Error(response.error.description));
    });
    razorpay.open();
};

// Activate subscription via server-side Cloud Function (validates payment server-side)
// All three Razorpay fields are REQUIRED — server rejects if any are missing
export const activateSubscription = async (userId, planId, paymentResponse) => {
    if (!paymentResponse.razorpay_payment_id || !paymentResponse.razorpay_order_id || !paymentResponse.razorpay_signature) {
        throw new Error('Incomplete payment response — cannot verify.');
    }

    try {
        const functions = getFunctions(getApp());
        const verifyPayment = httpsCallable(functions, 'verifyPayment');
        const result = await verifyPayment({
            paymentId: paymentResponse.razorpay_payment_id,
            orderId: paymentResponse.razorpay_order_id,
            signature: paymentResponse.razorpay_signature,
            planId,
        });
        return result.data.subscription;
    } catch (e) {
        console.error('Server-side payment verification failed:', e);
        throw new Error('Payment verification failed. Contact support if charged.');
    }
};

// Check if user has active premium subscription
export const checkPremiumStatus = async (userId) => {
    if (!userId) return { isPremium: false, plan: 'free' };

    try {
        // Read from the same path useFitnessData writes to
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

        // Check if subscription/trial has expired
        const expiry = isTrial ? subscription.trialEnd : subscription.expiryDate;
        if (expiry && new Date(expiry) < new Date()) {
            await updateDoc(profileRef, {
                'subscription.status': 'expired',
                isPremium: false
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

    return limit; // Returns the numeric limit
};

// Payment Service module
