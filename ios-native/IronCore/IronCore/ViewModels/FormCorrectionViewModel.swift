import Foundation
import AVFoundation
import Vision
import CoreMedia
import UIKit
import FirebaseFirestore
import FirebaseAuth

/// AI Form Correction — THE core feature that justifies the subscription.
/// Real-time pose detection via Apple Vision VNDetectHumanBodyPoseRequest,
/// form evaluation (joint angle checking), rep counting, and coaching feedback.
/// Mirrors FormCoach.jsx from React prototype — same exercises, checkpoints, logic.
@MainActor
final class FormCorrectionViewModel: ObservableObject {

    // MARK: - Exercise Database (matches EXERCISES in FormCoach.jsx)

    struct ExerciseConfig: Identifiable {
        let id: String
        let name: String
        let icon: String // SF Symbol
        let checkpoints: [Checkpoint]
        let repDetect: RepDetectConfig?
        /// Per-checkpoint specific coaching cues for when a check fails
        let cues: [String: String]
    }

    struct Checkpoint: Identifiable {
        let id: String
        let label: String
        let desc: String
    }

    struct RepDetectConfig {
        let joint: VNHumanBodyPoseObservation.JointName
        let direction: RepDirection
    }

    enum RepDirection {
        case down // squat, pushup, lunge, bench: joint goes down then up = 1 rep
        case up   // shoulder press, deadlift, curl, lateral raise: joint goes up then down = 1 rep
    }

