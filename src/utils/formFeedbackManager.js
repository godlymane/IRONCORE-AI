/**
 * Form Feedback Manager — Voice + Haptics for Elite Form Coach
 *
 * Bridges form analysis output to user feedback:
 * - Voice cues via speechService (Web Speech API)
 * - Haptic feedback via Capacitor Haptics
 * - Smart debouncing to avoid spamming during continuous detection
 * - Priority system: injury > form error > positive reinforcement
 * - Rep completion celebration
 * - Fatigue warnings
 */

import { speakFormCue, FORM_CUES, getVoiceEnabled } from './speechService.js';
import { hapticHeavy, hapticMedium, hapticLight, hapticWarning, hapticSuccess } from './haptics.js';
import { PHASE } from './formExerciseConfigs.js';

const DEBOUNCE_MS = {
  danger: 3000,    // Injury risk — urgent, repeat quickly to prevent harm
  warning: 5000,   // Form issue — give user time to correct before re-cueing
  info: 8000,      // Minor cue — low urgency, avoid disrupting flow
  positive: 10000, // Praise — infrequent to keep it meaningful
};

export class FormFeedbackManager {
  constructor() {
    this.voiceEnabled = true;
    this.hapticsEnabled = true;
    this.lastCueTimes = {};  // { cueKey: timestamp }
    this.lastRepCount = 0;
    this.lastPhase = PHASE.IDLE;
    this.consecutiveGoodFrames = 0;
    this.lastFatigueWarning = 0;

    // Phase-aware coaching
    this.lastPhaseVoiceTime = 0;
    this.PHASE_VOICE_INTERVAL = 8000;

    // Encouragement scaling
    this.encouragementMode = 'early';
  }

