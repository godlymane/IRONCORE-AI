import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Trophy, Flame, Dumbbell, UtensilsCrossed, TrendingUp, Share2 } from 'lucide-react';
import { generateWeeklySummary } from '../../utils/exportUtils';
import { shareAchievement, openSharePicker } from '../../utils/shareUtils';

const WEEKLY_GOALS = {
    PROTEIN_WEEKLY: 700,
    CALORIES_BURNED_WEEKLY: 2000,
};

// Weekly Summary Modal/Card
export const WeeklySummary = ({ workouts = [], meals = [], isModal = false, onClose }) => {
    const [showShareOptions, setShowShareOptions] = useState(false);

    const summary = useMemo(() => {
        return generateWeeklySummary(workouts, meals);
    }, [workouts, meals]);

    const highlights = useMemo(() => {
        const items = [];

        if (summary.workouts.count >= 5) {
            items.push({ icon: '🏆', text: 'Crushed 5+ workouts!' });
        } else if (summary.workouts.count >= 3) {
            items.push({ icon: '💪', text: 'Solid workout consistency!' });
        }

        if (summary.nutrition.totalProtein >= WEEKLY_GOALS.PROTEIN_WEEKLY) {
            items.push({ icon: '🥩', text: 'Protein goals smashed!' });
        }

        if (summary.workouts.caloriesBurned >= WEEKLY_GOALS.CALORIES_BURNED_WEEKLY) {
            items.push({ icon: '🔥', text: 'Mega calorie burn!' });
        }

        if (summary.netCalories < 0) {
            items.push({ icon: '⚡', text: 'Calorie deficit achieved!' });
        }

        return items;
    }, [summary]);

    const handleShare = async () => {
        const achievement = {
            type: 'workout',
            value: summary.workouts.count,
        };
        await shareAchievement(achievement);
    };

    const content = (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                        <Calendar size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Weekly Summary</h2>
                        <p className="text-xs text-white/50">
                            {new Date(summary.period.start).toLocaleDateString()} - {new Date(summary.period.end).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                {isModal && (
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} className="text-white/70" />
                    </button>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={<Dumbbell size={20} className="text-amber-400" />}
                    label="Workouts"
                    value={summary.workouts.count}
                    detail={`${summary.workouts.totalMinutes} min total`}
                    color="from-red-500/20 to-red-500/20"
                />
                <StatCard
                    icon={<Flame size={20} className="text-orange-400" />}
                    label="Burned"
                    value={summary.workouts.caloriesBurned.toLocaleString()}
                    detail="calories"
                    color="from-orange-500/20 to-red-500/20"
                />
                <StatCard
                    icon={<UtensilsCrossed size={20} className="text-green-400" />}
                    label="Meals Logged"
                    value={summary.nutrition.mealsLogged}
                    detail={`${summary.nutrition.avgCaloriesPerDay} avg/day`}
                    color="from-green-500/20 to-emerald-500/20"
                />
                <StatCard
                    icon={<TrendingUp size={20} className="text-red-400" />}
                    label="Net Calories"
                    value={summary.netCalories.toLocaleString()}
                    detail={summary.netCalories < 0 ? 'deficit' : 'surplus'}
                    color="from-purple-500/20 to-pink-500/20"
                />
            </div>

            {/* Workout Breakdown */}
            {Object.keys(summary.workouts.byType).length > 0 && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-sm font-bold text-white/70 mb-3">Workout Types</h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(summary.workouts.byType).map(([type, count]) => (
                            <span key={type} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white">
                                {type}: {count}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
                    <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                        <Trophy size={16} />
                        Highlights
                    </h3>
                    <div className="space-y-2">
                        {highlights.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-white">
                                <span className="text-lg">{h.icon}</span>
                                {h.text}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Share Button */}
            <button
                onClick={handleShare}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-purple-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
                <Share2 size={18} />
                Share Your Progress
            </button>
        </div>
    );

    if (isModal) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="w-full max-w-md bg-gray-900 rounded-3xl p-6 border border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {content}
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            {content}
        </div>
    );
};

// Stat card sub-component
const StatCard = ({ icon, label, value, detail, color }) => (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${color} border border-white/10`}>
        <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-xs text-white/50">{label}</span>
        </div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-xs text-white/50">{detail}</p>
    </div>
);

export default WeeklySummary;



