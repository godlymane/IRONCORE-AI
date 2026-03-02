import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Track screen data — mirrors TrackView.jsx from React prototype.
/// Fetches profile + progress history, computes BMI, FFMI, goal%.
/// Data: users/{uid}/data/profile (via AuthViewModel), users/{uid}/progress
@MainActor
final class TrackViewModel: ObservableObject {

    // MARK: - Published State

    @Published var progress: [ProgressEntry] = []
    @Published var dataLoaded = false

    // MARK: - Data Models

    struct ProgressEntry: Identifiable {
        let id: String
        let weight: Double
        let date: String
        let createdAt: Date?

        /// Day-of-month number extracted from ISO date string
        var dayNumber: Int {
            guard let parsed = Self.dateFormatter.date(from: date) else {
                return Calendar.current.component(.day, from: Date())
            }
            return Calendar.current.component(.day, from: parsed)
        }

        /// Formatted as "Mar 2026" etc.
        var shortDate: String {
            guard let parsed = Self.dateFormatter.date(from: date) else { return date }
            return Self.displayFormatter.string(from: parsed)
        }

        private static let dateFormatter: DateFormatter = {
            let f = DateFormatter()
            f.dateFormat = "yyyy-MM-dd"
            return f
        }()

        private static let displayFormatter: DateFormatter = {
            let f = DateFormatter()
            f.dateFormat = "MMM yyyy"
            return f
        }()
    }

    // MARK: - Private

    private let db = Firestore.firestore()
    private var progressListener: ListenerRegistration?

    // MARK: - Computed Properties (from profile)

    func currentWeight(from profile: UserProfile?) -> Double? {
        guard let w = profile?.weight, w > 0 else { return nil }
        return w
    }

    func currentHeight(from profile: UserProfile?) -> Double? {
        guard let h = profile?.height, h > 0 else { return nil }
        return h
    }

    func bodyFat(from profile: UserProfile?) -> Double? {
        guard let bf = profile?.bodyFat, bf > 0 else { return nil }
        return bf
    }

    func targetWeight(from profile: UserProfile?) -> Double? {
        guard let tw = profile?.targetWeight, tw > 0 else { return nil }
        return tw
    }

    func photoURL(from profile: UserProfile?) -> String? {
        // Firebase Auth photo URL comes from Auth user, not Firestore profile
        return Auth.auth().currentUser?.photoURL?.absoluteString
    }

    func gender(from profile: UserProfile?) -> String {
        guard let g = profile?.gender, !g.isEmpty else { return "Athlete" }
        return g.capitalized
    }

    func age(from profile: UserProfile?) -> String {
        guard let a = profile?.age, a > 0 else { return "?" }
        return "\(a)"
    }

    // MARK: - BMI Calculation (matches helpers.js calculateBMI)

    func bmi(from profile: UserProfile?) -> Double? {
        guard let weight = currentWeight(from: profile),
              let height = currentHeight(from: profile),
              height > 0 else { return nil }
        let heightM = height / 100.0
        return weight / (heightM * heightM)
    }

    func bmiString(from profile: UserProfile?) -> String {
        guard let value = bmi(from: profile) else { return "--" }
        return String(format: "%.1f", value)
    }

    // MARK: - FFMI Calculation (matches TrackView.jsx calculateFFMI)

    func ffmi(from profile: UserProfile?) -> Double? {
        guard let weight = currentWeight(from: profile),
              let height = currentHeight(from: profile),
              let fat = bodyFat(from: profile),
              height > 0 else { return nil }
        let heightM = height / 100.0
        let leanMass = weight * (1.0 - fat / 100.0)
        let value = (leanMass / (heightM * heightM)) + (6.1 * (1.8 - heightM))
        guard !value.isNaN && !value.isInfinite else { return nil }
        return value
    }

    func ffmiString(from profile: UserProfile?) -> String {
        guard let value = ffmi(from: profile) else { return "--" }
        return String(format: "%.1f", value)
    }

    // MARK: - Goal Progress (matches TrackView.jsx goalPercent calculation)
    /// Uses earliest recorded weight as starting point.
    /// goalPercent = 100 - ((currentDiff / totalDiff) * 100)

    func goalPercent(from profile: UserProfile?) -> Double {
        guard let target = targetWeight(from: profile),
              let current = currentWeight(from: profile) else { return 0 }

        // Find earliest progress entry with a weight
        let sorted = progress
            .sorted { ($0.date) < ($1.date) }
        let startWeight = sorted.first?.weight ?? current

        let totalDiff = abs(startWeight - target)
        let currentDiff = abs(current - target)
        guard totalDiff > 0 else { return 0 }

        let percent = 100.0 - ((currentDiff / totalDiff) * 100.0)
        return min(max(percent, 0), 100)
    }

    // MARK: - Sorted Progress (descending by date, latest first)

    var sortedProgress: [ProgressEntry] {
        progress.sorted { a, b in
            if let ca = a.createdAt, let cb = b.createdAt {
                return ca > cb
            }
            return a.date > b.date
        }
    }

    /// Show whether we have weight + height set (to conditionally show BMI/FFMI cards)
    func hasBodyMetrics(from profile: UserProfile?) -> Bool {
        return currentWeight(from: profile) != nil && currentHeight(from: profile) != nil
    }

    // MARK: - Data Loading

    func startListening(uid: String) {
        progressListener = db.collection("users").document(uid)
            .collection("progress")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self else { return }
                if let error {
                    print("[TrackVM] Progress listener error: \(error)")
                    return
                }
                Task { @MainActor in
                    self.progress = snapshot?.documents.compactMap { doc -> ProgressEntry? in
                        let data = doc.data()
                        guard let weight = data["weight"] as? Double else { return nil }
                        return ProgressEntry(
                            id: doc.documentID,
                            weight: weight,
                            date: data["date"] as? String ?? "",
                            createdAt: (data["createdAt"] as? Timestamp)?.dateValue()
                        )
                    } ?? []
                    self.dataLoaded = true
                }
            }
    }

    func stopListening() {
        progressListener?.remove()
        progressListener = nil
    }
}
