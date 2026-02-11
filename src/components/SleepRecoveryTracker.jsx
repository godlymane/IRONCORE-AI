import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from './UIComponents';
import { PremiumIcon } from './PremiumIcon';
import { MoonIconShape, SunIcon, ProteinBoltIcon, SmartTimerIconShape, BatteryIcon } from './IronCoreIcons';

/**
 * Sleep & Recovery Tracking Component
 * Tracks sleep quality and recovery metrics affecting workout recommendations
 */
export const SleepRecoveryTracker = ({ profile = {}, onUpdate }) => {
    const [sleepData, setSleepData] = useState({
        hours: profile.sleepHours || 7,
        quality: profile.sleepQuality || 'good', // 'poor', 'fair', 'good', 'excellent'
        bedtime: profile.bedtime || '23:00',
        wakeTime: profile.wakeTime || '07:00',
    });

    const [recoveryScore, setRecoveryScore] = useState(0);
    const [recommendations, setRecommendations] = useState([]);

    // Calculate recovery score based on sleep data
    useEffect(() => {
        let score = 50; // Base score

        // Hours adjustment (7-9 hours optimal)
        if (sleepData.hours >= 7 && sleepData.hours <= 9) {
            score += 25;
        } else if (sleepData.hours >= 6) {
            score += 15;
        } else if (sleepData.hours < 5) {
            score -= 20;
        }

        // Quality adjustment
        const qualityScores = { excellent: 25, good: 15, fair: 5, poor: -15 };
        score += qualityScores[sleepData.quality] || 0;

        // Consistency bonus (sleeping at same time)
        const bedHour = parseInt(sleepData.bedtime.split(':')[0]);
        if (bedHour >= 22 && bedHour <= 23) {
            score += 10; // Consistent healthy bedtime
        }

        setRecoveryScore(Math.max(0, Math.min(100, score)));

        // Generate recommendations
        const recs = [];
        if (sleepData.hours < 7) {
            recs.push({ icon: MoonIconShape, text: 'Aim for 7-9 hours of sleep', priority: 'high' });
        }
        if (sleepData.quality === 'poor' || sleepData.quality === 'fair') {
            recs.push({ icon: ProteinBoltIcon, text: 'Reduce caffeine after 2pm', priority: 'medium' });
            recs.push({ icon: SunIcon, text: 'Get morning sunlight exposure', priority: 'medium' });
        }
        if (parseInt(sleepData.bedtime.split(':')[0]) >= 24 || parseInt(sleepData.bedtime.split(':')[0]) < 22) {
            recs.push({ icon: SmartTimerIconShape, text: 'Try to sleep by 11pm', priority: 'high' });
        }
        if (score < 60) {
            recs.push({ icon: BatteryIcon, text: 'Consider a rest day or light workout', priority: 'high' });
        }

        setRecommendations(recs.slice(0, 3));
    }, [sleepData]);

    const handleSave = () => {
        onUpdate?.({
            sleepHours: sleepData.hours,
            sleepQuality: sleepData.quality,
            bedtime: sleepData.bedtime,
            wakeTime: sleepData.wakeTime,
            recoveryScore,
        });
    };

    const getScoreColor = () => {
        if (recoveryScore >= 80) return 'text-green-400';
        if (recoveryScore >= 60) return 'text-yellow-400';
        if (recoveryScore >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreLabel = () => {
        if (recoveryScore >= 80) return 'Fully Recovered';
        if (recoveryScore >= 60) return 'Ready to Train';
        if (recoveryScore >= 40) return 'Moderate Recovery';
        return 'Rest Recommended';
    };

    const qualityOptions = [
        { value: 'poor', label: '😴 Poor', color: 'bg-red-500/20 border-red-500/30' },
        { value: 'fair', label: '😐 Fair', color: 'bg-yellow-500/20 border-yellow-500/30' },
        { value: 'good', label: '😊 Good', color: 'bg-green-500/20 border-green-500/30' },
        { value: 'excellent', label: '🌟 Excellent', color: 'bg-red-500/20 border-red-500/30' },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PremiumIcon src={MoonIconShape} size="sm" className="!w-8 !h-8" fallback={null} />
                    <h3 className="text-lg font-bold text-white">Sleep & Recovery</h3>
                </div>
                <div className={`text-2xl font-black ${getScoreColor()}`}>
                    {recoveryScore}%
                </div>
            </div>

            {/* Recovery Score Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                style={{
                    background: `linear-gradient(135deg, ${recoveryScore >= 60 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'} 0%, transparent 100%)`,
                }}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/70">Recovery Status</span>
                    <div className={`flex items-center gap-1 text-sm ${getScoreColor()}`}>
                        {recoveryScore >= 60 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {getScoreLabel()}
                    </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${recoveryScore}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${recoveryScore >= 60 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-orange-400'}`}
                    />
                </div>
            </motion.div>

            {/* Sleep Hours Slider */}
            <div className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-white/70">Hours Slept</label>
                    <span className="text-lg font-bold text-white">{sleepData.hours}h</span>
                </div>
                <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={sleepData.hours}
                    onChange={(e) => setSleepData(prev => ({ ...prev, hours: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/50"
                />
                <div className="flex justify-between text-[11px] text-white/30 mt-1">
                    <span>3h</span>
                    <span className="text-green-400">7-9h optimal</span>
                    <span>12h</span>
                </div>
            </div>

            {/* Sleep Quality */}
            <div className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/[0.02]">
                <label className="text-sm font-medium text-white/70 block mb-3">Sleep Quality</label>
                <div className="grid grid-cols-4 gap-2">
                    {qualityOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setSleepData(prev => ({ ...prev, quality: opt.value }))}
                            className={`p-2 rounded-xl text-center text-xs font-medium border transition-all ${sleepData.quality === opt.value
                                ? opt.color + ' text-white'
                                : 'bg-white/5 border-white/10 text-white/50'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl backdrop-blur-xl border border-white/10 bg-white/[0.02]">
                    <label className="text-[11px] uppercase text-white/40 block mb-1">Bedtime</label>
                    <input
                        type="time"
                        value={sleepData.bedtime}
                        onChange={(e) => setSleepData(prev => ({ ...prev, bedtime: e.target.value }))}
                        className="w-full bg-transparent text-white text-lg font-bold outline-none"
                    />
                </div>
                <div className="p-3 rounded-xl backdrop-blur-xl border border-white/10 bg-white/[0.02]">
                    <label className="text-[11px] uppercase text-white/40 block mb-1">Wake Time</label>
                    <input
                        type="time"
                        value={sleepData.wakeTime}
                        onChange={(e) => setSleepData(prev => ({ ...prev, wakeTime: e.target.value }))}
                        className="w-full bg-transparent text-white text-lg font-bold outline-none"
                    />
                </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Recommendations</p>
                    {recommendations.map((rec, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${rec.priority === 'high' ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'
                                }`}
                        >
                            <rec.icon className={`w-4 h-4 ${rec.priority === 'high' ? 'text-red-400' : 'text-red-400'}`} />
                            <span className="text-sm text-white/70">{rec.text}</span>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Save Button */}
            <Button onClick={handleSave} variant="primary" className="w-full">
                Save Sleep Data
            </Button>
        </div>
    );
};

export default SleepRecoveryTracker;



