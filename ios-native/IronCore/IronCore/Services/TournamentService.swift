import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Tournament data layer — translates tournamentService.js from the React prototype.
/// Firestore paths: tournaments/{tournamentId}, tournaments/{tournamentId}/participants/{uid}
final class TournamentService {
    static let shared = TournamentService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Fetch Tournaments

    /// Fetch all tournaments, optionally filtered by status
    func fetchTournaments(status: TournamentStatus? = nil) async throws -> [Tournament] {
        var q: Query = db.collection("tournaments")

        if let status = status {
            q = q.whereField("status", isEqualTo: status.rawValue)
        }

        q = q.order(by: "startDate", descending: false)

        let snapshot = try await q.getDocuments()
        return snapshot.documents.compactMap { doc in
            try? doc.data(as: Tournament.self)
        }
    }

    /// Fetch a single tournament by ID
    func fetchTournament(id: String) async throws -> Tournament? {
        let doc = try await db.collection("tournaments").document(id).getDocument()
        guard doc.exists else { return nil }
        return try doc.data(as: Tournament.self)
    }

    /// Get current active tournament (matches getCurrentTournament in JS)
    func getCurrentTournament() async throws -> Tournament? {
        // Try active first
        let activeQ = db.collection("tournaments")
            .whereField("status", isEqualTo: TournamentStatus.active.rawValue)
            .limit(to: 1)

        let activeSnapshot = try await activeQ.getDocuments()
        if let doc = activeSnapshot.documents.first {
            return try doc.data(as: Tournament.self)
        }

        // Fallback to upcoming
        let upcomingQ = db.collection("tournaments")
            .whereField("status", isEqualTo: TournamentStatus.upcoming.rawValue)
            .order(by: "startDate", descending: false)
            .limit(to: 1)

        let upcomingSnapshot = try await upcomingQ.getDocuments()
        if let doc = upcomingSnapshot.documents.first {
            return try doc.data(as: Tournament.self)
        }

        return nil
    }

    // MARK: - Real-time Listeners