    static let exercises: [ExerciseConfig] = [
        ExerciseConfig(
            id: "squat",
            name: "Squat",
            icon: "figure.strengthtraining.traditional",
            checkpoints: [
                Checkpoint(id: "depth", label: "Depth", desc: "Hips below knees"),
                Checkpoint(id: "knees", label: "Knee Track", desc: "Over toes, not caving"),
                Checkpoint(id: "back", label: "Back", desc: "Neutral spine, chest up"),
            ],
            repDetect: RepDetectConfig(joint: .leftHip, direction: .down),
            cues: [
                "depth": "Go deeper — hips need to break parallel",
                "knees": "Knees caving in — push them out over your toes",
                "back": "Back too rounded — chest up, brace your core",
            ]
        ),
        ExerciseConfig(
            id: "pushup",
            name: "Push-Up",
            icon: "figure.core.training",
            checkpoints: [
                Checkpoint(id: "elbows", label: "Elbows", desc: "45 degree angle"),
                Checkpoint(id: "hips", label: "Hip Line", desc: "Straight body"),
                Checkpoint(id: "depth", label: "ROM", desc: "Chest near floor"),
            ],
            repDetect: RepDetectConfig(joint: .leftShoulder, direction: .down),
            cues: [
                "elbows": "Elbows flaring out — tuck them to 45 degrees",
                "hips": "Hips sagging — squeeze glutes, straight line head to heels",
                "depth": "Not deep enough — chest should nearly touch the floor",
            ]
        ),
        ExerciseConfig(
            id: "deadlift",
            name: "Deadlift",
            icon: "figure.strengthtraining.functional",
            checkpoints: [
                Checkpoint(id: "spine", label: "Spine", desc: "Neutral back"),
                Checkpoint(id: "hinge", label: "Hip Hinge", desc: "Push hips back"),
                Checkpoint(id: "lockout", label: "Lockout", desc: "Full extension"),
            ],
            repDetect: RepDetectConfig(joint: .leftHip, direction: .up),
            cues: [
                "spine": "Back rounding — keep chest proud, lats tight",
                "hinge": "Push hips back more — hinge, don't squat",
                "lockout": "Drive hips through — squeeze glutes at the top",
            ]
        ),
        ExerciseConfig(
            id: "lunge",
            name: "Lunge",
            icon: "figure.walk",
            checkpoints: [
                Checkpoint(id: "front_knee", label: "Front Knee", desc: "90 degree angle"),
                Checkpoint(id: "torso", label: "Torso", desc: "Upright posture"),
                Checkpoint(id: "back_knee", label: "Back Knee", desc: "Near floor"),
            ],
            repDetect: RepDetectConfig(joint: .leftKnee, direction: .down),
            cues: [
                "front_knee": "Front knee past toes — step further out",
                "torso": "Leaning forward — stay upright, core tight",
                "back_knee": "Back knee not low enough — drop it closer to the floor",
            ]
        ),
        ExerciseConfig(
            id: "shoulder_press",
            name: "OHP",
            icon: "figure.handball",
            checkpoints: [
                Checkpoint(id: "path", label: "Bar Path", desc: "Straight up"),
                Checkpoint(id: "elbows", label: "Elbows", desc: "Under wrists"),
                Checkpoint(id: "lockout", label: "Lockout", desc: "Full extension"),
            ],
            repDetect: RepDetectConfig(joint: .leftWrist, direction: .up),
            cues: [
                "path": "Bar drifting forward — press straight up over your head",
                "elbows": "Elbows flaring — keep them directly under your wrists",
                "lockout": "Not locking out — fully extend arms at the top",
            ]
        ),
        ExerciseConfig(
            id: "plank",
            name: "Plank",
            icon: "figure.yoga",
            checkpoints: [
                Checkpoint(id: "hips", label: "Hip Line", desc: "Not sagging"),
                Checkpoint(id: "shoulders", label: "Shoulders", desc: "Over wrists"),
                Checkpoint(id: "head", label: "Head", desc: "Neutral neck"),
            ],
            repDetect: nil, // Timed, not reps
            cues: [
                "hips": "Hips sagging — squeeze glutes and brace abs",
                "shoulders": "Shoulders drifting — stack them over your wrists",
                "head": "Neck craning — look at a spot between your hands",
            ]
        ),
        ExerciseConfig(
            id: "bench_press",
            name: "Bench Press",
            icon: "figure.strengthtraining.traditional",
            checkpoints: [
                Checkpoint(id: "grip", label: "Grip Width", desc: "Slightly wider than shoulders"),
                Checkpoint(id: "bar_path", label: "Bar Path", desc: "Midchest to lockout"),
                Checkpoint(id: "arch", label: "Back Arch", desc: "Slight arch, feet planted"),
            ],
            repDetect: RepDetectConfig(joint: .leftWrist, direction: .down),
            cues: [
                "grip": "Grip too narrow/wide — hands just outside shoulders",
                "bar_path": "Bar drifting — touch midchest, press to lockout",
                "arch": "No arch — slight back arch, plant your feet flat",
            ]
        ),
        ExerciseConfig(
            id: "curl",
            name: "Bicep Curl",
            icon: "figure.arms.open",
            checkpoints: [
                Checkpoint(id: "elbows", label: "Elbows", desc: "Pinned to sides"),
                Checkpoint(id: "rom", label: "ROM", desc: "Full extension to contraction"),
                Checkpoint(id: "swing", label: "No Swing", desc: "Torso stays still"),
            ],
            repDetect: RepDetectConfig(joint: .leftWrist, direction: .up),
            cues: [
                "elbows": "Elbows drifting — pin them to your sides",
                "rom": "Partial rep — fully extend at bottom, squeeze at top",
                "swing": "Using momentum — keep torso still, isolate biceps",
            ]
        ),
        ExerciseConfig(
            id: "lateral_raise",
            name: "Lateral Raise",
            icon: "figure.wave",
            checkpoints: [
                Checkpoint(id: "height", label: "Height", desc: "Hands to shoulder level"),
                Checkpoint(id: "elbows", label: "Elbows", desc: "Slight bend maintained"),
                Checkpoint(id: "lean", label: "No Lean", desc: "Torso upright"),
            ],
            repDetect: RepDetectConfig(joint: .leftWrist, direction: .up),
            cues: [
                "height": "Raise higher — hands need to reach shoulder level",
                "elbows": "Arms too straight — maintain a slight elbow bend",
                "lean": "Leaning sideways — stay upright, control the weight",
            ]
        ),
    ]

    // MARK: - Published State

    @Published var selectedExercise: ExerciseConfig = exercises[0]
    @Published var showExercisePicker = false
    @Published var isStreaming = false

    // Feedback
    @Published var feedback: [FeedbackItem] = []
    @Published var repCount = 0
    @Published var formScore = 0
    @Published var coachingTip = ""

    // Detected body points for skeleton overlay (normalized 0-1)
    @Published var bodyPoints: [VNHumanBodyPoseObservation.JointName: CGPoint] = [:]

    // Rep-by-rep summary
    @Published var repSummary: [RepRecord] = []
    @Published var showSummary = false

    // Free tier gate (Firestore-backed)
    @Published var sessionsUsedToday = 0
    @Published var showPremiumGate = false
    @Published var gateLoading = false
    static let freeSessionsPerDay = 3

    // Camera
    let cameraManager = CameraManager()

    struct FeedbackItem: Identifiable {
        let id: String
        let label: String
        let desc: String
        let passed: Bool? // nil = no data, true = good, false = bad
    }

