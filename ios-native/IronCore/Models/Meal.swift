import Foundation
import FirebaseFirestore

/// Meal log at `users/{userId}/meals/{mealId}`
struct Meal: Codable, Identifiable {
    @DocumentID var id: String?
    var date: String            // "YYYY-MM-DD"
    var userId: String
    var mealName: String
    var calories: Double
    var protein: Double
    var carbs: Double
    var fat: Double
    @ServerTimestamp var createdAt: Timestamp?
}
