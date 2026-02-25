import Foundation
import FirebaseFirestore

/// Workout log at `users/{userId}/workouts/{workoutId}`
struct Workout: Codable, Identifiable {
    @DocumentID var id: String?
    var date: String            // "YYYY-MM-DD"
    var userId: String
    var exercises: [Exercise]
    var duration: Int?          // seconds
    @ServerTimestamp var createdAt: Timestamp?
}

struct Exercise: Codable {
    var name: String
    var sets: [ExerciseSet]

    /// Total volume = sum(weight * reps) across all sets
    var totalVolume: Double {
        sets.reduce(0) { $0 + ($1.w * Double($1.r)) }
    }
}

struct ExerciseSet: Codable {
    var w: Double   // weight
    var r: Int      // reps
}
