import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Voice Commands Hook for IronCore AI
 * "Hey IronCore" wake word activation + voice coach responses
 *
 * Flow: Background listening → Wake word detected → Active listening →
 *       Process command → AI responds → Speak response → Back to background
 */

const WAKE_WORDS = ['hey ironcore', 'hey iron core', 'ok ironcore', 'ok iron core', 'iron core'];

// Voice states
const VOICE_STATE = {
    IDLE: 'idle',           // Not started
    LISTENING: 'listening', // Background wake word detection
    ACTIVE: 'active',       // Actively capturing user command after wake word
    PROCESSING: 'processing', // Sending to AI
    SPEAKING: 'speaking',   // Coach is speaking response
};

export function useVoiceCommands({ onCommand, onQuery, enabled = false }) {
    const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const [lastResponse, setLastResponse] = useState('');

    const recognitionRef = useRef(null);
    const voiceStateRef = useRef(VOICE_STATE.IDLE);
    const silenceTimerRef = useRef(null);
    const restartTimerRef = useRef(null);
    const enabledRef = useRef(enabled);
    const processVoiceInputRef = useRef(null);

    // Keep refs in sync
    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        voiceStateRef.current = voiceState;
    }, [voiceState]);

    // Text-to-speech — coach speaks back
    const speak = useCallback((text, onDone) => {
        if (!text || !('speechSynthesis' in window)) {
            onDone?.();
            return;
        }

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        utterance.volume = 1;

        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en-US') && !v.name.includes('Female')) ||
            voices.find(v => v.lang.startsWith('en'));
        if (preferred) utterance.voice = preferred;

        // Fallback timeout in case onend never fires (Chrome bug)
        const speakTimeout = setTimeout(() => {
            window.speechSynthesis.cancel();
            onDone?.();
        }, 15000);

        utterance.onend = () => {
            clearTimeout(speakTimeout);
            onDone?.();
        };
        utterance.onerror = () => {
            clearTimeout(speakTimeout);
            onDone?.();
        };

        setVoiceState(VOICE_STATE.SPEAKING);
        window.speechSynthesis.speak(utterance);
    }, []);

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognition);

        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += t;
                } else {
                    interimTranscript += t;
                }
            }

            const currentState = voiceStateRef.current;

            if (currentState === VOICE_STATE.LISTENING) {
                // Background mode — only look for wake word
                const combined = (finalTranscript + interimTranscript).toLowerCase();
                const hasWake = WAKE_WORDS.some(w => combined.includes(w));
                if (hasWake) {
                    // Wake word detected! Switch to active mode
                    setTranscript('');
                    setVoiceState(VOICE_STATE.ACTIVE);
                    voiceStateRef.current = VOICE_STATE.ACTIVE;

                    // Play activation sound via quick beep
                    playActivationSound();

                    // Set silence timeout — if no speech for 5s, go back to background
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = setTimeout(() => {
                        if (voiceStateRef.current === VOICE_STATE.ACTIVE) {
                            setVoiceState(VOICE_STATE.LISTENING);
                            voiceStateRef.current = VOICE_STATE.LISTENING;
                            setTranscript('');
                        }
                    }, 5000);
                }
            } else if (currentState === VOICE_STATE.ACTIVE) {
                // Active mode — capture the actual command
                setTranscript(interimTranscript || finalTranscript);

                // Reset silence timer on any speech
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                    if (voiceStateRef.current === VOICE_STATE.ACTIVE) {
                        // Silence after speech — process what we have
                        setVoiceState(VOICE_STATE.LISTENING);
                        voiceStateRef.current = VOICE_STATE.LISTENING;
                        setTranscript('');
                    }
                }, 3000);

                if (finalTranscript) {
                    // Got final transcript — process the command
                    clearTimeout(silenceTimerRef.current);
                    const cleanCmd = cleanWakeWords(finalTranscript.trim());

                    if (cleanCmd.length > 2) {
                        processVoiceInputRef.current?.(cleanCmd);
                    }
                }
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setIsSupported(false);
                return;
            }
            // For aborted/no-speech errors, just restart if enabled
            if (enabledRef.current && (event.error === 'no-speech' || event.error === 'aborted')) {
                scheduleRestart();
            }
        };

        recognition.onend = () => {
            // Auto-restart if still enabled (handles browser auto-stop)
            if (enabledRef.current && voiceStateRef.current !== VOICE_STATE.IDLE) {
                scheduleRestart();
            }
        };

        recognitionRef.current = recognition;

        return () => {
            clearTimeout(silenceTimerRef.current);
            clearTimeout(restartTimerRef.current);
            try { recognition.abort(); } catch (_err) { /* expected: recognition may already be stopped */ }
            // Close reusable AudioContext to free native audio resources
            try { activationCtxRef.current?.close(); } catch (_err) { /* expected: context may already be closed */ }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Restart recognition with a small delay to avoid rapid restart errors
    const scheduleRestart = useCallback(() => {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
            if (recognitionRef.current && enabledRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (_err) {
                    /* expected: recognition may already be started */
                }
            }
        }, 300);
    }, []);

    // Remove wake words from the command text
    const cleanWakeWords = (text) => {
        let clean = text.toLowerCase();
        WAKE_WORDS.forEach(w => {
            clean = clean.replace(new RegExp(w, 'gi'), '');
        });
        return clean.trim();
    };

    // Process voice input — match commands or send to AI
    const processVoiceInput = useCallback((text) => {
        const lower = text.toLowerCase();

        // Quick command patterns
        const commands = {
            log_water: /^(log|add|drink) water$/i,
            log_weight: /^log weight (\d+\.?\d*)/i,
            start_timer: /^start (timer|rest)/i,
            stop_timer: /^stop (timer|rest)/i,
            open_form: /^(open|show|start) form/i,
            open_coach: /^(open|show) (coach|chat)/i,
            open_nutrition: /^(open|show) (nutrition|food|meals)/i,
            open_stats: /^(open|show) (stats|analytics)/i,
        };

        for (const [action, pattern] of Object.entries(commands)) {
            const match = lower.match(pattern);
            if (match) {
                const result = { action, params: match.slice(1), raw: text };
                onCommand?.(result);

                // Quick confirmation
                const confirmations = {
                    log_water: "Water logged!",
                    log_weight: `Weight ${match[1]} logged.`,
                    start_timer: "Timer started.",
                    stop_timer: "Timer stopped.",
                    open_form: "Opening form coach.",
                    open_coach: "Opening chat.",
                    open_nutrition: "Opening nutrition.",
                    open_stats: "Opening analytics.",
                };

                speak(confirmations[action] || "Done.", () => {
                    setVoiceState(VOICE_STATE.LISTENING);
                    voiceStateRef.current = VOICE_STATE.LISTENING;
                });
                return;
            }
        }

        // No command matched — send to AI coach as a question
        setVoiceState(VOICE_STATE.PROCESSING);
        voiceStateRef.current = VOICE_STATE.PROCESSING;

        onQuery?.(text, (aiResponse) => {
            // Callback from parent with AI response
            setLastResponse(aiResponse);
            speak(aiResponse, () => {
                setVoiceState(VOICE_STATE.LISTENING);
                voiceStateRef.current = VOICE_STATE.LISTENING;
            });
        });
    }, [onCommand, onQuery, speak]);

    // Keep ref in sync so the recognition.onresult handler always calls the latest version
    useEffect(() => {
        processVoiceInputRef.current = processVoiceInput;
    }, [processVoiceInput]);

    // Shared AudioContext for activation sounds — reuse to prevent leak
    const activationCtxRef = useRef(null);
    const playActivationSound = useCallback(() => {
        try {
            if (!activationCtxRef.current || activationCtxRef.current.state === 'closed') {
                activationCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = activationCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (_err) { /* expected: AudioContext may not be available */ }
    }, []);

    // Start/stop based on enabled prop
    useEffect(() => {
        if (!recognitionRef.current) return;

        if (enabled) {
            setVoiceState(VOICE_STATE.LISTENING);
            voiceStateRef.current = VOICE_STATE.LISTENING;
            try {
                recognitionRef.current.start();
            } catch (_err) { /* expected: recognition may already be started */ }
        } else {
            clearTimeout(silenceTimerRef.current);
            clearTimeout(restartTimerRef.current);
            try { recognitionRef.current.abort(); } catch (_err) { /* expected: recognition may already be stopped */ }
            setVoiceState(VOICE_STATE.IDLE);
            voiceStateRef.current = VOICE_STATE.IDLE;
            setTranscript('');
            window.speechSynthesis?.cancel();
        }
    }, [enabled]);

    // Manual activate (for tap-to-talk fallback)
    const manualActivate = useCallback(() => {
        const wasIdle = voiceStateRef.current === VOICE_STATE.IDLE;
        if (voiceStateRef.current === VOICE_STATE.LISTENING || wasIdle) {
            playActivationSound();
            setVoiceState(VOICE_STATE.ACTIVE);
            voiceStateRef.current = VOICE_STATE.ACTIVE;
            setTranscript('');

            // If was idle (not already listening), start recognition
            if (wasIdle && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (_err) { /* expected: recognition may already be started */ }
            }

            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (voiceStateRef.current === VOICE_STATE.ACTIVE) {
                    setVoiceState(enabledRef.current ? VOICE_STATE.LISTENING : VOICE_STATE.IDLE);
                    voiceStateRef.current = enabledRef.current ? VOICE_STATE.LISTENING : VOICE_STATE.IDLE;
                    setTranscript('');
                }
            }, 6000);
        }
    }, [playActivationSound]);

    return {
        voiceState,
        transcript,
        isSupported,
        lastResponse,
        speak,
        manualActivate,
        VOICE_STATE,
    };
}

export default useVoiceCommands;
