import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { callGemini } from '../utils/helpers';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// ===========================
// INTENT PARSER
// ===========================
const QUICK_FOODS = {
    water: { mealName: 'Water', calories: 0, protein: 0, carbs: 0, fat: 0 },
    'protein shake': { mealName: 'Protein Shake', calories: 120, protein: 25, carbs: 3, fat: 1 },
    'protein': { mealName: 'Protein Shake', calories: 120, protein: 25, carbs: 3, fat: 1 },
    'eggs': { mealName: '2 Whole Eggs', calories: 155, protein: 13, carbs: 1, fat: 11 },
    '2 eggs': { mealName: '2 Whole Eggs', calories: 155, protein: 13, carbs: 1, fat: 11 },
    'chicken': { mealName: 'Chicken Breast 150g', calories: 247, protein: 46, carbs: 0, fat: 5 },
    'chicken breast': { mealName: 'Chicken Breast 150g', calories: 247, protein: 46, carbs: 0, fat: 5 },
    'rice': { mealName: 'White Rice 200g', calories: 260, protein: 5, carbs: 57, fat: 0.5 },
    'banana': { mealName: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0.4 },
    'oats': { mealName: 'Oats 50g', calories: 190, protein: 7, carbs: 34, fat: 3.5 },
};

function parseIntent(text) {
    const lower = text.toLowerCase().trim();

    // LOG FOOD
    if (/^(log|add|track|record)\s+/.test(lower)) {
        const foodPart = lower.replace(/^(log|add|track|record)\s+(a\s+)?(glass\s+of\s+)?/, '').trim();

        // Check quick foods
        for (const [key, data] of Object.entries(QUICK_FOODS)) {
            if (foodPart.includes(key)) {
                return { type: 'log_food', food: data, raw: foodPart };
            }
        }
        // Unknown food — try AI
        return { type: 'log_ai', raw: foodPart };
    }

    // CHECK STATS
    if (/how\s+much\s+protein|protein\s+today|protein\s+so\s+far/i.test(lower)) {
        return { type: 'check_protein' };
    }
    if (/how\s+many\s+calories|calories\s+today|calorie\s+count/i.test(lower)) {
        return { type: 'check_calories' };
    }
    if (/how\s+much\s+water|water\s+today|water\s+intake/i.test(lower)) {
        return { type: 'check_water' };
    }
    if (/what('s|\s+is)\s+my\s+(progress|stats|status)/i.test(lower)) {
        return { type: 'check_summary' };
    }

    // Fallback — maybe they just said a food name without "log"
    for (const [key, data] of Object.entries(QUICK_FOODS)) {
        if (lower.includes(key)) {
            return { type: 'log_food', food: data, raw: key };
        }
    }

    return { type: 'unknown', raw: lower };
}

// ===========================
// TTS ENGINE
// ===========================
function speak(text, onEnd) {
    if (!window.speechSynthesis) {
        onEnd?.();
        return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);

    // Pick the best voice — prefer English male
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
        v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
    ) || voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferred) utter.voice = preferred;
    utter.rate = 1.05;
    utter.pitch = 0.9; // Slightly deeper
    utter.volume = 1;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
}

// Coach system prompt — gives Gemini its personality
const COACH_SYSTEM_PROMPT = `You are Coach Iron — a motivational, no-nonsense AI fitness coach inside the IronCore AI app.
Rules:
- Keep responses under 2 sentences. Be punchy and motivational.
- Use gym bro energy but stay smart. No emojis.
- You have access to the user's current daily stats which will be provided.
- If the user logged food, confirm it and give a quick tip or encouragement.
- If the user asks about stats, give a concise answer with motivation.
- If you don't understand, ask them to rephrase simply.
- Never mention that you are an AI. You are Coach Iron.`;

// Get AI response from Gemini
async function getAICoachResponse(userSpeech, intent, stats, actionResult) {
    const context = `User's stats today: ${stats.calories} calories (${stats.caloriesLeft} left), ${stats.protein}g protein (goal: ${stats.proteinGoal}g), ${stats.waterCount} glasses of water, ${stats.workoutsDone} workouts.`;

    let actionContext = '';
    if (intent.type === 'log_food' && intent.food) {
        actionContext = `\nAction taken: Just logged "${intent.food.mealName}" (${intent.food.calories} cal, ${intent.food.protein}g protein).`;
    } else if (intent.type === 'log_ai' && actionResult) {
        actionContext = `\nAction taken: AI analyzed and logged "${actionResult.mealName}" (${actionResult.calories} cal, ${actionResult.protein}g protein).`;
    }

    const userMessage = `${context}${actionContext}\n\nUser said: "${userSpeech}"`;

    try {
        const response = await callGemini(userMessage, COACH_SYSTEM_PROMPT, null, false, 0, 'coach');
        if (response && !response.startsWith('Error:')) {
            return response.trim();
        }
    } catch (e) {
        console.warn('AI coach response failed:', e);
    }

    // Fallback to template if AI fails
    return getFallbackResponse(intent, stats);
}

