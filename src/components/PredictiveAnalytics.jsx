import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Minus, AlertTriangle,
    Zap, Moon, Activity, Target, Calendar, Brain,
    Flame, Droplets, Heart
} from 'lucide-react';
import { Card } from './UIComponents';

/**
 * Predictive Analytics Component
 * Shows AI-predicted recovery, risk scores, and optimal workout windows
 */
export const PredictiveAnalytics = ({ workouts = [], profile = {}, meals = [], progress = [] }) => {

    // Calculate recovery score (0-100)
    const recoveryScore = useMemo(() => {
        const lastWorkout = workouts[0];
        if (!lastWorkout) return 100;

        const hoursSinceWorkout = (Date.now() - new Date(lastWorkout.createdAt?.seconds * 1000 || lastWorkout.date).getTime()) / (1000 * 60 * 60);

        // Base recovery: 48 hours for full recovery
        let recovery = Math.min(100, (hoursSinceWorkout / 48) * 100);

        // Adjust based on workout intensity (sets * exercises)
        const intensity = (lastWorkout.exercises?.length || 1) * (lastWorkout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0) || 1);
        recovery = recovery - (intensity > 15 ? 10 : 0);

        // Sleep bonus (assume 8 hours rest adds 10%)
        recovery = Math.min(100, recovery + (profile.sleepHours >= 7 ? 10 : 0));

        return Math.round(Math.max(0, recovery));
    }, [workouts, profile]);

    // Injury risk score (0-100, lower is better)
    const injuryRisk = useMemo(() => {
        let risk = 10; // Base risk

        // Overtraining indicator
        const workoutsLast7Days = workouts.filter(w => {
            const workoutDate = new Date(w.createdAt?.seconds * 1000 || w.date);
            return (Date.now() - workoutDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
        }).length;

        if (workoutsLast7Days >= 6) risk += 30;
        else if (workoutsLast7Days >= 5) risk += 15;

        // Recovery deficit
        if (recoveryScore < 50) risk += 20;
        else if (recoveryScore < 70) risk += 10;

        // Hydration (estimate from water logs if available)
        const todayMeals = meals.filter(m => m.date === new Date().toISOString().split('T')[0]);
        if (todayMeals.length === 0) risk += 5;

        return Math.min(100, Math.round(risk));
    }, [workouts, meals, recoveryScore]);

    // Optimal workout windows
    const optimalWindows = useMemo(() => {
        const windows = [];
        const now = new Date();
        const hour = now.getHours();

        // Morning window (6-10 AM)
        if (hour < 10) {
            windows.push({
                time: '6:00 - 10:00 AM',
                label: 'Morning Power',
                benefit: 'Peak testosterone, fat burning',
                score: recoveryScore > 70 ? 95 : 70
            });
        }

        // Afternoon window (2-5 PM)
        windows.push({
            time: '2:00 - 5:00 PM',
            label: 'Afternoon Strength',
            benefit: 'Peak body temperature, strength',
            score: recoveryScore > 60 ? 90 : 65
        });

        // Evening window (5-8 PM)
        windows.push({
            time: '5:00 - 8:00 PM',
            label: 'Evening Performance',
            benefit: 'Best reaction time, flexibility',
            score: recoveryScore > 50 ? 85 : 60
        });

        return windows.sort((a, b) => b.score - a.score);
    }, [recoveryScore]);

    // Weekly volume trend
    const volumeTrend = useMemo(() => {
        const last2Weeks = workouts.filter(w => {
            const d = new Date(w.createdAt?.seconds * 1000 || w.date);
            return (Date.now() - d.getTime()) < 14 * 24 * 60 * 60 * 1000;
        });

        const thisWeek = last2Weeks.filter(w => {
            const d = new Date(w.createdAt?.seconds * 1000 || w.date);
            return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });

        const lastWeek = last2Weeks.filter(w => {
            const d = new Date(w.createdAt?.seconds * 1000 || w.date);
            const diff = Date.now() - d.getTime();
            return diff >= 7 * 24 * 60 * 60 * 1000 && diff < 14 * 24 * 60 * 60 * 1000;
        });

        const thisWeekVolume = thisWeek.reduce((acc, w) =>
            acc + (w.exercises?.reduce((a, e) =>
                a + (e.sets?.reduce((s, set) => s + (parseFloat(set.w) || 0) * (parseFloat(set.r) || 0), 0) || 0), 0) || 0), 0);

        const lastWeekVolume = lastWeek.reduce((acc, w) =>
            acc + (w.exercises?.reduce((a, e) =>
                a + (e.sets?.reduce((s, set) => s + (parseFloat(set.w) || 0) * (parseFloat(set.r) || 0), 0) || 0), 0) || 0), 0);

        const change = lastWeekVolume > 0 ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100 : 0;

        return { thisWeek: thisWeekVolume, lastWeek: lastWeekVolume, change };
    }, [workouts]);

    const getRiskColor = (risk) => {
        if (risk < 30) return 'text-green-400';
        if (risk < 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getRecoveryColor = (score) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-white">AI Insights</h3>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* Recovery Score */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)' }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-medium text-white/60">Recovery</span>
                    </div>
                    <div className={`text-3xl font-black ${getRecoveryColor(recoveryScore)}`}>
                        {recoveryScore}%
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${recoveryScore}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                        />
                    </div>
                </motion.div>

                {/* Injury Risk */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                    style={{ background: `linear-gradient(135deg, rgba(${injuryRisk > 50 ? '239, 68, 68' : '234, 179, 8'}, 0.1) 0%, rgba(${injuryRisk > 50 ? '239, 68, 68' : '234, 179, 8'}, 0.05) 100%)` }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-medium text-white/60">Injury Risk</span>
                    </div>
                    <div className={`text-3xl font-black ${getRiskColor(injuryRisk)}`}>
                        {injuryRisk < 30 ? 'Low' : injuryRisk < 60 ? 'Mod' : 'High'}
                    </div>
                    <p className="text-[11px] text-white/40 mt-1">
                        {injuryRisk < 30 ? 'Safe to train hard' : injuryRisk < 60 ? 'Consider active recovery' : 'Rest recommended'}
                    </p>
                </motion.div>
            </div>

            {/* Volume Trend */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium text-white">Volume Trend</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-bold ${volumeTrend.change > 0 ? 'text-green-400' : volumeTrend.change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {volumeTrend.change > 0 ? <TrendingUp className="w-4 h-4" /> : volumeTrend.change < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        {Math.abs(volumeTrend.change).toFixed(0)}%
                    </div>
                </div>
                <div className="flex items-end justify-between gap-2">
                    <div>
                        <p className="text-xs text-white/40">This Week</p>
                        <p className="text-lg font-bold text-white">{(volumeTrend.thisWeek / 1000).toFixed(1)}k lbs</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/40">Last Week</p>
                        <p className="text-lg font-bold text-white/60">{(volumeTrend.lastWeek / 1000).toFixed(1)}k lbs</p>
                    </div>
                </div>
            </motion.div>

            {/* Optimal Windows */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
            >
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Best Training Windows</span>
                </div>
                <div className="space-y-2">
                    {optimalWindows.slice(0, 2).map((window, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                            <div>
                                <p className="text-sm font-medium text-white">{window.time}</p>
                                <p className="text-[11px] text-white/40">{window.benefit}</p>
                            </div>
                            <div className={`text-sm font-bold ${window.score > 80 ? 'text-green-400' : window.score > 60 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                {window.score}%
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default PredictiveAnalytics;



