import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Cardio (Pulse Lab) data — mirrors CardioView.jsx from React prototype.
/// MET-based calorie calculation for treadmill, walking, and cycling.
@MainActor
final class CardioViewModel: ObservableObject {

    // MARK: - Activity Type

    enum ActivityType: String, CaseIterable, Identifiable {
        case treadmill
        case walking
        case cycling

        var id: String { rawValue }

        var displayName: String {
            rawValue.capitalized
        }

        var icon: String {
            switch self {
            case .treadmill: return "figure.run"
            case .walking: return "figure.walk"
            case .cycling: return "bicycle"
            }
        }
    }

    // MARK: - Cycling Intensity

    enum CyclingIntensity: String, CaseIterable, Identifiable {
        case low
        case moderate
        case high
        case extreme

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .low: return "Casual (Leisure)"
            case .moderate: return "Moderate (Commute)"
            case .high: return "High (Spin Class)"
            case .extreme: return "Extreme (Race)"
            }
        }

        var met: Double {
            switch self {
            case .low: return 4.0
            case .moderate: return 6.0
            case .high: return 8.5
            case .extreme: return 12.0
            }
        }
    }

    // MARK: - Walking Intensity

    enum WalkingIntensity: String, CaseIterable, Identifiable {
        case low
        case moderate
        case aggressive

        var id: String { rawValue }

        var displayName: String { rawValue.capitalized }

        var met: Double {
            switch self {
            case .low: return 2.5
            case .moderate: return 3.5
            case .aggressive: return 5.0
            }
        }
    }

    // MARK: - Published State

    @Published var activity: ActivityType = .treadmill

    // Treadmill
    @Published var tmSpeed: String = "8"
    @Published var tmIncline: String = "1"
    @Published var tmDuration: String = "30"

    // Walking
    @Published var walkSteps: String = "5000"
    @Published var walkIntensity: WalkingIntensity = .moderate

    // Cycling
    @Published var cycDuration: String = "45"
    @Published var cycIntensity: CyclingIntensity = .moderate

    // Result
    @Published var burn: Int? = nil
    @Published var isLogging: Bool = false
    @Published var logSuccess: Bool = false

    private let firestore = FirestoreService.shared

    // MARK: - Biometric Check

    func hasRequiredBiometrics(profile: UserProfile?, progress: [[String: Any]]) -> Bool {
        let weight = userWeight(profile: profile, progress: progress)
        let height = profile?.height
        return weight != nil && weight! > 0 && height != nil && height! > 0
    }

    func userWeight(profile: UserProfile?, progress: [[String: Any]]) -> Double? {
        if let w = profile?.weight, w > 0 { return w }
        // Fall back to most recent progress entry
        let sorted = progress.sorted { ts($0) > ts($1) }
        for entry in sorted {
            if let w = entry["weight"] as? Double, w > 0 { return w }
            if let w = entry["weight"] as? Int, w > 0 { return Double(w) }
        }
        return nil
    }

    func hasWeight(profile: UserProfile?, progress: [[String: Any]]) -> Bool {
        return (userWeight(profile: profile, progress: progress) ?? 0) > 0
    }

    func hasHeight(profile: UserProfile?) -> Bool {
        return (profile?.height ?? 0) > 0
    }

    private func ts(_ doc: [String: Any]) -> Double {
        if let t = doc["createdAt"] as? Timestamp { return t.dateValue().timeIntervalSince1970 }
        return 0
    }

    // MARK: - Switch Activity

    func switchActivity(_ newActivity: ActivityType) {
        activity = newActivity
        burn = nil
        logSuccess = false
    }

    // MARK: - Calculate

    func calculate(weight: Double) {
        var cals: Double = 0

        switch activity {
        case .treadmill:
            let speed = Double(tmSpeed) ?? 8
            let incline = Double(tmIncline) ?? 1
            let duration = Double(tmDuration) ?? 30
            let speedMmin = speed * 16.6667
            let grade = incline / 100
            let vo2 = (0.2 * speedMmin) + (0.9 * speedMmin * grade) + 3.5
            cals = (vo2 * weight / 200) * duration

        case .walking:
            let steps = Double(walkSteps) ?? 5000
            let met = walkIntensity.met
            let approxMins = steps / 100
            cals = (met * 3.5 * weight / 200) * approxMins

        case .cycling:
            let duration = Double(cycDuration) ?? 45
            let met = cycIntensity.met
            cals = (met * 3.5 * weight / 200) * duration
        }

        burn = Int(round(cals))
    }

    // MARK: - Recalculate

    func recalculate() {
        burn = nil
        logSuccess = false
    }

    // MARK: - Log Session

    func logSession(uid: String) async {
        guard let burnVal = burn, burnVal > 0 else { return }
        isLogging = true

        var details = ""
        var duration = 0

        switch activity {
        case .treadmill:
            let speed = tmSpeed.isEmpty ? "8" : tmSpeed
            let incline = tmIncline.isEmpty ? "1" : tmIncline
            details = "\(speed)km/h @ \(incline)% inc"
            duration = Int(Double(tmDuration) ?? 30)

        case .walking:
            let steps = walkSteps.isEmpty ? "5000" : walkSteps
            details = "\(steps) steps (\(walkIntensity.rawValue))"
            duration = Int((Double(walkSteps) ?? 5000) / 100)

        case .cycling:
            let dur = cycDuration.isEmpty ? "45" : cycDuration
            details = "\(dur)m (\(cycIntensity.rawValue))"
            duration = Int(Double(cycDuration) ?? 45)
        }

        do {
            try await firestore.addBurned(uid: uid, data: [
                "activityType": activity.rawValue.capitalized,
                "calories": burnVal,
                "details": details,
                "duration": duration
            ])
            logSuccess = true
            // Reset after short delay
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            burn = nil
            logSuccess = false
        } catch {
            print("[CardioVM] Log session error: \(error)")
        }

        isLogging = false
    }
}
