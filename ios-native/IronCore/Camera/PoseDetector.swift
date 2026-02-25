import Vision
import AVFoundation
import Combine

/// Body pose joint data — replaces TensorFlow.js pose output from React app
struct PoseJoint {
    let name: VNHumanBodyPoseObservation.JointName
    let x: CGFloat      // 0.0 to 1.0 (normalized)
    let y: CGFloat      // 0.0 to 1.0 (normalized)
    let confidence: Float
}

/// Full body pose with all detected joints
struct DetectedPose {
    let joints: [VNHumanBodyPoseObservation.JointName: PoseJoint]
    let timestamp: CFTimeInterval

    /// Get a specific joint (nil if not detected or low confidence)
    func joint(_ name: VNHumanBodyPoseObservation.JointName, minConfidence: Float = 0.3) -> PoseJoint? {
        guard let joint = joints[name], joint.confidence >= minConfidence else { return nil }
        return joint
    }

    /// Calculate angle between three joints (in degrees)
    /// Useful for form correction: e.g. angle at elbow = shoulder→elbow→wrist
    func angle(
        from a: VNHumanBodyPoseObservation.JointName,
        through b: VNHumanBodyPoseObservation.JointName,
        to c: VNHumanBodyPoseObservation.JointName
    ) -> Double? {
        guard let jointA = joint(a),
              let jointB = joint(b),
              let jointC = joint(c) else { return nil }

        let vectorBA = CGPoint(x: jointA.x - jointB.x, y: jointA.y - jointB.y)
        let vectorBC = CGPoint(x: jointC.x - jointB.x, y: jointC.y - jointB.y)

        let dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y
        let magnitudeBA = sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y)
        let magnitudeBC = sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y)

        guard magnitudeBA > 0, magnitudeBC > 0 else { return nil }

        let cosAngle = dotProduct / (magnitudeBA * magnitudeBC)
        let clampedCos = max(-1.0, min(1.0, cosAngle))
        return acos(clampedCos) * 180.0 / .pi
    }
}

/// Processes camera frames with Apple Vision framework for body pose detection
/// Runs VNDetectHumanBodyPoseRequest on each frame at 60fps
final class PoseDetector: ObservableObject {
    @Published var currentPose: DetectedPose?
    @Published var fps: Double = 0
    @Published var isDetecting = false

    private let request = VNDetectHumanBodyPoseRequest()
    private var lastFrameTime: CFTimeInterval = 0
    private var frameCount = 0
    private var fpsTimer: CFTimeInterval = 0

    /// All joint names we track (19 body points)
    static let trackedJoints: [VNHumanBodyPoseObservation.JointName] = [
        .nose,
        .leftEye, .rightEye,
        .leftEar, .rightEar,
        .leftShoulder, .rightShoulder,
        .leftElbow, .rightElbow,
        .leftWrist, .rightWrist,
        .leftHip, .rightHip,
        .leftKnee, .rightKnee,
        .leftAnkle, .rightAnkle,
        .neck,
        .root,  // center hip
    ]

    // MARK: - Process Frame

    /// Process a single camera frame — called from CameraManager.onFrameReceived
    func processFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])

        do {
            try handler.perform([request])

            guard let observation = request.results?.first else {
                DispatchQueue.main.async { self.currentPose = nil }
                return
            }

            let pose = extractPose(from: observation)
            let now = CACurrentMediaTime()

            // FPS calculation
            frameCount += 1
            if now - fpsTimer >= 1.0 {
                let currentFPS = Double(frameCount) / (now - fpsTimer)
                frameCount = 0
                fpsTimer = now
                DispatchQueue.main.async { self.fps = currentFPS }
            }

            DispatchQueue.main.async {
                self.currentPose = pose
                self.isDetecting = true
            }
        } catch {
            // Vision request failed — skip this frame silently
        }
    }

    // MARK: - Extract Pose Data

    private func extractPose(from observation: VNHumanBodyPoseObservation) -> DetectedPose {
        var joints: [VNHumanBodyPoseObservation.JointName: PoseJoint] = [:]

        for jointName in Self.trackedJoints {
            if let point = try? observation.recognizedPoint(jointName),
               point.confidence > 0.1 {
                joints[jointName] = PoseJoint(
                    name: jointName,
                    x: point.location.x,
                    y: 1.0 - point.location.y,  // Vision uses bottom-left origin, flip Y
                    confidence: point.confidence
                )
            }
        }

        return DetectedPose(
            joints: joints,
            timestamp: CACurrentMediaTime()
        )
    }

    // MARK: - Form Correction Angles

    /// Common exercise angles for form checking

    /// Elbow angle (e.g. bicep curl depth)
    func leftElbowAngle() -> Double? {
        currentPose?.angle(from: .leftShoulder, through: .leftElbow, to: .leftWrist)
    }

    func rightElbowAngle() -> Double? {
        currentPose?.angle(from: .rightShoulder, through: .rightElbow, to: .rightWrist)
    }

    /// Knee angle (e.g. squat depth)
    func leftKneeAngle() -> Double? {
        currentPose?.angle(from: .leftHip, through: .leftKnee, to: .leftAnkle)
    }

    func rightKneeAngle() -> Double? {
        currentPose?.angle(from: .rightHip, through: .rightKnee, to: .rightAnkle)
    }

    /// Hip angle (e.g. deadlift back position)
    func leftHipAngle() -> Double? {
        currentPose?.angle(from: .leftShoulder, through: .leftHip, to: .leftKnee)
    }

    func rightHipAngle() -> Double? {
        currentPose?.angle(from: .rightShoulder, through: .rightHip, to: .rightKnee)
    }
}
