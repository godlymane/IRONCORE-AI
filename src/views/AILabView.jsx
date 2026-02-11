import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Camera, Mic, Timer, Moon, TrendingUp, Trophy, Droplets,
    ChevronRight, Sparkles, Activity, Zap
} from 'lucide-react';
import { Button, Card } from '../components/UIComponents';
import { PremiumIcon } from '../components/PremiumIcon';

// Import Icons
// Import Icons
import {
    FormCoachIconShape,
    BrainIconShape,
    SmartTimerIconShape,
    MoonIconShape,
    TrophyIconShape,
    NutritionIconShape,
    AnalyticsIconShape,
    AuraIcon
} from '../components/IronCoreIcons';

// Import all AI components
// Voice commands removed
import { FormCoach } from '../components/FormCoach';
import { SmartRestTimer } from '../components/SmartRestTimer';
import { SleepRecoveryTracker } from '../components/SleepRecoveryTracker';
import { PredictiveAnalytics } from '../components/PredictiveAnalytics';
import { CoachView } from './CoachView';
// import { useVoiceCommands } from '../hooks/useVoiceCommands'; // REMOVED
import { AchievementsGallery, ChallengeCard, StreakFlame, PowerUpCard } from '../components/Gamification';
import { generateDailyChallenge, generateWeeklyChallenge, POWER_UPS } from '../data/achievements';
import { WaterTracker, FastingTimer, SupplementTracker, MacroPieChart } from '../components/NutritionEnhancements';
import { PersonalRecordsBoard, WorkoutIntensityScore, MuscleGroupRadar } from '../components/AnalyticsDashboard';

console.log('✅ AILabView loaded successfully');

/**
 * AI Lab View - Showcase all AI features in one place
 */
