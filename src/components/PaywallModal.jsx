import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Shield, Zap, Sparkles, Star } from 'lucide-react';
import { usePremium } from '../context/PremiumContext';
import { PRICING_PLANS, FEATURE_ACCESS, meetsMinTier } from '../services/paymentService';

// Feature labels for the comparison checklist
const FEATURE_LABELS = {
    aiCoachCalls: 'AI Coach Calls',
    progressPhotos: 'Progress Photos',
    workoutHistory: 'Workout History',
    arenaBattles: 'Arena Battles (PvP)',
    advancedStats: 'Advanced Stats',
    guilds: 'Guild Creation',
    guildWars: 'Guild Wars',
    battlePassPremiumTrack: 'Battle Pass Premium Track',
    formCorrection: 'AI Form Correction',
    priorityAI: 'Priority AI Responses',
    customPrograms: 'Custom Workout Programs',
};

const FEATURE_ORDER = [
    'aiCoachCalls', 'progressPhotos', 'workoutHistory',
    'arenaBattles', 'advancedStats', 'guilds', 'guildWars',
    'battlePassPremiumTrack', 'formCorrection', 'priorityAI', 'customPrograms',
];

const formatLimit = (val) => {
    if (val === Infinity) return 'Unlimited';
    if (val === true) return true;
    if (val === false) return false;
    return `${val}`;
};

const TierIcon = ({ tier, size = 20 }) => {
    if (tier === 'elite') return <Crown size={size} className="text-yellow-400" />;
    if (tier === 'pro') return <Zap size={size} className="text-red-400" />;
    return <Shield size={size} className="text-gray-400" />;
};

