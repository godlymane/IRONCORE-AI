import Foundation
import Combine
import FirebaseFirestore

/// Central data manager — owns all Firestore listeners and mutations.
/// Mirrors the React app's Zustand store + useFitnessData hook.
final class FirestoreManager: ObservableObject {
    static let shared = FirestoreManager()

    private let db = Firestore.firestore()
    private var listeners: [ListenerRegistration] = []
    private var socialListeners: [ListenerRegistration] = []

    // MARK: - Published State (mirrors Zustand store)

    // Profile
    @Published var profile: UserProfile?
    @Published var profileLoaded = false
    @Published var profileExists = false
    @Published var dataLoaded = false

    // Core collections
    @Published var meals: [Meal] = []
    @Published var workouts: [Workout] = []
    @Published var progress: [ProgressEntry] = []
    @Published var burned: [CardioEntry] = []
    @Published var photos: [ProgressPhoto] = []

    // Social / Arena
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var chat: [ChatMessage] = []
    @Published var posts: [SocialPost] = []
    @Published var globalFeed: [FeedEvent] = []
    @Published var battles: [Battle] = []
    @Published var inbox: [InboxMessage] = []
    @Published var following: [String] = []  // user IDs

    // Boss
    @Published var communityBoss: CommunityBoss?

    private init() {}

    // MARK: - Listener Lifecycle

    /// Start core listeners (always active when logged in)
    func startCoreListeners(uid: String) {
        stopAllListeners()

        // Profile (single doc)
        let profileRef = db.collection("users").document(uid)
            .collection("data").document("profile")
        let profileListener = profileRef.addSnapshotListener { [weak self] snapshot, error in
            guard let self else { return }
            if let snapshot, snapshot.exists {
                self.profile = try? snapshot.data(as: UserProfile.self)
                self.profileExists = true
            } else {
                self.profile = nil
                self.profileExists = false
            }
            self.profileLoaded = true
        }
        listeners.append(profileListener)

        // Meals
        listeners.append(listenToCollection(
            path: "users/\(uid)/meals",
            orderBy: "createdAt",
            assign: { [weak self] (items: [Meal]) in self?.meals = items }
        ))

        // Workouts
        listeners.append(listenToCollection(
            path: "users/\(uid)/workouts",
            orderBy: "createdAt",
            assign: { [weak self] (items: [Workout]) in self?.workouts = items }
        ))

        // Progress
        listeners.append(listenToCollection(
            path: "users/\(uid)/progress",
            orderBy: "createdAt",
            assign: { [weak self] (items: [ProgressEntry]) in self?.progress = items }
        ))

        // Burned (cardio)
        listeners.append(listenToCollection(
            path: "users/\(uid)/burned",
            orderBy: "createdAt",
            assign: { [weak self] (items: [CardioEntry]) in self?.burned = items }
        ))

        dataLoaded = true
    }

    /// Start social listeners (only when Arena tab is active)
    func startSocialListeners(uid: String) {
        stopSocialListeners()

        // Leaderboard (top 100 by XP)
        let leaderboardQuery = db.collection("leaderboard")
            .order(by: "xp", descending: true)
            .limit(to: 100)
        socialListeners.append(leaderboardQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.leaderboard = snapshot?.documents.compactMap { try? $0.data(as: LeaderboardEntry.self) } ?? []
        })

