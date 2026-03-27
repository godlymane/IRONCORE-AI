/**
 * Voice Cue Service for real-time form correction.
 * Uses Web Speech API (no extra Capacitor plugins needed).
 * Debounces repeated cues to avoid spamming the user.
 */

let voiceEnabled = true;
let lastSpokenMessage = '';
let lastSpokenTime = 0;
const DEBOUNCE_MS = 4000; // Don't repeat same cue within 4 seconds

/**
 * Speak a form correction cue.
 * Debounces repeated messages to avoid spam during continuous detection.
 * @param {string} message - The correction message to speak
 */
export function speakFormCue(message) {
    if (!voiceEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const now = Date.now();
    if (message === lastSpokenMessage && now - lastSpokenTime < DEBOUNCE_MS) return;

    // Cancel any currently speaking utterance
    window.speechSynthesis.cancel();

    try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-US';
        utterance.rate = 1.1;   // Slightly faster for gym urgency
        utterance.pitch = 0.9;  // Slightly deeper for authority
        utterance.volume = 1.0;
        utterance.onerror = () => {}; // Swallow TTS errors during form correction (non-critical)

        // Chrome bug: speechSynthesis can get stuck. Resume if paused.
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);

        lastSpokenMessage = message;
        lastSpokenTime = now;
    } catch {
        // TTS unavailable on this device — silently degrade
    }
}

/** Enable/disable voice cues globally */
export function setVoiceEnabled(enabled) {
    voiceEnabled = enabled;
    if (!enabled && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    // Persist preference
    try { localStorage.setItem('ironcore_voice_enabled', String(enabled)); } catch { }
}

/** @returns {boolean} Whether voice cues are enabled */
export function getVoiceEnabled() {
    try {
        const stored = localStorage.getItem('ironcore_voice_enabled');
        if (stored !== null) voiceEnabled = stored === 'true';
    } catch { }
    return voiceEnabled;
}

/**
 * Pre-defined form correction cues mapped to pose issues.
 * Use these keys when detecting form errors in FormCoach.
 */
export const FORM_CUES = {
    BACK_ROUNDING: 'Straighten your back',
    KNEE_VALGUS: 'Push your knees out',
    ELBOW_FLARE: 'Tuck your elbows in',
    DEPTH_SHALLOW: 'Go deeper on the squat',
    LOCKOUT_MISSING: 'Lock out at the top',
    LEAN_FORWARD: 'Stay upright, chest up',
    NECK_STRAIN: 'Keep your neck neutral',
    HIP_SHIFT: 'Level your hips',
    BAR_PATH_DRIFT: 'Keep the bar closer',
    TEMPO_FAST: 'Slow down the movement',
    ASYMMETRY: 'Even out both sides',
    FATIGUE_WARNING: 'Form is dropping, stay tight',
    GREAT_REP: 'Great form, keep it up',
    WRIST_HYPEREXT: 'Straighten your wrists',
};
