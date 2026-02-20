import Foundation
import FirebaseFirestore
import FirebaseAuth
import UIKit

/// Arena system — PvP battles, matchmaking, scoring, battle history.
/// Mirrors ArenaView.jsx + arenaService.js from React prototype.
/// Battle = 24h volume war. Score = sum(weight × reps) during battle window.
@MainActor
final class ArenaViewModel: ObservableObject {

    // MARK: - Published State

    // Matchmaking
    @Published var isSearching = false
    @Published var searchProgress: Double = 0
    @Published var matchFound = false
    @Published var selectedOpponent: Opponent?

    // Active battles
    @Published var activeBattles: [Battle] = []
    @Published var pendingBattles: [Battle] = [] // incoming challenges

    // Battle history
    @Published var battleHistory: [Battle] = []

    // Results
    @Published var showResult = false
    @Published var lastResult: BattleResult?

    @Published var dataLoaded = false

    private let firestore = FirestoreService.shared
    private var pendingListener: ListenerRegistration?
    private var challengerListener: ListenerRegistration?
    private var opponentListener: ListenerRegistration?
    private var searchTimer: Timer?

    // MARK: - Data Models

    struct Opponent: Identifiable {
        let id: String
        let username: String
        let xp: Int
        let league: String
        let photoURL: String
        let todayVolume: Int
        var winProbability: Double = 50
    }

    struct Battle: Identifiable {
        let id: String
        let challenger: BattlePlayer
        let opponent: BattlePlayer
        let status: BattleStatus
        let battleType: String
        let createdAt: Date?
        let completedAt: Date?
        let winnerId: String?
    }

    struct BattlePlayer {
        let userId: String
        let username: String
        let xp: Int
    }

    enum BattleStatus: String {
        case pending
        case active
        case completed
        case declined
    }

    struct BattleResult {
        let battle: Battle
        let won: Bool
        let xpEarned: Int
        let myVolume: Int
        let opponentVolume: Int
    }

    // MARK: - Start Listening

    func startListening(uid: String) {
        // Pending battles (incoming challenges)
        pendingListener = firestore.listenToPendingBattles(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.pendingBattles = docs.compactMap { Self.parseBattle($0) }
            }
        }

        // Battles where user is challenger
        challengerListener = firestore.getUserBattles(uid: uid, limit: 20) { [weak self] docs in
            Task { @MainActor in
                guard let self else { return }
                let parsed = docs.compactMap { Self.parseBattle($0) }
                self.mergeBattles(challengerBattles: parsed)
                self.dataLoaded = true
            }
        }

