// Polyfill for CanvasRenderingContext2D.roundRect (Safari <16, older Chrome)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
    };
}

/**
 * Form Canvas Renderer — Visual overlay for Elite Form Coach
 *
 * Draws on the canvas overlay:
 * - Phase-aware skeleton (green/yellow/red per checkpoint status)
 * - Bar path: actual path (color-coded by phase) vs ideal (dashed white)
 * - Ghost overlay: semi-transparent cyan skeleton from best rep at 30% opacity
 * - Injury zone highlights: pulsing red circles around at-risk joints
 * - Phase indicator text
 * - Score badge
 */

import { KP, BILATERAL_PAIRS, PHASE } from './formExerciseConfigs.js';

// --- Skeleton connections (MoveNet 17-point) ---
const SKELETON_CONNECTIONS = [
  // Head
  [KP.LEFT_EAR, KP.LEFT_EYE],
  [KP.LEFT_EYE, KP.NOSE],
  [KP.NOSE, KP.RIGHT_EYE],
  [KP.RIGHT_EYE, KP.RIGHT_EAR],
  // Torso
  [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  [KP.LEFT_SHOULDER, KP.LEFT_HIP],
  [KP.RIGHT_SHOULDER, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.RIGHT_HIP],
  // Left arm
  [KP.LEFT_SHOULDER, KP.LEFT_ELBOW],
  [KP.LEFT_ELBOW, KP.LEFT_WRIST],
  // Right arm
  [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW],
  [KP.RIGHT_ELBOW, KP.RIGHT_WRIST],
  // Left leg
  [KP.LEFT_HIP, KP.LEFT_KNEE],
  [KP.LEFT_KNEE, KP.LEFT_ANKLE],
  // Right leg
  [KP.RIGHT_HIP, KP.RIGHT_KNEE],
  [KP.RIGHT_KNEE, KP.RIGHT_ANKLE],
];

// Phase colors
const PHASE_COLORS = {
  [PHASE.IDLE]: '#888888',
  [PHASE.ECCENTRIC]: '#3b82f6',   // Blue — lowering
  [PHASE.BOTTOM]: '#f59e0b',      // Amber — hold
  [PHASE.CONCENTRIC]: '#22c55e',  // Green — lifting
  [PHASE.LOCKOUT]: '#a855f7',     // Purple — lockout
};

// Phase glow colors (semi-transparent for shadow layer)
const PHASE_GLOW_COLORS = {
  [PHASE.IDLE]: 'rgba(136, 136, 136, 0.3)',
  [PHASE.ECCENTRIC]: 'rgba(59, 130, 246, 0.4)',
  [PHASE.BOTTOM]: 'rgba(245, 158, 11, 0.4)',
  [PHASE.CONCENTRIC]: 'rgba(34, 197, 94, 0.4)',
  [PHASE.LOCKOUT]: 'rgba(168, 85, 247, 0.4)',
};

// Bar path phase colors
const BAR_PATH_COLORS = {
  [PHASE.ECCENTRIC]: 'rgba(59, 130, 246, 0.6)',
  [PHASE.BOTTOM]: 'rgba(245, 158, 11, 0.6)',
  [PHASE.CONCENTRIC]: 'rgba(34, 197, 94, 0.6)',
  [PHASE.LOCKOUT]: 'rgba(168, 85, 247, 0.6)',
  [PHASE.IDLE]: 'rgba(136, 136, 136, 0.3)',
};

// Joint name to keypoint indices for injury highlights
const JOINT_TO_KP = {
  knee: [KP.LEFT_KNEE, KP.RIGHT_KNEE],
  hip: [KP.LEFT_HIP, KP.RIGHT_HIP],
  shoulder: [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  wrist: [KP.LEFT_WRIST, KP.RIGHT_WRIST],
  elbow: [KP.LEFT_ELBOW, KP.RIGHT_ELBOW],
  ankle: [KP.LEFT_ANKLE, KP.RIGHT_ANKLE],
};

const MIN_CONFIDENCE = 0.3;

export class FormCanvasRenderer {
  constructor() {
    this.pulsePhase = 0;

    // Score ring animation
    this.displayedScore = 0;
    this.scoreRingPulse = 0;

    // Rep counter animation
    this.displayedRepCount = 0;
    this.repBounce = 0;

    // Rep toast
    this.activeToast = null;
    this.TOAST_DURATION = 1500;

    // Phase banner animation
    this.lastPhase = null;
    this.phaseBannerAlpha = 0;

    // Edge glow on rep complete
    this.edgeGlowIntensity = 0;
    this.edgeGlowColor = '#22c55e';

    // Timing
    this.lastFrameTime = Date.now();

    // Combo
    this.displayedCombo = 0;
    this.comboPulse = 0;
    this.comboBreakFlash = 0;
    this.streakParticles = [];

    // Cue card
    this.activeCueCard = null;
    this.CUE_CARD_DURATION = 2500;
  }

  /**
   * Draw a complete frame overlay
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} keypoints - MoveNet keypoints (in video pixel coordinates)
   * @param {Object} analysis - Result from FormAnalysisEngine.processFrame()
   * @param {Object} options - { showGhost, showBarPath, showScore, showPhase, isElite, videoWidth, videoHeight }
   *   videoWidth/videoHeight: original video dimensions so we can compute
   *   consistent scale factors when canvas size differs from video size.
   */
  drawFrame(ctx, keypoints, analysis, options = {}) {
    if (!ctx || !ctx.canvas || !ctx.canvas.parentElement) return;
    const {
      showGhost = true,
      showBarPath = true,
      showScore = true,
      showPhase = true,
      isElite = false,
      videoWidth,
      videoHeight,
    } = options;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const now = Date.now();
    this.lastFrameTime = now;

    if (!videoWidth || !videoHeight) console.debug('[FormCanvasRenderer] videoWidth/videoHeight not provided — using 1:1 scale');
    const scaleX = videoWidth ? w / videoWidth : 1;
    const scaleY = videoHeight ? h / videoHeight : 1;

    ctx.clearRect(0, 0, w, h);

    if (!keypoints || keypoints.length < 17) return;

    // 1. Edge glow (behind everything)
    if (this.edgeGlowIntensity > 0.01) {
      this._drawEdgeGlow(ctx, w, h);
      this.edgeGlowIntensity *= 0.94;
    }

    // 2. Ghost overlay (elite only)
    if (isElite && showGhost && analysis.bestRepKeypoints) {
      this._drawGhostSkeleton(ctx, analysis.bestRepKeypoints, w, h, scaleX, scaleY);
    }

    // 3. Bar path (elite only)
    if (isElite && showBarPath && analysis.barPathPoints.length > 2) {
      this._drawBarPath(ctx, analysis.barPathPoints, w, h);
    }

    // 4. Injury zone highlights
    if (analysis.injuryFlags.length > 0) {
      this._drawInjuryHighlights(ctx, keypoints, analysis.injuryFlags, w, h, scaleX, scaleY);
    }

    // 5. Main skeleton (neon glow)
    this._drawSkeleton(ctx, keypoints, analysis, w, h, scaleX, scaleY);

    // 6. Phase banner (bottom-center)
    if (showPhase) {
      this._drawPhaseIndicator(ctx, analysis.phase, w, h);
    }

    // 7. Score ring (top-right)
    if (showScore && analysis.score > 0) {
      this._drawScoreRing(ctx, analysis.score, w, h);
    }

    // 8. Rep counter (top-left)
    if (analysis.repCount > 0) {
      if (analysis.repCount > this.displayedRepCount && analysis.score > 0) {
        this.triggerRepToast(analysis.score, analysis.comboCount);
      }
      this._drawRepCounter(ctx, analysis.repCount, w, h);
    }

    // 9. Rep toast (right side)
    this._drawRepToast(ctx, w, h);

    // 9b. Combo counter
    if (analysis.comboCount >= 2) {
      this._drawComboCounter(ctx, analysis.comboCount, w, h);
    }

    // 9c. Combo break flash
    if (analysis.comboJustBroke && this.displayedCombo >= 2) {
      this.comboBreakFlash = 1.0;
      this.displayedCombo = 0;
    }
    this._drawComboBreak(ctx, w, h);

    // 9d. Streak fire particles (combo >= 5)
    if (analysis.comboCount >= 5) {
      this._drawStreakFire(ctx, keypoints, analysis.comboCount, w, h, scaleX, scaleY);
    }

    // 9e. Contextual cue card
    this._drawCueCard(ctx, keypoints, w, h, scaleX, scaleY);

    // 10. Side indicator (bottom-left)
    this._drawSideIndicator(ctx, analysis.activeSide, w, h);

    // 11. Partial rep indicator
    if (analysis.partialRep) {
      this._drawPartialRepIndicator(ctx, w, h);
    }

    // Advance pulse animation
    this.pulsePhase = (this.pulsePhase + 0.15) % (Math.PI * 2);
  }

  /**
   * Draw the main skeleton with neon glow effect
   * Two-pass: wide blurred glow underneath, thin sharp stroke on top
   */
  _drawSkeleton(ctx, keypoints, analysis, w, h, scaleX = 1, scaleY = 1) {
    const phase = analysis.phase;
    const baseColor = PHASE_COLORS[phase] || '#00ff00';
    const glowColor = PHASE_GLOW_COLORS[phase] || 'rgba(0, 255, 0, 0.3)';

    const badJoints = new Set();
    for (const issue of analysis.injuryFlags) {
      for (const joint of (issue.joints || [])) {
        const kpIndices = JOINT_TO_KP[joint];
        if (kpIndices) kpIndices.forEach(i => badJoints.add(i));
      }
    }

    // Pass 1: Glow layer (wide, blurred)
    ctx.save();
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      const isBad = badJoints.has(startIdx) || badJoints.has(endIdx);
      ctx.beginPath();
      ctx.moveTo(start.x * scaleX, start.y * scaleY);
      ctx.lineTo(end.x * scaleX, end.y * scaleY);
      ctx.strokeStyle = isBad ? 'rgba(239, 68, 68, 0.3)' : glowColor;
      ctx.shadowColor = isBad ? '#ef4444' : baseColor;
      ctx.stroke();
    }
    ctx.restore();

    // Pass 2: Sharp lines on top
    ctx.save();
    ctx.lineCap = 'round';
    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      const isBad = badJoints.has(startIdx) || badJoints.has(endIdx);
      const minScore = Math.min(start.score, end.score);
      const alpha = minScore < 0.5 ? 0.4 : 1.0;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(start.x * scaleX, start.y * scaleY);
      ctx.lineTo(end.x * scaleX, end.y * scaleY);
      ctx.strokeStyle = isBad ? '#ef4444' : baseColor;
      ctx.lineWidth = isBad ? 3.5 : 2.5;

      if (minScore < 0.5) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Draw keypoint nodes
    const JOINT_INDICES = new Set([
      KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER,
      KP.LEFT_ELBOW, KP.RIGHT_ELBOW,
      KP.LEFT_HIP, KP.RIGHT_HIP,
      KP.LEFT_KNEE, KP.RIGHT_KNEE,
    ]);

    for (let i = 0; i < keypoints.length; i++) {
      const kp = keypoints[i];
      if (!kp || kp.score < MIN_CONFIDENCE) continue;

      const isBad = badJoints.has(i);
      const cx = kp.x * scaleX;
      const cy = kp.y * scaleY;
      const color = isBad ? '#ef4444' : baseColor;
      const pulseExtra = analysis.phaseChanged ? Math.sin(this.pulsePhase * 3) * 2 : 0;

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      if (JOINT_INDICES.has(i)) {
        const size = (isBad ? 7 : 5) + pulseExtra;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const radius = (isBad ? 5 : 3.5) + pulseExtra;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * Draw ghost skeleton from best rep (semi-transparent cyan)
   */
  _drawGhostSkeleton(ctx, ghostKps, w, h, scaleX = 1, scaleY = 1) {
    ctx.save();
    ctx.globalAlpha = 0.25;

    // Draw connections (ghost keypoints are in video pixel coords, scale to canvas)
    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = ghostKps[startIdx];
      const end = ghostKps[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      ctx.beginPath();
      ctx.moveTo(start.x * scaleX, start.y * scaleY);
      ctx.lineTo(end.x * scaleX, end.y * scaleY);
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
    }

    // Draw keypoints
    for (const kp of ghostKps) {
      if (!kp || kp.score < MIN_CONFIDENCE) continue;
      ctx.beginPath();
      ctx.arc(kp.x * scaleX, kp.y * scaleY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Draw bar path — colored by phase
   */
  _drawBarPath(ctx, points, w, h) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineWidth = 2;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      ctx.beginPath();
      ctx.moveTo(prev.x * w, prev.y * h);
      ctx.lineTo(curr.x * w, curr.y * h);
      ctx.strokeStyle = BAR_PATH_COLORS[curr.phase] || BAR_PATH_COLORS[PHASE.IDLE];
      ctx.stroke();
    }

    // Draw current position dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x * w, last.y * h, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw pulsing red circles around at-risk joints
   */
  _drawInjuryHighlights(ctx, keypoints, injuryFlags, w, h, scaleX = 1, scaleY = 1) {
    const pulse = Math.sin(this.pulsePhase);
    const pulseScale = 1 + pulse * 0.4;

    for (const flag of injuryFlags) {
      for (const jointName of (flag.joints || [])) {
        const kpIndices = JOINT_TO_KP[jointName];
        if (!kpIndices) continue;

        for (const idx of kpIndices) {
          const kp = keypoints[idx];
          if (!kp || kp.score < MIN_CONFIDENCE) continue;

          const radius = 28 * pulseScale;
          const cx = kp.x * scaleX;
          const cy = kp.y * scaleY;

          // Outer danger ring — thick, urgent
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.3})`;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Middle ring
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.7, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + pulse * 0.2})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Inner fill glow
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.5, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + pulse * 0.15})`;
          ctx.fill();

          // Warning text label above the joint
          if (flag.name) {
            ctx.save();
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(239, 68, 68, ${0.7 + pulse * 0.3})`;
            ctx.fillText(flag.name.toUpperCase(), cx, cy - radius - 6);
            ctx.restore();
          }
        }
      }
    }

    // Red vignette at screen edges when danger is active
    const hasDanger = injuryFlags.some(f => f.severity === 'danger');
    if (hasDanger) {
      const vignetteIntensity = 0.3 + Math.sin(this.pulsePhase) * 0.15;

      ctx.save();
      const topG = ctx.createLinearGradient(0, 0, 0, 50);
      topG.addColorStop(0, `rgba(239, 68, 68, ${vignetteIntensity})`);
      topG.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, w, 50);

      const botG = ctx.createLinearGradient(0, h, 0, h - 50);
      botG.addColorStop(0, `rgba(239, 68, 68, ${vignetteIntensity})`);
      botG.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = botG;
      ctx.fillRect(0, h - 50, w, 50);

      ctx.restore();
    }
  }

  /**
   * Draw phase banner — bottom-center, slides in on phase change, fades
   */
  _drawPhaseIndicator(ctx, phase, w, h) {
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.phaseBannerAlpha = phase === PHASE.IDLE ? 0 : 1.0;
    }

    if (phase === PHASE.IDLE || this.phaseBannerAlpha < 0.01) {
      this.phaseBannerAlpha *= 0.9;
      return;
    }

    this.phaseBannerAlpha *= 0.997;

    const labels = {
      [PHASE.ECCENTRIC]: 'LOWERING',
      [PHASE.BOTTOM]: 'HOLD',
      [PHASE.CONCENTRIC]: 'LIFTING',
      [PHASE.LOCKOUT]: 'LOCKOUT',
    };

    const label = labels[phase] || '';
    const color = PHASE_COLORS[phase] || '#888';

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.phaseBannerAlpha);

    const x = w / 2;
    const y = h - 50;

    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(label);
    const px = 16, py = 8;
    const pillW = metrics.width + px * 2;
    const pillH = 20 + py * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 12);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, 3, [12, 12, 0, 0]);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);

    ctx.restore();
  }

  /**
   * Draw animated score ring — arc fills based on score, color shifts, pulses on rep complete
   */
  _drawScoreRing(ctx, score, w, h) {
    this.displayedScore += (score - this.displayedScore) * 0.15;
    const displayScore = Math.round(this.displayedScore);

    const color = displayScore >= 90 ? '#22c55e' : displayScore >= 75 ? '#3b82f6' : displayScore >= 60 ? '#f59e0b' : '#ef4444';
    const x = w - 36;
    const y = 44;
    const radius = 28 + this.scoreRingPulse * 6;

    this.scoreRingPulse *= 0.92;

    ctx.save();

    // Background ring
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fill();

    // Score arc (fills proportionally)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * (displayScore / 100));

    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner ring border
    ctx.beginPath();
    ctx.arc(x, y, radius - 3, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Score text
    ctx.font = `bold ${displayScore >= 100 ? 20 : 24}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(`${displayScore}`, x, y);

    ctx.restore();
  }

  /**
   * Draw rep counter with bounce animation on new rep
   */
  _drawRepCounter(ctx, repCount, w, h) {
    if (repCount > this.displayedRepCount) {
      this.repBounce = 1.0;
      this.displayedRepCount = repCount;
      this.scoreRingPulse = 1.0;
    }

    this.repBounce *= 0.88;

    const scale = 1 + this.repBounce * 0.3;
    const label = `REP ${repCount}`;
    const x = 20;
    const y = 40;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';

    const metrics = ctx.measureText(label);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 18, metrics.width + 16, 30, 8);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + this.repBounce * 0.6})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x, y);

    ctx.restore();
  }

  /**
   * Trigger a rep toast (called when rep completes)
   */
  triggerRepToast(score, comboCount = 0) {
    let text, color;
    if (score >= 90) {
      text = 'PERFECT';
      color = '#22c55e';
      this.edgeGlowColor = '#22c55e';
    } else if (score >= 75) {
      text = 'SOLID';
      color = '#3b82f6';
      this.edgeGlowColor = '#3b82f6';
    } else if (score >= 60) {
      text = 'OKAY';
      color = '#f59e0b';
      this.edgeGlowColor = '#f59e0b';
    } else {
      text = 'FIX FORM';
      color = '#ef4444';
      this.edgeGlowColor = '#ef4444';
    }

    this.activeToast = {
      text,
      score,
      color,
      startTime: Date.now(),
    };

    this.edgeGlowIntensity = 1.0;
    this.activeToast.combo = comboCount;
  }

  /**
   * Draw rep toast — slides in from right, holds, fades out
   */
  _drawRepToast(ctx, w, h) {
    if (!this.activeToast) return;

    const elapsed = Date.now() - this.activeToast.startTime;
    if (elapsed > this.TOAST_DURATION) {
      this.activeToast = null;
      return;
    }

    const { text, score, color } = this.activeToast;
    const progress = elapsed / this.TOAST_DURATION;

    let slideX = 0;
    let alpha = 1;

    if (progress < 0.15) {
      slideX = (1 - progress / 0.15) * 120;
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    }

    const x = w - 20 - slideX;
    const y = h * 0.35;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    const textMetrics = ctx.measureText(text);
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const scoreMetrics = ctx.measureText(`${score}`);

    const pillWidth = Math.max(textMetrics.width, scoreMetrics.width) + 24;
    const pillHeight = 48;
    const pillX = x - pillWidth;
    const pillY = y - pillHeight / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 10);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, 4, pillHeight, [10, 0, 0, 10]);
    ctx.fill();

    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.fillText(text, x - 12, y - 4);

    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Score: ${score}`, x - 12, y + 14);

    if (this.activeToast.combo >= 3) {
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
      ctx.fillText(`${this.activeToast.combo}x combo`, x - 12, y + 28);
    }

    ctx.restore();
  }

  /**
   * Draw screen-edge glow on rep complete
   */
  _drawEdgeGlow(ctx, w, h) {
    const intensity = this.edgeGlowIntensity;
    const color = this.edgeGlowColor;

    ctx.save();

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const topGrad = ctx.createLinearGradient(0, 0, 0, 40);
    topGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.4 * intensity})`);
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 40);

    const botGrad = ctx.createLinearGradient(0, h, 0, h - 40);
    botGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.3 * intensity})`);
    botGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, h - 40, w, 40);

    const leftGrad = ctx.createLinearGradient(0, 0, 30, 0);
    leftGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 * intensity})`);
    leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 30, h);

    const rightGrad = ctx.createLinearGradient(w, 0, w - 30, 0);
    rightGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 * intensity})`);
    rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(w - 30, 0, 30, h);

    ctx.restore();
  }

  /**
   * Draw side indicator (bottom-left)
   */
  _drawSideIndicator(ctx, side, w, h) {
    ctx.save();
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';

    const label = `${side.toUpperCase()} SIDE`;
    const x = 12;
    const y = h - 12;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  /**
   * Draw "PARTIAL" indicator when user starts but doesn't complete a rep
   */
  _drawPartialRepIndicator(ctx, w, h) {
    ctx.save();
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.fillText('PARTIAL', w / 2, h - 90);
    ctx.restore();
  }

  /**
   * Draw combo counter — "3x COMBO" with multiplier glow
   */
  _drawComboCounter(ctx, comboCount, w, h) {
    if (comboCount < 2) {
      this.displayedCombo = 0;
      return;
    }

    if (comboCount > this.displayedCombo) {
      this.comboPulse = 1.0;
      this.displayedCombo = comboCount;
    }

    this.comboPulse *= 0.9;

    const scale = 1 + this.comboPulse * 0.4;
    const x = w / 2;
    const y = 76;

    let color;
    if (comboCount >= 10) {
      color = '#f59e0b';
    } else if (comboCount >= 5) {
      color = '#a855f7';
    } else {
      color = '#3b82f6';
    }

    let multiplier = '';
    if (comboCount >= 10) multiplier = '3x XP';
    else if (comboCount >= 5) multiplier = '2x XP';
    else if (comboCount >= 3) multiplier = '1.5x XP';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    const label = `${comboCount}x COMBO`;
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(label);
    const pillW = metrics.width + 24;
    const pillH = 28;

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 14);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);

    if (multiplier) {
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const mx = x + pillW / 2 + 8;
      const mMetrics = ctx.measureText(multiplier);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(mx - 2, y - 9, mMetrics.width + 8, 18, 4);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.fillText(multiplier, mx + 2, y + 1);
    }

    ctx.restore();
  }

  /**
   * Draw combo break flash
   */
  _drawComboBreak(ctx, w, h) {
    if (this.comboBreakFlash <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.comboBreakFlash;

    const gradient = ctx.createRadialGradient(w / 2, 76, 0, w / 2, 76, 80);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(w / 2 - 80, 76 - 40, 160, 80);

    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('COMBO BROKEN', w / 2, 100);

    ctx.restore();

    this.comboBreakFlash *= 0.9;
  }

  /**
   * Draw streak fire particles along skeleton when combo >= 5
   */
  _drawStreakFire(ctx, keypoints, comboCount, w, h, scaleX, scaleY) {
    if (comboCount < 5) {
      this.streakParticles = [];
      return;
    }

    const spawnRate = comboCount >= 10 ? 3 : 1;
    for (let s = 0; s < spawnRate; s++) {
      const connIdx = Math.floor(Math.random() * SKELETON_CONNECTIONS.length);
      const [startIdx, endIdx] = SKELETON_CONNECTIONS[connIdx];
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      const t = Math.random();
      this.streakParticles.push({
        x: (start.x + (end.x - start.x) * t) * scaleX,
        y: (start.y + (end.y - start.y) * t) * scaleY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 3 - 1,
        life: 1.0,
        size: Math.random() * 3 + 2,
      });
    }

    ctx.save();
    for (let i = this.streakParticles.length - 1; i >= 0; i--) {
      const p = this.streakParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;

      if (p.life <= 0) {
        this.streakParticles.splice(i, 1);
        continue;
      }

      const r = 255;
      const g = Math.floor(165 * p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${r}, ${g}, 0, ${p.life * 0.7})`;
      ctx.fill();
    }

    if (this.streakParticles.length > 100) {
      this.streakParticles = this.streakParticles.slice(-60);
    }

    ctx.restore();
  }

  /**
   * Trigger a contextual cue card near a specific joint
   */
  triggerCueCard(text, jointIdx) {
    if (this.activeCueCard && Date.now() - this.activeCueCard.startTime < 1000) return;

    this.activeCueCard = {
      text,
      jointIdx,
      startTime: Date.now(),
    };
  }

  /**
   * Draw contextual cue card — anchored near a joint with an arrow
   */
  _drawCueCard(ctx, keypoints, w, h, scaleX, scaleY) {
    if (!this.activeCueCard) return;

    const elapsed = Date.now() - this.activeCueCard.startTime;
    if (elapsed > this.CUE_CARD_DURATION) {
      this.activeCueCard = null;
      return;
    }

    const { text, jointIdx } = this.activeCueCard;
    const kp = keypoints[jointIdx];
    if (!kp || kp.score < MIN_CONFIDENCE) return;

    const progress = elapsed / this.CUE_CARD_DURATION;

    let alpha = 1;
    if (progress < 0.1) {
      alpha = progress / 0.1;
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    }

    const jx = kp.x * scaleX;
    const jy = kp.y * scaleY;

    const cardX = Math.min(jx + 30, w - 130);
    const cardY = Math.max(jy - 20, 20);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(text);
    const cardW = metrics.width + 16;
    const cardH = 24;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 6);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cardX, cardY + 4, 3, cardH - 8);

    ctx.beginPath();
    ctx.moveTo(cardX, cardY + cardH / 2);
    ctx.lineTo(jx + 8, jy);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(jx, jy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.fill();

    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cardX + 8, cardY + 16);

    ctx.restore();
  }
}
