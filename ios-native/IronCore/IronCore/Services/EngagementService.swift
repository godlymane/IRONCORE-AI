import Foundation
import FirebaseFirestore
import FirebaseAuth

// MARK: - Engagement Data Configuration
// Mirrors engagementData.js from React prototype

/// Streak XP multiplier thresholds
struct StreakMultiplierTier {
    let days: Int
    let multiplier: Double
    let label: String
}

/// Streak milestone celebration
struct StreakMilestone {
    let days: Int
    let bonusXP: Int
    let title: String
    let sfSymbol: String
}

/// Power-up type definitions
enum PowerUpType: String, Codable, CaseIterable {
    case xpBoost = "xp_boost"
    case fireMode = "fire_mode"
    case streakFreeze = "streak_freeze"

    var displayName: String {
        switch self {
        case .xpBoost: return "XP Boost"
        case .fireMode: return "Fire Mode"
        case .streakFreeze: return "Streak Freeze"
        }
    }

    var sfSymbol: String {
        switch self {
        case .xpBoost: return "bolt.fill"
        case .fireMode: return "flame.fill"
        case .streakFreeze: return "shield.fill"
        }
    }

    var description: String {
        switch self {
        case .xpBoost: return "2x XP for 1 hour"
        case .fireMode: return "3x XP for 30 minutes"
        case .streakFreeze: return "Protects streak for 24 hours"
        }
    }

    /// Multiplier applied while active
    var xpMultiplier: Double {
        switch self {
        case .xpBoost: return 2.0
        case .fireMode: return 3.0
        case .streakFreeze: return 1.0
        }
    }

    /// Duration in seconds
    var duration: TimeInterval {
        switch self {
        case .xpBoost: return 3600       // 1 hour
        case .fireMode: return 1800      // 30 minutes
        case .streakFreeze: return 86400  // 24 hours
        }
    }

    var rarity: PowerUpRarity {
        switch self {
        case .xpBoost: return .rare
        case .fireMode: return .legendary
        case .streakFreeze: return .epic
        }
    }
}

enum PowerUpRarity: String, Codable {
    case common, rare, epic, legendary

    var color: String {
        switch self {
        case .common: return "#6b7280"
        case .rare: return "#dc2626"
        case .epic: return "#a855f7"
        case .legendary: return "#f59e0b"
        }
    }
}

/// A power-up instance in the user's inventory or active list
struct PowerUpItem: Codable, Identifiable {
    var id: String { type + (activatedAt ?? "inventory") }
    let type: String
    var count: Int
    var activatedAt: String?   // ISO date string when activated
    var expiresAt: String?     // ISO date string when effect expires

    var powerUpType: PowerUpType? {
        PowerUpType(rawValue: type)
    }

    var isActive: Bool {
        guard let expiresAt = expiresAt else { return false }
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiresAt) else { return false }
        return expiry > Date()
    }

    var remainingSeconds: TimeInterval {
        guard let expiresAt = expiresAt else { return 0 }
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiresAt) else { return 0 }
        return max(0, expiry.timeIntervalSince(Date()))
    }
}

/// Daily reward definition
enum DailyRewardType: String, Codable {
    case xp
    case item
    case mystery
    case premium
}

struct DailyReward: Identifiable {
    let id: Int // day number (1-31)
    let day: Int
    let type: DailyRewardType
    let amount: Int        // XP amount for .xp type
    let item: String?      // item ID for .item type
    let quantity: Int       // item count
    let label: String
    let sfSymbol: String
}

/// Mystery/Premium reward result
struct RewardResult {
    let type: DailyRewardType
    let amount: Int
    let item: String?
    let quantity: Int
    let label: String
}

// MARK: - Engagement Configuration Constants

enum EngagementConfig {

    // -- Streak Multipliers --
    static let streakMultipliers: [StreakMultiplierTier] = [
        StreakMultiplierTier(days: 3,   multiplier: 1.1,  label: "10% Bonus"),
        StreakMultiplierTier(days: 7,   multiplier: 1.25, label: "25% Bonus"),
        StreakMultiplierTier(days: 14,  multiplier: 1.5,  label: "50% Bonus"),
        StreakMultiplierTier(days: 30,  multiplier: 2.0,  label: "2X XP!"),
        StreakMultiplierTier(days: 60,  multiplier: 2.5,  label: "2.5X XP!"),
        StreakMultiplierTier(days: 100, multiplier: 3.0,  label: "3X XP!"),
    ]

