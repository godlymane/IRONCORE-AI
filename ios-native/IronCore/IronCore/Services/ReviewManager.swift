import Foundation
import StoreKit

/// Manages App Store review prompts using SKStoreReviewController.
/// Triggers after 3+ completed workouts AND last form score > 70%.
/// Apple rate-limits actual display to ~3 times per 365-day period.
@MainActor
final class ReviewManager {
    static let shared = ReviewManager()

    private let workoutCountKey = "reviewManager_workoutCount"
    private let lastFormScoreKey = "reviewManager_lastFormScore"
    private let lastReviewRequestKey = "reviewManager_lastReviewRequest"

    private static let requiredWorkouts = 3
    private static let requiredFormScore = 70.0
    // Don't ask more than once per 90 days (client-side guard; Apple also rate-limits)
    private static let minimumDaysBetweenRequests = 90

    private init() {}

    // MARK: - Track Events

    /// Call after a workout is completed and saved.
    func recordCompletedWorkout(formScore: Double? = nil) {
        let count = UserDefaults.standard.integer(forKey: workoutCountKey) + 1
        UserDefaults.standard.set(count, forKey: workoutCountKey)

        if let score = formScore {
            UserDefaults.standard.set(score, forKey: lastFormScoreKey)
        }

        evaluateAndRequestReview()
    }

    /// Update form score independently (e.g. from AI form correction session).
    func updateLastFormScore(_ score: Double) {
        UserDefaults.standard.set(score, forKey: lastFormScoreKey)
    }

    // MARK: - Evaluation

    private func evaluateAndRequestReview() {
        let workoutCount = UserDefaults.standard.integer(forKey: workoutCountKey)
        let lastFormScore = UserDefaults.standard.double(forKey: lastFormScoreKey)

        guard workoutCount >= Self.requiredWorkouts else { return }
        guard lastFormScore > Self.requiredFormScore else { return }
        guard !hasRequestedRecently() else { return }

        requestReview()
    }

    private func hasRequestedRecently() -> Bool {
        let lastRequest = UserDefaults.standard.double(forKey: lastReviewRequestKey)
        guard lastRequest > 0 else { return false }

        let lastDate = Date(timeIntervalSince1970: lastRequest)
        let daysSince = Calendar.current.dateComponents([.day], from: lastDate, to: Date()).day ?? 0
        return daysSince < Self.minimumDaysBetweenRequests
    }

    private func requestReview() {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: lastReviewRequestKey)

        guard let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
            return
        }
        SKStoreReviewController.requestReview(in: scene)
        print("[ReviewManager] Review requested — workouts: \(UserDefaults.standard.integer(forKey: workoutCountKey)), formScore: \(UserDefaults.standard.double(forKey: lastFormScoreKey))")
    }

    // MARK: - Reset (for testing)

    #if DEBUG
    func reset() {
        UserDefaults.standard.removeObject(forKey: workoutCountKey)
        UserDefaults.standard.removeObject(forKey: lastFormScoreKey)
        UserDefaults.standard.removeObject(forKey: lastReviewRequestKey)
    }
    #endif
}
