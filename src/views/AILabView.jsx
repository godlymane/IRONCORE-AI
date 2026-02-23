import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Camera, Mic, Timer, Moon, TrendingUp, Trophy, Droplets,
    ChevronRight, Sparkles, Activity, Zap, ShieldCheck, EyeOff, Settings
} from 'lucide-react';
import { Button, Card } from '../components/UIComponents';
import { PremiumIcon } from '../components/PremiumIcon';
import { usePremium } from '../context/PremiumContext';
import { Lock } from 'lucide-react';
import { useStore } from '../hooks/useStore';

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

// FormCoach lazy-loaded — TensorFlow.js (~1.5MB) only fetches when user taps Form Coach
const FormCoach = React.lazy(() => import('../components/FormCoach').then(m => ({ default: m.FormCoach })));
import { SmartRestTimer } from '../components/SmartRestTimer';
import { SleepRecoveryTracker } from '../components/SleepRecoveryTracker';
import { PredictiveAnalytics } from '../components/PredictiveAnalytics';
import { CoachView } from './CoachView';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { AchievementsGallery, ChallengeCard, StreakFlame, PowerUpCard } from '../components/Gamification';
import { generateDailyChallenge, generateWeeklyChallenge, POWER_UPS } from '../data/achievements';
import { WaterTracker, FastingTimer, SupplementTracker, MacroPieChart } from '../components/NutritionEnhancements';
import { PersonalRecordsBoard, WorkoutIntensityScore, MuscleGroupRadar, ExportReportButton } from '../components/AnalyticsDashboard';
import { exportPDFReport } from '../utils/exportUtils';

