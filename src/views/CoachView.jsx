import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, Zap, Lock } from 'lucide-react';
import { callGemini, cleanAIResponse } from '../utils/helpers';
import { checkRateLimit } from '../utils/rateLimiter';
import { Button, useToast } from '../components/UIComponents';
import { PremiumIcon } from '../components/PremiumIcon';
import { DumbbellIcon, ProteinBoltIcon, TargetIcon, SmartTimerIconShape, PlateIcon } from '../components/IronCoreIcons';
import { usePremium } from '../context/PremiumContext';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

const SPLITS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Arnold', 'Bro Split', 'Custom'];
import { db } from '../firebase';
import { useStore } from '../hooks/useStore';

const SYSTEM_PROMPT = `You are IronCore — the most elite AI fitness coach on the planet. You are NOT a generic chatbot. You are a world-class strength & nutrition coach with 20+ years of experience training pro athletes.

PERSONALITY:
- Direct, intense, no-nonsense — like a drill sergeant who actually cares
- Short punchy answers (2-4 sentences max unless user asks for detail)
- Use fitness slang naturally: "gains", "PR", "DOMS", "cut", "bulk", "progressive overload"
- Motivational but realistic — never give generic advice
- When user is vague, ask ONE sharp follow-up question

RULES:
- NEVER say "I'm just an AI" or "consult a doctor for medical advice" — you ARE the expert
- Give SPECIFIC numbers: exact sets, reps, weights, macros, calories — not ranges
- Tailor every answer to the user's profile data provided below
- If they share a meal, estimate macros quickly and tell them if they're on/off track
- For workout questions, give exercise NAMES, not categories
- Be brutally honest about bad habits but frame it as "here's how to fix it"
- Remember the conversation context — don't repeat yourself`;

