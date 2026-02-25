import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, Target, Activity, Dumbbell, Flame, CheckCircle2,
    ChevronLeft, Scale, Zap, Shield, Trophy, Fingerprint, User, Sparkles, Check,
    Camera, BarChart3
} from 'lucide-react';
import { Button } from '../components/UIComponents';
import { SFX } from '../utils/audio';

// Glass Input Component - Defined OUTSIDE parent to prevent focus loss on re-render
const GlassInput = ({ label, value, onChange, placeholder, type = 'number', highlight = false, unit }) => (
    <div
        className="p-4 rounded-2xl transition-all"
        style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: highlight ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
        }}
    >
        <label className={`text-[11px] uppercase font-bold block mb-1 ${highlight ? 'text-orange-400' : 'text-gray-500'}`}>{label}</label>
        <div className="flex items-baseline gap-1">
            <input
                type={type}
                inputMode="decimal"
                enterKeyHint="done"
                value={value}
                onChange={onChange}
                className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-700"
                placeholder={placeholder}
            />
            {unit && <span className="text-[11px] text-gray-500 flex-shrink-0">{unit}</span>}
        </div>
    </div>
);

// Activity level options with multipliers
const ACTIVITY_LEVELS = [
    { value: 1.2, label: 'Sedentary', desc: 'Desk job, no exercise', icon: '\uD83D\uDECB\uFE0F' },
    { value: 1.375, label: 'Light', desc: '1-2 days/week', icon: '\uD83D\uDEB6' },
    { value: 1.55, label: 'Moderate', desc: '3-5 days/week', icon: '\uD83C\uDFC3' },
    { value: 1.725, label: 'Active', desc: '6-7 days/week', icon: '\uD83D\uDCAA' },
    { value: 1.9, label: 'Athlete', desc: 'Intense daily training', icon: '\uD83D\uDD25' },
];

// Intensity configs for calorie adjustment
const INTENSITY_CONFIGS = {
    conservative: { lose: -300, gain: 200, label: 'Steady', desc: 'Slow & sustainable' },
    moderate: { lose: -500, gain: 350, label: 'Optimized', desc: 'Balanced approach' },
    aggressive: { lose: -750, gain: 500, label: 'Extreme', desc: 'Maximum effort' },
};

// Progress dot step groups
const STEP_GROUPS = [
    ['welcome'],
    ['goal'],
    ['aidemo'],
    ['bio', 'activity', 'intensity', 'analysis'],
    ['upsell'],
];

