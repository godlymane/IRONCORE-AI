import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, AlertCircle, CheckCircle, XCircle, Camera, RotateCcw, ChevronDown, Gauge, Volume2, VolumeX, Vibrate } from 'lucide-react';
import { Button } from './UIComponents';
import { initializeTFBackend, resetBackend } from '../lib/tfBackend';
import { createPerformanceMonitor, getPerformanceMode, setPerformanceMode as savePerfMode } from '../lib/performanceMonitor';
import { detectDeviceCapability, lazyLoadPoseDetector } from '../utils/tfBackendSelector';
import { FormAnalysisEngine } from '../utils/formAnalysisEngine';
import { FormCanvasRenderer } from '../utils/formCanvasRenderer';
import { FormFeedbackManager } from '../utils/formFeedbackManager';
import { EXERCISE_CONFIGS, EXERCISE_TIER, getExercisesByTier, PHASE } from '../utils/formExerciseConfigs';
import { getVoiceEnabled, setVoiceEnabled } from '../utils/speechService';

/**
 * AI Form Coach — Elite Real-time Pose Detection & Exercise Feedback
 *
 * Features:
 * - Phase-aware state machine (eccentric/bottom/concentric/lockout)
 * - Resolution-independent normalized thresholds
 * - Auto side detection (best confidence side)
 * - Confidence-weighted scoring with temporal smoothing
 * - Voice cues via Web Speech API
 * - Haptic feedback via Capacitor
 * - 12 exercises (6 free + 6 elite)
 * - Per-rep tracking, fatigue detection, bar path, ghost overlay (elite)
 * - Session summary with optional AI analysis (elite)
 *
 * Memory-safe: detector + TF backend are initialized on mount and fully
 * disposed on unmount. All inference runs inside tf.tidy() to prevent
 * tensor leaks that crash iOS Safari.
 */

// FPS + resolution by device capability
const DEVICE_PROFILES = {
  flagship: { fps: 30, width: 640, height: 720, frameRate: 30 },
  midrange: { fps: 20, width: 480, height: 640, frameRate: 24 },
  budget:   { fps: 10, width: 320, height: 480, frameRate: 15 },
};

