// Simple synthesizer for app sound effects without external assets
const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

const playTone = (freq, type, duration, vol = 0.1) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
};

export const SFX = {
    completeSet: () => {
        playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(800, 'sine', 0.2, 0.1), 100);
    },
    timerFinished: () => {
        playTone(800, 'square', 0.1, 0.1);
        setTimeout(() => playTone(800, 'square', 0.1, 0.1), 200);
        setTimeout(() => playTone(800, 'square', 0.4, 0.1), 400);
    },
    levelUp: () => {
        playTone(400, 'sine', 0.1);
        setTimeout(() => playTone(500, 'sine', 0.1), 100);
        setTimeout(() => playTone(600, 'sine', 0.1), 200);
        setTimeout(() => playTone(800, 'triangle', 0.4, 0.2), 300);
    },
    battleStart: () => {
        playTone(100, 'sawtooth', 0.5, 0.2);
    },
    click: () => {
        playTone(300, 'sine', 0.05, 0.05);
    }
};