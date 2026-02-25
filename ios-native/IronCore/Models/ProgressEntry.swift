import Foundation
import FirebaseFirestore

/// Progress milestone at `users/{userId}/progress/{entryId}`
struct ProgressEntry: Codable, Identifiable {
    @DocumentID var id: String?
    var date: String            // "YYYY-MM-DD"
    var userId: String
    @ServerTimestamp var createdAt: Timestamp?
}

/// Progress photo at `users/{userId}/photos/{photoId}`
struct ProgressPhoto: Codable, Identifiable {
    @DocumentID var id: String?
    var url: String
    var storagePath: String
    var note: String
    var type: String            // "front", "side", "back", "other"
    var date: String            // ISO8601
    @ServerTimestamp var createdAt: Timestamp?
}
