import Foundation
import FirebaseAuth
import FirebaseFirestore
import Combine

/// Engagement Economy ViewModel — manages streaks, daily rewards, power-ups, and XP multipliers.
/// Mirrors the engagement features from the React prototype (engagementService.js + engagementData.js).
/// Listens to the user profile in real-time for engagement field updates.
@MainActor
final class EngagementViewModel: ObservableObject {

    // MARK: - Published State

    // Streak
    @Published var currentStreak: Int = 0
    @Published var longestStreak: Int = 0
    @Published var streakShields: Int = 0
    @Published var isShieldActive: Bool = false
    @Published var shieldExpiresAt: Date? = nil
    @Published var streakAtRisk: Bool = false  // true if user hasn't worked out today and streak > 0
    @Published var lastWorkoutDate: String? = nil

    // XP & Multiplier
    @Published var xp: Int = 0
    @Published var baseMultiplier: Double = 1.0
    @Published var effectiveMultiplier: Double = 1.0
    @Published var streakMultiplierLabel: String? = nil

    // Daily Rewards
    @Published var dailyRewardDay: Int = 0         // current day index in the 30-day cycle
    @Published var canClaimDailyReward: Bool = false
    @Published var thisMonthClaims: Int = 0
    @Published var claimedDays: [String: Bool] = [:]
    @Published var nextReward: DailyReward? = nil
    @Published var lastClaimResult: ClaimResult? = nil

    // Power-Ups
    @Published var activePowerUps: [PowerUpItem] = []
    @Published var powerUpInventory: [PowerUpType: Int] = [
        .xpBoost: 0,
        .fireMode: 0,
        .streakFreeze: 0,
    ]

    // Loading & Errors
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    @Published var showRewardClaimed: Bool = false

    // Workout dates (for streak heatmap)
    @Published var workoutDates: [String] = []

    // MARK: - Models

    struct ClaimResult: Identifiable {
        let id = UUID()
        let reward: DailyReward
        let actualReward: RewardResult?
        let message: String
    }

    // MARK: - Private

    private let service = EngagementService.shared
    private var profileListener: ListenerRegistration?
    private var workoutListener: ListenerRegistration?
    private var powerUpTimerCancellable: AnyCancellable?
    private var rawProfile: [String: Any]? = nil

    // MARK: - Lifecycle

    func startListening() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        isLoading = true

        // Listen to profile for engagement data
        profileListener = service.listenToEngagementData(uid: uid) { [weak self] data in
            Task { @MainActor in
                self?.rawProfile = data
                self?.updateFromProfile(data)
                self?.isLoading = false
            }
        }

