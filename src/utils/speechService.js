/**
 * Voice Cue Service for real-time form correction.
 * Uses Web Speech API (no extra Capacitor plugins needed).
 * Debounces repeated cues to avoid spamming the user.
 */

let voiceEnabled = true;

/**
 * Speak a form correction cue.
 * No debouncing here — FormFeedbackManager handles all timing/debouncing.
 * This is a pure speech output function.
 * @param {string} message - The correction message to speak
 */
export function speakFormCue(message) {
    if (!voiceEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

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
    // Injury prevention — urgent, clear
    BACK_ROUNDING: 'Back is rounding. Brace your core.',
    KNEE_VALGUS: 'Knees caving in. Push them out.',
    ELBOW_FLARE: 'Elbows flaring. Tuck them in tight.',
    NECK_STRAIN: 'Head too far forward. Neutral spine.',
    WRIST_HYPEREXT: 'Wrists bending back. Keep them straight.',
    HIP_SHIFT: 'Hips shifting. Stay centered.',

    // Form corrections — coaching tone
    DEPTH_SHALLOW: 'Go deeper. Break parallel.',
    LOCKOUT_MISSING: 'Full lockout at the top.',
    LEAN_FORWARD: 'Chest up. Stay upright.',
    BAR_PATH_DRIFT: 'Bar drifting forward. Pull it close.',
    TEMPO_FAST: 'Control the movement. Slow it down.',

    // Awareness cues
    ASYMMETRY: 'One side is working harder. Even it out.',
    FATIGUE_WARNING: 'Form is breaking down. Focus or rack it.',

    // Positive reinforcement
    GREAT_REP: 'Textbook. Keep that energy.',

    // Phase-aware coaching
    PHASE_ECCENTRIC_1: 'Slow and controlled.',
    PHASE_ECCENTRIC_2: 'Keep the tension.',
    PHASE_ECCENTRIC_3: 'Nice and steady.',
    PHASE_BOTTOM_1: 'Hold.',
    PHASE_BOTTOM_2: 'Chest up.',
    PHASE_BOTTOM_3: 'Brace hard.',
    PHASE_CONCENTRIC_1: 'Drive up!',
    PHASE_CONCENTRIC_2: 'Explode!',
    PHASE_CONCENTRIC_3: 'Push through!',
    PHASE_LOCKOUT_1: 'Squeeze at the top.',
    PHASE_LOCKOUT_2: 'Lock it out.',

    // Fatigue-aware coaching
    FATIGUE_STAY_TIGHT: 'Last few reps. Stay tight.',
    FATIGUE_DONT_SLIP: "Don't let form slip.",
    FATIGUE_ALMOST_DONE: 'Almost done. Finish strong.',

    // Encouragement scaling
    EARLY_SET_PRAISE: 'Great start. Keep it up.',
    MID_SET_PRAISE: 'Looking strong.',
    COMBO_PRAISE: 'On fire! Keep the combo going.',
};
