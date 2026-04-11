# Form Coach Phase 1: Accuracy & Smoothing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make form scores honest, skeleton smooth, rep counting reliable, and side detection stable — the foundation for all visual/coaching upgrades.

**Architecture:** Replace EMA smoothing with one-euro filter for adaptive jitter removal. Change binary checkpoint scoring to gradient (0-1). Add minimum rep duration and phase frame lockout. Make side detection sticky.

**Tech Stack:** Vanilla JS (no new dependencies), one-euro filter algorithm, existing FormAnalysisEngine class

---

### Task 1: Create one-euro filter utility

**Files:**
- Create: `src/utils/oneEuroFilter.js`

**Step 1: Write the one-euro filter**

The one-euro filter is an adaptive low-pass filter that adjusts cutoff frequency based on signal speed. Fast movement = less smoothing (responsive). Slow/still = more smoothing (stable). This is the industry standard for real-time pose tracking.

```js
/**
 * One-Euro Filter — adaptive low-pass for real-time signal smoothing.
 *
 * Unlike EMA (fixed alpha), one-euro adjusts cutoff frequency based on
 * how fast the signal is changing. Fast movement gets less smoothing
 * (stays responsive), slow/still gets more (eliminates jitter).
 *
 * Reference: Casiez et al. 2012, "1 Euro Filter"
 * https://cristal.univ-lille.fr/~casiez/1euro/
 */

class LowPassFilter {
    constructor(alpha) {
        this.y = null;
        this.s = null;
        this.setAlpha(alpha);
    }

    setAlpha(alpha) {
        this.alpha = Math.max(0, Math.min(1, alpha));
    }

    filter(value) {
        if (this.y === null) {
            this.s = value;
        } else {
            this.s = this.alpha * value + (1 - this.alpha) * this.s;
        }
        this.y = value;
        return this.s;
    }

    reset() {
        this.y = null;
        this.s = null;
    }
}

function alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
}

export class OneEuroFilter {
    /**
     * @param {number} minCutoff - Minimum cutoff frequency (Hz). Lower = more smoothing when still. Default 1.0.
     * @param {number} beta - Speed coefficient. Higher = less smoothing during fast movement. Default 0.007.
     * @param {number} dCutoff - Cutoff for derivative filter. Default 1.0.
     */
    constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.xFilter = new LowPassFilter(1);
        this.dxFilter = new LowPassFilter(1);
        this.lastTime = null;
    }

    /**
     * Filter a single value.
     * @param {number} value - Raw input value
     * @param {number} timestamp - Timestamp in seconds (must be monotonically increasing)
     * @returns {number} Filtered value
     */
    filter(value, timestamp) {
        if (this.lastTime === null) {
            this.lastTime = timestamp;
            this.xFilter.filter(value);
            this.dxFilter.filter(0);
            return value;
        }

        const dt = Math.max(timestamp - this.lastTime, 0.001);
        this.lastTime = timestamp;

        // Estimate derivative (speed of change)
        const dAlpha = alpha(this.dCutoff, dt);
        this.dxFilter.setAlpha(dAlpha);
        const dx = (value - (this.xFilter.s ?? value)) / dt;
        const edx = this.dxFilter.filter(dx);

        // Adjust cutoff based on speed
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);

        // Filter the value
        const a = alpha(cutoff, dt);
        this.xFilter.setAlpha(a);
        return this.xFilter.filter(value);
    }

    reset() {
        this.xFilter.reset();
        this.dxFilter.reset();
        this.lastTime = null;
    }
}

/**
 * Per-keypoint filter bank — creates one OneEuroFilter per keypoint per axis.
 * Use this in FormAnalysisEngine to smooth all 17 keypoints.
 */
export class KeypointFilterBank {
    /**
     * @param {number} count - Number of keypoints (17 for MoveNet)
     * @param {Object} options - { minCutoff, beta, dCutoff }
     */
    constructor(count = 17, { minCutoff = 1.0, beta = 0.007, dCutoff = 1.0 } = {}) {
        this.filters = [];
        for (let i = 0; i < count; i++) {
            this.filters.push({
                x: new OneEuroFilter(minCutoff, beta, dCutoff),
                y: new OneEuroFilter(minCutoff, beta, dCutoff),
            });
        }
    }

    /**
     * Smooth an array of keypoints in-place.
     * @param {Array} keypoints - [{x, y, score}, ...] in pixel coordinates
     * @param {number} timestamp - Current time in seconds
     * @returns {Array} Smoothed keypoints (new array, original untouched)
     */
    filter(keypoints, timestamp) {
        return keypoints.map((kp, i) => {
            if (!kp || kp.score < 0.3) return kp;
            const f = this.filters[i];
            return {
                ...kp,
                x: f.x.filter(kp.x, timestamp),
                y: f.y.filter(kp.y, timestamp),
            };
        });
    }

    reset() {
        for (const f of this.filters) {
            f.x.reset();
            f.y.reset();
        }
    }
}
```