export const FormCoach = ({ exercise: initialExercise = 'squat', isEliteTier = false, onComplete, onShowSummary }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [detector, setDetector] = useState(null);
    const [error, setError] = useState(null);
    const [exercise, setExercise] = useState(initialExercise);
    const [showPicker, setShowPicker] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [liveFPS, setLiveFPS] = useState(0);
    const [showLowFPSPrompt, setShowLowFPSPrompt] = useState(false);

    // New elite state
    const [repCount, setRepCount] = useState(0);
    const [formScore, setFormScore] = useState(0);
    const [currentPhase, setCurrentPhase] = useState(PHASE.IDLE);
    const [activeSide, setActiveSide] = useState('left');
    const [voiceOn, setVoiceOn] = useState(() => getVoiceEnabled());
    const [hapticsOn, setHapticsOn] = useState(true);
    const [feedback, setFeedback] = useState([]); // checkpoint results for UI cards
    const [coachedTip, setCoachedTip] = useState('');

    // Refs
    const animationRef = useRef(null);
    const isStreamingRef = useRef(false);
    const lastInferenceRef = useRef(0);
    const detectorRef = useRef(null);
    const perfMonitorRef = useRef(null);
    const tfRef = useRef(null);
    const feedbackCountRef = useRef(0);

    // Engine refs
    const engineRef = useRef(null);
    const rendererRef = useRef(null);
    const feedbackMgrRef = useRef(null);

    const perfMode = getPerformanceMode();
    const deviceCapability = useRef(null);

    // Determine device profile
    if (!deviceCapability.current) {
        try { deviceCapability.current = detectDeviceCapability(); } catch (_err) { /* expected on unsupported devices */ deviceCapability.current = 'midrange'; }
    }
    const profile = DEVICE_PROFILES[deviceCapability.current] || DEVICE_PROFILES.midrange;
    const TARGET_FPS = perfMode === 'low_power' ? 10 : profile.fps;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    // Available exercises based on tier
    const availableTier = isEliteTier ? EXERCISE_TIER.TIER_2 : EXERCISE_TIER.TIER_1;
    const availableExercises = getExercisesByTier(availableTier);
    const currentConfig = EXERCISE_CONFIGS[exercise] || EXERCISE_CONFIGS.squat;

    // ── Initialize engine, renderer, feedback manager on exercise change ──
    useEffect(() => {
        const vw = profile.width;
        const vh = profile.height;
        engineRef.current = new FormAnalysisEngine(exercise, vw, vh);
        if (!rendererRef.current) rendererRef.current = new FormCanvasRenderer();
        if (!feedbackMgrRef.current) feedbackMgrRef.current = new FormFeedbackManager();

        feedbackMgrRef.current.setVoiceEnabled(voiceOn);
        feedbackMgrRef.current.setHapticsEnabled(hapticsOn);

        // Reset counters
        setRepCount(0);
        setFormScore(0);
        setCurrentPhase(PHASE.IDLE);
        setFeedback([]);
    }, [exercise]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync voice/haptic toggles
    useEffect(() => {
        feedbackMgrRef.current?.setVoiceEnabled(voiceOn);
        setVoiceEnabled(voiceOn);
    }, [voiceOn]);

    useEffect(() => {
        feedbackMgrRef.current?.setHapticsEnabled(hapticsOn);
    }, [hapticsOn]);

    // ── Initialize TF Backend + MoveNet ──
    useEffect(() => {
        if (perfMode === 'manual') {
            setIsLoading(false);
            return;
        }

        let disposed = false;

        const init = async () => {
            try {
                await initializeTFBackend();

                const tf = await import('@tensorflow/tfjs');
                tfRef.current = tf;

                // Use lazyLoadPoseDetector which auto-selects Thunder on flagship
                const poseDetector = await lazyLoadPoseDetector();

                if (!disposed) {
                    detectorRef.current = poseDetector;
                    setDetector(poseDetector);
                    setIsLoading(false);
                } else {
                    poseDetector.dispose();
                }
            } catch (err) {
                if (!disposed) {
                    setError('Failed to load AI model. Check your connection and try again.');
                    setIsLoading(false);
                }
            }
        };

        init();

        return () => {
            disposed = true;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (detectorRef.current) {
                try { detectorRef.current.dispose(); } catch (_err) { /* expected if already disposed */ }
                detectorRef.current = null;
            }
            resetBackend();
            perfMonitorRef.current?.destroy();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Performance Monitor ──
    useEffect(() => {
        perfMonitorRef.current = createPerformanceMonitor({
            onLowFPS: () => setShowLowFPSPrompt(true)
        });
        return () => perfMonitorRef.current?.destroy();
    }, []);

    // Start camera
    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode,
                    width: { ideal: profile.width, max: 720 },
                    height: { ideal: profile.height, max: 960 },
                    frameRate: { ideal: profile.frameRate, max: 30 }
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    syncCanvasSize();
                    isStreamingRef.current = true;
                    setIsStreaming(true);

                    // Reset engine for new session
                    const vw = videoRef.current.videoWidth || profile.width;
                    const vh = videoRef.current.videoHeight || profile.height;
                    engineRef.current?.updateDimensions(vw, vh);
                    engineRef.current?.reset();
                    feedbackMgrRef.current?.reset();
                    setRepCount(0);
                    setFormScore(0);
                    feedbackCountRef.current = 0;
                    perfMonitorRef.current?.reset();
                    setCoachedTip('Position yourself so your full body is visible');
                    detectPose();
                };
            }
        } catch (err) {
            setError('Camera access denied. Allow camera in your device settings.');
        }
    };

    const syncCanvasSize = () => {
        if (!videoRef.current || !canvasRef.current) return;
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
    };

    // ── Orientation / resize handler — re-sync canvas when screen rotates ──
    useEffect(() => {
        const handleOrientationChange = () => {
            // Small delay to let the browser settle new dimensions
            setTimeout(() => {
                syncCanvasSize();
                // Update container aspect ratio for landscape
                if (containerRef.current) {
                    const isLandscape = window.innerWidth > window.innerHeight;
                    containerRef.current.style.aspectRatio = isLandscape ? '4/3' : '3/4';
                }
            }, 150);
        };

        window.addEventListener('resize', handleOrientationChange);
        // 'orientationchange' for mobile devices
        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const stopCamera = () => {
        isStreamingRef.current = false;
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    const flipCamera = () => {
        stopCamera();
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    useEffect(() => {
        if (isStreaming && detector) {
            stopCamera();
            setTimeout(() => startCamera(), 200);
        }
    }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Main detection loop ──
    const detectPose = async () => {
        if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const tf = tfRef.current;

        const detect = async (timestamp) => {
            if (!isStreamingRef.current) return;

            const elapsed = timestamp - lastInferenceRef.current;
            if (elapsed < FRAME_INTERVAL) {
                animationRef.current = requestAnimationFrame(detect);
                return;
            }
            lastInferenceRef.current = timestamp;

            try {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                }

                let poses;
                if (tf) {
                    poses = await tf.tidy(() => detectorRef.current.estimatePoses(video));
                } else {
                    poses = await detectorRef.current.estimatePoses(video);
                }

                perfMonitorRef.current?.tick();
                feedbackCountRef.current++;

                if (feedbackCountRef.current % 30 === 0) {
                    setLiveFPS(perfMonitorRef.current?.getFPS() || 0);
                }

                if (poses.length > 0) {
                    const pose = poses[0];
                    const keypoints = pose.keypoints;

                    // Mirror keypoints for front camera
                    const processedKps = facingMode === 'user'
                        ? keypoints.map(kp => ({ ...kp, x: canvas.width - kp.x }))
                        : keypoints;

                    // --- ENGINE: Process frame ---
                    const analysis = engineRef.current
                        ? engineRef.current.processFrame(processedKps)
                        : null;

                    if (analysis) {
                        // --- RENDERER: Draw overlay ---
                        rendererRef.current?.drawFrame(ctx, processedKps, analysis, {
                            showGhost: isEliteTier,
                            showBarPath: isEliteTier,
                            showScore: true,
                            showPhase: true,
                            isElite: isEliteTier,
                        });

                        // --- FEEDBACK: Voice + Haptics ---
                        feedbackMgrRef.current?.processFrame(analysis);

                        // Update React state (throttled)
                        if (analysis.repCount !== repCount) {
                            setRepCount(analysis.repCount);
                        }
                        if (feedbackCountRef.current % 5 === 0) {
                            setFormScore(analysis.score);
                            setCurrentPhase(analysis.phase);
                            setActiveSide(analysis.activeSide);
                        }

                        // Update feedback cards (throttled every 10 frames)
                        if (feedbackCountRef.current % 10 === 0) {
                            const cards = (analysis.checkpoints || [])
                                .filter(c => c.active && c.result)
                                .map(c => ({
                                    id: c.id,
                                    label: c.name,
                                    desc: c.description,
                                    passed: c.result.pass,
                                }));
                            setFeedback(cards);
                        }

                        // Coaching tips (every 90 frames ~3s)
                        if (feedbackCountRef.current % 90 === 0) {
                            const failing = (analysis.checkpoints || []).find(c => c.active && c.result && !c.result.pass);
                            if (failing) {
                                setCoachedTip(`Focus: ${failing.result.detail || failing.description}`);
                            } else if (analysis.score >= 85) {
                                setCoachedTip('Great form! Keep it up');
                            }
                        }
                    }
                }
            } catch (_err) { /* expected: inference may fail on dropped frames */ }

            animationRef.current = requestAnimationFrame(detect);
        };

        detect();
    };

    // Handle "Done" — get session summary and pass to parent
    const handleDone = () => {
        stopCamera();
        const summary = engineRef.current?.getSessionSummary() || null;
        if (onShowSummary && summary && summary.totalReps > 0) {
            onShowSummary(summary);
        }
        onComplete?.();
    };

    // Score colors
    const scoreColor = formScore >= 80 ? 'text-green-400' : formScore >= 50 ? 'text-yellow-400' : 'text-red-400';
    const scoreBg = formScore >= 80 ? 'from-green-500/20 to-green-600/10 border-green-500/30' : formScore >= 50 ? 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' : 'from-red-500/20 to-red-600/10 border-red-500/30';

    // Phase label
    const phaseLabel = {
        [PHASE.IDLE]: '',
        [PHASE.ECCENTRIC]: 'LOWERING',
        [PHASE.BOTTOM]: 'HOLD',
        [PHASE.CONCENTRIC]: 'LIFTING',
        [PHASE.LOCKOUT]: 'LOCKOUT',
    }[currentPhase] || '';

    // ── Manual Mode ──
    if (perfMode === 'manual') {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold"
                    >
                        <span>{currentConfig.icon}</span>
                        <span>{currentConfig.name}</span>
                        <ChevronDown size={14} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">{repCount}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Reps</div>
                    </div>
                </div>

                <AnimatePresence>
                    {showPicker && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <ExercisePicker exercises={availableExercises} current={exercise} isElite={isEliteTier} onSelect={(id) => { setExercise(id); setShowPicker(false); setRepCount(0); }} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col items-center gap-4 py-8">
                    <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 font-medium text-center">
                        Manual Mode — Camera disabled to save battery. Tap to count reps.
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => setRepCount(prev => Math.max(0, prev - 1))} variant="secondary">- Rep</Button>
                        <Button onClick={() => setRepCount(prev => prev + 1)} variant="primary" className="px-8">+ Rep</Button>
                    </div>
                </div>

                <Button onClick={() => onComplete?.()} variant="primary" className="w-full">Done ({repCount} reps)</Button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-4 text-sm">{error}</p>
                <Button onClick={() => { setError(null); setIsLoading(true); }} variant="secondary">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Low FPS Prompt */}
            <AnimatePresence>
                {showLowFPSPrompt && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-start gap-3">
                        <Gauge size={18} className="text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs text-orange-300 font-bold">Low performance detected</p>
                            <p className="text-[11px] text-orange-400/70 mt-0.5">
                                Your device is struggling at {liveFPS} FPS. Switch to Manual Mode for a smoother experience.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => { stopCamera(); savePerfMode('manual'); window.location.reload(); }}
                                    className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-[11px] font-bold">
                                    Switch to Manual
                                </button>
                                <button onClick={() => setShowLowFPSPrompt(false)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[11px]">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exercise Picker + Score + Toggles */}
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold">
                    <span>{currentConfig.icon}</span>
                    <span>{currentConfig.name}</span>
                    <ChevronDown size={14} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
                </button>

                {isStreaming && (
                    <div className="flex items-center gap-2">
                        {/* Voice toggle */}
                        <button onClick={() => setVoiceOn(v => !v)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${voiceOn ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-600'}`}>
                            {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </button>

                        {/* Haptic toggle */}
                        <button onClick={() => setHapticsOn(h => !h)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${hapticsOn ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600'}`}>
                            <Vibrate size={14} />
                        </button>

                        {/* FPS */}
                        {liveFPS > 0 && (
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold ${
                                liveFPS >= 20 ? 'bg-green-500/10 text-green-400' :
                                liveFPS >= 12 ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-red-500/10 text-red-400'
                            }`}>
                                {liveFPS}
                            </div>
                        )}

                        {/* Reps */}
                        <div className="text-center min-w-[36px]">
                            <div className="text-xl font-black text-white leading-none">{repCount}</div>
                            <div className="text-[9px] text-gray-500 uppercase font-bold">Reps</div>
                        </div>

                        {/* Score */}
                        <div className={`px-2.5 py-1.5 rounded-xl border bg-gradient-to-br ${scoreBg}`}>
                            <div className={`text-lg font-black leading-none ${scoreColor}`}>{formScore}</div>
                            <div className="text-[9px] text-gray-500 uppercase font-bold">Form</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Exercise Picker Dropdown */}
            <AnimatePresence>
                {showPicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <ExercisePicker
                            exercises={availableExercises}
                            current={exercise}
                            isElite={isEliteTier}
                            onSelect={(id) => { setExercise(id); setShowPicker(false); }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Video Area */}
            <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-black/50" style={{ aspectRatio: window.innerWidth > window.innerHeight ? '4/3' : '3/4', maxHeight: '80vh' }}>
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-white/60">Loading AI Model...</p>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                            playsInline muted />
                        <canvas ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}} />

                        {/* Coaching Tip Overlay */}
                        {isStreaming && coachedTip && (
                            <div className="absolute top-3 left-3 right-3 z-10">
                                <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-white font-medium text-center">
                                    {coachedTip}
                                </div>
                            </div>
                        )}

                        {/* Phase badge (bottom center) */}
                        {isStreaming && phaseLabel && (
                            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10">
                                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 text-[11px] font-bold text-white/80 uppercase tracking-wider">
                                    {phaseLabel}
                                </div>
                            </div>
                        )}

                        {/* Camera flip */}
                        {isStreaming && (
                            <button onClick={flipCamera}
                                className="absolute bottom-3 right-3 z-10 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/80">
                                <RotateCcw size={16} />
                            </button>
                        )}

                        {!isStreaming && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-4">
                                <Camera className="w-12 h-12 text-red-400" />
                                <p className="text-white font-bold text-lg">AI Form Coach</p>
                                <p className="text-gray-400 text-xs text-center px-6">
                                    Real-time analysis with voice cues & haptic feedback
                                </p>
                                <Button onClick={startCamera} variant="primary">
                                    <Video className="w-4 h-4 mr-2" /> Start Camera
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Form Feedback Cards */}
            <AnimatePresence>
                {isStreaming && feedback.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-3 gap-2">
                        {feedback.map((item) => (
                            <div key={item.id}
                                className={`p-2.5 rounded-xl text-center border ${
                                    item.passed
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-red-500/10 border-red-500/30'
                                }`}>
                                {item.passed ? (
                                    <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                                )}
                                <p className={`text-[11px] font-bold ${item.passed ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            {isStreaming && (
                <div className="flex gap-2">
                    <Button onClick={stopCamera} variant="danger" className="flex-1">
                        <VideoOff className="w-4 h-4 mr-2" /> Stop
                    </Button>
                    <Button onClick={handleDone} variant="primary" className="flex-1">
                        Done ({repCount} reps)
                    </Button>
                </div>
            )}
        </div>
    );
};

// ── Exercise Picker Grid ──
function ExercisePicker({ exercises, current, isElite, onSelect }) {
    return (
        <div className="grid grid-cols-3 gap-2 pb-2">
            {exercises.map((ex) => {
                const locked = ex.tier === EXERCISE_TIER.TIER_2 && !isElite;
                return (
                    <button key={ex.id}
                        onClick={() => !locked && onSelect(ex.id)}
                        disabled={locked}
                        className={`p-3 rounded-xl border text-center transition-all ${
                            locked
                                ? 'border-white/5 bg-white/[0.02] opacity-50'
                                : current === ex.id
                                    ? 'border-red-500 bg-red-900/30'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}>
                        <div className="text-xl mb-1">{ex.icon}</div>
                        <div className={`text-[11px] font-bold ${
                            locked ? 'text-gray-600' : current === ex.id ? 'text-white' : 'text-gray-400'
                        }`}>
                            {ex.name}
                        </div>
                        {locked && <div className="text-[9px] text-gray-600 mt-0.5">ELITE</div>}
                    </button>
                );
            })}
        </div>
    );
}

export default FormCoach;