    // -- Streak Milestones --
    static let streakMilestones: [StreakMilestone] = [
        StreakMilestone(days: 7,   bonusXP: 100,   title: "Week Warrior!",      sfSymbol: "flame.fill"),
        StreakMilestone(days: 14,  bonusXP: 250,   title: "Fortnight Fighter!",  sfSymbol: "bolt.fill"),
        StreakMilestone(days: 30,  bonusXP: 500,   title: "Iron Will!",          sfSymbol: "dumbbell.fill"),
        StreakMilestone(days: 60,  bonusXP: 1000,  title: "Unstoppable!",        sfSymbol: "star.fill"),
        StreakMilestone(days: 100, bonusXP: 2500,  title: "Century Legend!",      sfSymbol: "crown.fill"),
        StreakMilestone(days: 365, bonusXP: 10000, title: "Year of Iron!",        sfSymbol: "trophy.fill"),
    ]

    /// Grace period: 36 hours before streak is lost
    static let gracePeriodHours: Int = 36

    /// Free streak shield recharge interval (days)
    static let freeShieldRechargeIntervalDays: Int = 7

    /// Maximum streak shields a user can hold
    static let maxStreakShields: Int = 3

    // -- Time-of-Day Bonus --
    /// Early bird bonus: 5-7 AM = 1.5x multiplier
    static let earlyBirdStartHour: Int = 5
    static let earlyBirdEndHour: Int = 7
    static let earlyBirdMultiplier: Double = 1.5

