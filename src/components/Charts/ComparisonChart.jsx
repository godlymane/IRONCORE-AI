import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Week-over-week comparison charts
export const ComparisonChart = ({ workouts = [], meals = [], title = "Weekly Comparison" }) => {
    const [weekOffset, setWeekOffset] = useState(0);

    // Calculate data for two consecutive weeks
    const compareData = useMemo(() => {
        const now = new Date();
        const getWeekStart = (offset) => {
            const date = new Date(now);
            date.setDate(date.getDate() - date.getDay() - (offset * 7));
            date.setHours(0, 0, 0, 0);
            return date;
        };

        const getWeekEnd = (start) => {
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return end;
        };

        const currentWeekStart = getWeekStart(weekOffset);
        const currentWeekEnd = getWeekEnd(currentWeekStart);
        const prevWeekStart = getWeekStart(weekOffset + 1);
        const prevWeekEnd = getWeekEnd(prevWeekStart);

        const filterByDateRange = (items, start, end) => {
            return items.filter(item => {
                const date = new Date(item.date);
                return date >= start && date <= end;
            });
        };

        const currentWorkouts = filterByDateRange(workouts, currentWeekStart, currentWeekEnd);
        const prevWorkouts = filterByDateRange(workouts, prevWeekStart, prevWeekEnd);
        const currentMeals = filterByDateRange(meals, currentWeekStart, currentWeekEnd);
        const prevMeals = filterByDateRange(meals, prevWeekStart, prevWeekEnd);

        const calcStats = (workoutList, mealList) => ({
            workouts: workoutList.length,
            duration: workoutList.reduce((sum, w) => sum + (w.duration || 0), 0),
            burned: workoutList.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
            meals: mealList.length,
            calories: mealList.reduce((sum, m) => sum + (m.calories || 0), 0),
            protein: mealList.reduce((sum, m) => sum + (m.protein || 0), 0),
        });

        return {
            current: {
                ...calcStats(currentWorkouts, currentMeals),
                label: weekOffset === 0 ? 'This Week' : `Week of ${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                start: currentWeekStart,
            },
            previous: {
                ...calcStats(prevWorkouts, prevMeals),
                label: `Week of ${prevWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                start: prevWeekStart,
            },
        };
    }, [workouts, meals, weekOffset]);

    const metrics = [
        { key: 'workouts', label: 'Workouts', icon: '💪', suffix: '' },
        { key: 'duration', label: 'Minutes', icon: '⏱️', suffix: ' min' },
        { key: 'burned', label: 'Burned', icon: '🔥', suffix: ' cal' },
        { key: 'meals', label: 'Meals', icon: '🍽️', suffix: '' },
        { key: 'calories', label: 'Consumed', icon: '🍔', suffix: ' cal' },
        { key: 'protein', label: 'Protein', icon: '🥩', suffix: 'g' },
    ];

    const getTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const TrendIndicator = ({ current, previous }) => {
        const trend = getTrend(current, previous);
        if (trend === 0) return <Minus size={16} className="text-gray-400" />;
        if (trend > 0) return (
            <span className="flex items-center text-green-400 text-xs">
                <TrendingUp size={14} />
                +{trend}%
            </span>
        );
        return (
            <span className="flex items-center text-red-400 text-xs">
                <TrendingDown size={14} />
                {trend}%
            </span>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-red-400" />
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft size={18} className="text-white/70" />
                    </button>
                    <span className="text-xs text-white/50 min-w-[80px] text-center">
                        {compareData.current.label}
                    </span>
                    <button
                        onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                        disabled={weekOffset === 0}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
                    >
                        <ChevronRight size={18} className="text-white/70" />
                    </button>
                </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-2 gap-3">
                {metrics.map(metric => {
                    const current = compareData.current[metric.key];
                    const previous = compareData.previous[metric.key];
                    const max = Math.max(current, previous) || 1;

                    return (
                        <div key={metric.key} className="p-3 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-white/50 flex items-center gap-1">
                                    {metric.icon} {metric.label}
                                </span>
                                <TrendIndicator current={current} previous={previous} />
                            </div>

                            {/* Comparison bars */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-red-500 to-purple-600"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(current / max) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-white font-bold min-w-[50px] text-right">
                                        {current.toLocaleString()}{metric.suffix}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-gray-500 to-gray-600"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(previous / max) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-white/50 min-w-[50px] text-right">
                                        {previous.toLocaleString()}{metric.suffix}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs">
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-purple-600" />
                    {compareData.current.label}
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600" />
                    {compareData.previous.label}
                </span>
            </div>
        </div>
    );
};

export default ComparisonChart;



