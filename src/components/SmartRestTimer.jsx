import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Zap, Heart, TrendingUp } from 'lucide-react';
import { Button } from './UIComponents';

/**
 * Smart Rest Timer with Adaptive Calculations
 * Adjusts rest periods based on exercise intensity, fatigue, and heart rate
 */
export const SmartRestTimer = ({
    exercise = 'Bench Press',
    setNumber = 1,
    intensity = 'moderate', // 'light', 'moderate', 'heavy', 'max'
    previousRestDurations = [],
    heartRate = null, // If available from wearable
    onComplete,
    onSkip
}) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [recommendedTime, setRecommendedTime] = useState(0);
    const [adjustmentReason, setAdjustmentReason] = useState('');

    // Rest time recommendations by intensity
    const baseRestTimes = {
        light: 30,      // Warm-up, isolation
        moderate: 60,   // Hypertrophy, moderate weight
        heavy: 120,     // Strength training
        max: 180,       // Max effort, powerlifting
    };

    // Calculate adaptive rest time
    const calculateRestTime = useCallback(() => {
        let baseTime = baseRestTimes[intensity] || 60;
        let adjustments = [];

        // Adjust based on set number (fatigue accumulation)
        if (setNumber >= 4) {
            baseTime += 15;
            adjustments.push('+15s fatigue');
        } else if (setNumber >= 3) {
            baseTime += 10;
            adjustments.push('+10s fatigue');
        }

        // Adjust based on exercise type (compound vs isolation)
        const compoundExercises = ['squat', 'deadlift', 'bench', 'press', 'row', 'pull'];
        const isCompound = compoundExercises.some(ex =>
            exercise.toLowerCase().includes(ex)
        );

        if (isCompound && intensity === 'heavy') {
            baseTime += 30;
            adjustments.push('+30s compound');
        }

        // Adjust based on heart rate if available
        if (heartRate) {
            if (heartRate > 160) {
                baseTime += 30;
                adjustments.push('+30s high HR');
            } else if (heartRate > 140) {
                baseTime += 15;
                adjustments.push('+15s elevated HR');
            } else if (heartRate < 100) {
                baseTime -= 15;
                adjustments.push('-15s recovered');
            }
        }

        // Adjust based on previous rest patterns
        if (previousRestDurations.length >= 2) {
            const avgPrevious = previousRestDurations.reduce((a, b) => a + b, 0) / previousRestDurations.length;
            if (avgPrevious > baseTime * 1.3) {
                baseTime += 10;
                adjustments.push('+10s pattern');
            }
        }

        setAdjustmentReason(adjustments.join(', ') || 'Standard rest');
        return Math.max(15, Math.min(300, baseTime)); // Clamp between 15s and 5min
    }, [exercise, intensity, setNumber, heartRate, previousRestDurations]);

    // Initialize timer
    useEffect(() => {
        const time = calculateRestTime();
        setRecommendedTime(time);
        setTimeLeft(time);
    }, [calculateRestTime]);

    // Timer countdown
    useEffect(() => {
        let interval;

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        // Vibrate when complete
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                        onComplete?.(recommendedTime - prev);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft, recommendedTime, onComplete]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = recommendedTime > 0 ? ((recommendedTime - timeLeft) / recommendedTime) * 100 : 0;

    const getIntensityColor = () => {
        switch (intensity) {
            case 'light': return 'text-green-400';
            case 'moderate': return 'text-yellow-400';
            case 'heavy': return 'text-orange-400';
            case 'max': return 'text-red-400';
            default: return 'text-red-400';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-3xl backdrop-blur-xl border border-white/10"
            style={{
                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-white">Smart Rest</span>
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${getIntensityColor()}`}>
                    <Zap className="w-3 h-3" />
                    {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </div>
            </div>

            {/* Timer Display */}
            <div className="relative mb-4">
                {/* Progress Ring */}
                <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                            className="transition-all duration-500"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#dc2626" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Time display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-black ${timeLeft <= 5 && timeLeft > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </span>
                        <span className="text-xs text-white/40">
                            of {formatTime(recommendedTime)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Adjustment Info */}
            <div className="text-center mb-4">
                <p className="text-[10px] text-white/40 uppercase tracking-wider flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {adjustmentReason}
                </p>
                {heartRate && (
                    <p className="text-xs text-red-400 flex items-center justify-center gap-1 mt-1">
                        <Heart className="w-3 h-3" />
                        {heartRate} BPM
                    </p>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
                <Button
                    onClick={() => {
                        setTimeLeft(recommendedTime);
                        setIsRunning(false);
                    }}
                    variant="secondary"
                    className="flex-1 !py-3"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>

                <Button
                    onClick={() => setIsRunning(!isRunning)}
                    variant="primary"
                    className="flex-[2] !py-3"
                >
                    {isRunning ? (
                        <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            {timeLeft === recommendedTime ? 'Start' : 'Resume'}
                        </>
                    )}
                </Button>

                <Button
                    onClick={() => onSkip?.()}
                    variant="secondary"
                    className="flex-1 !py-3"
                >
                    Skip
                </Button>
            </div>

            {/* Set Info */}
            <p className="text-center text-xs text-white/30 mt-3">
                {exercise} • Set {setNumber}
            </p>
        </motion.div>
    );
};

export default SmartRestTimer;



