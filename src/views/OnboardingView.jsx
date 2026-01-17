import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, Target, Activity, Dumbbell, Flame, CheckCircle2, 
    ChevronLeft, Scale, Zap, Shield, Trophy, Fingerprint, User 
} from 'lucide-react';
import { Button } from '../components/UIComponents';
import { SFX } from '../utils/audio';

export const OnboardingView = ({ onComplete, user }) => {
    const [step, setStep] = useState('intro'); // intro, goal, bio, style, analysis, complete
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

    // Fake AI Analysis Effect
    useEffect(() => {
        if (step === 'analysis') {
            const interval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStep('complete'), 500);
                        return 100;
                    }
                    // Random jumps for realism
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

    // --- SUB-COMPONENTS ---
    const OptionCard = ({ selected, onClick, icon, title, desc, color }) => (
        <button 
            onClick={onClick}
            className={`relative w-full p-6 rounded-3xl border transition-all duration-300 group overflow-hidden text-left ${
                selected 
                ? `bg-${color}-900/40 border-${color}-500 shadow-[0_0_30px_rgba(var(--color-${color}),0.3)]` 
                : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'
            }`}
        >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000`}></div>
            <div className="flex items-center gap-5 relative z-10">
                <div className={`p-4 rounded-2xl transition-colors ${selected ? `bg-${color}-500 text-white shadow-lg` : 'bg-gray-800 text-gray-500'}`}>
                    {icon}
                </div>
                <div>
                    <h3 className={`text-lg font-black uppercase italic ${selected ? 'text-white' : 'text-gray-300'}`}>{title}</h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{desc}</p>
                </div>
                {selected && <div className={`absolute right-6 top-1/2 -translate-y-1/2 text-${color}-400`}><CheckCircle2 size={24} /></div>}
            </div>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col z-[100] overflow-hidden">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            </div>

            {/* HEADER */}
            <div className="relative z-10 px-8 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2 text-indigo-500">
                    <Fingerprint size={24} />
                    <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase">System_Init</span>
                </div>
                <div className="flex gap-1">
                    {['intro', 'goal', 'bio', 'style', 'analysis'].map((s, i) => (
                        <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                            Object.keys({intro:0, goal:1, bio:2, style:3, analysis:4}).indexOf(step) >= i 
                            ? 'bg-indigo-500 shadow-[0_0_10px_#6366f1]' 
                            : 'bg-gray-800'
                        }`} />
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-grow relative z-10 flex flex-col justify-center max-w-lg mx-auto w-full px-6 pb-12">
                
                {/* 1. INTRO */}
                {step === 'intro' && (
                    <div className="space-y-8 text-center animate-in zoom-in-95 duration-700">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full p-1 shadow-[0_0_50px_rgba(99,102,241,0.5)]">
                            <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-4 border-black relative overflow-hidden">
                                {user?.photoURL ? <img src={user.photoURL} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="User" /> : <User size={48} className="text-gray-500"/>}
                                <div className="absolute inset-0 bg-indigo-500/20 mix-blend-overlay"></div>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">
                                Welcome to <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">IRONCORE AI</span>
                            </h1>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                                The IronCore Protocol is not just a log. It's a precision instrument for your biology. Let's calibrate your profile.
                            </p>
                        </div>
                        <Button onClick={() => nextStep('goal')} className="w-full py-5 text-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] bg-indigo-600 hover:bg-indigo-500 border-none">
                            Initialize Profile <ChevronRight className="ml-2"/>
                        </Button>
                    </div>
                )}

                {/* 2. GOAL */}
                {step === 'goal' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
                            <Target size={40} className="text-orange-500 mx-auto mb-4 drop-shadow-lg"/>
                            <h2 className="text-3xl font-black italic uppercase">Primary Objective</h2>
                            <p className="text-sm text-gray-500">Define your mission parameters.</p>
                        </div>
                        <div className="space-y-4">
                            <OptionCard 
                                selected={data.goal === 'lose'} 
                                onClick={() => select('goal', 'lose')}
                                icon={<Flame size={24}/>}
                                title="Fat Loss"
                                desc="Maximize caloric deficit. Prioritize protein retention."
                                color="orange"
                            />
                            <OptionCard 
                                selected={data.goal === 'maintain'} 
                                onClick={() => select('goal', 'maintain')}
                                icon={<Shield size={24}/>}
                                title="Maintenance"
                                desc="Optimize performance. Recomp body composition."
                                color="blue"
                            />
                            <OptionCard 
                                selected={data.goal === 'gain'} 
                                onClick={() => select('goal', 'gain')}
                                icon={<Dumbbell size={24}/>}
                                title="Hypertrophy"
                                desc="Caloric surplus. Maximize tissue growth."
                                color="green"
                            />
                        </div>
                        <Button onClick={() => nextStep('bio')} className="w-full py-4 mt-4">Next Phase</Button>
                    </div>
                )}

                {/* 3. BIO-METRICS */}
                {step === 'bio' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
                            <Scale size={40} className="text-cyan-500 mx-auto mb-4 drop-shadow-lg"/>
                            <h2 className="text-3xl font-black italic uppercase">Bio-Metrics</h2>
                            <p className="text-sm text-gray-500">Input raw data for BMR calculation.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-800 focus-within:border-cyan-500 transition-colors">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Weight (KG)</label>
                                <input type="number" value={data.weight} onChange={e=>select('weight', e.target.value)} className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-700" placeholder="00.0" />
                            </div>
                             <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-800 focus-within:border-cyan-500 transition-colors">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Height (CM)</label>
                                <input type="number" value={data.height} onChange={e=>select('height', e.target.value)} className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-700" placeholder="000" />
                            </div>
                             <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-800 focus-within:border-cyan-500 transition-colors">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Age</label>
                                <input type="number" value={data.age} onChange={e=>select('age', e.target.value)} className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-700" placeholder="00" />
                            </div>
                            <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-800 focus-within:border-cyan-500 transition-colors">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Gender</label>
                                <select value={data.gender} onChange={e=>select('gender', e.target.value)} className="w-full bg-transparent text-lg font-bold text-white outline-none border-none p-0 appearance-none">
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                        </div>

                        {data.goal !== 'maintain' && (
                             <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-800 focus-within:border-orange-500 transition-colors animate-in slide-in-from-bottom-2">
                                <label className="text-[10px] uppercase font-bold text-orange-500 block mb-1">Target Weight (KG)</label>
                                <input type="number" value={data.targetWeight} onChange={e=>select('targetWeight', e.target.value)} className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-gray-700" placeholder="Goal" />
                            </div>
                        )}

                        <div className="flex gap-4 mt-8">
                             <button onClick={() => setStep('goal')} className="p-4 rounded-2xl bg-gray-800 text-gray-400 hover:text-white"><ChevronLeft/></button>
                             <Button onClick={() => nextStep('style')} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500">Continue</Button>
                        </div>
                    </div>
                )}

                {/* 4. STYLE / PACE */}
                {step === 'style' && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-500">
                        <div className="text-center mb-8">
                            <Zap size={40} className="text-yellow-500 mx-auto mb-4 drop-shadow-lg"/>
                            <h2 className="text-3xl font-black italic uppercase">Intensity Protocol</h2>
                            <p className="text-sm text-gray-500">How aggressive is your timeline?</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { val: 0.25, label: 'Steady State', desc: 'Sustainable. 0.25kg/wk.', color: 'blue' },
                                { val: 0.5, label: 'Optimized', desc: 'Recommended balance. 0.5kg/wk.', color: 'indigo' },
                                { val: 0.8, label: 'Extreme', desc: 'Maximum effort. 0.8kg/wk.', color: 'red' }
                            ].map(opt => (
                                <button 
                                    key={opt.val}
                                    onClick={() => select('pace', opt.val)}
                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group text-left ${
                                        data.pace === opt.val 
                                        ? `bg-${opt.color}-900/30 border-${opt.color}-500 shadow-lg` 
                                        : 'bg-gray-900 border-gray-800'
                                    }`}
                                >
                                    <div>
                                        <p className={`font-black uppercase ${data.pace === opt.val ? 'text-white' : 'text-gray-400'}`}>{opt.label}</p>
                                        <p className="text-xs text-gray-500">{opt.desc}</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${data.pace === opt.val ? `border-${opt.color}-500 bg-${opt.color}-500` : 'border-gray-700'}`}>
                                        {data.pace === opt.val && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>

                         <div className="flex gap-4 mt-8">
                             <button onClick={() => setStep('bio')} className="p-4 rounded-2xl bg-gray-800 text-gray-400 hover:text-white"><ChevronLeft/></button>
                             <Button onClick={() => nextStep('analysis')} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500">Generate Protocol</Button>
                        </div>
                    </div>
                )}

                {/* 5. ANALYSIS / LOADING */}
                {step === 'analysis' && (
                    <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
                         <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                             <svg className="absolute inset-0 w-full h-full animate-spin-slow">
                                <circle cx="50%" cy="50%" r="45%" stroke="#374151" strokeWidth="2" fill="none" />
                                <circle cx="50%" cy="50%" r="45%" stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="300" strokeDashoffset={300 - (loadingProgress * 3)} className="transition-all duration-300 ease-out" strokeLinecap="round" />
                             </svg>
                             <div className="text-4xl font-black text-white font-mono">{loadingProgress}%</div>
                         </div>
                         <div>
                             <h2 className="text-2xl font-black uppercase italic animate-pulse">Computing Macros...</h2>
                             <p className="text-sm text-gray-500 mt-2 font-mono">
                                 BMR: Calculating... <br/>
                                 TDEE: Analysing Activity... <br/>
                                 Split: Optimizing...
                             </p>
                         </div>
                    </div>
                )}

                {/* 6. COMPLETE */}
                {step === 'complete' && (
                    <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="w-32 h-32 mx-auto bg-green-500/20 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                            <Trophy size={64} className="text-green-500"/>
                        </div>
                        <div>
                            <h2 className="text-4xl font-black italic uppercase text-white mb-2">System Ready</h2>
                            <p className="text-gray-400 text-sm">Your custom IronCore dashboard has been generated.</p>
                        </div>

                        <div className="bg-gray-900/80 p-6 rounded-3xl border border-gray-800 w-full text-left space-y-3">
                            <div className="flex justify-between text-xs border-b border-gray-800 pb-2">
                                <span className="text-gray-500 uppercase font-bold">Goal</span>
                                <span className="text-white font-bold">{data.goal.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-xs border-b border-gray-800 pb-2">
                                <span className="text-gray-500 uppercase font-bold">Protocol</span>
                                <span className="text-white font-bold">{data.pace === 0.25 ? 'STEADY' : data.pace === 0.5 ? 'OPTIMIZED' : 'EXTREME'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 uppercase font-bold">Status</span>
                                <span className="text-green-500 font-bold uppercase animate-pulse">ONLINE</span>
                            </div>
                        </div>

                        <Button onClick={() => { playSuccess(); onComplete(data); }} className="w-full py-5 text-lg bg-white text-black font-black uppercase tracking-widest hover:bg-gray-200 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                            Enter Dashboard
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
};