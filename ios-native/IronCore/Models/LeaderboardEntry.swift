import Foundation
import FirebaseFirestore

/// Leaderboard entry at `leaderboard/{userId}`
struct LeaderboardEntry: Codable, Identifiable {
    @DocumentID var id: String?
    var userId: String
    var username: String
    var xp: Int
    var level: Int
    var league: String
    var avatarUrl: String
    var photo: String?
    var todayVolume: Double
    @ServerTimestamp var lastUpdated: Timestamp?
}
