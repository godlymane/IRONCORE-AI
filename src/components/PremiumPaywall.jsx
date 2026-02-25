// IronCore AI - Premium Paywall (Full-Screen Takeover)
// Ghost IC-013 copy — "The full protocol. Unlocked."
// Designed for maximum conversion with feature comparison table

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Check, X, Sparkles, Shield,
    Camera, Brain, Users, Trophy, Star, Lock,
    BarChart3, Download, Loader2
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

// Feature comparison rows for the conversion table
const FEATURE_ROWS = [
    { name: 'AI Form Correction', free: '3 / day', premium: 'Unlimited', icon: Camera },
    { name: 'Workout History', free: '7 days', premium: 'Forever', icon: BarChart3 },
    { name: 'League Access', free: 'Basic', premium: 'Full + Priority', icon: Trophy },
    { name: 'Progress Photos', free: '5 total', premium: 'Unlimited', icon: Camera },
    { name: 'Guild Features', free: 'Join only', premium: 'Create + Manage', icon: Users },
    { name: 'Analytics', free: 'Basic stats', premium: 'Predictive AI', icon: Brain },
    { name: 'Data Export', free: null, premium: 'CSV anytime', icon: Download },
];

// Floating gradient orb used in the hero background
const GradientOrb = ({ size, x, y, delay, color }) => (
    <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
            width: size,
            height: size,
            left: x,
            top: y,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            filter: 'blur(40px)',
        }}
        animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay,
        }}
    />
);

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

    const handleRestore = async () => {
        setError(null);
        const result = await restorePurchase();
        if (!result.restored) {
            setError(result.message);
        }
    };

    if (!showPaywall) return null;

    const contextLine = CONTEXTUAL_LINES[paywallFeature];

    // Calculate savings percentage from plan prices (defensive access)
    const monthlyPrice = plans?.pro_monthly?.price ?? 12.99;
    const yearlyPrice = plans?.pro_yearly?.price ?? 79.99;
    const monthlyCostIfPaidMonthly = monthlyPrice * 12;
    const savingsPercent = Math.round(
        ((monthlyCostIfPaidMonthly - yearlyPrice) / monthlyCostIfPaidMonthly) * 100
    );
    const monthlyEquivalent = (yearlyPrice / 12).toFixed(2);

    return (
        <AnimatePresence>
            {showPaywall && (
                <motion.div
                    key="paywall-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] overflow-y-auto bg-black"
                >
                    {/* Scrollable content wrapper */}
                    <div className="relative min-h-full flex flex-col">

                        {/* ─── SECTION 1: HERO HEADER ─── */}
                        <div className="relative overflow-hidden pt-14 pb-8 px-6 text-center flex-shrink-0">
                            {/* Animated gradient orbs */}
                            <GradientOrb size="240px" x="-60px" y="-40px" delay={0} color="rgba(220,38,38,0.4)" />
                            <GradientOrb size="180px" x="70%" y="20px" delay={1.5} color="rgba(239,68,68,0.3)" />
                            <GradientOrb size="140px" x="40%" y="-30px" delay={0.8} color="rgba(248,113,113,0.25)" />

                            {/* Close button */}
                            <button
                                onClick={closePaywall}
                                aria-label="Close"
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/20 hover:scale-[1.05] active:scale-95"
                            >
                                <X size={20} className="text-white/70" />
                            </button>

                            {/* Contextual line */}
                            {contextLine && (
                                <motion.p
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="relative z-10 text-xs text-red-400/80 font-medium mb-5 tracking-wide"
                                >
                                    {contextLine}
                                </motion.p>
                            )}

                            {/* Crown icon */}
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                                className="relative z-10 w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220,38,38,0.35) 0%, rgba(251,146,60,0.2) 100%)',
                                    boxShadow: '0 0 60px rgba(220,38,38,0.35), 0 0 120px rgba(220,38,38,0.15)',
                                }}
                            >
                                <Crown size={40} className="text-yellow-400" fill="currentColor" />
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="relative z-10 text-3xl font-black uppercase tracking-tight text-white font-heading"
                            >
                                IRONCORE PREMIUM
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="relative z-10 text-sm text-white/50 mt-1.5"
                            >
                                The full protocol. Unlocked.
                            </motion.p>

                            {/* Social proof */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="relative z-10 flex items-center justify-center gap-1.5 mt-4"
                            >
                                <Users size={13} className="text-white/30" />
                                <span className="text-xs text-white/30 font-medium">
                                    Trusted by 12,000+ athletes
                                </span>
                            </motion.div>
                        </div>

                        {/* ─── SECTION 2: FEATURE COMPARISON TABLE ─── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="px-4 pb-6 flex-shrink-0"
                        >
                            {/* Column headers */}
                            <div className="flex items-center justify-end gap-0 mb-3 px-2">
                                <div className="flex-1" />
                                <span className="w-20 text-center text-[10px] uppercase tracking-widest text-white/30 font-bold">
                                    Free
                                </span>
                                <span className="w-24 text-center text-[10px] uppercase tracking-widest text-red-400 font-bold">
                                    Premium
                                </span>
                            </div>

                            {/* Feature rows */}
                            <div className="space-y-2">
                                {FEATURE_ROWS.map((row, i) => {
                                    const Icon = row.icon;
                                    return (
                                        <motion.div
                                            key={row.name}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.35 + i * 0.05 }}
                                            className="flex items-center rounded-xl px-3 py-2.5"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            {/* Feature name with icon */}
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <Icon size={15} className="text-white/30 flex-shrink-0" />
                                                <span className="text-xs text-white/70 font-medium truncate">
                                                    {row.name}
                                                </span>
                                            </div>

                                            {/* Free value */}
                                            <div className="w-20 text-center flex-shrink-0">
                                                {row.free === null ? (
                                                    <X size={14} className="text-white/20 mx-auto" />
                                                ) : (
                                                    <span className="text-[11px] text-white/30">
                                                        {row.free}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Premium value */}
                                            <div className="w-24 text-center flex-shrink-0 flex items-center justify-center gap-1">
                                                <Check size={12} className="text-green-400 flex-shrink-0" />
                                                <span className="text-[11px] text-white font-medium">
                                                    {row.premium}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* ─── SECTION 3: PLAN SELECTION ─── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55 }}
                            className="px-4 pb-5 flex-shrink-0"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                {/* Monthly Card */}
                                <button
                                    onClick={() => setSelectedPlan('pro_monthly')}
                                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.02] active:scale-95 ${
                                        selectedPlan === 'pro_monthly'
                                            ? 'border-red-500 bg-red-600/10'
                                            : 'border-white/10 bg-white/5'
                                    }`}
                                >
                                    <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-2">
                                        Monthly
                                    </p>
                                    <p className="text-2xl font-black text-white">
                                        ${monthlyPrice}
                                    </p>
                                    <p className="text-[11px] text-white/30 mt-0.5">/month</p>
                                    <p className="text-[10px] text-white/40 mt-2">Cancel anytime</p>
                                </button>

                                {/* Annual Card (recommended) */}
                                <button
                                    onClick={() => setSelectedPlan('pro_yearly')}
                                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.02] active:scale-95 ${
                                        selectedPlan === 'pro_yearly'
                                            ? 'border-red-500 bg-red-600/10'
                                            : 'border-white/10 bg-white/5'
                                    }`}
                                >
                                    {/* Best Value badge */}
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-green-500 rounded-full text-[10px] font-black text-black uppercase whitespace-nowrap">
                                        Best Value
                                    </div>

                                    <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold mb-2">
                                        Annual
                                    </p>
                                    <p className="text-2xl font-black text-white">
                                        ${yearlyPrice}
                                    </p>
                                    <p className="text-[11px] text-white/30 mt-0.5">/year</p>
                                    <p className="text-[10px] text-green-400 font-semibold mt-1.5">
                                        ${monthlyEquivalent}/mo &middot; Save {savingsPercent}%
                                    </p>

                                    {/* Free trial badge */}
                                    <div className="mt-2 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 inline-block">
                                        <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                                            7-Day Free Trial
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </motion.div>

                        {/* ─── SECTION 4: CTA + TRUST ─── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                            className="px-4 pb-8 mt-auto flex-shrink-0"
                        >
                            {/* Error display */}
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-400 text-center mb-3 font-medium"
                                >
                                    {error}
                                </motion.p>
                            )}

                            {/* Primary CTA button */}
                            <button
                                onClick={handlePurchase}
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 font-heading tracking-wide"
                                style={{
                                    background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                                    boxShadow: '0 8px 32px rgba(220,38,38,0.4), 0 2px 8px rgba(220,38,38,0.2)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        {selectedPlan === 'pro_yearly'
                                            ? 'START FREE TRIAL'
                                            : 'SUBSCRIBE NOW'}
                                    </>
                                )}
                            </button>

                            {/* Trust row */}
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <div className="flex items-center gap-1">
                                    <Shield size={12} className="text-white/25" />
                                    <span className="text-[10px] text-white/25 font-medium">Cancel anytime</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Lock size={12} className="text-white/25" />
                                    <span className="text-[10px] text-white/25 font-medium">Secure payment</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star size={12} className="text-white/25" />
                                    <span className="text-[10px] text-white/25 font-medium">Money-back guarantee</span>
                                </div>
                            </div>

                            {/* Bottom links */}
                            <div className="flex items-center justify-center gap-4 mt-5">
                                <button
                                    onClick={closePaywall}
                                    className="text-xs text-white/40 font-bold uppercase tracking-wider transition-all hover:text-white/60 hover:scale-[1.02] active:scale-95"
                                >
                                    Maybe Later
                                </button>
                                <span className="text-white/10">|</span>
                                <button
                                    onClick={handleRestore}
                                    className="text-xs text-white/40 font-bold uppercase tracking-wider transition-all hover:text-white/60 hover:scale-[1.02] active:scale-95"
                                >
                                    Restore Purchase
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PremiumPaywall;
