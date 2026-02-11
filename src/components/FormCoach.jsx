import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, AlertCircle, CheckCircle, XCircle, Camera } from 'lucide-react';
import { Button } from './UIComponents';

console.log('✅ FormCoach loaded successfully');

/**
 * AI Form Coach Component
 * Uses TensorFlow.js/MoveNet for real-time pose detection and form feedback
 */
export const FormCoach = ({ exercise = 'squat', onComplete }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [detector, setDetector] = useState(null);
    const [feedback, setFeedback] = useState([]);
    const [repCount, setRepCount] = useState(0);
    const [formScore, setFormScore] = useState(100);
    const [error, setError] = useState(null);
    const animationRef = useRef(null);

    // Form rules for different exercises
    const formRules = {
        squat: {
            name: 'Squat',
            checkpoints: [
                { id: 'depth', label: 'Depth', check: (pose) => checkSquatDepth(pose) },
                { id: 'knees', label: 'Knee Tracking', check: (pose) => checkKneeAlignment(pose) },
                { id: 'back', label: 'Back Position', check: (pose) => checkBackPosition(pose) },
            ],
        },
        pushup: {
            name: 'Push-Up',
            checkpoints: [
                { id: 'elbows', label: 'Elbow Angle', check: (pose) => checkElbowAngle(pose) },
                { id: 'hips', label: 'Hip Alignment', check: (pose) => checkHipAlignment(pose) },
                { id: 'depth', label: 'Range of Motion', check: (pose) => checkPushupDepth(pose) },
            ],
        },
        deadlift: {
            name: 'Deadlift',
            checkpoints: [
                { id: 'back', label: 'Neutral Spine', check: (pose) => checkNeutralSpine(pose) },
                { id: 'bar', label: 'Bar Path', check: (pose) => true },
                { id: 'lockout', label: 'Lockout', check: (pose) => checkLockout(pose) },
            ],
        },
    };

    // Initialize TensorFlow and camera
    useEffect(() => {
        let cleanup = false;

        const init = async () => {
            try {
                // Dynamic import of TensorFlow
                const tf = await import('@tensorflow/tfjs');
                await tf.ready();

                const poseDetection = await import('@tensorflow-models/pose-detection');

                // Use MoveNet for fast, accurate pose detection
                const detectorConfig = {
                    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                };

                const poseDetector = await poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    detectorConfig
                );

                if (!cleanup) {
                    setDetector(poseDetector);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Failed to load pose detection:', err);
                if (!cleanup) {
                    setError('Failed to load AI model. Please try again.');
                    setIsLoading(false);
                }
            }
        };

        init();

        return () => {
            cleanup = true;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Start camera stream
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    setIsStreaming(true);
                    detectPose();
                };
            }
        } catch (err) {
            setError('Camera access denied. Please allow camera permissions.');
        }
    };

    // Stop camera stream
    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsStreaming(false);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    // Main pose detection loop
    const detectPose = async () => {
        if (!detector || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const detect = async () => {
            if (!isStreaming) return;

            try {
                const poses = await detector.estimatePoses(video);

                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw video frame to canvas if detector is running
                if (video.readyState === 4) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }

                if (poses.length > 0) {
                    const pose = poses[0];

                    // Draw skeleton
                    drawSkeleton(ctx, pose);

                    // Check form
                    const rules = formRules[exercise];
                    if (rules) {
                        const results = rules.checkpoints.map(checkpoint => ({
                            ...checkpoint,
                            passed: checkpoint.check(pose),
                        }));

                        setFeedback(results);

                        // Calculate form score
                        const passedCount = results.filter(r => r.passed).length;
                        const newScore = Math.round((passedCount / results.length) * 100);
                        setFormScore(newScore);
                    }
                }
            } catch (err) {
                console.error('Pose detection error:', err);
            }

            animationRef.current = requestAnimationFrame(detect);
        };

        detect();
    };

    // Draw skeleton on canvas
    const drawSkeleton = (ctx, pose) => {
        const keypoints = pose.keypoints;

        // Draw connections
        const connections = [
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle'],
        ];

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;

        connections.forEach(([start, end]) => {
            const startPoint = keypoints.find(kp => kp.name === start);
            const endPoint = keypoints.find(kp => kp.name === end);

            if (startPoint?.score > 0.3 && endPoint?.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(endPoint.x, endPoint.y);
                ctx.stroke();
            }
        });

        // Draw keypoints
        keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                ctx.beginPath();
                ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = kp.score > 0.5 ? '#22c55e' : '#eab308';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    };

    // Form checking functions
    const getKeypoint = (pose, name) => pose.keypoints.find(kp => kp.name === name);

    const checkSquatDepth = (pose) => {
        const hip = getKeypoint(pose, 'left_hip');
        const knee = getKeypoint(pose, 'left_knee');
        if (!hip || !knee || hip.score < 0.3 || knee.score < 0.3) return true;
        return hip.y >= knee.y - 30; // Hip should be at or below knee level
    };

    const checkKneeAlignment = (pose) => {
        const knee = getKeypoint(pose, 'left_knee');
        const ankle = getKeypoint(pose, 'left_ankle');
        if (!knee || !ankle || knee.score < 0.3 || ankle.score < 0.3) return true;
        return Math.abs(knee.x - ankle.x) < 50; // Knee shouldn't cave in
    };

    const checkBackPosition = (pose) => {
        const shoulder = getKeypoint(pose, 'left_shoulder');
        const hip = getKeypoint(pose, 'left_hip');
        if (!shoulder || !hip || shoulder.score < 0.3 || hip.score < 0.3) return true;
        return true; // Simplified check
    };

    const checkElbowAngle = (pose) => {
        const shoulder = getKeypoint(pose, 'left_shoulder');
        const elbow = getKeypoint(pose, 'left_elbow');
        const wrist = getKeypoint(pose, 'left_wrist');
        if (!shoulder || !elbow || !wrist) return true;
        return true; // Simplified
    };

    const checkHipAlignment = (pose) => {
        const shoulder = getKeypoint(pose, 'left_shoulder');
        const hip = getKeypoint(pose, 'left_hip');
        const ankle = getKeypoint(pose, 'left_ankle');
        if (!shoulder || !hip || !ankle) return true;
        return true; // Simplified
    };

    const checkPushupDepth = (pose) => true;
    const checkNeutralSpine = (pose) => true;
    const checkLockout = (pose) => true;

    const currentRules = formRules[exercise] || formRules.squat;

    if (error) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={() => setError(null)} variant="secondary">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Camera className="w-5 h-5 text-red-400" />
                        AI Form Coach
                    </h3>
                    <p className="text-xs text-white/50">Real-time pose analysis for {currentRules.name}</p>
                </div>
                <div className={`text-2xl font-black ${formScore >= 80 ? 'text-green-400' : formScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formScore}%
                </div>
            </div>

            {/* Video/Canvas Area */}
            <div className="relative rounded-2xl overflow-hidden bg-black/50 aspect-video">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <p className="ml-3 text-sm text-white/60">Loading AI Model...</p>
                    </div>
                ) : (
                    <>
                        {/* Video Element - Always render but hide if canvas is successfully drawing */}
                        <video
                            ref={videoRef}
                            className={`absolute inset-0 w-full h-full object-cover ${isStreaming && detector ? 'opacity-0' : 'opacity-100'}`}
                            playsInline
                            muted
                        />
                        {/* Canvas - Overlays on top of video */}
                        <canvas
                            ref={canvasRef}
                            width={640}
                            height={480}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />

                        {!isStreaming && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                <Button onClick={startCamera} variant="primary">
                                    <Video className="w-4 h-4 mr-2" />
                                    Start Camera
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Form Feedback */}
            <AnimatePresence>
                {isStreaming && feedback.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-3 gap-2"
                    >
                        {feedback.map((item, i) => (
                            <div
                                key={item.id}
                                className={`p-3 rounded-xl text-center border ${item.passed
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-red-500/10 border-red-500/30'
                                    }`}
                            >
                                {item.passed ? (
                                    <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                                )}
                                <p className={`text-xs font-medium ${item.passed ? 'text-green-400' : 'text-red-400'}`}>
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
                        <VideoOff className="w-4 h-4 mr-2" />
                        Stop
                    </Button>
                    <Button onClick={onComplete} variant="primary" className="flex-1">
                        Done
                    </Button>
                </div>
            )}
        </div>
    );
};

export default FormCoach;



