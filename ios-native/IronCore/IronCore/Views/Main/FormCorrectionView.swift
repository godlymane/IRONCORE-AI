import SwiftUI
import AVFoundation
import Vision

/// AI Form Correction — THE core feature. Camera feed with real-time pose detection,
/// skeleton overlay, form scoring, rep counting, and coaching feedback.
/// Mirrors FormCoach.jsx from React prototype using Apple Vision framework.
struct FormCorrectionView: View {
    @StateObject private var vm = FormCorrectionViewModel()
    @EnvironmentObject var premiumVM: PremiumViewModel
    var onComplete: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            // Exercise picker + score HUD
            exerciseHeader

            // Exercise picker dropdown
            if vm.showExercisePicker {
                exercisePickerGrid
            }

            // Camera area
            cameraArea

            // Form feedback cards
            if vm.isStreaming && !vm.feedback.isEmpty {
                feedbackCards
            }

            // Controls
            if vm.isStreaming {
                controlButtons
            }
        }
        .sheet(isPresented: $vm.showSummary) {
            RepSummarySheet(
                repSummary: vm.repSummary,
                exercise: vm.selectedExercise.name,
                formScore: vm.formScore
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .alert("Daily Limit Reached", isPresented: $vm.showPremiumGate) {
            Button("Upgrade to Premium") {
                _ = premiumVM.requirePremium("aiCoachCalls")
            }
            Button("OK", role: .cancel) { }
        } message: {
            Text("Free users get \(FormCorrectionViewModel.freeSessionsPerDay) form correction sessions per day. Upgrade to Premium for unlimited access.")
        }
    }

    // MARK: - Exercise Header + Score

    private var exerciseHeader: some View {
        HStack {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    vm.showExercisePicker.toggle()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: vm.selectedExercise.icon)
                        .font(.system(size: 14))
                    Text(vm.selectedExercise.name)
                        .font(.system(size: 14, weight: .bold))
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .rotationEffect(.degrees(vm.showExercisePicker ? 180 : 0))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
            }

            Spacer()

            if vm.isStreaming {
                HStack(spacing: 16) {
                    // Rep count
                    VStack(spacing: 2) {
                        Text("\(vm.repCount)")
                            .font(.system(size: 22, weight: .black))
                            .foregroundColor(.white)
                        Text("REPS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.gray)
                            .tracking(1)
                    }

                    // Form score
                    VStack(spacing: 2) {
                        Text("\(vm.formScore)%")
                            .font(.system(size: 20, weight: .black))
                            .foregroundColor(scoreDisplayColor)
                        Text("FORM")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.gray)
                            .tracking(1)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(scoreBackgroundColor.opacity(0.15))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(scoreBackgroundColor.opacity(0.3), lineWidth: 1)
                            )
                    )
                }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Exercise Picker Grid

    private var exercisePickerGrid: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
            ForEach(FormCorrectionViewModel.exercises) { exercise in
                Button {
                    vm.selectExercise(exercise)
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: exercise.icon)
                            .font(.system(size: 20))
                        Text(exercise.name)
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundColor(vm.selectedExercise.id == exercise.id ? .white : Color.gray)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(
                                vm.selectedExercise.id == exercise.id
                                    ? Color.ironRed.opacity(0.3)
                                    : Color.white.opacity(0.04)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(
                                        vm.selectedExercise.id == exercise.id
                                            ? Color.ironRed.opacity(0.6)
                                            : Color.white.opacity(0.08),
                                        lineWidth: 1
                                    )
                            )
                    )
                }
            }
        }
        .padding(.horizontal, 16)
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    // MARK: - Camera Area

    private var cameraArea: some View {
        ZStack {
            // Camera preview
            CameraPreviewView(session: vm.cameraManager.session)
                .clipShape(RoundedRectangle(cornerRadius: 20))

            // Skeleton overlay
            if vm.isStreaming && !vm.bodyPoints.isEmpty {
                SkeletonOverlay(
                    points: vm.bodyPoints,
                    isMirrored: vm.cameraManager.usingFrontCamera
                )
            }

            // Coaching tip overlay
            if vm.isStreaming && !vm.coachingTip.isEmpty {
                VStack {
                    Text(vm.coachingTip)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.black.opacity(0.7))
                        )
                        .padding(.top, 12)

                    Spacer()
                }
            }

            // Camera flip button
            if vm.isStreaming {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button { vm.flipCamera() } label: {
                            Image(systemName: "camera.rotate")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(12)
                                .background(
                                    Circle().fill(Color.black.opacity(0.6))
                                )
                        }
                        .padding(12)
                    }
                }
            }

            // Start camera overlay
            if !vm.isStreaming {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.black.opacity(0.6))

                    VStack(spacing: 16) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.ironRedLight)

                        Text("AI FORM COACH")
                            .font(.system(size: 18, weight: .black))
                            .foregroundColor(.white)

                        Text("Analyzes your movement in real-time")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)

                        // Free tier counter
                        if !premiumVM.isPremium {
                            Text("\(max(0, FormCorrectionViewModel.freeSessionsPerDay - vm.sessionsUsedToday)) sessions left today")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(hex: "#eab308"))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    Capsule()
                                        .fill(Color(hex: "#eab308").opacity(0.1))
                                        .overlay(
                                            Capsule().stroke(Color(hex: "#eab308").opacity(0.3), lineWidth: 1)
                                        )
                                )
                        }

                        Button {
                            Task {
                                let allowed = await vm.checkSessionGate(isPremium: premiumVM.isPremium)
                                if allowed {
                                    vm.startCamera()
                                }
                            }
                        } label: {
                            HStack(spacing: 8) {
                                if vm.gateLoading {
                                    ProgressView()
                                        .tint(.white)
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "video.fill")
                                        .font(.system(size: 14))
                                }
                                Text("START CAMERA")
                                    .font(.system(size: 14, weight: .black))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.ironRed, Color.ironRedDark],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                            .shadow(color: Color.ironRed.opacity(0.4), radius: 15)
                        }
                        .disabled(vm.gateLoading)
                    }
                }
            }
        }
        .aspectRatio(3/4, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal, 16)
    }

    // MARK: - Feedback Cards

    private var feedbackCards: some View {
        HStack(spacing: 8) {
            ForEach(vm.feedback) { item in
                VStack(spacing: 6) {
                    if item.passed == nil {
                        Circle()
                            .strokeBorder(Color.gray.opacity(0.4), lineWidth: 2)
                            .frame(width: 22, height: 22)
                    } else if item.passed == true {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.green)
                    } else {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.ironRedLight)
                    }

                    Text(item.label)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(feedbackLabelColor(item.passed))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(feedbackBackgroundColor(item.passed))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(feedbackBorderColor(item.passed), lineWidth: 1)
                        )
                )
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Control Buttons

    private var controlButtons: some View {
        HStack(spacing: 12) {
            Button {
                vm.stopCamera()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "video.slash.fill")
                        .font(.system(size: 14))
                    Text("Stop")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.ironRed.opacity(0.8))
                )
            }

            Button {
                vm.stopCamera()
                onComplete?()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                    Text("Done (\(vm.repCount) reps)")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed, Color.ironRedDark],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Color Helpers

    private var scoreDisplayColor: Color {
        vm.formScore >= 80 ? .green : vm.formScore >= 50 ? .yellow : .ironRedLight
    }

    private var scoreBackgroundColor: Color {
        vm.formScore >= 80 ? .green : vm.formScore >= 50 ? .yellow : .ironRedLight
    }

    private func feedbackLabelColor(_ passed: Bool?) -> Color {
        if passed == nil { return .gray }
        return passed! ? .green : .ironRedLight
    }

    private func feedbackBackgroundColor(_ passed: Bool?) -> Color {
        if passed == nil { return Color.white.opacity(0.04) }
        return passed! ? Color.green.opacity(0.08) : Color.ironRedLight.opacity(0.08)
    }

    private func feedbackBorderColor(_ passed: Bool?) -> Color {
        if passed == nil { return Color.white.opacity(0.08) }
        return passed! ? Color.green.opacity(0.3) : Color.ironRedLight.opacity(0.3)
    }
}

