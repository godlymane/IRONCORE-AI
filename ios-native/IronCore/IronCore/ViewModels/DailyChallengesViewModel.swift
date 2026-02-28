import Foundation

/// Daily Challenges system — 3 daily quests that reset every 24h.
/// Mirrors DailyChallenges.jsx from React prototype.
/// Progress is computed from workout/meal/calorie data (no separate Firestore collection).
@MainActor
final class DailyChallengesViewModel: ObservableObject {

    // MARK: - Published State

    @Published var challenges: [DailyChallenge] = []
    @Published var claimedIds: Set<Int> = []

    // MARK: - Models

    struct DailyChallenge: Identifiable {
        let id: Int
        let title: String
        let icon: String
        let xpReward: Int
        let target: Int
        var current: Int = 0

        var isComplete: Bool { current >= target }
        var progress: Double { min(1.0, Double(current) / Double(max(1, target))) }
        var progressText: String { "\(min(current, target))/\(target)" }
    }

    // MARK: - Update Challenges

    func updateChallenges(
        todayWorkoutCount: Int,
        todayMealCount: Int,
        todayCaloriesBurned: Int
    ) {
        challenges = [
            DailyChallenge(
                id: 1,
                title: "Complete 3 Workouts",
                icon: "dumbbell.fill",
                xpReward: 150,
                target: 3,
                current: todayWorkoutCount
            ),
            DailyChallenge(
                id: 2,
                title: "Log 5 Meals",
                icon: "fork.knife",
                xpReward: 100,
                target: 5,
                current: todayMealCount
            ),
            DailyChallenge(
                id: 3,
                title: "Burn 500 Calories",
                icon: "flame.fill",
                xpReward: 200,
                target: 500,
                current: todayCaloriesBurned
            ),
        ]

        // Load claimed state for today
        let key = "daily_challenges_claimed_\(todayString())"
        if let saved = UserDefaults.standard.array(forKey: key) as? [Int] {
            claimedIds = Set(saved)
        } else {
            claimedIds = []
        }
    }

    // MARK: - Claim

    func claim(challengeId: Int) -> Int? {
        guard let challenge = challenges.first(where: { $0.id == challengeId }),
              challenge.isComplete,
              !claimedIds.contains(challengeId) else {
            return nil
        }

        claimedIds.insert(challengeId)

        // Persist for today
        let key = "daily_challenges_claimed_\(todayString())"
        UserDefaults.standard.set(Array(claimedIds), forKey: key)

        return challenge.xpReward
    }

    func isClaimed(_ id: Int) -> Bool {
        claimedIds.contains(id)
    }

    // MARK: - Reset Timer

    var timeUntilReset: String {
        let calendar = Calendar.current
        let now = Date()
        guard let midnight = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: now),
              let nextMidnight = calendar.date(byAdding: .day, value: 1, to: midnight) else {
            return "—"
        }
        let remaining = nextMidnight.timeIntervalSince(now)
        let hours = Int(remaining) / 3600
        let minutes = (Int(remaining) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    private func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}