**Step 2: Commit**

```bash
git add src/utils/oneEuroFilter.js
git commit -m "feat: add one-euro filter for adaptive keypoint smoothing"
```

---

### Task 2: Integrate one-euro filter into FormAnalysisEngine

**Files:**
- Modify: `src/utils/formAnalysisEngine.js`

**Step 1: Add import and filter bank to engine**

At the top of formAnalysisEngine.js (after existing imports around line 19), add:

```js
import { KeypointFilterBank } from './oneEuroFilter.js';
```

In the constructor (around line 326), after `this.activeInjuryFlags = [];` add:

```js
    // Keypoint smoothing (one-euro filter — adaptive, no lag)
    this.keypointFilter = new KeypointFilterBank(17, {
        minCutoff: 1.5,  // Low jitter when still
        beta: 0.01,      // Responsive on fast movement
        dCutoff: 1.0,
    });
```

**Step 2: Apply filter in processFrame**

In the `processFrame` method (around line 400), right after the early returns and before `this.frameCount++`, find where keypoints are first used. Before side detection and all angle calculations, add keypoint smoothing:

Find the line (around line 410):
```js
    // 1. Detect best side
```

Insert BEFORE it:
```js
    // 0. Smooth keypoints (one-euro filter — adaptive, removes jitter without lag)
    const timestamp = now / 1000; // Convert ms to seconds for filter
    const smoothedKeypoints = this.keypointFilter.filter(keypoints, timestamp);
```

Then replace ALL subsequent references to `keypoints` within processFrame with `smoothedKeypoints`. The variables that use keypoints directly:
- Side detection: `detectBestSide(keypoints, ...)` → `detectBestSide(smoothedKeypoints, ...)`
- Joint retrieval: `getJoint(keypoints, ...)` → `getJoint(smoothedKeypoints, ...)`
- Wrist tracking (bar path): `getJoint(keypoints, 'wrist', ...)` → already covered
- Checkpoint evaluation: `this._evaluateCheckpoints(keypoints, ...)` → `this._evaluateCheckpoints(smoothedKeypoints, ...)`
- Injury evaluation: `this._evaluateInjuryRisks(keypoints, ...)` → `this._evaluateInjuryRisks(smoothedKeypoints, ...)`
- Score calculation: `this._calculateScore(checkpointResults, keypoints)` → `this._calculateScore(checkpointResults, smoothedKeypoints)`
- Bilateral: `this._analyzeBilateral(keypoints)` → `this._analyzeBilateral(smoothedKeypoints)`
- Ghost overlay keypoint save: `keypoints.map(...)` → `smoothedKeypoints.map(...)`
- The RETURN value `lowConfidence` check that references `keypoints` → `smoothedKeypoints`

