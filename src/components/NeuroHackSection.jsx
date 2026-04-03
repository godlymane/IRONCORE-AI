// =====================================================================
// NEURO-HACK BINAURAL — Premium audio frequency section for Dashboard
// Matches the native Android NeuroHackSection but upgraded for web
// =====================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, X, Clock, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { NeuroAudio, NEURO_PRESETS } from '../utils/neuroAudio';
import { SFX, Haptics } from '../utils/audio';

const PRESET_LIST = Object.values(NEURO_PRESETS);

// Animated waveform visualizer
const WaveVisualizer = ({ color, isPlaying }) => {
  const bars = 12;
  return (
    <div className="flex items-center gap-[2px] h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full"
          style={{ backgroundColor: color }}
          animate={isPlaying ? {
            height: [4, 8 + Math.random() * 10, 4, 12 + Math.random() * 6, 4],
          } : { height: 4 }}
          transition={isPlaying ? {
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.05,
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
};

// Timer display
const SessionTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startTime]);

  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  return (
    <span className="tabular-nums text-xs font-mono">
      {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
};

export const NeuroHackSection = () => {
  const [active, setActive] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const headphoneWarning = useRef(false);

  // Subscribe to NeuroAudio state
  useEffect(() => {
    return NeuroAudio.subscribe((preset) => {
      setActive(preset);
      setSessionStart(preset ? Date.now() : null);
    });
  }, []);

  const handlePresetTap = useCallback((preset) => {
    Haptics.medium();

    if (active?.id === preset.id) {
      // Tapping active preset stops it
      NeuroAudio.stop();
      SFX.modalClose();
      return;
    }

    // Start new preset
    NeuroAudio.start(preset.id);
    SFX.click();

    // Show headphone tip on first use
    if (!headphoneWarning.current) {
      headphoneWarning.current = true;
    }
  }, [active]);

  const handleStop = useCallback(() => {
    Haptics.light();
    NeuroAudio.stop();
    SFX.modalClose();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: active
                ? `linear-gradient(135deg, ${active.color}33, ${active.color}11)`
                : 'rgba(168, 85, 247, 0.12)',
              border: `1px solid ${active ? active.color + '44' : 'rgba(168, 85, 247, 0.25)'}`,
            }}
          >
            <Headphones size={14} className={active ? '' : 'text-purple-400'} style={active ? { color: active.color } : {}} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-300">
            Neuro-Hack
          </span>
          {active && (
            <WaveVisualizer color={active.color} isPlaying={true} />
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Active Session Banner */}
            <AnimatePresence>
              {active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3"
                >
                  <div
                    className="rounded-2xl p-3 flex items-center justify-between"
                    style={{
                      background: `linear-gradient(135deg, ${active.color}18, ${active.color}08)`,
                      border: `1px solid ${active.color}30`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                        style={{
                          background: `${active.color}22`,
                          boxShadow: `0 0 20px ${active.color}20`,
                        }}
                      >
                        {active.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{active.label}</p>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock size={10} />
                          <SessionTimer startTime={sessionStart} />
                          <span className="text-[10px]">•</span>
                          <Volume2 size={10} />
                          <span className="text-[10px]">{active.subtitle}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleStop}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 active:bg-white/10"
                    >
                      <X size={16} className="text-gray-400" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1 flex items-center gap-1">
                    <Headphones size={10} /> Use headphones for binaural effect
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preset Grid */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_LIST.map((preset) => {
                const isActive = active?.id === preset.id;
                return (
                  <motion.button
                    key={preset.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePresetTap(preset)}
                    className="relative rounded-2xl p-3 text-left transition-all overflow-hidden"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${preset.color}25, ${preset.color}10)`
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? preset.color + '50' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isActive ? `0 0 25px ${preset.color}15` : 'none',
                    }}
                  >
                    {/* Glow effect when active */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          background: `radial-gradient(circle at center, ${preset.color}15, transparent 70%)`,
                        }}
                      />
                    )}

                    <div className="relative z-10">
                      <span className="text-lg">{preset.icon}</span>
                      <p
                        className="text-xs font-bold mt-1.5"
                        style={{ color: isActive ? preset.color : '#e5e7eb' }}
                      >
                        {preset.label}
                      </p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                        {preset.subtitle}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NeuroHackSection;
