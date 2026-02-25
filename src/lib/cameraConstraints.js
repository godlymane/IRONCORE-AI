/**
 * Optimized camera constraints for pose detection.
 * Prevents 1080p/4K streams that overheat mid-range Android devices.
 */

export const POSE_DETECTION_CONSTRAINTS = {
    video: {
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 24, max: 30 },
        facingMode: 'user'
    },
    audio: false
};

/** Canvas dimensions must match camera feed */
export const INFERENCE_CANVAS = {
    width: 480,
    height: 360
};

/**
 * Start camera with optimized constraints.
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<MediaStream>}
 */
export async function startOptimizedCamera(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(POSE_DETECTION_CONSTRAINTS);
        videoElement.srcObject = stream;
        videoElement.width = INFERENCE_CANVAS.width;
        videoElement.height = INFERENCE_CANVAS.height;
        await videoElement.play();
        return stream;
    } catch (err) {
        // Fallback to any available camera if constraints too strict
        if (err.name === 'OverconstrainedError') {
            console.warn('[Camera] Constraints too strict, falling back to defaults');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElement.srcObject = stream;
            await videoElement.play();
            return stream;
        }
        throw err;
    }
}

/** Stop all tracks on a stream */
export function stopCamera(stream) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}
