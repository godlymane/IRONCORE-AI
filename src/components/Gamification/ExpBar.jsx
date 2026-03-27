/**
 * ExpBar — Global XP progress bar, always visible at the top of the screen.
 * Thin 4px bar with red gradient fill, shimmer animation, and level badge.
 * Expands on tap to show detailed XP info.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLevelProgress, calculateLevel } from '../../services/arenaService';
import { celebrateLevelUp } from './celebrations';

export const ExpBar = ({ xp = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [flashLevel, setFlashLevel] = useState(false);
  const prevLevelRef = useRef(calculateLevel(xp));

  const level = calculateLevel(xp);
  const { currentLevelXP, xpForNextLevel, progress } = getLevelProgress(xp);

  // Detect level-up
  useEffect(() => {
    if (level > prevLevelRef.current) {
      setFlashLevel(true);
      celebrateLevelUp();
      const timer = setTimeout(() => setFlashLevel(false), 1200);
      prevLevelRef.current = level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = level;
  }, [level]);

  // Auto-collapse expanded view
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 3000);
    return () => clearTimeout(timer);
  }, [expanded]);

  return (
    <div
      className="relative w-full cursor-pointer select-none min-h-[44px] flex items-center"
      onClick={() => setExpanded(!expanded)}
      role="button"
      aria-label={`Level ${level}, ${Math.round(progress)}% to next level. Tap for details`}
      aria-expanded={expanded}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      style={{ zIndex: 45 }}
    >
      {/* Track */}
      <motion.div
        className="w-full rounded-full overflow-hidden"
        animate={{ height: flashLevel ? 8 : 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ background: 'rgba(220, 38, 38, 0.1)' }}
      >
        {/* Fill */}
        <motion.div
          className="h-full rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, mass: 0.5 }}
          style={{
            background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 60%, #f87171 100%)',
          }}
        >
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'progress-shimmer 2s ease-in-out infinite',
            }}
          />
        </motion.div>

        {/* Level-up flash overlay */}
        <AnimatePresence>
          {flashLevel && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{ background: 'white' }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Level Badge (always visible) */}
      <motion.div
        className="absolute -top-0.5 right-2 flex items-center gap-1"
        animate={flashLevel ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <span
          className="text-[10px] font-black text-white px-1.5 py-0.5 rounded-b-md"
          style={{
            background: flashLevel
              ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
              : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            fontSize: '9px',
            letterSpacing: '0.05em',
          }}
        >
          Lv.{level}
        </span>
      </motion.div>

      {/* Expanded Detail Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full right-0 mt-1 px-3 py-2 rounded-xl"
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              background: 'rgba(18, 18, 18, 0.95)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-[10px] font-mono text-gray-400">
                {currentLevelXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </span>
              <span className="text-[10px] font-mono text-red-400">
                {Math.round(progress)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpBar;
