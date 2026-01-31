// IronCore AI - Premium Context
// Global state for subscription status and feature gating

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    checkPremiumStatus,
    openCheckout,
    createPaymentOrder,
    PRICING_PLANS,
    canUseFeature,
    getFeatureLimits
} from '../services/paymentService';

const PremiumContext = createContext(null);

export const PremiumProvider = ({ children, user }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [plan, setPlan] = useState('free');
    const [features, setFeatures] = useState(PRICING_PLANS.free.features);
    const [expiryDate, setExpiryDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaywall, setShowPaywall] = useState(false);
    const [paywallFeature, setPaywallFeature] = useState(null);

    // Check premium status on mount and user change
    useEffect(() => {
        const checkStatus = async () => {
            if (!user?.uid) {
                setIsPremium(false);
                setPlan('free');
                setFeatures(PRICING_PLANS.free.features);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const status = await checkPremiumStatus(user.uid);
                setIsPremium(status.isPremium);
                setPlan(status.plan);
                setFeatures(status.features || PRICING_PLANS.free.features);
                setExpiryDate(status.expiryDate || null);
            } catch (error) {
                console.error('Error checking premium status:', error);
            }
            setLoading(false);
        };

        checkStatus();
    }, [user?.uid]);

    // Trigger paywall for a specific feature
    const requirePremium = useCallback((featureName) => {
        if (isPremium) return true;

        setPaywallFeature(featureName);
        setShowPaywall(true);
        return false;
    }, [isPremium]);

    // Check if user can use a feature (with optional limit check)
    const checkFeature = useCallback((featureName, currentUsage = 0) => {
        const limit = canUseFeature(featureName, isPremium, plan);

        if (limit === true || limit === Infinity) return true;
        if (limit === false) return false;

        // For numeric limits, check current usage
        return currentUsage < limit;
    }, [isPremium, plan]);

    // Start purchase flow
    const purchasePlan = useCallback(async (planId, onSuccess, onError) => {
        if (!user?.uid) {
            onError?.(new Error('Please sign in to purchase'));
            return;
        }

        try {
            const orderData = await createPaymentOrder(planId, user.uid);

            openCheckout(
                orderData,
                {
                    displayName: user.displayName,
                    email: user.email,
                    phone: user.phoneNumber
                },
                async (response) => {
                    // Payment successful - refresh status
                    const status = await checkPremiumStatus(user.uid);
                    setIsPremium(status.isPremium);
                    setPlan(status.plan);
                    setFeatures(status.features || PRICING_PLANS.free.features);
                    setExpiryDate(status.expiryDate || null);
                    setShowPaywall(false);
                    onSuccess?.(response);
                },
                (error) => {
                    console.error('Payment failed:', error);
                    onError?.(error);
                }
            );
        } catch (error) {
            console.error('Error creating order:', error);
            onError?.(error);
        }
    }, [user]);

    // Close paywall
    const closePaywall = useCallback(() => {
        setShowPaywall(false);
        setPaywallFeature(null);
    }, []);

    const value = {
        // State
        isPremium,
        plan,
        features,
        expiryDate,
        loading,

        // Paywall
        showPaywall,
        paywallFeature,
        closePaywall,

        // Actions
        requirePremium,
        checkFeature,
        purchasePlan,

        // Plans info
        plans: PRICING_PLANS
    };

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