        // Battles where user is opponent
        opponentListener = firestore.getUserBattlesAsOpponent(uid: uid, limit: 20) { [weak self] docs in
            Task { @MainActor in
                guard let self else { return }
                let parsed = docs.compactMap { Self.parseBattle($0) }
                self.mergeBattles(opponentBattles: parsed)
            }
        }
    }

    func stopListening() {
        pendingListener?.remove()
        challengerListener?.remove()
        opponentListener?.remove()
        searchTimer?.invalidate()
    }

    // MARK: - Parse Battle from Firestore

    private static func parseBattle(_ doc: [String: Any]) -> Battle? {
        guard let id = doc["id"] as? String else { return nil }
        let challengerData = doc["challenger"] as? [String: Any] ?? [:]
        let opponentData = doc["opponent"] as? [String: Any] ?? [:]

        let challenger = BattlePlayer(
            userId: challengerData["userId"] as? String ?? "",
            username: challengerData["username"] as? String ?? "Unknown",
            xp: (challengerData["xp"] as? Int) ?? Int(challengerData["xp"] as? Double ?? 0)
        )
        let opponent = BattlePlayer(
            userId: opponentData["userId"] as? String ?? "",
            username: opponentData["username"] as? String ?? "Unknown",
            xp: (opponentData["xp"] as? Int) ?? Int(opponentData["xp"] as? Double ?? 0)
        )

        let statusStr = doc["status"] as? String ?? "pending"
        let status = BattleStatus(rawValue: statusStr) ?? .pending

        let createdAt: Date?
        if let ts = doc["createdAt"] as? Timestamp {
            createdAt = ts.dateValue()
        } else {
            createdAt = nil
        }

        let completedAt: Date?
        if let ts = doc["completedAt"] as? Timestamp {
            completedAt = ts.dateValue()
        } else {
            completedAt = nil
        }

        return Battle(
            id: id,
            challenger: challenger,
            opponent: opponent,
            status: status,
            battleType: doc["battleType"] as? String ?? "ranked",
            createdAt: createdAt,
            completedAt: completedAt,
            winnerId: doc["winnerId"] as? String
        )
    }

    // MARK: - Merge Battle Lists

    private var _challengerBattles: [Battle] = []
    private var _opponentBattles: [Battle] = []

    private func mergeBattles(challengerBattles: [Battle]? = nil, opponentBattles: [Battle]? = nil) {
        if let cb = challengerBattles { _challengerBattles = cb }
        if let ob = opponentBattles { _opponentBattles = ob }

        let all = _challengerBattles + _opponentBattles
        // Deduplicate by ID
        var seen = Set<String>()
        var unique: [Battle] = []
        for b in all {
            if !seen.contains(b.id) {
                seen.insert(b.id)
                unique.append(b)
            }
        }

        activeBattles = unique.filter { $0.status == .active }
        battleHistory = unique
            .filter { $0.status == .completed || $0.status == .declined }
            .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }

    // MARK: - Matchmaking (find opponent from leaderboard)

    func startMatchmaking(leaderboard: [LeagueViewModel.LeaderboardEntry], userXP: Int, uid: String) {
        isSearching = true
        searchProgress = 0
        matchFound = false
        selectedOpponent = nil

        // Simulate matchmaking search with progress
        searchTimer?.invalidate()
        var ticks = 0
        searchTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] timer in
            Task { @MainActor [weak self] in
                guard let self else { timer.invalidate(); return }
                ticks += 1
                self.searchProgress = min(Double(ticks) / 25.0, 1.0) // ~2.5 seconds

                if ticks >= 25 {
                    timer.invalidate()
                    // Find suitable opponent (within XP range, not self)
                    let candidates = leaderboard.filter {
                        $0.id != uid &&
                        abs($0.xp - userXP) < max(2000, userXP / 2)
                    }

                    if let match = candidates.randomElement() {
                        let userPower = max(1, userXP)
                        let oppPower = max(1, match.xp)
                        let winProb = Double(userPower) / Double(userPower + oppPower) * 100

                        self.selectedOpponent = Opponent(
                            id: match.id,
                            username: match.username,
                            xp: match.xp,
                            league: match.league,
                            photoURL: match.photoURL,
                            todayVolume: match.todayVolume,
                            winProbability: winProb
                        )
                        self.matchFound = true
                    } else if let fallback = leaderboard.first(where: { $0.id != uid }) {
                        // No ideal match — pick closest
                        self.selectedOpponent = Opponent(
                            id: fallback.id,
                            username: fallback.username,
                            xp: fallback.xp,
                            league: fallback.league,
                            photoURL: fallback.photoURL,
                            todayVolume: fallback.todayVolume,
                            winProbability: 50
                        )
                        self.matchFound = true
                    }

                    self.isSearching = false
                    UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                }
            }
        }
    }

    func cancelMatchmaking() {
        searchTimer?.invalidate()
        isSearching = false
        searchProgress = 0
        matchFound = false
        selectedOpponent = nil
    }

    // MARK: - Challenge Player

    func challengePlayer(uid: String, username: String, userXP: Int, opponent: Opponent) async {
        let battleData: [String: Any] = [
            "challenger": [
                "userId": uid,
                "username": username,
                "xp": userXP
            ],
            "opponent": [
                "userId": opponent.id,
                "username": opponent.username,
                "xp": opponent.xp
            ],
            "status": "pending",
            "battleType": "ranked",
            "winnerId": NSNull()
        ]

        do {
            _ = try await firestore.createBattle(data: battleData)
            matchFound = false
            selectedOpponent = nil
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            print("[Arena] Failed to create battle: \(error)")
        }
    }

    // MARK: - Accept / Decline Battle

    func acceptBattle(_ battleId: String) async {
        do {
            try await firestore.updateBattle(battleId: battleId, data: [
                "status": "active",
                "acceptedAt": FieldValue.serverTimestamp()
            ])
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        } catch {
            print("[Arena] Failed to accept battle: \(error)")
        }
    }

    func declineBattle(_ battleId: String) async {
        do {
            try await firestore.updateBattle(battleId: battleId, data: [
                "status": "declined",
                "declinedAt": FieldValue.serverTimestamp()
            ])
        } catch {
            print("[Arena] Failed to decline battle: \(error)")
        }
    }

    // MARK: - Complete Battle (24h check)

    func completeBattle(_ battle: Battle, uid: String, myVolume: Int, opponentVolume: Int) async {
        let won = myVolume > opponentVolume
        let winnerId = won ? uid : (battle.challenger.userId == uid ? battle.opponent.userId : battle.challenger.userId)
        let xpReward = 100

        do {
            try await firestore.updateBattle(battleId: battle.id, data: [
                "status": "completed",
                "winnerId": winnerId,
                "completedAt": FieldValue.serverTimestamp()
            ])

            // Award XP to winner
            if won {
                try await firestore.saveProfile(uid: uid, data: [
                    "xp": FieldValue.increment(Int64(xpReward))
                ])
            }

            lastResult = BattleResult(
                battle: battle,
                won: won,
                xpEarned: won ? xpReward : 0,
                myVolume: myVolume,
                opponentVolume: opponentVolume
            )
            showResult = true
            UINotificationFeedbackGenerator().notificationOccurred(won ? .success : .warning)
        } catch {
            print("[Arena] Failed to complete battle: \(error)")
        }
    }

    // MARK: - Helpers

    func dismissResult() {
        showResult = false
        lastResult = nil
    }

    /// Time remaining in active battle (24h from creation)
    func timeRemaining(for battle: Battle) -> String {
        guard let created = battle.createdAt else { return "—" }
        let endTime = created.addingTimeInterval(24 * 3600)
        let remaining = endTime.timeIntervalSince(Date())
        if remaining <= 0 { return "Ended" }

        let hours = Int(remaining) / 3600
        let mins = (Int(remaining) % 3600) / 60
        return "\(hours)h \(mins)m"
    }
}