  /**
   * Toggle voice on/off
   */
  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
  }

  /**
   * Toggle haptics on/off
   */
  setHapticsEnabled(enabled) {
    this.hapticsEnabled = enabled;
  }

  /**
   * Process a frame's analysis result and trigger appropriate feedback
   * @param {Object} analysis - Result from FormAnalysisEngine.processFrame()
   */
  processFrame(analysis) {
    const now = Date.now();

    // 1. Rep completion — haptic + voice
    if (analysis.repCount > this.lastRepCount) {
      this._onRepComplete(analysis.repCount, analysis.score);
      this.lastRepCount = analysis.repCount;
    }

    // 2. Phase change haptic
    if (analysis.phaseChanged && analysis.phase !== this.lastPhase) {
      this._onPhaseChange(analysis.phase);
      this.lastPhase = analysis.phase;
    }

    // 3. Injury flags — highest priority
    for (const flag of analysis.injuryFlags) {
      this._triggerCue(flag.cue, 'danger', now);
    }

    // 4. Form issues — medium priority
    for (const issue of (analysis.checkpoints || []).filter(c => c.active && c.result && !c.result.pass)) {
      this._triggerCue(issue.cue, issue.severity, now);
    }

    // 5. Positive reinforcement for sustained good form
    if (analysis.score >= 85) {
      this.consecutiveGoodFrames++;
      // After ~3 seconds of great form (90 frames at 30fps)
      if (this.consecutiveGoodFrames === 90) {
        this._triggerCue('GREAT_REP', 'positive', now);
      }
    } else {
      this.consecutiveGoodFrames = 0;
    }

    // 6. Fatigue-aware coaching
    if (analysis.repCount <= 3) {
      this.encouragementMode = 'early';
    } else if (analysis.fatigueIndex > 0.5) {
      this.encouragementMode = 'late';
    } else {
      this.encouragementMode = 'mid';
    }

    if (analysis.fatigueIndex > 0.5 && now - this.lastFatigueWarning > 12000) {
      const fatigueCues = ['FATIGUE_STAY_TIGHT', 'FATIGUE_DONT_SLIP', 'FATIGUE_ALMOST_DONE'];
      const cue = fatigueCues[Math.floor(Math.random() * fatigueCues.length)];
      this._triggerCue(cue, 'warning', now);
      this.lastFatigueWarning = now;
    }

    // 7. Bilateral asymmetry warning
    if (analysis.bilateralResult?.isAsymmetric) {
      this._triggerCue('ASYMMETRY', 'info', now);
    }
  }

  /**
   * Trigger a voice cue with debouncing
   */
  _triggerCue(cueKey, severity, now) {
    if (!cueKey) return;

    const debounce = DEBOUNCE_MS[severity] || DEBOUNCE_MS.info;
    const lastTime = this.lastCueTimes[cueKey] || 0;

    if (now - lastTime < debounce) return;

    this.lastCueTimes[cueKey] = now;

    // Voice cue
    if (this.voiceEnabled) {
      const message = FORM_CUES[cueKey];
      if (message) {
        speakFormCue(message);
      }
    }

    // Haptic based on severity
    if (this.hapticsEnabled) {
      if (severity === 'danger') {
        hapticWarning();
      } else if (severity === 'warning') {
        hapticMedium();
      }
    }
  }

  /**
   * Handle rep completion — haptic + contextual voice
   */
  _onRepComplete(repCount, score) {
    if (this.hapticsEnabled) {
      if (score >= 85) {
        hapticSuccess();
      } else if (score >= 60) {
        hapticMedium();
      } else {
        hapticHeavy();
      }
    }

    if (this.voiceEnabled) {
      if (score >= 90) {
        if (this.encouragementMode === 'early') {
          const praise = ['Perfect rep.', 'Textbook.', 'Great start.'][repCount % 3];
          speakFormCue(`${repCount}. ${praise}`);
        } else if (this.encouragementMode === 'late') {
          speakFormCue(`${repCount}. Strong. Keep going.`);
        } else {
          const praise = ['Clean.', 'Money rep.', 'Solid.'][repCount % 3];
          speakFormCue(`${repCount}. ${praise}`);
        }
      } else if (score >= 75) {
        speakFormCue(`${repCount}. Solid.`);
      } else if (score >= 60) {
        if (this.encouragementMode === 'late') {
          speakFormCue(`${repCount}. Tighten up. Almost there.`);
        } else {
          speakFormCue(`${repCount}. Tighten up.`);
        }
      } else {
        speakFormCue(`${repCount}. Fix your form.`);
      }
    }
  }

  /**
   * Handle phase change — haptic + phase-aware voice coaching
   */
  _onPhaseChange(phase) {
    if (this.hapticsEnabled) {
      if (phase === PHASE.BOTTOM) {
        hapticLight();
      } else if (phase === PHASE.LOCKOUT) {
        hapticLight();
      }
    }

    const now = Date.now();
    if (!this.voiceEnabled || now - this.lastPhaseVoiceTime < this.PHASE_VOICE_INTERVAL) return;

    const phaseCues = {
      [PHASE.ECCENTRIC]: ['PHASE_ECCENTRIC_1', 'PHASE_ECCENTRIC_2', 'PHASE_ECCENTRIC_3'],
      [PHASE.BOTTOM]: ['PHASE_BOTTOM_1', 'PHASE_BOTTOM_2', 'PHASE_BOTTOM_3'],
      [PHASE.CONCENTRIC]: ['PHASE_CONCENTRIC_1', 'PHASE_CONCENTRIC_2', 'PHASE_CONCENTRIC_3'],
      [PHASE.LOCKOUT]: ['PHASE_LOCKOUT_1', 'PHASE_LOCKOUT_2'],
    };

    const cues = phaseCues[phase];
    if (cues) {
      const cue = cues[Math.floor(Math.random() * cues.length)];
      speakFormCue(FORM_CUES[cue]);
      this.lastPhaseVoiceTime = now;
    }
  }

  /**
   * Reset state for new set
   */
  reset() {
    this.lastCueTimes = {};
    this.lastRepCount = 0;
    this.lastPhase = PHASE.IDLE;
    this.consecutiveGoodFrames = 0;
    this.lastFatigueWarning = 0;
    this.lastPhaseVoiceTime = 0;
    this.encouragementMode = 'early';
  }
}
