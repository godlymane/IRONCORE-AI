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
