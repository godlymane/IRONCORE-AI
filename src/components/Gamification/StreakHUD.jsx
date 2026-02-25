/**
 * StreakHUD — Floating streak counter with fire icon and multiplier display.
 * Shows current streak, multiplier at thresholds, and expandable detail tooltip.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getMultiplier = (streak) => {
  if (streak >= 30) return { value: '3.0', label: 'x3' };
  if (streak >= 14) return { value: '2.5', label: 'x2.5' };
  if (streak >= 7) return { value: '2.0', label: 'x2' };
  if (streak >= 3) return { value: '1.5', label: 'x1.5' };
  return null;
};

const getFireIntensity = (streak) => {
  if (streak >= 30) return { color: '#fbbf24', animate: true, glow: '0 0 16px rgba(251,191,36,0.5)' };
  if (streak >= 14) return { color: '#f97316', animate: true, glow: '0 0 14px rgba(249,115,22,0.4)' };
  if (streak >= 7) return { color: '#ef4444', animate: true, glow: '0 0 12px rgba(239,68,68,0.4)' };
  if (streak >= 3) return { color: '#dc2626', animate: true, glow: 'none' };
  return { color: '#6b7280', animate: false, glow: 'none' };
};

export const StreakHUD = ({ currentStreak = 0, longestStreak = 0, streakFreezeCount = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const multiplier = getMultiplier(currentStreak);
  const fire = getFireIntensity(currentStreak);

  // Auto-collapse
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 3000);
    return () => clearTimeout(timer);
  }, [expanded]);

  if (currentStreak <= 0) return null;

  return (
    <div className="relative" style={{ zIndex: 44 }}>
      <motion.button
        className="flex items-center gap-1 px-2.5 py-1 rounded-full select-none"
        onClick={() => setExpanded(!expanded)}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'rgba(18, 18, 18, 0.9)',
          border: `1px solid ${currentStreak >= 7 ? 'rgba(220, 38, 38, 0.3)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: fire.glow,
        }}
      >
        {/* Fire Icon */}
        <motion.span
          className="text-sm"
          animate={fire.animate ? {
            scale: [1, 1.15, 1],
            rotate: [0, -3, 3, 0],
          } : {}}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ filter: fire.animate ? `drop-shadow(0 0 4px ${fire.color})` : 'none' }}
        >
          🔥
        </motion.span>

        {/* Streak Count */}
        <span className="text-xs font-black text-white tabular-nums">{currentStreak}</span>

        {/* Multiplier Badge */}
        {multiplier && (
          <motion.span
            className="text-[9px] font-black px-1 py-0.5 rounded"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.6) 0%, rgba(185, 28, 28, 0.4) 100%)',
              color: '#fbbf24',
            }}
          >
            {multiplier.label}
          </motion.span>
        )}
      </motion.button>

      {/* Expanded Tooltip */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full right-0 mt-1.5 px-3 py-2.5 rounded-xl min-w-[160px]"
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              background: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid rgba(220, 38, 38, 0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current</span>
                <span className="text-xs font-black text-white">{currentStreak} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Best</span>
                <span className="text-xs font-black text-gray-300">{longestStreak} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Freezes</span>
                <span className="text-xs font-black text-blue-400">🧊 {streakFreezeCount}</span>
              </div>
              {multiplier && (
                <div className="pt-1 border-t border-white/5">
                  <span className="text-[10px] text-yellow-400 font-bold">
                    XP Multiplier Active: {multiplier.label}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreakHUD;
