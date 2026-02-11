import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronRight, Target, Activity, Dumbbell, Flame, CheckCircle2,
    ChevronLeft, Scale, Zap, Shield, Trophy, Fingerprint, User, Sparkles, Check
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
    { value: 1.2, label: 'Sedentary', desc: 'Desk job, no exercise', icon: '🛋️' },
    { value: 1.375, label: 'Light', desc: '1-2 days/week', icon: '🚶' },
    { value: 1.55, label: 'Moderate', desc: '3-5 days/week', icon: '🏃' },
    { value: 1.725, label: 'Active', desc: '6-7 days/week', icon: '💪' },
    { value: 1.9, label: 'Athlete', desc: 'Intense daily training', icon: '🔥' },
];

// Intensity configs for calorie adjustment
const INTENSITY_CONFIGS = {
    conservative: { lose: -300, gain: 200, label: 'Steady', desc: 'Slow & sustainable' },
    moderate: { lose: -500, gain: 350, label: 'Optimized', desc: 'Balanced approach' },
    aggressive: { lose: -750, gain: 500, label: 'Extreme', desc: 'Maximum effort' },
};

export const OnboardingView = ({ onComplete, user }) => {
    const [step, setStep] = useState('intro');
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
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStep('complete'), 500);
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
    const handleComplete = () => {
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
        });
    };

    // Step index for progress dots
    const STEPS = ['intro', 'goal', 'bio', 'activity', 'intensity', 'analysis'];
    const currentStepIdx = STEPS.indexOf(step);

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
                    {STEPS.map((s, i) => (
                        <div
                            key={s}
                            className="h-1.5 w-6 rounded-full transition-all duration-500"
                            style={{
                                background: currentStepIdx >= i
                                    ? 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: currentStepIdx >= i
                                    ? '0 0 12px rgba(239, 68, 68, 0.6)'
                                    : 'none',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow relative z-10 flex flex-col justify-center max-w-lg mx-auto w-full px-6 pb-12 overflow-y-auto">

                {/* 1. INTRO */}
                {step === 'intro' && (
                    <div className="space-y-8 text-center animate-in zoom-in-95 duration-700">
                        <div className="relative w-32 h-32 mx-auto">
                            <div
                                className="absolute inset-0 rounded-full blur-xl opacity-60"
                                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
                            />
                            <div
                                className="relative w-full h-full rounded-full overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(185, 28, 28, 0.3) 100%)',
                                    border: '3px solid rgba(239, 68, 68, 0.5)',
                                    boxShadow: '0 0 50px rgba(220, 38, 38, 0.4)',
                                }}
                            >
                                {user?.photoURL ? (
                                    <img src={user.photoURL} className="w-full h-full object-cover" alt="User" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User size={48} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-3">
                                Welcome to <br />
                                <span
                                    className="bg-clip-text text-transparent"
                                    style={{ backgroundImage: 'linear-gradient(135deg, #dc2626 0%, #f87171 50%, #f472b6 100%)' }}
                                >
                                    IronCore AI
                                </span>
                            </h1>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                                The IronCore Protocol is not just a log. It's a precision instrument for your biology. Let's calibrate your profile.
                            </p>
                        </div>

                        <button
                            onClick={() => nextStep('goal')}
                            className="w-full py-5 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                boxShadow: '0 15px 50px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            }}
                        >
                            Initialize Profile <ChevronRight className="ml-1" />
                        </button>
                    </div>
                )}

                {/* 2. GOAL */}
                {step === 'goal' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-4">
                            <div
                                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
                                    border: '1px solid rgba(249, 115, 22, 0.3)',
                                }}
                            >
                                <Target size={28} className="text-orange-400" />
                            </div>
                            <h2 className="text-3xl font-black italic uppercase">Primary Objective</h2>
                            <p className="text-sm text-gray-500 mt-2">Define your mission parameters.</p>
                        </div>
                        <div className="space-y-4">
                            <OptionCard
                                selected={data.goal === 'lose'}
                                onClick={() => select('goal', 'lose')}
                                icon={<Flame size={24} className={data.goal === 'lose' ? 'text-white' : 'text-orange-400'} />}
                                title="Fat Loss"
                                desc="Maximize caloric deficit. Prioritize protein retention."
                            />
                            <OptionCard
                                selected={data.goal === 'maintain'}
                                onClick={() => select('goal', 'maintain')}
                                icon={<Shield size={24} className={data.goal === 'maintain' ? 'text-white' : 'text-amber-400'} />}
                                title="Maintenance"
                                desc="Optimize performance. Recomp body composition."
                            />
                            <OptionCard
                                selected={data.goal === 'gain'}
                                onClick={() => select('goal', 'gain')}
                                icon={<Dumbbell size={24} className={data.goal === 'gain' ? 'text-white' : 'text-green-400'} />}
                                title="Hypertrophy"
                                desc="Caloric surplus. Maximize tissue growth."
                            />
                        </div>
                        <button
                            onClick={() => nextStep('bio')}
                            className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
                            }}
                        >
                            Next Phase
                        </button>
                    </div>
                )}

                {/* 3. BIO-METRICS (weight, height, age, gender, bodyFat optional, targetWeight) */}
                {step === 'bio' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
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
                            <h2 className="text-3xl font-black italic uppercase">Bio-Metrics</h2>
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

                        {/* Body Fat % — Optional */}
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
                                onClick={() => setStep('goal')}
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
                                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-40"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
                                    boxShadow: '0 10px 30px rgba(6, 182, 212, 0.3)',
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. ACTIVITY LEVEL */}
                {step === 'activity' && (
                    <div className="space-y-5 animate-in slide-in-from-right duration-500">
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
                            <h2 className="text-3xl font-black italic uppercase">Activity Level</h2>
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
                                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
                                    boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)',
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. INTENSITY / PACE */}
                {step === 'intensity' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
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
                            <h2 className="text-3xl font-black italic uppercase">Intensity Protocol</h2>
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
                                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.9) 0%, rgba(249, 115, 22, 0.9) 100%)',
                                    boxShadow: '0 10px 30px rgba(234, 179, 8, 0.3)',
                                }}
                            >
                                Generate Protocol
                            </button>
                        </div>
                    </div>
                )}

                {/* 6. ANALYSIS / LOADING */}
                {step === 'analysis' && (
                    <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
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
                            <h2 className="text-2xl font-black uppercase italic flex items-center justify-center gap-2">
                                <Sparkles size={20} className="text-red-400 animate-pulse" />
                                Computing Protocol...
                            </h2>
                            <p className="text-sm text-gray-500 mt-3 font-mono leading-relaxed">
                                BMR: {calculated.bmr} kcal <br />
                                TDEE: {calculated.tdee} kcal <br />
                                Target: {calculated.targetCalories} kcal
                            </p>
                        </div>
                    </div>
                )}

                {/* 7. COMPLETE — Show calculated macros */}
                {step === 'complete' && (
                    <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div
                            className="w-28 h-28 mx-auto rounded-3xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                boxShadow: '0 0 60px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <Trophy size={56} className="text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black italic uppercase text-white mb-2">System Ready</h2>
                            <p className="text-gray-400 text-sm">Your custom IronCore protocol has been generated.</p>
                        </div>

                        {/* Calorie & Macro Results */}
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

                        {/* Summary */}
                        <div
                            className="p-4 rounded-2xl w-full text-left space-y-3"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div className="flex justify-between text-xs pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span className="text-gray-500 uppercase font-bold">Goal</span>
                                <span className="text-white font-bold">{data.goal.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-xs pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span className="text-gray-500 uppercase font-bold">TDEE</span>
                                <span className="text-white font-bold">{calculated.tdee} kcal</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 uppercase font-bold">Status</span>
                                <span className="text-green-400 font-bold uppercase flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    ONLINE
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleComplete}
                            className="w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
                                color: '#111827',
                                boxShadow: '0 20px 60px rgba(255, 255, 255, 0.3)',
                            }}
                        >
                            Enter Dashboard
                        </button>
                    </div>
                )}

            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
