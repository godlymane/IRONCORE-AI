/**
 * GhostMatchView — Async "Ghost Match" PvP comparison.
 * User's live workout stats race against a rival's simulated ghost data.
 * Split-screen HUD with animated progress bars, form scores, and victory/defeat screen.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Zap, Trophy, ArrowLeft, Play, RotateCcw, User, Ghost } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { celebrateVictory, acknowledgeDefeat } from '../components/Gamification/celebrations';

// Generate mock ghost data based on rival level
const generateGhostData = (rivalLevel) => {
  const baseFormScore = Math.min(55 + rivalLevel * 3, 95);
  const baseVolume = 500 + rivalLevel * 200;
  const baseReps = 20 + rivalLevel * 5;

  return {
    username: ['PhantomLift', 'IronGhost', 'ShadowRep', 'SpecterPR', 'GhostGains'][Math.floor(Math.random() * 5)],
    level: rivalLevel,
    photo: null,
    formScore: baseFormScore + Math.floor(Math.random() * 10) - 5,
    totalVolume: baseVolume + Math.floor(Math.random() * 300),
    totalReps: baseReps + Math.floor(Math.random() * 15),
    exercises: [
      { name: 'Bench Press', sets: 3, reps: 10, weight: 40 + rivalLevel * 5, formScore: baseFormScore + Math.floor(Math.random() * 8) },
      { name: 'Squats', sets: 3, reps: 8, weight: 50 + rivalLevel * 8, formScore: baseFormScore + Math.floor(Math.random() * 6) },
      { name: 'Deadlift', sets: 3, reps: 5, weight: 60 + rivalLevel * 10, formScore: baseFormScore + Math.floor(Math.random() * 7) },
    ],
  };
};

// Animated stat bar that "races" to its target value
const RaceBar = ({ label, playerValue, ghostValue, unit = '', color = '#dc2626', delay = 0 }) => {
  const max = Math.max(playerValue, ghostValue, 1);
  const playerPct = (playerValue / max) * 100;
  const ghostPct = (ghostValue / max) * 100;
  const playerWins = playerValue >= ghostValue;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`text-[10px] font-black ${playerWins ? 'text-green-400' : 'text-red-400'}`}>
          {playerWins ? 'AHEAD' : 'BEHIND'}
        </span>
      </div>

      {/* Player bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-gray-600 w-10">YOU</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${playerPct}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 15, delay }}
            style={{ background: playerWins ? '#22c55e' : color }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold text-white w-14 text-right">
          {Math.round(playerValue).toLocaleString()}{unit}
        </span>
      </div>

      {/* Ghost bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-gray-600 w-10">👻</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${ghostPct}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 15, delay: delay + 0.3 }}
            style={{ background: 'rgba(139, 92, 246, 0.7)' }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold text-gray-400 w-14 text-right">
          {Math.round(ghostValue).toLocaleString()}{unit}
        </span>
      </div>
    </div>
  );
};

// Match state: 'lobby' → 'active' → 'result'
export const GhostMatchView = ({ user, profile = {}, workouts = [], onBack }) => {
  const [matchState, setMatchState] = useState('lobby');
  const [ghost, setGhost] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [playerStats, setPlayerStats] = useState({ formScore: 0, totalVolume: 0, totalReps: 0 });
  const timerRef = useRef(null);
  const autoCompleteRef = useRef(null);

  const userLevel = profile?.level || Math.floor((profile?.xp || 0) / 500) + 1;

  // Generate a ghost rival around the user's level
  const startMatch = useCallback(() => {
    const rivalLevel = Math.max(1, userLevel + Math.floor(Math.random() * 5) - 2);
    const ghostData = generateGhostData(rivalLevel);
    setGhost(ghostData);
    setElapsedTime(0);
    setMatchState('active');

    // Simulate player stats building up over time (from recent workout data)
    const lastWorkout = workouts[0];
    const totalVol = lastWorkout?.exercises?.reduce((sum, ex) =>
      sum + (ex.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0
    ) || Math.floor(Math.random() * 800 + 400);
    const totalReps = lastWorkout?.exercises?.reduce((sum, ex) =>
      sum + (ex.sets || []).reduce((s, set) => s + (set.reps || 0), 0), 0
    ) || Math.floor(Math.random() * 40 + 20);

    setPlayerStats({
      formScore: Math.floor(Math.random() * 15) + 75,
      totalVolume: totalVol,
      totalReps: totalReps,
    });

    // Timer for match duration display
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Auto-complete after 8 seconds (simulated match)
    autoCompleteRef.current = setTimeout(() => {
      clearInterval(timerRef.current);
      setMatchState('result');
    }, 8000);
  }, [userLevel, workouts]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoCompleteRef.current) clearTimeout(autoCompleteRef.current);
    };
  }, []);

  // Calculate winner
  const result = useMemo(() => {
    if (!ghost || matchState !== 'result') return null;
    let playerScore = 0;
    let ghostScore = 0;

    if (playerStats.formScore >= ghost.formScore) playerScore++; else ghostScore++;
    if (playerStats.totalVolume >= ghost.totalVolume) playerScore++; else ghostScore++;
    if (playerStats.totalReps >= ghost.totalReps) playerScore++; else ghostScore++;

    const won = playerScore >= ghostScore;
    return { won, playerScore, ghostScore };
  }, [ghost, playerStats, matchState]);

  // Trigger celebration on result
  useEffect(() => {
    if (result?.won) celebrateVictory();
    else if (result && !result.won) acknowledgeDefeat();
  }, [result]);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-5 pb-4 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft size={18} className="text-gray-400" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Ghost Match</h1>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Async PvP</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOBBY STATE */}
      {matchState === 'lobby' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <GlassCard className="!p-6 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              👻
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Challenge a Ghost</h2>
            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
              Race against a rival's recorded workout. Your form score, volume, and reps are compared head-to-head.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Form', icon: '🎯', desc: 'AI Score' },
                { label: 'Volume', icon: '🏋️', desc: 'Total kg' },
                { label: 'Reps', icon: '🔁', desc: 'Total reps' },
              ].map(stat => (
                <div key={stat.label} className="py-2 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-lg">{stat.icon}</span>
                  <p className="text-[10px] font-bold text-white mt-1">{stat.label}</p>
                  <p className="text-[9px] text-gray-600">{stat.desc}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Your Stats Preview */}
          <GlassCard className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-red-500/50 flex-shrink-0">
                {(profile?.photoURL || user?.photoURL) ? (
                  <img src={profile?.photoURL || user?.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center"><User size={18} className="text-gray-500" /></div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{user?.displayName || 'You'}</p>
                <p className="text-[11px] text-gray-500">Lv.{userLevel} — {workouts.length} workouts logged</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-red-400">{(profile?.xp || 0).toLocaleString()}</p>
                <p className="text-[10px] text-gray-600">XP</p>
              </div>
            </div>
          </GlassCard>

          {/* Start Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startMatch}
            className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #dc2626 100%)',
              boxShadow: '0 8px 30px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Play size={18} /> Find Opponent
          </motion.button>
        </motion.div>
      )}

      {/* ACTIVE MATCH STATE */}
      {matchState === 'active' && ghost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* VS Header */}
          <GlassCard highlight className="!p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500/50 flex-shrink-0">
                  {(profile?.photoURL || user?.photoURL) ? (
                    <img src={profile?.photoURL || user?.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center"><User size={14} className="text-gray-500" /></div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-white">{user?.displayName || 'You'}</p>
                  <p className="text-[10px] text-gray-500">Lv.{userLevel}</p>
                </div>
              </div>

              {/* Timer */}
              <div className="text-center">
                <motion.div
                  className="px-3 py-1 rounded-lg"
                  animate={{ boxShadow: ['0 0 10px rgba(220,38,38,0.3)', '0 0 20px rgba(220,38,38,0.5)', '0 0 10px rgba(220,38,38,0.3)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}
                >
                  <span className="text-xs font-mono font-black text-red-400">{formatTime(elapsedTime)}</span>
                </motion.div>
                <span className="text-[9px] text-gray-600 uppercase font-bold">LIVE</span>
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs font-black text-purple-300 text-right">{ghost.username}</p>
                  <p className="text-[10px] text-gray-500 text-right">Lv.{ghost.level}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">👻</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Race Bars */}
          <GlassCard className="!p-4 space-y-4">
            <RaceBar label="Form Score" playerValue={playerStats.formScore} ghostValue={ghost.formScore} unit="%" delay={0.5} />
            <RaceBar label="Volume" playerValue={playerStats.totalVolume} ghostValue={ghost.totalVolume} unit=" kg" delay={1} />
            <RaceBar label="Total Reps" playerValue={playerStats.totalReps} ghostValue={ghost.totalReps} delay={1.5} />
          </GlassCard>

          {/* Exercise Breakdown */}
          <GlassCard className="!p-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Ghost's Workout</h3>
            <div className="space-y-2">
              {ghost.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-xs text-white font-bold">{ex.name}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{ex.sets}x{ex.reps} @ {ex.weight}kg — {ex.formScore}%</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Scanning Animation */}
          <div className="flex items-center justify-center gap-2 py-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Analyzing Performance...</span>
          </div>
        </motion.div>
      )}

      {/* RESULT STATE */}
      {matchState === 'result' && ghost && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="space-y-4"
        >
          {/* Result Banner */}
          <GlassCard className="!p-6 text-center" highlight={result.won}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            >
              <span className="text-5xl">{result.won ? '🏆' : '💀'}</span>
            </motion.div>

            <motion.h2
              className={`text-2xl font-black uppercase tracking-tight mt-3 ${result.won ? 'text-green-400' : 'text-red-400'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {result.won ? 'VICTORY' : 'DEFEATED'}
            </motion.h2>

            <motion.p
              className="text-xs text-gray-500 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {result.won
                ? `You dominated ${ghost.username} — ${result.playerScore}-${result.ghostScore}`
                : `${ghost.username} edged you out — ${result.ghostScore}-${result.playerScore}`
              }
            </motion.p>

            {result.won && (
              <motion.div
                className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Zap size={12} className="text-yellow-400" />
                <span className="text-xs font-black text-yellow-400">+150 XP</span>
              </motion.div>
            )}
          </GlassCard>

          {/* Final Stat Comparison */}
          <GlassCard className="!p-4 space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Final Results</h3>
            <RaceBar label="Form Score" playerValue={playerStats.formScore} ghostValue={ghost.formScore} unit="%" />
            <RaceBar label="Volume" playerValue={playerStats.totalVolume} ghostValue={ghost.totalVolume} unit=" kg" />
            <RaceBar label="Total Reps" playerValue={playerStats.totalReps} ghostValue={ghost.totalReps} />
          </GlassCard>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setMatchState('lobby'); setGhost(null); }}
              className="py-3 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft size={14} /> Back
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startMatch}
              className="py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #dc2626 100%)',
                boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
              }}
            >
              <RotateCcw size={14} /> Rematch
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GhostMatchView;
