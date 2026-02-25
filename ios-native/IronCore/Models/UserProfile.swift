import Foundation
import FirebaseFirestore

/// Extended profile at `users/{userId}/data/profile`
/// Single document per user with all detailed profile data
struct UserProfile: Codable, Identifiable {
    var id: String { userId }
    var userId: String
    var photoURL: String?
    var schemaVersion: Int

    // Streaks
    var currentStreak: Int
    var streakMultiplier: Double
    var lastStreakUpdate: String?    // ISO8601
    var streakShields: Int
    var shieldActiveUntil: String?   // ISO8601

    // XP & Progression
    var xp: Int
    var xpHistory: [String: XPHistoryEntry]?

    // Daily Rewards
    var dailyRewardsClaimed: [String: Bool]?  // { "2025-02-25": true }
    var rewardDayIndex: Int
    var lastRewardMonth: String?              // "YYYY-MM"
    var doubleXPTokens: Int

    // Inventory
    var inventory: [InventoryItem]

    // Subscription (duplicate of root doc for consistency)
    var subscription: SubscriptionInfo?
    var isPremium: Bool

    // Nutrition targets
    var dailyCalories: Int?
    var dailyProtein: Int?
    var height: Double?
    var weight: Double?
    var age: Int?
    var gender: String?

    // Onboarding
    var onboarded: Bool?

    // Daily drops
    var dailyDrops: [String: Bool]?  // { "2025-02-25": true }

    static let empty = UserProfile(
        userId: "",
        photoURL: nil,
        schemaVersion: 3,
        currentStreak: 0,
        streakMultiplier: 1.0,
        lastStreakUpdate: nil,
        streakShields: 0,
        shieldActiveUntil: nil,
        xp: 0,
        xpHistory: nil,
        dailyRewardsClaimed: nil,
        rewardDayIndex: 0,
        lastRewardMonth: nil,
        doubleXPTokens: 0,
        inventory: [],
        subscription: nil,
        isPremium: false,
        dailyCalories: nil,
        dailyProtein: nil,
        height: nil,
        weight: nil,
        age: nil,
        gender: nil,
        onboarded: nil,
        dailyDrops: nil
    )
}

struct XPHistoryEntry: Codable {
    var amount: Int
    var reason: String
}

struct InventoryItem: Codable {
    var item: String
    var boughtAt: String?       // ISO8601 timestamp
    var receivedAt: String?     // ISO8601 timestamp (for rewards)
}