    // -- Daily Rewards (30-day cycle) --
    static let dailyRewards: [DailyReward] = [
        // Week 1
        DailyReward(id: 1,  day: 1,  type: .xp,   amount: 25,  item: nil,            quantity: 0, label: "+25 XP",         sfSymbol: "star.fill"),
        DailyReward(id: 2,  day: 2,  type: .xp,   amount: 50,  item: nil,            quantity: 0, label: "+50 XP",         sfSymbol: "star.fill"),
        DailyReward(id: 3,  day: 3,  type: .xp,   amount: 75,  item: nil,            quantity: 0, label: "+75 XP",         sfSymbol: "sparkles"),
        DailyReward(id: 4,  day: 4,  type: .xp,   amount: 100, item: nil,            quantity: 0, label: "+100 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 5,  day: 5,  type: .xp,   amount: 125, item: nil,            quantity: 0, label: "+125 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 6,  day: 6,  type: .xp,   amount: 150, item: nil,            quantity: 0, label: "+150 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 7,  day: 7,  type: .item,  amount: 0,   item: "streak_freeze", quantity: 1, label: "Streak Shield",  sfSymbol: "shield.fill"),

        // Week 2
        DailyReward(id: 8,  day: 8,  type: .xp,   amount: 75,  item: nil,            quantity: 0, label: "+75 XP",         sfSymbol: "star.fill"),
        DailyReward(id: 9,  day: 9,  type: .xp,   amount: 100, item: nil,            quantity: 0, label: "+100 XP",        sfSymbol: "star.fill"),
        DailyReward(id: 10, day: 10, type: .xp,   amount: 125, item: nil,            quantity: 0, label: "+125 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 11, day: 11, type: .xp,   amount: 150, item: nil,            quantity: 0, label: "+150 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 12, day: 12, type: .xp,   amount: 175, item: nil,            quantity: 0, label: "+175 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 13, day: 13, type: .xp,   amount: 200, item: nil,            quantity: 0, label: "+200 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 14, day: 14, type: .mystery, amount: 0, item: nil,            quantity: 0, label: "Mystery Box",    sfSymbol: "gift.fill"),

        // Week 3
        DailyReward(id: 15, day: 15, type: .xp,   amount: 100, item: nil,            quantity: 0, label: "+100 XP",        sfSymbol: "star.fill"),
        DailyReward(id: 16, day: 16, type: .xp,   amount: 125, item: nil,            quantity: 0, label: "+125 XP",        sfSymbol: "star.fill"),
        DailyReward(id: 17, day: 17, type: .xp,   amount: 150, item: nil,            quantity: 0, label: "+150 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 18, day: 18, type: .xp,   amount: 175, item: nil,            quantity: 0, label: "+175 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 19, day: 19, type: .xp,   amount: 200, item: nil,            quantity: 0, label: "+200 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 20, day: 20, type: .xp,   amount: 225, item: nil,            quantity: 0, label: "+225 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 21, day: 21, type: .item,  amount: 0,   item: "xp_boost",     quantity: 1, label: "2X XP Token",    sfSymbol: "bolt.fill"),

        // Week 4
        DailyReward(id: 22, day: 22, type: .xp,   amount: 125, item: nil,            quantity: 0, label: "+125 XP",        sfSymbol: "star.fill"),
        DailyReward(id: 23, day: 23, type: .xp,   amount: 150, item: nil,            quantity: 0, label: "+150 XP",        sfSymbol: "star.fill"),
        DailyReward(id: 24, day: 24, type: .xp,   amount: 175, item: nil,            quantity: 0, label: "+175 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 25, day: 25, type: .xp,   amount: 200, item: nil,            quantity: 0, label: "+200 XP",        sfSymbol: "sparkles"),
        DailyReward(id: 26, day: 26, type: .xp,   amount: 250, item: nil,            quantity: 0, label: "+250 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 27, day: 27, type: .xp,   amount: 300, item: nil,            quantity: 0, label: "+300 XP",        sfSymbol: "sparkle"),
        DailyReward(id: 28, day: 28, type: .premium, amount: 0, item: nil,            quantity: 0, label: "Premium Chest",  sfSymbol: "crown.fill"),

        // Bonus days (months with 29-31 days)
        DailyReward(id: 29, day: 29, type: .xp,   amount: 200, item: nil,            quantity: 0, label: "+200 XP",        sfSymbol: "star.circle.fill"),
        DailyReward(id: 30, day: 30, type: .xp,   amount: 250, item: nil,            quantity: 0, label: "+250 XP",        sfSymbol: "star.circle.fill"),
        DailyReward(id: 31, day: 31, type: .xp,   amount: 300, item: nil,            quantity: 0, label: "+300 XP",        sfSymbol: "star.circle.fill"),
    ]

    // -- Mystery Box Rewards (weighted random) --
    static let mysteryRewards: [(reward: RewardResult, weight: Int)] = [
        (RewardResult(type: .xp, amount: 500,  item: nil,            quantity: 0, label: "+500 XP"),        40),
        (RewardResult(type: .xp, amount: 1000, item: nil,            quantity: 0, label: "+1000 XP"),       20),
        (RewardResult(type: .item, amount: 0,  item: "streak_freeze", quantity: 1, label: "Streak Shield"), 25),
        (RewardResult(type: .item, amount: 0,  item: "xp_boost",     quantity: 1, label: "2X XP Token"),    10),
        (RewardResult(type: .item, amount: 0,  item: "spotlight",    quantity: 1, label: "Spotlight 24h"),    5),
    ]

    // -- Premium Chest Rewards (weighted random) --
    static let premiumRewards: [(reward: RewardResult, weight: Int)] = [
        (RewardResult(type: .xp, amount: 1500, item: nil,             quantity: 0, label: "+1500 XP"),       30),
        (RewardResult(type: .xp, amount: 2500, item: nil,             quantity: 0, label: "+2500 XP"),       15),
        (RewardResult(type: .item, amount: 0,  item: "streak_freeze", quantity: 3, label: "3x Streak Shield"), 20),
        (RewardResult(type: .item, amount: 0,  item: "xp_boost",     quantity: 1, label: "24h 2X XP"),       15),
        (RewardResult(type: .item, amount: 0,  item: "premium_badge", quantity: 1, label: "Premium Badge"),   10),
        (RewardResult(type: .item, amount: 0,  item: "streak_restore", quantity: 1, label: "Streak Restore"), 10),
    ]

    // MARK: - Helper Functions

    /// Get the streak multiplier for a given streak length
    static func streakMultiplier(for days: Int) -> Double {
        let applicable = streakMultipliers
            .filter { days >= $0.days }
            .sorted { $0.days > $1.days }
        return applicable.first?.multiplier ?? 1.0
    }

    /// Get the streak multiplier label for a given streak length
    static func streakMultiplierLabel(for days: Int) -> String? {
        let applicable = streakMultipliers
            .filter { days >= $0.days }
            .sorted { $0.days > $1.days }
        return applicable.first?.label
    }

    /// Check if the current streak has hit a milestone
    static func streakMilestone(for days: Int) -> StreakMilestone? {
        streakMilestones.first { $0.days == days }
    }

    /// Get daily reward for a specific day index (1-based, wraps at 31)
    static func dailyReward(for dayIndex: Int) -> DailyReward {
        let clamped = max(1, min(dayIndex, 31))
        return dailyRewards.first { $0.day == clamped } ?? dailyRewards.last!
    }

    /// Pick a weighted random mystery reward
    static func randomMysteryReward() -> RewardResult {
        weightedRandom(from: mysteryRewards)
    }

    /// Pick a weighted random premium reward
    static func randomPremiumReward() -> RewardResult {
        weightedRandom(from: premiumRewards)
    }

    /// Time-of-day multiplier (early bird bonus 5-7 AM)
    static func timeOfDayMultiplier() -> Double {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour >= earlyBirdStartHour && hour < earlyBirdEndHour {
            return earlyBirdMultiplier
        }
        return 1.0
    }

    private static func weightedRandom(from pool: [(reward: RewardResult, weight: Int)]) -> RewardResult {
        let totalWeight = pool.reduce(0) { $0 + $1.weight }
        var random = Int.random(in: 0..<totalWeight)
        for entry in pool {
            random -= entry.weight
            if random < 0 { return entry.reward }
        }
        return pool.first!.reward
    }
}


// MARK: - Engagement Service (Firestore Operations)
/// Mirrors engagement functions from engagementService.js.
/// All reads/writes target users/{uid}/data/profile for the engagement fields.

final class EngagementService {
    static let shared = EngagementService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Date Helpers

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f
    }()

    private static let monthFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        f.timeZone = .current
        return f
    }()

    static func todayString() -> String {
        dayFormatter.string(from: Date())
    }

    static func currentMonthString() -> String {
        monthFormatter.string(from: Date())
    }

    private func profileRef(uid: String) -> DocumentReference {
        db.collection("users").document(uid).collection("data").document("profile")
    }

    // MARK: - Streak Calculation

    /// Calculate and update user's streak based on workout date history.
    /// Mirrors calculateStreak() in engagementService.js.
    @discardableResult
    func calculateStreak(uid: String, workoutDates: [String]) async throws -> (streak: Int, multiplier: Double, milestone: StreakMilestone?) {
        let today = Self.todayString()
        let yesterday: String = {
            let cal = Calendar.current
            let y = cal.date(byAdding: .day, value: -1, to: Date())!
            return Self.dayFormatter.string(from: y)
        }()

        let uniqueDates = Array(Set(workoutDates)).sorted().reversed()
        var streak = 0

        if uniqueDates.contains(today) {
            streak = 1
            var checkDate = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
            while uniqueDates.contains(Self.dayFormatter.string(from: checkDate)) {
                streak += 1
                checkDate = Calendar.current.date(byAdding: .day, value: -1, to: checkDate)!
            }
        } else if uniqueDates.contains(yesterday) {
            // Grace period — user can still save streak by working out today
            streak = 1
            var checkDate = Calendar.current.date(byAdding: .day, value: -2, to: Date())!
            while uniqueDates.contains(Self.dayFormatter.string(from: checkDate)) {
                streak += 1
                checkDate = Calendar.current.date(byAdding: .day, value: -1, to: checkDate)!
            }
        }

        let multiplier = EngagementConfig.streakMultiplier(for: streak)
        let milestone = EngagementConfig.streakMilestone(for: streak)

        // Update streak in Firestore profile
        try await profileRef(uid: uid).setData([
            "currentStreak": streak,
            "streakMultiplier": multiplier,
            "lastStreakUpdate": Date().ISO8601Format()
        ], merge: true)

        // Update longestStreak if needed
        let doc = try await profileRef(uid: uid).getDocument()
        let longestStreak = doc.data()?["longestStreak"] as? Int ?? 0
        if streak > longestStreak {
            try await profileRef(uid: uid).setData([
                "longestStreak": streak
            ], merge: true)
        }

        return (streak, multiplier, milestone)
    }

    // MARK: - Streak Shield

    /// Activate a streak shield (costs 1 shield, protects for 24 hours).
    /// Mirrors activateStreakShield() in engagementService.js.
    func activateStreakShield(uid: String) async throws -> (success: Bool, message: String) {
        let doc = try await profileRef(uid: uid).getDocument()
        let data = doc.data() ?? [:]
        let shields = data["streakShields"] as? Int ?? 0

        guard shields > 0 else {
            return (false, "No shields available")
        }

        let expiresAt = Date().addingTimeInterval(86400).ISO8601Format()
        try await profileRef(uid: uid).updateData([
            "streakShields": FieldValue.increment(Int64(-1)),
            "shieldActiveUntil": expiresAt,
        ])

        return (true, "Shield activated for 24 hours!")
    }

    /// Check if user currently has an active shield.
    func hasActiveShield(profile: [String: Any]?) -> Bool {
        guard let expiresString = profile?["shieldActiveUntil"] as? String else { return false }
        let formatter = ISO8601DateFormatter()
        guard let expires = formatter.date(from: expiresString) else { return false }
        return expires > Date()
    }

    /// Award a free streak shield (every 7 days, max 3).
    func awardFreeShield(uid: String) async throws -> Bool {
        let doc = try await profileRef(uid: uid).getDocument()
        let data = doc.data() ?? [:]
        let shields = data["streakShields"] as? Int ?? 0

        guard shields < EngagementConfig.maxStreakShields else { return false }

        // Check if enough time has passed since last free shield
        let lastFreeShield = data["lastFreeShield"] as? String
        if let lastString = lastFreeShield {
            let formatter = ISO8601DateFormatter()
            if let lastDate = formatter.date(from: lastString) {
                let daysSince = Calendar.current.dateComponents([.day], from: lastDate, to: Date()).day ?? 0
                guard daysSince >= EngagementConfig.freeShieldRechargeIntervalDays else { return false }
            }
        }

        try await profileRef(uid: uid).updateData([
            "streakShields": FieldValue.increment(Int64(1)),
            "lastFreeShield": Date().ISO8601Format(),
        ])

        return true
    }

    // MARK: - XP Multiplier Calculation

    /// Calculate effective XP multiplier combining streak + time-of-day + active power-ups.
    func effectiveMultiplier(
        streakDays: Int,
        activePowerUps: [PowerUpItem]
    ) -> Double {
        // Base: streak multiplier
        var mult = EngagementConfig.streakMultiplier(for: streakDays)

        // Time-of-day bonus (additive to streak multiplier)
        let todBonus = EngagementConfig.timeOfDayMultiplier()
        if todBonus > 1.0 {
            mult += (todBonus - 1.0)
        }

        // Active power-up multipliers (multiplicative on top)
        for pu in activePowerUps where pu.isActive {
            if let puType = pu.powerUpType, puType.xpMultiplier > 1.0 {
                mult *= puType.xpMultiplier
            }
        }

        return mult
    }

    // MARK: - Daily Rewards

    /// Claim today's daily reward.
    /// Mirrors claimDailyReward() in engagementService.js.
    func claimDailyReward(uid: String, profile: [String: Any]?) async throws -> (success: Bool, reward: DailyReward?, actualReward: RewardResult?, message: String?) {
        let today = Self.todayString()
        let currentMonth = Self.currentMonthString()
        let claimedDays = profile?["dailyRewardsClaimed"] as? [String: Bool] ?? [:]

        // Already claimed today?
        if claimedDays[today] == true {
            return (false, nil, nil, "Already claimed today!")
        }

        // Check if month rolled over — reset day index
        let lastRewardMonth = profile?["lastRewardMonth"] as? String
        var dayIndex = profile?["rewardDayIndex"] as? Int ?? 0
        if lastRewardMonth != currentMonth {
            dayIndex = 0
        }

        let reward = EngagementConfig.dailyReward(for: dayIndex + 1)
        var actualReward: RewardResult? = nil
        let ref = profileRef(uid: uid)

        switch reward.type {
        case .xp:
            try await ref.updateData([
                "xp": FieldValue.increment(Int64(reward.amount)),
                "dailyRewardsClaimed.\(today)": true,
                "rewardDayIndex": dayIndex + 1,
                "lastRewardMonth": currentMonth,
            ])

        case .item:
            let fieldKey: String
            switch reward.item {
            case "streak_freeze": fieldKey = "streakShields"
            case "xp_boost": fieldKey = "doubleXPTokens"
            default: fieldKey = "doubleXPTokens"
            }
            try await ref.updateData([
                fieldKey: FieldValue.increment(Int64(reward.quantity > 0 ? reward.quantity : 1)),
                "dailyRewardsClaimed.\(today)": true,
                "rewardDayIndex": dayIndex + 1,
                "lastRewardMonth": currentMonth,
            ])

        case .mystery:
            let mystery = EngagementConfig.randomMysteryReward()
            actualReward = mystery
            if mystery.type == .xp {
                try await ref.updateData([
                    "xp": FieldValue.increment(Int64(mystery.amount)),
                    "dailyRewardsClaimed.\(today)": true,
                    "rewardDayIndex": dayIndex + 1,
                    "lastRewardMonth": currentMonth,
                ])
            } else {
                let fieldKey = mystery.item == "streak_freeze" ? "streakShields" : "doubleXPTokens"
                try await ref.updateData([
                    fieldKey: FieldValue.increment(Int64(mystery.quantity > 0 ? mystery.quantity : 1)),
                    "dailyRewardsClaimed.\(today)": true,
                    "rewardDayIndex": dayIndex + 1,
                    "lastRewardMonth": currentMonth,
                ])
            }

        case .premium:
            let premium = EngagementConfig.randomPremiumReward()
            actualReward = premium
            if premium.type == .xp {
                try await ref.updateData([
                    "xp": FieldValue.increment(Int64(premium.amount)),
                    "dailyRewardsClaimed.\(today)": true,
                    "rewardDayIndex": dayIndex + 1,
                    "lastRewardMonth": currentMonth,
                ])
            } else {
                let fieldKey: String
                switch premium.item {
                case "streak_freeze": fieldKey = "streakShields"
                case "xp_boost": fieldKey = "doubleXPTokens"
                default: fieldKey = "doubleXPTokens"
                }
                try await ref.updateData([
                    fieldKey: FieldValue.increment(Int64(premium.quantity > 0 ? premium.quantity : 1)),
                    "dailyRewardsClaimed.\(today)": true,
                    "rewardDayIndex": dayIndex + 1,
                    "lastRewardMonth": currentMonth,
                ])
            }
        }

        return (true, reward, actualReward, nil)
    }

    /// Get daily rewards status for the UI.
    /// Mirrors getDailyRewardsStatus() in engagementService.js.
    func dailyRewardsStatus(profile: [String: Any]?) -> (canClaimToday: Bool, nextReward: DailyReward, dayIndex: Int, thisMonthClaims: Int, claimedDays: [String: Bool]) {
        let today = Self.todayString()
        let currentMonth = Self.currentMonthString()
        let claimedDays = profile?["dailyRewardsClaimed"] as? [String: Bool] ?? [:]
        let lastRewardMonth = profile?["lastRewardMonth"] as? String
        var dayIndex = profile?["rewardDayIndex"] as? Int ?? 0

        if lastRewardMonth != currentMonth {
            dayIndex = 0
        }

        let canClaimToday = claimedDays[today] != true
        let nextReward = EngagementConfig.dailyReward(for: dayIndex + 1)
        let thisMonthClaims = claimedDays.keys.filter { $0.hasPrefix(currentMonth) }.count

        return (canClaimToday, nextReward, dayIndex, thisMonthClaims, claimedDays)
    }

    // MARK: - Power-Up System

    /// Activate a power-up from the user's inventory.
    /// Decrements inventory count and writes an active entry with expiry time.
    func activatePowerUp(uid: String, type: PowerUpType) async throws -> (success: Bool, message: String) {
        let doc = try await profileRef(uid: uid).getDocument()
        let data = doc.data() ?? [:]

        // Check inventory count
        let inventoryKey: String
        switch type {
        case .xpBoost: inventoryKey = "doubleXPTokens"
        case .fireMode: inventoryKey = "fireModeTokens"
        case .streakFreeze: inventoryKey = "streakShields"
        }

        let count = data[inventoryKey] as? Int ?? 0
        guard count > 0 else {
            return (false, "No \(type.displayName) available")
        }

        // Check if one of this type is already active
        let activePowerUps = data["activePowerUps"] as? [[String: Any]] ?? []
        let formatter = ISO8601DateFormatter()
        let alreadyActive = activePowerUps.contains { entry in
            guard let t = entry["type"] as? String, t == type.rawValue,
                  let exp = entry["expiresAt"] as? String,
                  let expDate = formatter.date(from: exp) else { return false }
            return expDate > Date()
        }
        guard !alreadyActive else {
            return (false, "\(type.displayName) is already active")
        }

        let now = Date()
        let expiresAt = now.addingTimeInterval(type.duration)
        let newEntry: [String: Any] = [
            "type": type.rawValue,
            "activatedAt": now.ISO8601Format(),
            "expiresAt": expiresAt.ISO8601Format(),
        ]

        // If streak freeze, also set the shield active field
        var updateData: [String: Any] = [
            inventoryKey: FieldValue.increment(Int64(-1)),
            "activePowerUps": FieldValue.arrayUnion([newEntry]),
        ]

        if type == .streakFreeze {
            updateData["shieldActiveUntil"] = expiresAt.ISO8601Format()
        }

        try await profileRef(uid: uid).updateData(updateData)

        return (true, "\(type.displayName) activated!")
    }

    /// Get list of currently active (non-expired) power-ups from profile data.
    func activePowerUps(from profile: [String: Any]?) -> [PowerUpItem] {
        guard let entries = profile?["activePowerUps"] as? [[String: Any]] else { return [] }
        let formatter = ISO8601DateFormatter()

        return entries.compactMap { entry -> PowerUpItem? in
            guard let type = entry["type"] as? String,
                  let activatedAt = entry["activatedAt"] as? String,
                  let expiresAt = entry["expiresAt"] as? String,
                  let expDate = formatter.date(from: expiresAt),
                  expDate > Date() else { return nil }

            return PowerUpItem(
                type: type,
                count: 1,
                activatedAt: activatedAt,
                expiresAt: expiresAt
            )
        }
    }

    /// Clean up expired power-ups from the profile (call periodically).
    func cleanupExpiredPowerUps(uid: String) async throws {
        let doc = try await profileRef(uid: uid).getDocument()
        guard let data = doc.data(),
              let entries = data["activePowerUps"] as? [[String: Any]] else { return }

        let formatter = ISO8601DateFormatter()
        let expired = entries.filter { entry in
            guard let exp = entry["expiresAt"] as? String,
                  let expDate = formatter.date(from: exp) else { return true }
            return expDate <= Date()
        }

        // Remove expired entries
        for entry in expired {
            try await profileRef(uid: uid).updateData([
                "activePowerUps": FieldValue.arrayRemove([entry])
            ])
        }
    }

    // MARK: - Power-Up Inventory Counts

    /// Get inventory counts for each power-up type from profile data.
    func powerUpInventory(from profile: [String: Any]?) -> [PowerUpType: Int] {
        guard let data = profile else {
            return [.xpBoost: 0, .fireMode: 0, .streakFreeze: 0]
        }
        return [
            .xpBoost: data["doubleXPTokens"] as? Int ?? 0,
            .fireMode: data["fireModeTokens"] as? Int ?? 0,
            .streakFreeze: data["streakShields"] as? Int ?? 0,
        ]
    }

    // MARK: - Profile Listener (for real-time engagement data)

    /// Listen to profile changes for engagement fields.
    /// Returns a ListenerRegistration that must be retained and removed on cleanup.
    func listenToEngagementData(uid: String, completion: @escaping ([String: Any]?) -> Void) -> ListenerRegistration {
        profileRef(uid: uid).addSnapshotListener { snapshot, error in
            if let error = error {
                print("[EngagementService] Listener error: \(error.localizedDescription)")
                completion(nil)
                return
            }
            completion(snapshot?.data())
        }
    }
}
