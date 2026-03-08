/**
 * Exercise Configurations for Elite Form Coach
 * All thresholds are NORMALIZED RATIOS (0-1) relative to video dimensions
 * This makes analysis resolution-independent — works at any distance from camera
 *
 * Keypoint indices (MoveNet 17-point):
 * 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear,
 * 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow,
 * 9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip,
 * 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle
 */

// --- Keypoint index constants ---
export const KP = {
  NOSE: 0, LEFT_EYE: 1, RIGHT_EYE: 2, LEFT_EAR: 3, RIGHT_EAR: 4,
  LEFT_SHOULDER: 5, RIGHT_SHOULDER: 6, LEFT_ELBOW: 7, RIGHT_ELBOW: 8,
  LEFT_WRIST: 9, RIGHT_WRIST: 10, LEFT_HIP: 11, RIGHT_HIP: 12,
  LEFT_KNEE: 13, RIGHT_KNEE: 14, LEFT_ANKLE: 15, RIGHT_ANKLE: 16,
};

// Left/right keypoint pairs for bilateral analysis
export const BILATERAL_PAIRS = {
  shoulder: [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  elbow: [KP.LEFT_ELBOW, KP.RIGHT_ELBOW],
  wrist: [KP.LEFT_WRIST, KP.RIGHT_WRIST],
  hip: [KP.LEFT_HIP, KP.RIGHT_HIP],
  knee: [KP.LEFT_KNEE, KP.RIGHT_KNEE],
  ankle: [KP.LEFT_ANKLE, KP.RIGHT_ANKLE],
};

// --- Phase definitions for the state machine ---
// Each exercise defines phases with angle thresholds on primary/secondary joints
// Direction: 'descending' = angle decreases (e.g. squat going down), 'ascending' = angle increases
export const PHASE = {
  IDLE: 'idle',
  ECCENTRIC: 'eccentric',    // Lowering / stretching phase
  BOTTOM: 'bottom',          // Maximum ROM position
  CONCENTRIC: 'concentric',  // Lifting / contracting phase
  LOCKOUT: 'lockout',        // Full extension / top position
};

/**
 * Tier levels for premium gating
 * TIER_1: Available to ALL users (free + pro + elite)
 * TIER_2: Elite only — advanced features
 */
export const EXERCISE_TIER = {
  TIER_1: 1,  // Free for everyone
  TIER_2: 2,  // Elite only
};

// --- Exercise Configurations ---
export const EXERCISE_CONFIGS = {
  squat: {
    id: 'squat',
    name: 'Squat',
    tier: EXERCISE_TIER.TIER_1,
    icon: '🏋️',
    // Which keypoints are critical for this exercise
    requiredKeypoints: [KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE, KP.LEFT_SHOULDER],
    // Primary joint for phase detection
    primaryJoint: { a: 'hip', b: 'knee', c: 'ankle' },  // hip-knee-ankle angle
    secondaryJoint: { a: 'shoulder', b: 'hip', c: 'knee' }, // torso angle
    // Phase thresholds (angles in degrees)
    phases: {
      eccentricStart: 160,  // Standing angle to start counting eccentric
      bottomThreshold: 100, // Below this = at bottom (parallel or below)
      concentricEnd: 155,   // Above this = lockout
    },
    // Form checkpoints with normalized thresholds
    checkpoints: [
      {
        id: 'knee_tracking',
        name: 'Knee Tracking',
        description: 'Knees should track over toes',
        // Ratio: |kneeX - ankleX| / torsoLength < threshold
        evaluate: 'kneeOverToe',
        threshold: 0.15,
        severity: 'warning',
        cue: 'KNEE_VALGUS',
      },
      {
        id: 'back_angle',
        name: 'Back Angle',
        description: 'Torso should stay relatively upright',
        evaluate: 'torsoAngle',
        minAngle: 45,  // Below this = too much forward lean
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'depth',
        name: 'Depth',
        description: 'Hip crease below knee for full ROM',
        evaluate: 'hipBelowKnee',
        threshold: 0.02, // hip.y should be > knee.y by this ratio of videoHeight
        severity: 'info',
        cue: 'DEPTH_SHALLOW',
        phaseOnly: PHASE.BOTTOM, // Only check at bottom
      },
      {
        id: 'lockout',
        name: 'Lockout',
        description: 'Full hip and knee extension at top',
        evaluate: 'lockoutAngle',
        minAngle: 165,
        severity: 'info',
        cue: 'LOCKOUT_MISSING',
        phaseOnly: PHASE.LOCKOUT,
      },
    ],
    // Injury risk checks
    injuryRisks: [
      {
        id: 'knee_valgus',
        name: 'Knee Valgus',
        description: 'Knees caving inward',
        evaluate: 'kneeValgus',
        threshold: 15, // degrees of inward angle
        severity: 'danger',
        cue: 'KNEE_VALGUS',
        joints: ['knee'],
      },
    ],
    // Ideal angles for scoring (per phase)
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 85, secondary: 55 },
      [PHASE.LOCKOUT]: { primary: 175, secondary: 85 },
    },
  },

  deadlift: {
    id: 'deadlift',
    name: 'Deadlift',
    tier: EXERCISE_TIER.TIER_1,
    icon: '💪',
    requiredKeypoints: [KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE, KP.LEFT_SHOULDER, KP.LEFT_WRIST],
    primaryJoint: { a: 'shoulder', b: 'hip', c: 'knee' }, // hip hinge angle
    secondaryJoint: { a: 'hip', b: 'knee', c: 'ankle' },
    phases: {
      eccentricStart: 160,
      bottomThreshold: 90,
      concentricEnd: 165,
    },
    checkpoints: [
      {
        id: 'back_rounding',
        name: 'Back Position',
        description: 'Maintain neutral spine',
        evaluate: 'spineNeutral',
        threshold: 0.08, // shoulder-hip-midpoint vertical deviation ratio
        severity: 'danger',
        cue: 'BACK_ROUNDING',
      },
      {
        id: 'bar_path',
        name: 'Bar Path',
        description: 'Bar should travel vertically close to body',
        evaluate: 'barPathDeviation',
        threshold: 0.06, // wrist X deviation from ankle X as ratio
        severity: 'warning',
        cue: 'BAR_PATH_DRIFT',
      },
      {
        id: 'lockout',
        name: 'Lockout',
        description: 'Full hip extension at top',
        evaluate: 'lockoutAngle',
        minAngle: 170,
        severity: 'info',
        cue: 'LOCKOUT_MISSING',
        phaseOnly: PHASE.LOCKOUT,
      },
    ],
    injuryRisks: [
      {
        id: 'lumbar_flexion',
        name: 'Lumbar Flexion',
        description: 'Lower back rounding under load',
        evaluate: 'spineNeutral',
        threshold: 0.12,
        severity: 'danger',
        cue: 'BACK_ROUNDING',
        joints: ['hip', 'shoulder'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 80, secondary: 110 },
      [PHASE.LOCKOUT]: { primary: 175, secondary: 175 },
    },
  },

  'shoulder-press': {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    tier: EXERCISE_TIER.TIER_1,
    icon: '🙌',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP],
    primaryJoint: { a: 'shoulder', b: 'elbow', c: 'wrist' }, // arm angle
    secondaryJoint: { a: 'hip', b: 'shoulder', c: 'elbow' }, // shoulder flexion
    phases: {
      eccentricStart: 160,
      bottomThreshold: 95,
      concentricEnd: 160,
    },
    checkpoints: [
      {
        id: 'elbow_flare',
        name: 'Elbow Position',
        description: 'Elbows should stay under wrists',
        evaluate: 'elbowUnderWrist',
        threshold: 0.08,
        severity: 'warning',
        cue: 'ELBOW_FLARE',
      },
      {
        id: 'back_arch',
        name: 'Back Position',
        description: 'Avoid excessive back arch',
        evaluate: 'torsoAngle',
        minAngle: 75,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'lockout',
        name: 'Lockout',
        description: 'Full arm extension overhead',
        evaluate: 'lockoutAngle',
        minAngle: 165,
        severity: 'info',
        cue: 'LOCKOUT_MISSING',
        phaseOnly: PHASE.LOCKOUT,
      },
    ],
    injuryRisks: [
      {
        id: 'neck_strain',
        name: 'Neck Strain',
        description: 'Head pushed too far forward',
        evaluate: 'neckPosition',
        threshold: 0.1,
        severity: 'danger',
        cue: 'NECK_STRAIN',
        joints: ['shoulder'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 90, secondary: 90 },
      [PHASE.LOCKOUT]: { primary: 175, secondary: 170 },
    },
  },

  lunge: {
    id: 'lunge',
    name: 'Lunge',
    tier: EXERCISE_TIER.TIER_1,
    icon: '🦵',
    requiredKeypoints: [KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE, KP.LEFT_SHOULDER],
    primaryJoint: { a: 'hip', b: 'knee', c: 'ankle' },
    secondaryJoint: { a: 'shoulder', b: 'hip', c: 'knee' },
    phases: {
      eccentricStart: 155,
      bottomThreshold: 100,
      concentricEnd: 150,
    },
    checkpoints: [
      {
        id: 'knee_over_toe',
        name: 'Front Knee',
        description: 'Knee should not pass far beyond toes',
        evaluate: 'kneeOverToe',
        threshold: 0.12,
        severity: 'warning',
        cue: 'KNEE_VALGUS',
      },
      {
        id: 'torso_upright',
        name: 'Torso',
        description: 'Stay upright, chest up',
        evaluate: 'torsoAngle',
        minAngle: 70,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
    ],
    injuryRisks: [
      {
        id: 'knee_valgus',
        name: 'Knee Valgus',
        description: 'Front knee caving inward',
        evaluate: 'kneeValgus',
        threshold: 12,
        severity: 'danger',
        cue: 'KNEE_VALGUS',
        joints: ['knee'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 90, secondary: 80 },
      [PHASE.LOCKOUT]: { primary: 170, secondary: 85 },
    },
  },

  pushup: {
    id: 'pushup',
    name: 'Push-Up',
    tier: EXERCISE_TIER.TIER_1,
    icon: '💪',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP, KP.LEFT_ANKLE],
    primaryJoint: { a: 'shoulder', b: 'elbow', c: 'wrist' },
    secondaryJoint: { a: 'shoulder', b: 'hip', c: 'ankle' }, // body line
    phases: {
      eccentricStart: 155,
      bottomThreshold: 95,
      concentricEnd: 150,
    },
    checkpoints: [
      {
        id: 'body_line',
        name: 'Body Line',
        description: 'Maintain straight line from head to heels',
        evaluate: 'bodyLineAngle',
        minAngle: 160,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'elbow_tuck',
        name: 'Elbow Position',
        description: 'Elbows at ~45° from body, not flared',
        evaluate: 'elbowFlare',
        maxAngle: 75,
        severity: 'warning',
        cue: 'ELBOW_FLARE',
      },
      {
        id: 'depth',
        name: 'Depth',
        description: 'Chest close to ground',
        evaluate: 'pushupDepth',
        maxAngle: 95,
        severity: 'info',
        cue: 'DEPTH_SHALLOW',
        phaseOnly: PHASE.BOTTOM,
      },
    ],
    injuryRisks: [],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 85, secondary: 170 },
      [PHASE.LOCKOUT]: { primary: 170, secondary: 175 },
    },
  },

  plank: {
    id: 'plank',
    name: 'Plank',
    tier: EXERCISE_TIER.TIER_1,
    icon: '🧱',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_HIP, KP.LEFT_ANKLE, KP.LEFT_ELBOW],
    primaryJoint: { a: 'shoulder', b: 'hip', c: 'ankle' }, // body line
    secondaryJoint: null, // No secondary joint needed
    // Plank is isometric — no phases, just hold
    isIsometric: true,
    phases: null,
    checkpoints: [
      {
        id: 'hip_sag',
        name: 'Hip Position',
        description: 'Hips should be in line, not sagging',
        evaluate: 'bodyLineAngle',
        minAngle: 160,
        severity: 'warning',
        cue: 'HIP_SHIFT',
      },
      {
        id: 'hip_pike',
        name: 'Hip Pike',
        description: 'Hips not too high',
        evaluate: 'bodyLineAngle',
        maxAngle: 195,
        severity: 'info',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'neck_position',
        name: 'Neck',
        description: 'Keep neck neutral',
        evaluate: 'neckPosition',
        threshold: 0.08,
        severity: 'info',
        cue: 'NECK_STRAIN',
      },
    ],
    injuryRisks: [],
    idealAngles: {
      hold: { primary: 175 },
    },
  },

  // --- TIER 2 EXERCISES (Elite Only) ---

  'bench-press': {
    id: 'bench-press',
    name: 'Bench Press',
    tier: EXERCISE_TIER.TIER_2,
    icon: '🏋️',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP],
    primaryJoint: { a: 'shoulder', b: 'elbow', c: 'wrist' },
    secondaryJoint: { a: 'hip', b: 'shoulder', c: 'elbow' },
    phases: {
      eccentricStart: 155,
      bottomThreshold: 85,
      concentricEnd: 155,
    },
    checkpoints: [
      {
        id: 'elbow_angle',
        name: 'Elbow Tuck',
        description: 'Elbows at ~45-75° from torso',
        evaluate: 'elbowFlare',
        maxAngle: 80,
        severity: 'warning',
        cue: 'ELBOW_FLARE',
      },
      {
        id: 'bar_path',
        name: 'Bar Path',
        description: 'Bar should arc slightly toward face on press',
        evaluate: 'barPathDeviation',
        threshold: 0.08,
        severity: 'info',
        cue: 'BAR_PATH_DRIFT',
      },
      {
        id: 'wrist_alignment',
        name: 'Wrist Position',
        description: 'Wrists stacked over elbows',
        evaluate: 'wristOverElbow',
        threshold: 0.06,
        severity: 'warning',
        cue: 'WRIST_HYPEREXT',
      },
      {
        id: 'lockout',
        name: 'Lockout',
        description: 'Full arm extension at top',
        evaluate: 'lockoutAngle',
        minAngle: 165,
        severity: 'info',
        cue: 'LOCKOUT_MISSING',
        phaseOnly: PHASE.LOCKOUT,
      },
    ],
    injuryRisks: [
      {
        id: 'wrist_hyperextension',
        name: 'Wrist Hyperextension',
        description: 'Wrists bent back too far',
        evaluate: 'wristAngle',
        threshold: 30,
        severity: 'danger',
        cue: 'WRIST_HYPEREXT',
        joints: ['wrist'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 80, secondary: 45 },
      [PHASE.LOCKOUT]: { primary: 175, secondary: 90 },
    },
  },

  'barbell-row': {
    id: 'barbell-row',
    name: 'Barbell Row',
    tier: EXERCISE_TIER.TIER_2,
    icon: '🚣',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP, KP.LEFT_KNEE],
    primaryJoint: { a: 'shoulder', b: 'elbow', c: 'wrist' },
    secondaryJoint: { a: 'shoulder', b: 'hip', c: 'knee' }, // torso angle
    phases: {
      eccentricStart: 155,
      bottomThreshold: 160, // Arms extended = large angle
      concentricEnd: 100,   // Arms pulled in = small angle
    },
    // Row is an inverted movement — angle INCREASES on eccentric
    invertedPhase: true,
    checkpoints: [
      {
        id: 'torso_angle',
        name: 'Torso Angle',
        description: 'Maintain ~45° hip hinge',
        evaluate: 'torsoAngle',
        minAngle: 35,
        maxAngle: 65,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'back_rounding',
        name: 'Back Position',
        description: 'Keep back flat, no rounding',
        evaluate: 'spineNeutral',
        threshold: 0.1,
        severity: 'danger',
        cue: 'BACK_ROUNDING',
      },
      {
        id: 'elbow_drive',
        name: 'Elbow Drive',
        description: 'Drive elbows past torso at top',
        evaluate: 'elbowBehindTorso',
        threshold: 0.02,
        severity: 'info',
        cue: 'LOCKOUT_MISSING',
        phaseOnly: PHASE.BOTTOM, // Bottom = pulled position for rows
      },
    ],
    injuryRisks: [
      {
        id: 'lumbar_flexion',
        name: 'Lumbar Flexion',
        description: 'Lower back rounding',
        evaluate: 'spineNeutral',
        threshold: 0.14,
        severity: 'danger',
        cue: 'BACK_ROUNDING',
        joints: ['hip', 'shoulder'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 85, secondary: 50 },
      [PHASE.LOCKOUT]: { primary: 170, secondary: 50 },
    },
  },

  'bicep-curl': {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    tier: EXERCISE_TIER.TIER_2,
    icon: '💪',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP],
    primaryJoint: { a: 'shoulder', b: 'elbow', c: 'wrist' },
    secondaryJoint: { a: 'hip', b: 'shoulder', c: 'elbow' }, // shoulder stability
    // Curl is inverted — angle decreases as you curl up
    invertedPhase: true,
    phases: {
      eccentricStart: 50,   // Curled position
      bottomThreshold: 150, // Arms extended
      concentricEnd: 55,    // Curled again
    },
    checkpoints: [
      {
        id: 'elbow_drift',
        name: 'Elbow Position',
        description: 'Keep elbows pinned to sides',
        evaluate: 'elbowStability',
        threshold: 0.06,  // Elbow X drift from hip X as ratio
        severity: 'warning',
        cue: 'ELBOW_FLARE',
      },
      {
        id: 'body_swing',
        name: 'Body Swing',
        description: 'No swinging / momentum',
        evaluate: 'torsoAngle',
        minAngle: 80,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
    ],
    injuryRisks: [
      {
        id: 'wrist_hyperextension',
        name: 'Wrist Hyperextension',
        description: 'Wrists curling back',
        evaluate: 'wristAngle',
        threshold: 25,
        severity: 'warning',
        cue: 'WRIST_HYPEREXT',
        joints: ['wrist'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 40, secondary: 85 },
      [PHASE.LOCKOUT]: { primary: 160, secondary: 85 },
    },
  },

  rdl: {
    id: 'rdl',
    name: 'Romanian Deadlift',
    tier: EXERCISE_TIER.TIER_2,
    icon: '🏋️',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE, KP.LEFT_WRIST],
    primaryJoint: { a: 'shoulder', b: 'hip', c: 'knee' },
    secondaryJoint: { a: 'hip', b: 'knee', c: 'ankle' },
    phases: {
      eccentricStart: 160,
      bottomThreshold: 95,
      concentricEnd: 160,
    },
    checkpoints: [
      {
        id: 'back_flat',
        name: 'Back Position',
        description: 'Maintain flat back throughout',
        evaluate: 'spineNeutral',
        threshold: 0.07,
        severity: 'danger',
        cue: 'BACK_ROUNDING',
      },
      {
        id: 'knee_soft',
        name: 'Knee Bend',
        description: 'Slight knee bend, not straight-legged',
        evaluate: 'kneeBend',
        minAngle: 155,
        maxAngle: 175,
        severity: 'info',
        cue: 'LOCKOUT_MISSING',
      },
      {
        id: 'bar_close',
        name: 'Bar Path',
        description: 'Bar stays close to legs',
        evaluate: 'barPathDeviation',
        threshold: 0.05,
        severity: 'warning',
        cue: 'BAR_PATH_DRIFT',
      },
    ],
    injuryRisks: [
      {
        id: 'lumbar_flexion',
        name: 'Lumbar Flexion',
        description: 'Lower back rounding — high injury risk',
        evaluate: 'spineNeutral',
        threshold: 0.1,
        severity: 'danger',
        cue: 'BACK_ROUNDING',
        joints: ['hip', 'shoulder'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 85, secondary: 160 },
      [PHASE.LOCKOUT]: { primary: 175, secondary: 170 },
    },
  },

  'overhead-squat': {
    id: 'overhead-squat',
    name: 'Overhead Squat',
    tier: EXERCISE_TIER.TIER_2,
    icon: '🏋️',
    requiredKeypoints: [KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE],
    primaryJoint: { a: 'hip', b: 'knee', c: 'ankle' },
    secondaryJoint: { a: 'elbow', b: 'shoulder', c: 'hip' }, // arm overhead angle
    phases: {
      eccentricStart: 160,
      bottomThreshold: 100,
      concentricEnd: 155,
    },
    checkpoints: [
      {
        id: 'arms_overhead',
        name: 'Arms Overhead',
        description: 'Bar should stay directly over midfoot',
        evaluate: 'armsOverhead',
        threshold: 0.1, // wrist X deviation from midfoot X ratio
        severity: 'warning',
        cue: 'BAR_PATH_DRIFT',
      },
      {
        id: 'torso_upright',
        name: 'Torso',
        description: 'Stay as upright as possible',
        evaluate: 'torsoAngle',
        minAngle: 55,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'depth',
        name: 'Depth',
        description: 'Full depth squat',
        evaluate: 'hipBelowKnee',
        threshold: 0.02,
        severity: 'info',
        cue: 'DEPTH_SHALLOW',
        phaseOnly: PHASE.BOTTOM,
      },
    ],
    injuryRisks: [
      {
        id: 'knee_valgus',
        name: 'Knee Valgus',
        description: 'Knees caving inward',
        evaluate: 'kneeValgus',
        threshold: 15,
        severity: 'danger',
        cue: 'KNEE_VALGUS',
        joints: ['knee'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 85, secondary: 170 },
      [PHASE.LOCKOUT]: { primary: 175, secondary: 175 },
    },
  },

  'bulgarian-split-squat': {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    tier: EXERCISE_TIER.TIER_2,
    icon: '🦵',
    requiredKeypoints: [KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE, KP.LEFT_SHOULDER],
    primaryJoint: { a: 'hip', b: 'knee', c: 'ankle' },
    secondaryJoint: { a: 'shoulder', b: 'hip', c: 'knee' },
    phases: {
      eccentricStart: 155,
      bottomThreshold: 95,
      concentricEnd: 150,
    },
    checkpoints: [
      {
        id: 'knee_tracking',
        name: 'Front Knee',
        description: 'Knee tracks over toe, not past',
        evaluate: 'kneeOverToe',
        threshold: 0.1,
        severity: 'warning',
        cue: 'KNEE_VALGUS',
      },
      {
        id: 'torso_upright',
        name: 'Torso',
        description: 'Upright torso throughout',
        evaluate: 'torsoAngle',
        minAngle: 70,
        severity: 'warning',
        cue: 'LEAN_FORWARD',
      },
      {
        id: 'hip_shift',
        name: 'Hip Shift',
        description: 'Hips should stay level',
        evaluate: 'hipLevel',
        threshold: 0.04,
        severity: 'warning',
        cue: 'HIP_SHIFT',
      },
    ],
    injuryRisks: [
      {
        id: 'knee_valgus',
        name: 'Knee Valgus',
        description: 'Front knee caving inward',
        evaluate: 'kneeValgus',
        threshold: 12,
        severity: 'danger',
        cue: 'KNEE_VALGUS',
        joints: ['knee'],
      },
    ],
    idealAngles: {
      [PHASE.BOTTOM]: { primary: 90, secondary: 80 },
      [PHASE.LOCKOUT]: { primary: 170, secondary: 85 },
    },
  },
};

/**
 * Get exercises by tier
 */
export function getExercisesByTier(tier) {
  return Object.values(EXERCISE_CONFIGS).filter(e => e.tier <= tier);
}

/**
 * Get all exercise IDs for a tier
 */
export function getExerciseIds(tier = EXERCISE_TIER.TIER_2) {
  return getExercisesByTier(tier).map(e => e.id);
}

/**
 * Get config for a specific exercise
 */
export function getExerciseConfig(exerciseId) {
  return EXERCISE_CONFIGS[exerciseId] || null;
}