    /// Listen to all tournaments in real-time
    func listenToTournaments(completion: @escaping ([Tournament]) -> Void) -> ListenerRegistration {
        return db.collection("tournaments")
            .order(by: "startDate", descending: false)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[TournamentService] Tournaments listener error: \(error)")
                    return
                }
                let tournaments = snapshot?.documents.compactMap { doc in
                    try? doc.data(as: Tournament.self)
                } ?? []
                completion(tournaments)
            }
    }

    /// Listen to a single tournament for real-time updates
    func listenToTournament(id: String, completion: @escaping (Tournament?) -> Void) -> ListenerRegistration {
        return db.collection("tournaments").document(id)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[TournamentService] Tournament \(id) listener error: \(error)")
                    return
                }
                guard let snapshot = snapshot, snapshot.exists else {
                    completion(nil)
                    return
                }
                completion(try? snapshot.data(as: Tournament.self))
            }
    }

    // MARK: - Join / Leave Tournament

    /// Join a tournament — writes to tournaments/{id}/participants/{uid}
    /// Matches joinTournament in tournamentService.js
    func joinTournament(
        tournamentId: String,
        uid: String,
        displayName: String,
        avatarEmoji: String
    ) async throws {
        let participantRef = db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .document(uid)

        let participantData: [String: Any] = [
            "uid": uid,
            "displayName": displayName,
            "avatarEmoji": avatarEmoji,
            "score": 0,
            "rank": 0,
            "joinedAt": FieldValue.serverTimestamp()
        ]

        try await participantRef.setData(participantData)

        // Increment participant count on the tournament doc
        let tournamentRef = db.collection("tournaments").document(tournamentId)
        try await tournamentRef.updateData([
            "currentParticipants": FieldValue.increment(Int64(1))
        ])
    }

    /// Leave a tournament — removes participant doc and decrements count
    func leaveTournament(tournamentId: String, uid: String) async throws {
        let participantRef = db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .document(uid)

        try await participantRef.delete()

        // Decrement participant count
        let tournamentRef = db.collection("tournaments").document(tournamentId)
        try await tournamentRef.updateData([
            "currentParticipants": FieldValue.increment(Int64(-1))
        ])
    }

    // MARK: - Leaderboard

    /// Fetch leaderboard with pagination (matches getTournamentLeaderboard in JS)
    func fetchLeaderboard(
        tournamentId: String,
        limit count: Int = 50
    ) async throws -> [TournamentParticipant] {
        let snapshot = try await db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .order(by: "score", descending: true)
            .limit(to: count)
            .getDocuments()

        return snapshot.documents.enumerated().compactMap { index, doc in
            var participant = try? doc.data(as: TournamentParticipant.self)
            participant?.rank = index + 1
            return participant
        }
    }

    /// Subscribe to leaderboard in real-time (matches subscribeToTournamentLeaderboard in JS)
    func listenToLeaderboard(
        tournamentId: String,
        limit count: Int = 50,
        completion: @escaping ([TournamentParticipant]) -> Void
    ) -> ListenerRegistration {
        return db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .order(by: "score", descending: true)
            .limit(to: count)
            .addSnapshotListener { snapshot, error in
                if let error = error {
                    print("[TournamentService] Leaderboard listener error: \(error.localizedDescription)")
                    return
                }
                let participants = snapshot?.documents.enumerated().compactMap { index, doc -> TournamentParticipant? in
                    var p = try? doc.data(as: TournamentParticipant.self)
                    p?.rank = index + 1
                    return p
                } ?? []
                completion(participants)
            }
    }

    // MARK: - Score Updates

    /// Update a participant's score (called after workouts)
    func updateScore(tournamentId: String, uid: String, scoreIncrement: Double) async throws {
        let participantRef = db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .document(uid)

        try await participantRef.updateData([
            "score": FieldValue.increment(scoreIncrement)
        ])
    }

    /// Set score to an absolute value (for recalculations)
    func setScore(tournamentId: String, uid: String, score: Double) async throws {
        let participantRef = db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .document(uid)

        try await participantRef.updateData([
            "score": score
        ])
    }

    // MARK: - User's Tournaments

    /// Check if user is a participant in a specific tournament
    func isUserJoined(tournamentId: String, uid: String) async throws -> Bool {
        let doc = try await db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .document(uid)
            .getDocument()
        return doc.exists
    }

    /// Fetch user's participation record in a tournament
    func getUserParticipation(tournamentId: String, uid: String) async throws -> TournamentParticipant? {
        let doc = try await db.collection("tournaments")
            .document(tournamentId)
            .collection("participants")
            .document(uid)
            .getDocument()
        guard doc.exists else { return nil }
        return try doc.data(as: TournamentParticipant.self)
    }

    /// Fetch all tournaments the user has joined
    /// Note: Firestore doesn't support collection group queries on subcollections easily,
    /// so we fetch all tournaments and check membership for each.
    /// For production, consider denormalizing: store joined tournament IDs on the user doc.
    func fetchUserTournaments(uid: String) async throws -> [Tournament] {
        let allTournaments = try await fetchTournaments()
        var joined: [Tournament] = []

        for tournament in allTournaments {
            guard let tid = tournament.id else { continue }
            let isJoined = try await isUserJoined(tournamentId: tid, uid: uid)
            if isJoined {
                joined.append(tournament)
            }
        }

        return joined
    }

    // MARK: - Eligibility

    /// Check if user can join a tournament
    func checkEligibility(
        tournament: Tournament,
        uid: String,
        userXP: Int
    ) async throws -> TournamentEligibility {
        // Already joined?
        let alreadyJoined = try await isUserJoined(
            tournamentId: tournament.id ?? "",
            uid: uid
        )
        if alreadyJoined {
            return .alreadyJoined
        }

        // Tournament full?
        if tournament.isFull {
            return .full
        }

        // Tournament not accepting entries?
        if tournament.status == .completed {
            return .completed
        }

        // Enough XP for entry fee?
        if userXP < tournament.entryFee {
            return .insufficientXP(required: tournament.entryFee, current: userXP)
        }

        return .eligible
    }

    // MARK: - Results (read only — Cloud Function handles prize distribution)

    /// Fetch final results after tournament ends
    func fetchResults(tournamentId: String) async throws -> [TournamentParticipant] {
        return try await fetchLeaderboard(tournamentId: tournamentId, limit: 100)
    }
}

// MARK: - Eligibility Result

enum TournamentEligibility {
    case eligible
    case alreadyJoined
    case full
    case completed
    case insufficientXP(required: Int, current: Int)

    var canJoin: Bool {
        if case .eligible = self { return true }
        return false
    }

    var message: String {
        switch self {
        case .eligible:
            return "You're eligible to join!"
        case .alreadyJoined:
            return "You've already joined this tournament."
        case .full:
            return "Tournament is full."
        case .completed:
            return "Tournament has ended."
        case .insufficientXP(let required, let current):
            return "Need \(required) XP to enter (you have \(current))."
        }
    }
}