        // Listen to workouts for streak dates
        let db = Firestore.firestore()
        workoutListener = db.collection("users").document(uid)
            .collection("workouts")
            .order(by: "createdAt", descending: true)
            .limit(to: 365)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let docs = snapshot?.documents else { return }
                let dates = docs.compactMap { $0.data()["date"] as? String }
                Task { @MainActor in
                    self?.workoutDates = Array(Set(dates)).sorted()
                    // Recalculate streak when workout data changes
                    self?.recalculateStreakAtRisk()
                }
            }

        // Timer to refresh active power-up countdowns every second
        powerUpTimerCancellable = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.refreshActivePowerUps()
            }
    }

    func stopListening() {
        profileListener?.remove()
        profileListener = nil
        workoutListener?.remove()
        workoutListener = nil
        powerUpTimerCancellable?.cancel()
        powerUpTimerCancellable = nil
    }

    // MARK: - Profile Update Processing

    private func updateFromProfile(_ data: [String: Any]?) {
        guard let data = data else { return }

        // Streak
        currentStreak = data["currentStreak"] as? Int ?? 0
        longestStreak = data["longestStreak"] as? Int ?? 0
        streakShields = data["streakShields"] as? Int ?? 0
        lastWorkoutDate = data["lastWorkoutDate"] as? String

        // Shield status
        if let shieldUntil = data["shieldActiveUntil"] as? String {
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: shieldUntil), date > Date() {
                isShieldActive = true
                shieldExpiresAt = date
            } else {
                isShieldActive = false
                shieldExpiresAt = nil
            }
        } else {
            isShieldActive = false
            shieldExpiresAt = nil
        }

        // XP
        xp = data["xp"] as? Int ?? 0

        // Multiplier
        baseMultiplier = EngagementConfig.streakMultiplier(for: currentStreak)
        streakMultiplierLabel = EngagementConfig.streakMultiplierLabel(for: currentStreak)

        // Active power-ups
        activePowerUps = service.activePowerUps(from: data)

        // Calculate effective multiplier
        effectiveMultiplier = service.effectiveMultiplier(
            streakDays: currentStreak,
            activePowerUps: activePowerUps
        )

        // Power-up inventory
        powerUpInventory = service.powerUpInventory(from: data)

        // Daily rewards
        let status = service.dailyRewardsStatus(profile: data)
        canClaimDailyReward = status.canClaimToday
        dailyRewardDay = status.dayIndex
        thisMonthClaims = status.thisMonthClaims
        claimedDays = status.claimedDays
        nextReward = status.nextReward

        // Streak at risk
        recalculateStreakAtRisk()
    }

    private func recalculateStreakAtRisk() {
        guard currentStreak > 0 else {
            streakAtRisk = false
            return
        }
        let today = EngagementService.todayString()
        let hasWorkoutToday = workoutDates.contains(today)
        streakAtRisk = !hasWorkoutToday && !isShieldActive
    }

    // MARK: - Actions

    /// Claim today's daily reward
    func claimDailyReward() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        isLoading = true
        errorMessage = nil

        do {
            let result = try await service.claimDailyReward(uid: uid, profile: rawProfile)
            if result.success, let reward = result.reward {
                lastClaimResult = ClaimResult(
                    reward: reward,
                    actualReward: result.actualReward,
                    message: result.actualReward?.label ?? reward.label
                )
                showRewardClaimed = true
                canClaimDailyReward = false
            } else {
                errorMessage = result.message ?? "Failed to claim reward"
            }
        } catch {
            errorMessage = "Error: \(error.localizedDescription)"
            print("[EngagementVM] claimDailyReward error: \(error)")
        }

        isLoading = false
    }

    /// Activate a power-up from inventory
    func activatePowerUp(type: PowerUpType) async {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        errorMessage = nil

        do {
            let result = try await service.activatePowerUp(uid: uid, type: type)
            if !result.success {
                errorMessage = result.message
            }
        } catch {
            errorMessage = "Error: \(error.localizedDescription)"
            print("[EngagementVM] activatePowerUp error: \(error)")
        }
    }

    /// Use a streak shield to protect the current streak
    func useStreakShield() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        errorMessage = nil

        do {
            let result = try await service.activateStreakShield(uid: uid)
            if !result.success {
                errorMessage = result.message
            }
        } catch {
            errorMessage = "Error: \(error.localizedDescription)"
            print("[EngagementVM] useStreakShield error: \(error)")
        }
    }

    /// Recalculate streak from workout history
    func recalculateStreak() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        do {
            try await service.calculateStreak(uid: uid, workoutDates: workoutDates)
        } catch {
            print("[EngagementVM] recalculateStreak error: \(error)")
        }
    }

    /// Clean up expired power-ups
    func cleanupExpiredPowerUps() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        try? await service.cleanupExpiredPowerUps(uid: uid)
    }

    // MARK: - Power-Up Timer Refresh

    private func refreshActivePowerUps() {
        // Filter out expired power-ups from the local array
        let stillActive = activePowerUps.filter { $0.isActive }
        if stillActive.count != activePowerUps.count {
            activePowerUps = stillActive
            // Recalculate multiplier
            effectiveMultiplier = service.effectiveMultiplier(
                streakDays: currentStreak,
                activePowerUps: activePowerUps
            )
        }
        // Force view refresh for countdown timers via objectWillChange
        if !activePowerUps.isEmpty {
            objectWillChange.send()
        }
    }

    // MARK: - Computed Helpers

    /// Daily rewards array for the full 30-day calendar view
    var allDailyRewards: [DailyReward] {
        EngagementConfig.dailyRewards
    }

    /// Check if a specific day index has been claimed (in current month)
    func isDayClaimed(dayIndex: Int) -> Bool {
        // We look through claimed days to see how many were claimed this month
        // dayIndex is 0-based from the reward cycle perspective
        return dayIndex < dailyRewardDay
    }

    /// Whether the current day index matches a specific reward day
    func isCurrentDay(_ day: Int) -> Bool {
        return day == dailyRewardDay + 1
    }

    /// Get remaining time string for an active power-up
    func remainingTimeString(for powerUp: PowerUpItem) -> String {
        let remaining = powerUp.remainingSeconds
        if remaining <= 0 { return "Expired" }
        let hours = Int(remaining) / 3600
        let minutes = (Int(remaining) % 3600) / 60
        let seconds = Int(remaining) % 60
        if hours > 0 {
            return String(format: "%dh %02dm", hours, minutes)
        }
        return String(format: "%dm %02ds", minutes, seconds)
    }

    /// Time until next daily reset (midnight)
    var timeUntilDailyReset: String {
        let calendar = Calendar.current
        let now = Date()
        guard let midnight = calendar.date(bySettingHour: 0, minute: 0, second: 0, of: now),
              let nextMidnight = calendar.date(byAdding: .day, value: 1, to: midnight) else {
            return "--"
        }
        let remaining = nextMidnight.timeIntervalSince(now)
        let hours = Int(remaining) / 3600
        let minutes = (Int(remaining) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    /// Get the last 30 days as date strings for the streak heatmap
    var last30Days: [String] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return (0..<30).reversed().compactMap { offset in
            guard let date = Calendar.current.date(byAdding: .day, value: -offset, to: Date()) else { return nil }
            return formatter.string(from: date)
        }
    }

    /// Check if a date string is in the workout dates set
    func hasWorkout(on dateString: String) -> Bool {
        workoutDates.contains(dateString)
    }

    /// Streak milestone if the current streak matches one
    var currentMilestone: StreakMilestone? {
        EngagementConfig.streakMilestone(for: currentStreak)
    }

    /// Next milestone to reach
    var nextMilestone: StreakMilestone? {
        EngagementConfig.streakMilestones.first { $0.days > currentStreak }
    }

    /// Days until next milestone
    var daysToNextMilestone: Int? {
        guard let next = nextMilestone else { return nil }
        return next.days - currentStreak
    }
}