// MARK: - Camera Preview (AVCaptureSession → SwiftUI)

struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> CameraPreviewUIView {
        let view = CameraPreviewUIView()
        view.session = session
        return view
    }

    func updateUIView(_ uiView: CameraPreviewUIView, context: Context) {}
}

final class CameraPreviewUIView: UIView {
    var session: AVCaptureSession? {
        didSet {
            guard let session else { return }
            previewLayer.session = session
            previewLayer.videoGravity = .resizeAspectFill
        }
    }

    private var previewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }

    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer.frame = bounds
    }
}

// MARK: - Skeleton Overlay (mirrors for front camera)

struct SkeletonOverlay: View {
    let points: [VNHumanBodyPoseObservation.JointName: CGPoint]
    let isMirrored: Bool

    /// Bone connections matching FormCoach.jsx skeleton
    private let connections: [(VNHumanBodyPoseObservation.JointName, VNHumanBodyPoseObservation.JointName)] = [
        (.leftShoulder, .rightShoulder),
        (.leftShoulder, .leftElbow), (.leftElbow, .leftWrist),
        (.rightShoulder, .rightElbow), (.rightElbow, .rightWrist),
        (.leftShoulder, .leftHip), (.rightShoulder, .rightHip),
        (.leftHip, .rightHip),
        (.leftHip, .leftKnee), (.leftKnee, .leftAnkle),
        (.rightHip, .rightKnee), (.rightKnee, .rightAnkle),
    ]

