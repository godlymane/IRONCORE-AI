// IronCore AI - Premium Paywall Modal
// Ghost IC-013 copy — "The full protocol. Unlocked."

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Check, X, Sparkles, Shield, Zap,
    Camera, Brain, Users, Trophy, Star, Lock,
    BarChart3, Download, Swords, Award
} from 'lucide-react';
import { usePremium } from '../context/PremiumContext';

// Contextual entry lines — shown when triggered by a specific feature tap
const CONTEXTUAL_LINES = {
    aiCoachCalls: 'Full form analysis is a Premium feature.',
    progressPhotos: 'Unlimited progress photos require Premium.',
    guilds: 'Creating a guild requires Premium.',
    battlePassTrack: 'This cosmetic is exclusive to Premium members.',
    unlimitedHistory: 'Your history older than 30 days is locked.',
    analytics: 'You tried to access Advanced Analytics.',
    export: 'Data export is available on Premium.',
};

const FREE_LIMITATIONS = [
    { text: 'Workout history limited to 30 days', icon: Lock },
    { text: 'Basic form score only (no rep-by-rep breakdown)', icon: Lock },
    { text: 'No predictive analytics or AI insights', icon: Lock },
    { text: 'Standard Arena matchmaking', icon: Lock },
    { text: 'No guild creation (join only)', icon: Lock },
    { text: 'No data export', icon: Lock },
];

const PREMIUM_FEATURES = [
    { text: 'Unlimited workout history — every session, forever', icon: Zap },
    { text: 'Full AI form analysis — rep-by-rep, joint tracking', icon: Camera },
    { text: 'Predictive analytics — AI-driven insights', icon: Brain },
    { text: 'Priority Arena matchmaking', icon: Swords },
    { text: 'Guild creation + officer tools', icon: Users },
    { text: 'Advanced progression charts', icon: BarChart3 },
    { text: 'Data export (CSV) — your data, anytime', icon: Download },
    { text: 'Exclusive badges & profile cosmetics', icon: Award },
];

export const PremiumPaywall = () => {
    const {
        showPaywall,
        paywallFeature,
        closePaywall,
        purchasePlan,
        restorePurchase,
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
            },
            (err) => {
                setLoading(false);
                setError(err.message || 'Payment failed. Please try again.');
            }
        );
    };

    if (!showPaywall) return null;

    const contextLine = CONTEXTUAL_LINES[paywallFeature];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            >
                {/* Backdrop — no dismiss on click */}
                <div className="absolute inset-0" />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md rounded-3xl overflow-hidden my-auto max-h-[90vh] overflow-y-auto"
                    style={{
                        background: 'linear-gradient(180deg, rgba(20, 20, 20, 0.98) 0%, rgba(10, 10, 10, 0.99) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(220, 38, 38, 0.1)'
                    }}
                >
                    {/* Header */}
                    <div className="relative p-6 pb-4 text-center">
                        {/* Contextual line */}
                        {contextLine && (
                            <p className="text-xs text-white/50 mb-4 font-medium">{contextLine}</p>
                        )}

                        {/* Crown Icon */}
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(251, 146, 60, 0.2) 100%)',
                                boxShadow: '0 0 40px rgba(220, 38, 38, 0.3)'
                            }}
                        >
                            <Crown size={40} className="text-yellow-400" fill="currentColor" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-1">
                            IRONCORE PREMIUM
                        </h2>
                        <p className="text-sm text-white/50">
                            The full protocol. Unlocked.
                        </p>
                    </div>

                    {/* Free Limitations */}
                    <div className="px-6 pb-3">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2">What you're missing on free</p>
                        <div className="space-y-1.5">
                            {FREE_LIMITATIONS.map((item, i) => (
                                <div key={i} className="flex items-center gap-2.5 py-1">
                                    <X size={12} className="text-red-500/60 flex-shrink-0" />
                                    <span className="text-xs text-white/40">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 border-t border-white/5 my-2" />

                    {/* Premium Features */}
                    <div className="px-6 pb-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2">What Premium unlocks</p>
                        <div className="space-y-1.5">
                            {PREMIUM_FEATURES.map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className="flex items-center gap-2.5 py-1">
                                        <Check size={12} className="text-green-400 flex-shrink-0" />
                                        <span className="text-xs text-white/70">{item.text}</span>
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
                                <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">Monthly</p>
                                <p className="text-xl font-black text-white">₹{plans.pro_monthly.priceINR}</p>
                                <p className="text-[10px] text-white/30">/month</p>
                                <p className="text-[10px] text-white/40 mt-1">Cancel anytime.</p>
                            </button>

                            {/* Yearly */}
                            <button
                                onClick={() => setSelectedPlan('pro_yearly')}
                                className={`relative p-4 rounded-2xl border-2 transition-all ${selectedPlan === 'pro_yearly'
                                    ? 'border-red-500 bg-red-600/10'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-green-500 rounded-full text-[10px] font-black text-black uppercase">
                                    Best Value
                                </div>
                                <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-1">Annual</p>
                                <p className="text-xl font-black text-white">₹{plans.pro_yearly.priceINR}</p>
                                <p className="text-[10px] text-white/30">/year</p>
                                <p className="text-[10px] text-green-400 mt-1">₹{Math.round(plans.pro_yearly.priceINR / 12)}/mo · Save 44%</p>
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="px-6 pb-2">
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        </div>
                    )}

                    {/* CTA + Bottom */}
                    <div className="p-6 pt-2 space-y-3">
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
                                    {selectedPlan === 'pro_yearly' ? 'START ANNUAL' : 'START MONTHLY'}
                                </>
                            )}
                        </button>

                        <p className="text-center text-[11px] text-white/30">
                            Cancel anytime from Settings. No contracts. No hidden fees.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <button onClick={closePaywall} className="text-xs text-white/40 hover:text-white/60 transition-colors">
                                MAYBE LATER
                            </button>
                            <span className="text-white/10">|</span>
                            <button
                                onClick={async () => {
                                    const result = await restorePurchase();
                                    if (!result.restored) {
                                        setError(result.message);
                                    }
                                }}
                                className="text-xs text-white/40 hover:text-white/60 transition-colors"
                            >
                                RESTORE PURCHASE
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PremiumPaywall;
