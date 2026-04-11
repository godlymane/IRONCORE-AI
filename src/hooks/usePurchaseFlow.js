/**
 * usePurchaseFlow — Shared purchase flow logic for paywall components.
 *
 * Encapsulates the common pattern used by PaywallModal, PremiumPaywall, and
 * PostWorkoutUpsell: initiating a purchase via PremiumContext.purchasePlan(),
 * tracking loading/success/error state, and auto-closing after success.
 *
 * Usage:
 *   const { handlePurchase, purchasing, successPlan, error } = usePurchaseFlow();
 *   // ...
 *   <button onClick={() => handlePurchase('pro_monthly')} disabled={purchasing}>
 */

import { useState, useCallback } from 'react';
import { usePremium } from '../context/PremiumContext';

export const usePurchaseFlow = ({ onSuccess, autoCloseDelay = 2000 } = {}) => {
    const { purchasePlan, closePaywall, restorePurchase } = usePremium();

    const [purchasing, setPurchasing] = useState(false);
    const [successPlan, setSuccessPlan] = useState(null);
    const [error, setError] = useState(null);

    const handlePurchase = useCallback(async (planId) => {
        setPurchasing(true);
        setError(null);

        await purchasePlan(
            planId,
            () => {
                // Success
                setSuccessPlan(planId);
                setPurchasing(false);
                onSuccess?.(planId);

                if (autoCloseDelay > 0) {
                    setTimeout(() => {
                        setSuccessPlan(null);
                        closePaywall();
                    }, autoCloseDelay);
                }
            },
            (err) => {
                // Error
                setPurchasing(false);
                const msg = err?.message || 'Payment failed. Please try again.';
                setError(msg);
                console.error('Purchase failed:', err);
            }
        );
    }, [purchasePlan, closePaywall, onSuccess, autoCloseDelay]);

    const handleRestore = useCallback(async () => {
        setError(null);
        if (!restorePurchase) return { restored: false, message: 'Restore not available' };
        const result = await restorePurchase();
        if (!result.restored) {
            setError(result.message);
        }
        return result;
    }, [restorePurchase]);

    const clearError = useCallback(() => setError(null), []);

    return {
        handlePurchase,
        handleRestore,
        purchasing,
        successPlan,
        error,
        clearError,
    };
};

export default usePurchaseFlow;