export const AILabView = ({ workouts = [], meals = [], profile = {}, updateData, weight }) => {
    const [labTab, setLabTab] = useState('coach'); // 'coach' or 'vision'
    const [activeFeature, setActiveFeature] = useState(null);

    // Voice commands removed
    // const { isListening, transcript, isSupported, toggleListening, speak } = useVoiceCommands({
    //     onCommand: (cmd) => console.log('Voice command:', cmd),
    //     onLog: (msg) => console.log(msg)
    // });

    // Get challenges
    const dailyChallenge = generateDailyChallenge();
    const weeklyChallenge = generateWeeklyChallenge();

    // Helper to wrap our simplified shapes in AuraIcon
    const IconWrapper = (IconComponent, color) => (props) => (
        <AuraIcon color={color} size={props.size || 60} {...props}>
            <IconComponent />
        </AuraIcon>
    );

    const features = [
        { id: 'form', name: 'Form Coach', icon: IconWrapper(FormCoachIconShape, '#ef4444'), fallback: Camera, color: 'red', desc: 'AI pose detection' },
        // { id: 'voice', name: 'Voice Commands', icon: Mic, color: 'green', desc: 'Hands-free logging' }, // REMOVED
        { id: 'analytics', name: 'AI Insights', icon: IconWrapper(BrainIconShape, '#a855f7'), fallback: Brain, color: 'purple', desc: 'Predictive analytics' },
        { id: 'timer', name: 'Smart Rest', icon: IconWrapper(SmartTimerIconShape, '#f59e0b'), fallback: Timer, color: 'orange', desc: 'Adaptive timing' },
        { id: 'sleep', name: 'Recovery', icon: IconWrapper(MoonIconShape, '#06b6d4'), fallback: Moon, color: 'cyan', desc: 'Sleep tracking' },
        { id: 'gamify', name: 'Achievements', icon: IconWrapper(TrophyIconShape, '#eab308'), fallback: Trophy, color: 'yellow', desc: '50+ badges' },
        { id: 'nutrition', name: 'Nutrition', icon: IconWrapper(NutritionIconShape, '#22c55e'), fallback: Droplets, color: 'red', desc: 'Macro tracking' },
        { id: 'stats', name: 'Analytics', icon: IconWrapper(AnalyticsIconShape, '#ec4899'), fallback: TrendingUp, color: 'pink', desc: 'Progress graphs' },
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

            /* Voice functionality removed
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
            */

            case 'analytics':
                return <PredictiveAnalytics workouts={workouts} meals={meals} profile={profile} />;

            case 'timer':
                return (
                    <SmartRestTimer
                        exercise="Bench Press"
                        setNumber={3}
                        intensity="heavy"
                        // onComplete={() => speak('Rest complete')} // Removed speak
                        onComplete={() => console.log('Rest complete')}
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
                // Calculate daily water from meals
                const today = new Date().toISOString().split('T')[0];
                const todaysMeals = meals.filter(m => m.date === today);
                const currentWater = todaysMeals.filter(m => m.mealName === 'Water').length;

                // Supplement Logic
                const defaultSupps = [
                    { id: 'vitamin_d', name: 'Vitamin D', icon: '☀️', taken: false, time: '08:00' },
                    { id: 'omega3', name: 'Omega-3', icon: '🐟', taken: false, time: '08:00' },
                    { id: 'creatine', name: 'Creatine', icon: '💪', taken: false, time: '12:00' },
                    { id: 'protein', name: 'Protein', icon: '🥤', taken: false, time: '18:00' },
                    { id: 'magnesium', name: 'Magnesium', icon: '💊', taken: false, time: '21:00' },
                ];

                // Merge profile data with default structure to ensure all fields exist
                // We use a specific key 'dailySupplements' in profile which is an object { [date]: [items] }
                // or just simplify to 'currentSupplements' if it's a daily reset thing.
                // For a proper tracker, we want persistence per day.
                // Let's assume profile.supplementsLogs = { '2023-10-27': { vitamin_d: true } }

                const dailySuppLogs = profile.supplementsLogs?.[today] || {};

                const currentSupplements = defaultSupps.map(s => ({
                    ...s,
                    taken: !!dailySuppLogs[s.id]
                }));

                const toggleSupplement = (id) => {
                    const newValue = !dailySuppLogs[id];
                    const newLogs = { ...dailySuppLogs, [id]: newValue };

                    // Update profile with merged logs for today
                    updateData('add', 'profile', {
                        supplementsLogs: {
                            ...(profile.supplementsLogs || {}),
                            [today]: newLogs
                        }
                    });
                };

                return (
                    <div className="space-y-4">
                        <MacroPieChart
                            protein={Math.round(todaysMeals.reduce((a, m) => a + (m.protein || 0), 0))}
                            carbs={Math.round(todaysMeals.reduce((a, m) => a + (m.carbs || 0), 0))}
                            fats={Math.round(todaysMeals.reduce((a, m) => a + (m.fat || 0), 0))}
                            goals={{ protein: profile.proteinGoal || 150, carbs: profile.carbGoal || 200, fats: profile.fatGoal || 60 }}
                        />
                        <WaterTracker
                            glasses={currentWater}
                            goal={12}
                            onAdd={() => updateData('add', 'meals', { mealName: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 })}
                            onRemove={() => {
                                const lastWater = todaysMeals.filter(m => m.mealName === 'Water').pop();
                                if (lastWater) {
                                    updateData('delete', 'meals', null, lastWater.id);
                                }
                            }}
                        />
                        <SupplementTracker
                            supplements={currentSupplements}
                            onToggle={toggleSupplement}
                        />
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
        <div className="space-y-6 animate-in fade-in h-full flex flex-col overflow-x-hidden">
            {/* Header & Tab Switcher */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">AI Coach</h1>
                        <p className="text-xs text-white/50">Advanced Intelligence & Analysis</p>
                    </div>
                </div>

                {/* Segmented Tab Control */}
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                        onClick={() => setLabTab('coach')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${labTab === 'coach'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Chat Coach
                    </button>
                    <button
                        onClick={() => setLabTab('vision')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${labTab === 'vision'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Vision Lab
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {labTab === 'coach' ? (
                    <motion.div
                        key="coach"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex-grow"
                    >
                        <CoachView weight={weight} meals={meals} workouts={workouts} profile={profile} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="vision"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 pb-4"
                    >
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
                                    ← Back to Tools
                                </Button>

                                {renderFeatureContent()}
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {features.map((feature, i) => (
                                    <motion.button
                                        key={feature.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setActiveFeature(feature.id)}
                                        className={`p-4 rounded-2xl border bg-gradient-to-br ${colorMap[feature.color]} text-left transition-all relative overflow-hidden group`}
                                    >
                                        <div className="mb-4">
                                            <PremiumIcon
                                                src={feature.icon}
                                                alt={feature.name}
                                                size="lg"
                                                fallback={feature.fallback}
                                                className="shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                                            />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="font-bold text-white text-lg">{feature.name}</p>
                                            <p className="text-xs text-white/60">{feature.desc}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/20 absolute top-4 right-4" />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AILabView;



