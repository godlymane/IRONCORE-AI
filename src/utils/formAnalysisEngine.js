/**
 * Form Analysis Engine — The Brain of Elite Form Coach
 *
 * Stateful engine that processes pose keypoints frame-by-frame and produces:
 * - Phase detection (eccentric/bottom/concentric/lockout)
 * - Form scoring with confidence weighting + temporal smoothing
 * - Rep counting via phase state machine
 * - Per-rep data: score, tempo, ROM, injury flags
 * - Fatigue detection (score degradation over reps)
 * - Bar path tracking (wrist positions per frame)
 * - Ghost overlay data (best rep skeleton)
 * - Bilateral analysis (left vs right when both visible)
 * - Auto side detection (picks highest confidence side)
 */

import {
  KP, BILATERAL_PAIRS, PHASE,
  EXERCISE_CONFIGS, getExerciseConfig,
} from './formExerciseConfigs.js';

// --- Math helpers ---
function angleBetween(a, b, c) {
  // Angle at point b formed by a-b-c in degrees
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  if (magAB === 0 || magCB === 0) return 180;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Exponential moving average
function ema(prev, current, alpha = 0.15) {
  if (prev === null) return current;
  return prev * (1 - alpha) + current * alpha;
}

/**
 * Get a keypoint by index from pose, normalized to 0-1 range
 * Returns { x, y, score } where x/y are ratios of video dimensions
 */
function getKP(keypoints, idx, videoWidth, videoHeight) {
  const kp = keypoints[idx];
  if (!kp) return { x: 0, y: 0, score: 0 };
  return {
    x: kp.x / videoWidth,
    y: kp.y / videoHeight,
    score: kp.score || 0,
  };
}

/**
 * Pick best side (left or right) based on average keypoint confidence
 */
function detectBestSide(keypoints, videoWidth, videoHeight) {
  const leftIndices = [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE];
  const rightIndices = [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW, KP.RIGHT_WRIST, KP.RIGHT_HIP, KP.RIGHT_KNEE, KP.RIGHT_ANKLE];

  let leftScore = 0, rightScore = 0;
  for (const idx of leftIndices) leftScore += (keypoints[idx]?.score || 0);
  for (const idx of rightIndices) rightScore += (keypoints[idx]?.score || 0);

  return rightScore > leftScore ? 'right' : 'left';
}

/**
 * Get joint keypoint for the active side
 * jointName: 'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'
 * side: 'left' | 'right'
 */
function getJoint(keypoints, jointName, side, vw, vh) {
  const pair = BILATERAL_PAIRS[jointName];
  if (!pair) return { x: 0, y: 0, score: 0 };
  const idx = side === 'right' ? pair[1] : pair[0];
  return getKP(keypoints, idx, vw, vh);
}

// ── Checkpoint evaluators ──
// Each returns { pass: boolean, value: number, detail: string }
const EVALUATORS = {
  kneeOverToe(kps, config, side, vw, vh, checkpoint) {
    const knee = getJoint(kps, 'knee', side, vw, vh);
    const ankle = getJoint(kps, 'ankle', side, vw, vh);
    const deviation = Math.abs(knee.x - ankle.x);
    return {
      pass: deviation < checkpoint.threshold,
      value: deviation,
      detail: `Knee-ankle deviation: ${(deviation * 100).toFixed(1)}%`,
    };
  },

  torsoAngle(kps, config, side, vw, vh, checkpoint) {
    const shoulder = getJoint(kps, 'shoulder', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const knee = getJoint(kps, 'knee', side, vw, vh);
    const angle = angleBetween(shoulder, hip, knee);
    const pass = checkpoint.minAngle
      ? angle >= checkpoint.minAngle && (!checkpoint.maxAngle || angle <= checkpoint.maxAngle)
      : (!checkpoint.maxAngle || angle <= checkpoint.maxAngle);
    return { pass, value: angle, detail: `Torso angle: ${angle.toFixed(0)}°` };
  },

  hipBelowKnee(kps, config, side, vw, vh, checkpoint) {
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const knee = getJoint(kps, 'knee', side, vw, vh);
    // In screen coords, Y increases downward, so hip.y > knee.y = below
    const diff = hip.y - knee.y;
    return {
      pass: diff > checkpoint.threshold,
      value: diff,
      detail: diff > 0 ? 'Good depth' : 'Go deeper',
    };
  },

  lockoutAngle(kps, config, side, vw, vh, checkpoint) {
    const joints = config.primaryJoint;
    const a = getJoint(kps, joints.a, side, vw, vh);
    const b = getJoint(kps, joints.b, side, vw, vh);
    const c = getJoint(kps, joints.c, side, vw, vh);
    const angle = angleBetween(a, b, c);
    return {
      pass: angle >= checkpoint.minAngle,
      value: angle,
      detail: `Lockout: ${angle.toFixed(0)}°`,
    };
  },

  spineNeutral(kps, config, side, vw, vh, checkpoint) {
    const shoulder = getJoint(kps, 'shoulder', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    // Midpoint between shoulder and hip — deviation from straight line
    const midX = (shoulder.x + hip.x) / 2;
    const midY = (shoulder.y + hip.y) / 2;
    // Use nose as proxy for upper spine position
    const nose = getKP(kps, KP.NOSE, vw, vh);
    const expectedX = shoulder.x;
    const deviation = Math.abs(nose.x - expectedX);
    return {
      pass: deviation < checkpoint.threshold,
      value: deviation,
      detail: deviation < checkpoint.threshold ? 'Back flat' : 'Back rounding detected',
    };
  },

  barPathDeviation(kps, config, side, vw, vh, checkpoint) {
    const wrist = getJoint(kps, 'wrist', side, vw, vh);
    const ankle = getJoint(kps, 'ankle', side, vw, vh);
    const deviation = Math.abs(wrist.x - ankle.x);
    return {
      pass: deviation < checkpoint.threshold,
      value: deviation,
      detail: `Bar drift: ${(deviation * 100).toFixed(1)}%`,
    };
  },

  bodyLineAngle(kps, config, side, vw, vh, checkpoint) {
    const shoulder = getJoint(kps, 'shoulder', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const ankle = getJoint(kps, 'ankle', side, vw, vh);
    const angle = angleBetween(shoulder, hip, ankle);
    const passMin = !checkpoint.minAngle || angle >= checkpoint.minAngle;
    const passMax = !checkpoint.maxAngle || angle <= checkpoint.maxAngle;
    return {
      pass: passMin && passMax,
      value: angle,
      detail: `Body line: ${angle.toFixed(0)}°`,
    };
  },

  elbowFlare(kps, config, side, vw, vh, checkpoint) {
    const shoulder = getJoint(kps, 'shoulder', side, vw, vh);
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const angle = angleBetween(hip, shoulder, elbow);
    return {
      pass: !checkpoint.maxAngle || angle <= checkpoint.maxAngle,
      value: angle,
      detail: `Elbow flare: ${angle.toFixed(0)}°`,
    };
  },

  elbowUnderWrist(kps, config, side, vw, vh, checkpoint) {
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const wrist = getJoint(kps, 'wrist', side, vw, vh);
    const deviation = Math.abs(elbow.x - wrist.x);
    return {
      pass: deviation < checkpoint.threshold,
      value: deviation,
      detail: `Elbow-wrist offset: ${(deviation * 100).toFixed(1)}%`,
    };
  },

  neckPosition(kps, config, side, vw, vh, checkpoint) {
    const nose = getKP(kps, KP.NOSE, vw, vh);
    const shoulder = getJoint(kps, 'shoulder', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    // Neck strain = nose X deviates significantly forward from shoulder X
    const forward = nose.x - shoulder.x;
    return {
      pass: Math.abs(forward) < checkpoint.threshold,
      value: forward,
      detail: Math.abs(forward) < checkpoint.threshold ? 'Neck neutral' : 'Head forward',
    };
  },

  pushupDepth(kps, config, side, vw, vh, checkpoint) {
    const shoulder = getJoint(kps, 'shoulder', side, vw, vh);
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const wrist = getJoint(kps, 'wrist', side, vw, vh);
    const angle = angleBetween(shoulder, elbow, wrist);
    return {
      pass: angle <= checkpoint.maxAngle,
      value: angle,
      detail: `Push-up depth: ${angle.toFixed(0)}°`,
    };
  },

  elbowStability(kps, config, side, vw, vh, checkpoint) {
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const drift = Math.abs(elbow.x - hip.x);
    return {
      pass: drift < checkpoint.threshold,
      value: drift,
      detail: drift < checkpoint.threshold ? 'Elbows pinned' : 'Elbows drifting',
    };
  },

  kneeValgus(kps, config, side, vw, vh, checkpoint) {
    // Simplified: compare knee X to midpoint of hip X and ankle X
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const knee = getJoint(kps, 'knee', side, vw, vh);
    const ankle = getJoint(kps, 'ankle', side, vw, vh);
    const midX = (hip.x + ankle.x) / 2;
    // Inward = knee closer to center than expected
    const inward = side === 'left' ? (midX - knee.x) : (knee.x - midX);
    const angleEstimate = inward * 90; // rough degrees estimate
    return {
      pass: angleEstimate < checkpoint.threshold,
      value: angleEstimate,
      detail: angleEstimate >= checkpoint.threshold ? 'Knee caving in!' : 'Knees tracking well',
    };
  },

  wristOverElbow(kps, config, side, vw, vh, checkpoint) {
    const wrist = getJoint(kps, 'wrist', side, vw, vh);
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const deviation = Math.abs(wrist.x - elbow.x);
    return {
      pass: deviation < checkpoint.threshold,
      value: deviation,
      detail: `Wrist-elbow offset: ${(deviation * 100).toFixed(1)}%`,
    };
  },

  wristAngle(kps, config, side, vw, vh, checkpoint) {
    // Simplified wrist extension estimate
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const wrist = getJoint(kps, 'wrist', side, vw, vh);
    // If wrist is significantly below elbow Y-wise during press = hyperextension
    const diff = Math.abs(wrist.y - elbow.y) * 90;
    return {
      pass: diff < checkpoint.threshold,
      value: diff,
      detail: diff >= checkpoint.threshold ? 'Wrist bent back' : 'Wrists neutral',
    };
  },

  elbowBehindTorso(kps, config, side, vw, vh, checkpoint) {
    const elbow = getJoint(kps, 'elbow', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const behind = side === 'left' ? (hip.x - elbow.x) : (elbow.x - hip.x);
    return {
      pass: behind > checkpoint.threshold,
      value: behind,
      detail: behind > checkpoint.threshold ? 'Good elbow drive' : 'Pull elbows back more',
    };
  },

  kneeBend(kps, config, side, vw, vh, checkpoint) {
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const knee = getJoint(kps, 'knee', side, vw, vh);
    const ankle = getJoint(kps, 'ankle', side, vw, vh);
    const angle = angleBetween(hip, knee, ankle);
    const pass = angle >= checkpoint.minAngle && angle <= checkpoint.maxAngle;
    return { pass, value: angle, detail: `Knee bend: ${angle.toFixed(0)}°` };
  },

  armsOverhead(kps, config, side, vw, vh, checkpoint) {
    const wrist = getJoint(kps, 'wrist', side, vw, vh);
    const ankle = getJoint(kps, 'ankle', side, vw, vh);
    const hip = getJoint(kps, 'hip', side, vw, vh);
    const midfoot = ankle.x;
    const deviation = Math.abs(wrist.x - midfoot);
    return {
      pass: deviation < checkpoint.threshold,
      value: deviation,
      detail: deviation < checkpoint.threshold ? 'Bar over midfoot' : 'Bar drifting',
    };
  },

  hipLevel(kps, config, side, vw, vh, checkpoint) {
    const leftHip = getKP(kps, KP.LEFT_HIP, vw, vh);
    const rightHip = getKP(kps, KP.RIGHT_HIP, vw, vh);
    const diff = Math.abs(leftHip.y - rightHip.y);
    return {
      pass: diff < checkpoint.threshold,
      value: diff,
      detail: diff < checkpoint.threshold ? 'Hips level' : 'Hip shift detected',
    };
  },
};

// ── FormAnalysisEngine class ──
export class FormAnalysisEngine {
  constructor(exerciseId, videoWidth, videoHeight) {
    this.config = getExerciseConfig(exerciseId);
    if (!this.config) throw new Error(`Unknown exercise: ${exerciseId}`);

    this.exerciseId = exerciseId;
    this.vw = videoWidth;
    this.vh = videoHeight;

    // Phase state machine
    this.currentPhase = PHASE.IDLE;
    this.phaseStartTime = Date.now();

    // Rep tracking
    this.repCount = 0;
    this.reps = []; // Array of per-rep data
    this.currentRep = null;

    // Scoring
    this.smoothedScore = null;
    this.frameScores = [];

    // Side detection
    this.activeSide = 'left';
    this.sideConfidence = 0;

    // Bar path
    this.barPathPoints = [];  // [{x, y, phase, timestamp}]

    // Ghost overlay
    this.bestRepScore = 0;
    this.bestRepKeypoints = null; // Full keypoint array from best rep at bottom

    // Temporal
    this.lastFrameTime = 0;
    this.frameCount = 0;

    // Bilateral
    this.bilateralDiffs = []; // angle differences between sides

    // Feedback state (what issues are active this frame)
    this.activeIssues = [];
    this.activeInjuryFlags = [];
  }

  /**
   * Update video dimensions if camera settings change
   */
  updateDimensions(vw, vh) {
    this.vw = vw;
    this.vh = vh;
  }

  /**
   * Process a single frame of pose data
   * Returns analysis result for this frame
   */
  processFrame(keypoints) {
    if (!keypoints || keypoints.length < 17) {
      return this._emptyResult();
    }

    const now = Date.now();
    const dt = this.lastFrameTime ? now - this.lastFrameTime : 33;
    this.lastFrameTime = now;
    this.frameCount++;

    // 1. Auto side detection (every 30 frames to avoid flicker)
    if (this.frameCount % 30 === 1) {
      this.activeSide = detectBestSide(keypoints, this.vw, this.vh);
    }

    const side = this.activeSide;
    const config = this.config;

    // 1b. Overall pose confidence check — skip analysis if pose barely visible
    const requiredKps = config.requiredKeypoints || [];
    let poseConfidence = 0;
    if (requiredKps.length > 0) {
      for (const idx of requiredKps) {
        poseConfidence += (keypoints[idx]?.score || 0);
      }
      poseConfidence /= requiredKps.length;
    } else {
      // Fallback: average all 17 keypoint scores
      poseConfidence = keypoints.reduce((sum, kp) => sum + (kp?.score || 0), 0) / keypoints.length;
    }
    this.poseConfidence = poseConfidence;

    // If pose confidence is too low, return partial result without running checkpoints
    if (poseConfidence < 0.35) {
      return {
        ...this._emptyResult(),
        phase: this.currentPhase,
        repCount: this.repCount,
        activeSide: this.activeSide,
        poseConfidence,
        lowConfidence: true,
      };
    }

    // 2. Calculate primary joint angle
    let primaryAngle = 180;
    if (config.primaryJoint) {
      const a = getJoint(keypoints, config.primaryJoint.a, side, this.vw, this.vh);
      const b = getJoint(keypoints, config.primaryJoint.b, side, this.vw, this.vh);
      const c = getJoint(keypoints, config.primaryJoint.c, side, this.vw, this.vh);
      primaryAngle = angleBetween(a, b, c);
    }

    let secondaryAngle = null;
    if (config.secondaryJoint) {
      const a = getJoint(keypoints, config.secondaryJoint.a, side, this.vw, this.vh);
      const b = getJoint(keypoints, config.secondaryJoint.b, side, this.vw, this.vh);
      const c = getJoint(keypoints, config.secondaryJoint.c, side, this.vw, this.vh);
      secondaryAngle = angleBetween(a, b, c);
    }

    // 3. Phase detection (skip for isometric exercises)
    let phaseChanged = false;
    if (!config.isIsometric && config.phases) {
      phaseChanged = this._updatePhase(primaryAngle, now);
    }

    // 4. Track bar path (wrist position)
    const wrist = getJoint(keypoints, 'wrist', side, this.vw, this.vh);
    if (wrist.score > 0.3) {
      this.barPathPoints.push({
        x: wrist.x, y: wrist.y,
        phase: this.currentPhase,
        timestamp: now,
      });
      // Keep last 300 points (~10s at 30fps)
      if (this.barPathPoints.length > 300) {
        this.barPathPoints.shift();
      }
    }

    // 5. Evaluate checkpoints
    const checkpointResults = this._evaluateCheckpoints(keypoints, side);

    // 6. Evaluate injury risks
    const injuryResults = this._evaluateInjuryRisks(keypoints, side);

    // 7. Calculate frame score (0-100)
    const rawScore = this._calculateScore(checkpointResults, keypoints);
    this.smoothedScore = ema(this.smoothedScore, rawScore, 0.15);

    // 8. Update current rep data
    if (this.currentRep) {
      this.currentRep.frames++;
      this.currentRep.scores.push(rawScore);
      if (primaryAngle < this.currentRep.minAngle) {
        this.currentRep.minAngle = primaryAngle;
      }
      if (primaryAngle > this.currentRep.maxAngle) {
        this.currentRep.maxAngle = primaryAngle;
      }
    }

    // 9. Ghost overlay — save best bottom position keypoints
    if (this.currentPhase === PHASE.BOTTOM && rawScore > this.bestRepScore) {
      this.bestRepScore = rawScore;
      this.bestRepKeypoints = keypoints.map(kp => ({ ...kp }));
    }

    // 10. Bilateral analysis (every 15 frames)
    let bilateralResult = null;
    if (this.frameCount % 15 === 0) {
      bilateralResult = this._analyzeBilateral(keypoints);
    }

    // 11. Fatigue detection
    const fatigueIndex = this._calculateFatigue();

    return {
      phase: this.currentPhase,
      phaseChanged,
      primaryAngle,
      secondaryAngle,
      repCount: this.repCount,
      score: Math.round(this.smoothedScore || 0),
      rawScore: Math.round(rawScore),
      checkpoints: checkpointResults,
      injuryFlags: injuryResults,
      activeSide: this.activeSide,
      barPathPoints: this.barPathPoints,
      bestRepKeypoints: this.bestRepKeypoints,
      bilateralResult,
      fatigueIndex,
      currentRep: this.currentRep,
      isIsometric: !!config.isIsometric,
      poseConfidence,
      lowConfidence: false,
    };
  }

  /**
   * Phase state machine — returns true if phase changed
   */
  _updatePhase(angle, now) {
    const { phases, invertedPhase } = this.config;
    const prev = this.currentPhase;

    // Helper: for normal exercises (squat, deadlift, bench, etc.) angle DECREASES
    // during eccentric (going down) and INCREASES during concentric (going up).
    // For inverted exercises (rows, curls) angle INCREASES during eccentric
    // (lowering/extending) and DECREASES during concentric (pulling/curling).
    //
    // Normal:   IDLE -> angle drops below eccentricStart -> ECCENTRIC
    //           ECCENTRIC -> angle drops below bottomThreshold -> BOTTOM
    //           BOTTOM -> angle rises above bottomThreshold+10 -> CONCENTRIC
    //           CONCENTRIC -> angle rises above concentricEnd -> LOCKOUT
    //
    // Inverted: IDLE -> angle rises above eccentricStart -> ECCENTRIC
    //           ECCENTRIC -> angle rises above bottomThreshold -> BOTTOM
    //           BOTTOM -> angle drops below bottomThreshold-10 -> CONCENTRIC
    //           CONCENTRIC -> angle drops below concentricEnd -> LOCKOUT

    switch (this.currentPhase) {
      case PHASE.IDLE:
        if (invertedPhase ? (angle > phases.eccentricStart) : (angle < phases.eccentricStart)) {
          this.currentPhase = PHASE.ECCENTRIC;
          this.phaseStartTime = now;
          // Start new rep
          this.currentRep = {
            number: this.repCount + 1,
            startTime: now,
            eccentricStart: now,
            eccentricEnd: null,
            concentricStart: null,
            concentricEnd: null,
            scores: [],
            frames: 0,
            minAngle: angle,
            maxAngle: angle,
            injuryFlags: [],
          };
        }
        break;

      case PHASE.ECCENTRIC:
        if (invertedPhase ? (angle > phases.bottomThreshold) : (angle < phases.bottomThreshold)) {
          this.currentPhase = PHASE.BOTTOM;
          this.phaseStartTime = now;
          if (this.currentRep) {
            this.currentRep.eccentricEnd = now;
          }
        } else if (invertedPhase ? (angle < phases.eccentricStart - 5) : (angle > phases.eccentricStart + 5)) {
          // Went back without reaching bottom — reset
          this.currentPhase = PHASE.IDLE;
          this.currentRep = null;
        }
        break;

      case PHASE.BOTTOM:
        if (invertedPhase ? (angle < phases.bottomThreshold - 10) : (angle > phases.bottomThreshold + 10)) {
          this.currentPhase = PHASE.CONCENTRIC;
          this.phaseStartTime = now;
          if (this.currentRep) {
            this.currentRep.concentricStart = now;
          }
        }
        break;

      case PHASE.CONCENTRIC:
        if (invertedPhase ? (angle < phases.concentricEnd) : (angle > phases.concentricEnd)) {
          this.currentPhase = PHASE.LOCKOUT;
          this.phaseStartTime = now;
          if (this.currentRep) {
            this.currentRep.concentricEnd = now;
          }
        } else if (invertedPhase ? (angle > phases.bottomThreshold) : (angle < phases.bottomThreshold)) {
          // Went back to bottom during concentric
          this.currentPhase = PHASE.BOTTOM;
          this.phaseStartTime = now;
        }
        break;

      case PHASE.LOCKOUT: {
        // Require 5+ frames in lockout before counting rep — prevents double-count
        // from angle oscillation near phase boundary
        const lockoutFrames = (now - this.phaseStartTime) / (dt || 33);
        if (lockoutFrames >= 5) {
          this._completeRep(now);
          this.currentPhase = PHASE.IDLE;
          this.phaseStartTime = now;
        }
        break;
      }
    }

    return this.currentPhase !== prev;
  }

  /**
   * Complete a rep — record data and increment counter
   */
  _completeRep(now) {
    this.repCount++;

    if (this.currentRep) {
      const rep = this.currentRep;
      rep.endTime = now;

      // Calculate tempo
      const eccentricMs = rep.eccentricEnd && rep.eccentricStart
        ? rep.eccentricEnd - rep.eccentricStart : 0;
      const concentricMs = rep.concentricEnd && rep.concentricStart
        ? rep.concentricEnd - rep.concentricStart : 0;

      // Average score for this rep
      const avgScore = rep.scores.length > 0
        ? rep.scores.reduce((a, b) => a + b, 0) / rep.scores.length
        : 0;

      const repData = {
        number: rep.number,
        score: Math.round(avgScore),
        eccentricMs,
        concentricMs,
        totalMs: rep.endTime - rep.startTime,
        rom: { min: rep.minAngle, max: rep.maxAngle, range: rep.maxAngle - rep.minAngle },
        injuryFlags: [...rep.injuryFlags],
        frames: rep.frames,
      };

      this.reps.push(repData);
      this.currentRep = null;
    }
  }

  /**
   * Evaluate form checkpoints for current frame
   */
  _evaluateCheckpoints(keypoints, side) {
    const results = [];
    for (const checkpoint of this.config.checkpoints) {
      // Skip phase-specific checks if not in that phase
      if (checkpoint.phaseOnly && this.currentPhase !== checkpoint.phaseOnly) {
        results.push({ ...checkpoint, result: null, active: false });
        continue;
      }

      const evaluator = EVALUATORS[checkpoint.evaluate];
      if (!evaluator) {
        console.warn(`[FormAnalysis] Unknown evaluator "${checkpoint.evaluate}" — skipping checkpoint`);
        results.push({ ...checkpoint, result: null, active: false });
        continue;
      }

      const result = evaluator(keypoints, this.config, side, this.vw, this.vh, checkpoint);
      results.push({
        ...checkpoint,
        result,
        active: true,
      });
    }

    // Update active issues for feedback manager
    this.activeIssues = results
      .filter(r => r.active && r.result && !r.result.pass)
      .map(r => ({ id: r.id, cue: r.cue, severity: r.severity, detail: r.result.detail }));

    return results;
  }

  /**
   * Evaluate injury risk flags
   */
  _evaluateInjuryRisks(keypoints, side) {
    const results = [];
    for (const risk of (this.config.injuryRisks || [])) {
      const evaluator = EVALUATORS[risk.evaluate];
      if (!evaluator) continue;

      const result = evaluator(keypoints, this.config, side, this.vw, this.vh, risk);
      if (!result.pass) {
        results.push({
          id: risk.id,
          name: risk.name,
          severity: risk.severity,
          cue: risk.cue,
          joints: risk.joints,
          value: result.value,
          detail: result.detail,
        });

        // Record on current rep
        if (this.currentRep && !this.currentRep.injuryFlags.includes(risk.id)) {
          this.currentRep.injuryFlags.push(risk.id);
        }
      }
    }

    this.activeInjuryFlags = results;
    return results;
  }

  /**
   * Calculate form score 0-100 with confidence weighting
   */
  _calculateScore(checkpointResults, keypoints) {
    const activeChecks = checkpointResults.filter(r => r.active && r.result);
    if (activeChecks.length === 0) return 85; // Default good score when no checks active

    let totalWeight = 0;
    let weightedScore = 0;

    for (const check of activeChecks) {
      // Weight by severity
      const weight = check.severity === 'danger' ? 3 : check.severity === 'warning' ? 2 : 1;

      // Weight by keypoint confidence
      const requiredKps = this.config.requiredKeypoints || [];
      let avgConf = 0;
      for (const idx of requiredKps) {
        avgConf += (keypoints[idx]?.score || 0);
      }
      avgConf = requiredKps.length > 0 ? avgConf / requiredKps.length : 0.5;
      const confWeight = Math.max(0.3, avgConf); // Floor at 30%

      const effectiveWeight = weight * confWeight;
      totalWeight += effectiveWeight;
      weightedScore += (check.result.pass ? 100 : 30) * effectiveWeight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 85;
  }

  /**
   * Bilateral analysis — compare left vs right angles
   */
  _analyzeBilateral(keypoints) {
    if (!this.config.primaryJoint) return null;

    const { a, b, c } = this.config.primaryJoint;

    const leftA = getJoint(keypoints, a, 'left', this.vw, this.vh);
    const leftB = getJoint(keypoints, b, 'left', this.vw, this.vh);
    const leftC = getJoint(keypoints, c, 'left', this.vw, this.vh);
    const rightA = getJoint(keypoints, a, 'right', this.vw, this.vh);
    const rightB = getJoint(keypoints, b, 'right', this.vw, this.vh);
    const rightC = getJoint(keypoints, c, 'right', this.vw, this.vh);

    // Only analyze if both sides have decent confidence
    const leftConf = Math.min(leftA.score, leftB.score, leftC.score);
    const rightConf = Math.min(rightA.score, rightB.score, rightC.score);

    if (leftConf < 0.3 || rightConf < 0.3) return null;

    const leftAngle = angleBetween(leftA, leftB, leftC);
    const rightAngle = angleBetween(rightA, rightB, rightC);
    const diff = Math.abs(leftAngle - rightAngle);

    this.bilateralDiffs.push(diff);
    // Cap at 30 to prevent memory growth in long sessions
    while (this.bilateralDiffs.length > 30) this.bilateralDiffs.shift();

    const avgDiff = this.bilateralDiffs.reduce((a, b) => a + b, 0) / this.bilateralDiffs.length;

    return {
      leftAngle: Math.round(leftAngle),
      rightAngle: Math.round(rightAngle),
      diff: Math.round(diff),
      avgDiff: Math.round(avgDiff),
      isAsymmetric: avgDiff > 10,
      weakerSide: leftAngle < rightAngle ? 'left' : 'right',
    };
  }

  /**
   * Fatigue detection — compare recent rep scores to initial reps
   */
  _calculateFatigue() {
    if (this.reps.length < 3) return 0;

    const firstThree = this.reps.slice(0, 3);
    const lastThree = this.reps.slice(-3);

    const initialAvg = firstThree.reduce((a, r) => a + r.score, 0) / firstThree.length;
    const recentAvg = lastThree.reduce((a, r) => a + r.score, 0) / lastThree.length;

    // Fatigue index: 0 = fresh, 1 = very fatigued
    const degradation = Math.max(0, initialAvg - recentAvg);
    return Math.min(1, degradation / 40); // 40-point drop = max fatigue
  }

  /**
   * Get session summary (call when workout done)
   */
  getSessionSummary() {
    const totalReps = this.reps.length;
    if (totalReps === 0) {
      return {
        exercise: this.exerciseId,
        exerciseName: this.config.name,
        totalReps: 0,
        reps: [],
        avgScore: 0,
        bestRep: null,
        worstRep: null,
        tempo: { avgEccentricMs: 0, avgConcentricMs: 0 },
        rom: { avgRange: 0 },
        fatigueIndex: 0,
        injuryFlags: [],
        scoreTrend: [],
        barPathPoints: [],
      };
    }

    const avgScore = this.reps.reduce((a, r) => a + r.score, 0) / totalReps;
    const avgEccentric = this.reps.reduce((a, r) => a + r.eccentricMs, 0) / totalReps;
    const avgConcentric = this.reps.reduce((a, r) => a + r.concentricMs, 0) / totalReps;
    const avgROM = this.reps.reduce((a, r) => a + r.rom.range, 0) / totalReps;

    // All unique injury flags across all reps
    const allInjuryFlags = [...new Set(this.reps.flatMap(r => r.injuryFlags))];

    // Score trend
    const scores = this.reps.map(r => r.score);
    const fatigueIndex = this._calculateFatigue();

    // Best and worst reps
    const bestRep = this.reps.reduce((best, r) => r.score > best.score ? r : best, this.reps[0]);
    const worstRep = this.reps.reduce((worst, r) => r.score < worst.score ? r : worst, this.reps[0]);

    return {
      exercise: this.exerciseId,
      exerciseName: this.config.name,
      totalReps,
      reps: this.reps,
      avgScore: Math.round(avgScore),
      bestRep,
      worstRep,
      tempo: {
        avgEccentricMs: Math.round(avgEccentric),
        avgConcentricMs: Math.round(avgConcentric),
      },
      rom: {
        avgRange: Math.round(avgROM),
      },
      fatigueIndex: Math.round(fatigueIndex * 100),
      injuryFlags: allInjuryFlags,
      scoreTrend: scores,
      barPathPoints: this.barPathPoints,
    };
  }

  /**
   * Reset for new set
   */
  reset() {
    this.currentPhase = PHASE.IDLE;
    this.repCount = 0;
    this.reps = [];
    this.currentRep = null;
    this.smoothedScore = null;
    this.frameScores = [];
    this.barPathPoints = [];
    this.bestRepScore = 0;
    this.bestRepKeypoints = null;
    this.bilateralDiffs = [];
    this.activeIssues = [];
    this.activeInjuryFlags = [];
    this.frameCount = 0;
  }

  _emptyResult() {
    return {
      phase: this.currentPhase,
      phaseChanged: false,
      primaryAngle: 0,
      secondaryAngle: null,
      repCount: this.repCount,
      score: 0,
      rawScore: 0,
      checkpoints: [],
      injuryFlags: [],
      activeSide: this.activeSide,
      barPathPoints: [],
      bestRepKeypoints: null,
      bilateralResult: null,
      fatigueIndex: 0,
      currentRep: null,
      isIsometric: !!this.config.isIsometric,
      poseConfidence: 0,
      lowConfidence: true,
    };
  }
}
