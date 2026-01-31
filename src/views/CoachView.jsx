import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Zap, Dumbbell, MessageCircle, Clock, Target, RotateCcw, Mic, MicOff, Brain, Flame } from 'lucide-react';
import { callGemini, cleanAIResponse } from '../utils/helpers';
import { Button } from '../components/UIComponents';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { PredictiveAnalytics } from '../components/PredictiveAnalytics';

// Glass Card Component for Coach
const GlassCard = ({ children, className = "", highlight = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl p-5 ${className}`}
        style={{
            background: highlight
                ? 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)'
                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            backdropFilter: 'blur(20px)',
            border: highlight ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: highlight
                ? '0 10px 40px rgba(220, 38, 38, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 10px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
    >
        <div
            className="absolute top-0 left-0 right-0 h-[40%] rounded-t-3xl pointer-events-none"
            style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)',
            }}
        />
        <div className="relative z-10">{children}</div>
    </motion.div>
);

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
                `You are an elite fitness coach with expertise in nutrition and training. Be motivating, concise, and actionable. Context: ${context}. Keep answers short and intense. No JSON.`,
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
                        <Flame size={24} className="text-white relative z-10" />
                        {/* Pulse animation */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-red-400/30 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic text-white">IRONCORE AI</h2>
                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1">
                            <Zap size={10} className="animate-pulse" />
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
                        <MessageCircle size={16} />
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
                        <Dumbbell size={16} />
                        <span className="text-xs font-bold">Generate</span>
                    </button>
                </div>
            </div>

            {mode === 'generator' ? (
                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-5 pb-4">
                    {!generatedPlan ? (
                        <div className="space-y-5">
                            {/* Generator Hero */}
                            <GlassCard highlight className="text-center !py-8">
                                <div
                                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <Zap size={28} className="text-red-400" />
                                </div>
                                <h3 className="text-xl font-black italic text-white uppercase">Workout Generator</h3>
                                <p className="text-xs text-gray-400 mt-2">AI-powered custom routines in seconds</p>
                            </GlassCard>

                            {/* Target/Split Selection */}
                            <GlassCard>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Target size={12} />
                                    Target / Split
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SPLITS.map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setGenFocus(f)}
                                            className={`py-3 rounded-xl text-[10px] font-bold transition-all ${genFocus === f
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-300'
                                                }`}
                                            style={genFocus === f ? {
                                                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.8) 0%, rgba(185, 28, 28, 0.8) 100%)',
                                                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)',
                                            } : {
                                                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                {genFocus === 'Custom' && (
                                    <input
                                        value={customFocus}
                                        onChange={e => setCustomFocus(e.target.value)}
                                        placeholder="e.g. Glute Focus, Arms Only..."
                                        className="w-full mt-3 p-3 rounded-xl text-white text-sm outline-none animate-in fade-in"
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                        }}
                                    />
                                )}
                            </GlassCard>

                            {/* Equipment & Duration */}
                            <div className="grid grid-cols-2 gap-3">
                                <GlassCard className="!p-4">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <Dumbbell size={12} />
                                        Equipment
                                    </label>
                                    <select
                                        value={genEquipment}
                                        onChange={e => setGenEquipment(e.target.value)}
                                        className="w-full bg-transparent text-white text-sm outline-none border-none"
                                    >
                                        <option value="gym" className="bg-gray-900">Full Gym</option>
                                        <option value="dumbbells" className="bg-gray-900">Dumbbells Only</option>
                                        <option value="bodyweight" className="bg-gray-900">Bodyweight</option>
                                        <option value="home" className="bg-gray-900">Home Gym</option>
                                    </select>
                                </GlassCard>

                                <GlassCard className="!p-4">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <Clock size={12} />
                                        Duration
                                    </label>
                                    <select
                                        value={genDuration}
                                        onChange={e => setGenDuration(e.target.value)}
                                        className="w-full bg-transparent text-white text-sm outline-none border-none"
                                    >
                                        <option value="15" className="bg-gray-900">15 min</option>
                                        <option value="30" className="bg-gray-900">30 min</option>
                                        <option value="45" className="bg-gray-900">45 min</option>
                                        <option value="60" className="bg-gray-900">60 min</option>
                                    </select>
                                </GlassCard>
                            </div>

                            <Button
                                onClick={generateWorkout}
                                loading={loading}
                                className="w-full !py-4 text-sm"
                            >
                                {loading ? "Generating..." : "Generate Workout"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-8">
                            {/* Generated Plan Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-black italic text-white uppercase">{generatedPlan.title}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                        <Clock size={12} />
                                        {genDuration} Minutes • AI Generated
                                    </p>
                                </div>
                                <button
                                    onClick={() => setGeneratedPlan(null)}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    Reset
                                </button>
                            </div>

                            {/* Exercise List */}
                            <div className="space-y-2">
                                {generatedPlan.exercises.map((ex, i) => (
                                    <GlassCard key={i} className="!p-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(185, 28, 28, 0.2) 100%)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    }}
                                                >
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{ex.name}</p>
                                                    <p className="text-[10px] text-gray-500">{ex.rest} Rest</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-red-400 font-black font-mono">{ex.sets} Sets</p>
                                                <p className="text-xs text-gray-400">{ex.reps}</p>
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>

                            <Button className="w-full">Start This Workout</Button>
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



