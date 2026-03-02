// ========================================
// IRONCORE — PREMIUM SOUND SYSTEM
// Synthesized sounds with haptic patterns
// ========================================

import { Capacitor } from '@capacitor/core';

const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = null;

// Lazy initialization to avoid autoplay restrictions
const getContext = () => {
    if (!ctx) ctx = new AudioContext();
    return ctx;
};

const playTone = (freq, type, duration, vol = 0.1) => {
    const audioCtx = getContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

// Capacitor native haptics (lazy-loaded on native platforms)
let NativeHaptics = null;
if (Capacitor.isNativePlatform()) {
    import('@capacitor/haptics').then(m => { NativeHaptics = m.Haptics; }).catch(() => {});
}

// Haptic patterns — native Capacitor on iOS/Android, Web Vibration API fallback
export const Haptics = {
    light: () => NativeHaptics ? NativeHaptics.impact({ style: 'light' }) : navigator.vibrate?.(10),
    medium: () => NativeHaptics ? NativeHaptics.impact({ style: 'medium' }) : navigator.vibrate?.(25),
    heavy: () => NativeHaptics ? NativeHaptics.impact({ style: 'heavy' }) : navigator.vibrate?.(50),
    success: () => NativeHaptics ? NativeHaptics.notification({ type: 'success' }) : navigator.vibrate?.([10, 50, 10]),
    error: () => NativeHaptics ? NativeHaptics.notification({ type: 'error' }) : navigator.vibrate?.([50, 30, 50, 30, 50]),
    double: () => NativeHaptics ? NativeHaptics.impact({ style: 'medium' }) : navigator.vibrate?.([15, 50, 15]),
    celebration: () => NativeHaptics ? NativeHaptics.notification({ type: 'success' }) : navigator.vibrate?.([10, 30, 10, 30, 10, 30, 50]),
};

export const SFX = {
    // Basic interactions
    click: () => {
        playTone(400, 'sine', 0.04, 0.03);
        Haptics.light();
    },

    tap: () => {
        playTone(600, 'sine', 0.03, 0.02);
    },

    // Workout sounds
    completeSet: () => {
        playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(800, 'sine', 0.2, 0.1), 100);
        Haptics.success();
    },

    timerFinished: () => {
        playTone(800, 'square', 0.1, 0.1);
        setTimeout(() => playTone(800, 'square', 0.1, 0.1), 200);
        setTimeout(() => playTone(800, 'square', 0.4, 0.1), 400);
        Haptics.heavy();
    },

    // XP & Achievement sounds
    xpGain: () => {
        playTone(800, 'sine', 0.08, 0.06);
        setTimeout(() => playTone(1000, 'sine', 0.1, 0.08), 80);
        Haptics.light();
    },

    levelUp: () => {
        playTone(400, 'sine', 0.1, 0.12);
        setTimeout(() => playTone(500, 'sine', 0.1, 0.12), 100);
        setTimeout(() => playTone(600, 'sine', 0.1, 0.12), 200);
        setTimeout(() => playTone(800, 'triangle', 0.4, 0.15), 300);
        Haptics.celebration();
    },

    achievement: () => {
        playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(800, 'sine', 0.1, 0.1), 100);
        setTimeout(() => playTone(1000, 'sine', 0.15, 0.12), 200);
        setTimeout(() => playTone(1200, 'triangle', 0.3, 0.1), 350);
        Haptics.celebration();
    },

    forgeMilestone: () => {
        playTone(500, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(700, 'sine', 0.1, 0.1), 120);
        setTimeout(() => playTone(900, 'sine', 0.15, 0.12), 240);
        setTimeout(() => playTone(1100, 'sine', 0.2, 0.1), 360);
        Haptics.celebration();
    },

    // Arena/Battle sounds
    battleStart: () => {
        playTone(100, 'sawtooth', 0.5, 0.15);
        setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.1), 200);
        Haptics.heavy();
    },

    battleWin: () => {
        playTone(400, 'triangle', 0.1, 0.1);
        setTimeout(() => playTone(600, 'triangle', 0.1, 0.1), 100);
        setTimeout(() => playTone(800, 'triangle', 0.2, 0.12), 200);
        setTimeout(() => playTone(1000, 'triangle', 0.4, 0.15), 350);
        Haptics.celebration();
    },

    battleLose: () => {
        playTone(300, 'sawtooth', 0.2, 0.1);
        setTimeout(() => playTone(200, 'sawtooth', 0.3, 0.08), 200);
        setTimeout(() => playTone(100, 'sawtooth', 0.5, 0.06), 400);
        Haptics.error();
    },

    // UI feedback sounds
    success: () => {
        playTone(600, 'sine', 0.08, 0.08);
        setTimeout(() => playTone(900, 'sine', 0.15, 0.1), 100);
        Haptics.success();
    },

    error: () => {
        playTone(200, 'square', 0.15, 0.1);
        setTimeout(() => playTone(150, 'square', 0.2, 0.08), 150);
        Haptics.error();
    },

    warning: () => {
        playTone(400, 'triangle', 0.15, 0.08);
        setTimeout(() => playTone(400, 'triangle', 0.15, 0.08), 200);
        Haptics.double();
    },

    // Navigation sounds
    swipe: () => {
        playTone(500, 'sine', 0.05, 0.03);
    },

    pageTransition: () => {
        playTone(300, 'sine', 0.08, 0.02);
        setTimeout(() => playTone(400, 'sine', 0.06, 0.02), 50);
    },

    modalOpen: () => {
        playTone(400, 'sine', 0.06, 0.04);
        setTimeout(() => playTone(600, 'sine', 0.08, 0.05), 60);
    },

    modalClose: () => {
        playTone(500, 'sine', 0.05, 0.03);
        setTimeout(() => playTone(350, 'sine', 0.06, 0.02), 50);
    },

    // Special effects
    countdown: () => {
        playTone(600, 'sine', 0.1, 0.08);
        Haptics.light();
    },

    countdownFinal: () => {
        playTone(800, 'triangle', 0.2, 0.12);
        Haptics.medium();
    },

    purchase: () => {
        playTone(800, 'sine', 0.1, 0.08);
        setTimeout(() => playTone(1000, 'sine', 0.1, 0.1), 100);
        setTimeout(() => playTone(1200, 'sine', 0.15, 0.08), 200);
        Haptics.success();
    },

    refresh: () => {
        playTone(500, 'sine', 0.08, 0.04);
        setTimeout(() => playTone(700, 'sine', 0.08, 0.05), 80);
        Haptics.double();
    },
};