    struct RepRecord: Identifiable {
        let id: Int // rep number
        let score: Int // snapshot of instantaneous score at rep completion
        let checkpoints: [FeedbackItem]
        let timestamp: Date
    }

    // MARK: - Internal State

    private let minConfidence: Float = 0.35
    private let targetFPS: Double = 15
    private var lastInferenceTime: CFAbsoluteTime = 0

    // Rep counting state
    private var repPhase: String = "up"
    private var lastY: CGFloat = 0
    private let repThreshold: CGFloat = 0.06 // normalized coordinates (0-1 range)
    private var repCooldown = false

    // Per-rep instant score (snapshot at moment of rep completion, not rolling avg)
    private var instantScore: Int = 0

    // Score history (rolling average for display)
    private var scoreHistory: [Int] = []
    private var feedbackCount = 0

    // Vision request
    private let poseRequest = VNDetectHumanBodyPoseRequest()

    // Firestore
    private let db = Firestore.firestore()

    // MARK: - Free Tier Gate (Firestore-backed)

    /// Check Firestore users/{uid}.formChecksToday against limit.
    /// Premium users bypass. Free users get 3/day.
    func checkSessionGate(isPremium: Bool) async -> Bool {
        if isPremium { return true }

        guard let uid = Auth.auth().currentUser?.uid else { return false }

        gateLoading = true
        defer { gateLoading = false }

        do {
            let doc = try await db.collection("users").document(uid).getDocument()
            let data = doc.data() ?? [:]

            let lastDate = (data["formCheckDate"] as? String) ?? ""
            let todayStr = Self.todayString()
            let count: Int

            if lastDate == todayStr {
                count = (data["formChecksToday"] as? Int) ?? 0
            } else {
                count = 0
            }

            sessionsUsedToday = count

            if count >= Self.freeSessionsPerDay {
                showPremiumGate = true
                return false
            }
            return true
        } catch {
            print("[FormCorrection] Gate check error: \(error)")
            // Fail open — allow session if Firestore unreachable
            return true
        }
    }

    /// Increment formChecksToday in Firestore after session starts.
    /// Uses the already-incremented sessionsUsedToday (bumped in startCamera before this call).
    private func incrementFirestoreSessionCount() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let todayStr = Self.todayString()
        let newCount = sessionsUsedToday // Already incremented by startCamera()

