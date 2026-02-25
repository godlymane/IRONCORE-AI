import Foundation
import FirebaseFirestore

/// Global chat message at `global/data/chat/{messageId}`
struct ChatMessage: Codable, Identifiable {
    @DocumentID var id: String?
    var text: String
    var userId: String
    var username: String
    var photo: String
    var xp: Int
    @ServerTimestamp var createdAt: Timestamp?
}

/// Social post at `global/data/posts/{postId}`
struct SocialPost: Codable, Identifiable {
    @DocumentID var id: String?
    var imageUrl: String
    var caption: String
    var userId: String
    var username: String
    var userPhoto: String
    var xp: Int
    var likes: Int
    @ServerTimestamp var createdAt: Timestamp?
}

/// Activity feed event at `global/data/feed/{eventId}`
struct FeedEvent: Codable, Identifiable {
    @DocumentID var id: String?
    var type: String            // "challenge", "level", "boss_hit", "boss_kill"
    var message: String
    var details: String
    var username: String
    var userId: String
    @ServerTimestamp var createdAt: Timestamp?
}

/// Private message at `users/{userId}/inbox/{messageId}`
struct InboxMessage: Codable, Identifiable {
    @DocumentID var id: String?
    var text: String
    var fromId: String
    var fromName: String
    var fromPhoto: String
    var read: Bool
    @ServerTimestamp var createdAt: Timestamp?
}

/// Notification at `users/{userId}/notifications/{notificationId}`
struct AppNotification: Codable, Identifiable {
    @DocumentID var id: String?
    var title: String
    var message: String
    var type: String            // "info", "warning", "success", "achievement", "social"
    var read: Bool
    var actionLink: String?
    @ServerTimestamp var createdAt: Timestamp?
}

/// Following doc at `users/{userId}/following/{targetUserId}`
struct Following: Codable, Identifiable {
    @DocumentID var id: String?
    @ServerTimestamp var followedAt: Timestamp?
}
