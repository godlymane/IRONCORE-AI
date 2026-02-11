import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Scale, Calendar } from 'lucide-react';
import { PremiumIcon } from '../PremiumIcon';
import { DumbbellIcon, FlameIcon, EggIcon, TrophyIconShape } from '../IronCoreIcons';

// Goal tracking component with visual progress
export const GoalTracker = ({ goals = [], workouts = [], meals = [], currentWeight = null }) => {
    const [selectedGoal, setSelectedGoal] = useState(null);

    // Calculate progress for each goal type
    const goalProgress = useMemo(() => {
        const today = new Date();
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

        const thisWeekWorkouts = workouts.filter(w => new Date(w.date) >= weekStart);
        const thisWeekMeals = meals.filter(m => new Date(m.date) >= weekStart);
        const weekCalories = thisWeekMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const weekProtein = thisWeekMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
        const weekBurned = thisWeekWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

        return {
            workouts_per_week: thisWeekWorkouts.length,
            calories_per_day: Math.round(weekCalories / 7),
            protein_per_day: Math.round(weekProtein / 7),
            calories_burned: weekBurned,
            current_weight: currentWeight,
        };
    }, [workouts, meals, currentWeight]);

    // Default goals if none provided
    const displayGoals = goals.length > 0 ? goals : [
        { id: 1, type: 'workouts_per_week', target: 4, label: 'Workouts/Week', icon: <PremiumIcon src={DumbbellIcon} size="sm" className="!w-10 !h-10" /> },
        { id: 2, type: 'calories_per_day', target: 2000, label: 'Daily Calories', icon: <PremiumIcon src={FlameIcon} size="sm" className="!w-10 !h-10" /> },
        { id: 3, type: 'protein_per_day', target: 120, label: 'Daily Protein', icon: <PremiumIcon src={EggIcon} size="sm" className="!w-10 !h-10" /> },
    ];

    const getProgressPercent = (goal) => {
        const current = goalProgress[goal.type] || 0;
        return Math.min(100, Math.round((current / goal.target) * 100));
    };

    const getProgressColor = (percent) => {
        if (percent >= 100) return 'from-green-500 to-emerald-600';
        if (percent >= 75) return 'from-red-500 to-red-600';
        if (percent >= 50) return 'from-yellow-500 to-orange-600';
        return 'from-red-500 to-pink-600';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <PremiumIcon src={TrophyIconShape} size="sm" className="!w-6 !h-6" fallback={null} />
                    Goal Progress
                </h3>
                <span className="text-xs text-white/50">This Week</span>
            </div>

            <div className="grid gap-3">
                {displayGoals.map(goal => {
                    const current = goalProgress[goal.type] || 0;
                    const percent = getProgressPercent(goal);
                    const isComplete = percent >= 100;

                    return (
                        <motion.div
                            key={goal.id}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${isComplete
                                ? 'bg-green-900/20 border-green-500/30'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">{goal.icon}</div>
                                    <div>
                                        <p className="font-bold text-white">{goal.label}</p>
                                        <p className="text-xs text-white/50">
                                            {current.toLocaleString()} / {goal.target.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-black ${isComplete ? 'text-green-400' : 'text-white'}`}>
                                        {percent}%
                                    </p>
                                    {isComplete && <span className="text-xs text-green-400">✓ Complete</span>}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full bg-gradient-to-r ${getProgressColor(percent)}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </div>

                            {/* Expanded details */}
                            {selectedGoal === goal.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-3 pt-3 border-t border-white/10"
                                >
                                    <div className="flex items-center gap-4 text-sm text-white/70">
                                        <span className="flex items-center gap-1">
                                            <TrendingUp size={14} />
                                            {percent >= 100 ? '+' : ''}{percent - 100}% vs target
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            Updates daily
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Overall summary */}
            <div className="p-4 bg-gradient-to-r from-red-900/30 to-purple-900/30 rounded-2xl border border-red-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <PremiumIcon src={TrophyIconShape} size="md" className="!w-8 !h-8" fallback={null} />
                        <div>
                            <p className="font-bold text-white">Weekly Summary</p>
                            <p className="text-xs text-white/50">
                                {displayGoals.filter(g => getProgressPercent(g) >= 100).length} of {displayGoals.length} goals complete
                            </p>
                        </div>
                    </div>
                    <div className="text-3xl">
                        {displayGoals.filter(g => getProgressPercent(g) >= 100).length === displayGoals.length
                            ? '🏆'
                            : '💪'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalTracker;



