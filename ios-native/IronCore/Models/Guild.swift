import Foundation
import FirebaseFirestore

/// Guild at `guilds/{guildId}`
struct Guild: Codable, Identifiable {
    @DocumentID var id: String?
    var name: String
    var description: String
    var level: Int
    var xp: Int
    var totalXP: Int
    var ownerId: String
    var memberCount: Int
    var maxMembers: Int
    var members: [GuildMember]
    var emblem: String
    var bio: String
    var inviteCode: String
    var isPublic: Bool
    var weeklyGoal: String?
    var weeklyGoalProgress: Int
    @ServerTimestamp var createdAt: Timestamp?
}

struct GuildMember: Codable {
    var userId: String
    var username: String
    var avatarUrl: String
    var role: String            // "leader", "member"
    var joinedAt: String        // ISO8601
}

/// Guild chat message at `guilds/{guildId}/chat/{messageId}`
struct GuildChatMessage: Codable, Identifiable {
    @DocumentID var id: String?
    var userId: String
    var username: String
    var photo: String
    var message: String
    @ServerTimestamp var timestamp: Timestamp?
}