// Fallback template responses (used when AI is unavailable)
function getFallbackResponse(intent, stats) {
    switch (intent.type) {
        case 'log_food':
            return `Logged ${intent.food.mealName}. Keep pushing!`;
        case 'check_protein':
            return `${stats.protein}g protein today. ${stats.proteinGoal - stats.protein}g left.`;
        case 'check_calories':
            return `${stats.calories} calories today. ${stats.caloriesLeft} left.`;
        case 'check_water':
            return `${stats.waterCount} glasses of water today.`;
        default:
            return `Try saying "log water" or "how much protein today?"`;
    }
}

// ===========================
// VOICE COACH COMPONENT
// ===========================
const VoiceCoach = ({ updateData, analyzeFood, cleanAIResponse }) => {
    const [state, setState] = useState('idle'); // idle | listening | processing | speaking
    const [transcript, setTranscript] = useState('');
    const [coachText, setCoachText] = useState('');
    const [showBubble, setShowBubble] = useState(false);
    const recognitionRef = useRef(null);
    const timeoutRef = useRef(null);

    const { meals, workouts, profile } = useStore();

    // Compute today's stats from store
    const getStats = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaysMeals = meals.filter(m => m.date === today);
        const calories = todaysMeals.reduce((s, m) => s + (m.calories || 0), 0);
        const protein = todaysMeals.reduce((s, m) => s + (m.protein || 0), 0);
        const waterCount = todaysMeals.filter(m => m.mealName === 'Water').length;
        const todaysWorkouts = workouts.filter(w => {
            const d = w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000) : new Date(w.createdAt || w.date);
            return d.toISOString().split('T')[0] === today;
        });

        return {
            calories,
            protein,
            proteinGoal: profile?.dailyProtein || 150,
            caloriesLeft: Math.max(0, (profile?.dailyCalories || 2000) - calories),
            waterCount,
            workoutsDone: todaysWorkouts.length,
        };
    }, [meals, workouts, profile]);

    // Load voices on mount
    useEffect(() => {
        window.speechSynthesis?.getVoices();
        const handleVoicesChanged = () => window.speechSynthesis?.getVoices();
        window.speechSynthesis?.addEventListener?.('voiceschanged', handleVoicesChanged);
        return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', handleVoicesChanged);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            window.speechSynthesis?.cancel();
            clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleResult = useCallback(async (text) => {
        setTranscript(text);
        setState('processing');

        const intent = parseIntent(text);
        const stats = getStats();
        let actionResult = null;

        // Execute the action
        if (intent.type === 'log_food' && intent.food) {
            await updateData('add', 'meals', intent.food);
        } else if (intent.type === 'log_ai' && analyzeFood && cleanAIResponse) {
            try {
                const res = await analyzeFood(intent.raw);
                const result = cleanAIResponse(res);
                if (result?.mealName) {
                    await updateData('add', 'meals', result);
                    intent.food = result;
                    intent.type = 'log_food';
                    actionResult = result;
                }
            } catch {
                // AI food analysis failed
            }
        }

        // Get AI-powered coach response
        const response = await getAICoachResponse(text, intent, stats, actionResult);
        setCoachText(response);
        setShowBubble(true);
        setState('speaking');

        speak(response, () => {
            setState('idle');
            timeoutRef.current = setTimeout(() => setShowBubble(false), 5000);
        });
    }, [getStats, updateData, analyzeFood, cleanAIResponse]);

    const startListening = useCallback(async () => {
        clearTimeout(timeoutRef.current);
        window.speechSynthesis?.cancel();

        const isNative = Capacitor.isNativePlatform();

        if (isNative) {
            try {
                // Request permissions first
                const permissions = await SpeechRecognition.checkPermissions();
                if (permissions.speechRecognition !== 'granted') {
                    const req = await SpeechRecognition.requestPermissions();
                    if (req.speechRecognition !== 'granted') {
                        setCoachText("Microphone permission denied.");
                        setShowBubble(true);
                        setTimeout(() => setShowBubble(false), 3000);
                        return;
                    }
                }

                setState('listening');
                setTranscript('');
                setCoachText('');
                setShowBubble(true);

                // Start native listening
                SpeechRecognition.start({
                    language: "en-US",
                    maxResults: 1,
                    prompt: "Coach Iron is listening...",
                    partialResults: true,
                    popup: false,
                });

                // Listen for native results
                SpeechRecognition.addListener("partialResults", (data) => {
                    if (data.matches && data.matches.length > 0) {
                        setTranscript(data.matches[0]);
                    }
                });

                // Listen for when native listening stops naturally or manually
                // We add a one-off listener to handle the final result if native supports it this way
                // Or wait for the stop command

                // Capacitor SpeechRecognition resolves the promise when listening finishes (either by timeout or manual stop)
                // However, the standard behavior in v8 is that it just emits events. We'll handle cleanup in `stopListening`

            } catch (e) {
                console.error("Native SpeechRecognition Error:", e);
                setCoachText("Voice input failed. Try again.");
                setShowBubble(true);
                setTimeout(() => setShowBubble(false), 3000);
                setState('idle');
            }
            return;
        }

        // --- WEB FALLBACK ---
        const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!WebSpeechRecognition) {
            setCoachText("Sorry, your browser doesn't support voice input.");
            setShowBubble(true);
            setTimeout(() => setShowBubble(false), 3000);
            return;
        }

        const recognition = new WebSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            handleResult(text);
        };

        recognition.onerror = (event) => {
            if (event.error !== 'aborted') {
                setCoachText("Couldn't hear you. Tap the mic and try again.");
                setShowBubble(true);
                setTimeout(() => setShowBubble(false), 3000);
            }
            setState('idle');
        };

        recognition.onend = () => {
            if (state === 'listening') setState('idle');
        };

        recognitionRef.current = recognition;
        recognition.start();
        setState('listening');
        setTranscript('');
        setCoachText('');
        setShowBubble(true);
    }, [handleResult, state]);

    const stopListening = useCallback(async () => {
        const isNative = Capacitor.isNativePlatform();

        if (isNative) {
            try {
                await SpeechRecognition.stop();
                // If we have a transcript from partial results, submit it
                if (transcript.trim() !== '') {
                    handleResult(transcript);
                } else {
                    setState('idle');
                }
            } catch (e) {
                console.error("Failed to stop native speech:", e);
                setState('idle');
            }
        } else {
            recognitionRef.current?.stop();
            // the onresult/onerror/onend handlers deal with state transitions for web
        }
    }, [transcript, handleResult]);

    const toggleListening = () => {
        if (state === 'listening') stopListening();
        else if (state === 'idle') startListening();
    };

    const dismissBubble = () => {
        setShowBubble(false);
        window.speechSynthesis?.cancel();
        setState('idle');
    };

    return (
        <>
            {/* Chat Bubble */}
            <AnimatePresence>
                {showBubble && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="fixed bottom-28 left-4 z-50 max-w-[280px]"
                    >
                        <div
                            className="relative rounded-2xl p-4 shadow-2xl"
                            style={{
                                background: 'linear-gradient(145deg, rgba(25, 25, 25, 0.98) 0%, rgba(15, 15, 15, 0.98) 100%)',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                boxShadow: '0 0 30px rgba(220, 38, 38, 0.1), 0 20px 40px rgba(0, 0, 0, 0.6)',
                            }}
                        >
                            <button
                                onClick={dismissBubble}
                                className="absolute top-2 right-2 p-1 rounded-full text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={12} />
                            </button>

                            {state === 'listening' && (
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                className="w-1.5 h-4 bg-red-500 rounded-full"
                                                animate={{ scaleY: [0.4, 1, 0.4] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Listening...</p>
                                </div>
                            )}

                            {state === 'processing' && (
                                <div>
                                    {transcript && (
                                        <p className="text-xs text-gray-500 mb-1 italic">"{transcript}"</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-xs text-gray-400 font-bold">Processing...</p>
                                    </div>
                                </div>
                            )}

                            {(state === 'speaking' || state === 'idle') && coachText && (
                                <div>
                                    {transcript && (
                                        <p className="text-xs text-gray-500 mb-2 italic">"{transcript}"</p>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <Volume2 size={14} className="text-red-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-white font-medium leading-relaxed">{coachText}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Tail pointing to the mic button */}
                        <div
                            className="absolute -bottom-2 right-6 w-4 h-4 rotate-45"
                            style={{
                                background: 'rgba(15, 15, 15, 0.98)',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                borderTop: 'none',
                                borderLeft: 'none',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Mic Button */}
            <motion.button
                data-keyboard-hide
                onClick={toggleListening}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-28 left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                style={{
                    background: state === 'listening'
                        ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                        : 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                    border: `2px solid ${state === 'listening' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(220, 38, 38, 0.3)'}`,
                    boxShadow: state === 'listening'
                        ? '0 0 30px rgba(220, 38, 38, 0.5), 0 8px 25px rgba(0, 0, 0, 0.5)'
                        : '0 0 15px rgba(220, 38, 38, 0.1), 0 8px 25px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Pulse rings when listening */}
                {state === 'listening' && (
                    <>
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-red-500"
                            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-red-500"
                            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                        />
                    </>
                )}
                {state === 'listening' ? (
                    <MicOff size={22} className="text-white relative z-10" />
                ) : (
                    <Mic size={22} className={`relative z-10 ${state !== 'idle' ? 'text-red-400' : 'text-gray-300'}`} />
                )}
            </motion.button>
        </>
    );
};

export default VoiceCoach;
