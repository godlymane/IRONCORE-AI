import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    AreaChart, Area, BarChart, Bar, Tooltip
} from 'recharts';
import {
    TrendingUp, TrendingDown, Flame, Droplets, Calendar,
    Apple, Beef, Wheat, Fish, Coffee, UtensilsCrossed,
    Plus, Clock, Timer, Check, Bell
} from 'lucide-react';
import { Button, Card } from './UIComponents';

/**
 * Macro Pie Chart Component
 */
export const MacroPieChart = ({ protein = 0, carbs = 0, fats = 0, goals = {} }) => {
    const data = [
        { name: 'Protein', value: protein, color: '#22c55e', goal: goals.protein || 150 },
        { name: 'Carbs', value: carbs, color: '#dc2626', goal: goals.carbs || 200 },
        { name: 'Fats', value: fats, color: '#f59e0b', goal: goals.fats || 60 },
    ];

    const total = protein + carbs + fats;

    return (
        <div className="flex items-center gap-4">
            <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={3}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-white">{total}g</span>
                </div>
            </div>

            <div className="flex-1 space-y-2">
                {data.map(macro => {
                    const progress = (macro.value / macro.goal) * 100;
                    return (
                        <div key={macro.name}>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-medium text-white/60">{macro.name}</span>
                                <span className="text-xs font-bold" style={{ color: macro.color }}>
                                    {macro.value}/{macro.goal}g
                                </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, progress)}%` }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: macro.color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Water Intake Tracker
 */
export const WaterTracker = ({ glasses = 0, goal = 8, onAdd, onRemove }) => {
    const bottles = Array.from({ length: goal }, (_, i) => i < glasses);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-cyan-500/20 bg-cyan-500/5"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold text-white">Hydration</span>
                </div>
                <span className="text-sm font-bold text-cyan-400">{glasses}/{goal}</span>
            </div>

            <div className="flex justify-between gap-1 mb-3">
                {bottles.map((filled, i) => (
                    <motion.button
                        key={i}
                        onClick={() => filled ? onRemove?.() : onAdd?.()}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`flex-1 h-10 rounded-lg transition-all ${filled
                                ? 'bg-gradient-to-t from-cyan-500 to-cyan-400'
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                    >
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: filled ? '100%' : 0 }}
                            className="bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-lg"
                        />
                    </motion.button>
                ))}
            </div>

            <div className="flex gap-2">
                <Button onClick={onAdd} variant="secondary" className="flex-1 !py-2">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Glass
                </Button>
            </div>
        </motion.div>
    );
};

/**
 * Intermittent Fasting Timer
 */
export const FastingTimer = ({
    fastingHours = 16,
    eatingHours = 8,
    startTime = null, // ISO string when fast started
    onStart,
    onEnd
}) => {
    const [elapsed, setElapsed] = useState(0);
    const [isFasting, setIsFasting] = useState(!!startTime);

    useEffect(() => {
        if (!startTime) return;

        const updateElapsed = () => {
            const start = new Date(startTime);
            const now = new Date();
            setElapsed(Math.floor((now - start) / 1000));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const totalFastSeconds = fastingHours * 3600;
    const progress = Math.min(100, (elapsed / totalFastSeconds) * 100);
    const timeRemaining = Math.max(0, totalFastSeconds - elapsed);
    const isComplete = elapsed >= totalFastSeconds;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleToggle = () => {
        if (isFasting) {
            onEnd?.();
            setIsFasting(false);
        } else {
            onStart?.();
            setIsFasting(true);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-green-400" />
                    <span className="font-bold text-white">Intermittent Fasting</span>
                </div>
                <span className="text-xs text-white/40">{fastingHours}:{eatingHours} protocol</span>
            </div>

            {/* Circular progress */}
            <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64" cy="64" r="56"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                    />
                    <circle
                        cx="64" cy="64" r="56"
                        fill="none"
                        stroke={isComplete ? '#22c55e' : '#dc2626'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {isFasting ? (
                        <>
                            <span className={`text-xl font-black ${isComplete ? 'text-green-400' : 'text-white'}`}>
                                {isComplete ? '✓ Done' : formatTime(timeRemaining)}
                            </span>
                            <span className="text-[11px] text-white/40">remaining</span>
                        </>
                    ) : (
                        <span className="text-sm text-white/50">Not fasting</span>
                    )}
                </div>
            </div>

            {/* Status and controls */}
            <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                <span>Elapsed: {formatTime(elapsed)}</span>
                <span className={isFasting ? 'text-orange-400' : 'text-green-400'}>
                    {isFasting ? '🔥 Fasting' : '🍽️ Eating Window'}
                </span>
            </div>

            <Button
                onClick={handleToggle}
                variant={isFasting ? 'danger' : 'primary'}
                className="w-full"
            >
                {isFasting ? 'End Fast' : 'Start Fast'}
            </Button>
        </motion.div>
    );
};

/**
 * Supplement Tracker
 */
export const SupplementTracker = ({ supplements = [], onToggle, onAddReminder }) => {
    const defaultSupplements = [
        { id: 'vitamin_d', name: 'Vitamin D', icon: '☀️', taken: false, time: '08:00' },
        { id: 'omega3', name: 'Omega-3', icon: '🐟', taken: false, time: '08:00' },
        { id: 'creatine', name: 'Creatine', icon: '💪', taken: false, time: '12:00' },
        { id: 'protein', name: 'Protein', icon: '🥤', taken: false, time: '18:00' },
        { id: 'magnesium', name: 'Magnesium', icon: '💊', taken: false, time: '21:00' },
    ];

    const items = supplements.length > 0 ? supplements : defaultSupplements;
    const taken = items.filter(s => s.taken).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-white">Supplements</span>
                </div>
                <span className="text-sm font-bold text-red-400">{taken}/{items.length}</span>
            </div>

            <div className="space-y-2">
                {items.map(supp => (
                    <motion.button
                        key={supp.id}
                        onClick={() => onToggle?.(supp.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${supp.taken
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{supp.icon}</span>
                            <div className="text-left">
                                <p className={`text-sm font-medium ${supp.taken ? 'text-green-400' : 'text-white'}`}>
                                    {supp.name}
                                </p>
                                <p className="text-[11px] text-white/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {supp.time}
                                </p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${supp.taken ? 'bg-green-500' : 'border border-white/20'
                            }`}>
                            {supp.taken && <Check className="w-4 h-4 text-white" />}
                        </div>
                    </motion.button>
                ))}
            </div>

            <Button onClick={onAddReminder} variant="secondary" className="w-full mt-3">
                <Bell className="w-4 h-4 mr-2" />
                Set Reminders
            </Button>
        </motion.div>
    );
};

/**
 * Calorie Burn Summary Card
 */
export const CalorieBurnCard = ({ burned = 0, goal = 500, activities = [] }) => {
    const progress = Math.min(100, (burned / goal) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl backdrop-blur-xl border border-orange-500/20 bg-orange-500/5"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
                    <span className="font-bold text-white">Calories Burned</span>
                </div>
                <span className="text-lg font-black text-orange-400">{burned}</span>
            </div>

            <div className="mb-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    />
                </div>
                <div className="flex justify-between mt-1 text-[11px] text-white/40">
                    <span>0</span>
                    <span>Goal: {goal} cal</span>
                </div>
            </div>

            {activities.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-white/10">
                    {activities.slice(0, 3).map((act, i) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span className="text-white/60">{act.name}</span>
                            <span className="text-orange-400">-{act.calories} cal</span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default {
    MacroPieChart,
    WaterTracker,
    FastingTimer,
    SupplementTracker,
    CalorieBurnCard
};



