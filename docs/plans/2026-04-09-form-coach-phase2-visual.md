# Form Coach Phase 2: Visual Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dev-tool-quality canvas overlay with a gaming HUD — neon glow skeleton, animated score ring, rep counter with bounce, phase banner, rep toast with verdict, and confidence fade.

**Architecture:** Full rewrite of `formCanvasRenderer.js`. The class API stays identical (`drawFrame(ctx, keypoints, analysis, options)`) so FormCoach.jsx needs zero changes. All new visual state (animations, toasts, combos) tracked inside the renderer class. Pure Canvas2D — no WebGL, no external libs.

**Tech Stack:** Canvas2D API, requestAnimationFrame timing, CSS-style animations via manual interpolation

---

### Task 1: Rewrite skeleton with neon glow rendering

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Rewrite `_drawSkeleton` with double-pass neon glow**

Replace the existing `_drawSkeleton` method (lines 170-216) with a two-pass approach: first a wide, blurred glow stroke, then a thin sharp stroke on top. Replace the circle keypoints with diamond shapes for joints and smaller circles for extremities.

```js
  /**
   * Draw the main skeleton with neon glow effect
   * Two-pass: wide blurred glow underneath, thin sharp stroke on top
   */
  _drawSkeleton(ctx, keypoints, analysis, w, h, scaleX = 1, scaleY = 1) {
    const phase = analysis.phase;
    const baseColor = PHASE_COLORS[phase] || '#00ff00';
    const glowColor = PHASE_GLOW_COLORS[phase] || 'rgba(0, 255, 0, 0.3)';

    // Build set of "bad" keypoints for red coloring
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

      // Confidence fade: dim lines for low-confidence keypoints
      const minScore = Math.min(start.score, end.score);
      const alpha = minScore < 0.5 ? 0.4 : 1.0;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(start.x * scaleX, start.y * scaleY);
      ctx.lineTo(end.x * scaleX, end.y * scaleY);
      ctx.strokeStyle = isBad ? '#ef4444' : baseColor;
      ctx.lineWidth = isBad ? 3.5 : 2.5;

      // Low confidence = dashed
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
    // Joints (shoulders, elbows, hips, knees) = diamonds
    // Extremities (wrists, ankles, nose, eyes, ears) = circles
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

      // Pulse on phase transitions
      const pulseExtra = analysis.phaseChanged ? Math.sin(this.pulsePhase * 3) * 2 : 0;

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      if (JOINT_INDICES.has(i)) {
        // Diamond shape for joints
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
        // Circle for extremities
        const radius = (isBad ? 5 : 3.5) + pulseExtra;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }

      ctx.restore();
    }
  }
```

**Step 2: Add glow color constants**

After the existing `PHASE_COLORS` object (around line 55-61), add:

```js
// Phase glow colors (semi-transparent for shadow layer)
const PHASE_GLOW_COLORS = {
  [PHASE.IDLE]: 'rgba(136, 136, 136, 0.3)',
  [PHASE.ECCENTRIC]: 'rgba(59, 130, 246, 0.4)',
  [PHASE.BOTTOM]: 'rgba(245, 158, 11, 0.4)',
  [PHASE.CONCENTRIC]: 'rgba(34, 197, 94, 0.4)',
  [PHASE.LOCKOUT]: 'rgba(168, 85, 247, 0.4)',
};
```

**Step 3: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: neon glow skeleton with diamond joints and confidence fade"
```

---

### Task 2: Animated score ring (replaces score badge)

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Add animation state to constructor**

Replace the constructor (line 84-87) with:

```js
  constructor() {
    this.pulsePhase = 0;

    // Score ring animation
    this.displayedScore = 0;          // Animated score value (lerps toward actual)
    this.scoreRingPulse = 0;          // Pulse on rep complete (0-1, decays)

    // Rep counter animation
    this.displayedRepCount = 0;
    this.repBounce = 0;               // Bounce scale on new rep (0-1, decays)

    // Rep toast
    this.toastQueue = [];             // [{text, score, color, startTime}]
    this.activeToast = null;
    this.TOAST_DURATION = 1500;       // ms

    // Phase banner animation
    this.lastPhase = null;
    this.phaseBannerAlpha = 0;        // Fade in/out

    // Edge glow on rep complete
    this.edgeGlowIntensity = 0;
    this.edgeGlowColor = '#22c55e';

    // Timing
    this.lastFrameTime = Date.now();
  }