        // Global chat (recent 50)
        let chatQuery = db.collection("global").document("data")
            .collection("chat")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
        socialListeners.append(chatQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.chat = snapshot?.documents.compactMap { try? $0.data(as: ChatMessage.self) } ?? []
        })

        // Posts (recent 20)
        let postsQuery = db.collection("global").document("data")
            .collection("posts")
            .order(by: "createdAt", descending: true)
            .limit(to: 20)
        socialListeners.append(postsQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.posts = snapshot?.documents.compactMap { try? $0.data(as: SocialPost.self) } ?? []
        })

        // Global feed (recent 50)
        let feedQuery = db.collection("global").document("data")
            .collection("feed")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
        socialListeners.append(feedQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.globalFeed = snapshot?.documents.compactMap { try? $0.data(as: FeedEvent.self) } ?? []
        })

        // Battles (recent 20)
        let battlesQuery = db.collection("battles")
            .order(by: "createdAt", descending: true)
            .limit(to: 20)
        socialListeners.append(battlesQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.battles = snapshot?.documents.compactMap { try? $0.data(as: Battle.self) } ?? []
        })

        // Inbox
        let inboxQuery = db.collection("users").document(uid)
            .collection("inbox")
            .order(by: "createdAt", descending: true)
        socialListeners.append(inboxQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.inbox = snapshot?.documents.compactMap { try? $0.data(as: InboxMessage.self) } ?? []
        })

        // Following
        let followingRef = db.collection("users").document(uid).collection("following")
        socialListeners.append(followingRef.addSnapshotListener { [weak self] snapshot, _ in
            self?.following = snapshot?.documents.map { $0.documentID } ?? []
        })

        // Community Boss
        let bossRef = db.collection("community_boss").document("current")
        socialListeners.append(bossRef.addSnapshotListener { [weak self] snapshot, _ in
            self?.communityBoss = try? snapshot?.data(as: CommunityBoss.self)
        })
    }

    /// Start photo listener (only when Profile tab is active)
    func startPhotoListener(uid: String) {
        let photosQuery = db.collection("users").document(uid)
            .collection("photos")
            .order(by: "createdAt", descending: true)
        listeners.append(photosQuery.addSnapshotListener { [weak self] snapshot, _ in
            self?.photos = snapshot?.documents.compactMap { try? $0.data(as: ProgressPhoto.self) } ?? []
        })
    }

    func stopSocialListeners() {
        socialListeners.forEach { $0.remove() }
        socialListeners.removeAll()
    }

    func stopAllListeners() {
        listeners.forEach { $0.remove() }
        listeners.removeAll()
        stopSocialListeners()
    }

    // MARK: - Data Mutations (mirrors React updateData)

    /// Add a document to a user's subcollection with XP reward
    func addEntry<T: Encodable>(uid: String, collection: String, data: T, xpReward: Int) async throws {
        let collectionRef = db.collection("users").document(uid).collection(collection)
        try collectionRef.addDocument(from: data)

        if xpReward > 0 {
            try await awardXP(uid: uid, amount: xpReward, reason: collection)
        }
    }

    /// Update a document in a user's subcollection
    func updateEntry(uid: String, collection: String, docId: String, data: [String: Any]) async throws {
        let docRef = db.collection("users").document(uid)
            .collection(collection).document(docId)
        try await docRef.updateData(data)
    }

    /// Delete a document from a user's subcollection
    func deleteEntry(uid: String, collection: String, docId: String) async throws {
        let docRef = db.collection("users").document(uid)
            .collection(collection).document(docId)
        try await docRef.delete()
    }

    /// Update user profile (single doc at users/{uid}/data/profile)
    func updateProfile(uid: String, data: [String: Any]) async throws {
        let profileRef = db.collection("users").document(uid)
            .collection("data").document("profile")
        try await profileRef.setData(data, merge: true)
    }

    // MARK: - XP & Leaderboard (mirrors React arenaService.awardXP)

    /// Award XP atomically — updates profile + root user doc + leaderboard
    func awardXP(uid: String, amount: Int, reason: String) async throws {
        let profileRef = db.collection("users").document(uid)
            .collection("data").document("profile")
        let userRef = db.collection("users").document(uid)
        let leaderboardRef = db.collection("leaderboard").document(uid)

        try await db.runTransaction { transaction, errorPointer in
            // Read current profile
            guard let profileDoc = try? transaction.getDocument(profileRef),
                  let currentXP = profileDoc.data()?["xp"] as? Int else {
                return nil
            }

            let newXP = currentXP + amount
            let newLevel = calculateLevel(xp: newXP)
            let newLeague = getLeague(xp: newXP)
            let username = profileDoc.data()?["userId"] as? String ?? ""

            // Update profile
            transaction.updateData([
                "xp": newXP,
            ], forDocument: profileRef)

            // Update root user doc
            transaction.setData([
                "xp": newXP,
                "level": newLevel,
                "league": newLeague,
                "updatedAt": FieldValue.serverTimestamp(),
            ], forDocument: userRef, merge: true)

            // Update leaderboard
            transaction.setData([
                "userId": uid,
                "xp": newXP,
                "level": newLevel,
                "league": newLeague,
                "lastUpdated": FieldValue.serverTimestamp(),
            ], forDocument: leaderboardRef, merge: true)

            return nil
        }
    }

    // MARK: - Workout Processing (mirrors React updateData for workouts)

    /// Save a workout with volume calculation and boss damage
    func saveWorkout(uid: String, workout: Workout) async throws {
        // Validate sets
        var validatedWorkout = workout
        for i in validatedWorkout.exercises.indices {
            for j in validatedWorkout.exercises[i].sets.indices {
                validatedWorkout.exercises[i].sets[j].w = min(
                    validatedWorkout.exercises[i].sets[j].w,
                    ValidationLimits.maxWeight
                )
                validatedWorkout.exercises[i].sets[j].r = min(
                    validatedWorkout.exercises[i].sets[j].r,
                    ValidationLimits.maxReps
                )
            }
        }

        // Calculate total volume
        let totalVolume = validatedWorkout.exercises.reduce(0.0) { $0 + $1.totalVolume }

        // Save workout
        let collectionRef = db.collection("users").document(uid).collection("workouts")
        try collectionRef.addDocument(from: validatedWorkout)

        // Award XP
        try await awardXP(uid: uid, amount: XPReward.workout, reason: "workout")

        // Update leaderboard todayVolume
        let leaderboardRef = db.collection("leaderboard").document(uid)
        try await leaderboardRef.setData([
            "todayVolume": FieldValue.increment(totalVolume),
            "lastUpdated": FieldValue.serverTimestamp(),
        ], merge: true)

        // Update workoutsCompleted
        let userRef = db.collection("users").document(uid)
        try await userRef.updateData([
            "workoutsCompleted": FieldValue.increment(Int64(1)),
        ])

        // Deal boss damage
        try await updateBossProgress(uid: uid, username: profile?.userId ?? "", damage: Int(totalVolume))
    }

    // MARK: - Boss System (mirrors React arenaService.updateBossProgress)

    func updateBossProgress(uid: String, username: String, damage: Int) async throws {
        let bossRef = db.collection("community_boss").document("current")

        try await db.runTransaction { transaction, _ in
            guard let bossDoc = try? transaction.getDocument(bossRef),
                  let data = bossDoc.data(),
                  let currentHP = data["currentHP"] as? Int,
                  let status = data["status"] as? String,
                  status == "active" else {
                return nil
            }

            let newHP = max(0, currentHP - damage)
            var updates: [String: Any] = [
                "currentHP": newHP,
                "lastDamageAt": FieldValue.serverTimestamp(),
            ]

            if newHP <= 0 {
                updates["status"] = "defeated"
                updates["defeatedAt"] = FieldValue.serverTimestamp()
            }

            transaction.updateData(updates, forDocument: bossRef)
            return nil
        }
    }

    // MARK: - Social Actions

    /// Send global chat message (mirrors React sendMessage)
    func sendChatMessage(uid: String, text: String) async throws {
        guard let profile = profile else { return }
        let sanitized = sanitizeText(text, maxLength: ValidationLimits.maxMessageLength)
        let chatRef = db.collection("global").document("data").collection("chat")
        try await chatRef.addDocument(data: [
            "text": sanitized,
            "userId": uid,
            "username": sanitizeText(profile.userId, maxLength: ValidationLimits.maxUsernameLength),
            "photo": profile.photoURL ?? "",
            "xp": profile.xp,
            "createdAt": FieldValue.serverTimestamp(),
        ])
    }

    /// Send private message
    func sendPrivateMessage(targetUserId: String, uid: String, text: String) async throws {
        guard let profile = profile else { return }
        let sanitized = sanitizeText(text, maxLength: ValidationLimits.maxMessageLength)
        let inboxRef = db.collection("users").document(targetUserId).collection("inbox")
        try await inboxRef.addDocument(data: [
            "text": sanitized,
            "fromId": uid,
            "fromName": sanitizeText(profile.userId, maxLength: ValidationLimits.maxUsernameLength),
            "fromPhoto": profile.photoURL ?? "",
            "createdAt": FieldValue.serverTimestamp(),
            "read": false,
        ])
    }

    /// Toggle follow
    func toggleFollow(uid: String, targetUserId: String) async throws {
        let followRef = db.collection("users").document(uid)
            .collection("following").document(targetUserId)
        let doc = try await followRef.getDocument()
        if doc.exists {
            try await followRef.delete()
        } else {
            try await followRef.setData(["followedAt": FieldValue.serverTimestamp()])
        }
    }

    /// Broadcast event to global feed
    func broadcastEvent(uid: String, type: String, message: String, details: String) async throws {
        guard let profile = profile else { return }
        let feedRef = db.collection("global").document("data").collection("feed")
        try await feedRef.addDocument(data: [
            "type": type,
            "message": sanitizeText(message, maxLength: ValidationLimits.maxMessageLength),
            "details": details,
            "username": sanitizeText(profile.userId, maxLength: ValidationLimits.maxUsernameLength),
            "userId": uid,
            "createdAt": FieldValue.serverTimestamp(),
        ])
    }

    // MARK: - Daily Drop (mirrors React completeDailyDrop)

    func completeDailyDrop(uid: String, xpReward: Int) async throws {
        let profileRef = db.collection("users").document(uid)
            .collection("data").document("profile")
        let today = todayDateString()

        try await db.runTransaction { transaction, _ in
            guard let doc = try? transaction.getDocument(profileRef),
                  let data = doc.data() else { return nil }

            let drops = data["dailyDrops"] as? [String: Bool] ?? [:]
            guard drops[today] != true else { return nil } // already claimed

            transaction.updateData([
                "dailyDrops.\(today)": true,
            ], forDocument: profileRef)

            return nil
        }

        try await awardXP(uid: uid, amount: xpReward, reason: "daily_drop")
    }

    // MARK: - Cleanup

    func clearAllData() {
        stopAllListeners()
        profile = nil
        profileLoaded = false
        profileExists = false
        dataLoaded = false
        meals = []
        workouts = []
        progress = []
        burned = []
        photos = []
        leaderboard = []
        chat = []
        posts = []
        globalFeed = []
        battles = []
        inbox = []
        following = []
        communityBoss = nil
    }

    // MARK: - Private Helpers

    private func listenToCollection<T: Decodable>(
        path: String,
        orderBy field: String,
        descending: Bool = true,
        assign: @escaping ([T]) -> Void
    ) -> ListenerRegistration {
        // Split path into collection reference
        let components = path.split(separator: "/").map(String.init)
        var ref: CollectionReference

        if components.count == 3 {
            ref = db.collection(components[0]).document(components[1]).collection(components[2])
        } else if components.count == 1 {
            ref = db.collection(components[0])
        } else {
            // Fallback for deeper paths
            ref = db.collection(path)
        }

        return ref.order(by: field, descending: descending)
            .addSnapshotListener { snapshot, error in
                let items = snapshot?.documents.compactMap { try? $0.data(as: T.self) } ?? []
                assign(items)
            }
    }
}
