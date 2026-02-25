package com.ironcore.fit.ui.coach

import android.media.Image
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions

/**
 * CameraX ImageAnalysis.Analyzer that pipes frames into ML Kit Pose Detection.
 * Runs in STREAM_MODE for real-time skeletal tracking at ~30fps.
 *
 * Replaces the React app's TensorFlow.js WASM implementation with native
 * ML Kit — significantly lower latency and better battery efficiency.
 */
class PoseDetectionProcessor(
    private val onPoseDetected: (Pose, Int, Int) -> Unit,
    private val onError: (Exception) -> Unit
) : ImageAnalysis.Analyzer {

    private val detector: PoseDetector

    init {
        val options = PoseDetectorOptions.Builder()
            .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
            .build()
        detector = PoseDetection.getClient(options)
    }

    @androidx.annotation.OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage: Image = imageProxy.image ?: run {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(
            mediaImage,
            imageProxy.imageInfo.rotationDegrees
        )

        detector.process(inputImage)
            .addOnSuccessListener { pose ->
                onPoseDetected(pose, imageProxy.width, imageProxy.height)
            }
            .addOnFailureListener { e ->
                onError(e)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    fun close() {
        detector.close()
    }
}