// Pose detection stick figure SVG for AI demo screen
const PoseDetectionMockup = () => (
    <div className="relative w-56 h-80 mx-auto">
        {/* Phone frame */}
        <div
            className="absolute inset-0 rounded-[2rem] overflow-hidden"
            style={{
                border: '3px solid rgba(255, 255, 255, 0.15)',
                background: 'linear-gradient(180deg, rgba(15, 15, 15, 0.95) 0%, rgba(5, 5, 5, 0.98) 100%)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
        >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 rounded-b-xl" style={{ background: 'rgba(0, 0, 0, 0.9)' }} />

            {/* Stick figure with pulsing joints */}
            <svg viewBox="0 0 200 300" className="w-full h-full p-6 pt-8">
                {/* Body lines - with pulse animation */}
                <line x1="100" y1="60" x2="100" y2="160" className="pose-line" />
                {/* Shoulders */}
                <line x1="60" y1="100" x2="140" y2="100" className="pose-line" />
                {/* Left arm */}
                <line x1="60" y1="100" x2="35" y2="150" className="pose-line" />
                <line x1="35" y1="150" x2="50" y2="190" className="pose-line" />
                {/* Right arm */}
                <line x1="140" y1="100" x2="165" y2="140" className="pose-line" />
                <line x1="165" y1="140" x2="155" y2="185" className="pose-line" />
                {/* Left leg */}
                <line x1="100" y1="160" x2="70" y2="220" className="pose-line" />
                <line x1="70" y1="220" x2="65" y2="270" className="pose-line" />
                {/* Right leg */}
                <line x1="100" y1="160" x2="130" y2="220" className="pose-line" />
                <line x1="130" y1="220" x2="135" y2="270" className="pose-line" />

                {/* Joint dots */}
                {[
                    [100, 45],  // head
                    [100, 60],  // neck
                    [60, 100],  // left shoulder
                    [140, 100], // right shoulder
                    [35, 150],  // left elbow
                    [165, 140], // right elbow
                    [50, 190],  // left wrist
                    [155, 185], // right wrist
                    [100, 160], // hip center
                    [70, 220],  // left knee
                    [130, 220], // right knee
                    [65, 270],  // left ankle
                    [135, 270], // right ankle
                ].map(([cx, cy], i) => (
                    <g key={i}>
                        <circle cx={cx} cy={cy} r="8" fill="rgba(220, 38, 38, 0.3)" className="pose-glow" style={{ animationDelay: `${i * 0.15}s` }} />
                        <circle cx={cx} cy={cy} r="4" fill="#dc2626" className="pose-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                    </g>
                ))}

                {/* Head circle */}
                <circle cx="100" cy="45" r="18" fill="none" stroke="rgba(220, 38, 38, 0.6)" strokeWidth="2" className="pose-head" />

                {/* Form score overlay */}
                <rect x="120" y="25" width="65" height="24" rx="6" fill="rgba(220, 38, 38, 0.2)" stroke="rgba(220, 38, 38, 0.5)" strokeWidth="1" />
                <text x="152" y="42" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="var(--font-mono)">98/100</text>
            </svg>
        </div>

        {/* Ambient glow behind phone */}
        <div
            className="absolute inset-0 -z-10 rounded-[2rem] blur-2xl opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(220, 38, 38, 0.5) 0%, transparent 70%)' }}
        />
    </div>
);

export const OnboardingView = ({ onComplete, user }) => {
    const [step, setStep] = useState('welcome');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [data, setData] = useState({
        goal: 'maintain',
        activityLevel: 1.55,
        gender: 'male',
        weight: '',
        height: '',
        age: '',
        bodyFat: '',
        targetWeight: '',
        intensity: 'moderate',
    });

    // --- BMR / TDEE / Macro Calculation (Mifflin-St Jeor) ---
    const calculated = useMemo(() => {
        const w = parseFloat(data.weight) || 70;
        const h = parseFloat(data.height) || 170;
        const a = parseFloat(data.age) || 25;
        const activity = parseFloat(data.activityLevel) || 1.55;

        let bmr;
        if (data.gender === 'male') {
            bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        } else {
            bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
        }

        const tdee = Math.round(bmr * activity);

        // Target calories based on goal + intensity
        let targetCalories = tdee;
        if (data.goal !== 'maintain') {
            const adjustment = INTENSITY_CONFIGS[data.intensity]?.[data.goal] || 0;
            targetCalories = Math.max(1200, tdee + adjustment);
        }

        // Macros based on goal
        let proteinMultiplier, fatPercent;
        switch (data.goal) {
            case 'lose': proteinMultiplier = 2.2; fatPercent = 0.25; break;
            case 'gain': proteinMultiplier = 2.0; fatPercent = 0.25; break;
            default: proteinMultiplier = 1.8; fatPercent = 0.30;
        }

        const protein = Math.round(w * proteinMultiplier);
        const fat = Math.round((targetCalories * fatPercent) / 9);
        const carbCals = targetCalories - (protein * 4) - (fat * 9);
        const carbs = Math.round(Math.max(0, carbCals) / 4);

        return { bmr: Math.round(bmr), tdee, targetCalories, protein, carbs, fat };
    }, [data.weight, data.height, data.age, data.gender, data.activityLevel, data.goal, data.intensity]);

    useEffect(() => {
        if (step === 'analysis') {
            setLoadingProgress(0);
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStep('upsell'), 500);
                        return 100;
                    }
                    return prev + Math.floor(Math.random() * 15);
                });
            }, 300);
            return () => clearInterval(interval);
        }
    }, [step]);

    const playClick = () => SFX?.click?.();
    const playSuccess = () => SFX?.levelUp?.();

    const select = (field, value) => {
        playClick();
        setData(prev => ({ ...prev, [field]: value }));
    };

    const nextStep = (next) => {
        playClick();
        setStep(next);
    };

    // Build the final data payload with all calculated values
    const handleComplete = (opts = {}) => {
        playSuccess();
        onComplete({
            ...data,
            weight: parseFloat(data.weight) || null,
            height: parseFloat(data.height) || null,
            age: parseInt(data.age) || null,
            bodyFat: parseFloat(data.bodyFat) || null,
            targetWeight: parseFloat(data.targetWeight) || null,
            dailyCalories: calculated.targetCalories,
            dailyProtein: calculated.protein,
            dailyCarbs: calculated.carbs,
            dailyFat: calculated.fat,
            tdee: calculated.tdee,
            ...(opts.trialRequested ? { trialRequested: true } : {}),
        });
    };

    // Compute which progress dot group is active
    const currentGroupIdx = STEP_GROUPS.findIndex(group => group.includes(step));

    // Glass Option Card
    const OptionCard = ({ selected, onClick, icon, title, desc }) => (
        <button
            onClick={onClick}
            className="relative w-full p-6 rounded-3xl transition-all duration-300 group overflow-hidden text-left"
            style={{
                background: selected
                    ? `linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)`
                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: selected
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: selected
                    ? '0 10px 40px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 10px 40px rgba(0, 0, 0, 0.2)',
            }}
        >
            <div
                className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)' }}
            />
            <div className="flex items-center gap-5 relative z-10">
                <div
                    className="p-4 rounded-2xl transition-all"
                    style={{
                        background: selected
                            ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)'
                            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                        boxShadow: selected ? '0 8px 25px rgba(220, 38, 38, 0.4)' : 'none',
                    }}
                >
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className={`text-lg font-black uppercase italic ${selected ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{desc}</p>
                </div>
                {selected && <CheckCircle2 size={24} className="text-red-400" />}
            </div>
        </button>
    );

    // Framer Motion page transition variants
    const pageVariants = {
        initial: { opacity: 0, x: 60 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
        exit: { opacity: 0, x: -60, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
    };

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col z-[100] overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse"
                    style={{ background: 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)' }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse"
                    style={{ background: 'radial-gradient(circle, rgba(185, 28, 28, 0.25) 0%, transparent 70%)', animationDelay: '1s' }}
                />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>

            {/* Header */}
            <div className="relative z-10 px-8 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2 text-red-400">
                    <Fingerprint size={24} />
                    <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase">System_Init</span>
                </div>
                <div className="flex gap-1.5">
                    {STEP_GROUPS.map((_, i) => (
                        <div
                            key={i}
                            className="h-1.5 w-6 rounded-full transition-all duration-500"
                            style={{
                                background: currentGroupIdx >= i
                                    ? 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: currentGroupIdx >= i
                                    ? '0 0 12px rgba(239, 68, 68, 0.6)'
                                    : 'none',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow relative z-10 flex flex-col justify-center max-w-lg mx-auto w-full px-6 pb-12 overflow-y-auto">
                <AnimatePresence mode="wait">

                    {/* ========== SCREEN 1: WELCOME ========== */}
                    {step === 'welcome' && (
                        <motion.div
                            key="welcome"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-10 text-center"
                        >
                            {/* Stylized IC Logo */}
                            <div className="relative w-36 h-36 mx-auto">
                                <div
                                    className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse"
                                    style={{ background: 'radial-gradient(circle, rgba(220, 38, 38, 0.5) 0%, transparent 70%)' }}
                                />
                                <div
                                    className="relative w-full h-full rounded-full flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.25) 0%, rgba(185, 28, 28, 0.15) 100%)',
                                        border: '3px solid rgba(239, 68, 68, 0.5)',
                                        boxShadow: '0 0 60px rgba(220, 38, 38, 0.4), inset 0 0 40px rgba(220, 38, 38, 0.1)',
                                    }}
                                >
                                    <span
                                        className="text-5xl font-black italic tracking-tighter bg-clip-text text-transparent"
                                        style={{ backgroundImage: 'linear-gradient(135deg, #ef4444 0%, #f87171 50%, #ffffff 100%)' }}
                                    >
                                        IC
                                    </span>
                                </div>
                            </div>

                            {/* Headline */}
                            <div>
                                <h1
                                    className="text-5xl font-black italic uppercase tracking-tighter leading-[1.05] mb-4 font-heading"
                                >
                                    YOUR PHONE.{'\n'}
                                    <br />
                                    <span
                                        className="bg-clip-text text-transparent"
                                        style={{ backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #f87171 50%, #ffffff 100%)' }}
                                    >
                                        YOUR TRAINER.
                                    </span>
                                </h1>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                                    AI-powered form correction. Personalized nutrition. Competitive leagues.
                                </p>
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => nextStep('goal')}
                                className="w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                    boxShadow: '0 15px 50px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                }}
                            >
                                LET'S GO <ChevronRight className="ml-1" size={20} />
                            </button>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 2: GOAL SELECTION ========== */}
                    {step === 'goal' && (
                        <motion.div
                            key="goal"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-6"
                        >
                            <div className="text-center mb-4">
                                <div
                                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                                        border: '1px solid rgba(220, 38, 38, 0.3)',
                                    }}
                                >
                                    <Target size={28} className="text-red-400" />
                                </div>
                                <h2 className="text-3xl font-black italic uppercase font-heading">WHAT DRIVES YOU?</h2>
                                <p className="text-sm text-gray-500 mt-2">Select your primary mission.</p>
                            </div>
                            <div className="space-y-4">
                                <OptionCard
                                    selected={data.goal === 'lose'}
                                    onClick={() => select('goal', 'lose')}
                                    icon={<Flame size={24} className={data.goal === 'lose' ? 'text-white' : 'text-orange-400'} />}
                                    title="SHRED"
                                    desc="Strip body fat. Reveal what you've built."
                                />
                                <OptionCard
                                    selected={data.goal === 'maintain'}
                                    onClick={() => select('goal', 'maintain')}
                                    icon={<Shield size={24} className={data.goal === 'maintain' ? 'text-white' : 'text-amber-400'} />}
                                    title="RECOMP"
                                    desc="Optimize performance. Fine-tune your machine."
                                />
                                <OptionCard
                                    selected={data.goal === 'gain'}
                                    onClick={() => select('goal', 'gain')}
                                    icon={<Dumbbell size={24} className={data.goal === 'gain' ? 'text-white' : 'text-green-400'} />}
                                    title="BUILD"
                                    desc="Pack on lean mass. Fuel hypertrophy."
                                />
                            </div>
                            <button
                                onClick={() => nextStep('aidemo')}
                                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
                                }}
                            >
                                Next Phase
                            </button>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 3: AI DEMO ========== */}
                    {step === 'aidemo' && (
                        <motion.div
                            key="aidemo"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-8 text-center"
                        >
                            <div>
                                <h2 className="text-3xl font-black italic uppercase font-heading mb-2">
                                    YOUR AI WATCHES{' '}
                                    <span className="text-gradient">EVERY REP</span>
                                </h2>
                                <p className="text-sm text-gray-500">Real-time pose detection powered by on-device AI.</p>
                            </div>

                            {/* Animated phone mockup with pose detection */}
                            <PoseDetectionMockup />

                            {/* Feature pills */}
                            <div className="flex justify-center gap-3 flex-wrap">
                                {['Real-Time Feedback', 'Joint Tracking', 'Form Score'].map((label) => (
                                    <div
                                        key={label}
                                        className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                                            border: '1px solid rgba(220, 38, 38, 0.3)',
                                            color: '#ef4444',
                                        }}
                                    >
                                        {label}
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => nextStep('bio')}
                                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
                                }}
                            >
                                NEXT <ChevronRight className="inline ml-1" size={16} />
                            </button>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 4a: BIO-METRICS ========== */}
                    {step === 'bio' && (
                        <motion.div
                            key="bio"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-6"
                        >
                            <div className="text-center mb-4">
                                <div
                                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
                                        border: '1px solid rgba(6, 182, 212, 0.3)',
                                    }}
                                >
                                    <Scale size={28} className="text-cyan-400" />
                                </div>
                                <h2 className="text-3xl font-black italic uppercase font-heading">Bio-Metrics</h2>
                                <p className="text-sm text-gray-500 mt-2">Input raw data for BMR calculation.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <GlassInput label="Weight" value={data.weight} onChange={e => setData(prev => ({ ...prev, weight: e.target.value }))} placeholder="70" unit="kg" />
                                <GlassInput label="Height" value={data.height} onChange={e => setData(prev => ({ ...prev, height: e.target.value }))} placeholder="175" unit="cm" />
                                <GlassInput label="Age" value={data.age} onChange={e => setData(prev => ({ ...prev, age: e.target.value }))} placeholder="25" unit="yrs" />
                                <div
                                    className="p-4 rounded-2xl"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                    }}
                                >
                                    <label className="text-[11px] uppercase font-bold text-gray-500 block mb-1">Gender</label>
                                    <select
                                        value={data.gender}
                                        onChange={e => select('gender', e.target.value)}
                                        className="w-full bg-transparent text-lg font-bold text-white outline-none appearance-none"
                                    >
                                        <option value="male" className="bg-gray-900">Male</option>
                                        <option value="female" className="bg-gray-900">Female</option>
                                    </select>
                                </div>
                            </div>

                            {/* Body Fat % -- Optional */}
                            <GlassInput
                                label="Body Fat % (Optional)"
                                value={data.bodyFat}
                                onChange={e => setData(prev => ({ ...prev, bodyFat: e.target.value }))}
                                placeholder="15"
                                unit="%"
                            />

                            {data.goal !== 'maintain' && (
                                <div className="animate-in slide-in-from-bottom-2">
                                    <GlassInput
                                        label="Target Weight"
                                        value={data.targetWeight}
                                        onChange={e => setData(prev => ({ ...prev, targetWeight: e.target.value }))}
                                        placeholder="Goal"
                                        unit="kg"
                                        highlight
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => setStep('aidemo')}
                                    className="p-4 rounded-2xl transition-all hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <ChevronLeft className="text-gray-400" />
                                </button>
                                <button
                                    onClick={() => nextStep('activity')}
                                    disabled={!data.weight || !data.height || !data.age}
                                    className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
                                        boxShadow: '0 10px 30px rgba(6, 182, 212, 0.3)',
                                    }}
                                >
                                    Continue
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 4b: ACTIVITY LEVEL ========== */}
                    {step === 'activity' && (
                        <motion.div
                            key="activity"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-5"
                        >
                            <div className="text-center mb-4">
                                <div
                                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                    }}
                                >
                                    <Activity size={28} className="text-green-400" />
                                </div>
                                <h2 className="text-3xl font-black italic uppercase font-heading">Activity Level</h2>
                                <p className="text-sm text-gray-500 mt-2">How active is your daily routine?</p>
                            </div>

                            <div className="space-y-2">
                                {ACTIVITY_LEVELS.map(level => (
                                    <button
                                        key={level.value}
                                        onClick={() => select('activityLevel', level.value)}
                                        className="w-full p-4 rounded-xl transition-all flex items-center gap-3"
                                        style={{
                                            background: data.activityLevel === level.value
                                                ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.25) 0%, rgba(220, 38, 38, 0.1) 100%)'
                                                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                            border: data.activityLevel === level.value ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            boxShadow: data.activityLevel === level.value ? '0 6px 20px rgba(220, 38, 38, 0.2)' : 'none',
                                        }}
                                    >
                                        <span className="text-lg">{level.icon}</span>
                                        <div className="text-left flex-1">
                                            <p className={`text-sm font-bold ${data.activityLevel === level.value ? 'text-white' : 'text-gray-400'}`}>{level.label}</p>
                                            <p className="text-[11px] text-gray-500">{level.desc}</p>
                                        </div>
                                        {data.activityLevel === level.value && <Check size={16} className="text-red-400" />}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => setStep('bio')}
                                    className="p-4 rounded-2xl transition-all hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <ChevronLeft className="text-gray-400" />
                                </button>
                                <button
                                    onClick={() => nextStep('intensity')}
                                    className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
                                        boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)',
                                    }}
                                >
                                    Continue
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 4c: INTENSITY ========== */}
                    {step === 'intensity' && (
                        <motion.div
                            key="intensity"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-6"
                        >
                            <div className="text-center mb-4">
                                <div
                                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                    }}
                                >
                                    <Zap size={28} className="text-yellow-400" />
                                </div>
                                <h2 className="text-3xl font-black italic uppercase font-heading">Intensity Protocol</h2>
                                <p className="text-sm text-gray-500 mt-2">
                                    {data.goal === 'maintain' ? 'Your maintenance calories will be calculated.' : 'How aggressive is your timeline?'}
                                </p>
                            </div>

                            {data.goal !== 'maintain' ? (
                                <div className="space-y-3">
                                    {Object.entries(INTENSITY_CONFIGS).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => select('intensity', key)}
                                            className="w-full p-5 rounded-2xl flex items-center justify-between transition-all text-left"
                                            style={{
                                                background: data.intensity === key
                                                    ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)'
                                                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                                border: data.intensity === key
                                                    ? '1px solid rgba(239, 68, 68, 0.4)'
                                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                                boxShadow: data.intensity === key ? '0 8px 25px rgba(220, 38, 38, 0.2)' : 'none',
                                            }}
                                        >
                                            <div>
                                                <p className={`font-black uppercase ${data.intensity === key ? 'text-white' : 'text-gray-400'}`}>{config.label}</p>
                                                <p className="text-xs text-gray-500">{config.desc}</p>
                                            </div>
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                                                style={{
                                                    border: data.intensity === key ? '2px solid #dc2626' : '2px solid rgba(255,255,255,0.2)',
                                                    background: data.intensity === key ? '#dc2626' : 'transparent',
                                                }}
                                            >
                                                {data.intensity === key && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div
                                    className="p-6 rounded-2xl text-center"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                    }}
                                >
                                    <p className="text-sm text-gray-400">Your TDEE will be set as your daily target for recomposition.</p>
                                </div>
                            )}

                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => setStep('activity')}
                                    className="p-4 rounded-2xl transition-all hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <ChevronLeft className="text-gray-400" />
                                </button>
                                <button
                                    onClick={() => nextStep('analysis')}
                                    className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.9) 0%, rgba(249, 115, 22, 0.9) 100%)',
                                        boxShadow: '0 10px 30px rgba(234, 179, 8, 0.3)',
                                    }}
                                >
                                    Generate Protocol
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 4d: ANALYSIS / LOADING ========== */}
                    {step === 'analysis' && (
                        <motion.div
                            key="analysis"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="text-center space-y-8"
                        >
                            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 3s linear infinite' }}>
                                    <circle cx="50%" cy="50%" r="45%" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                                    <circle
                                        cx="50%" cy="50%" r="45%"
                                        stroke="url(#gradient)"
                                        strokeWidth="3"
                                        fill="none"
                                        strokeDasharray="300"
                                        strokeDashoffset={300 - (loadingProgress * 3)}
                                        className="transition-all duration-300 ease-out"
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#dc2626" />
                                            <stop offset="100%" stopColor="#f87171" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="text-4xl font-black text-white font-mono">{Math.min(loadingProgress, 100)}%</div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic flex items-center justify-center gap-2 font-heading">
                                    <Sparkles size={20} className="text-red-400 animate-pulse" />
                                    Computing Protocol...
                                </h2>
                                <p className="text-sm text-gray-500 mt-3 font-mono leading-relaxed">
                                    BMR: {calculated.bmr} kcal <br />
                                    TDEE: {calculated.tdee} kcal <br />
                                    Target: {calculated.targetCalories} kcal
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* ========== SCREEN 5: PREMIUM UPSELL ========== */}
                    {step === 'upsell' && (
                        <motion.div
                            key="upsell"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-6"
                        >
                            {/* Calorie & Macro Results (reused from old complete) */}
                            <div
                                className="p-5 rounded-2xl text-center"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    boxShadow: '0 10px 40px rgba(220, 38, 38, 0.15)',
                                }}
                            >
                                <p className="text-[11px] text-gray-400 uppercase mb-1">Your Daily Target</p>
                                <p className="text-5xl font-black italic text-white mb-1">{calculated.targetCalories}</p>
                                <p className="text-xs text-red-400 font-bold uppercase">Calories</p>
                                <div className="flex justify-center gap-6 mt-4">
                                    <div className="text-center">
                                        <p className="text-xl font-black text-amber-400">{calculated.protein}g</p>
                                        <p className="text-[11px] text-gray-500 uppercase">Protein</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-black text-yellow-400">{calculated.carbs}g</p>
                                        <p className="text-[11px] text-gray-500 uppercase">Carbs</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-black text-pink-400">{calculated.fat}g</p>
                                        <p className="text-[11px] text-gray-500 uppercase">Fat</p>
                                    </div>
                                </div>
                            </div>

                            {/* Upsell headline */}
                            <h2 className="text-2xl font-black italic uppercase text-center font-heading">
                                UNLOCK THE FULL{' '}
                                <span className="text-gradient">PROTOCOL</span>
                            </h2>

                            {/* Premium benefit cards */}
                            <div className="space-y-3">
                                {[
                                    { icon: <Camera size={22} className="text-red-400" />, title: 'Unlimited AI Form Correction', desc: 'Real-time pose detection on every rep.' },
                                    { icon: <Trophy size={22} className="text-amber-400" />, title: 'Full League Access', desc: 'Compete from Iron to Diamond rank.' },
                                    { icon: <BarChart3 size={22} className="text-cyan-400" />, title: 'Advanced Analytics', desc: 'Deep progress insights and trends.' },
                                ].map((benefit) => (
                                    <div
                                        key={benefit.title}
                                        className="flex items-center gap-4 p-4 rounded-2xl"
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                        }}
                                    >
                                        <div
                                            className="p-3 rounded-xl flex-shrink-0"
                                            style={{
                                                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                            }}
                                        >
                                            {benefit.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{benefit.title}</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">{benefit.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Primary CTA: Start Trial */}
                            <button
                                onClick={() => handleComplete({ trialRequested: true })}
                                className="w-full py-5 rounded-2xl font-black text-base uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
                                    boxShadow: '0 15px 50px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                }}
                            >
                                START 7-DAY FREE TRIAL
                            </button>

                            {/* Secondary: Continue Free */}
                            <button
                                onClick={() => handleComplete()}
                                className="w-full py-3 text-sm text-gray-400 font-medium hover:text-white transition-colors hover:scale-[1.02] active:scale-95"
                            >
                                CONTINUE WITH FREE
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pose-pulse {
                    0%, 100% { opacity: 0.4; r: 8; }
                    50% { opacity: 0.8; r: 12; }
                }
                @keyframes pose-dot-pulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                .pose-line {
                    stroke: rgba(220, 38, 38, 0.6);
                    stroke-width: 2.5;
                    stroke-linecap: round;
                    fill: none;
                }
                .pose-glow {
                    animation: pose-pulse 2s ease-in-out infinite;
                }
                .pose-dot {
                    animation: pose-dot-pulse 2s ease-in-out infinite;
                }
                .pose-head {
                    animation: pose-dot-pulse 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
