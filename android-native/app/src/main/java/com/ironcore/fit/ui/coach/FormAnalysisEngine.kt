package com.ironcore.fit.ui.coach

import android.graphics.PointF
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseLandmark
import kotlin.math.abs
import kotlin.math.atan2

// ══════════════════════════════════════════════════════════════════
// FormAnalysisEngine — Real-time exercise form analysis
//
// Port of React FormCoach.jsx analysis logic to native Kotlin.
// 6 exercises × 3 checkpoints each, per-exercise rep detection,
// rolling form score, coaching tips, and per-joint quality colors.
// ══════════════════════════════════════════════════════════════════

/** Checkpoint evaluation result */
enum class CheckpointStatus { PASS, FAIL, NULL }

data class CheckpointResult(
    val id: String,
    val label: String,
    val description: String,
    val status: CheckpointStatus
)

/** Per-exercise rep detection config */
data class RepDetectConfig(
    val jointType: Int,       // PoseLandmark type for tracking
    val axis: String,         // "y" or "x"
    val direction: String     // "down" for descending motion, "up" for ascending
)

/** Exercise definition matching React EXERCISES object */
data class ExerciseDefinition(
    val id: String,
    val name: String,
    val icon: String,
    val checkpoints: List<CheckpointDef>,
    val repDetect: RepDetectConfig
)

data class CheckpointDef(
    val id: String,
    val label: String,
    val description: String
)

/** Joint quality for overlay coloring */
enum class JointQuality { GOOD, WARNING, BAD, NEUTRAL }

/** Full analysis result from a single frame */
data class FormAnalysisResult(
    val checkpoints: List<CheckpointResult>,
    val formScore: Int,
    val coachingTip: String?,
    val jointQualities: Map<Int, JointQuality>
)

// ── Exercise Definitions ───────────────────────────────────────────

val EXERCISES = listOf(
    ExerciseDefinition(
        id = "squat",
        name = "Squat",
        icon = "fitness",
        checkpoints = listOf(
            CheckpointDef("depth", "Depth", "Hips below parallel — aim for 90° knee angle"),
            CheckpointDef("knees", "Knee Tracking", "Knees should track over toes, not cave inward"),
            CheckpointDef("back", "Back Position", "Keep chest up and back neutral")
        ),
        repDetect = RepDetectConfig(PoseLandmark.LEFT_HIP, "y", "down")
    ),
    ExerciseDefinition(
        id = "pushup",
        name = "Push-Up",
        icon = "fitness",
        checkpoints = listOf(
            CheckpointDef("elbows", "Elbow Angle", "Elbows at 45° from body, not flared"),
            CheckpointDef("hips", "Hip Alignment", "Maintain straight line from head to heels"),
            CheckpointDef("depth", "Depth", "Lower chest close to the ground")
        ),
        repDetect = RepDetectConfig(PoseLandmark.LEFT_SHOULDER, "y", "down")
    ),
    ExerciseDefinition(
        id = "deadlift",
        name = "Deadlift",
        icon = "fitness",
        checkpoints = listOf(
            CheckpointDef("back", "Back Neutral", "Maintain flat back — no rounding"),
            CheckpointDef("hips", "Hip Hinge", "Push hips back, not squatting down"),
            CheckpointDef("lockout", "Lockout", "Full hip extension at the top")
        ),
        repDetect = RepDetectConfig(PoseLandmark.LEFT_HIP, "y", "down")
    ),
    ExerciseDefinition(
        id = "lunge",
        name = "Lunge",
        icon = "fitness",
        checkpoints = listOf(
            CheckpointDef("knee_angle", "Front Knee", "Front knee at 90° — don't pass toes"),
            CheckpointDef("torso", "Torso Upright", "Keep torso vertical, no leaning"),
            CheckpointDef("back_knee", "Back Knee", "Back knee close to ground")
        ),
        repDetect = RepDetectConfig(PoseLandmark.LEFT_KNEE, "y", "down")
    ),
    ExerciseDefinition(
        id = "shoulder_press",
        name = "Shoulder Press",
        icon = "fitness",
        checkpoints = listOf(
            CheckpointDef("path", "Bar Path", "Press straight up, not forward"),
            CheckpointDef("lockout", "Full Extension", "Arms fully extended overhead"),
            CheckpointDef("core", "Core Stability", "No excessive back arch")
        ),
        repDetect = RepDetectConfig(PoseLandmark.LEFT_WRIST, "y", "up")
    ),
    ExerciseDefinition(
        id = "plank",
        name = "Plank",
        icon = "fitness",
        checkpoints = listOf(
            CheckpointDef("alignment", "Body Line", "Straight line from head to heels"),
            CheckpointDef("hips", "Hip Position", "Hips level — not sagging or piking"),
            CheckpointDef("shoulders", "Shoulder Stack", "Shoulders directly over wrists")
        ),
        repDetect = RepDetectConfig(PoseLandmark.LEFT_HIP, "y", "down") // plank doesn't really rep
    )
)

