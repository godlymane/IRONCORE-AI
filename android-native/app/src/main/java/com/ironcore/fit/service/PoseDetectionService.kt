package com.ironcore.fit.service

import android.graphics.PointF
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.accurate.AccuratePoseDetectorOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.atan2

/**
 * ML Kit Pose Detection service for real-time form correction.
 *
 * This is the core differentiator of IronCore Fit. Uses ML Kit's
 * accurate pose detector in STREAM_MODE for real-time analysis
 * of exercise form via the phone's camera.
 *
 * Currently analyzes:
 * - Squat depth and knee alignment
 * - Bicep curl elbow position and range of motion
 * - Deadlift back angle (spinal neutrality)
 * - Push-up depth and body alignment
 *
 * The service exposes:
 * - currentPose: raw ML Kit Pose for overlay rendering
 * - formFeedback: human-readable coaching cues
 * - repCount: detected repetition count per exercise
 */
@Singleton
class PoseDetectionService @Inject constructor() {

    private val poseDetector: PoseDetector = PoseDetection.getClient(
        AccuratePoseDetectorOptions.Builder()
            .setDetectorMode(AccuratePoseDetectorOptions.STREAM_MODE)
            .build()
    )

    private val _currentPose = MutableStateFlow<Pose?>(null)
    val currentPose: StateFlow<Pose?> = _currentPose.asStateFlow()

    private val _formFeedback = MutableStateFlow<List<String>>(emptyList())
    val formFeedback: StateFlow<List<String>> = _formFeedback.asStateFlow()

    private val _repCount = MutableStateFlow(0)
    val repCount: StateFlow<Int> = _repCount.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    // Rep counting state
    private var lastKneeAngle = 180.0
    private var isInRep = false
    private val REP_THRESHOLD_DOWN = 100.0  // Angle below this = in the rep
    private val REP_THRESHOLD_UP = 150.0    // Angle above this = rep completed

    /**
     * Process a camera frame for pose detection.
     *
     * Skips frames if already processing to avoid backpressure.
     * Always closes the ImageProxy when done (required by CameraX).
     */
    @OptIn(ExperimentalGetImage::class)
    fun processImageProxy(imageProxy: ImageProxy) {
        if (_isProcessing.value) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image ?: run {
            imageProxy.close()
            return
        }

        _isProcessing.value = true
        val inputImage = InputImage.fromMediaImage(
            mediaImage,
            imageProxy.imageInfo.rotationDegrees
        )

        poseDetector.process(inputImage)
            .addOnSuccessListener { pose ->
                _currentPose.value = pose
                analyzeForm(pose)
                countReps(pose)
            }
            .addOnCompleteListener {
                _isProcessing.value = false
                imageProxy.close()
            }
    }

