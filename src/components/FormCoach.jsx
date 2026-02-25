import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, AlertCircle, CheckCircle, XCircle, Camera, RotateCcw, ChevronDown, Gauge } from 'lucide-react';
import { Button } from './UIComponents';
import { initializeTFBackend, resetBackend } from '../lib/tfBackend';
import { createPerformanceMonitor, getPerformanceMode, setPerformanceMode as savePerfMode } from '../lib/performanceMonitor';

/**
 * AI Form Coach — Real-time pose detection & exercise feedback
 *
 * Memory-safe: detector + TF backend are initialized on mount and fully
 * disposed on unmount. All inference runs inside tf.tidy() to prevent
 * tensor leaks that crash iOS Safari.
 */

const EXERCISES = {
    squat: {
        name: 'Squat',
        icon: '🏋️',
        checkpoints: [
            { id: 'depth', label: 'Depth', desc: 'Hips below knees' },
            { id: 'knees', label: 'Knee Track', desc: 'Over toes, not caving' },
            { id: 'back', label: 'Back', desc: 'Neutral spine, chest up' },
        ],
        repDetect: { joint: 'left_hip', axis: 'y', direction: 'down' },
    },
    pushup: {
        name: 'Push-Up',
        icon: '💪',
        checkpoints: [
            { id: 'elbows', label: 'Elbows', desc: '45° angle' },
            { id: 'hips', label: 'Hip Line', desc: 'Straight body' },
            { id: 'depth', label: 'ROM', desc: 'Chest near floor' },
        ],
        repDetect: { joint: 'left_shoulder', axis: 'y', direction: 'down' },
    },
    deadlift: {
        name: 'Deadlift',
        icon: '🔥',
        checkpoints: [
            { id: 'spine', label: 'Spine', desc: 'Neutral back' },
            { id: 'hinge', label: 'Hip Hinge', desc: 'Push hips back' },
            { id: 'lockout', label: 'Lockout', desc: 'Full extension' },
        ],
        repDetect: { joint: 'left_hip', axis: 'y', direction: 'up' },
    },
    lunge: {
        name: 'Lunge',
        icon: '🦵',
        checkpoints: [
            { id: 'front_knee', label: 'Front Knee', desc: '90° angle' },
            { id: 'torso', label: 'Torso', desc: 'Upright posture' },
            { id: 'back_knee', label: 'Back Knee', desc: 'Near floor' },
        ],
        repDetect: { joint: 'left_knee', axis: 'y', direction: 'down' },
    },
    shoulder_press: {
        name: 'Shoulder Press',
        icon: '🙌',
        checkpoints: [
            { id: 'path', label: 'Bar Path', desc: 'Straight up' },
            { id: 'elbows', label: 'Elbows', desc: 'Under wrists' },
            { id: 'lockout', label: 'Lockout', desc: 'Full extension' },
        ],
        repDetect: { joint: 'left_wrist', axis: 'y', direction: 'up' },
    },
    plank: {
        name: 'Plank',
        icon: '🧱',
        checkpoints: [
            { id: 'hips', label: 'Hip Line', desc: 'Not sagging' },
            { id: 'shoulders', label: 'Shoulders', desc: 'Over wrists' },
            { id: 'head', label: 'Head', desc: 'Neutral neck' },
        ],
        repDetect: null, // Timed, not reps
    },
};

const MIN_CONFIDENCE = 0.35;