private const val MIN_CONFIDENCE = 0.35f
private const val SCORE_WINDOW = 30
private const val TIP_THROTTLE_FRAMES = 60

class FormAnalysisEngine {

    // Rolling score window
    private val scoreHistory = ArrayDeque<Float>(SCORE_WINDOW)

    // Rep counting state
    private var repPhase = "up" // "up" or "down"
    private var lastJointPos = 0f
    private var repCooldownFrames = 0
    private var _repCount = 0
    val repCount: Int get() = _repCount

    // Tip throttle
    private var framesSinceLastTip = TIP_THROTTLE_FRAMES
    private var lastTip: String? = null

    // Current exercise
    var currentExerciseIndex = 0
        private set
    val currentExercise: ExerciseDefinition get() = EXERCISES[currentExerciseIndex]

    fun selectExercise(index: Int) {
        if (index in EXERCISES.indices && index != currentExerciseIndex) {
            currentExerciseIndex = index
            resetState()
        }
    }

    fun resetState() {
        _repCount = 0
        repPhase = "up"
        lastJointPos = 0f
        repCooldownFrames = 0
        scoreHistory.clear()
        framesSinceLastTip = TIP_THROTTLE_FRAMES
        lastTip = null
    }

    /**
     * Analyze a single pose frame for the currently selected exercise.
     * Returns full analysis result with checkpoints, score, tip, and joint colors.
     */
    fun analyze(pose: Pose): FormAnalysisResult {
        val exercise = currentExercise
        val checkpoints = evaluateCheckpoints(pose, exercise)
        val jointQualities = buildJointQualities(pose, checkpoints, exercise)

        // Calculate form score from checkpoints
        val validCheckpoints = checkpoints.filter { it.status != CheckpointStatus.NULL }
        val passedCount = validCheckpoints.count { it.status == CheckpointStatus.PASS }
        val frameScore = if (validCheckpoints.isNotEmpty()) {
            (passedCount.toFloat() / validCheckpoints.size) * 100f
        } else 0f

        // Rolling average
        if (scoreHistory.size >= SCORE_WINDOW) scoreHistory.removeFirst()
        scoreHistory.addLast(frameScore)
        val avgScore = if (scoreHistory.isNotEmpty()) {
            scoreHistory.average().toInt()
        } else 0

        // Rep counting
        countReps(pose, exercise.repDetect)

        // Coaching tip (throttled)
        framesSinceLastTip++
        val tip = if (framesSinceLastTip >= TIP_THROTTLE_FRAMES) {
            val failingCheckpoint = checkpoints.firstOrNull { it.status == CheckpointStatus.FAIL }
            if (failingCheckpoint != null) {
                framesSinceLastTip = 0
                lastTip = failingCheckpoint.description
                failingCheckpoint.description
            } else lastTip
        } else lastTip

        return FormAnalysisResult(
            checkpoints = checkpoints,
            formScore = avgScore,
            coachingTip = tip,
            jointQualities = jointQualities
        )
    }

    // ── Per-Exercise Checkpoint Evaluation ──────────────────────────

