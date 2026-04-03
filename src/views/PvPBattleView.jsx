/**
 * PvPBattleView — Real-time PvP battle workout submission.
 * Flow: lobby → exercise select → submit workout → waiting → result
 * Calls submitBattleWorkout Cloud Function for server-authoritative scoring.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, ArrowLeft, Zap, Trophy, Clock, Dumbbell, Target, RotateCcw, Shield, Share2 } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { useBattleSubmission } from '../hooks/useBattleSubmission';
import { acceptBattle } from '../services/arenaService';
import { celebrateVictory, acknowledgeDefeat } from '../components/Gamification/celebrations';
import { Haptics } from '../utils/audio';

const ShareCardGenerator = React.lazy(() => import('../components/ShareCardGenerator'));

const EXERCISES = [
    { id: 'squat', name: 'Barbell Squat', icon: '🏋️', maxReps: 50 },
    { id: 'bench', name: 'Bench Press', icon: '💪', maxReps: 50 },
    { id: 'deadlift', name: 'Deadlift', icon: '🔥', maxReps: 30 },
    { id: 'pushup', name: 'Push Up', icon: '👊', maxReps: 150 },
    { id: 'pullup', name: 'Pull Up', icon: '🧗', maxReps: 50 },
    { id: 'ohp', name: 'Overhead Press', icon: '🎯', maxReps: 40 },
    { id: 'row', name: 'Barbell Row', icon: '🚣', maxReps: 40 },
    { id: 'dips', name: 'Dips', icon: '⬇️', maxReps: 60 },
];

const BATTLE_DURATION = 300; // 5 min max

const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

// Animated stat race bar (reused from GhostMatch pattern)
const StatBar = ({ label, value, maxValue, color = '#dc2626' }) => {
    const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
                <span className="text-[10px] font-mono font-bold text-white">{value}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                    style={{ background: color }}
                />
            </div>
        </div>
    );
};

export const PvPBattleView = ({ battle, user, profile = {}, onBack, onComplete }) => {
    const [phase, setPhase] = useState('lobby'); // lobby | accept | exercise | workout | submitted | result
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [reps, setReps] = useState(0);
    const [formScore, setFormScore] = useState(75);
    const [elapsed, setElapsed] = useState(0);
    const [accepting, setAccepting] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    const isChallenger = battle.challenger?.userId === user?.uid;
    const opponent = isChallenger ? battle.opponent : battle.challenger;
    const opponentName = opponent?.username || 'Unknown';

    const {
        submitWorkout, listenForOpponent,
        submitting, submitted, opponentSubmitted,
        battleResult, submissionResult, error,
    } = useBattleSubmission(battle.id, user?.uid);

    // Start listening for opponent when entering workout phase
    useEffect(() => {
        if (phase === 'workout' || phase === 'submitted') {
            const cleanup = listenForOpponent(opponent?.userId);
            return cleanup;
        }
    }, [phase, opponent?.userId, listenForOpponent]);

    // Timer for workout phase
    useEffect(() => {
        if (phase === 'workout') {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setElapsed(s);
                if (s >= BATTLE_DURATION) {
                    clearInterval(timerRef.current);
                    handleSubmit();
                }
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [phase]);

    // Trigger celebration on result
    useEffect(() => {
        if (!battleResult) return;
        setPhase('result');
        if (battleResult.winnerId === user?.uid) celebrateVictory();
        else if (battleResult.winnerId && battleResult.winnerId !== user?.uid) acknowledgeDefeat();
    }, [battleResult, user?.uid]);

    // Accept the battle
    const handleAccept = async () => {
        setAccepting(true);
        try {
            await acceptBattle(battle.id);
            Haptics.success();
            setPhase('exercise');
        } catch (err) {
            console.error('Accept failed:', err);
        }
        setAccepting(false);
    };

    // Submit workout to Cloud Function
    const handleSubmit = async () => {
        if (!selectedExercise || reps <= 0) return;
        clearInterval(timerRef.current);
        const duration = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);

        const result = await submitWorkout({
            exercise: selectedExercise.name,
            reps,
            formScore,
            durationSeconds: Math.max(duration, 1),
        });

        if (result) {
            Haptics.success();
            setPhase('submitted');
        }
    };

    // Determine which initial phase to show
    const initialPhase = useMemo(() => {
        if (battle.status === 'pending' && !isChallenger) return 'accept';
        if (battle.status === 'pending' && isChallenger) return 'lobby';
        if (battle.status === 'active' || battle.status === 'accepted') return 'exercise';
        if (battle.status === 'completed') return 'result';
        return 'lobby';
    }, [battle.status, isChallenger]);

    useEffect(() => { setPhase(initialPhase); }, [initialPhase]);

    // Result data
    const won = battleResult?.winnerId === user?.uid;
    const isDraw = battleResult?.winnerId === null && battleResult?.status === 'completed';
    const myXp = isChallenger ? battleResult?.challengerXp : battleResult?.opponentXp;
    const myEloDelta = isChallenger ? battleResult?.challengerEloDelta : battleResult?.opponentEloDelta;
    const myScore = isChallenger ? battleResult?.challengerScore : battleResult?.opponentScore;
    const theirScore = isChallenger ? battleResult?.opponentScore : battleResult?.challengerScore;

    return (
        <div className="space-y-4 pb-4 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <ArrowLeft size={18} className="text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600">
                        <Swords className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight">PvP Battle</h1>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">vs {opponentName}</p>
                    </div>
                </div>
            </div>

            {/* ── LOBBY: Waiting for opponent to accept ── */}
            {phase === 'lobby' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <GlassCard className="!p-6 text-center">
                        <motion.div
                            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                            animate={{ boxShadow: ['0 0 20px rgba(220,38,38,0.2)', '0 0 40px rgba(220,38,38,0.4)', '0 0 20px rgba(220,38,38,0.2)'] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(249,115,22,0.2))', border: '1px solid rgba(220,38,38,0.4)' }}
                        >
                            <Swords size={28} className="text-red-400" />
                        </motion.div>
                        <h2 className="text-lg font-black text-white uppercase">Challenge Sent</h2>
                        <p className="text-xs text-gray-500 mt-2">Waiting for <span className="text-red-400 font-bold">{opponentName}</span> to accept your challenge...</p>
                        <motion.div
                            className="flex items-center justify-center gap-2 mt-4"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Waiting...</span>
                        </motion.div>
                    </GlassCard>
                </motion.div>
            )}

            {/* ── ACCEPT: Incoming challenge ── */}
            {phase === 'accept' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <GlassCard className="!p-6 text-center" highlight>
                        <span className="text-4xl">⚔️</span>
                        <h2 className="text-lg font-black text-white uppercase mt-3">Incoming Challenge!</h2>
                        <p className="text-xs text-gray-500 mt-2">
                            <span className="text-red-400 font-bold">{opponentName}</span> wants to battle you
                        </p>

                        <div className="flex items-center justify-center gap-4 mt-4">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-600 uppercase">Their XP</p>
                                <p className="text-sm font-black text-white">{(opponent?.xp || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-xl font-black text-red-500">VS</div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-600 uppercase">Your XP</p>
                                <p className="text-sm font-black text-white">{(profile?.xp || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={onBack}
                            className="py-3 rounded-xl text-xs font-black uppercase text-gray-400"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Decline
                        </button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleAccept} disabled={accepting}
                            className="py-3 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>
                            {accepting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Swords size={14} /> Accept</>}
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* ── EXERCISE SELECT ── */}
            {phase === 'exercise' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <GlassCard className="!p-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Choose Your Exercise</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {EXERCISES.map(ex => (
                                <motion.button key={ex.id} whileTap={{ scale: 0.95 }}
                                    onClick={() => { setSelectedExercise(ex); Haptics.light(); }}
                                    className={`p-3 rounded-xl text-left transition-all ${selectedExercise?.id === ex.id
                                        ? 'ring-2 ring-red-500 bg-red-500/10'
                                        : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                                    }`}>
                                    <span className="text-xl">{ex.icon}</span>
                                    <p className="text-xs font-bold text-white mt-1">{ex.name}</p>
                                    <p className="text-[9px] text-gray-600">Max {ex.maxReps} reps</p>
                                </motion.button>
                            ))}
                        </div>
                    </GlassCard>

                    <motion.button whileTap={{ scale: 0.95 }} disabled={!selectedExercise}
                        onClick={() => { setPhase('workout'); setReps(0); setElapsed(0); Haptics.medium(); }}
                        className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 ${selectedExercise ? 'text-white' : 'text-gray-600'}`}
                        style={{
                            background: selectedExercise
                                ? 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)'
                                : 'rgba(255,255,255,0.05)',
                            boxShadow: selectedExercise ? '0 8px 30px rgba(220,38,38,0.3)' : 'none',
                        }}>
                        <Dumbbell size={18} /> Start Workout
                    </motion.button>
                </motion.div>
            )}

            {/* ── WORKOUT: Log reps + form score ── */}
            {phase === 'workout' && selectedExercise && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Timer + Exercise Header */}
                    <GlassCard highlight className="!p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Exercise</p>
                                <p className="text-lg font-black text-white">{selectedExercise.icon} {selectedExercise.name}</p>
                            </div>
                            <motion.div className="text-center px-4 py-2 rounded-xl"
                                animate={{ boxShadow: ['0 0 10px rgba(220,38,38,0.3)', '0 0 25px rgba(220,38,38,0.5)', '0 0 10px rgba(220,38,38,0.3)'] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)' }}>
                                <p className="text-xl font-mono font-black text-red-400">{formatTime(elapsed)}</p>
                                <p className="text-[9px] text-gray-600 uppercase font-bold">
                                    {BATTLE_DURATION - elapsed > 0 ? `${formatTime(BATTLE_DURATION - elapsed)} left` : 'TIME UP'}
                                </p>
                            </motion.div>
                        </div>
                    </GlassCard>

                    {/* Rep Counter */}
                    <GlassCard className="!p-6 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Total Reps</p>
                        <div className="flex items-center justify-center gap-6">
                            <motion.button whileTap={{ scale: 0.85 }}
                                onClick={() => setReps(Math.max(0, reps - 1))}
                                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-gray-400 hover:bg-white/10">
                                −
                            </motion.button>
                            <motion.span
                                key={reps}
                                initial={{ scale: 1.3, color: '#ef4444' }}
                                animate={{ scale: 1, color: '#ffffff' }}
                                className="text-6xl font-black tabular-nums"
                            >
                                {reps}
                            </motion.span>
                            <motion.button whileTap={{ scale: 0.85 }}
                                onClick={() => { setReps(Math.min(selectedExercise.maxReps, reps + 1)); Haptics.light(); }}
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                                style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)', boxShadow: '0 4px 15px rgba(220,38,38,0.4)' }}>
                                +
                            </motion.button>
                        </div>
                        <StatBar label="Reps" value={reps} maxValue={selectedExercise.maxReps} color="#dc2626" />
                    </GlassCard>

                    {/* Form Score Slider */}
                    <GlassCard className="!p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                <Target size={12} className="inline mr-1" />Form Quality
                            </span>
                            <span className={`text-sm font-black ${formScore >= 80 ? 'text-green-400' : formScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {formScore}%
                            </span>
                        </div>
                        <input type="range" min="0" max="100" value={formScore}
                            onChange={(e) => setFormScore(parseInt(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, #dc2626 0%, #22c55e ${formScore}%, rgba(255,255,255,0.05) ${formScore}%)` }}
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-gray-600">Sloppy</span>
                            <span className="text-[9px] text-gray-600">Perfect</span>
                        </div>
                    </GlassCard>

                    {/* Submit Button */}
                    <motion.button whileTap={{ scale: 0.95 }}
                        onClick={handleSubmit}
                        disabled={reps <= 0 || submitting}
                        className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 ${reps > 0 ? 'text-white' : 'text-gray-600'}`}
                        style={{
                            background: reps > 0
                                ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                                : 'rgba(255,255,255,0.05)',
                            boxShadow: reps > 0 ? '0 8px 30px rgba(22,163,74,0.3)' : 'none',
                        }}>
                        {submitting
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <><Trophy size={18} /> Submit Workout</>
                        }
                    </motion.button>

                    {error && (
                        <p className="text-xs text-red-400 text-center font-bold">{error}</p>
                    )}
                </motion.div>
            )}

            {/* ── SUBMITTED: Waiting for opponent ── */}
            {phase === 'submitted' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <GlassCard className="!p-6 text-center">
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.2), rgba(34,197,94,0.1))', border: '1px solid rgba(22,163,74,0.4)' }}
                        >
                            <Shield size={28} className="text-green-400" />
                        </motion.div>
                        <h2 className="text-lg font-black text-green-400 uppercase">Workout Submitted!</h2>
                        {submissionResult && (
                            <p className="text-xs text-gray-500 mt-1">
                                Performance Score: <span className="text-white font-bold">{submissionResult.performanceScore}</span>
                            </p>
                        )}
                        <div className="mt-4">
                            {opponentSubmitted ? (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="text-sm font-bold text-yellow-400">
                                    Opponent submitted! Calculating results...
                                </motion.p>
                            ) : (
                                <div>
                                    <motion.div className="flex items-center justify-center gap-2"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}>
                                        <Clock size={14} className="text-gray-500" />
                                        <span className="text-xs text-gray-500 font-bold">Waiting for {opponentName}...</span>
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Your submission stats */}
                    <GlassCard className="!p-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Your Submission</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center py-2 rounded-xl bg-white/[0.03]">
                                <p className="text-lg font-black text-white">{reps}</p>
                                <p className="text-[9px] text-gray-600 uppercase">Reps</p>
                            </div>
                            <div className="text-center py-2 rounded-xl bg-white/[0.03]">
                                <p className="text-lg font-black text-white">{formScore}%</p>
                                <p className="text-[9px] text-gray-600 uppercase">Form</p>
                            </div>
                            <div className="text-center py-2 rounded-xl bg-white/[0.03]">
                                <p className="text-lg font-black text-white">{formatTime(elapsed)}</p>
                                <p className="text-[9px] text-gray-600 uppercase">Time</p>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            )}

            {/* ── RESULT: Victory / Defeat / Draw ── */}
            {phase === 'result' && battleResult && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="space-y-4">

                    <GlassCard className="!p-6 text-center" highlight={won}>
                        <motion.span className="text-5xl block"
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}>
                            {isDraw ? '🤝' : won ? '🏆' : '💀'}
                        </motion.span>
                        <motion.h2
                            className={`text-3xl font-black uppercase tracking-tight mt-3 ${isDraw ? 'text-yellow-400' : won ? 'text-green-400' : 'text-red-400'}`}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                            {isDraw ? 'DRAW' : won ? 'VICTORY' : 'DEFEATED'}
                        </motion.h2>
                        <motion.p className="text-xs text-gray-500 mt-1"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                            {isDraw
                                ? `Tied with ${opponentName} — ${myScore}-${theirScore}`
                                : won
                                    ? `You crushed ${opponentName} — ${myScore} vs ${theirScore}`
                                    : `${opponentName} won — ${theirScore} vs ${myScore}`
                            }
                        </motion.p>

                        {/* XP + Elo rewards */}
                        <motion.div className="flex items-center justify-center gap-4 mt-4"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                            {myXp > 0 && (
                                <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                    <Zap size={12} className="text-yellow-400 inline mr-1" />
                                    <span className="text-xs font-black text-yellow-400">+{myXp} XP</span>
                                </div>
                            )}
                            {myEloDelta != null && (
                                <div className={`px-3 py-1.5 rounded-lg ${myEloDelta >= 0
                                    ? 'bg-green-500/10 border border-green-500/30'
                                    : 'bg-red-500/10 border border-red-500/30'
                                }`}>
                                    <span className={`text-xs font-black ${myEloDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {myEloDelta >= 0 ? '+' : ''}{myEloDelta} Elo
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    </GlassCard>

                    {battleResult.status === 'under_review' && (
                        <GlassCard className="!p-4 text-center">
                            <p className="text-xs text-yellow-400 font-bold">⚠️ Battle under review — anomalous performance detected</p>
                        </GlassCard>
                    )}

                    {/* Share Victory Card */}
                    <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => setShowShareCard(true)}
                        className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
                        <Share2 size={14} /> Share {won ? 'Victory' : 'Battle'} Card
                    </motion.button>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={onBack}
                            className="py-3 rounded-xl text-xs font-black uppercase text-gray-400 flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <ArrowLeft size={14} /> Arena
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }}
                            onClick={() => { onComplete?.(); onBack(); }}
                            className="py-3 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)', boxShadow: '0 4px 15px rgba(220,38,38,0.3)' }}>
                            <RotateCcw size={14} /> New Battle
                        </motion.button>
                    </div>

                    {/* Share Card Modal */}
                    {showShareCard && (
                        <React.Suspense fallback={null}>
                            <ShareCardGenerator
                                type="battle_victory"
                                data={{
                                    won,
                                    isDraw,
                                    opponentName,
                                    myScore,
                                    theirScore,
                                    xpAwarded: myXp,
                                    eloDelta: myEloDelta,
                                    exercise: selectedExercise?.name,
                                    reps,
                                    referralCode: profile?.referralCode,
                                }}
                                onClose={() => setShowShareCard(false)}
                            />
                        </React.Suspense>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default PvPBattleView;