// Camera Permission Priming Screen — reduces denial rate from ~40% to ~15%
const CameraPermissionPriming = ({ onGranted, onSkip }) => {
    const [checking, setChecking] = useState(false);
    const [denied, setDenied] = useState(false);

    const requestCamera = async () => {
        setChecking(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            // Got permission — stop the test stream immediately
            stream.getTracks().forEach(t => t.stop());
            onGranted();
        } catch {
            setDenied(true);
            setChecking(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center px-6 py-10 space-y-6"
        >
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center">
                <Camera className="w-10 h-10 text-red-400" />
            </div>

            {/* Title & Body */}
            <div className="space-y-3">
                <h2 className="text-xl font-black text-white">THE AI NEEDS TO SEE YOU TRAIN</h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                    IronCore uses your phone camera to watch your form and correct it in real-time.
                </p>
            </div>

            {/* Privacy assurances */}
            <div className="space-y-2 w-full max-w-xs">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <EyeOff size={16} className="text-green-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">No video is recorded</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <ShieldCheck size={16} className="text-green-400 flex-shrink-0" />
                    <span className="text-xs text-gray-300">No data leaves your phone</span>
                </div>
            </div>

            {denied ? (
                <div className="space-y-3 w-full max-w-xs">
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <p className="text-xs text-red-400 font-medium">Camera access needed for form correction. Enable in Settings.</p>
                    </div>
                    <Button onClick={onSkip} variant="secondary" className="w-full">
                        <Settings size={14} className="mr-2" /> Open Settings
                    </Button>
                </div>
            ) : (
                <div className="space-y-3 w-full max-w-xs">
                    <Button onClick={requestCamera} variant="primary" className="w-full" disabled={checking}>
                        {checking ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                            <Camera size={14} className="mr-2" />
                        )}
                        {checking ? 'Requesting...' : 'ENABLE CAMERA'}
                    </Button>
                    <button onClick={onSkip} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                        Skip for now — you can enable camera later in Settings
                    </button>
                </div>
            )}
        </motion.div>
    );
};

// AILabView module

/**
 * AI Lab View - Showcase all AI features in one place
 */
export const AILabView = () => {
    const { workouts = [], meals = [], profile = {}, updateData, progress = [] } = useStore();
    const weight = profile.weight || progress.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).find(p => p.weight)?.weight;
    const [labTab, setLabTab] = useState('coach'); // 'coach' or 'vision'
    const [activeFeature, setActiveFeature] = useState(null);
    const [cameraPermGranted, setCameraPermGranted] = useState(false);
    const { isPremium, requirePremium } = usePremium();

    // Check if camera permission was already granted (skip priming for returning users)
    React.useEffect(() => {
        navigator.permissions?.query({ name: 'camera' }).then(result => {
            if (result.state === 'granted') setCameraPermGranted(true);
        }).catch(() => { }); // Permissions API not supported — show priming screen
    }, []);

    // Premium-gated features — free users get paywall
    const PREMIUM_FEATURES = new Set(['form', 'analytics', 'stats']);

    const handleVoiceCommand = (cmd) => {
        switch (cmd.action) {
            case 'water':
                updateData?.('add', 'meals', { mealName: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 });
                break;
            case 'start':
                if (cmd.params[0] === 'timer' || cmd.params[0] === 'rest') setActiveFeature('timer');
                break;
            case 'go':
            case 'show':
            case 'open': {
                const target = cmd.params[0]?.toLowerCase();
                if (target?.includes('timer') || target?.includes('rest')) setActiveFeature('timer');
                else if (target?.includes('form') || target?.includes('coach')) setActiveFeature('form');
                else if (target?.includes('sleep') || target?.includes('recovery')) setActiveFeature('sleep');
                else if (target?.includes('nutrition') || target?.includes('food')) setActiveFeature('nutrition');
                else if (target?.includes('stats') || target?.includes('analytics')) setActiveFeature('stats');
                break;
            }
            case 'weight': {
                const w = parseFloat(cmd.params[0]);
                if (w > 0) updateData?.('add', 'progress', { weight: w });
                break;
            }
            default:
                break;
        }
    };

    const { voiceState, transcript, isSupported, manualActivate, speak, VOICE_STATE } = useVoiceCommands({
        onCommand: handleVoiceCommand,
        onLog: () => { }
    });
    const isListening = voiceState === VOICE_STATE.ACTIVE || voiceState === VOICE_STATE.LISTENING;
    const toggleListening = manualActivate;

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
        { id: 'form', name: 'Form Coach', icon: IconWrapper(FormCoachIconShape, '#ef4444'), fallback: Camera, color: 'red', desc: 'AI pose detection', premium: true },
        { id: 'voice', name: 'Voice', icon: Mic, fallback: Mic, color: 'green', desc: 'Hands-free logging', premium: false },
        { id: 'analytics', name: 'Predictions', icon: IconWrapper(BrainIconShape, '#a855f7'), fallback: Brain, color: 'purple', desc: 'Predictive analytics', premium: true },
        { id: 'timer', name: 'Smart Rest', icon: IconWrapper(SmartTimerIconShape, '#f59e0b'), fallback: Timer, color: 'orange', desc: 'Adaptive timing', premium: false },
        { id: 'sleep', name: 'Recovery', icon: IconWrapper(MoonIconShape, '#06b6d4'), fallback: Moon, color: 'cyan', desc: 'Sleep tracking', premium: false },
        { id: 'gamify', name: 'Achievements', icon: IconWrapper(TrophyIconShape, '#eab308'), fallback: Trophy, color: 'yellow', desc: '50+ badges', premium: false },
        { id: 'nutrition', name: 'Nutrition', icon: IconWrapper(NutritionIconShape, '#22c55e'), fallback: Droplets, color: 'red', desc: 'Macro tracking', premium: false },
        { id: 'stats', name: 'Analytics', icon: IconWrapper(AnalyticsIconShape, '#ec4899'), fallback: TrendingUp, color: 'pink', desc: 'Progress graphs', premium: true },
    ];

    // Handle feature selection with premium gating
    const handleFeatureSelect = (feature) => {
        if (feature.premium && !isPremium) {
            const featureKey = feature.id === 'form' ? 'aiCoachCalls' :
                feature.id === 'stats' ? 'unlimitedHistory' : 'aiCoachCalls';
            requirePremium(featureKey);
            return;
        }
        setActiveFeature(feature.id);
    };

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
                if (!cameraPermGranted) {
                    return (
                        <CameraPermissionPriming
                            onGranted={() => setCameraPermGranted(true)}
                            onSkip={() => setActiveFeature(null)}
                        />
                    );
                }
                return (
                    <React.Suspense fallback={
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Loading AI Vision...</p>
                        </div>
                    }>
                        <FormCoach exercise="squat" onComplete={() => setActiveFeature(null)} />
                    </React.Suspense>
                );

            case 'voice':
                return (
                    <div className="space-y-4">
                        <div className="text-center p-6">
                            {!isSupported ? (
                                <p className="text-red-400 text-sm">Voice recognition is not supported in this browser.</p>
                            ) : (
                                <>
                                    <motion.button
                                        onClick={toggleListening}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${isListening ? 'bg-red-500 animate-pulse' : 'bg-red-500/80'}`}
                                    >
                                        <Mic className="w-10 h-10 text-white" />
                                    </motion.button>
                                    <p className="mt-4 text-white font-bold">
                                        {isListening ? 'Listening...' : 'Tap to speak'}
                                    </p>
                                    {transcript && (
                                        <p className="mt-2 text-red-400 text-sm">"{transcript}"</p>
                                    )}
                                    <div className="mt-6 text-left space-y-1 max-w-xs mx-auto">
                                        <p className="text-xs text-white/40 uppercase font-bold mb-2">Commands</p>
                                        {['log water / add water', 'log weight 75.5', 'start timer', 'open form coach', 'show nutrition'].map(c => (
                                            <p key={c} className="text-xs text-white/60 font-mono bg-white/5 px-3 py-1.5 rounded-lg">"{c}"</p>
                                        ))}
                                    </div>
                                </>
                            )}
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
                        <ExportReportButton onExport={() => exportPDFReport({ workouts, meals, profile })} />
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
                        <CoachView />
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
                                        onClick={() => handleFeatureSelect(feature)}
                                        className={`p-4 rounded-2xl border bg-gradient-to-br ${colorMap[feature.color]} text-left transition-all relative overflow-hidden group`}
                                    >
                                        {/* Premium lock badge */}
                                        {feature.premium && !isPremium && (
                                            <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                                                <Lock size={12} className="text-yellow-400" />
                                            </div>
                                        )}
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
                                            <p className="text-xs text-white/60">
                                                {feature.premium && !isPremium ? 'PRO' : feature.desc}
                                            </p>
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



