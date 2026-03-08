// =====================================================================
// IRONCORE — NEURO-HACK BINAURAL AUDIO ENGINE
// Production-grade binaural beat generator using Web Audio API
//
// Scientifically-backed frequencies with layered audio design:
// - Binaural beats (stereo L/R frequency difference)
// - Pink noise bed for masking and comfort
// - Isochronic pulse layer for additional entrainment
// - Smooth fade in/out transitions
// - Session timer with auto-stop
// =====================================================================

const AudioContext = window.AudioContext || window.webkitAudioContext;

// ── FREQUENCY PRESETS (research-backed) ──────────────────────────────
// Each preset uses multiple entrainment layers for stronger effect
export const NEURO_PRESETS = {
  godMode: {
    id: 'godMode',
    label: 'God Mode',
    subtitle: '40 Hz Gamma',
    description: 'Peak cognition & hyper-focus',
    beatHz: 40,
    carrierHz: 200,
    color: '#FFD700',
    colorDim: 'rgba(255, 215, 0, 0.12)',
    isochronicHz: 40,      // Matching isochronic pulse
    noiseLevel: 0.02,       // Light pink noise bed
    amplitude: 0.18,        // Slightly louder — power mode
    icon: '⚡',
  },
  flowState: {
    id: 'flowState',
    label: 'Flow State',
    subtitle: '10 Hz Alpha',
    description: 'Deep focus & creativity',
    beatHz: 10,
    carrierHz: 180,
    color: '#0096FF',
    colorDim: 'rgba(0, 150, 255, 0.12)',
    isochronicHz: 10,
    noiseLevel: 0.025,
    amplitude: 0.15,
    icon: '🌊',
  },
  fearless: {
    id: 'fearless',
    label: 'Fearless',
    subtitle: '18 Hz Beta',
    description: 'Alertness & confidence',
    beatHz: 18,
    carrierHz: 190,
    color: '#dc2626',
    colorDim: 'rgba(220, 38, 38, 0.12)',
    isochronicHz: 18,
    noiseLevel: 0.02,
    amplitude: 0.16,
    icon: '🔥',
  },
  recovery: {
    id: 'recovery',
    label: 'Recovery',
    subtitle: '2 Hz Delta',
    description: 'Deep recovery & sleep',
    beatHz: 2,
    carrierHz: 150,
    color: '#22c55e',
    colorDim: 'rgba(34, 197, 94, 0.12)',
    isochronicHz: 2,
    noiseLevel: 0.035,       // More noise — soothing
    amplitude: 0.12,         // Quieter — relaxation
    icon: '🧘',
  },
  deepTheta: {
    id: 'deepTheta',
    label: 'Zen Mind',
    subtitle: '6 Hz Theta',
    description: 'Meditation & insight',
    beatHz: 6,
    carrierHz: 160,
    color: '#a855f7',
    colorDim: 'rgba(168, 85, 247, 0.12)',
    isochronicHz: 6,
    noiseLevel: 0.03,
    amplitude: 0.13,
    icon: '🔮',
  },
  sharpMind: {
    id: 'sharpMind',
    label: 'Sharp Mind',
    subtitle: '14 Hz SMR',
    description: 'Calm alertness & learning',
    beatHz: 14,
    carrierHz: 185,
    color: '#f97316',
    colorDim: 'rgba(249, 115, 22, 0.12)',
    isochronicHz: 14,
    noiseLevel: 0.02,
    amplitude: 0.15,
    icon: '🎯',
  },
};

// ── ENGINE STATE ─────────────────────────────────────────────────────
let audioCtx = null;
let masterGain = null;
let leftOsc = null;
let rightOsc = null;
let leftGain = null;
let rightGain = null;
let merger = null;
let noiseNode = null;
let noiseGain = null;
let isoGain = null;
let isoOsc = null;
let isoModulator = null;
let activePreset = null;
let sessionTimer = null;
let sessionStartTime = null;
let listeners = new Set();

const FADE_TIME = 1.5; // seconds for smooth fade in/out

// ── PUBLIC API ───────────────────────────────────────────────────────

