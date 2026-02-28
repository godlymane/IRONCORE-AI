import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Community Boss Raids — global boss fight where all users deal damage.
/// Mirrors CommunityBoss.jsx from React prototype.
/// Firestore path: community_boss/current
@MainActor
final class CommunityBossViewModel: ObservableObject {

    // MARK: - Published State

    @Published var boss: CommunityBoss?
    @Published var isLoading = true
    @Published var isDealingDamage = false
    @Published var isClaiming = false
    @Published var errorMessage: String?
    @Published var damageDealt: Int = 0

    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?

    // MARK: - Computed

    var isActive: Bool { boss?.status == "active" }
    var isDefeated: Bool { boss?.status == "defeated" }
    var hpPercent: Double {
        guard let b = boss, b.totalHP > 0 else { return 0 }
        return max(0, Double(b.currentHP) / Double(b.totalHP))
    }

    var topContributors: [BossContributor] {
        (boss?.contributors ?? [])
            .sorted { $0.damageDealt > $1.damageDealt }
            .prefix(10)
            .map { $0 }
    }

    func userContribution(uid: String) -> BossContributor? {
        boss?.contributors.first { $0.userId == uid }
    }

    func hasClaimedReward(uid: String) -> Bool {
        userContribution(uid: uid)?.claimedXP ?? false
    }

    func userRank(uid: String) -> Int? {
        let sorted = (boss?.contributors ?? []).sorted { $0.damageDealt > $1.damageDealt }
        return sorted.firstIndex(where: { $0.userId == uid }).map { $0 + 1 }
    }

    // MARK: - Start Listening

    func startListening() {
        listener = db.collection("community_boss").document("current")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self else { return }
                Task { @MainActor in
                    self.isLoading = false
                    guard let data = snapshot?.data() else {
                        self.boss = nil
                        return
                    }
                    self.boss = CommunityBoss(
                        bossId: data["bossId"] as? String ?? "",
                        name: data["name"] as? String ?? "Unknown Boss",
                        totalHP: data["totalHP"] as? Int ?? 10000,
                        currentHP: data["currentHP"] as? Int ?? 0,
                        contributors: self.parseContributors(data["contributors"]),
                        status: data["status"] as? String ?? "active",
                        startedAt: data["startedAt"] as? Timestamp,
                        defeatedAt: data["defeatedAt"] as? Timestamp,
                        lastDamageAt: data["lastDamageAt"] as? Timestamp
                    )
                }
            }
    }

    func stopListening() {
        listener?.remove()
    }

    // MARK: - Deal Damage (Firestore Transaction)

    func dealDamage(uid: String, username: String, damage: Int) async {
        guard isActive, damage > 0 else { return }
        isDealingDamage = true
        errorMessage = nil
        damageDealt = damage

        let docRef = db.collection("community_boss").document("current")

        do {
            try await db.runTransaction { transaction, errorPointer in
                let doc: DocumentSnapshot
                do {
                    doc = try transaction.getDocument(docRef)
                } catch let fetchError as NSError {
                    errorPointer?.pointee = fetchError
                    return nil
                }

                guard let data = doc.data(),
                      (data["status"] as? String) == "active" else {
                    return nil
                }

                let currentHP = data["currentHP"] as? Int ?? 0
                let newHP = max(0, currentHP - damage)

                // Update contributor
                var contributors = data["contributors"] as? [[String: Any]] ?? []
                if let idx = contributors.firstIndex(where: { ($0["userId"] as? String) == uid }) {
                    let existing = contributors[idx]["damageDealt"] as? Int ?? 0
                    contributors[idx]["damageDealt"] = existing + damage
                } else {
                    contributors.append([
                        "userId": uid,
                        "username": username,
                        "damageDealt": damage,
                        "joinedAt": ISO8601DateFormatter().string(from: Date()),
                        "claimedXP": false
                    ])
                }

                var updates: [String: Any] = [
                    "currentHP": newHP,
                    "contributors": contributors,
                    "lastDamageAt": FieldValue.serverTimestamp()
                ]

                if newHP <= 0 {
                    updates["status"] = "defeated"
                    updates["defeatedAt"] = FieldValue.serverTimestamp()
                }

                transaction.updateData(updates, forDocument: docRef)
                return nil
            }
        } catch {
            errorMessage = "Failed to deal damage. Try again."
        }

        isDealingDamage = false
    }

    // MARK: - Claim Reward (500 XP)

    func claimReward(uid: String) async {
        guard isDefeated, !hasClaimedReward(uid: uid) else { return }
        isClaiming = true

        let docRef = db.collection("community_boss").document("current")

        do {
            try await db.runTransaction { transaction, errorPointer in
                let doc: DocumentSnapshot
                do {
                    doc = try transaction.getDocument(docRef)
                } catch let fetchError as NSError {
                    errorPointer?.pointee = fetchError
                    return nil
                }

                guard let data = doc.data(),
                      (data["status"] as? String) == "defeated" else {
                    return nil
                }

                var contributors = data["contributors"] as? [[String: Any]] ?? []
                guard let idx = contributors.firstIndex(where: { ($0["userId"] as? String) == uid }),
                      !(contributors[idx]["claimedXP"] as? Bool ?? false) else {
                    return nil
                }

                contributors[idx]["claimedXP"] = true
                transaction.updateData(["contributors": contributors], forDocument: docRef)

                // Award XP
                let profileRef = self.db.collection("users").document(uid).collection("data").document("profile")
                transaction.updateData(["xp": FieldValue.increment(Int64(500))], forDocument: profileRef)

                // Update leaderboard
                let leaderRef = self.db.collection("leaderboard").document(uid)
                transaction.updateData(["xp": FieldValue.increment(Int64(500))], forDocument: leaderRef)

                return nil
            }
        } catch {
            errorMessage = "Failed to claim reward."
        }

        isClaiming = false
    }

    // MARK: - Parse Contributors

    private func parseContributors(_ raw: Any?) -> [BossContributor] {
        guard let arr = raw as? [[String: Any]] else { return [] }
        return arr.compactMap { d in
            BossContributor(
                userId: d["userId"] as? String ?? "",
                username: d["username"] as? String ?? "Unknown",
                damageDealt: d["damageDealt"] as? Int ?? 0,
                joinedAt: d["joinedAt"] as? String ?? "",
                claimedXP: d["claimedXP"] as? Bool ?? false
            )
        }
    }
}
