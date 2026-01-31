import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Voice Commands Hook for IronCore AI
 * Uses Web Speech API for hands-free workout logging
 */
export function useVoiceCommands({ onCommand, onLog }) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);

    // Check browser support
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognition);

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                setTranscript(interimTranscript || finalTranscript);

                if (finalTranscript) {
                    processCommand(finalTranscript.toLowerCase().trim());
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                if (isListening) {
                    recognition.start(); // Auto-restart for continuous listening
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // Command parser
    const processCommand = useCallback((text) => {
        // Wake word check
        const wakeWords = ['hey ironcore', 'hey iron core', 'ok ironcore', 'iron'];
        const hasWakeWord = wakeWords.some(w => text.includes(w));

        // Remove wake word from command
        let command = text;
        wakeWords.forEach(w => {
            command = command.replace(w, '').trim();
        });

        // Parse commands
        const commands = {
            // Workout logging
            log: /log (\d+) (.+)/i,
            complete: /complete (.+)/i,
            finish: /finish (set|workout|session)/i,

            // Timer controls
            start: /start (timer|rest|workout)/i,
            stop: /stop (timer|rest|workout)/i,
            pause: /pause/i,

            // Navigation
            go: /go to (.+)/i,
            show: /show (.+)/i,
            open: /open (.+)/i,

            // Quick actions
            water: /log water|drink water|add water/i,
            weight: /log weight (\d+\.?\d*)/i,
        };

        // Match and execute
        for (const [action, pattern] of Object.entries(commands)) {
            const match = command.match(pattern);
            if (match) {
                const result = {
                    action,
                    params: match.slice(1),
                    raw: text,
                    hasWakeWord
                };

                onCommand?.(result);
                onLog?.(`Voice: ${action} - ${match.slice(1).join(', ')}`);

                // Speak confirmation
                speak(`${action} ${match.slice(1).join(' ')}`);
                return result;
            }
        }

        // No match - could be a general query for AI coach
        if (hasWakeWord && command.length > 3) {
            onCommand?.({ action: 'query', params: [command], raw: text, hasWakeWord });
        }

        return null;
    }, [onCommand, onLog]);

    // Text-to-speech feedback
    const speak = useCallback((text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    // Toggle listening
    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setTranscript('');
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            speak('Listening');
        }
    }, [isListening, speak]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setTranscript('');
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        isSupported,
        toggleListening,
        startListening,
        stopListening,
        speak,
    };
}

export default useVoiceCommands;


