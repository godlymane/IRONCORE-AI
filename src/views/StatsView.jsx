import React, { useMemo, useState } from 'react';
import {
    ComposedChart, Line, Bar, CartesianGrid, XAxis, YAxis,
    Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    LineChart
} from 'recharts';
import { Trophy, Medal, Crown, Star, Lock, Activity, Zap, Grid, Flame, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { getLevel } from '../utils/helpers';
import { LEVELS, EXERCISE_DB } from '../utils/constants';
import { BodyHeatmap } from '../components/BodyHeatmap';
import { usePremium } from '../context/PremiumContext';
import { useStore } from '../hooks/useStore';

// Use shared LEVELS array as league display data (same thresholds as LEAGUE_THRESHOLDS)
const LEAGUES = LEVELS;

export const StatsView = () => {
    const { profile, progress, meals, workouts, userDoc } = useStore();

    // Build lookup Maps for EXERCISE_DB once — O(1) lookups instead of O(n) .find() per exercise
    const { exerciseDbMap, exerciseDbPartialMap } = useMemo(() => {
        const byExact = new Map();
        const byFirstWord = new Map();
        EXERCISE_DB.forEach(e => {
            const lower = e.name.toLowerCase();
            byExact.set(lower, e);
            // Secondary map keyed by first word for partial matching
            const firstWord = lower.split(' ')[0];
            if (firstWord && !byFirstWord.has(firstWord)) {
                byFirstWord.set(firstWord, e);
            }
        });
        return { exerciseDbMap: byExact, exerciseDbPartialMap: byFirstWord };
    }, []);
    const { isPremium, requirePremium } = usePremium();
    const currentXP = profile.xp || 0;
    const currentLeague = LEAGUES.slice().reverse().find(l => currentXP >= l.min) || LEAGUES[0];
    const nextLeague = LEAGUES.find(l => l.min > currentXP);
    const progressToNext = nextLeague
        ? Math.min(((currentXP - currentLeague.min) / (nextLeague.min - currentLeague.min)) * 100, 100)
        : 100;

    const muscleIntensity = useMemo(() => {
        const stats = {
            chest: 0, lats: 0, traps: 0, lower_back: 0,
            quads: 0, hamstrings: 0, calves: 0, glutes: 0,
            front_delts: 0, side_delts: 0, rear_delts: 0,
            biceps: 0, triceps: 0, forearms: 0, abs: 0, core: 0
        };

        workouts.forEach(w => {
            if (w.exercises) {
                w.exercises.forEach(ex => {
                    const exLower = ex.name.toLowerCase();
                    // O(1) exact match, then O(1) first-word partial match, avoids O(n) scan
                    const dbEntry = exerciseDbMap.get(exLower)
                        || exerciseDbPartialMap.get(exLower.split(' ')[0]);

                    if (dbEntry) {
                        let hardSets = 0;
                        ex.sets.forEach(s => {
                            const rpe = parseFloat(s.rpe) || 7;
                            hardSets += Math.max(rpe / 10, 0.5);
                        });

                        if (stats[dbEntry.muscle] !== undefined) stats[dbEntry.muscle] += hardSets;
                        if (dbEntry.secondary) {
                            dbEntry.secondary.forEach(sec => {
                                if (stats[sec] !== undefined) stats[sec] += (hardSets * 0.5);
                            });
                        }
                    }
                });
            }
        });
        return stats;
    }, [workouts, exerciseDbMap, exerciseDbPartialMap]);

    const totalHardSets = Object.values(muscleIntensity).reduce((a, b) => a + b, 0);

    const disciplineGrid = useMemo(() => {
        const days = [];
        const today = new Date();
        const dailyTarget = profile.dailyCalories || 2500;

        // Pre-index workouts by date — O(n) build, O(1) lookup per day
        const workoutDates = new Set();
        workouts.forEach(w => {
            const wDate = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.date);
            workoutDates.add(wDate.toISOString().split('T')[0]);
        });

        // Pre-index meals by date — O(n) build, O(1) lookup per day
        const mealsByDate = {};
        meals.forEach(m => {
            if (!mealsByDate[m.date]) mealsByDate[m.date] = { count: 0, cals: 0 };
            mealsByDate[m.date].count++;
            mealsByDate[m.date].cals += (m.calories || 0);
        });

        for (let i = 89; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const hasWorkout = workoutDates.has(dateStr);
            const dayData = mealsByDate[dateStr];
            const hasLoggedFood = dayData ? dayData.count > 0 : false;
            const dayCals = dayData ? dayData.cals : 0;

            let score = 0;
            if (hasWorkout) {
                if (hasLoggedFood) {
                    const withinTarget = dayCals >= (dailyTarget * 0.9) && dayCals <= (dailyTarget * 1.1);
                    score = withinTarget ? 3 : 2;
                } else score = 1;
            } else {
                if (hasLoggedFood) score = 1;
            }
            days.push({ date: dateStr, score });
        }
        return days;
    }, [workouts, meals, profile.dailyCalories]);

    const trendData = useMemo(() => {
        const sortedProgress = [...progress].sort((a, b) => new Date(a.date) - new Date(b.date));
        const dailyMap = {};
        disciplineGrid.forEach(d => {
            let height = 0;
            if (d.score === 2) height = 100;
            if (d.score === 3) height = 100;
            if (d.score === 1) height = 50;
            dailyMap[d.date] = { date: d.date, val: height, type: d.score };
        });

        const chartDates = Object.keys(dailyMap).sort().slice(-14);
        const firstChartDate = new Date(chartDates[0]);
        let lastKnownWeight = sortedProgress.filter(p => new Date(p.date) < firstChartDate && p.weight).pop()?.weight || profile.weight || 0;

        return chartDates.map(dateStr => {
            const log = sortedProgress.find(p => p.date === dateStr && p.weight);
            if (log) lastKnownWeight = log.weight;
            return {
                date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: dailyMap[dateStr].val,
                type: dailyMap[dateStr].type,
                weight: lastKnownWeight > 0 ? lastKnownWeight : null
            };
        });
    }, [progress, disciplineGrid, profile]);

    const achievements = [
        { id: 'a1', title: 'First Blood', desc: 'Log 1st workout', icon: <Star size={14} />, unlocked: (workouts?.length || 0) > 0, rarity: 'common' },
        { id: 'a2', title: 'Iron Addict', desc: '10 workouts total', icon: <Activity size={14} />, unlocked: (workouts?.length || 0) >= 10, rarity: 'rare' },
        { id: 'a3', title: 'Savage', desc: '50 Hard Sets', icon: <Zap size={14} />, unlocked: totalHardSets >= 50, rarity: 'rare' },
        { id: 'a4', title: 'Warlord', desc: 'Reach Level 5', icon: <Medal size={14} />, unlocked: (profile.xp || 0) >= 5000, rarity: 'epic' },
        { id: 'a5', title: 'God Mode', desc: 'Reach 10,000 XP', icon: <Crown size={14} />, unlocked: (profile.xp || 0) >= 10000, rarity: 'legendary' },
    ];

    const getRarityColor = (r) => {
        if (r === 'legendary') return 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
        if (r === 'epic') return 'border-purple-500 bg-red-500/10 text-red-500';
        if (r === 'rare') return 'border-red-500 bg-amber-500/10 text-amber-500';
        return 'border-gray-700 bg-gray-800 text-gray-400';
    }

    const archetypeData = useMemo(() => {
        const now = Date.now();
        const msPerDay = 86400000;

        // Consistency: % of last 30 days with a workout or meal logged
        const activeDays = new Set();
        workouts.forEach(w => {
            const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.date);
            if (now - d.getTime() < 30 * msPerDay) activeDays.add(d.toISOString().split('T')[0]);
        });
        meals.forEach(m => {
            if (m.date && now - new Date(m.date).getTime() < 30 * msPerDay) activeDays.add(m.date);
        });
        const consistency = Math.min(100, Math.round((activeDays.size / 30) * 100));

        // Intensity: avg RPE over last 14 days scaled to 0-100
        let totalRpe = 0, rpeCount = 0;
        workouts.forEach(w => {
            const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.date);
            if (now - d.getTime() < 14 * msPerDay && w.exercises) {
                w.exercises.forEach(ex => {
                    ex.sets?.forEach(s => { totalRpe += parseFloat(s.rpe) || 7; rpeCount++; });
                });
            }
        });
        const intensity = rpeCount > 0 ? Math.min(100, Math.round((totalRpe / rpeCount) * 10)) : 0;

        // Discipline: % of last 14 days with both workout AND food logged
        const perfectDays = disciplineGrid.slice(-14).filter(d => d.score >= 2).length;
        const discipline = Math.min(100, Math.round((perfectDays / 14) * 100));

        // Frequency: workouts per week over last 28 days (5+/wk = 100)
        const last28Workouts = workouts.filter(w => {
            const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.date);
            return now - d.getTime() < 28 * msPerDay;
        }).length;
        const frequency = Math.min(100, Math.round((last28Workouts / 4 / 5) * 100));

        // Legacy: total XP scaled (25000 = Diamond = 100)
        const legacy = Math.min(100, Math.round(((profile.xp || 0) / 25000) * 100));

        return [
            { subject: 'Consistency', A: consistency, fullMark: 100 },
            { subject: 'Intensity', A: intensity, fullMark: 100 },
            { subject: 'Discipline', A: discipline, fullMark: 100 },
            { subject: 'Frequency', A: frequency, fullMark: 100 },
            { subject: 'Legacy', A: legacy, fullMark: 100 },
        ];
    }, [workouts, meals, profile.xp, disciplineGrid]);

    // Weight trend: last 7 weigh-in entries from progress
    const weightTrendData = useMemo(() => {
        return [...progress]
            .filter(p => typeof p.weight === 'number' && p.weight > 0 && p.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7)
            .map(p => ({
                date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                weight: p.weight,
            }));
    }, [progress]);

    const currentWeight = weightTrendData.length > 0
        ? weightTrendData[weightTrendData.length - 1].weight
        : (profile?.weight || null);
    const targetWeight = profile?.targetWeight || null;
    const weightStatus = userDoc?.weightStatus || null;

    const weightDirection = weightTrendData.length >= 2
        ? weightTrendData[weightTrendData.length - 1].weight - weightTrendData[0].weight
        : 0;

    const weightDomain = weightTrendData.length > 0
        ? [Math.min(...weightTrendData.map(d => d.weight)) - 2, Math.max(...weightTrendData.map(d => d.weight)) + 2]
        : ['auto', 'auto'];

    return (
        <div className="space-y-6 pb-4 animate-in fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">Flex Analytics</h2>
                <div className="px-3 py-1 bg-gray-900 rounded-full border border-gray-800 text-[11px] font-mono text-gray-400">INTENSITY OS</div>
            </div>

            {/* LEAGUE CARD */}
            <div className={`p-1 rounded-3xl border ${currentLeague.border} shadow-2xl relative overflow-hidden`}>
                <div className={`absolute inset-0 ${currentLeague.bg} opacity-50`}></div>
                <div className="p-6 text-center relative z-10">
                    <div className="flex justify-center mb-2"><Shield size={48} className={currentLeague.color} fill="currentColor" fillOpacity={0.2} /></div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Current League</h2>
                    <div className={`text-4xl font-black italic ${currentLeague.color} drop-shadow-md`}>{currentLeague.name}</div>
                    <div className="mt-4 relative">
                        <div className="flex justify-between text-[11px] font-mono text-gray-400 uppercase mb-1"><span>{currentXP} XP</span><span>{nextLeague ? nextLeague.min : 'MAX'} XP</span></div>
                        <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-700"><div className={`h-full transition-all duration-1000 ${currentLeague.color.replace('text-', 'bg-')}`} style={{ width: `${progressToNext}%` }}></div></div>
                    </div>
                </div>
            </div>

            {/* LIFTER ARCHETYPE */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl relative overflow-hidden">
                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2 mb-4"><Activity size={14} className="text-cyan-500" /> Lifter Archetype {!isPremium && <Lock size={10} className="text-yellow-400" />}</h3>
                {!isPremium && (
                    <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl cursor-pointer" onClick={() => requirePremium('pro', 'advancedStats')}>
                        <Lock size={24} className="text-yellow-400 mb-2" />
                        <p className="text-xs font-bold text-white">Pro Feature</p>
                        <p className="text-[11px] text-gray-400">Tap to unlock</p>
                    </div>
                )}
                <div className="h-56 w-full" role="img" aria-label="Lifter archetype radar chart showing consistency, intensity, discipline, frequency, and legacy scores">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={archetypeData}>
                            <PolarGrid stroke="#374151" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Stats" dataKey="A" stroke="#dc2626" strokeWidth={2} fill="#dc2626" fillOpacity={0.4} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* GRIND GRID */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Grid size={14} className="text-green-500" /> Discipline Grid</h3>
                    <div className="flex gap-2"><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[8px] text-gray-500">Perfect</span></div><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[8px] text-gray-500">Dirty</span></div></div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                    {disciplineGrid.map((day, i) => {
                        let color = 'bg-gray-800';
                        let statusTitle = `${day.date}: No data`;
                        if (day.score === 1) { color = 'bg-gray-700'; statusTitle = `${day.date}: Partial activity`; }
                        if (day.score === 2) { color = 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]'; statusTitle = `${day.date}: Workout completed`; }
                        if (day.score === 3) { color = 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]'; statusTitle = `${day.date}: Perfect day`; }

                        return (<div key={i} className={`w-2 h-2 rounded-sm ${color}`} title={statusTitle} role="img" aria-label={statusTitle} />);
                    })}
                </div>
            </div>

            {/* ANATOMY INTELLIGENCE */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Flame size={14} className="text-red-500" /> Bio-Scan</h3>
                    <div className="text-right"><p className="text-[11px] text-gray-500 uppercase font-bold">Hard Sets</p><p className="text-lg font-black text-white italic">{Math.round(totalHardSets)}</p></div>
                </div>
                <BodyHeatmap muscleScores={muscleIntensity} />
                <p className="text-[11px] text-center text-gray-600 mt-2 italic">Based on training intensity (RPE).</p>
            </div>

            {/* TRENDS CHART */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl h-64" role="img" aria-label="Correlation chart showing discipline score and weight trend over the last 14 days">
                <div className="flex justify-between items-center mb-4"><h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><TrendingUp size={14} className="text-red-500" /> Correlation</h3></div>
                <ResponsiveContainer width="100%" height="80%">
                    <ComposedChart data={trendData}>
                        <defs><linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" orientation="left" stroke="#22c55e" hide />
                        <YAxis yAxisId="right" orientation="right" stroke="#eab308" hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                        <Bar yAxisId="left" dataKey="score" fill="url(#volGrad)" barSize={8} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#eab308" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500"></div><span className="text-[11px] text-gray-500">Discipline</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-[11px] text-gray-500">Weight</span></div>
                </div>
            </div>

            {/* WEIGHT TREND */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2">
                        <TrendingUp size={14} className="text-yellow-500" /> Weight Trend
                    </h3>
                    {/* Status badge */}
                    {weightStatus && (
                        <span
                            className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{
                                background: weightStatus === 'on_track'
                                    ? 'rgba(34,197,94,0.15)'
                                    : weightStatus === 'off_track'
                                    ? 'rgba(239,68,68,0.15)'
                                    : 'rgba(107,114,128,0.2)',
                                color: weightStatus === 'on_track'
                                    ? '#22c55e'
                                    : weightStatus === 'off_track'
                                    ? '#ef4444'
                                    : '#9ca3af',
                                border: `1px solid ${weightStatus === 'on_track' ? 'rgba(34,197,94,0.3)' : weightStatus === 'off_track' ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.2)'}`,
                            }}
                        >
                            {weightStatus === 'on_track' ? 'ON TRACK' : weightStatus === 'off_track' ? 'OFF TRACK' : 'BUILDING'}
                        </span>
                    )}
                </div>

                {/* Current vs Target row */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 text-center p-2 rounded-xl bg-gray-800/50">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Current</p>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                            <p className="text-xl font-black text-white">
                                {currentWeight != null ? `${currentWeight}` : '—'}
                            </p>
                            {weightTrendData.length >= 2 && (
                                weightDirection < 0
                                    ? <TrendingDown size={16} className="text-red-400" />
                                    : weightDirection > 0
                                    ? <TrendingUp size={16} className="text-green-400" />
                                    : null
                            )}
                        </div>
                        <p className="text-[10px] text-gray-600">kg</p>
                    </div>
                    {targetWeight && (
                        <div className="flex-1 text-center p-2 rounded-xl bg-gray-800/50">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Target</p>
                            <p className="text-xl font-black text-yellow-400 mt-0.5">{targetWeight}</p>
                            <p className="text-[10px] text-gray-600">kg</p>
                        </div>
                    )}
                </div>

                {weightTrendData.length >= 2 ? (
                    <div className="h-36" role="img" aria-label="Weight trend line chart showing recent weigh-in history">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightTrendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis domain={weightDomain} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#eab308' }}
                                    formatter={(v) => [`${v} kg`, 'Weight']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#eab308"
                                    strokeWidth={2.5}
                                    dot={{ fill: '#eab308', r: 4 }}
                                    activeDot={{ r: 6, fill: '#eab308' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-20 flex items-center justify-center">
                        <p className="text-xs text-gray-600 font-bold uppercase tracking-widest">
                            Log 2+ weigh-ins to see your trend
                        </p>
                    </div>
                )}
            </div>

            {/* HALL OF FAME */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2 px-1"><Trophy size={14} className="text-yellow-500" /> Hall of Fame</h3>
                <div className="grid grid-cols-2 gap-3">
                    {achievements.map(a => (
                        <div key={a.id} className={`p-4 rounded-2xl border relative overflow-hidden group ${a.unlocked ? getRarityColor(a.rarity) : 'bg-gray-900 border-gray-800 opacity-60'}`}>
                            {a.unlocked && <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>}
                            <div className="flex justify-between items-start mb-2"><div className={`p-1.5 rounded-lg ${a.unlocked ? 'bg-black/20' : 'bg-gray-800'}`}>{a.unlocked ? a.icon : <Lock size={14} />}</div>{a.unlocked && <span className="text-[8px] font-black uppercase tracking-widest opacity-70">{a.rarity}</span>}</div>
                            <p className="text-xs font-black uppercase">{a.title}</p>
                            <p className="text-[11px] opacity-80 leading-tight mt-1">{a.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};



