/**
 * ForgeHUD — Floating Forge counter with fire icon, multiplier display, and Forge Shield button.
 * Shows current Forge count, XP multiplier at thresholds, shield count with confirm + CF call.
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFunctions, httpsCallable } from 'firebase/functions';

const getMultiplier = (forge) => {
  if (forge >= 30) return { value: '3.0', label: 'x3' };
  if (forge >= 14) return { value: '2.5', label: 'x2.5' };
  if (forge >= 7) return { value: '2.0', label: 'x2' };
  if (forge >= 3) return { value: '1.5', label: 'x1.5' };
  return null;
};

const getFireIntensity = (forge) => {
  if (forge >= 30) return { color: '#fbbf24', animate: true, glow: '0 0 16px rgba(251,191,36,0.5)' };
  if (forge >= 14) return { color: '#f97316', animate: true, glow: '0 0 14px rgba(249,115,22,0.4)' };
  if (forge >= 7) return { color: '#ef4444', animate: true, glow: '0 0 12px rgba(239,68,68,0.4)' };
  if (forge >= 3) return { color: '#dc2626', animate: true, glow: 'none' };
  return { color: '#6b7280', animate: false, glow: 'none' };
};

export const ForgeHUD = ({ currentForge = 0, longestForge = 0, forgeShieldCount = 0, onShieldUsed }) => {
  const [expanded, setExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [shieldLoading, setShieldLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const multiplier = getMultiplier(currentForge);
  const fire = getFireIntensity(currentForge);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleUseShield = useCallback(async () => {
    if (shieldLoading) return;
    setShieldLoading(true);
    setShowConfirm(false);
    try {
      const functions = getFunctions();
      const useForgeShield = httpsCallable(functions, 'useForgeShield');
      await useForgeShield();
      showToast('Forge protected 🛡️');
      onShieldUsed?.();
    } catch (err) {
      showToast(err.message || 'Failed to activate shield', 'error');
    } finally {
      setShieldLoading(false);
    }
  }, [shieldLoading, onShieldUsed, showToast]);

  if (currentForge <= 0) return null;

  return (
    <div className="relative flex items-center gap-1.5" style={{ zIndex: 44 }}>
      {/* Forge counter button */}
      <motion.button
        className="flex items-center gap-1 px-2.5 py-1 rounded-full select-none"
        onClick={() => { setExpanded(!expanded); setShowConfirm(false); }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: 'rgba(18, 18, 18, 0.9)',
          border: `1px solid ${currentForge >= 7 ? 'rgba(220, 38, 38, 0.3)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: fire.glow,
        }}
      >
        {/* Fire Icon */}
        <motion.span
          className="text-sm"
          animate={fire.animate ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: fire.animate ? `drop-shadow(0 0 4px ${fire.color})` : 'none' }}
        >
          🔥
        </motion.span>

        {/* Forge Count */}
        <span className="text-xs font-black text-white tabular-nums">{currentForge}</span>

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

      {/* Forge Shield button */}
      {forgeShieldCount > 0 && (
        <motion.button
          className="flex items-center gap-0.5 px-2 py-1 rounded-full select-none"
          onClick={() => { setShowConfirm(true); setExpanded(false); }}
          whileTap={{ scale: 0.92 }}
          disabled={shieldLoading}
          style={{
            background: 'rgba(18, 18, 18, 0.9)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 0 8px rgba(59,130,246,0.15)',
          }}
        >
          <span className="text-sm">🛡️</span>
          <span className="text-[10px] font-black text-blue-400 tabular-nums">{forgeShieldCount}</span>
        </motion.button>
      )}

      {/* Expanded tooltip */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="absolute top-full right-0 mt-1.5 px-3 py-2.5 rounded-xl min-w-[170px]"
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
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Forge</span>
                <span className="text-xs font-black text-white">{currentForge} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Best</span>
                <span className="text-xs font-black text-gray-300">{longestForge} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Shields</span>
                <span className="text-xs font-black text-blue-400">🛡️ {forgeShieldCount}</span>
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

      {/* Shield confirm dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="absolute top-full right-0 mt-1.5 px-4 py-3 rounded-xl min-w-[220px]"
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              background: 'rgba(10, 10, 10, 0.97)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <p className="text-xs text-white font-semibold mb-1 leading-snug">
              Use 1 Forge Shield to protect today's Forge?
            </p>
            <p className="text-[10px] text-gray-500 mb-3">
              {forgeShieldCount} shield{forgeShieldCount !== 1 ? 's' : ''} remaining
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUseShield}
                disabled={shieldLoading}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-black text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {shieldLoading ? '...' : 'Use Shield'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute top-full right-0 mt-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              background: toast.type === 'error' ? 'rgba(220,38,38,0.9)' : 'rgba(22,163,74,0.9)',
              color: '#fff',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForgeHUD;
