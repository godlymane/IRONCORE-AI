import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Guild system — create, join, chat, compete as a team, guild wars.
/// Mirrors Guilds.jsx + guildService.js from React prototype.
/// Firestore: guilds/{guildId}, guilds/{guildId}/chat/{msgId},
///            guilds/{guildId}/challenges/{id}, guilds/{guildId}/wars/{warId}
@MainActor
final class GuildViewModel: ObservableObject {

    // MARK: - Published State

    @Published var currentGuild: Guild?
    @Published var availableGuilds: [Guild] = []
    @Published var chatMessages: [ChatMessage] = []
    @Published var loading = true
    @Published var browsing = true

    // Sheets / alerts
    @Published var showCreateSheet = false
    @Published var showLeaveConfirm = false
    @Published var showTransferSheet = false
    @Published var showDisbandConfirm = false
    @Published var disbandConfirmText = ""
    @Published var showPromoteConfirm: GuildMember?
    @Published var showDemoteConfirm: GuildMember?
    @Published var showKickConfirm: GuildMember?

    // Create guild validation
    @Published var createError = ""

    // Chat
    @Published var chatInput = ""

    // Weekly challenges
    @Published var weeklyChallenges: [WeeklyChallenge] = []

    // Guild leaderboard (members sorted by weekly XP)
    @Published var memberLeaderboard: [GuildMember] = []

    // Guild wars
    @Published var activeWar: GuildWar?
    @Published var pastWars: [GuildWar] = []

    private let db = Firestore.firestore()
    private var guildListener: ListenerRegistration?
    private var chatListener: ListenerRegistration?
    private var challengesListener: ListenerRegistration?
    private var warListener: ListenerRegistration?

    // MARK: - Data Models

    struct Guild: Identifiable {
        let id: String
        let name: String
        let description: String
        let icon: String // SF Symbol name
        let level: Int
        let xp: Int
        let ownerId: String
        let memberCount: Int
        let maxMembers: Int
        let isPublic: Bool
        let members: [GuildMember]
    }

    struct GuildMember: Identifiable {
        let userId: String
        let username: String
        let avatarUrl: String
        let role: String // "leader", "officer", "member"
        let joinedAt: String
        let weeklyXP: Int

        var id: String { userId }

        var isLeader: Bool { role == "leader" }
        var isOfficer: Bool { role == "officer" }
        var isStaff: Bool { role == "leader" || role == "officer" }
    }

    struct ChatMessage: Identifiable {
        let id: String
        let userId: String
        let username: String
        let message: String
        let avatarUrl: String
        let timestamp: Date?
        let isSystem: Bool
    }

    struct WeeklyChallenge: Identifiable {
        let id: String
        let title: String
        let description: String
        let target: Int
        let current: Int
        let unit: String
        let icon: String
        let expiresAt: Date?

        var progress: Double {
            guard target > 0 else { return 0 }
            return min(1.0, Double(current) / Double(target))
        }

        var isComplete: Bool { current >= target }
    }

    struct GuildWar: Identifiable {
        let id: String
        let opponentGuildId: String
        let opponentGuildName: String
        let opponentGuildIcon: String
        let status: String // "active", "won", "lost", "draw"
        let ourScore: Int
        let theirScore: Int
        let startsAt: Date?
        let endsAt: Date?
        let metric: String // "totalXP", "workouts", "reps"
    }

    // Guild icon options
    static let guildIcons: [String] = [
        "shield.lefthalf.filled", "flame.fill", "bolt.fill",
        "crown.fill", "star.fill", "trophy.fill",
        "figure.strengthtraining.traditional", "dumbbell.fill",
        "heart.fill", "flag.fill", "mountain.2.fill", "leaf.fill",
    ]

    // MARK: - Start / Stop

    func start(uid: String, guildId: String?) {
        if let guildId, !guildId.isEmpty {
            browsing = false
            subscribeToGuild(guildId)
            subscribeToChatMessages(guildId)
            subscribeToWeeklyChallenges(guildId)
            subscribeToWars(guildId)
        } else {
            browsing = true
            loading = false
            Task { await fetchAvailableGuilds() }
        }
    }

    func stop() {
        guildListener?.remove()
        chatListener?.remove()
        challengesListener?.remove()
        warListener?.remove()
    }

    // MARK: - Subscribe to Guild (real-time)

