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

    // 6. Fatigue warning
    if (analysis.fatigueIndex > 0.5 && now - this.lastFatigueWarning > 15000) {
      this._triggerCue('FATIGUE_WARNING', 'warning', now);
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
   * Handle rep completion
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
        const praise = ['Perfect rep.', 'Textbook.', 'Clean.', 'Money rep.'][repCount % 4];
        speakFormCue(`${repCount}. ${praise}`);
      } else if (score >= 75) {
        speakFormCue(`${repCount}. Solid.`);
      } else if (score >= 60) {
        speakFormCue(`${repCount}. Tighten up.`);
      } else {
        speakFormCue(`${repCount}. Fix your form.`);
      }
    }
  }

  /**
   * Handle phase change — light haptic on transitions
   */
  _onPhaseChange(phase) {
    if (!this.hapticsEnabled) return;

    if (phase === PHASE.BOTTOM) {
      hapticLight(); // Reached bottom
    } else if (phase === PHASE.LOCKOUT) {
      hapticLight(); // Reached top
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
  }
}