const PaywallModal = () => {
    const {
        showPaywall, paywallFeature, paywallMinTier, closePaywall,
        purchasePlan, tier: currentTier, isPremium,
    } = usePremium();

    const [billingPeriod, setBillingPeriod] = useState('monthly');
    const [purchasing, setPurchasing] = useState(false);
    const [successPlan, setSuccessPlan] = useState(null);

    const handlePurchase = useCallback(async (planId) => {
        setPurchasing(true);
        await purchasePlan(
            planId,
            () => {
                setSuccessPlan(planId);
                setTimeout(() => {
                    setSuccessPlan(null);
                    closePaywall();
                }, 2000);
            },
            (err) => {
                console.error('Purchase failed:', err);
            }
        );
        setPurchasing(false);
    }, [purchasePlan, closePaywall]);

    const proId = billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly';
    const eliteId = billingPeriod === 'yearly' ? 'elite_yearly' : 'elite_monthly';
    const proPlan = PRICING_PLANS[proId];
    const elitePlan = PRICING_PLANS[eliteId];

    const plans = [
        {
            id: 'free', tier: 'free', name: 'Free', price: 0,
            cta: 'Current Plan', disabled: true,
            icon: <Shield size={22} className="text-gray-400" />,
            border: 'border-white/10',
            bg: 'bg-white/[0.02]',
        },
        {
            id: proId, tier: 'pro', name: 'Pro',
            price: billingPeriod === 'yearly' ? proPlan.priceINR : proPlan.priceINR,
            priceLabel: billingPeriod === 'yearly'
                ? `₹${proPlan.priceINR}/yr`
                : `₹${proPlan.priceINR}/mo`,
            cta: meetsMinTier(currentTier, 'pro') ? 'Current Plan' : 'Upgrade to Pro',
            disabled: meetsMinTier(currentTier, 'pro'),
            icon: <Zap size={22} className="text-red-400" />,
            border: 'border-red-500/30',
            bg: 'bg-red-500/[0.04]',
            recommended: paywallMinTier === 'pro',
        },
        {
            id: eliteId, tier: 'elite', name: 'Elite',
            price: billingPeriod === 'yearly' ? elitePlan.priceINR : elitePlan.priceINR,
            priceLabel: billingPeriod === 'yearly'
                ? `₹${elitePlan.priceINR}/yr`
                : `₹${elitePlan.priceINR}/mo`,
            cta: meetsMinTier(currentTier, 'elite') ? 'Current Plan' : 'Start 7-Day Free Trial',
            disabled: meetsMinTier(currentTier, 'elite'),
            icon: <Crown size={22} className="text-yellow-400" />,
            border: 'border-yellow-500/30',
            bg: 'bg-yellow-500/[0.04]',
            recommended: paywallMinTier === 'elite',
        },
    ];

    return (
        <AnimatePresence>
            {showPaywall && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-end justify-center"
                    onClick={(e) => e.target === e.currentTarget && closePaywall()}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                    {/* Success overlay */}
                    <AnimatePresence>
                        {successPlan && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="absolute inset-0 z-[210] flex items-center justify-center"
                            >
                                <div className="flex flex-col items-center gap-4">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.6 }}
                                        className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
                                    >
                                        <Check size={40} className="text-green-400" />
                                    </motion.div>
                                    <p className="text-xl font-heading font-black text-white uppercase">
                                        Welcome to {successPlan.startsWith('elite') ? 'Elite' : 'Pro'}!
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-[201] w-full max-w-md bg-[#0a0a0a] rounded-t-3xl border-t border-white/10
                            max-h-[90vh] overflow-y-auto"
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        {/* Close button */}
                        <button
                            onClick={closePaywall}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5
                                flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>

                        <div className="px-5 pb-8">
                            {/* Header */}
                            <div className="text-center mb-5">
                                <Sparkles size={24} className="text-red-400 mx-auto mb-2" />
                                <h2 className="text-xl font-heading font-black text-white uppercase tracking-wide">
                                    Unlock Full Power
                                </h2>
                                {paywallFeature && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        <span className="text-red-400 font-semibold capitalize">
                                            {FEATURE_LABELS[paywallFeature] || paywallFeature}
                                        </span>
                                        {' '}requires {paywallMinTier === 'elite' ? 'Elite' : 'Pro'}
                                    </p>
                                )}
                            </div>

                            {/* Billing toggle */}
                            <div className="flex items-center justify-center gap-2 mb-5">
                                <button
                                    onClick={() => setBillingPeriod('monthly')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        billingPeriod === 'monthly'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingPeriod('yearly')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative ${
                                        billingPeriod === 'yearly'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    Yearly
                                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md
                                        bg-green-500 text-[8px] font-black text-white uppercase">
                                        Save 50%
                                    </span>
                                </button>
                            </div>

                            {/* Plan cards */}
                            <div className="grid grid-cols-3 gap-2 mb-5">
                                {plans.map((p) => (
                                    <div
                                        key={p.id}
                                        className={`relative rounded-xl border p-3 ${p.border} ${p.bg} transition-all`}
                                    >
                                        {p.recommended && (
                                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2
                                                px-2 py-0.5 rounded-md bg-red-600 text-[8px] font-black
                                                text-white uppercase tracking-wider whitespace-nowrap">
                                                Recommended
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center text-center gap-1.5">
                                            {p.icon}
                                            <p className="text-xs font-heading font-black text-white uppercase">
                                                {p.name}
                                            </p>
                                            <p className="text-sm font-bold text-white">
                                                {p.tier === 'free' ? 'Free' : p.priceLabel}
                                            </p>

                                            <button
                                                disabled={p.disabled || purchasing}
                                                onClick={() => !p.disabled && handlePurchase(p.id)}
                                                className={`w-full mt-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                                    transition-all ${
                                                    p.disabled
                                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                                        : p.tier === 'elite'
                                                        ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white hover:scale-[1.02] active:scale-95'
                                                        : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:scale-[1.02] active:scale-95'
                                                }`}
                                            >
                                                {purchasing ? '...' : p.cta}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Feature comparison */}
                            <div className="rounded-xl border border-white/10 overflow-hidden">
                                <div className="grid grid-cols-4 gap-0 px-3 py-2 bg-white/[0.03] border-b border-white/10">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Feature</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase text-center">Free</span>
                                    <span className="text-[10px] font-bold text-red-400 uppercase text-center">Pro</span>
                                    <span className="text-[10px] font-bold text-yellow-400 uppercase text-center">Elite</span>
                                </div>

                                {FEATURE_ORDER.map((key) => {
                                    const access = FEATURE_ACCESS[key];
                                    if (!access) return null;
                                    return (
                                        <div key={key} className="grid grid-cols-4 gap-0 px-3 py-2 border-b border-white/5
                                            last:border-b-0">
                                            <span className="text-[10px] text-gray-300 pr-1">
                                                {FEATURE_LABELS[key]}
                                            </span>
                                            {['free', 'pro', 'elite'].map((t) => {
                                                const val = formatLimit(access[t]);
                                                return (
                                                    <div key={t} className="flex justify-center items-center">
                                                        {val === true ? (
                                                            <Check size={12} className="text-green-400" />
                                                        ) : val === false ? (
                                                            <X size={12} className="text-gray-600" />
                                                        ) : (
                                                            <span className="text-[10px] text-gray-300 font-medium">
                                                                {val}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stay free */}
                            <button
                                onClick={closePaywall}
                                className="w-full mt-4 py-2.5 text-xs text-gray-500 font-medium
                                    hover:text-gray-400 transition-colors"
                            >
                                Stay Free
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PaywallModal;
