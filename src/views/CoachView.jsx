import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, RotateCcw, Mic, MicOff, Brain } from 'lucide-react';
import { callGemini, cleanAIResponse } from '../utils/helpers';
import { Button, GlassCard } from '../components/UIComponents';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { PredictiveAnalytics } from '../components/PredictiveAnalytics';
import { PremiumIcon } from '../components/PremiumIcon';
import { FlameIcon, ChatIcon, DumbbellIcon, ProteinBoltIcon, TargetIcon, SmartTimerIconShape, PlateIcon } from '../components/IronCoreIcons';

export const CoachView = ({ weight, meals, workouts, profile }) => {
    const [mode, setMode] = useState('chat');
    const [messages, setMessages] = useState([
        { role: 'ai', text: `Hey! I'm your AI coach. I see you're aiming to ${profile?.goal || 'improve your fitness'}. What can I help you with today?` }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [genEquipment, setGenEquipment] = useState('gym');
    const [genDuration, setGenDuration] = useState('45');
    const [genFocus, setGenFocus] = useState('Push');
    const [customFocus, setCustomFocus] = useState("");
    const [generatedPlan, setGeneratedPlan] = useState(null);

    const scrollRef = useRef(null);

    // Voice Commands Integration
    const handleVoiceCommand = (result) => {
        if (result.action === 'query') {
            setInput(result.params[0]);
            sendMessage(result.params[0]);
        }
    };

    const { isListening, transcript, isSupported, toggleListening, speak } = useVoiceCommands({
        onCommand: handleVoiceCommand,
        onLog: (msg) => console.log(msg)
    });

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = async (textOverride) => {
        const text = textOverride || input;
        if (!text.trim()) return;

        const newMsg = { role: 'user', text };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setLoading(true);

        try {
            const today = new Date().toISOString().split('T')[0];
            const todayMeals = meals.filter(m => m.date === today);
            const cals = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);

            const context = `User Profile: ${weight || 'Unknown'}kg, Goal: ${profile?.goal}. Cals Today: ${cals}.`;

            const response = await callGemini(
                text,
                `You are an expert fitness coach with expertise in nutrition and training. Be motivating, concise, and actionable. Context: ${context}. Keep answers short and intense. No JSON.`,
                null,
                false
            );

            if (response) {
                let displayText = response;
                try {
                    const possibleJson = JSON.parse(response);
                    if (possibleJson.message) displayText = possibleJson.message;
                } catch (e) { }
                setMessages(prev => [...prev, { role: 'ai', text: displayText }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: "Connection issue. Try again." }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "Network error. Check your connection." }]);
        } finally {
            setLoading(false);
        }
    };

    const generateWorkout = async () => {
        setLoading(true);
        const focus = genFocus === 'Custom' ? customFocus : genFocus;
        const prompt = `Create a ${genDuration} minute ${focus} workout using ${genEquipment}. Return JSON: { "title": "string", "exercises": [ { "name": "string", "sets": "string", "reps": "string", "rest": "string" } ] }`;

        try {
            const res = await callGemini(prompt, "You are a strict personal trainer. JSON only.", null, true);
            const plan = cleanAIResponse(res);
            if (plan) setGeneratedPlan(plan);
            else alert("AI failed to generate plan. Try again.");
        } catch (e) {
            alert("Coach is busy. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const SPLITS = ['Push', 'Pull', 'Legs', 'Arnold Split', 'Upper', 'Lower', 'Full Body', 'Bro Split', 'Custom'];

    return (
        <div className="h-[calc(100vh-180px)] flex flex-col animate-in fade-in">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div
                        className="p-3 rounded-2xl relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 1) 0%, rgba(127, 29, 29, 1) 100%)',
                            boxShadow: '0 10px 40px rgba(220, 38, 38, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                        }}
                    >
                        <PremiumIcon src={FlameIcon} size="md" className="!w-8 !h-8 relative z-10" fallback={null} />
                        {/* Pulse animation */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-red-400/30 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">IRONCORE AI</h2>
                        <p className="text-[11px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1">
                            <PremiumIcon src={ProteinBoltIcon} size="xs" className="!w-3 !h-3 animate-pulse" fallback={null} />
                            NEURAL ENGINE ACTIVE
                        </p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div
                    className="flex p-1 rounded-2xl"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <button
                        onClick={() => setMode('chat')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${mode === 'chat'
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                        style={mode === 'chat' ? {
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                        } : {}}
                    >
                        <PremiumIcon src={ChatIcon} size="xs" className="!w-4 !h-4" fallback={null} />
                        <span className="text-xs font-bold">Chat</span>
                    </button>
                    <button
                        onClick={() => setMode('generator')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${mode === 'generator'
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                        style={mode === 'generator' ? {
                            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
                            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                        } : {}}
                    >
                        <PremiumIcon src={DumbbellIcon} size="xs" className="!w-4 !h-4" fallback={null} />
                        <span className="text-xs font-bold">Generate</span>
                    </button>
                </div>
            </div>

            {mode === 'generator' ? (
                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-5 pb-4">
                    {!generatedPlan ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            {/* Tactical Hero */}
                            <div className="relative overflow-hidden rounded-3xl p-6 text-center border border-red-500/30">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 to-black z-0" />
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0" />

                                <div className="relative z-10">
                                    <div className="w-16 h-16 mx-auto bg-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30 mb-3 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                                        <PremiumIcon src={ProteinBoltIcon} size="lg" className="!w-12 !h-12" fallback={null} />
                                    </div>
                                    <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                                        Mission Configurator
                                    </h3>
                                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest mt-1">
                                        // Classified Training Protocol
                                    </p>
                                </div>
                            </div>

                            {/* FOCUS SELECTION */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 px-1">
                                    <PremiumIcon src={TargetIcon} size="xs" className="!w-3 !h-3" fallback={null} />
                                    Phase 1: Target Objective
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SPLITS.map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setGenFocus(f)}
                                            className={`relative overflow-hidden py-3 rounded-xl border transition-all duration-300 ${genFocus === f
                                                ? 'border-red-500 bg-red-900/20 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                                                : 'border-white/5 bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <p className={`text-[11px] font-black uppercase tracking-wider ${genFocus === f ? 'text-white' : 'text-gray-400'}`}>
                                                {f}
                                            </p>
                                            {genFocus === f && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {genFocus === 'Custom' && (
                                    <input
                                        value={customFocus}
                                        onChange={e => setCustomFocus(e.target.value)}
                                        placeholder="ENTER CUSTOM OBJECTIVE..."
                                        className="w-full mt-2 p-3 rounded-xl bg-black/50 border border-red-500/30 text-white text-xs font-mono outline-none focus:border-red-500 transition-colors uppercase placeholder:text-gray-700"
                                    />
                                )}
                            </div>

                            {/* EQUIPMENT SELECTION */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 px-1">
                                    <PremiumIcon src={DumbbellIcon} size="xs" className="!w-3 !h-3" fallback={null} />
                                    Phase 2: Available Gear
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'gym', label: 'Full Gym', icon: <PremiumIcon src={DumbbellIcon} size="xs" className="!w-4 !h-4" fallback={null} /> },
                                        { id: 'dumbbells', label: 'DB Only', icon: <PremiumIcon src={DumbbellIcon} size="xs" className="!w-4 !h-4" fallback={null} /> },
                                        { id: 'bodyweight', label: 'Bodyweight', icon: <PremiumIcon src={ProteinBoltIcon} size="xs" className="!w-4 !h-4" fallback={null} /> },
                                        { id: 'home', label: 'Home Gym', icon: <PremiumIcon src={PlateIcon} size="xs" className="!w-4 !h-4" fallback={null} /> },
                                    ].map(eq => (
                                        <button
                                            key={eq.id}
                                            onClick={() => setGenEquipment(eq.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${genEquipment === eq.id
                                                ? 'border-red-500 bg-red-900/20'
                                                : 'border-white/5 bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${genEquipment === eq.id ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                                                {eq.icon}
                                            </div>
                                            <span className={`text-xs font-bold uppercase ${genEquipment === eq.id ? 'text-white' : 'text-gray-400'}`}>
                                                {eq.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* DURATION SELECTION */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 px-1">
                                    <PremiumIcon src={SmartTimerIconShape} size="xs" className="!w-3 !h-3" fallback={null} />
                                    Phase 3: Time Limit
                                </label>
                                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                                    {['15', '30', '45', '60'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setGenDuration(m)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${genDuration === m
                                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                                                : 'text-gray-500 hover:text-gray-300'
                                                }`}
                                        >
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={generateWorkout}
                                loading={loading}
                                className="w-full !py-5 text-sm uppercase tracking-widest font-black"
                                style={{
                                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                    boxShadow: '0 0 30px rgba(220,38,38,0.4)'
                                }}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <PremiumIcon src={ProteinBoltIcon} size="xs" className="!w-4 !h-4 animate-spin" fallback={null} />
                                        Infiltrating Mainframe...
                                    </span>
                                ) : (
                                    "INITIATE GENERATION PROTOCOL"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in slide-in-from-bottom-8 pb-8">
                            {/* Generated Plan Header */}
                            <div className="relative overflow-hidden rounded-3xl p-6 border border-white/10 bg-black/40">
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <PremiumIcon src={ProteinBoltIcon} size="xl" className="!w-24 !h-24 text-white" fallback={null} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-[11px] font-bold text-red-500 uppercase tracking-widest">
                                            Classified
                                        </div>
                                        <button
                                            onClick={() => setGeneratedPlan(null)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    </div>

                                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-1">
                                        {generatedPlan.title}
                                    </h3>
                                    <p className="text-xs font-mono text-gray-400">
                                        DURATION: <span className="text-white">{genDuration} MIN</span> // FOCUS: <span className="text-white uppercase">{genFocus}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Exercise List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Mission Directives</h4>
                                {generatedPlan.exercises.map((ex, i) => (
                                    <div key={i} className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-4 group hover:border-red-500/30 transition-colors">
                                        <div className="flex justify-between items-center relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-black/50 flex items-center justify-center border border-white/10 text-sm font-black text-gray-400">
                                                    0{i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-sm uppercase tracking-wide">{ex.name}</p>
                                                    <p className="text-[11px] font-mono text-gray-500 flex items-center gap-2">
                                                        <PremiumIcon src={SmartTimerIconShape} size="xs" className="!w-3 !h-3" fallback={null} />
                                                        REST: {ex.rest}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-white italic">{ex.sets}</div>
                                                <div className="text-[11px] font-bold text-gray-500 uppercase">SETS</div>
                                            </div>
                                        </div>
                                        {/* Reps overlay */}
                                        <div className="absolute right-16 top-1/2 -translate-y-1/2 text-[40px] font-black text-white/5 pointer-events-none">
                                            {ex.reps}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                className="w-full !py-4 text-sm font-black uppercase tracking-widest"
                                style={{
                                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                    boxShadow: '0 4px 20px rgba(22,163,74,0.4)'
                                }}
                            >
                                START MISSION
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Chat Messages */}
                    <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-4 p-1 custom-scrollbar pb-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] p-4 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'rounded-2xl rounded-br-sm'
                                        : 'rounded-2xl rounded-bl-sm'
                                        }`}
                                    style={msg.role === 'user' ? {
                                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                        color: 'white',
                                        boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3)',
                                    } : {
                                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#e5e7eb',
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div
                                    className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                >
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div
                        className="flex gap-2 mt-3 p-2 rounded-2xl"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask your coach..."
                            className="flex-grow bg-transparent px-4 py-3 text-white outline-none placeholder:text-gray-600 text-sm"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={loading}
                            className="p-3 rounded-xl text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
                                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};