    private func subscribeToGuild(_ guildId: String) {
        guildListener?.remove()
        guildListener = db.collection("guilds").document(guildId)
            .addSnapshotListener { [weak self] snapshot, error in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if let error {
                        print("[Guild] Listener error: \(error)")
                        return
                    }
                    guard let snapshot, snapshot.exists, let data = snapshot.data() else {
                        self.currentGuild = nil
                        self.browsing = true
                        self.loading = false
                        return
                    }
                    let guild = Self.parseGuild(id: snapshot.documentID, data: data)
                    self.currentGuild = guild
                    self.memberLeaderboard = guild.members.sorted { $0.weeklyXP > $1.weeklyXP }
                    self.browsing = false
                    self.loading = false
                }
            }
    }

    // MARK: - Subscribe to Chat

    private func subscribeToChatMessages(_ guildId: String) {
        chatListener?.remove()
        chatListener = db.collection("guilds").document(guildId)
            .collection("chat")
            .order(by: "timestamp", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if let error {
                        print("[Guild] Chat listener error: \(error)")
                        return
                    }
                    let docs = snapshot?.documents ?? []
                    self.chatMessages = docs.compactMap { doc -> ChatMessage? in
                        let d = doc.data()
                        let ts: Date?
                        if let timestamp = d["timestamp"] as? Timestamp {
                            ts = timestamp.dateValue()
                        } else {
                            ts = nil
                        }
                        return ChatMessage(
                            id: doc.documentID,
                            userId: d["userId"] as? String ?? "",
                            username: d["username"] as? String ?? "Unknown",
                            message: d["message"] as? String ?? "",
                            avatarUrl: d["avatarUrl"] as? String ?? "",
                            timestamp: ts,
                            isSystem: d["isSystem"] as? Bool ?? false
                        )
                    }.reversed()
                }
            }
    }

    // MARK: - Subscribe to Weekly Challenges

    private func subscribeToWeeklyChallenges(_ guildId: String) {
        challengesListener?.remove()
        challengesListener = db.collection("guilds").document(guildId)
            .collection("challenges")
            .order(by: "createdAt", descending: true)
            .limit(to: 5)
            .addSnapshotListener { [weak self] snapshot, error in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if let error {
                        print("[Guild] Challenges listener error: \(error)")
                        return
                    }
                    let docs = snapshot?.documents ?? []
                    self.weeklyChallenges = docs.compactMap { doc -> WeeklyChallenge? in
                        let d = doc.data()
                        let expiresAt: Date?
                        if let ts = d["expiresAt"] as? Timestamp {
                            expiresAt = ts.dateValue()
                        } else {
                            expiresAt = nil
                        }
                        return WeeklyChallenge(
                            id: doc.documentID,
                            title: d["title"] as? String ?? "Challenge",
                            description: d["description"] as? String ?? "",
                            target: d["target"] as? Int ?? 0,
                            current: d["current"] as? Int ?? 0,
                            unit: d["unit"] as? String ?? "",
                            icon: d["icon"] as? String ?? "flame.fill",
                            expiresAt: expiresAt
                        )
                    }
                }
            }
    }

    // MARK: - Subscribe to Wars

    private func subscribeToWars(_ guildId: String) {
        warListener?.remove()
        warListener = db.collection("guilds").document(guildId)
            .collection("wars")
            .order(by: "startsAt", descending: true)
            .limit(to: 10)
            .addSnapshotListener { [weak self] snapshot, error in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if let error {
                        print("[Guild] Wars listener error: \(error)")
                        return
                    }
                    let docs = snapshot?.documents ?? []
                    let wars: [GuildWar] = docs.compactMap { doc in
                        let d = doc.data()
                        return GuildWar(
                            id: doc.documentID,
                            opponentGuildId: d["opponentGuildId"] as? String ?? "",
                            opponentGuildName: d["opponentGuildName"] as? String ?? "Unknown",
                            opponentGuildIcon: d["opponentGuildIcon"] as? String ?? "shield.lefthalf.filled",
                            status: d["status"] as? String ?? "active",
                            ourScore: d["ourScore"] as? Int ?? 0,
                            theirScore: d["theirScore"] as? Int ?? 0,
                            startsAt: (d["startsAt"] as? Timestamp)?.dateValue(),
                            endsAt: (d["endsAt"] as? Timestamp)?.dateValue(),
                            metric: d["metric"] as? String ?? "totalXP"
                        )
                    }
                    self.activeWar = wars.first(where: { $0.status == "active" })
                    self.pastWars = wars.filter { $0.status != "active" }
                }
            }
    }

    // MARK: - Fetch Available Guilds

    func fetchAvailableGuilds() async {
        do {
            let snapshot = try await db.collection("guilds")
                .order(by: "level", descending: true)
                .order(by: "memberCount", descending: true)
                .limit(to: 20)
                .getDocuments()

            availableGuilds = snapshot.documents.compactMap { doc in
                Self.parseGuild(id: doc.documentID, data: doc.data())
            }
        } catch {
            print("[Guild] Fetch guilds error: \(error)")
        }
    }

    // MARK: - Banned Words Filter

    private static let bannedWords: Set<String> = [
        "fuck", "shit", "ass", "bitch", "nigger", "nigga", "faggot", "retard",
        "cunt", "dick", "pussy", "whore", "slut", "rape", "nazi", "hitler",
        "kill", "suicide", "porn", "sex", "cock", "penis", "vagina",
    ]

    private static func containsBannedWord(_ text: String) -> Bool {
        let lower = text.lowercased()
        return bannedWords.contains(where: { lower.contains($0) })
    }

    // MARK: - Validate Guild Name (returns error string or nil)

    func validateGuildCreation(name: String, description: String) -> String? {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        if trimmedName.isEmpty { return "Guild needs a name." }
        if trimmedName.count < 3 { return "Too short. Minimum 3 characters." }
        if trimmedName.count > 24 { return "Too long. 24 characters max." }
        if Self.containsBannedWord(trimmedName) { return "That name isn't allowed." }
        if description.count > 120 { return "Keep it under 120 characters." }
        return nil
    }

    // MARK: - Create Guild (with icon + validation)

    func createGuild(name: String, description: String, icon: String, uid: String, username: String, avatarUrl: String) async {
        createError = ""

        if let error = validateGuildCreation(name: name, description: description) {
            createError = error
            return
        }

        // Check if user already in a guild
        do {
            let userDoc = try await db.collection("users").document(uid).getDocument()
            if let existingGuildId = userDoc.data()?["guildId"] as? String, !existingGuildId.isEmpty {
                createError = "You're already in a guild. Leave first to create a new one."
                return
            }
        } catch {
            // Continue — non-blocking check
        }

        // Check name uniqueness
        do {
            let existing = try await db.collection("guilds")
                .whereField("name", isEqualTo: name)
                .getDocuments()
            guard existing.documents.isEmpty else {
                createError = "That name's taken. Try another."
                return
            }
        } catch {
            createError = "Couldn't create guild. Check your connection and try again."
            return
        }

        let guildRef = db.collection("guilds").document()
        let guildId = guildRef.documentID

        let guildData: [String: Any] = [
            "id": guildId,
            "name": name,
            "description": description,
            "icon": icon,
            "level": 1,
            "xp": 0,
            "ownerId": uid,
            "memberCount": 1,
            "maxMembers": 30,
            "isPublic": true,
            "members": [[
                "userId": uid,
                "username": username,
                "avatarUrl": avatarUrl,
                "role": "leader",
                "joinedAt": ISO8601DateFormatter().string(from: Date()),
                "weeklyXP": 0
            ]],
            "createdAt": FieldValue.serverTimestamp()
        ]

        do {
            try await guildRef.setData(guildData)
            try await db.collection("users").document(uid).setData(["guildId": guildId], merge: true)

            showCreateSheet = false
            createError = ""
            subscribeToGuild(guildId)
            subscribeToChatMessages(guildId)
            subscribeToWeeklyChallenges(guildId)
            subscribeToWars(guildId)
        } catch {
            createError = "Couldn't create guild. Check your connection and try again."
        }
    }

    // MARK: - Join Guild

    func joinGuild(_ guildId: String, uid: String, username: String, avatarUrl: String) async {
        let guildRef = db.collection("guilds").document(guildId)

        do {
            let snapshot = try await guildRef.getDocument()
            guard snapshot.exists, let data = snapshot.data() else { return }

            let memberCount = data["memberCount"] as? Int ?? 0
            let maxMembers = data["maxMembers"] as? Int ?? 30
            guard memberCount < maxMembers else { return }

            let members = data["members"] as? [[String: Any]] ?? []
            guard !members.contains(where: { ($0["userId"] as? String) == uid }) else { return }

            let newMember: [String: Any] = [
                "userId": uid,
                "username": username,
                "avatarUrl": avatarUrl,
                "role": "member",
                "joinedAt": ISO8601DateFormatter().string(from: Date()),
                "weeklyXP": 0
            ]

            try await guildRef.updateData([
                "members": FieldValue.arrayUnion([newMember]),
                "memberCount": FieldValue.increment(Int64(1))
            ])

            try await db.collection("users").document(uid).setData(["guildId": guildId], merge: true)

            await postSystemMessage(guildId: guildId, text: "\(username) joined the guild.")

            subscribeToGuild(guildId)
            subscribeToChatMessages(guildId)
            subscribeToWeeklyChallenges(guildId)
            subscribeToWars(guildId)
        } catch {
            print("[Guild] Join error: \(error)")
        }
    }

    // MARK: - Leave Guild

    func leaveGuild(uid: String) async {
        guard let guild = currentGuild else { return }
        guard let member = guild.members.first(where: { $0.userId == uid }) else { return }

        // Leader with members must transfer first
        if member.role == "leader" && guild.memberCount > 1 {
            showLeaveConfirm = false
            showTransferSheet = true
            return
        }

        let guildId = guild.id
        let name = member.username
        await removeMember(member, from: guild, clearGuildId: true)
        // Only post if guild still exists (not solo-disband)
        if guild.memberCount > 1 {
            await postSystemMessage(guildId: guildId, text: "\(name) left the guild.")
        }
    }

    // MARK: - Promote to Officer

    func promoteMember(_ member: GuildMember) async {
        guard let guild = currentGuild else { return }
        await updateMemberRole(member, newRole: "officer", in: guild)
        await postSystemMessage(guildId: guild.id, text: "\(member.username) was promoted to Officer.")
        showPromoteConfirm = nil
    }

    // MARK: - Demote to Member

    func demoteMember(_ member: GuildMember) async {
        guard let guild = currentGuild else { return }
        await updateMemberRole(member, newRole: "member", in: guild)
        await postSystemMessage(guildId: guild.id, text: "\(member.username) was demoted to Member.")
        showDemoteConfirm = nil
    }

    // MARK: - Kick Member

    func kickMember(_ member: GuildMember) async {
        guard let guild = currentGuild else { return }
        let guildId = guild.id
        let name = member.username
        await removeMember(member, from: guild, clearGuildId: true)
        await postSystemMessage(guildId: guildId, text: "\(name) was removed from the guild.")
        showKickConfirm = nil
    }

    // MARK: - Transfer Leadership

    func transferLeadership(to newLeader: GuildMember, uid: String) async {
        guard let guild = currentGuild else { return }
        guard let currentLeader = guild.members.first(where: { $0.userId == uid }) else { return }

        // Demote current leader to member, promote new leader
        let guildRef = db.collection("guilds").document(guild.id)

        // Rebuild members array with role changes
        var updatedMembers: [[String: Any]] = []
        for m in guild.members {
            var dict = memberToDict(m)
            if m.userId == uid {
                dict["role"] = "member"
            } else if m.userId == newLeader.userId {
                dict["role"] = "leader"
            }
            updatedMembers.append(dict)
        }

        do {
            try await guildRef.updateData([
                "members": updatedMembers,
                "ownerId": newLeader.userId
            ])
            let leaderName = guild.members.first(where: { $0.userId == uid })?.username ?? "Leader"
            await postSystemMessage(guildId: guild.id, text: "\(leaderName) transferred leadership to \(newLeader.username).")
            showTransferSheet = false
        } catch {
            print("[Guild] Transfer error: \(error)")
        }
    }

    // MARK: - Send Chat Message

    func sendMessage(guildId: String, uid: String, username: String, avatarUrl: String) async {
        let text = chatInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        chatInput = ""

        let messageData: [String: Any] = [
            "userId": uid,
            "username": username,
            "message": text,
            "avatarUrl": avatarUrl,
            "timestamp": FieldValue.serverTimestamp()
        ]

        do {
            try await db.collection("guilds").document(guildId)
                .collection("chat").addDocument(data: messageData)
        } catch {
            print("[Guild] Send message error: \(error)")
        }
    }

    // MARK: - Post System Message (centered, no avatar — chat events)

    func postSystemMessage(guildId: String, text: String) async {
        let data: [String: Any] = [
            "userId": "__system__",
            "username": "System",
            "message": text,
            "avatarUrl": "",
            "timestamp": FieldValue.serverTimestamp(),
            "isSystem": true,
        ]
        do {
            try await db.collection("guilds").document(guildId)
                .collection("chat").addDocument(data: data)
        } catch {
            print("[Guild] System message error: \(error)")
        }
    }

    // MARK: - Disband Guild (leader only, requires confirmation text)

    func disbandGuild(uid: String) async {
        guard let guild = currentGuild else { return }
        guard guild.ownerId == uid else { return }

        let guildId = guild.id

        do {
            // Delete subcollections (chat, challenges, wars) — batch
            let chatDocs = try await db.collection("guilds").document(guildId).collection("chat").getDocuments()
            let challengeDocs = try await db.collection("guilds").document(guildId).collection("challenges").getDocuments()
            let warDocs = try await db.collection("guilds").document(guildId).collection("wars").getDocuments()

            let batch = db.batch()
            for doc in chatDocs.documents { batch.deleteDocument(doc.reference) }
            for doc in challengeDocs.documents { batch.deleteDocument(doc.reference) }
            for doc in warDocs.documents { batch.deleteDocument(doc.reference) }
            try await batch.commit()

            // Clear guildId on all members
            for member in guild.members {
                try? await db.collection("users").document(member.userId)
                    .updateData(["guildId": FieldValue.delete()])
            }

            // Delete guild doc
            try await db.collection("guilds").document(guildId).delete()

            stop()
            currentGuild = nil
            browsing = true
            showDisbandConfirm = false
            disbandConfirmText = ""
            await fetchAvailableGuilds()
        } catch {
            print("[Guild] Disband error: \(error)")
        }
    }

    // MARK: - Internal Helpers

    private func updateMemberRole(_ member: GuildMember, newRole: String, in guild: Guild) async {
        let guildRef = db.collection("guilds").document(guild.id)

        var updatedMembers: [[String: Any]] = []
        for m in guild.members {
            var dict = memberToDict(m)
            if m.userId == member.userId {
                dict["role"] = newRole
            }
            updatedMembers.append(dict)
        }

        do {
            try await guildRef.updateData(["members": updatedMembers])
        } catch {
            print("[Guild] Role update error: \(error)")
        }
    }

    private func removeMember(_ member: GuildMember, from guild: Guild, clearGuildId: Bool) async {
        let guildRef = db.collection("guilds").document(guild.id)

        let memberDict = memberToDict(member)

        do {
            if guild.memberCount <= 1 {
                // Last member — delete guild
                try await guildRef.delete()
            } else {
                try await guildRef.updateData([
                    "members": FieldValue.arrayRemove([memberDict]),
                    "memberCount": FieldValue.increment(Int64(-1))
                ])
            }

            if clearGuildId {
                try await db.collection("users").document(member.userId)
                    .updateData(["guildId": FieldValue.delete()])
            }

            stop()
            currentGuild = nil
            browsing = true
            showLeaveConfirm = false
            await fetchAvailableGuilds()
        } catch {
            print("[Guild] Remove member error: \(error)")
        }
    }

    private func memberToDict(_ m: GuildMember) -> [String: Any] {
        [
            "userId": m.userId,
            "username": m.username,
            "avatarUrl": m.avatarUrl,
            "role": m.role,
            "joinedAt": m.joinedAt,
            "weeklyXP": m.weeklyXP
        ]
    }

    // MARK: - Parse Guild

    private static func parseGuild(id: String, data: [String: Any]) -> Guild {
        let membersRaw = data["members"] as? [[String: Any]] ?? []
        let members = membersRaw.map { m in
            GuildMember(
                userId: m["userId"] as? String ?? "",
                username: m["username"] as? String ?? "Unknown",
                avatarUrl: m["avatarUrl"] as? String ?? "",
                role: m["role"] as? String ?? "member",
                joinedAt: m["joinedAt"] as? String ?? "",
                weeklyXP: m["weeklyXP"] as? Int ?? 0
            )
        }

        return Guild(
            id: id,
            name: data["name"] as? String ?? "Unknown Guild",
            description: data["description"] as? String ?? "",
            icon: data["icon"] as? String ?? "shield.lefthalf.filled",
            level: data["level"] as? Int ?? 1,
            xp: data["xp"] as? Int ?? 0,
            ownerId: data["ownerId"] as? String ?? "",
            memberCount: data["memberCount"] as? Int ?? members.count,
            maxMembers: data["maxMembers"] as? Int ?? 30,
            isPublic: data["isPublic"] as? Bool ?? true,
            members: members
        )
    }
}