```

**Step 2: Replace `_drawScoreBadge` with animated score ring**

Replace the entire `_drawScoreBadge` method (lines 382-406) with:

```js
  /**
   * Draw animated score ring — arc fills based on score, color shifts, pulses on rep complete
   */
  _drawScoreRing(ctx, score, w, h) {
    // Lerp displayed score toward actual
    this.displayedScore += (score - this.displayedScore) * 0.15;
    const displayScore = Math.round(this.displayedScore);

    const color = displayScore >= 90 ? '#22c55e' : displayScore >= 75 ? '#3b82f6' : displayScore >= 60 ? '#f59e0b' : '#ef4444';
    const x = w - 36;
    const y = 44;
    const radius = 28 + this.scoreRingPulse * 6;

    // Decay pulse
    this.scoreRingPulse *= 0.92;

    ctx.save();

    // Background ring (dark)
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
```

**Step 3: Update `drawFrame` to call `_drawScoreRing` instead of `_drawScoreBadge`**

In the `drawFrame` method, replace:
```js
    if (showScore && analysis.score > 0) {
      this._drawScoreBadge(ctx, analysis.score, w, h);
    }
```
With:
```js
    if (showScore && analysis.score > 0) {
      this._drawScoreRing(ctx, analysis.score, w, h);
    }
```

Delete the old `_drawScoreBadge` method entirely.

**Step 4: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: animated score ring with arc fill and pulse"
```

---

### Task 3: Animated rep counter with bounce + rep toast

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Replace `_drawRepCounter` with animated version**

Replace the existing `_drawRepCounter` method (lines 411-430) with:

```js
  /**
   * Draw rep counter with bounce animation on new rep
   */
  _drawRepCounter(ctx, repCount, w, h) {
    // Detect new rep
    if (repCount > this.displayedRepCount) {
      this.repBounce = 1.0;
      this.displayedRepCount = repCount;

      // Trigger score ring pulse
      this.scoreRingPulse = 1.0;
    }

    // Decay bounce
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

    // Background pill
    const metrics = ctx.measureText(label);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 18, metrics.width + 16, 30, 8);
    ctx.fill();

    // Glow border
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + this.repBounce * 0.6})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x, y);

    ctx.restore();
  }
```

**Step 2: Add `_triggerRepToast` and `_drawRepToast` methods**

Add after `_drawRepCounter`:

```js
  /**
   * Trigger a rep toast (called externally or from drawFrame when rep completes)
   */
  triggerRepToast(score) {
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

    // Trigger edge glow
    this.edgeGlowIntensity = 1.0;
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

    // Slide in (0-0.15), hold (0.15-0.7), fade out (0.7-1.0)
    let slideX = 0;
    let alpha = 1;

    if (progress < 0.15) {
      slideX = (1 - progress / 0.15) * 120; // Slide from right
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3; // Fade out
    }

    const x = w - 20 - slideX;
    const y = h * 0.35;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Background pill
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    const textMetrics = ctx.measureText(text);
    const scoreText = `${score}`;
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const scoreMetrics = ctx.measureText(scoreText);

    const pillWidth = Math.max(textMetrics.width, scoreMetrics.width) + 24;
    const pillHeight = 48;
    const pillX = x - pillWidth;
    const pillY = y - pillHeight / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 10);
    ctx.fill();

    // Left color bar
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, 4, pillHeight, [10, 0, 0, 10]);
    ctx.fill();

    // Verdict text
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.fillText(text, x - 12, y - 4);

    // Score below
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Score: ${score}`, x - 12, y + 14);

    ctx.restore();
  }
```

**Step 3: Update `drawFrame` to handle rep toasts and detect new reps**

In `drawFrame`, after the rep counter draw (step 7), add:

```js
    // 7b. Detect new rep → trigger toast
    if (analysis.repCount > this.displayedRepCount && analysis.score > 0) {
      this.triggerRepToast(analysis.score);
    }

    // 7c. Draw rep toast
    this._drawRepToast(ctx, w, h);

    // 7d. Edge glow on rep complete
    if (this.edgeGlowIntensity > 0.01) {
      this._drawEdgeGlow(ctx, w, h);
      this.edgeGlowIntensity *= 0.94;
    }
```

**Step 4: Add `_drawEdgeGlow` method**

```js
  /**
   * Draw screen-edge glow on rep complete
   */
  _drawEdgeGlow(ctx, w, h) {
    const intensity = this.edgeGlowIntensity;
    const color = this.edgeGlowColor;

    ctx.save();

    // Parse hex to RGB for gradient
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Top edge
    const topGrad = ctx.createLinearGradient(0, 0, 0, 40);
    topGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.4 * intensity})`);
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 40);

    // Bottom edge
    const botGrad = ctx.createLinearGradient(0, h, 0, h - 40);
    botGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.3 * intensity})`);
    botGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, h - 40, w, 40);

    // Left edge
    const leftGrad = ctx.createLinearGradient(0, 0, 30, 0);
    leftGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 * intensity})`);
    leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 30, h);

    // Right edge
    const rightGrad = ctx.createLinearGradient(w, 0, w - 30, 0);
    rightGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 * intensity})`);
    rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(w - 30, 0, 30, h);

    ctx.restore();
  }