export const CoachView = () => {
    const { meals = [], workouts = [], profile = {}, updateData, progress = [] } = useStore();
    const weight = profile.weight || [...progress].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).find(p => p.weight)?.weight;
    const [mode, setMode] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const [genEquipment, setGenEquipment] = useState('gym');
    const [genDuration, setGenDuration] = useState('45');
    const [genFocus, setGenFocus] = useState('Push');
    const [customFocus, setCustomFocus] = useState("");
    const [generatedPlan, setGeneratedPlan] = useState(null);
    const [missionStarted, setMissionStarted] = useState(false);

    const scrollRef = useRef(null);
    const { isPremium } = usePremium();
    const { addToast } = useToast();

    // Build personalized welcome message — re-run when profile loads
    useEffect(() => {
        const goal = profile?.goal || 'improve fitness';
        const name = profile?.name || profile?.username || '';
        const greeting = name ? `${name}, ` : '';
        setMessages([{
            role: 'ai',
            text: `${greeting}ready to work. Goal: ${goal}. What do you need — training, nutrition, or recovery?`
        }]);
    }, [profile?.goal, profile?.name, profile?.username]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Build rich context for the AI from user data
    const buildContext = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayMeals = meals.filter(m => m.date === today);
        const todayCals = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
        const todayProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
        const todayCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
        const todayFat = todayMeals.reduce((s, m) => s + (m.fat || 0), 0);

        const recentWorkouts = workouts.slice(0, 5).map(w => {
            const exNames = (w.exercises || []).map(e => e.name).join(', ');
            return `${w.title || w.focus || 'Workout'}: ${exNames}`;
        }).join(' | ');

        const dailyTarget = profile?.dailyCalories || 'not set';
        const proteinTarget = profile?.proteinGoal || 'not set';

        return `
USER PROFILE: Weight: ${weight || profile?.weight || '?'}kg, Height: ${profile?.height || '?'}cm, Age: ${profile?.age || '?'}, Goal: ${profile?.goal || '?'}, Experience: ${profile?.experience || 'unknown'}, Daily Calorie Target: ${dailyTarget}kcal, Protein Target: ${proteinTarget}g

TODAY'S INTAKE: ${todayCals}kcal consumed (P:${Math.round(todayProtein)}g C:${Math.round(todayCarbs)}g F:${Math.round(todayFat)}g) from ${todayMeals.length} meals

RECENT WORKOUTS (last 5): ${recentWorkouts || 'None logged yet'}
TOTAL WORKOUTS: ${workouts.length}, XP: ${profile?.xp || 0}`;
    };

    // Build conversation history for the AI (last 8 messages for context window)
    const buildConversationHistory = () => {
        return messages.slice(-8).map(m =>
            `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`
        ).join('\n');
    };

    // Basic prompt injection defense — strip patterns that attempt to override system instructions
    const sanitizeInput = (raw) => {
        return raw
            .replace(/\b(ignore|disregard|forget|override)\s+(all\s+)?(previous|above|prior|system)\s+(instructions?|prompts?|rules?|context)/gi, '[filtered]')
            .replace(/\b(you are now|act as|pretend to be|new instructions?|system prompt)\b/gi, '[filtered]')
            .replace(/```[\s\S]*?```/g, '[code block removed]')
            .trim();
    };

    const sendMessage = async (textOverride) => {
        const text = textOverride || input;
        if (!text.trim() || loading) return;

        const limit = checkRateLimit(isPremium);
        if (!limit.allowed) {
            setMessages(prev => [...prev, { role: 'ai', text: limit.reason }]);
            return;
        }

        const sanitizedText = sanitizeInput(text.trim());
        const newMsg = { role: 'user', text: sanitizedText };
        setMessages(prev => [...prev, newMsg]);
        setInput("");
        setLoading(true);

        try {
            const context = buildContext();
            const history = buildConversationHistory();

            const fullPrompt = `${SYSTEM_PROMPT}

${context}

CONVERSATION SO FAR:
${history}
User: ${sanitizedText}

Coach (respond in character — short, specific, intense):`;

            const response = await callGemini(text, fullPrompt, null, false);

            if (response && !response.startsWith('Error:')) {
                let displayText = response;
                try {
                    const j = JSON.parse(response);
                    if (j.message) displayText = j.message;
                } catch (_) { }
                setMessages(prev => [...prev, { role: 'ai', text: displayText }]);
            } else {
                const errMsg = response?.replace('Error: ', '') || 'Connection issue.';
                setMessages(prev => [...prev, { role: 'ai', text: `Connection dropped. ${errMsg}` }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "Network error. Check your connection and try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const generateWorkout = async () => {
        const limit = checkRateLimit(isPremium);
        if (!limit.allowed) {
            addToast(limit.reason, 'error');
            return;
        }

        setLoading(true);
        const focus = genFocus === 'Custom' ? customFocus : genFocus;
        const ctx = buildContext();
        const prompt = `Based on this user's profile and recent workouts, create a ${genDuration} minute ${focus} workout using ${genEquipment}. Consider their experience level and goals. Avoid repeating exercises from their recent workouts if possible.

${ctx}

Return ONLY valid JSON: { "title": "string", "exercises": [ { "name": "string", "sets": "string", "reps": "string", "rest": "string" } ] }`;

        try {
            const res = await callGemini(prompt, "You are an expert strength coach. Return only valid JSON, no markdown.", null, true, 0, 'workout');
            if (res?.startsWith('Error:')) {
                addToast(res.replace('Error: ', ''), 'error');
            } else {
                const plan = cleanAIResponse(res);
                if (plan) setGeneratedPlan(plan);
                else addToast("AI failed to generate plan. Try again.", 'error');
            }
        } catch (e) {
            addToast("Coach is busy. Try again.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - 230px)' }}>

            {/* Compact Mode Toggle */}
            <div className="flex p-1 rounded-xl mb-3 shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                    onClick={() => setMode('chat')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${mode === 'chat' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                    Chat Coach
                </button>
                <button
                    onClick={() => setMode('generator')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${mode === 'generator' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}
                >
                    Generate
                </button>
            </div>

            {mode === 'generator' ? (
                <div className="flex-1 overflow-y-auto pb-6">
                    {!generatedPlan ? (
                        <div className="space-y-4">
                            {/* Focus */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block px-1">Target</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {SPLITS.map(f => (
                                        <button key={f} onClick={() => setGenFocus(f)}
                                            className={`py-2.5 rounded-xl border text-[11px] font-black uppercase transition-all ${genFocus === f ? 'border-red-500 bg-red-900/30 text-white' : 'border-white/5 bg-white/5 text-gray-400'}`}
                                        >{f}</button>
                                    ))}
                                </div>
                                {genFocus === 'Custom' && (
                                    <input value={customFocus} onChange={e => setCustomFocus(e.target.value)}
                                        placeholder="Custom focus..." className="w-full mt-2 p-3 rounded-xl bg-black/50 border border-red-500/30 text-white text-xs outline-none focus:border-red-500" />
                                )}
                            </div>

                            {/* Equipment */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block px-1">Equipment</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { id: 'gym', label: 'Full Gym' },
                                        { id: 'dumbbells', label: 'DB Only' },
                                        { id: 'bodyweight', label: 'Bodyweight' },
                                        { id: 'home', label: 'Home Gym' },
                                    ].map(eq => (
                                        <button key={eq.id} onClick={() => setGenEquipment(eq.id)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${genEquipment === eq.id ? 'border-red-500 bg-red-900/30 text-white' : 'border-white/5 bg-white/5 text-gray-400'}`}
                                        >{eq.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block px-1">Duration</label>
                                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                                    {['15', '30', '45', '60'].map(m => (
                                        <button key={m} onClick={() => setGenDuration(m)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${genDuration === m ? 'bg-red-600 text-white' : 'text-gray-500'}`}
                                        >{m}m</button>
                                    ))}
                                </div>
                            </div>

                            {/* GENERATE BUTTON — always visible */}
                            <button
                                onClick={generateWorkout}
                                disabled={loading}
                                className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-50 active:scale-[0.98] transition-transform"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 0 30px rgba(220,38,38,0.4)' }}
                            >
                                {loading ? 'Generating...' : 'GENERATE WORKOUT'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Plan Header */}
                            <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-black italic text-white uppercase tracking-tight">{generatedPlan.title}</h3>
                                        <p className="text-[11px] font-mono text-gray-400 mt-1">{genDuration} MIN // {genFocus.toUpperCase()}</p>
                                    </div>
                                    <button onClick={() => { setGeneratedPlan(null); setMissionStarted(false); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                                        <RotateCcw size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Exercises */}
                            {generatedPlan.exercises.map((ex, i) => (
                                <div key={i} className="rounded-xl bg-white/5 border border-white/5 p-3 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-black/50 flex items-center justify-center border border-white/10 text-xs font-black text-gray-400">{i + 1}</div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{ex.name}</p>
                                            <p className="text-[11px] text-gray-500">{ex.reps} reps · {ex.rest} rest</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-white">{ex.sets}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">sets</div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={async () => {
                                    if (!updateData || !generatedPlan || missionStarted) return;
                                    setMissionStarted(true);
                                    try {
                                        const exercises = generatedPlan.exercises.map(ex => ({
                                            name: ex.name,
                                            sets: Array.from({ length: parseInt(ex.sets) || 3 }, () => ({ w: '', r: ex.reps?.replace(/[^0-9]/g, '') || '10' })),
                                        }));
                                        await updateData('add', 'workouts', { title: generatedPlan.title, exercises, duration: parseInt(genDuration) || 45, focus: genFocus, equipment: genEquipment, source: 'ai-coach' });
                                    } catch (e) { setMissionStarted(false); }
                                }}
                                disabled={missionStarted}
                                className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]"
                                style={{ background: missionStarted ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: missionStarted ? 'none' : '0 4px 20px rgba(22,163,74,0.4)' }}
                            >
                                {missionStarted ? 'MISSION LOGGED' : 'START MISSION'}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Chat Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-0">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed break-words ${msg.role === 'user' ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}
                                    style={msg.role === 'user'
                                        ? { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white' }
                                        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }
                                    }
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input — sticky at bottom */}
                    <div className="flex gap-2 pt-2 shrink-0">
                        <div className="flex-1 flex gap-2 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                placeholder="Ask your coach..."
                                className="flex-grow bg-transparent px-3 py-2 text-white outline-none placeholder:text-gray-600 text-sm"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}
                                className="p-2.5 rounded-xl text-white transition-all active:scale-95 disabled:opacity-30"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