        Task {
            do {
                try await db.collection("users").document(uid).setData([
                    "formChecksToday": newCount,
                    "formCheckDate": todayStr,
                ], merge: true)
            } catch {
                print("[FormCorrection] Increment error: \(error)")
            }
        }
    }

    private static func todayString() -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: Date())
    }

    // MARK: - Start / Stop Camera

    @Published var showCameraDenied = false

    func startCamera() {
        cameraManager.onFrame = { [weak self] buffer in
            self?.processFrame(buffer)
        }

        // Check permission before starting — avoid silent failure
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            beginSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.beginSession()
                    } else {
                        self?.showCameraDenied = true
                    }
                }
            }
        case .denied, .restricted:
            showCameraDenied = true
        @unknown default:
            beginSession()
        }
    }

    /// Starts the camera session, increments usage count, and resets tracking state.
    /// Called only after camera permission is confirmed.
    private func beginSession() {
        cameraManager.start()

        // Increment session count
        sessionsUsedToday += 1
        incrementFirestoreSessionCount()

        // Reset state
        repCount = 0
        formScore = 0
        instantScore = 0
        feedback = []
        scoreHistory = []
        repSummary = []
        showSummary = false
        repPhase = "up"
        lastY = 0
        repCooldown = false
        feedbackCount = 0
        coachingTip = "Position yourself so your full body is visible"
        isStreaming = true
    }

    func stopCamera() {
        cameraManager.stop()
        cameraManager.onFrame = nil
        isStreaming = false
        if repCount > 0 {
            showSummary = true
        }
    }

    func flipCamera() {
        cameraManager.flipCamera()
    }

    func selectExercise(_ exercise: ExerciseConfig) {
        selectedExercise = exercise
        showExercisePicker = false
        repCount = 0
        formScore = 0
        instantScore = 0
        scoreHistory = []
        feedback = []
        repSummary = []
        repPhase = "up"
        lastY = 0
        repCooldown = false
        feedbackCount = 0
    }

    // MARK: - Frame Processing (called on camera output queue)

    private func processFrame(_ sampleBuffer: CMSampleBuffer) {
        // Throttle to target FPS
        let now = CFAbsoluteTimeGetCurrent()
        guard now - lastInferenceTime >= (1.0 / targetFPS) else { return }
        lastInferenceTime = now

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])

        do {
            try handler.perform([poseRequest])
            guard let observation = poseRequest.results?.first else { return }

            let allPoints = try observation.recognizedPoints(.all)

            // Update body points for skeleton overlay + run form checks
            Task { @MainActor [weak self] in
                guard let self else { return }

                // Convert to CGPoint dict for skeleton drawing
                var points: [VNHumanBodyPoseObservation.JointName: CGPoint] = [:]
                for (key, point) in allPoints where point.confidence >= self.minConfidence {
                    // Vision coordinates: origin bottom-left, y goes up
                    // Convert to UIKit: origin top-left, y goes down
                    points[key] = CGPoint(x: point.location.x, y: 1 - point.location.y)
                }
                self.bodyPoints = points

                // Evaluate form
                self.evaluateForm(points: points)

                // Rep counting
                self.detectRep(points: points)
            }
        } catch {
            // Silently skip failed frames
        }
    }

    // MARK: - Form Evaluation (matches evaluateForm in FormCoach.jsx)

    private func evaluateForm(points: [VNHumanBodyPoseObservation.JointName: CGPoint]) {
        let results: [FeedbackItem]

        switch selectedExercise.id {
        case "squat":
            results = evaluateSquat(points)
        case "pushup":
            results = evaluatePushup(points)
        case "deadlift":
            results = evaluateDeadlift(points)
        case "lunge":
            results = evaluateLunge(points)
        case "shoulder_press":
            results = evaluateShoulderPress(points)
        case "plank":
            results = evaluatePlank(points)
        case "bench_press":
            results = evaluateBenchPress(points)
        case "curl":
            results = evaluateCurl(points)
        case "lateral_raise":
            results = evaluateLateralRaise(points)
        default:
            return
        }

        feedback = results

        // Score: only count checks with valid data
        let valid = results.filter { $0.passed != nil }
        let passed = valid.filter { $0.passed == true }.count
        let score = valid.isEmpty ? 0 : Int(Double(passed) / Double(valid.count) * 100)

        // Store instantaneous score for per-rep snapshot
        instantScore = score

        scoreHistory.append(score)
        if scoreHistory.count > 30 { scoreHistory.removeFirst() }
        let avg = scoreHistory.isEmpty ? 0 : scoreHistory.reduce(0, +) / scoreHistory.count
        formScore = avg

        // Coaching tips — specific cues per exercise (throttled every 60 frames)
        feedbackCount += 1
        if feedbackCount % 60 == 0 {
            if let failing = results.first(where: { $0.passed == false }) {
                // Use exercise-specific cue if available
                if let cue = selectedExercise.cues[failing.id] {
                    coachingTip = cue
                } else {
                    coachingTip = "Focus on: \(failing.desc)"
                }
            } else if avg >= 90 {
                coachingTip = "Great form! Keep it up"
            } else if avg >= 70 {
                coachingTip = "Good — stay tight and controlled"
            }
        }
    }

    // MARK: - Exercise-Specific Evaluations

    private func evaluateSquat(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let lhip = p[.leftHip]
        let rhip = p[.rightHip]
        let lknee = p[.leftKnee]
        let rknee = p[.rightKnee]
        let lankle = p[.leftAnkle]
        let rankle = p[.rightAnkle]
        let lshoulder = p[.leftShoulder]

        // Depth: hip below knee (in screen coords, higher y = lower on screen)
        let hipY = lhip?.y ?? rhip?.y
        let kneeY = lknee?.y ?? rknee?.y
        let depthOk: Bool? = (hipY != nil && kneeY != nil) ? hipY! >= kneeY! - 0.04 : nil

        // Knee tracking
        let kneeX = lknee?.x ?? rknee?.x
        let ankleX = lankle?.x ?? rankle?.x
        let kneeOk: Bool? = (kneeX != nil && ankleX != nil) ? abs(kneeX! - ankleX!) < 0.1 : nil

        // Back angle
        let hip = lhip ?? rhip
        let knee = lknee ?? rknee
        let backAngle = angle(lshoulder, hip, knee)
        let backOk: Bool? = backAngle != nil ? backAngle! >= 55 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: depthOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: kneeOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: backOk),
        ]
    }

    private func evaluatePushup(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let le = p[.leftElbow]
        let lw = p[.leftWrist]
        let lh = p[.leftHip]
        let la = p[.leftAnkle]

        // Elbow angle
        let elbowAngle = angle(ls, le, lw)
        let elbowOk: Bool? = elbowAngle != nil ? (elbowAngle! >= 40 && elbowAngle! <= 130) : nil

        // Hip alignment (straight body)
        let bodyAngle = angle(ls, lh, la)
        let hipOk: Bool? = bodyAngle != nil ? bodyAngle! >= 145 : nil

        // Depth
        let depthOk: Bool? = (ls != nil && le != nil) ? ls!.y >= le!.y - 0.04 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: elbowOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: hipOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: depthOk),
        ]
    }

    private func evaluateDeadlift(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let lh = p[.leftHip]
        let lk = p[.leftKnee]

        // Neutral spine
        let spineAngle = angle(ls, lh, lk)
        let spineOk: Bool? = spineAngle != nil ? spineAngle! >= 140 : nil

        // Hip hinge: hip should push back
        let hingeOk: Bool? = (lh != nil && lk != nil) ? lh!.x < lk!.x + 0.05 : nil

        // Lockout
        let lockoutAngle = angle(ls, lh, lk)
        let lockoutOk: Bool? = lockoutAngle != nil ? lockoutAngle! >= 155 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: spineOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: hingeOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: lockoutOk),
        ]
    }

    private func evaluateLunge(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let lk = p[.leftKnee]
        let lh = p[.leftHip]
        let la = p[.leftAnkle]
        let ls = p[.leftShoulder]
        let rk = p[.rightKnee]

        // Front knee ~90 degrees
        let kneeAngle = angle(lh, lk, la)
        let kneeOk: Bool? = kneeAngle != nil ? (kneeAngle! >= 70 && kneeAngle! <= 110) : nil

        // Upright torso
        let torsoOk: Bool? = (ls != nil && lh != nil) ? abs(ls!.x - lh!.x) < 0.07 : nil

        // Back knee near ground
        let backKneeOk: Bool? = (rk != nil && lk != nil) ? rk!.y > lk!.y - 0.03 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: kneeOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: torsoOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: backKneeOk),
        ]
    }

    private func evaluateShoulderPress(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let le = p[.leftElbow]
        let lw = p[.leftWrist]

        // Straight bar path: wrist above shoulder
        let pathOk: Bool? = (lw != nil && ls != nil) ? abs(lw!.x - ls!.x) < 0.07 : nil

        // Elbows under wrists
        let elbowOk: Bool? = (le != nil && lw != nil) ? abs(le!.x - lw!.x) < 0.06 : nil

        // Lockout: full arm extension
        let pressAngle = angle(ls, le, lw)
        let lockoutOk: Bool? = pressAngle != nil ? pressAngle! >= 150 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: pathOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: elbowOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: lockoutOk),
        ]
    }

    private func evaluatePlank(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let lh = p[.leftHip]
        let la = p[.leftAnkle]
        let lw = p[.leftWrist]
        let nose = p[.nose]

        // Hip line
        let bodyAngle = angle(ls, lh, la)
        let hipOk: Bool? = bodyAngle != nil ? bodyAngle! >= 150 : nil

        // Shoulders over wrists
        let shoulderOk: Bool? = (ls != nil && lw != nil) ? abs(ls!.x - lw!.x) < 0.08 : nil

        // Neutral head
        let headOk: Bool? = (nose != nil && ls != nil) ? abs(nose!.y - ls!.y) < 0.1 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: hipOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: shoulderOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: headOk),
        ]
    }

    private func evaluateBenchPress(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let rs = p[.rightShoulder]
        let lw = p[.leftWrist]
        let rw = p[.rightWrist]
        let lh = p[.leftHip]

        // Grip width: wrists wider than shoulders
        let gripOk: Bool? = (lw != nil && rw != nil && ls != nil && rs != nil)
            ? abs(lw!.x - rw!.x) > abs(ls!.x - rs!.x) : nil

        // Bar path: wrists roughly above midchest (between shoulder and hip y)
        let midY: CGFloat? = (ls != nil && lh != nil) ? (ls!.y + lh!.y) / 2.0 : nil
        let barPathOk: Bool? = (lw != nil && midY != nil) ? abs(lw!.y - midY!) < 0.12 : nil

        // Back arch: slight arch — shoulder higher than hip in lying position
        let archOk: Bool? = (ls != nil && lh != nil) ? abs(ls!.y - lh!.y) < 0.15 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: gripOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: barPathOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: archOk),
        ]
    }

    private func evaluateCurl(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let le = p[.leftElbow]
        let lw = p[.leftWrist]
        let lh = p[.leftHip]

        // Elbows pinned to sides: elbow x close to hip x
        let elbowOk: Bool? = (le != nil && lh != nil) ? abs(le!.x - lh!.x) < 0.06 : nil

        // ROM: full curl = wrist near shoulder at top
        let curlAngle = angle(ls, le, lw)
        let romOk: Bool? = curlAngle != nil ? (curlAngle! <= 140) : nil

        // No swing: torso stays vertical (shoulder x near hip x)
        let swingOk: Bool? = (ls != nil && lh != nil) ? abs(ls!.x - lh!.x) < 0.06 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: elbowOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: romOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: swingOk),
        ]
    }

    private func evaluateLateralRaise(_ p: [VNHumanBodyPoseObservation.JointName: CGPoint]) -> [FeedbackItem] {
        let ls = p[.leftShoulder]
        let le = p[.leftElbow]
        let lw = p[.leftWrist]
        let lh = p[.leftHip]

        // Height: wrist at or above shoulder level
        let heightOk: Bool? = (lw != nil && ls != nil) ? lw!.y <= ls!.y + 0.04 : nil

        // Slight elbow bend maintained
        let elbowAngle = angle(ls, le, lw)
        let elbowOk: Bool? = elbowAngle != nil ? (elbowAngle! >= 140 && elbowAngle! <= 180) : nil

        // No lean: torso upright (shoulder x near hip x)
        let leanOk: Bool? = (ls != nil && lh != nil) ? abs(ls!.x - lh!.x) < 0.06 : nil

        let cps = selectedExercise.checkpoints
        return [
            FeedbackItem(id: cps[0].id, label: cps[0].label, desc: cps[0].desc, passed: heightOk),
            FeedbackItem(id: cps[1].id, label: cps[1].label, desc: cps[1].desc, passed: elbowOk),
            FeedbackItem(id: cps[2].id, label: cps[2].label, desc: cps[2].desc, passed: leanOk),
        ]
    }

    // MARK: - Rep Counter (matches detectRep in FormCoach.jsx)

    private func detectRep(points: [VNHumanBodyPoseObservation.JointName: CGPoint]) {
        guard let config = selectedExercise.repDetect else { return } // Plank = no reps
        guard let joint = points[config.joint] else { return }

        let y = joint.y
        let delta = y - lastY

        guard !repCooldown else {
            lastY = y
            return
        }

        if config.direction == .down {
            // Squat/lunge/pushup/bench: goes down then comes back up
            if repPhase == "up" && delta > repThreshold {
                repPhase = "down"
            } else if repPhase == "down" && delta < -repThreshold {
                repPhase = "up"
                completeRep()
            }
        } else {
            // Shoulder press/deadlift/curl/lateral raise: goes up then comes back down
            if repPhase == "up" && delta < -repThreshold {
                repPhase = "down"
            } else if repPhase == "down" && delta > repThreshold {
                repPhase = "up"
                completeRep()
            }
        }

        lastY = y
    }

    /// Called when a rep is completed — records snapshot and triggers haptic
    private func completeRep() {
        repCooldown = true
        repCount += 1
        recordRep()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 500_000_000)
            self.repCooldown = false
        }
    }

    /// Snapshot current feedback + instantaneous score into a per-rep record
    private func recordRep() {
        let record = RepRecord(
            id: repCount,
            score: instantScore, // per-rep instant score, not rolling avg
            checkpoints: feedback,
            timestamp: Date()
        )
        repSummary.append(record)
    }

    // MARK: - Geometry Helpers

    /// Calculate angle (degrees) at point b between rays ba and bc
    private func angle(_ a: CGPoint?, _ b: CGPoint?, _ c: CGPoint?) -> Double? {
        guard let a, let b, let c else { return nil }
        let ab = CGVector(dx: a.x - b.x, dy: a.y - b.y)
        let cb = CGVector(dx: c.x - b.x, dy: c.y - b.y)
        let dot = ab.dx * cb.dx + ab.dy * cb.dy
        let magAB = sqrt(ab.dx * ab.dx + ab.dy * ab.dy)
        let magCB = sqrt(cb.dx * cb.dx + cb.dy * cb.dy)
        let mag = magAB * magCB
        guard mag > 0 else { return nil }
        let cosAngle = max(-1, min(1, dot / mag))
        return acos(cosAngle) * 180 / .pi
    }
}
