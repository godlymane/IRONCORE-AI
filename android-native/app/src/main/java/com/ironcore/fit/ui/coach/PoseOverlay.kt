package com.ironcore.fit.ui.coach

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseLandmark
import com.ironcore.fit.ui.theme.IronGreen
import com.ironcore.fit.ui.theme.IronRed
import com.ironcore.fit.ui.theme.IronRedLight
import com.ironcore.fit.ui.theme.IronYellow

/**
 * Enhanced Compose Canvas overlay with form-quality-based joint coloring.
 *
 * Joint colors:
 * - Green = GOOD form on that joint's checkpoint
 * - Yellow = WARNING / neutral
 * - Red = BAD form — needs correction
 *
 * Limb connections inherit color from their endpoint joints.
 */
@Composable
fun PoseOverlay(
    pose: Pose?,
    imageWidth: Int,
    imageHeight: Int,
    isFrontCamera: Boolean = true,
    jointQualities: Map<Int, JointQuality> = emptyMap(),
    modifier: Modifier = Modifier
) {
    if (pose == null) return

    Canvas(modifier = modifier.fillMaxSize()) {
        val scaleX = size.width / imageWidth.toFloat()
        val scaleY = size.height / imageHeight.toFloat()

        fun landmarkToOffset(landmark: PoseLandmark): Offset {
            val x = if (isFrontCamera) {
                size.width - landmark.position.x * scaleX
            } else {
                landmark.position.x * scaleX
            }
            val y = landmark.position.y * scaleY
            return Offset(x, y)
        }

        fun qualityColor(jointType: Int): Color {
            return when (jointQualities[jointType]) {
                JointQuality.GOOD -> IronGreen
                JointQuality.WARNING -> IronYellow
                JointQuality.BAD -> IronRed
                JointQuality.NEUTRAL, null -> IronRedLight
            }
        }

        fun drawLimb(
            startType: Int,
            endType: Int,
            defaultColor: Color = IronRedLight,
            strokeWidth: Float = 6f
        ) {
            val start = pose.getPoseLandmark(startType) ?: return
            val end = pose.getPoseLandmark(endType) ?: return
            if (start.inFrameLikelihood < 0.5f || end.inFrameLikelihood < 0.5f) return

            // Use joint quality color if available, else default
            val color = if (jointQualities.isNotEmpty()) {
                val startQual = jointQualities[startType]
                val endQual = jointQualities[endType]
                when {
                    startQual == JointQuality.BAD || endQual == JointQuality.BAD -> IronRed
                    startQual == JointQuality.WARNING || endQual == JointQuality.WARNING -> IronYellow
                    startQual == JointQuality.GOOD || endQual == JointQuality.GOOD -> IronGreen
                    else -> defaultColor
                }
            } else defaultColor

            drawLine(
                color = color,
                start = landmarkToOffset(start),
                end = landmarkToOffset(end),
                strokeWidth = strokeWidth,
                cap = StrokeCap.Round
            )
        }

        // ── Skeleton connections ─────────────────────────────

        // Torso
        drawLimb(PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER)
        drawLimb(PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP)
        drawLimb(PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_HIP)
        drawLimb(PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_HIP)

        // Left arm
        drawLimb(PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW, IronGreen)
        drawLimb(PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST, IronGreen)

        // Right arm
        drawLimb(PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW, IronGreen)
        drawLimb(PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST, IronGreen)

        // Left leg
        drawLimb(PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE, IronRed)
        drawLimb(PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_ANKLE, IronRed)

        // Right leg
        drawLimb(PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE, IronRed)
        drawLimb(PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_ANKLE, IronRed)

        // ── Landmark dots with quality coloring ─────────────

        val allLandmarks = pose.allPoseLandmarks
        for (landmark in allLandmarks) {
            if (landmark.inFrameLikelihood < 0.5f) continue
            val offset = landmarkToOffset(landmark)
            val color = qualityColor(landmark.landmarkType)

            // Outer ring — quality-colored
            drawCircle(
                color = color,
                radius = 10f,
                center = offset
            )
            // Inner dot
            drawCircle(
                color = Color.White,
                radius = 5f,
                center = offset
            )
        }
    }
}
