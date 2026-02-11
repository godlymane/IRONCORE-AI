import React, { useState, useEffect } from 'react';
import {
    ChevronRight, Target, Activity, Dumbbell, Flame, CheckCircle2,
    ChevronLeft, Scale, Zap, Shield, Trophy, Fingerprint, User, Sparkles
} from 'lucide-react';
import { Button } from '../components/UIComponents';
import { SFX } from '../utils/audio';

// Glass Input Component - Defined OUTSIDE parent to prevent focus loss on re-render
const GlassInput = ({ label, value, onChange, placeholder, type = 'number', highlight = false }) => (
    <div
        className="p-4 rounded-2xl transition-all"
        style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: highlight ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
        }}
    >
        <label className={`text-[11px] uppercase font-bold block mb-1 ${highlight ? 'text-orange-400' : 'text-gray-500'}`}>{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-700"
            placeholder={placeholder}
        />
    </div>
);

export const OnboardingView = ({ onComplete, user }) => {
    const [step, setStep] = useState('intro');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [data, setData] = useState({
        goal: 'maintain',
        activity: '1.375',
        gender: 'male',
        experience: 'intermediate',
        weight: '',
        height: '',
        age: '',
        targetWeight: '',
        pace: 0.5
    });

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

    // Glass Option Card
    const OptionCard = ({ selected, onClick, icon, title, desc, colorClass }) => (
        <button
            onClick={onClick}
            className="relative w-full p-6 rounded-3xl transition-all duration-300 group overflow-hidden text-left"
            style={{
                background: selected
                    ? `linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)`
                    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                backdropFilter: 'blur(20px)',
                border: selected
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: selected
                    ? '0 10px 40px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 10px 40px rgba(0, 0, 0, 0.2)',
            }}
        >
            {/* Top shine */}
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
                {/* Grid overlay */}
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
                    {['intro', 'goal', 'bio', 'style', 'analysis'].map((s, i) => (
                        <div
                            key={s}
                            className="h-1.5 w-8 rounded-full transition-all duration-500"
                            style={{
                                background: Object.keys({ intro: 0, goal: 1, bio: 2, style: 3, analysis: 4 }).indexOf(step) >= i
                                    ? 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: Object.keys({ intro: 0, goal: 1, bio: 2, style: 3, analysis: 4 }).indexOf(step) >= i
                                    ? '0 0 12px rgba(239, 68, 68, 0.6)'
                                    : 'none',
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow relative z-10 flex flex-col justify-center max-w-lg mx-auto w-full px-6 pb-12">

                {/* 1. INTRO */}
                {step === 'intro' && (
                    <div className="space-y-8 text-center animate-in zoom-in-95 duration-700">
                        <div className="relative w-32 h-32 mx-auto">
                            {/* Glow ring */}
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
                        <div className="text-center mb-8">
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

                {/* 3. BIO-METRICS */}
                {step === 'bio' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
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
                            <GlassInput label="Weight (KG)" value={data.weight} onChange={e => setData(prev => ({ ...prev, weight: e.target.value }))} placeholder="00.0" />
                            <GlassInput label="Height (CM)" value={data.height} onChange={e => setData(prev => ({ ...prev, height: e.target.value }))} placeholder="000" />
                            <GlassInput label="Age" value={data.age} onChange={e => setData(prev => ({ ...prev, age: e.target.value }))} placeholder="00" />
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

                        {data.goal !== 'maintain' && (
                            <div className="animate-in slide-in-from-bottom-2">
                                <GlassInput
                                    label="Target Weight (KG)"
                                    value={data.targetWeight}
                                    onChange={e => setData(prev => ({ ...prev, targetWeight: e.target.value }))}
                                    placeholder="Goal"
                                    highlight
                                />
                            </div>
                        )}

                        <div className="flex gap-4 mt-8">
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
                                onClick={() => nextStep('style')}
                                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
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

                {/* 4. STYLE / PACE */}
                {step === 'style' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
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
                            <p className="text-sm text-gray-500 mt-2">How aggressive is your timeline?</p>
                        </div>

                        <div className="space-y-3">
                            {[
                                { val: 0.25, label: 'Steady State', desc: 'Sustainable. 0.25kg/wk.' },
                                { val: 0.5, label: 'Optimized', desc: 'Recommended balance. 0.5kg/wk.' },
                                { val: 0.8, label: 'Extreme', desc: 'Maximum effort. 0.8kg/wk.' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => select('pace', opt.val)}
                                    className="w-full p-5 rounded-2xl flex items-center justify-between transition-all text-left"
                                    style={{
                                        background: data.pace === opt.val
                                            ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)'
                                            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                        border: data.pace === opt.val
                                            ? '1px solid rgba(239, 68, 68, 0.4)'
                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                        boxShadow: data.pace === opt.val ? '0 8px 25px rgba(220, 38, 38, 0.2)' : 'none',
                                    }}
                                >
                                    <div>
                                        <p className={`font-black uppercase ${data.pace === opt.val ? 'text-white' : 'text-gray-400'}`}>{opt.label}</p>
                                        <p className="text-xs text-gray-500">{opt.desc}</p>
                                    </div>
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                                        style={{
                                            border: data.pace === opt.val ? '2px solid #dc2626' : '2px solid rgba(255,255,255,0.2)',
                                            background: data.pace === opt.val ? '#dc2626' : 'transparent',
                                        }}
                                    >
                                        {data.pace === opt.val && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-8">
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

                {/* 5. ANALYSIS / LOADING */}
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
                                Computing Macros...
                            </h2>
                            <p className="text-sm text-gray-500 mt-3 font-mono leading-relaxed">
                                BMR: Calculating... <br />
                                TDEE: Analysing Activity... <br />
                                Split: Optimizing...
                            </p>
                        </div>
                    </div>
                )}

                {/* 6. COMPLETE */}
                {step === 'complete' && (
                    <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
                        <div
                            className="w-32 h-32 mx-auto rounded-3xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                boxShadow: '0 0 60px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <Trophy size={64} className="text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black italic uppercase text-white mb-2">System Ready</h2>
                            <p className="text-gray-400 text-sm">Your custom IronCore dashboard has been generated.</p>
                        </div>

                        <div
                            className="p-6 rounded-3xl w-full text-left space-y-4"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <div className="flex justify-between text-xs pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span className="text-gray-500 uppercase font-bold">Goal</span>
                                <span className="text-white font-bold">{data.goal.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-xs pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span className="text-gray-500 uppercase font-bold">Protocol</span>
                                <span className="text-white font-bold">{data.pace === 0.25 ? 'STEADY' : data.pace === 0.5 ? 'OPTIMIZED' : 'EXTREME'}</span>
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
                            onClick={() => { playSuccess(); onComplete(data); }}
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



