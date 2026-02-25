import Foundation
import FirebaseFirestore

/// Tournament at `tournaments/{tournamentId}`
struct Tournament: Codable, Identifiable {
    @DocumentID var id: String?
    var title: String
    var description: String
    var startDate: String       // ISO8601
    var endDate: String         // ISO8601
    var status: String          // "upcoming", "active", "completed"
    var rules: String
    var rewards: [TournamentReward]
    var participantCount: Int
    @ServerTimestamp var createdAt: Timestamp?
}

struct TournamentReward: Codable {
    var rank: Int
    var reward: String
}

/// Participant at `tournaments/{tournamentId}/participants/{userId}`
struct TournamentParticipant: Codable, Identifiable {
    @DocumentID var id: String?
    var userId: String
    var username: String
    var avatarUrl: String
    var score: Int
    var rank: Int
    @ServerTimestamp var joinedAt: Timestamp?
}