    private fun evaluateCheckpoints(
        pose: Pose,
        exercise: ExerciseDefinition
    ): List<CheckpointResult> {
        return when (exercise.id) {
            "squat" -> evaluateSquat(pose, exercise)
            "pushup" -> evaluatePushup(pose, exercise)
            "deadlift" -> evaluateDeadlift(pose, exercise)
            "lunge" -> evaluateLunge(pose, exercise)
            "shoulder_press" -> evaluateShoulderPress(pose, exercise)
            "plank" -> evaluatePlank(pose, exercise)
            else -> exercise.checkpoints.map {
                CheckpointResult(it.id, it.label, it.description, CheckpointStatus.NULL)
            }
        }
    }

    private fun evaluateSquat(pose: Pose, exercise: ExerciseDefinition): List<CheckpointResult> {
        val lHip = pose.getLandmark(PoseLandmark.LEFT_HIP)
        val lKnee = pose.getLandmark(PoseLandmark.LEFT_KNEE)
        val lAnkle = pose.getLandmark(PoseLandmark.LEFT_ANKLE)
        val rKnee = pose.getLandmark(PoseLandmark.RIGHT_KNEE)
        val rAnkle = pose.getLandmark(PoseLandmark.RIGHT_ANKLE)
        val lShoulder = pose.getLandmark(PoseLandmark.LEFT_SHOULDER)

        // Depth — knee angle < 100° = good
        val depthStatus = if (lHip != null && lKnee != null && lAnkle != null) {
            val angle = angle(lHip, lKnee, lAnkle)
            if (angle < 100) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Knee tracking — knees over toes
        val kneeStatus = if (lKnee != null && lAnkle != null && rKnee != null && rAnkle != null) {
            val leftOk = lKnee.x >= lAnkle.x - 30
            val rightOk = rKnee.x <= rAnkle.x + 30
            if (leftOk && rightOk) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Back position — shoulder-hip-knee angle > 140° = upright
        val backStatus = if (lShoulder != null && lHip != null && lKnee != null) {
            val angle = angle(lShoulder, lHip, lKnee)
            if (angle > 140) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        return listOf(
            CheckpointResult("depth", exercise.checkpoints[0].label, exercise.checkpoints[0].description, depthStatus),
            CheckpointResult("knees", exercise.checkpoints[1].label, exercise.checkpoints[1].description, kneeStatus),
            CheckpointResult("back", exercise.checkpoints[2].label, exercise.checkpoints[2].description, backStatus)
        )
    }

    private fun evaluatePushup(pose: Pose, exercise: ExerciseDefinition): List<CheckpointResult> {
        val rShoulder = pose.getLandmark(PoseLandmark.RIGHT_SHOULDER)
        val rElbow = pose.getLandmark(PoseLandmark.RIGHT_ELBOW)
        val rWrist = pose.getLandmark(PoseLandmark.RIGHT_WRIST)
        val rHip = pose.getLandmark(PoseLandmark.RIGHT_HIP)
        val rAnkle = pose.getLandmark(PoseLandmark.RIGHT_ANKLE)

        // Elbows — angle between 30-60° from body (elbow angle 70-110)
        val elbowStatus = if (rShoulder != null && rElbow != null && rWrist != null) {
            val angle = angle(rShoulder, rElbow, rWrist)
            if (angle in 70.0..120.0) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Hips — shoulder-hip-ankle alignment (> 160° = straight)
        val hipStatus = if (rShoulder != null && rHip != null && rAnkle != null) {
            val angle = angle(rShoulder, rHip, rAnkle)
            if (angle > 160) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Depth — elbow angle < 90° = good depth
        val depthStatus = if (rShoulder != null && rElbow != null && rWrist != null) {
            val angle = angle(rShoulder, rElbow, rWrist)
            if (angle < 95) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        return listOf(
            CheckpointResult("elbows", exercise.checkpoints[0].label, exercise.checkpoints[0].description, elbowStatus),
            CheckpointResult("hips", exercise.checkpoints[1].label, exercise.checkpoints[1].description, hipStatus),
            CheckpointResult("depth", exercise.checkpoints[2].label, exercise.checkpoints[2].description, depthStatus)
        )
    }

    private fun evaluateDeadlift(pose: Pose, exercise: ExerciseDefinition): List<CheckpointResult> {
        val lShoulder = pose.getLandmark(PoseLandmark.LEFT_SHOULDER)
        val lHip = pose.getLandmark(PoseLandmark.LEFT_HIP)
        val lKnee = pose.getLandmark(PoseLandmark.LEFT_KNEE)
        val lAnkle = pose.getLandmark(PoseLandmark.LEFT_ANKLE)

        // Back neutral — shoulder-hip-knee angle > 120° (not too rounded)
        val backStatus = if (lShoulder != null && lHip != null && lKnee != null) {
            val angle = angle(lShoulder, lHip, lKnee)
            if (angle > 120) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Hip hinge — hip angle < 150° (actually hinging, not just squatting)
        val hipStatus = if (lShoulder != null && lHip != null && lKnee != null) {
            val angle = angle(lShoulder, lHip, lKnee)
            // Good hinge = moderate angle between 90-150
            if (angle in 90.0..160.0) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Lockout — hip-knee-ankle angle > 170° (full extension)
        val lockoutStatus = if (lHip != null && lKnee != null && lAnkle != null) {
            val angle = angle(lHip, lKnee, lAnkle)
            if (angle > 170) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        return listOf(
            CheckpointResult("back", exercise.checkpoints[0].label, exercise.checkpoints[0].description, backStatus),
            CheckpointResult("hips", exercise.checkpoints[1].label, exercise.checkpoints[1].description, hipStatus),
            CheckpointResult("lockout", exercise.checkpoints[2].label, exercise.checkpoints[2].description, lockoutStatus)
        )
    }

    private fun evaluateLunge(pose: Pose, exercise: ExerciseDefinition): List<CheckpointResult> {
        val lHip = pose.getLandmark(PoseLandmark.LEFT_HIP)
        val lKnee = pose.getLandmark(PoseLandmark.LEFT_KNEE)
        val lAnkle = pose.getLandmark(PoseLandmark.LEFT_ANKLE)
        val lShoulder = pose.getLandmark(PoseLandmark.LEFT_SHOULDER)
        val rKnee = pose.getLandmark(PoseLandmark.RIGHT_KNEE)
        val rAnkle = pose.getLandmark(PoseLandmark.RIGHT_ANKLE)
        val rHip = pose.getLandmark(PoseLandmark.RIGHT_HIP)

        // Front knee — hip-knee-ankle angle ~90°
        val kneeStatus = if (lHip != null && lKnee != null && lAnkle != null) {
            val angle = angle(lHip, lKnee, lAnkle)
            if (angle in 70.0..110.0) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Torso upright — shoulder-hip vertical alignment
        val torsoStatus = if (lShoulder != null && lHip != null) {
            val lean = abs(lShoulder.x - lHip.x)
            if (lean < 40) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Back knee — close to ground (right knee Y position relative to hip)
        val backKneeStatus = if (rKnee != null && rHip != null && rAnkle != null) {
            val angle = angle(rHip, rKnee, rAnkle)
            if (angle < 110) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        return listOf(
            CheckpointResult("knee_angle", exercise.checkpoints[0].label, exercise.checkpoints[0].description, kneeStatus),
            CheckpointResult("torso", exercise.checkpoints[1].label, exercise.checkpoints[1].description, torsoStatus),
            CheckpointResult("back_knee", exercise.checkpoints[2].label, exercise.checkpoints[2].description, backKneeStatus)
        )
    }

    private fun evaluateShoulderPress(pose: Pose, exercise: ExerciseDefinition): List<CheckpointResult> {
        val lShoulder = pose.getLandmark(PoseLandmark.LEFT_SHOULDER)
        val lElbow = pose.getLandmark(PoseLandmark.LEFT_ELBOW)
        val lWrist = pose.getLandmark(PoseLandmark.LEFT_WRIST)
        val lHip = pose.getLandmark(PoseLandmark.LEFT_HIP)
        val lKnee = pose.getLandmark(PoseLandmark.LEFT_KNEE)

        // Bar path — wrist above shoulder (pressing straight up)
        val pathStatus = if (lShoulder != null && lWrist != null) {
            val horizontalDrift = abs(lWrist.x - lShoulder.x)
            if (horizontalDrift < 50) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Full extension — elbow angle > 160°
        val lockoutStatus = if (lShoulder != null && lElbow != null && lWrist != null) {
            val angle = angle(lShoulder, lElbow, lWrist)
            if (angle > 160) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Core — no excessive back arch (shoulder-hip-knee > 165°)
        val coreStatus = if (lShoulder != null && lHip != null && lKnee != null) {
            val angle = angle(lShoulder, lHip, lKnee)
            if (angle > 165) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        return listOf(
            CheckpointResult("path", exercise.checkpoints[0].label, exercise.checkpoints[0].description, pathStatus),
            CheckpointResult("lockout", exercise.checkpoints[1].label, exercise.checkpoints[1].description, lockoutStatus),
            CheckpointResult("core", exercise.checkpoints[2].label, exercise.checkpoints[2].description, coreStatus)
        )
    }

    private fun evaluatePlank(pose: Pose, exercise: ExerciseDefinition): List<CheckpointResult> {
        val lShoulder = pose.getLandmark(PoseLandmark.LEFT_SHOULDER)
        val lHip = pose.getLandmark(PoseLandmark.LEFT_HIP)
        val lAnkle = pose.getLandmark(PoseLandmark.LEFT_ANKLE)
        val lElbow = pose.getLandmark(PoseLandmark.LEFT_ELBOW)
        val lWrist = pose.getLandmark(PoseLandmark.LEFT_WRIST)

        // Body line — shoulder-hip-ankle angle > 160° (straight)
        val alignStatus = if (lShoulder != null && lHip != null && lAnkle != null) {
            val angle = angle(lShoulder, lHip, lAnkle)
            if (angle > 160) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Hip position — hip Y between shoulder Y and ankle Y
        val hipStatus = if (lShoulder != null && lHip != null && lAnkle != null) {
            val midY = (lShoulder.y + lAnkle.y) / 2
            val deviation = abs(lHip.y - midY)
            if (deviation < 40) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        // Shoulder stack — shoulder X near wrist X
        val shoulderStatus = if (lShoulder != null && lWrist != null) {
            val drift = abs(lShoulder.x - lWrist.x)
            if (drift < 50) CheckpointStatus.PASS else CheckpointStatus.FAIL
        } else CheckpointStatus.NULL

        return listOf(
            CheckpointResult("alignment", exercise.checkpoints[0].label, exercise.checkpoints[0].description, alignStatus),
            CheckpointResult("hips", exercise.checkpoints[1].label, exercise.checkpoints[1].description, hipStatus),
            CheckpointResult("shoulders", exercise.checkpoints[2].label, exercise.checkpoints[2].description, shoulderStatus)
        )
    }

    // ── Joint Quality Coloring ─────────────────────────────────────

    private fun buildJointQualities(
        pose: Pose,
        checkpoints: List<CheckpointResult>,
        exercise: ExerciseDefinition
    ): Map<Int, JointQuality> {
        val qualities = mutableMapOf<Int, JointQuality>()
        val hasAnyFail = checkpoints.any { it.status == CheckpointStatus.FAIL }
        val allPass = checkpoints.all { it.status == CheckpointStatus.PASS }

        // Map exercise-relevant joints to quality based on checkpoint results
        val relevantJoints = getRelevantJoints(exercise.id)
        for (jointType in relevantJoints) {
            qualities[jointType] = when {
                allPass -> JointQuality.GOOD
                hasAnyFail -> JointQuality.BAD
                else -> JointQuality.WARNING
            }
        }

        // Per-checkpoint specific joint mapping for more granular coloring
        for (cp in checkpoints) {
            val joints = getCheckpointJoints(exercise.id, cp.id)
            for (j in joints) {
                qualities[j] = when (cp.status) {
                    CheckpointStatus.PASS -> JointQuality.GOOD
                    CheckpointStatus.FAIL -> JointQuality.BAD
                    CheckpointStatus.NULL -> JointQuality.NEUTRAL
                }
            }
        }

        return qualities
    }

    private fun getRelevantJoints(exerciseId: String): List<Int> = when (exerciseId) {
        "squat" -> listOf(
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
            PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER
        )
        "pushup" -> listOf(
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP
        )
        "deadlift" -> listOf(
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE
        )
        "lunge" -> listOf(
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
            PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
            PoseLandmark.LEFT_SHOULDER
        )
        "shoulder_press" -> listOf(
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_HIP
        )
        "plank" -> listOf(
            PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
            PoseLandmark.LEFT_WRIST
        )
        else -> emptyList()
    }

    private fun getCheckpointJoints(exerciseId: String, checkpointId: String): List<Int> = when {
        exerciseId == "squat" && checkpointId == "depth" -> listOf(PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP, PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE)
        exerciseId == "squat" && checkpointId == "knees" -> listOf(PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE, PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE)
        exerciseId == "squat" && checkpointId == "back" -> listOf(PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER)
        exerciseId == "pushup" && checkpointId == "elbows" -> listOf(PoseLandmark.RIGHT_ELBOW, PoseLandmark.LEFT_ELBOW)
        exerciseId == "pushup" && checkpointId == "hips" -> listOf(PoseLandmark.RIGHT_HIP, PoseLandmark.LEFT_HIP)
        exerciseId == "pushup" && checkpointId == "depth" -> listOf(PoseLandmark.RIGHT_SHOULDER, PoseLandmark.LEFT_SHOULDER)
        exerciseId == "deadlift" && checkpointId == "back" -> listOf(PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER)
        exerciseId == "deadlift" && checkpointId == "hips" -> listOf(PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP)
        exerciseId == "deadlift" && checkpointId == "lockout" -> listOf(PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE)
        else -> emptyList()
    }

    // ── Rep Counting ───────────────────────────────────────────────

    private fun countReps(pose: Pose, config: RepDetectConfig) {
        val landmark = pose.getPoseLandmark(config.jointType) ?: return
        if (landmark.inFrameLikelihood < MIN_CONFIDENCE) return

        if (repCooldownFrames > 0) {
            repCooldownFrames--
            return
        }

        val pos = if (config.axis == "y") landmark.position.y else landmark.position.x

        if (lastJointPos == 0f) {
            lastJointPos = pos
            return
        }

        val delta = pos - lastJointPos
        val threshold = 15f // Minimum movement to register phase change

        when (config.direction) {
            "down" -> {
                // Descending motion exercise (squat, pushup, etc.)
                if (repPhase == "up" && delta > threshold) {
                    repPhase = "down"
                } else if (repPhase == "down" && delta < -threshold) {
                    repPhase = "up"
                    _repCount++
                    repCooldownFrames = 15 // ~500ms at 30fps
                }
            }
            "up" -> {
                // Ascending motion exercise (shoulder press)
                if (repPhase == "down" && delta < -threshold) {
                    repPhase = "up"
                } else if (repPhase == "up" && delta > threshold) {
                    repPhase = "down"
                    _repCount++
                    repCooldownFrames = 15
                }
            }
        }

        lastJointPos = pos
    }

    // ── Geometry Helpers ───────────────────────────────────────────

    /** Get landmark position with confidence check. Returns null if low confidence. */
    private fun Pose.getLandmark(type: Int): PointF? {
        val lm = getPoseLandmark(type) ?: return null
        return if (lm.inFrameLikelihood >= MIN_CONFIDENCE) lm.position else null
    }

    /** Calculate angle at vertex point b, formed by points a-b-c. Returns degrees [0, 180]. */
    private fun angle(a: PointF, b: PointF, c: PointF): Double {
        val v1x = (a.x - b.x).toDouble()
        val v1y = (a.y - b.y).toDouble()
        val v2x = (c.x - b.x).toDouble()
        val v2y = (c.y - b.y).toDouble()
        val angle = atan2(v2y, v2x) - atan2(v1y, v1x)
        var degrees = abs(Math.toDegrees(angle))
        if (degrees > 180) degrees = 360 - degrees
        return degrees
    }
}