```

**Step 5: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: animated rep counter, rep toast with verdict, edge glow"
```

---

### Task 4: Phase banner (bottom-center, animated)

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Replace `_drawPhaseIndicator` with animated phase banner**

Replace the existing method (lines 340-377) with:

```js
  /**
   * Draw phase banner — bottom-center, slides in on phase change, fades
   */
  _drawPhaseIndicator(ctx, phase, w, h) {
    // Track phase changes for animation
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.phaseBannerAlpha = phase === PHASE.IDLE ? 0 : 1.0;
    }

    if (phase === PHASE.IDLE || this.phaseBannerAlpha < 0.01) {
      this.phaseBannerAlpha *= 0.9;
      return;
    }

    // Slowly fade the banner
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

    // Background pill with blur
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(label);
    const px = 16, py = 8;
    const pillW = metrics.width + px * 2;
    const pillH = 20 + py * 2;

    // Parse phase color for background tint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 12);
    ctx.fill();

    // Color accent line at top of pill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, 3, [12, 12, 0, 0]);
    ctx.fill();

    // Label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);

    ctx.restore();
  }
```

**Step 2: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: animated phase banner at bottom-center"
```

---

### Task 5: Update drawFrame orchestration + timing

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Update `drawFrame` with timing and new draw order**

Replace the entire `drawFrame` method with the updated orchestration that handles delta time and the new draw order:

```js
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
    const dt = Math.min(now - this.lastFrameTime, 100); // Cap at 100ms
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

    // 8. Rep counter (top-left) — also detects new reps for toast/glow
    if (analysis.repCount > 0) {
      // Detect new rep → trigger toast + edge glow
      if (analysis.repCount > this.displayedRepCount && analysis.score > 0) {
        this.triggerRepToast(analysis.score);
      }
      this._drawRepCounter(ctx, analysis.repCount, w, h);
    }

    // 9. Rep toast (right side)
    this._drawRepToast(ctx, w, h);

    // 10. Side indicator (bottom-left)
    this._drawSideIndicator(ctx, analysis.activeSide, w, h);

    // 11. Partial rep indicator
    if (analysis.partialRep) {
      this._drawPartialRepIndicator(ctx, w, h);
    }

    // Advance pulse animation
    this.pulsePhase = (this.pulsePhase + 0.15) % (Math.PI * 2);
  }
```

**Step 2: Add partial rep indicator**

```js
  /**
   * Draw "PARTIAL" indicator when user starts but doesn't complete a rep
   */
  _drawPartialRepIndicator(ctx, w, h) {
    ctx.save();
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    const label = 'PARTIAL';
    const x = w / 2;
    const y = h - 90;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.fillText(label, x, y);
    ctx.restore();
  }
```

**Step 3: Clean up — remove the old `_drawScoreBadge` method if it still exists**

Search for `_drawScoreBadge` and delete it entirely if still present.

**Step 4: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: updated draw orchestration with timing, partial rep indicator"
```

---

### Task 6: Injury red vignette + updated injury highlights

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Update `_drawInjuryHighlights` to add screen-edge red vignette**

At the END of the existing `_drawInjuryHighlights` method (before the closing `}`), add:

```js
    // Red vignette at screen edges when danger is active
    const hasDanger = injuryFlags.some(f => f.severity === 'danger');
    if (hasDanger) {
      const vignetteIntensity = 0.3 + Math.sin(this.pulsePhase) * 0.15;

      ctx.save();
      // Top
      const topG = ctx.createLinearGradient(0, 0, 0, 50);
      topG.addColorStop(0, `rgba(239, 68, 68, ${vignetteIntensity})`);
      topG.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, w, 50);

      // Bottom
      const botG = ctx.createLinearGradient(0, h, 0, h - 50);
      botG.addColorStop(0, `rgba(239, 68, 68, ${vignetteIntensity})`);
      botG.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = botG;
      ctx.fillRect(0, h - 50, w, 50);

      ctx.restore();
    }
```

**Step 2: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: red vignette on danger injury flags"
```

---

### Task 7: Verify build

**Step 1: Run build**

```bash
cd C:/Users/devda/iron-ai
npm run build
```

Expected: Build succeeds.

**Step 2: Verify no old method references**

```bash
grep -n "_drawScoreBadge" src/utils/formCanvasRenderer.js
```

Expected: No matches.

**Step 3: Commit if fixes needed**

```bash
git add -A
git commit -m "chore: phase 2 visual overhaul complete"
```
