import Foundation
import FirebaseFirestore
import FirebaseAuth

/// League system — tier progression, leaderboard, promotion/demotion.
/// Mirrors League logic from ArenaView.jsx + constants.js LEVELS.
@MainActor
final class LeagueViewModel: ObservableObject {

    // MARK: - Published State

    // Current user tier
    @Published var currentTier: LeagueLevel = Leagues.all[0]
    @Published var nextTier: LeagueLevel? = Leagues.all[1]
    @Published var userXP: Int = 0
    @Published var progressToNext: Double = 0 // 0.0 - 1.0

    // Leaderboard
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var userRank: Int = 0
    @Published var dataLoaded = false

    // Promotion/Demotion animation
    @Published var showPromotion = false
    @Published var promotedTo: LeagueLevel?
    @Published var previousTier: LeagueLevel?

    private let firestore = FirestoreService.shared
    private var leaderboardListener: ListenerRegistration?
    private var profileListener: ListenerRegistration?

    // MARK: - Leaderboard Entry

    struct LeaderboardEntry: Identifiable {
        let id: String // userId
        let username: String
        let xp: Int
        let league: String
        let photoURL: String
        let todayVolume: Int
        var rank: Int
    }

    // MARK: - Start Listening

    func startListening(uid: String) {
        // Listen to leaderboard (top 50)
        leaderboardListener = firestore.listenToLeaderboard(limit: 50) { [weak self] docs in
            Task { @MainActor in
                guard let self else { return }
                self.leaderboard = docs.enumerated().map { idx, doc in
                    LeaderboardEntry(
                        id: doc["userId"] as? String ?? "",
                        username: doc["username"] as? String ?? "Unknown",
                        xp: (doc["xp"] as? Int) ?? Int(doc["xp"] as? Double ?? 0),
                        league: doc["league"] as? String ?? "Iron Novice",
                        photoURL: doc["photoURL"] as? String ?? doc["avatarUrl"] as? String ?? "",
                        todayVolume: (doc["todayVolume"] as? Int) ?? Int(doc["todayVolume"] as? Double ?? 0),
                        rank: idx + 1
                    )
                }

                // Find user rank
                if let userIdx = self.leaderboard.firstIndex(where: { $0.id == uid }) {
                    self.userRank = userIdx + 1
                }
                self.dataLoaded = true
            }
        }

        // Listen to profile for XP changes (tier promotion detection)
        profileListener = firestore.listenToProfile(uid: uid) { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                if case .success(let profile) = result, let profile = profile {
                    let newXP = profile.xp ?? 0
                    let oldTier = self.currentTier
                    let newTier = Leagues.level(for: newXP)

                    // Detect promotion
                    if newXP > self.userXP && newTier.minXP > oldTier.minXP {
                        self.previousTier = oldTier
                        self.promotedTo = newTier
                        self.showPromotion = true
                    }

                    self.userXP = newXP
                    self.currentTier = newTier
                    self.calculateProgress()
                }
            }
        }
    }

    func stopListening() {
        leaderboardListener?.remove()
        profileListener?.remove()
    }

    // MARK: - Tier Progress Calculation

    private func calculateProgress() {
        let currentMin = currentTier.minXP
        let allTiers = Leagues.all
        guard let currentIdx = allTiers.firstIndex(where: { $0.minXP == currentMin }) else {
            progressToNext = 1.0
            nextTier = nil
            return
        }

        let nextIdx = currentIdx + 1
        if nextIdx < allTiers.count {
            let next = allTiers[nextIdx]
            nextTier = next
            let range = next.minXP - currentMin
            let progress = userXP - currentMin
            progressToNext = range > 0 ? min(Double(progress) / Double(range), 1.0) : 1.0
        } else {
            // Already at Diamond (max tier)
            nextTier = nil
            progressToNext = 1.0
        }
    }

    // MARK: - Tier Metadata

    static func tierColor(for name: String) -> (primary: String, bg: String) {
        switch name {
        case "Iron Novice": return ("#9ca3af", "#9ca3af") // gray
        case "Bronze":      return ("#cd7f32", "#cd7f32") // bronze
        case "Silver":      return ("#c0c0c0", "#c0c0c0") // silver
        case "Gold":        return ("#ffd700", "#ffd700") // gold
        case "Platinum":    return ("#06b6d4", "#06b6d4") // cyan
        case "Diamond":     return ("#a855f7", "#a855f7") // purple
        default:            return ("#9ca3af", "#9ca3af")
        }
    }

    static func tierIcon(for name: String) -> String {
        switch name {
        case "Iron Novice": return "shield"
        case "Bronze":      return "shield.lefthalf.filled"
        case "Silver":      return "shield.fill"
        case "Gold":        return "crown"
        case "Platinum":    return "crown.fill"
        case "Diamond":     return "diamond.fill"
        default:            return "shield"
        }
    }

    // MARK: - Dismiss Promotion

    func dismissPromotion() {
        showPromotion = false
        promotedTo = nil
        previousTier = nil
    }
}
