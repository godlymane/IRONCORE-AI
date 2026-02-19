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
    func listenToProfile(uid: String, completion: @escaping (UserProfile?) -> Void) -> ListenerRegistration {
        return db.collection("users").document(uid)
            .collection("data").document("profile")
            .addSnapshotListener { snapshot, error in
                guard let snapshot = snapshot, snapshot.exists else {
                    completion(nil)
                    return
                }
                let profile = try? snapshot.data(as: UserProfile.self)
                completion(profile)
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
