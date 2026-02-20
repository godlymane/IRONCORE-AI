import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Firestore data layer — mirrors useFitnessData.js from React prototype
/// Collection paths match exactly: users/{uid}/data/profile, users/{uid}/progress, etc.
final class FirestoreService {
    static let shared = FirestoreService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Profile (users/{uid}/data/profile)

    func getProfile(uid: String) async throws -> UserProfile? {
        let doc = try await db.collection("users").document(uid)
            .collection("data").document("profile").getDocument()
        guard doc.exists else { return nil }
        return try doc.data(as: UserProfile.self)
    }

    func saveProfile(uid: String, data: [String: Any]) async throws {
        try await db.collection("users").document(uid)
            .collection("data").document("profile")
            .setData(data, merge: true)
    }

    /// Listen for real-time profile changes (matches onSnapshot in React)
    /// Completion returns Result to distinguish network errors from missing profiles
    func listenToProfile(uid: String, completion: @escaping (Result<UserProfile?, Error>) -> Void) -> ListenerRegistration {
        return db.collection("users").document(uid)
            .collection("data").document("profile")
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Profile listener error: \(error)")
                    completion(.failure(error))
                    return
                }
                guard let snapshot = snapshot, snapshot.exists else {
                    completion(.success(nil))
                    return
                }
                do {
                    let profile = try snapshot.data(as: UserProfile.self)
                    completion(.success(profile))
                } catch {
                    // Codable decode failed — log but keep user authenticated.
                    // This prevents onboarded users from being sent back to onboarding
                    // just because a new field was added that the model doesn't expect.
                    print("[Firestore] Profile decode error: \(error). Keeping current auth state.")
                    completion(.failure(error))
                }
            }
    }

    // MARK: - Progress (users/{uid}/progress)

    func saveProgress(uid: String, weight: Double) async throws {
        let dateString = ISO8601DateFormatter.string(from: Date(), timeZone: .current, formatOptions: [.withFullDate])
        try await db.collection("users").document(uid)
            .collection("progress").addDocument(data: [
                "weight": weight,
                "date": dateString,
                "createdAt": FieldValue.serverTimestamp()
            ])
    }

    // MARK: - Meals (users/{uid}/meals)

    func listenToMeals(uid: String, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        return db.collection("users").document(uid)
            .collection("meals")
            .order(by: "createdAt", descending: true)
            .limit(to: 100)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Meals listener error: \(error)")
                    return // Keep existing data, don't wipe with empty array
                }
                let docs = snapshot?.documents.map { doc -> [String: Any] in
                    var data = doc.data()
                    data["id"] = doc.documentID
                    return data
                } ?? []
                completion(docs)
            }
    }

    func addMeal(uid: String, meal: [String: Any]) async throws {
        var data = meal
        data["date"] = Self.todayString()
        data["createdAt"] = FieldValue.serverTimestamp()
        data["userId"] = uid
        try await db.collection("users").document(uid)
            .collection("meals").addDocument(data: data)
    }

    func deleteMeal(uid: String, mealId: String) async throws {
        try await db.collection("users").document(uid)
            .collection("meals").document(mealId).delete()
    }

    // MARK: - Burned (users/{uid}/burned)

    func listenToBurned(uid: String, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        return db.collection("users").document(uid)
            .collection("burned")
            .order(by: "createdAt", descending: true)
            .limit(to: 100)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Burned listener error: \(error)")
                    return
                }
                let docs = snapshot?.documents.map { $0.data() } ?? []
                completion(docs)
            }
    }

    // MARK: - Workouts (users/{uid}/workouts)

    func listenToWorkouts(uid: String, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        return db.collection("users").document(uid)
            .collection("workouts")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Workouts listener error: \(error)")
                    return
                }
                let docs = snapshot?.documents.map { doc -> [String: Any] in
                    var data = doc.data()
                    data["id"] = doc.documentID
                    return data
                } ?? []
                completion(docs)
            }
    }

    func addWorkout(uid: String, workout: [String: Any]) async throws {
        var data = workout
        data["date"] = Self.todayString()
        data["createdAt"] = FieldValue.serverTimestamp()
        data["userId"] = uid
        try await db.collection("users").document(uid)
            .collection("workouts").addDocument(data: data)
    }

    func deleteWorkout(uid: String, workoutId: String) async throws {
        try await db.collection("users").document(uid)
            .collection("workouts").document(workoutId).delete()
    }

    // MARK: - Leaderboard (leaderboard/{userId})

    func listenToLeaderboard(limit count: Int = 50, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        return db.collection("leaderboard")
            .order(by: "xp", descending: true)
            .limit(to: count)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Leaderboard listener error: \(error)")
                    return
                }
                let docs = snapshot?.documents.map { doc -> [String: Any] in
                    var data = doc.data()
                    data["userId"] = doc.documentID
                    return data
                } ?? []
                completion(docs)
            }
    }

    func updateLeaderboardEntry(uid: String, data: [String: Any]) async throws {
        var entry = data
        entry["lastUpdated"] = FieldValue.serverTimestamp()
        try await db.collection("leaderboard").document(uid)
            .setData(entry, merge: true)
    }

    // MARK: - Battles (battles/{battleId})

    func createBattle(data: [String: Any]) async throws -> String {
        var battle = data
        battle["createdAt"] = FieldValue.serverTimestamp()
        let ref = try await db.collection("battles").addDocument(data: battle)
        return ref.documentID
    }

    func updateBattle(battleId: String, data: [String: Any]) async throws {
        try await db.collection("battles").document(battleId)
            .setData(data, merge: true)
    }

    /// Listen for incoming battle challenges (where user is opponent, status=pending)
    func listenToPendingBattles(uid: String, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        return db.collection("battles")
            .whereField("opponent.userId", isEqualTo: uid)
            .whereField("status", isEqualTo: "pending")
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Pending battles listener error: \(error)")
                    return
                }
                let docs = snapshot?.documents.map { doc -> [String: Any] in
                    var data = doc.data()
                    data["id"] = doc.documentID
                    return data
                } ?? []
                completion(docs)
            }
    }

    /// Fetch user's battle history (as challenger or opponent)
    func getUserBattles(uid: String, limit count: Int = 20, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        // Listen to battles where user is challenger
        return db.collection("battles")
            .whereField("challenger.userId", isEqualTo: uid)
            .order(by: "createdAt", descending: true)
            .limit(to: count)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] User battles listener error: \(error)")
                    return
                }
                let docs = snapshot?.documents.map { doc -> [String: Any] in
                    var data = doc.data()
                    data["id"] = doc.documentID
                    return data
                } ?? []
                completion(docs)
            }
    }

    /// Listen to battles where user is the opponent
    func getUserBattlesAsOpponent(uid: String, limit count: Int = 20, completion: @escaping ([[String: Any]]) -> Void) -> ListenerRegistration {
        return db.collection("battles")
            .whereField("opponent.userId", isEqualTo: uid)
            .order(by: "createdAt", descending: true)
            .limit(to: count)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[Firestore] Opponent battles listener error: \(error)")
                    return
                }
                let docs = snapshot?.documents.map { doc -> [String: Any] in
                    var data = doc.data()
                    data["id"] = doc.documentID
                    return data
                } ?? []
                completion(docs)
            }
    }

    // MARK: - Helpers

    static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    // MARK: - Onboarding Complete
    /// Matches handleOnboardingComplete in App.jsx — writes profile + initial weight

    func completeOnboarding(uid: String, onboardingData: OnboardingData) async throws {
        let profileData: [String: Any] = [
            "goal": onboardingData.goal.rawValue,
            "gender": onboardingData.gender.rawValue,
            "weight": onboardingData.weight ?? 0,
            "height": onboardingData.height ?? 0,
            "age": onboardingData.age ?? 0,
            "bodyFat": onboardingData.bodyFat as Any,
            "targetWeight": onboardingData.targetWeight as Any,
            "activityLevel": onboardingData.activityLevel.rawValue,
            "intensity": onboardingData.intensity.rawValue,
            "dailyCalories": onboardingData.calculatedCalories,
            "dailyProtein": onboardingData.calculatedProtein,
            "dailyCarbs": onboardingData.calculatedCarbs,
            "dailyFat": onboardingData.calculatedFat,
            "tdee": onboardingData.calculatedTDEE,
            "bmr": onboardingData.calculatedBMR,
            "onboarded": true,
            "lastUpdated": FieldValue.serverTimestamp(),
            "schemaVersion": 2
        ]

        try await saveProfile(uid: uid, data: profileData)

        // Save initial weight to progress (matches React: updateData('add', 'progress', ...))
        if let weight = onboardingData.weight, weight > 0 {
            try await saveProgress(uid: uid, weight: weight)
        }
    }
}
