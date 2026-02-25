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
import com.ironcore.fit.ui.theme.IronRed
import com.ironcore.fit.ui.theme.IronRedLight
import com.ironcore.fit.ui.theme.IronGreen

/**
 * Compose Canvas overlay that draws ML Kit skeletal landmarks and connections
 * on top of the camera preview. Scales landmark coordinates from image space
 * to the Canvas viewport size.
 */
@Composable
fun PoseOverlay(
    pose: Pose?,
    imageWidth: Int,
    imageHeight: Int,
    isFrontCamera: Boolean = true,
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

        fun drawLimb(
            startType: Int,
            endType: Int,
            color: Color = IronRedLight,
            strokeWidth: Float = 6f
        ) {
            val start = pose.getPoseLandmark(startType) ?: return
            val end = pose.getPoseLandmark(endType) ?: return
            if (start.inFrameLikelihood < 0.5f || end.inFrameLikelihood < 0.5f) return

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

        // ── Landmark dots ────────────────────────────────────

        val allLandmarks = pose.allPoseLandmarks
        for (landmark in allLandmarks) {
            if (landmark.inFrameLikelihood < 0.5f) continue
            val offset = landmarkToOffset(landmark)
            // Outer ring
            drawCircle(
                color = IronRed,
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
