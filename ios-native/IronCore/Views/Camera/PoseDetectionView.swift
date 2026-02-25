import SwiftUI
import AVFoundation

/// SwiftUI camera view with real-time pose overlay
/// Replaces TensorFlow.js webcam implementation from React AILabView
struct PoseDetectionView: View {
    @StateObject private var cameraManager = CameraManager()
    @StateObject private var poseDetector = PoseDetector()

    var body: some View {
        ZStack {
            // Camera preview
            CameraPreviewLayer(session: cameraManager.session)
                .ignoresSafeArea()

            // Pose overlay
            if let pose = poseDetector.currentPose {
                PoseOverlay(pose: pose)
            }

            // HUD overlay
            VStack {
                // FPS counter
                HStack {
                    Spacer()
                    Text("\(Int(poseDetector.fps)) FPS")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundStyle(.green)
                        .padding(8)
                        .background(.black.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding()

                Spacer()

                // Joint angle readouts
                if poseDetector.isDetecting {
                    HStack(spacing: 16) {
                        if let knee = poseDetector.leftKneeAngle() {
                            AngleReadout(label: "L Knee", degrees: knee)
                        }
                        if let knee = poseDetector.rightKneeAngle() {
                            AngleReadout(label: "R Knee", degrees: knee)
                        }
                        if let elbow = poseDetector.leftElbowAngle() {
                            AngleReadout(label: "L Elbow", degrees: elbow)
                        }
                        if let elbow = poseDetector.rightElbowAngle() {
                            AngleReadout(label: "R Elbow", degrees: elbow)
                        }
                    }
                    .padding()
                    .background(.black.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.bottom, 40)
                }
            }
        }
        .onAppear {
            cameraManager.onFrameReceived = { [weak poseDetector] buffer in
                poseDetector?.processFrame(buffer)
            }
            cameraManager.start()
        }
        .onDisappear {
            cameraManager.stop()
        }
    }
}

// MARK: - Camera Preview (UIViewRepresentable wrapping AVCaptureVideoPreviewLayer)

struct CameraPreviewLayer: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> CameraPreviewUIView {
        let view = CameraPreviewUIView()
        view.previewLayer.session = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: CameraPreviewUIView, context: Context) {}
}

class CameraPreviewUIView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}

// MARK: - Pose Overlay (draws skeleton on detected joints)

struct PoseOverlay: View {
    let pose: DetectedPose

    // Skeleton connections for drawing lines
    private let connections: [(VNHumanBodyPoseObservation.JointName, VNHumanBodyPoseObservation.JointName)] = [
        (.leftShoulder, .rightShoulder),
        (.leftShoulder, .leftElbow),
        (.leftElbow, .leftWrist),
        (.rightShoulder, .rightElbow),
        (.rightElbow, .rightWrist),
        (.leftShoulder, .leftHip),
        (.rightShoulder, .rightHip),
        (.leftHip, .rightHip),
        (.leftHip, .leftKnee),
        (.leftKnee, .leftAnkle),
        (.rightHip, .rightKnee),
        (.rightKnee, .rightAnkle),
        (.neck, .nose),
    ]

    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size

            // Draw skeleton lines
            ForEach(Array(connections.enumerated()), id: \.offset) { _, connection in
                if let from = pose.joint(connection.0),
                   let to = pose.joint(connection.1) {
                    Path { path in
                        path.move(to: CGPoint(
                            x: from.x * size.width,
                            y: from.y * size.height
                        ))
                        path.addLine(to: CGPoint(
                            x: to.x * size.width,
                            y: to.y * size.height
                        ))
                    }
                    .stroke(Color.red, lineWidth: 3)
                }
            }

            // Draw joint dots
            ForEach(Array(pose.joints.values.enumerated()), id: \.offset) { _, joint in
                Circle()
                    .fill(joint.confidence > 0.5 ? Color.red : Color.red.opacity(0.5))
                    .frame(width: 10, height: 10)
                    .position(
                        x: joint.x * size.width,
                        y: joint.y * size.height
                    )
            }
        }
    }
}

// MARK: - Angle Readout HUD Element

struct AngleReadout: View {
    let label: String
    let degrees: Double

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(.gray)
            Text("\(Int(degrees))°")
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundStyle(.white)
        }
    }
}
