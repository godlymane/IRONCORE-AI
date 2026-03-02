import Foundation
import FirebaseFirestore
import Combine

/// ViewModel for the Tournament system — drives TournamentListView and TournamentDetailView.
/// Follows MVVM pattern: @MainActor, @Published properties, async methods.
@MainActor
final class TournamentViewModel: ObservableObject {

    // MARK: - Published State

    @Published var allTournaments: [Tournament] = []
    @Published var selectedTournament: Tournament?
    @Published var leaderboard: [TournamentParticipant] = []
    @Published var userParticipation: TournamentParticipant?
    @Published var eligibility: TournamentEligibility = .eligible

    @Published var isLoading = false
    @Published var isJoining = false
    @Published var isLeaving = false
    @Published var isJoined = false

    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - Computed Properties

    var activeTournaments: [Tournament] {
        allTournaments.filter { $0.status == .active }
    }

    var upcomingTournaments: [Tournament] {
        allTournaments.filter { $0.status == .upcoming }
    }

    var completedTournaments: [Tournament] {
        allTournaments.filter { $0.status == .completed }
    }

    /// User's rank in the current leaderboard, nil if not participating
    var userRank: Int? {
        userParticipation?.rank
    }

    /// User's score in the current tournament
    var userScore: Double {
        userParticipation?.score ?? 0
    }

    /// Time remaining formatted string for the selected tournament
    var timeRemaining: String {
        selectedTournament?.timeRemainingFormatted ?? "--"
    }

    // MARK: - Private

    private let service = TournamentService.shared
    private var tournamentsListener: ListenerRegistration?
    private var tournamentListener: ListenerRegistration?
    private var leaderboardListener: ListenerRegistration?
    private var countdownTimer: Timer?
    @Published var countdownText: String = ""

    // MARK: - Lifecycle

    /// Start listening to all tournaments
    func startListening() {
        tournamentsListener?.remove()
        tournamentsListener = service.listenToTournaments { [weak self] tournaments in
            Task { @MainActor in
                self?.allTournaments = tournaments
            }
        }
    }

    /// Stop all listeners
    func stopListening() {
        tournamentsListener?.remove()
        tournamentsListener = nil
        tournamentListener?.remove()
        tournamentListener = nil
        leaderboardListener?.remove()
        leaderboardListener = nil
        stopCountdown()
    }

    deinit {
        tournamentsListener?.remove()
        tournamentListener?.remove()
        leaderboardListener?.remove()
    }

    // MARK: - Load Tournaments (one-shot)

    func loadTournaments() async {
        isLoading = true
        defer { isLoading = false }

        do {
            allTournaments = try await service.fetchTournaments()
        } catch {
            setError("Failed to load tournaments: \(error.localizedDescription)")
        }
    }

    // MARK: - Select Tournament (detail view)

    func selectTournament(_ tournament: Tournament, uid: String, userXP: Int) {
        selectedTournament = tournament
        guard let tid = tournament.id else { return }

        // Listen to tournament updates
        tournamentListener?.remove()
        tournamentListener = service.listenToTournament(id: tid) { [weak self] updated in
            Task { @MainActor in
                self?.selectedTournament = updated
            }
        }

        // Listen to leaderboard
        refreshLeaderboard(tournamentId: tid)

        // Check user status
        Task {
            await checkUserStatus(tournamentId: tid, uid: uid, userXP: userXP)
        }

        // Start countdown timer
        startCountdown()
    }

    func deselectTournament() {
        tournamentListener?.remove()
        tournamentListener = nil
        leaderboardListener?.remove()
        leaderboardListener = nil
        selectedTournament = nil
        leaderboard = []
        userParticipation = nil
        isJoined = false
        stopCountdown()
    }

    // MARK: - Leaderboard

    func refreshLeaderboard(tournamentId: String) {
        leaderboardListener?.remove()
        leaderboardListener = service.listenToLeaderboard(tournamentId: tournamentId) { [weak self] participants in
            Task { @MainActor in
                self?.leaderboard = participants
                // Update user participation from leaderboard data
                if let uid = self?.currentUID {
                    self?.userParticipation = participants.first(where: { $0.uid == uid })
                }
            }
        }
    }

    // MARK: - Join Tournament

    func joinTournament(tournamentId: String, uid: String, displayName: String, avatarEmoji: String, userXP: Int) async {
        guard !isJoining else { return }
        isJoining = true
        defer { isJoining = false }

        do {
            // Re-check eligibility
            if let tournament = selectedTournament {
                let elig = try await service.checkEligibility(
                    tournament: tournament,
                    uid: uid,
                    userXP: userXP
                )
                guard elig.canJoin else {
                    setError(elig.message)
                    return
                }
            }

            try await service.joinTournament(
                tournamentId: tournamentId,
                uid: uid,
                displayName: displayName,
                avatarEmoji: avatarEmoji
            )

            isJoined = true
            eligibility = .alreadyJoined

            // Refresh participation
            userParticipation = try await service.getUserParticipation(
                tournamentId: tournamentId,
                uid: uid
            )
        } catch {
            setError("Failed to join: \(error.localizedDescription)")
        }
    }

    // MARK: - Leave Tournament

    func leaveTournament(tournamentId: String, uid: String) async {
        guard !isLeaving else { return }
        isLeaving = true
        defer { isLeaving = false }

        do {
            try await service.leaveTournament(
                tournamentId: tournamentId,
                uid: uid
            )
            isJoined = false
            userParticipation = nil
            eligibility = .eligible
        } catch {
            setError("Failed to leave: \(error.localizedDescription)")
        }
    }

    // MARK: - Check User Status

    func checkUserStatus(tournamentId: String, uid: String, userXP: Int) async {
        do {
            let joined = try await service.isUserJoined(tournamentId: tournamentId, uid: uid)
            isJoined = joined

            if joined {
                userParticipation = try await service.getUserParticipation(
                    tournamentId: tournamentId,
                    uid: uid
                )
                eligibility = .alreadyJoined
            } else if let tournament = selectedTournament {
                eligibility = try await service.checkEligibility(
                    tournament: tournament,
                    uid: uid,
                    userXP: userXP
                )
            }
        } catch {
            print("[TournamentVM] checkUserStatus error: \(error)")
        }
    }

    // MARK: - Countdown Timer

    private func startCountdown() {
        stopCountdown()
        updateCountdown()
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateCountdown()
            }
        }
    }

    private func stopCountdown() {
        countdownTimer?.invalidate()
        countdownTimer = nil
    }

    private func updateCountdown() {
        countdownText = selectedTournament?.timeRemainingFormatted ?? "--"
    }

    // MARK: - Helpers

    private var currentUID: String? {
        FirebaseAuth.Auth.auth().currentUser?.uid
    }

    private func setError(_ message: String) {
        errorMessage = message
        showError = true
    }
}