export const NeuroAudio = {
  /**
   * Start a binaural beat session
   * @param {string} presetId - key from NEURO_PRESETS
   * @param {number} durationMin - auto-stop after N minutes (0 = indefinite)
   */
  start(presetId, durationMin = 0) {
    const preset = NEURO_PRESETS[presetId];
    if (!preset) return;

    // Stop any existing session
    this.stop();

    // Init audio context
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // Master gain (controls overall volume + fade)
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(1, now + FADE_TIME);
    masterGain.connect(audioCtx.destination);

    // ── LAYER 1: Binaural beat (stereo sine waves) ──
    const leftFreq = preset.carrierHz;
    const rightFreq = preset.carrierHz + preset.beatHz;

    // Channel merger for true stereo separation
    merger = audioCtx.createChannelMerger(2);

    // Left channel
    leftOsc = audioCtx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(leftFreq, now);
    leftGain = audioCtx.createGain();
    leftGain.gain.setValueAtTime(preset.amplitude, now);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0); // input 0 -> output channel 0 (left)

    // Right channel
    rightOsc = audioCtx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(rightFreq, now);
    rightGain = audioCtx.createGain();
    rightGain.gain.setValueAtTime(preset.amplitude, now);
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1); // input 0 -> output channel 1 (right)

    merger.connect(masterGain);

    leftOsc.start(now);
    rightOsc.start(now);

    // ── LAYER 2: Pink noise bed ──
    if (preset.noiseLevel > 0) {
      noiseNode = createPinkNoise(audioCtx);
      noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(preset.noiseLevel, now);
      noiseNode.connect(noiseGain);
      noiseGain.connect(masterGain);
    }

    // ── LAYER 3: Isochronic pulse (amplitude-modulated tone) ──
    if (preset.isochronicHz > 0) {
      isoOsc = audioCtx.createOscillator();
      isoOsc.type = 'sine';
      isoOsc.frequency.setValueAtTime(preset.carrierHz * 1.5, now); // harmonic above carrier
      isoGain = audioCtx.createGain();
      isoGain.gain.setValueAtTime(0, now);

      // Modulator creates the pulsing effect
      isoModulator = audioCtx.createOscillator();
      isoModulator.type = 'sine';
      isoModulator.frequency.setValueAtTime(preset.isochronicHz, now);

      const modGain = audioCtx.createGain();
      modGain.gain.setValueAtTime(preset.amplitude * 0.3, now); // subtle pulse

      isoModulator.connect(modGain);
      modGain.connect(isoGain.gain);

      isoOsc.connect(isoGain);
      isoGain.connect(masterGain);

      isoOsc.start(now);
      isoModulator.start(now);
    }

    // ── Session tracking ──
    activePreset = preset;
    sessionStartTime = Date.now();

    if (durationMin > 0) {
      sessionTimer = setTimeout(() => this.stop(), durationMin * 60 * 1000);
    }

    notifyListeners();
  },

  /**
   * Stop the current session with a smooth fade out
   */
  stop() {
    if (!audioCtx || !masterGain) {
      cleanup();
      return;
    }

    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + FADE_TIME * 0.5);

    // Cleanup after fade
    setTimeout(() => cleanup(), FADE_TIME * 500 + 100);
  },

  /** Get the currently active preset (or null) */
  getActive() {
    return activePreset;
  },

  /** Get session elapsed time in seconds */
  getElapsed() {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  },

  /** Subscribe to state changes */
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Check if playing */
  isPlaying() {
    return activePreset !== null;
  },
};

// ── INTERNALS ────────────────────────────────────────────────────────

function cleanup() {
  try { leftOsc?.stop(); } catch (e) {}
  try { rightOsc?.stop(); } catch (e) {}
  try { isoOsc?.stop(); } catch (e) {}
  try { isoModulator?.stop(); } catch (e) {}
  try { noiseNode?.disconnect(); } catch (e) {}

  leftOsc = rightOsc = leftGain = rightGain = merger = null;
  noiseNode = noiseGain = isoOsc = isoGain = isoModulator = null;
  masterGain = null;

  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = null;

  activePreset = null;
  sessionStartTime = null;

  notifyListeners();
}

function notifyListeners() {
  listeners.forEach(fn => fn(activePreset));
}

/**
 * Generate pink noise using Paul Kellet's algorithm
 * More natural/comfortable than white noise
 */
function createPinkNoise(ctx) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const node = ctx.createBufferSource();
  node.buffer = buffer;
  node.loop = true;
  node.start();
  return node;
}

export default NeuroAudio;
