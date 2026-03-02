// IronCore AI - Post-Workout Upsell Prompt
// Ghost IC-013 — 3 context-aware variants shown after workout completion
// Rules: No show on first 3 workouts, max 1x/week, 3-strike permanent suppress

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Camera, Clock, Swords, ChevronUp, X } from 'lucide-react';
import { usePremium } from '../context/PremiumContext';

const STORAGE_KEY = 'ironcore_upsell_state';

const getUpsellState = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { dismissCount: 0, lastShown: 0 };
        return JSON.parse(raw);
    } catch { return { dismissCount: 0, lastShown: 0 }; }
};

const saveUpsellState = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// Variant copy from Ghost IC-013
const VARIANTS = {
    form: {
        icon: Camera,
        header: 'YOUR SESSION IS LOGGED. YOUR FORM DATA ISN\'T.',
        body: 'Free tier gives you a form score. Premium gives you the breakdown — rep-by-rep analysis, joint angle tracking, weak point identification, and week-over-week form improvement trends.',
        hook: 'You just trained. The AI watched. Premium shows you exactly what it saw.',
        features: [
            'Rep-by-rep form breakdown',
            'Joint angle tracking & correction history',
            'Weak point identification per exercise',
            'Form improvement trends (weekly)',
        ],
        cta: 'UNLOCK FULL ANALYSIS',
    },
    history: {
        icon: Clock,
        header: null, // Dynamic — uses workout count
        body: 'Your training history is data. Patterns, progression, weak points — it\'s all in there. But free tier erases everything older than 30 days.',
        hook: 'Premium keeps your entire record. Every session. Every PR. Every form score. Permanent.',
        features: [
            'Unlimited workout history',
            'Long-term progression tracking',
            'PR timeline (every record, forever)',
            'Export your data anytime',
        ],
        cta: 'KEEP YOUR FULL RECORD',
    },
    competitive: {
        icon: Swords,
        header: 'YOU\'RE COMPETING. COMPETE WITH BETTER TOOLS.',
        body: 'Free tier gets you into the Arena. Premium gets you priority matchmaking, detailed opponent analysis, and battle replay breakdowns that show exactly where you won or lost points.',
        hook: null,
        features: [
            'Priority Arena matchmaking',
            'Opponent form analysis',
            'Battle replay with scoring breakdown',
            'Exclusive league badges & cosmetics',
        ],
        cta: 'GET THE EDGE',
    },
};

// Select variant based on user behavior — priority: Form > History > Competitive
const selectVariant = (workoutData, totalWorkouts, hasArenaHistory) => {
    const hadFormCheck = workoutData?.exercises?.some(ex =>
        ex.sets?.some(s => s.formScore != null)
    );
    if (hadFormCheck) return 'form';
    if (totalWorkouts >= 10) return 'history';
    if (hasArenaHistory) return 'competitive';
    return 'history'; // default
};

export const PostWorkoutUpsell = ({ show, onDismiss, workoutData, totalWorkouts, hasArenaHistory }) => {
    const { isPremium, requirePremium } = usePremium();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!show || isPremium) return;

        // Rule: No show on first 3 workouts
        if (totalWorkouts < 4) return;

        const state = getUpsellState();

        // Rule: 3-strike permanent suppress
        if (state.dismissCount >= 3) return;

        // Rule: Max 1x/week (7 day cooldown)
        const daysSinceLastShown = (Date.now() - state.lastShown) / (1000 * 60 * 60 * 24);
        if (state.lastShown > 0 && daysSinceLastShown < 7) return;

        // Rule: Don't upsell after frustration (form score < 50%)
        if (workoutData?.formScore && workoutData.formScore < 50) return;

        setVisible(true);
    }, [show, isPremium, totalWorkouts, workoutData]);

    const handleDismiss = () => {
        const state = getUpsellState();
        saveUpsellState({
            dismissCount: state.dismissCount + 1,
            lastShown: Date.now(),
        });
        setVisible(false);
        onDismiss?.();
    };

    const handleCTA = () => {
        saveUpsellState({ ...getUpsellState(), lastShown: Date.now() });
        setVisible(false);
        requirePremium('pro', 'workoutHistory');
    };

    if (!visible) return null;

    const variantKey = selectVariant(workoutData, totalWorkouts, hasArenaHistory);
    const variant = VARIANTS[variantKey];
    const Icon = variant.icon;

    const header = variantKey === 'history'
        ? `${totalWorkouts} SESSIONS LOGGED. FREE TIER KEEPS 30 DAYS.`
        : variant.header;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] flex items-end justify-center"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
                onClick={handleDismiss}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-md rounded-t-3xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(25, 25, 25, 0.98) 0%, rgba(10, 10, 10, 0.99) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderBottom: 'none',
                        maxHeight: '65vh',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Drag indicator */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-white/20" />
                    </div>

                    <div className="px-6 pb-6 pt-2 space-y-4">
                        {/* Icon + Header */}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                <Icon size={22} className="text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black text-white leading-tight">{header}</h3>
                            </div>
                        </div>

                        {/* Body */}
                        <p className="text-xs text-white/50 leading-relaxed">{variant.body}</p>

                        {variant.hook && (
                            <p className="text-xs text-white/70 font-medium">{variant.hook}</p>
                        )}

                        {/* Feature highlights */}
                        <div className="space-y-2">
                            {variant.features.map((f, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <ChevronUp size={10} className="text-amber-400 rotate-90 flex-shrink-0" />
                                    <span className="text-xs text-white/60">{f}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTAs */}
                        <div className="space-y-2 pt-1">
                            <button
                                onClick={handleCTA}
                                className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
                                    boxShadow: '0 8px 30px rgba(220, 38, 38, 0.3)'
                                }}
                            >
                                <Crown size={16} />
                                {variant.cta}
                            </button>

                            <button
                                onClick={handleCTA}
                                className="w-full text-center text-xs text-white/40 hover:text-white/60 transition-colors py-2"
                            >
                                See plans & pricing
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="w-full text-center text-xs text-white/25 hover:text-white/40 transition-colors py-1"
                            >
                                NOT NOW
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PostWorkoutUpsell;