    /// Apply mirroring to x coordinate for front camera
    private func screenPoint(_ p: CGPoint, in size: CGSize) -> CGPoint {
        let x = isMirrored ? (1.0 - p.x) : p.x
        return CGPoint(x: x * size.width, y: p.y * size.height)
    }

    var body: some View {
        GeometryReader { geo in
            Canvas { context, size in
                // Draw connections (bones)
                for (a, b) in connections {
                    guard let pA = points[a], let pB = points[b] else { continue }
                    let ptA = screenPoint(pA, in: size)
                    let ptB = screenPoint(pB, in: size)

                    var path = Path()
                    path.move(to: ptA)
                    path.addLine(to: ptB)
                    context.stroke(path, with: .color(.ironRed), lineWidth: 3)
                }

                // Draw joints (keypoints)
                for (_, point) in points {
                    let pt = screenPoint(point, in: size)
                    let circle = Path(ellipseIn: CGRect(x: pt.x - 5, y: pt.y - 5, width: 10, height: 10))

                    context.fill(circle, with: .color(.green))
                    context.stroke(circle, with: .color(.white), lineWidth: 1.5)
                }
            }
        }
    }
}

// MARK: - Rep Summary Sheet

struct RepSummarySheet: View {
    let repSummary: [FormCorrectionViewModel.RepRecord]
    let exercise: String
    let formScore: Int

    @Environment(\.dismiss) private var dismiss

    private var avgScore: Int {
        guard !repSummary.isEmpty else { return 0 }
        return repSummary.map(\.score).reduce(0, +) / repSummary.count
    }

    private var bestRep: FormCorrectionViewModel.RepRecord? {
        repSummary.max(by: { $0.score < $1.score })
    }

    private var worstRep: FormCorrectionViewModel.RepRecord? {
        repSummary.min(by: { $0.score < $1.score })
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 8) {
                        Text("SET COMPLETE")
                            .font(.system(size: 12, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .tracking(2)

                        Text(exercise.uppercased())
                            .font(.system(size: 28, weight: .black))
                            .italic()
                            .foregroundColor(.white)
                    }
                    .padding(.top, 8)

                    // Stats row
                    HStack(spacing: 0) {
                        statBox(value: "\(repSummary.count)", label: "REPS", color: .white)
                        statBox(value: "\(avgScore)%", label: "AVG FORM", color: scoreColor(avgScore))
                        if let best = bestRep {
                            statBox(value: "\(best.score)%", label: "BEST REP", color: .green)
                        }
                    }
                    .padding(.horizontal, 16)

                    // Per-rep breakdown
                    VStack(alignment: .leading, spacing: 8) {
                        Text("REP BREAKDOWN")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.gray)
                            .tracking(1.5)
                            .padding(.horizontal, 16)

                        ForEach(repSummary) { rep in
                            repRow(rep)
                        }
                    }

                    // Done button
                    Button { dismiss() } label: {
                        Text("DONE")
                            .font(.system(size: 14, weight: .black))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.ironRed, Color.ironRedDark],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
            }
        }
    }

    private func statBox(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 28, weight: .black))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(.gray)
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    private func repRow(_ rep: FormCorrectionViewModel.RepRecord) -> some View {
        HStack(spacing: 12) {
            // Rep number
            Text("#\(rep.id)")
                .font(.system(size: 14, weight: .black))
                .foregroundColor(.white)
                .frame(width: 36)

            // Score bar
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.white.opacity(0.06))
                    .frame(height: 24)

                GeometryReader { geo in
                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: rep.score >= 80
                                    ? [Color.green.opacity(0.6), Color.green.opacity(0.3)]
                                    : rep.score >= 50
                                        ? [Color.yellow.opacity(0.6), Color.yellow.opacity(0.3)]
                                        : [Color.ironRedLight.opacity(0.6), Color.ironRedLight.opacity(0.3)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * CGFloat(rep.score) / 100, height: 24)
                }
                .frame(height: 24)
            }

            // Score value
            Text("\(rep.score)%")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(scoreColor(rep.score))
                .frame(width: 44, alignment: .trailing)

            // Checkpoint icons
            HStack(spacing: 3) {
                ForEach(rep.checkpoints) { cp in
                    if cp.passed == true {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.green)
                    } else if cp.passed == false {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.ironRedLight)
                    } else {
                        Circle()
                            .strokeBorder(Color.gray.opacity(0.3), lineWidth: 1)
                            .frame(width: 12, height: 12)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    private func scoreColor(_ score: Int) -> Color {
        score >= 80 ? .green : score >= 50 ? .yellow : .ironRedLight
    }
}
