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
    this.pulsePhase = 0; // For pulsing injury highlights
  }

  /**
   * Draw a complete frame overlay
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} keypoints - MoveNet keypoints
   * @param {Object} analysis - Result from FormAnalysisEngine.processFrame()
   * @param {Object} options - { showGhost, showBarPath, showScore, showPhase, isElite }
   */
  drawFrame(ctx, keypoints, analysis, options = {}) {
    const {
      showGhost = true,
      showBarPath = true,
      showScore = true,
      showPhase = true,
      isElite = false,
    } = options;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!keypoints || keypoints.length < 17) return;

    // 1. Ghost overlay (elite only) — draw first so it's behind
    if (isElite && showGhost && analysis.bestRepKeypoints) {
      this._drawGhostSkeleton(ctx, analysis.bestRepKeypoints, w, h);
    }

    // 2. Bar path (elite only)
    if (isElite && showBarPath && analysis.barPathPoints.length > 2) {
      this._drawBarPath(ctx, analysis.barPathPoints, w, h);
    }

    // 3. Injury zone highlights — pulsing circles
    if (analysis.injuryFlags.length > 0) {
      this._drawInjuryHighlights(ctx, keypoints, analysis.injuryFlags, w, h);
    }

    // 4. Main skeleton — color-coded by checkpoint status
    this._drawSkeleton(ctx, keypoints, analysis, w, h);

    // 5. Phase indicator
    if (showPhase) {
      this._drawPhaseIndicator(ctx, analysis.phase, w, h);
    }

    // 6. Score badge
    if (showScore && analysis.score > 0) {
      this._drawScoreBadge(ctx, analysis.score, w, h);
    }

    // 7. Rep counter
    if (analysis.repCount > 0) {
      this._drawRepCounter(ctx, analysis.repCount, w, h);
    }

    // 8. Side indicator
    this._drawSideIndicator(ctx, analysis.activeSide, w, h);

    // Advance pulse animation
    this.pulsePhase = (this.pulsePhase + 0.08) % (Math.PI * 2);
  }

  /**
   * Draw the main skeleton with phase-aware coloring
   */
  _drawSkeleton(ctx, keypoints, analysis, w, h) {
    const phase = analysis.phase;
    const baseColor = PHASE_COLORS[phase] || '#00ff00';

    // Build set of "bad" keypoints for red coloring
    const badJoints = new Set();
    for (const issue of analysis.injuryFlags) {
      for (const joint of (issue.joints || [])) {
        const kpIndices = JOINT_TO_KP[joint];
        if (kpIndices) kpIndices.forEach(i => badJoints.add(i));
      }
    }

    // Draw connections
    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      const isBad = badJoints.has(startIdx) || badJoints.has(endIdx);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = isBad ? '#ef4444' : baseColor;
      ctx.lineWidth = isBad ? 4 : 3;
      ctx.stroke();
    }

    // Draw keypoints
    for (let i = 0; i < keypoints.length; i++) {
      const kp = keypoints[i];
      if (!kp || kp.score < MIN_CONFIDENCE) continue;

      const isBad = badJoints.has(i);
      const radius = isBad ? 7 : 5;

      ctx.beginPath();
      ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isBad ? '#ef4444' : baseColor;
      ctx.fill();

      // White border for visibility
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /**
   * Draw ghost skeleton from best rep (semi-transparent cyan)
   */
  _drawGhostSkeleton(ctx, ghostKps, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.25;

    // Draw connections
    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = ghostKps[startIdx];
      const end = ghostKps[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
    }

    // Draw keypoints
    for (const kp of ghostKps) {
      if (!kp || kp.score < MIN_CONFIDENCE) continue;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
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
  _drawInjuryHighlights(ctx, keypoints, injuryFlags, w, h) {
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.3;

    for (const flag of injuryFlags) {
      for (const jointName of (flag.joints || [])) {
        const kpIndices = JOINT_TO_KP[jointName];
        if (!kpIndices) continue;

        for (const idx of kpIndices) {
          const kp = keypoints[idx];
          if (!kp || kp.score < MIN_CONFIDENCE) continue;

          const radius = 20 * pulseScale;

          // Outer glow
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + Math.sin(this.pulsePhase) * 0.2})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Inner glow
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, radius * 0.6, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + Math.sin(this.pulsePhase) * 0.1})`;
          ctx.fill();
        }
      }
    }
  }

  /**
   * Draw phase indicator text (top-center)
   */
  _drawPhaseIndicator(ctx, phase, w, h) {
    if (phase === PHASE.IDLE) return;

    const labels = {
      [PHASE.ECCENTRIC]: 'LOWERING',
      [PHASE.BOTTOM]: 'HOLD',
      [PHASE.CONCENTRIC]: 'LIFTING',
      [PHASE.LOCKOUT]: 'LOCKOUT',
    };

    const label = labels[phase] || '';
    const color = PHASE_COLORS[phase] || '#888';

    ctx.save();
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    // Background pill
    const metrics = ctx.measureText(label);
    const px = 10, py = 4;
    const x = w / 2;
    const y = 30;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(
      x - metrics.width / 2 - px,
      y - 12 - py,
      metrics.width + px * 2,
      20 + py * 2,
      8
    );
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(label, x, y + 2);
    ctx.restore();
  }

  /**
   * Draw score badge (top-right)
   */
  _drawScoreBadge(ctx, score, w, h) {
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
    const label = `${score}`;

    ctx.save();
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';

    // Background circle
    const x = w - 30;
    const y = 40;

    ctx.beginPath();
    ctx.arc(x, y, 26, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 10);
    ctx.restore();
  }

  /**
   * Draw rep counter (top-left)
   */
  _drawRepCounter(ctx, repCount, w, h) {
    ctx.save();
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';

    const label = `REP ${repCount}`;
    const x = 16;
    const y = 36;

    // Background
    const metrics = ctx.measureText(label);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 16, metrics.width + 12, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x, y);
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
}
