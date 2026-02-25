import Foundation
import FirebaseFirestore

/// Root user document at `users/{userId}`
/// Denormalized stats for quick reads
struct UserStats: Codable, Identifiable {
    @DocumentID var id: String?
    var username: String
    var level: Int
    var xp: Int
    var workoutsCompleted: Int
    var wins: Int
    var losses: Int
    var currentStreak: Int
    var longestStreak: Int
    var streakFreezeCount: Int
    var league: String
    var avatarUrl: String
    var guildId: String?
    var guildRole: String?
    var isPremium: Bool
    var subscription: SubscriptionInfo?
    @ServerTimestamp var lastLoginAt: Timestamp?
    @ServerTimestamp var lastStreakUpdateAt: Timestamp?
    @ServerTimestamp var createdAt: Timestamp?
    @ServerTimestamp var updatedAt: Timestamp?

    static let defaults = UserStats(
        username: "",
        level: 1,
        xp: 0,
        workoutsCompleted: 0,
        wins: 0,
        losses: 0,
        currentStreak: 1,
        longestStreak: 1,
        streakFreezeCount: 1,
        league: "Iron Novice",
        avatarUrl: "",
        guildId: nil,
        guildRole: nil,
        isPremium: false,
        subscription: nil
    )
}
