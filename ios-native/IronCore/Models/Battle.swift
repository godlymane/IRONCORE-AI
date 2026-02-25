import Foundation
import FirebaseFirestore

/// PvP battle at `battles/{battleId}`
struct Battle: Codable, Identifiable {
    @DocumentID var id: String?
    var challenger: BattlePlayer
    var opponent: BattlePlayer
    var status: String          // "pending", "active", "completed", "declined"
    var battleType: String      // "ranked", "casual"
    var winnerId: String?
    @ServerTimestamp var createdAt: Timestamp?
    @ServerTimestamp var acceptedAt: Timestamp?
    @ServerTimestamp var declinedAt: Timestamp?
    @ServerTimestamp var completedAt: Timestamp?
    @ServerTimestamp var expiresAt: Timestamp?
}

struct BattlePlayer: Codable {
    var userId: String
    var username: String
    var photo: String
    var xp: Int
}
