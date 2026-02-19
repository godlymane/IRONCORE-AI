import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
    TrendingUp, TrendingDown, Minus, Scale, Target,
    Activity, Trophy, Flame, Calendar, Award, Download
} from 'lucide-react';
import { Button, Card } from './UIComponents';

/**
 * Body Composition Graph
 */
export const BodyCompositionGraph = ({ data = [], metric = 'weight' }) => {
    const processedData = useMemo(() => {
        return data.slice(-30).map(d => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weight: d.weight,
            bodyFat: d.bodyFat,
            muscle: d.muscle,
        }));
    }, [data]);

    const getChange = () => {
        if (processedData.length < 2) return { value: 0, trend: 'neutral' };
        const first = processedData[0][metric] || 0;
        const last = processedData[processedData.length - 1][metric] || 0;
        const change = last - first;
        return {
            value: Math.abs(change).toFixed(1),
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
        };
    };

    const change = getChange();
    const colors = {
        weight: '#dc2626',
        bodyFat: '#f59e0b',
        muscle: '#22c55e'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-white">Body Composition</span>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${change.trend === 'up' ? 'text-green-400' :
                        change.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                    {change.trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
                        change.trend === 'down' ? <TrendingDown className="w-4 h-4" /> :
                            <Minus className="w-4 h-4" />}
                    {change.value} kg
                </div>
            </div>

            {/* Metric tabs */}
            <div className="flex gap-2 mb-4">
                {['weight', 'bodyFat', 'muscle'].map(m => (
                    <button
                        key={m}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${metric === m
                                ? 'bg-red-500 text-white'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                    >
                        {m === 'bodyFat' ? 'Body Fat' : m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedData}>
                        <defs>
                            <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[metric]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors[metric]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        />
                        <YAxis
                            hide
                            domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey={metric}
                            stroke={colors[metric]}
                            fill="url(#colorMetric)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

/**
 * Personal Records Board
 */
export const PersonalRecordsBoard = ({ records = [] }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-yellow-500/20 bg-yellow-500/5"
        >
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-white">Personal Records</span>
            </div>

            {records.length === 0 ? (
                <div className="text-center py-8">
                    <Trophy className="w-10 h-10 text-yellow-500/30 mx-auto mb-3" />
                    <p className="text-sm text-white/50 font-medium">No PRs yet</p>
                    <p className="text-[11px] text-white/30 mt-1">Complete your first workout to see records here.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {records.slice(0, 5).map((pr, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-center justify-between p-3 rounded-xl ${pr.isNew ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {pr.isNew && <Award className="w-4 h-4 text-yellow-400 animate-pulse" />}
                                <div>
                                    <p className="text-sm font-medium text-white">{pr.exercise}</p>
                                    <p className="text-[11px] text-white/40">{pr.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-black ${pr.isNew ? 'text-yellow-400' : 'text-white'}`}>
                                    {pr.weight}
                                </p>
                                <p className="text-[11px] text-white/40">kg</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

/**
 * Workout Intensity Score
 */
export const WorkoutIntensityScore = ({ workouts = [], weeklyData = [] }) => {
    const getIntensity = (workout) => {
        if (!workout?.exercises) return 0;
        let score = 0;
        workout.exercises.forEach(ex => {
            const sets = ex.sets?.length || 0;
            const avgWeight = ex.sets?.reduce((a, s) => a + (parseFloat(s.w) || 0), 0) / (sets || 1);
            score += sets * avgWeight * 0.01;
        });
        return Math.min(100, Math.round(score));
    };

    const todayScore = workouts.length > 0 ? getIntensity(workouts[0]) : 0;

    const weekData = weeklyData.length > 0 ? weeklyData : [];

    const avgScore = weekData.length > 0
        ? Math.round(weekData.reduce((a, d) => a + d.score, 0) / weekData.filter(d => d.score > 0).length || 0)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    <span className="font-bold text-white">Intensity Score</span>
                </div>
                {weekData.length > 0 && <div className="text-2xl font-black text-orange-400">{avgScore}</div>}
            </div>

            {weekData.length === 0 ? (
                <div className="text-center py-6">
                    <Activity className="w-10 h-10 text-orange-400/30 mx-auto mb-3" />
                    <p className="text-sm text-white/50 font-medium">No intensity data yet</p>
                    <p className="text-[11px] text-white/30 mt-1">Train this week to see your intensity pattern.</p>
                </div>
            ) : (
                <>
                    <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekData}>
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                                />
                                <Bar
                                    dataKey="score"
                                    fill="#f97316"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-white/40 text-center mt-2">Weekly intensity pattern</p>
                </>
            )}
        </motion.div>
    );
};

/**
 * Muscle Group Training Radar
 */
export const MuscleGroupRadar = ({ trainingData = [] }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
        >
            <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white">Training Balance</span>
            </div>

            {trainingData.length === 0 ? (
                <div className="text-center py-8">
                    <Target className="w-10 h-10 text-cyan-400/30 mx-auto mb-3" />
                    <p className="text-sm text-white/50 font-medium">No training data yet</p>
                    <p className="text-[11px] text-white/30 mt-1">Log a few workouts to see your muscle balance.</p>
                </div>
            ) : (
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={trainingData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                                dataKey="muscle"
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                            />
                            <Radar
                                name="Volume"
                                dataKey="volume"
                                stroke="#06b6d4"
                                fill="#06b6d4"
                                fillOpacity={0.3}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </motion.div>
    );
};

/**
 * Plateau Detection Alert
 */
export const PlateauDetection = ({ exercise, lastPR, weeksSincePR, suggestion }) => {
    const isPlateaued = weeksSincePR >= 4;

    if (!isPlateaued) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10"
        >
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/20">
                    <Activity className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-yellow-400">Plateau Detected</p>
                    <p className="text-sm text-white/70 mt-1">
                        Your {exercise} hasn't improved in {weeksSincePR} weeks (last PR: {lastPR} lbs)
                    </p>
                    {suggestion && (
                        <p className="text-xs text-white/50 mt-2 p-2 bg-white/5 rounded-lg">
                            💡 {suggestion}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Export Report Button
 */
export const ExportReportButton = ({ onExport }) => {
    return (
        <Button
            onClick={onExport}
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
        >
            <Download className="w-4 h-4" />
            Export PDF Report
        </Button>
    );
};

export default {
    BodyCompositionGraph,
    PersonalRecordsBoard,
    WorkoutIntensityScore,
    MuscleGroupRadar,
    PlateauDetection,
    ExportReportButton
};