    /**
     * Analyze the detected pose and generate form feedback.
     * Each exercise check produces specific coaching cues.
     */
    private fun analyzeForm(pose: Pose) {
        val feedback = mutableListOf<String>()

        // ── Squat analysis ────────────────────────────────────────
        val leftHip = pose.getPoseLandmark(PoseLandmark.LEFT_HIP)
        val leftKnee = pose.getPoseLandmark(PoseLandmark.LEFT_KNEE)
        val leftAnkle = pose.getPoseLandmark(PoseLandmark.LEFT_ANKLE)

        if (leftHip != null && leftKnee != null && leftAnkle != null) {
            val kneeAngle = calculateAngle(
                leftHip.position, leftKnee.position, leftAnkle.position
            )

            when {
                kneeAngle < 70 -> feedback.add("Great depth on the squat!")
                kneeAngle in 70.0..100.0 -> feedback.add("Try to go a bit deeper")
                kneeAngle in 100.0..140.0 -> feedback.add("Go lower for full range of motion")
            }

            // Check knee cave (knees collapsing inward)
            val rightKnee = pose.getPoseLandmark(PoseLandmark.RIGHT_KNEE)
            val rightAnkle = pose.getPoseLandmark(PoseLandmark.RIGHT_ANKLE)
            if (rightKnee != null && rightAnkle != null) {
                if (leftKnee.position.x < leftAnkle.position.x - 30) {
                    feedback.add("Keep left knee tracking over toes")
                }
                if (rightKnee.position.x > rightAnkle.position.x + 30) {
                    feedback.add("Keep right knee tracking over toes")
                }
            }
        }

        // ── Bicep curl analysis ───────────────────────────────────
        val leftShoulder = pose.getPoseLandmark(PoseLandmark.LEFT_SHOULDER)
        val leftElbow = pose.getPoseLandmark(PoseLandmark.LEFT_ELBOW)
        val leftWrist = pose.getPoseLandmark(PoseLandmark.LEFT_WRIST)

        if (leftShoulder != null && leftElbow != null && leftWrist != null) {
            val elbowAngle = calculateAngle(
                leftShoulder.position, leftElbow.position, leftWrist.position
            )

            // Check if elbow is drifting forward (shoulder flexion)
            val elbowToShoulderDiffY = leftShoulder.position.y - leftElbow.position.y
            if (elbowToShoulderDiffY < 20 && elbowAngle < 120) {
                feedback.add("Keep your elbow pinned to your side")
            }

            // Full range of motion check
            if (elbowAngle > 160) {
                feedback.add("Good full extension at the bottom")
            }
        }

        // ── Deadlift / back angle analysis ────────────────────────
        val leftShoulderDL = pose.getPoseLandmark(PoseLandmark.LEFT_SHOULDER)
        val leftHipDL = pose.getPoseLandmark(PoseLandmark.LEFT_HIP)
        val leftKneeDL = pose.getPoseLandmark(PoseLandmark.LEFT_KNEE)

        if (leftShoulderDL != null && leftHipDL != null && leftKneeDL != null) {
            val backAngle = calculateAngle(
                leftShoulderDL.position, leftHipDL.position, leftKneeDL.position
            )

            // During a deadlift, extreme rounding (very small angle) is bad
            if (backAngle < 120 && backAngle > 60) {
                feedback.add("Keep your back neutral - avoid rounding")
            }
        }

        // ── Push-up analysis ──────────────────────────────────────
        val rightShoulder = pose.getPoseLandmark(PoseLandmark.RIGHT_SHOULDER)
        val rightElbow = pose.getPoseLandmark(PoseLandmark.RIGHT_ELBOW)
        val rightWrist = pose.getPoseLandmark(PoseLandmark.RIGHT_WRIST)

        if (rightShoulder != null && rightElbow != null && rightWrist != null) {
            val pushupAngle = calculateAngle(
                rightShoulder.position, rightElbow.position, rightWrist.position
            )
            if (pushupAngle < 90) {
                feedback.add("Great push-up depth!")
            }
        }

        _formFeedback.value = feedback
    }

    /**
     * Count repetitions based on knee angle oscillation.
     * A rep is counted when the knee angle goes below the down
     * threshold and then returns above the up threshold.
     */
    private fun countReps(pose: Pose) {
        val leftHip = pose.getPoseLandmark(PoseLandmark.LEFT_HIP)
        val leftKnee = pose.getPoseLandmark(PoseLandmark.LEFT_KNEE)
        val leftAnkle = pose.getPoseLandmark(PoseLandmark.LEFT_ANKLE)

        if (leftHip != null && leftKnee != null && leftAnkle != null) {
            val kneeAngle = calculateAngle(
                leftHip.position, leftKnee.position, leftAnkle.position
            )

            if (!isInRep && kneeAngle < REP_THRESHOLD_DOWN) {
                isInRep = true
            } else if (isInRep && kneeAngle > REP_THRESHOLD_UP) {
                isInRep = false
                _repCount.value += 1
            }

            lastKneeAngle = kneeAngle
        }
    }

    /**
     * Calculate the angle at the vertex point formed by three landmarks.
     * Returns degrees in range [0, 360).
     */
    private fun calculateAngle(p1: PointF, vertex: PointF, p2: PointF): Double {
        val v1x = (p1.x - vertex.x).toDouble()
        val v1y = (p1.y - vertex.y).toDouble()
        val v2x = (p2.x - vertex.x).toDouble()
        val v2y = (p2.y - vertex.y).toDouble()
        val angle = atan2(v2y, v2x) - atan2(v1y, v1x)
        var degrees = abs(Math.toDegrees(angle))
        if (degrees > 180) degrees = 360 - degrees
        return degrees
    }

    /** Reset the rep counter (e.g., when switching exercises). */
    fun resetRepCount() {
        _repCount.value = 0
        isInRep = false
        lastKneeAngle = 180.0
    }

    /** Release ML Kit resources. Call when the camera screen is dismissed. */
    fun close() {
        poseDetector.close()
    }
}