BUT keep the ORIGINAL unsmoothed keypoints for the poseConfidence calculation (raw confidence scores shouldn't be smoothed).

**Step 3: Remove old EMA on score**

Find line ~471:
```js
    this.smoothedScore = ema(this.smoothedScore, rawScore, 0.15);
```

Replace with:
```js
    this.smoothedScore = rawScore; // No EMA lag — one-euro filter on keypoints handles smoothing
```

The one-euro filter on keypoints upstream means the score itself is already stable. No need for double-smoothing.

**Step 4: Reset filter on engine reset**

In the `reset()` method (around line 879), add:
```js
    this.keypointFilter.reset();
```

**Step 5: Commit**

```bash
git add src/utils/formAnalysisEngine.js
git commit -m "feat: integrate one-euro keypoint smoothing, remove EMA score lag"
```

---

### Task 3: Gradient checkpoint scoring

**Files:**
- Modify: `src/utils/formAnalysisEngine.js` (lines 724-755, `_calculateScore`)

**Step 1: Rewrite _calculateScore with gradient scoring**

Replace the entire `_calculateScore` method (around lines 724-755) with:

```js
  /**
   * Calculate form score 0-100 with gradient checkpoint scoring.
   *
   * Instead of binary pass/fail (100 or 30), each checkpoint returns
   * a 0-1 gradient based on how close the value is to the threshold.
   * A knee that's 2 degrees off scores ~0.9. A knee 15 degrees off scores ~0.2.
   */
  _calculateScore(checkpointResults, keypoints) {
    const activeChecks = checkpointResults.filter(r => r.active && r.result);
    if (activeChecks.length === 0) return this.smoothedScore ?? 0;

    let totalWeight = 0;
    let weightedScore = 0;

    for (const check of activeChecks) {
      // Severity weight
      const weight = check.severity === 'danger' ? 3 : check.severity === 'warning' ? 2 : 1;

      // Confidence weight (floor at 30%)
      const requiredKps = this.config.requiredKeypoints || [];
      let avgConf = 0;
      for (const idx of requiredKps) {
        avgConf += (keypoints[idx]?.score || 0);
      }
      avgConf = requiredKps.length > 0 ? avgConf / requiredKps.length : 0.5;
      const confWeight = Math.max(0.3, avgConf);

      const effectiveWeight = weight * confWeight;
      totalWeight += effectiveWeight;

      // Gradient scoring: pass = 100, fail = gradient based on how far off
      let checkScore;
      if (check.result.pass) {
        checkScore = 100;
      } else {
        // Use the ratio value if available (how close to passing)
        // Most evaluators return { pass, value } where value is the measured metric
        // We need to know the threshold to compute gradient
        const threshold = check.threshold ?? 0;
        const value = check.result.value ?? 0;

        if (threshold > 0 && value !== undefined) {
          // How close is the value to the threshold? (0 = way off, 1 = almost passing)
          const ratio = Math.max(0, 1 - Math.abs(value - threshold) / threshold);
          checkScore = ratio * 60; // Max 60 for a failing check (gradient from 0-60)
        } else {
          checkScore = 0; // No data = full fail
        }
      }

      weightedScore += checkScore * effectiveWeight;
    }

    return totalWeight > 0 ? Math.max(0, Math.min(100, weightedScore / totalWeight)) : 0;
  }
```

Key changes:
- Failing check scores 0-60 (gradient) instead of flat 30
- Passing check still scores 100
- With all checks failing badly: score approaches 0 (was ~30 before)
- With all checks barely failing: score approaches 60
- Zero active checks returns 0, not 85

**Step 2: Commit**

```bash
git add src/utils/formAnalysisEngine.js
git commit -m "feat: gradient checkpoint scoring — honest scores, no more fake 50s"
```

---

### Task 4: Robust rep counting (minimum duration + phase lockout + partial rep)

**Files:**
- Modify: `src/utils/formAnalysisEngine.js`

**Step 1: Add rep timing constants**

At the top of the FormAnalysisEngine class constructor (around line 326), add:

```js
    // Rep counting guards
    this.MIN_REP_DURATION_MS = 800;     // Reject reps shorter than 0.8s
    this.MIN_PHASE_FRAMES = 3;          // Must hold phase for 3+ frames before transitioning
    this.phaseFrameCount = 0;           // Frames spent in current phase
    this.lastRepTime = 0;               // Timestamp of last completed rep
```

**Step 2: Add phase frame counting in _updatePhase**

In `_updatePhase` (around line 525), right after `const prev = this.currentPhase;` (line 527), add:

```js
    // Track frames in current phase
    this.phaseFrameCount++;
```

And at every phase transition (where `this.currentPhase = PHASE.XXX` is set), add a reset:

```js
    this.phaseFrameCount = 0;
```

**Step 3: Add phase lockout guard**

Wrap each phase transition check with a frame lockout. In each `case` block inside the `switch`, before the transition condition, add:

```js
    if (this.phaseFrameCount < this.MIN_PHASE_FRAMES) break;
```

This goes at the START of each case block (IDLE, ECCENTRIC, BOTTOM, CONCENTRIC, LOCKOUT) — if we haven't been in this phase long enough, don't transition.

For example, the ECCENTRIC case becomes:

```js
      case PHASE.ECCENTRIC:
        if (this.phaseFrameCount < this.MIN_PHASE_FRAMES) break;
        if (invertedPhase ? (angle > phases.bottomThreshold) : (angle < phases.bottomThreshold)) {
          this.currentPhase = PHASE.BOTTOM;
          this.phaseStartTime = now;
          this.phaseFrameCount = 0;
          // ... rest
```

Apply the same pattern to BOTTOM, CONCENTRIC. The IDLE case doesn't need the guard (user should be able to start a rep immediately). The LOCKOUT case already has a 5-frame guard.

**Step 4: Add minimum rep duration in _completeRep**

In `_completeRep` (around line 623), at the very start, add:

```js
    // Reject ghost reps (too short to be real)
    if (this.currentRep) {
      const repDuration = now - this.currentRep.startTime;
      if (repDuration < this.MIN_REP_DURATION_MS) {
        this.currentRep = null;
        return; // Don't count it
      }
    }
```

**Step 5: Add partial rep detection in ECCENTRIC→IDLE fallback**

In the ECCENTRIC case (around line 573-577), where it resets to IDLE when the user comes back up without reaching bottom — that's the existing logic. Add an output flag so the UI can show "PARTIAL":

In the processFrame return object (around line 500), add a new field:

```js
      partialRep: false,
```

Then in the ECCENTRIC→IDLE fallback (line 573-577), set a flag:

```js
        } else if (invertedPhase ? (angle < phases.eccentricStart - 5) : (angle > phases.eccentricStart + 5)) {
          this.currentPhase = PHASE.IDLE;
          this.phaseFrameCount = 0;
          this.currentRep = null;
          this._partialRepFlag = true; // Will be read in processFrame return
        }
```

Then in the processFrame return object, replace `partialRep: false` with:

```js
      partialRep: this._partialRepFlag || false,
```

And clear it at the start of processFrame:

```js
    this._partialRepFlag = false;
```

**Step 6: Reset new state in reset()**

In the `reset()` method, add:

```js
    this.phaseFrameCount = 0;
    this.lastRepTime = 0;
    this._partialRepFlag = false;
```

**Step 7: Commit**

```bash
git add src/utils/formAnalysisEngine.js
git commit -m "feat: robust rep counting — min duration, phase lockout, partial rep detection"
```

---

### Task 5: Sticky side detection

**Files:**
- Modify: `src/utils/formAnalysisEngine.js`

**Step 1: Add sticky side state to constructor**

In the constructor (around line 348), replace:

```js
    this.activeSide = 'left';
    this.sideConfidence = 0;
```

With:

```js
    this.activeSide = 'left';
    this.sideConfidence = 0;
    this.sideOverrideFrames = 0;       // Consecutive frames where opposite side is better
    this.SIDE_SWITCH_THRESHOLD = 0.15;  // Min confidence difference to consider switching
    this.SIDE_SWITCH_FRAMES = 10;       // Must be better for 10+ frames to switch
```

**Step 2: Replace side detection in processFrame**

Find the section in processFrame where `detectBestSide` is called (around line 415). Replace the direct assignment with sticky logic:

```js
    // 1. Detect best side (sticky — don't flip mid-rep)
    const detectedSide = detectBestSide(smoothedKeypoints, this.vw, this.vh);
    if (detectedSide !== this.activeSide) {
      // Calculate confidence difference
      const leftIndices = [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE];
      const rightIndices = [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW, KP.RIGHT_WRIST, KP.RIGHT_HIP, KP.RIGHT_KNEE, KP.RIGHT_ANKLE];
      let leftScore = 0, rightScore = 0;
      for (const idx of leftIndices) leftScore += (smoothedKeypoints[idx]?.score || 0);
      for (const idx of rightIndices) rightScore += (smoothedKeypoints[idx]?.score || 0);
      const diff = Math.abs(leftScore - rightScore) / 6; // Average per-keypoint difference

      if (diff > this.SIDE_SWITCH_THRESHOLD) {
        this.sideOverrideFrames++;
        if (this.sideOverrideFrames >= this.SIDE_SWITCH_FRAMES) {
          this.activeSide = detectedSide;
          this.sideOverrideFrames = 0;
        }
      } else {
        this.sideOverrideFrames = 0; // Not convincing enough, reset
      }
    } else {
      this.sideOverrideFrames = 0;
    }
    const side = this.activeSide;
```

Remove the old `this.activeSide = detectBestSide(...)` line.

**Step 3: Reset in reset()**

Add to the reset method:

```js
    this.sideOverrideFrames = 0;
```

**Step 4: Commit**

```bash
git add src/utils/formAnalysisEngine.js
git commit -m "feat: sticky side detection — no more mid-rep side flipping"
```

---

### Task 6: Verify build + run tests

**Step 1: Run Vite build**

```bash
cd C:/Users/devda/iron-ai
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass (or existing failures unrelated to our changes).

**Step 3: Grep for any leftover old EMA usage**

```bash
grep -n "ema(this.smoothedScore" src/utils/formAnalysisEngine.js
```

Expected: No matches (we replaced it with direct assignment).

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: phase 1 complete — accuracy and smoothing overhaul"
```
