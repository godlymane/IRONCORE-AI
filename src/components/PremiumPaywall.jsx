// IronCore AI - Premium Paywall Modal
// Beautiful upgrade modal shown when users hit premium features

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Check, X, Sparkles, Shield, Zap,
    Camera, Brain, Users, Trophy, Star
} from 'lucide-react';
import { usePremium } from '../context/PremiumContext';

const FEATURE_ICONS = {
    aiCoachCalls: Brain,
    progressPhotos: Camera,
    guilds: Users,
    battlePassTrack: Trophy,
    unlimitedHistory: Zap
};

const FEATURE_LABELS = {
    aiCoachCalls: 'Unlimited AI Coach',
    progressPhotos: 'Unlimited Progress Photos',
    guilds: 'Create & Join Guilds',
    battlePassTrack: 'Premium Battle Pass',
    unlimitedHistory: 'Lifetime Workout History'
};

export const PremiumPaywall = () => {
    const {
        showPaywall,
        paywallFeature,
        closePaywall,
        purchasePlan,
        plans
    } = usePremium();

    const [selectedPlan, setSelectedPlan] = useState('pro_yearly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePurchase = async () => {
        setLoading(true);
        setError(null);

        await purchasePlan(
            selectedPlan,
            () => {
                setLoading(false);
                // Success handled by context
            },
            (err) => {
                setLoading(false);
                setError(err.message || 'Payment failed. Please try again.');
            }
        );
    };

    if (!showPaywall) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0"
                    onClick={closePaywall}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md rounded-3xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.99) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(220, 38, 38, 0.1)'
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={closePaywall}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>

                    {/* Header */}
                    <div className="relative p-6 pb-4 text-center">
                        {/* Crown Icon */}
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(251, 146, 60, 0.2) 100%)',
                                boxShadow: '0 0 40px rgba(220, 38, 38, 0.3)'
                            }}
                        >
                            <Crown size={40} className="text-yellow-400" fill="currentColor" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2">
                            Upgrade to Pro
                        </h2>

                        {paywallFeature && (
                            <p className="text-sm text-white/60">
                                Unlock <span className="text-red-400 font-bold">{FEATURE_LABELS[paywallFeature] || paywallFeature}</span> and more
                            </p>
                        )}
                    </div>

                    {/* Features List */}
                    <div className="px-6 pb-4">
                        <div className="space-y-3">
                            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                                const Icon = FEATURE_ICONS[key] || Star;
                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center gap-3 p-3 rounded-xl ${paywallFeature === key
                                                ? 'bg-red-600/20 border border-red-500/30'
                                                : 'bg-white/5'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
                                            <Icon size={16} className="text-red-400" />
                                        </div>
                                        <span className="text-sm font-medium text-white">{label}</span>
                                        <Check size={16} className="ml-auto text-green-400" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Plan Selection */}
                    <div className="px-6 pb-4">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Monthly */}
                            <button
                                onClick={() => setSelectedPlan('pro_monthly')}
                                className={`p-4 rounded-2xl border-2 transition-all ${selectedPlan === 'pro_monthly'
                                        ? 'border-red-500 bg-red-600/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Monthly</p>
                                <p className="text-xl font-black text-white">₹{plans.pro_monthly.priceINR}</p>
                                <p className="text-xs text-white/40">/month</p>
                            </button>

                            {/* Yearly */}
                            <button
                                onClick={() => setSelectedPlan('pro_yearly')}
                                className={`relative p-4 rounded-2xl border-2 transition-all ${selectedPlan === 'pro_yearly'
                                        ? 'border-red-500 bg-red-600/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {/* Best Value Badge */}
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 rounded-full text-[11px] font-bold text-black uppercase">
                                    Save 33%
                                </div>
                                <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Yearly</p>
                                <p className="text-xl font-black text-white">₹{plans.pro_yearly.priceINR}</p>
                                <p className="text-xs text-white/40">/year</p>
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="px-6 pb-2">
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        </div>
                    )}

                    {/* CTA Button */}
                    <div className="p-6 pt-2">
                        <button
                            onClick={handlePurchase}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{
                                background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                                boxShadow: '0 10px 40px rgba(220, 38, 38, 0.4)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Upgrade Now
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-white/40 mt-3">
                            Cancel anytime • Secure payment via Razorpay
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PremiumPaywall;
