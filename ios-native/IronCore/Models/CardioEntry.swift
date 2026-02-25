import Foundation
import FirebaseFirestore

/// Cardio/burn log at `users/{userId}/burned/{entryId}`
struct CardioEntry: Codable, Identifiable {
    @DocumentID var id: String?
    var date: String            // "YYYY-MM-DD"
    var userId: String
    var calories: Double
    @ServerTimestamp var createdAt: Timestamp?
}
