import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Camera, Mic, Timer, Moon, TrendingUp, Trophy, Droplets,
    ChevronRight, Sparkles, Activity, Zap
} from 'lucide-react';
import { Button, Card } from '../components/UIComponents';

// Import all AI components
import { FormCoach } from '../components/FormCoach';
import { SmartRestTimer } from '../components/SmartRestTimer';
import { SleepRecoveryTracker } from '../components/SleepRecoveryTracker';
import { PredictiveAnalytics } from '../components/PredictiveAnalytics';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { AchievementsGallery, ChallengeCard, StreakFlame, PowerUpCard } from '../components/Gamification';
import { generateDailyChallenge, generateWeeklyChallenge, POWER_UPS } from '../data/achievements';
import { WaterTracker, FastingTimer, SupplementTracker, MacroPieChart } from '../components/NutritionEnhancements';
import { PersonalRecordsBoard, WorkoutIntensityScore, MuscleGroupRadar } from '../components/AnalyticsDashboard';

console.log('✅ AILabView loaded successfully');

/**
 * AI Lab View - Showcase all AI features in one place
 */
export const AILabView = ({ workouts = [], meals = [], profile = {}, updateData }) => {
    const [activeFeature, setActiveFeature] = useState(null);
    const [waterGlasses, setWaterGlasses] = useState(profile.waterGlasses || 0);

    // Voice commands
    const { isListening, transcript, isSupported, toggleListening, speak } = useVoiceCommands({
        onCommand: (cmd) => console.log('Voice command:', cmd),
        onLog: (msg) => console.log(msg)
    });

    // Get challenges
    const dailyChallenge = generateDailyChallenge();
    const weeklyChallenge = generateWeeklyChallenge();

    const features = [
        { id: 'form', name: 'Form Coach', icon: Camera, color: 'red', desc: 'AI pose detection' },
        { id: 'voice', name: 'Voice Commands', icon: Mic, color: 'green', desc: 'Hands-free logging' },
        { id: 'analytics', name: 'AI Insights', icon: Brain, color: 'purple', desc: 'Predictive analytics' },
        { id: 'timer', name: 'Smart Rest', icon: Timer, color: 'orange', desc: 'Adaptive timing' },
        { id: 'sleep', name: 'Recovery', icon: Moon, color: 'cyan', desc: 'Sleep tracking' },
        { id: 'gamify', name: 'Achievements', icon: Trophy, color: 'yellow', desc: '50+ badges' },
        { id: 'nutrition', name: 'Nutrition', icon: Droplets, color: 'red', desc: 'Macro tracking' },
        { id: 'stats', name: 'Analytics', icon: TrendingUp, color: 'pink', desc: 'Progress graphs' },
    ];

    const colorMap = {
        red: 'from-red-500/20 to-red-600/10 border-red-500/30',
        green: 'from-green-500/20 to-green-600/10 border-green-500/30',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
        orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
        cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
        yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
        blue: 'from-red-500/20 to-red-600/10 border-red-500/30',
        pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    };

    const renderFeatureContent = () => {
        switch (activeFeature) {
            case 'form':
                return <FormCoach exercise="squat" onComplete={() => setActiveFeature(null)} />;

            case 'voice':
                return (
                    <div className="space-y-4">
                        <div className="text-center p-6">
                            <motion.button
                                onClick={toggleListening}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${isListening ? 'bg-red-500 animate-pulse' : 'bg-red-500'
                                    }`}
                            >
                                <Mic className="w-10 h-10 text-white" />
                            </motion.button>
                            <p className="mt-4 text-white font-bold">
                                {isListening ? 'Listening...' : 'Tap to speak'}
                            </p>
                            {transcript && (
                                <p className="mt-2 text-red-400 text-sm">"{transcript}"</p>
                            )}
                            <p className="mt-4 text-xs text-white/50">
                                Try: "Hey IronCore, log 10 reps" or "start timer"
                            </p>
                        </div>
                    </div>
                );

            case 'analytics':
                return <PredictiveAnalytics workouts={workouts} meals={meals} profile={profile} />;

            case 'timer':
                return (
                    <SmartRestTimer
                        exercise="Bench Press"
                        setNumber={3}
                        intensity="heavy"
                        onComplete={() => speak('Rest complete')}
                        onSkip={() => setActiveFeature(null)}
                    />
                );

            case 'sleep':
                return (
                    <SleepRecoveryTracker
                        profile={profile}
                        onUpdate={(data) => updateData?.('add', 'profile', data)}
                    />
                );

            case 'gamify':
                return (
                    <div className="space-y-4">
                        <StreakFlame streak={profile.streak || 7} />
                        <ChallengeCard challenge={dailyChallenge} progress={45} variant="daily" />
                        <ChallengeCard challenge={weeklyChallenge} progress={70} variant="weekly" />
                        <AchievementsGallery unlockedIds={profile.achievements || []} />
                    </div>
                );

            case 'nutrition':
                return (
                    <div className="space-y-4">
                        <MacroPieChart
                            protein={meals.reduce((a, m) => a + (m.protein || 0), 0)}
                            carbs={meals.reduce((a, m) => a + (m.carbs || 0), 0)}
                            fats={meals.reduce((a, m) => a + (m.fat || 0), 0)}
                            goals={{ protein: profile.proteinGoal || 150, carbs: profile.carbGoal || 200, fats: profile.fatGoal || 60 }}
                        />
                        <WaterTracker
                            glasses={waterGlasses}
                            goal={8}
                            onAdd={() => setWaterGlasses(prev => Math.min(prev + 1, 12))}
                            onRemove={() => setWaterGlasses(prev => Math.max(prev - 1, 0))}
                        />
                        <SupplementTracker />
                        <FastingTimer fastingHours={16} eatingHours={8} />
                    </div>
                );

            case 'stats':
                return (
                    <div className="space-y-4">
                        <PersonalRecordsBoard />
                        <WorkoutIntensityScore workouts={workouts} />
                        <MuscleGroupRadar />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600">
                    <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">AI Lab</h1>
                    <p className="text-xs text-white/50">Advanced AI-powered features</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeFeature ? (
                    <motion.div
                        key="feature"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {/* Back button */}
                        <Button
                            onClick={() => setActiveFeature(null)}
                            variant="secondary"
                            className="mb-4"
                        >
                            ← Back to AI Lab
                        </Button>

                        {renderFeatureContent()}
                    </motion.div>
                ) : (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        {features.map((feature, i) => (
                            <motion.button
                                key={feature.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveFeature(feature.id)}
                                className={`p-4 rounded-2xl border bg-gradient-to-br ${colorMap[feature.color]} text-left transition-all`}
                            >
                                <feature.icon className={`w-8 h-8 text-${feature.color}-400 mb-2`} />
                                <p className="font-bold text-white">{feature.name}</p>
                                <p className="text-xs text-white/50">{feature.desc}</p>
                                <ChevronRight className="w-4 h-4 text-white/30 absolute top-4 right-4" />
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AILabView;