export const FormCoach = ({ exercise: initialExercise = 'squat', onComplete }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [detector, setDetector] = useState(null);
    const [feedback, setFeedback] = useState([]);
    const [repCount, setRepCount] = useState(0);
    const [formScore, setFormScore] = useState(0);
    const [error, setError] = useState(null);
    const [exercise, setExercise] = useState(initialExercise);
    const [showPicker, setShowPicker] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [coachedTip, setCoachedTip] = useState('');
    const [liveFPS, setLiveFPS] = useState(0);
    const [showLowFPSPrompt, setShowLowFPSPrompt] = useState(false);

    const animationRef = useRef(null);
    const isStreamingRef = useRef(false);
    const repStateRef = useRef({ phase: 'up', lastY: 0, threshold: 30, cooldown: false });
    const scoreHistoryRef = useRef([]);
    const feedbackCountRef = useRef(0);
    const lastInferenceRef = useRef(0);
    const detectorRef = useRef(null);      // mirror of state for cleanup
    const perfMonitorRef = useRef(null);
    const tfRef = useRef(null);            // hold tf module reference for tidy()

    const perfMode = getPerformanceMode();
    const TARGET_FPS = perfMode === 'low_power' ? 10 : 15;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const currentExercise = EXERCISES[exercise] || EXERCISES.squat;

    // ── Initialize TF Backend + MoveNet (lazy — only when this component mounts) ──
    useEffect(() => {
        // Manual mode = skip all AI initialization
        if (perfMode === 'manual') {
            setIsLoading(false);
            return;
        }

        let disposed = false;

        const init = async () => {
            try {
                // 1. Initialize the fastest available backend (WebGL → WASM → CPU)
                await initializeTFBackend();

                // 2. Dynamic-import TF and pose-detection (code-split from main bundle)
                const tf = await import('@tensorflow/tfjs');
                tfRef.current = tf;

                const poseDetection = await import('@tensorflow-models/pose-detection');
                const poseDetector = await poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    {
                        modelType: perfMode === 'low_power'
                            ? poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
                            : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
                    }
                );

                if (!disposed) {
                    detectorRef.current = poseDetector;
                    setDetector(poseDetector);
                    setIsLoading(false);
                } else {
                    // Component already unmounted — dispose immediately
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

        // ── CLEANUP: dispose detector + TF tensors + backend state ──
        return () => {
            disposed = true;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);

            // Dispose pose detector model
            if (detectorRef.current) {
                try { detectorRef.current.dispose(); } catch (_) {}
                detectorRef.current = null;
            }

            // Dispose all lingering tensors and reset backend state
            resetBackend();

            // Kill performance monitor
            perfMonitorRef.current?.destroy();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Performance Monitor ──
    useEffect(() => {
        perfMonitorRef.current = createPerformanceMonitor({
            onLowFPS: () => {
                setShowLowFPSPrompt(true);
            }
        });
        return () => perfMonitorRef.current?.destroy();
    }, []);

    // Start camera
    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode,
                    width: { ideal: perfMode === 'low_power' ? 320 : 480, max: 640 },
                    height: { ideal: perfMode === 'low_power' ? 240 : 360, max: 480 },
                    frameRate: { ideal: perfMode === 'low_power' ? 15 : 24, max: 30 }
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
                    setRepCount(0);
                    setFormScore(0);
                    scoreHistoryRef.current = [];
                    repStateRef.current = { phase: 'up', lastY: 0, threshold: 30, cooldown: false };
                    perfMonitorRef.current?.reset();
                    setCoachedTip('Position yourself so your full body is visible');
                    detectPose();
                };
            }
        } catch (err) {
            setError('Camera access denied. Allow camera in your device settings.');
        }
    };

    // Sync canvas to actual video dimensions
    const syncCanvasSize = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        canvasRef.current.width = v.videoWidth || 640;
        canvasRef.current.height = v.videoHeight || 480;
    };

    // Stop camera + release stream tracks
    const stopCamera = () => {
        isStreamingRef.current = false;
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    // Flip camera (front/rear)
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

    // ── Main detection loop (wrapped in tf.tidy to prevent tensor leaks) ──
    const detectPose = async () => {
        if (!detector || !videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const tf = tfRef.current;

        const detect = async (timestamp) => {
            if (!isStreamingRef.current) return;

            // Throttle inference to TARGET_FPS to save CPU/battery
            const elapsed = timestamp - lastInferenceRef.current;
            if (elapsed < FRAME_INTERVAL) {
                animationRef.current = requestAnimationFrame(detect);
                return;
            }
            lastInferenceRef.current = timestamp;

            try {
                // Ensure canvas matches video
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Wrap inference in tf.tidy() to auto-dispose intermediate tensors
                let poses;
                if (tf) {
                    poses = await tf.tidy(() => detector.estimatePoses(video));
                } else {
                    poses = await detector.estimatePoses(video);
                }

                // Tick performance monitor after each inference
                perfMonitorRef.current?.tick();

                // Update live FPS display every ~30 frames
                if (feedbackCountRef.current % 30 === 0) {
                    setLiveFPS(perfMonitorRef.current?.getFPS() || 0);
                }

                if (poses.length > 0) {
                    const pose = poses[0];
                    drawSkeleton(ctx, pose, canvas.width, canvas.height);
                    evaluateForm(pose);
                    detectRep(pose);
                }
            } catch (_) {}

            animationRef.current = requestAnimationFrame(detect);
        };

        detect();
    };

    // Draw skeleton with mirroring support
    const drawSkeleton = (ctx, pose, w, h) => {
        const kps = pose.keypoints;
        const isMirrored = facingMode === 'user';

        const getX = (x) => isMirrored ? w - x : x;

        const connections = [
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
        ];

        // Connections
        ctx.lineWidth = 3;
        connections.forEach(([a, b]) => {
            const pA = kps.find(k => k.name === a);
            const pB = kps.find(k => k.name === b);
            if (pA?.score > MIN_CONFIDENCE && pB?.score > MIN_CONFIDENCE) {
                ctx.strokeStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(getX(pA.x), pA.y);
                ctx.lineTo(getX(pB.x), pB.y);
                ctx.stroke();
            }
        });

        // Keypoints
        kps.forEach(kp => {
            if (kp.score > MIN_CONFIDENCE) {
                ctx.beginPath();
                ctx.arc(getX(kp.x), kp.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = kp.score > 0.6 ? '#22c55e' : '#eab308';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
    };

    // Helper: get keypoint
    const kp = (pose, name) => {
        const p = pose.keypoints.find(k => k.name === name);
        return (p && p.score >= MIN_CONFIDENCE) ? p : null;
    };

    // Calculate angle between 3 points
    const angle = (a, b, c) => {
        if (!a || !b || !c) return null;
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const cb = { x: c.x - b.x, y: c.y - b.y };
        const dot = ab.x * cb.x + ab.y * cb.y;
        const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
        if (mag === 0) return null;
        return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
    };

    // Evaluate form for current exercise
    const evaluateForm = (pose) => {
        let results = [];

        switch (exercise) {
            case 'squat': {
                const lhip = kp(pose, 'left_hip'), rhip = kp(pose, 'right_hip');
                const lknee = kp(pose, 'left_knee'), rknee = kp(pose, 'right_knee');
                const lankle = kp(pose, 'left_ankle'), rankle = kp(pose, 'right_ankle');
                const lshoulder = kp(pose, 'left_shoulder');

                const hipY = lhip?.y ?? rhip?.y;
                const kneeY = lknee?.y ?? rknee?.y;
                const depthOk = hipY && kneeY ? hipY >= kneeY - 25 : null;

                const kneeX = lknee?.x ?? rknee?.x;
                const ankleX = lankle?.x ?? rankle?.x;
                const kneeOk = kneeX && ankleX ? Math.abs(kneeX - ankleX) < 60 : null;

                const backAngle = angle(lshoulder, lhip || rhip, lknee || rknee);
                const backOk = backAngle ? backAngle >= 55 : null;

                results = [
                    { ...EXERCISES.squat.checkpoints[0], passed: depthOk },
                    { ...EXERCISES.squat.checkpoints[1], passed: kneeOk },
                    { ...EXERCISES.squat.checkpoints[2], passed: backOk },
                ];
                break;
            }
            case 'pushup': {
                const ls = kp(pose, 'left_shoulder'), le = kp(pose, 'left_elbow'), lw = kp(pose, 'left_wrist');
                const lh = kp(pose, 'left_hip'), la = kp(pose, 'left_ankle');

                const elbowAngle = angle(ls, le, lw);
                const elbowOk = elbowAngle ? (elbowAngle >= 40 && elbowAngle <= 130) : null;

                const bodyAngle = angle(ls, lh, la);
                const hipOk = bodyAngle ? bodyAngle >= 145 : null;

                const depthOk = ls && le ? ls.y >= le.y - 25 : null;

                results = [
                    { ...EXERCISES.pushup.checkpoints[0], passed: elbowOk },
                    { ...EXERCISES.pushup.checkpoints[1], passed: hipOk },
                    { ...EXERCISES.pushup.checkpoints[2], passed: depthOk },
                ];
                break;
            }
            case 'deadlift': {
                const ls = kp(pose, 'left_shoulder'), lh = kp(pose, 'left_hip'), lk = kp(pose, 'left_knee');

                const spineAngle = angle(ls, lh, lk);
                const spineOk = spineAngle ? spineAngle >= 140 : null;

                const hingeOk = lh && lk ? lh.x < lk.x + 30 : null;

                const lockoutAngle = angle(ls, lh, lk);
                const lockoutOk = lockoutAngle ? lockoutAngle >= 155 : null;

                results = [
                    { ...EXERCISES.deadlift.checkpoints[0], passed: spineOk },
                    { ...EXERCISES.deadlift.checkpoints[1], passed: hingeOk },
                    { ...EXERCISES.deadlift.checkpoints[2], passed: lockoutOk },
                ];
                break;
            }
            case 'lunge': {
                const lk = kp(pose, 'left_knee'), lh = kp(pose, 'left_hip'), la = kp(pose, 'left_ankle');
                const ls = kp(pose, 'left_shoulder');
                const rk = kp(pose, 'right_knee');

                const kneeAngle = angle(lh, lk, la);
                const kneeOk = kneeAngle ? (kneeAngle >= 70 && kneeAngle <= 110) : null;

                const torsoOk = ls && lh ? Math.abs(ls.x - lh.x) < 40 : null;

                const backKneeOk = rk && lk ? rk.y > lk.y - 20 : null;

                results = [
                    { ...EXERCISES.lunge.checkpoints[0], passed: kneeOk },
                    { ...EXERCISES.lunge.checkpoints[1], passed: torsoOk },
                    { ...EXERCISES.lunge.checkpoints[2], passed: backKneeOk },
                ];
                break;
            }
            case 'shoulder_press': {
                const ls = kp(pose, 'left_shoulder'), le = kp(pose, 'left_elbow'), lw = kp(pose, 'left_wrist');

                const pathOk = lw && ls ? Math.abs(lw.x - ls.x) < 40 : null;

                const elbowOk = le && lw ? Math.abs(le.x - lw.x) < 35 : null;

                const pressAngle = angle(ls, le, lw);
                const lockoutOk = pressAngle ? pressAngle >= 150 : null;

                results = [
                    { ...EXERCISES.shoulder_press.checkpoints[0], passed: pathOk },
                    { ...EXERCISES.shoulder_press.checkpoints[1], passed: elbowOk },
                    { ...EXERCISES.shoulder_press.checkpoints[2], passed: lockoutOk },
                ];
                break;
            }
            case 'plank': {
                const ls = kp(pose, 'left_shoulder'), lh = kp(pose, 'left_hip'), la = kp(pose, 'left_ankle');
                const lw = kp(pose, 'left_wrist');
                const nose = kp(pose, 'nose');

                const bodyAngle = angle(ls, lh, la);
                const hipOk = bodyAngle ? bodyAngle >= 150 : null;

                const shoulderOk = ls && lw ? Math.abs(ls.x - lw.x) < 50 : null;

                const headOk = nose && ls ? Math.abs(nose.y - ls.y) < 60 : null;

                results = [
                    { ...EXERCISES.plank.checkpoints[0], passed: hipOk },
                    { ...EXERCISES.plank.checkpoints[1], passed: shoulderOk },
                    { ...EXERCISES.plank.checkpoints[2], passed: headOk },
                ];
                break;
            }
            default:
                return;
        }

        setFeedback(results);

        const valid = results.filter(r => r.passed !== null);
        const passed = valid.filter(r => r.passed).length;
        const score = valid.length > 0 ? Math.round((passed / valid.length) * 100) : 0;

        scoreHistoryRef.current.push(score);
        if (scoreHistoryRef.current.length > 30) scoreHistoryRef.current.shift();
        const avg = Math.round(scoreHistoryRef.current.reduce((a, b) => a + b, 0) / scoreHistoryRef.current.length);
        setFormScore(avg);

        // Coaching tips (throttled)
        feedbackCountRef.current++;
        if (feedbackCountRef.current % 60 === 0) {
            const failing = results.find(r => r.passed === false);
            if (failing) {
                setCoachedTip(`Focus on: ${failing.desc}`);
            } else if (avg >= 90) {
                setCoachedTip('Great form! Keep it up');
            }
        }
    };

    // Rep counter using joint position tracking
    const detectRep = (pose) => {
        const config = currentExercise.repDetect;
        if (!config) return;

        const joint = kp(pose, config.joint);
        if (!joint) return;

        const y = joint.y;
        const state = repStateRef.current;
        const delta = y - state.lastY;

        if (state.cooldown) return;

        if (config.direction === 'down') {
            if (state.phase === 'up' && delta > state.threshold) {
                state.phase = 'down';
            } else if (state.phase === 'down' && delta < -state.threshold) {
                state.phase = 'up';
                state.cooldown = true;
                setRepCount(prev => prev + 1);
                setTimeout(() => { repStateRef.current.cooldown = false; }, 500);
            }
        } else {
            if (state.phase === 'up' && delta < -state.threshold) {
                state.phase = 'down';
            } else if (state.phase === 'down' && delta > state.threshold) {
                state.phase = 'up';
                state.cooldown = true;
                setRepCount(prev => prev + 1);
                setTimeout(() => { repStateRef.current.cooldown = false; }, 500);
            }
        }

        state.lastY = y;
    };

    // Score color
    const scoreColor = formScore >= 80 ? 'text-green-400' : formScore >= 50 ? 'text-yellow-400' : 'text-red-400';
    const scoreBg = formScore >= 80 ? 'from-green-500/20 to-green-600/10 border-green-500/30' : formScore >= 50 ? 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' : 'from-red-500/20 to-red-600/10 border-red-500/30';

    // ── Manual Mode: no camera, just rep/form logging ──
    if (perfMode === 'manual') {
        return (
            <div className="space-y-4">
                {/* Exercise Picker */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold"
                    >
                        <span>{currentExercise.icon}</span>
                        <span>{currentExercise.name}</span>
                        <ChevronDown size={14} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">{repCount}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Reps</div>
                    </div>
                </div>

                <AnimatePresence>
                    {showPicker && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-3 gap-2 pb-2">
                                {Object.entries(EXERCISES).map(([key, ex]) => (
                                    <button
                                        key={key}
                                        onClick={() => { setExercise(key); setShowPicker(false); setRepCount(0); }}
                                        className={`p-3 rounded-xl border text-center transition-all ${exercise === key
                                            ? 'border-red-500 bg-red-900/30'
                                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="text-xl mb-1">{ex.icon}</div>
                                        <div className={`text-[11px] font-bold ${exercise === key ? 'text-white' : 'text-gray-400'}`}>{ex.name}</div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Manual rep buttons */}
                <div className="flex flex-col items-center gap-4 py-8">
                    <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 font-medium text-center">
                        Manual Mode — Camera disabled to save battery. Tap to count reps.
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={() => setRepCount(prev => Math.max(0, prev - 1))} variant="secondary">
                            - Rep
                        </Button>
                        <Button onClick={() => setRepCount(prev => prev + 1)} variant="primary" className="px-8">
                            + Rep
                        </Button>
                    </div>
                </div>

                <Button onClick={() => onComplete?.()} variant="primary" className="w-full">
                    Done ({repCount} reps)
                </Button>
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
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-start gap-3"
                    >
                        <Gauge size={18} className="text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs text-orange-300 font-bold">Low performance detected</p>
                            <p className="text-[11px] text-orange-400/70 mt-0.5">
                                Your device is struggling below {liveFPS} FPS. Switch to Manual Mode for a smoother experience.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => {
                                        stopCamera();
                                        savePerfMode('manual');
                                        window.location.reload();
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-[11px] font-bold"
                                >
                                    Switch to Manual
                                </button>
                                <button
                                    onClick={() => setShowLowFPSPrompt(false)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[11px]"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exercise Picker + Score */}
            <div className="flex items-center justify-between gap-3">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold"
                >
                    <span>{currentExercise.icon}</span>
                    <span>{currentExercise.name}</span>
                    <ChevronDown size={14} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
                </button>

                {isStreaming && (
                    <div className="flex items-center gap-3">
                        {/* Live FPS badge */}
                        {liveFPS > 0 && (
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold ${
                                liveFPS >= 12 ? 'bg-green-500/10 text-green-400' :
                                liveFPS >= 8 ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-red-500/10 text-red-400'
                            }`}>
                                {liveFPS} FPS
                            </div>
                        )}
                        <div className="text-center">
                            <div className="text-2xl font-black text-white">{repCount}</div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold">Reps</div>
                        </div>
                        <div className={`px-3 py-2 rounded-xl border bg-gradient-to-br ${scoreBg}`}>
                            <div className={`text-xl font-black ${scoreColor}`}>{formScore}%</div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold">Form</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Exercise Picker Dropdown */}
            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-3 gap-2 pb-2">
                            {Object.entries(EXERCISES).map(([key, ex]) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setExercise(key);
                                        setShowPicker(false);
                                        setRepCount(0);
                                        setFormScore(0);
                                        scoreHistoryRef.current = [];
                                        repStateRef.current = { phase: 'up', lastY: 0, threshold: 30, cooldown: false };
                                    }}
                                    className={`p-3 rounded-xl border text-center transition-all ${exercise === key
                                        ? 'border-red-500 bg-red-900/30'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="text-xl mb-1">{ex.icon}</div>
                                    <div className={`text-[11px] font-bold ${exercise === key ? 'text-white' : 'text-gray-400'}`}>{ex.name}</div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Video Area */}
            <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-black/50" style={{ aspectRatio: '3/4' }}>
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-white/60">Loading AI Model...</p>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                            playsInline
                            muted
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                            style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
                        />

                        {/* Coaching Tip Overlay */}
                        {isStreaming && coachedTip && (
                            <div className="absolute top-3 left-3 right-3 z-10">
                                <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-white font-medium text-center">
                                    {coachedTip}
                                </div>
                            </div>
                        )}

                        {/* Camera controls overlay */}
                        {isStreaming && (
                            <button
                                onClick={flipCamera}
                                className="absolute bottom-3 right-3 z-10 w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/80"
                            >
                                <RotateCcw size={16} />
                            </button>
                        )}

                        {!isStreaming && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-4">
                                <Camera className="w-12 h-12 text-red-400" />
                                <p className="text-white font-bold text-lg">AI Form Coach</p>
                                <p className="text-gray-400 text-xs">Analyzes your movement in real-time</p>
                                <Button onClick={startCamera} variant="primary">
                                    <Video className="w-4 h-4 mr-2" />
                                    Start Camera
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Form Feedback Cards */}
            <AnimatePresence>
                {isStreaming && feedback.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-3 gap-2"
                    >
                        {feedback.map((item) => {
                            const isNull = item.passed === null;
                            return (
                                <div
                                    key={item.id}
                                    className={`p-2.5 rounded-xl text-center border ${
                                        isNull
                                            ? 'bg-white/5 border-white/10'
                                            : item.passed
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-red-500/10 border-red-500/30'
                                    }`}
                                >
                                    {isNull ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-600 mx-auto mb-1" />
                                    ) : item.passed ? (
                                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                                    )}
                                    <p className={`text-[11px] font-bold ${
                                        isNull ? 'text-gray-500' : item.passed ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {item.label}
                                    </p>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            {isStreaming && (
                <div className="flex gap-2">
                    <Button onClick={stopCamera} variant="danger" className="flex-1">
                        <VideoOff className="w-4 h-4 mr-2" /> Stop
                    </Button>
                    <Button onClick={() => { stopCamera(); onComplete?.(); }} variant="primary" className="flex-1">
                        Done ({repCount} reps)
                    </Button>
                </div>
            )}
        </div>
    );
};

export default FormCoach;
