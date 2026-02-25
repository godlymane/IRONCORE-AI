import Foundation
import FirebaseFirestore

/// Community boss at `community_boss/current`
struct CommunityBoss: Codable {
    var bossId: String
    var name: String
    var totalHP: Int
    var currentHP: Int
    var contributors: [BossContributor]
    var status: String          // "active", "defeated"
    @ServerTimestamp var startedAt: Timestamp?
    @ServerTimestamp var defeatedAt: Timestamp?
    @ServerTimestamp var lastDamageAt: Timestamp?
}

struct BossContributor: Codable {
    var userId: String
    var username: String
    var damageDealt: Int
    var joinedAt: String        // ISO8601
    var claimedXP: Bool
}
