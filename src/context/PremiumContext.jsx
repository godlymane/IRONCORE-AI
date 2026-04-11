// IronCore AI - Premium Context
// Global state for subscription status and feature gating

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

const PremiumContext = createContext(null);

export const PremiumProvider = ({ children, user }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [plan, setPlan] = useState('free');
    const [tier, setTier] = useState('free'); // 'free' | 'pro' | 'elite'
    const [isTrial, setIsTrial] = useState(false);
    const [expiryDate, setExpiryDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusError, setStatusError] = useState(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [paywallFeature, setPaywallFeature] = useState(null);
    const [paywallMinTier, setPaywallMinTier] = useState('pro');

    // Promo mode — unlock all features for demo/influencer builds
    const PROMO_MODE = import.meta.env.VITE_PROMO_MODE === 'true';

    // Check premium status on mount and user change
    useEffect(() => {
        const checkStatus = async () => {
            if (PROMO_MODE) {
                setIsPremium(true);
                setPlan('elite_yearly');
                setTier('elite');
                setLoading(false);
                return;
            }

            if (!user?.uid) {
                setIsPremium(false);
                setPlan('free');
                setTier('free');
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const status = await checkPremiumStatus(user.uid);
                setIsPremium(status.isPremium);
                setPlan(status.plan);
                setTier(status.tier || getTierFromPlan(status.plan));
                setIsTrial(status.isTrial || false);
                setExpiryDate(status.expiryDate || null);
            } catch (error) {
                console.error('Error checking premium status:', error);
                setStatusError('Failed to verify subscription status. Some features may be restricted.');
            }
            setLoading(false);
        };

        checkStatus();
    }, [user?.uid]);

    // Trigger paywall — accepts minTier: 'pro' or 'elite'
    const requirePremium = useCallback((minTier = 'pro', featureName) => {
        if (PROMO_MODE) return true; // Promo: never show paywall
        if (meetsMinTier(tier, minTier)) return true;

        setPaywallFeature(featureName || minTier);
        setPaywallMinTier(minTier);
        setShowPaywall(true);
        return false;
    }, [tier, PROMO_MODE]);

    // Check if user can use a feature (with optional usage count for numeric limits)
    const checkFeature = useCallback((featureName, currentUsage = 0) => {
        const limit = canUseFeature(featureName, plan);

        if (limit === true || limit === Infinity) return true;
        if (limit === false) return false;

        // For numeric limits, check current usage
        return currentUsage < limit;
    }, [plan]);

    // Start purchase flow
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

    // Close paywall
    const closePaywall = useCallback(() => {
        setShowPaywall(false);
        setPaywallFeature(null);
    }, []);

    // Restore purchase — asks native store then refreshes Firestore
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

    // Start 7-day free trial
    const beginFreeTrial = useCallback(async (onSuccess, onError) => {
        if (!user?.uid) {
            onError?.(new Error('Please sign in'));
            return;
        }
        try {
            const capturedUid = user.uid;
            await startFreeTrial(capturedUid);
            const status = await checkPremiumStatus(capturedUid);
            setIsPremium(status.isPremium);
            setPlan(status.plan);
            setTier(status.tier || 'elite');
            setIsTrial(true);
            setExpiryDate(status.expiryDate || null);
            setShowPaywall(false);
            onSuccess?.();
        } catch (error) {
            onError?.(error);
        }
    }, [user?.uid]);

    const value = useMemo(() => ({
        // State
        isPremium,
        plan,
        tier,
        isTrial,
        expiryDate,
        loading,
        statusError,

        // Paywall
        showPaywall,
        paywallFeature,
        paywallMinTier,
        closePaywall,

        // Actions
        requirePremium,
        checkFeature,
        purchasePlan,
        beginFreeTrial,
        restorePurchase,

        // Plans info
        plans: PRICING_PLANS,
        featureAccess: FEATURE_ACCESS,
    }), [isPremium, plan, tier, isTrial, expiryDate, loading, statusError, showPaywall, paywallFeature, paywallMinTier,
         closePaywall, requirePremium, checkFeature, purchasePlan, beginFreeTrial, restorePurchase]);

    return (
        <PremiumContext.Provider value={value}>
            {children}
        </PremiumContext.Provider>
    );
};

// Hook to use premium context
export const usePremium = () => {
    const context = useContext(PremiumContext);
    if (!context) {
        throw new Error('usePremium must be used within a PremiumProvider');
    }
    return context;
};

export default PremiumContext;
