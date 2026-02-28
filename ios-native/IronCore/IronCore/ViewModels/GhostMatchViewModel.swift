import Foundation

/// Ghost Match — async PvP against AI-generated opponents.
/// Mirrors GhostMatchView.jsx from React prototype.
/// Pure client-side simulation — no Firestore persistence.
@MainActor
final class GhostMatchViewModel: ObservableObject {

    // MARK: - Published State

    @Published var matchState: MatchState = .lobby
    @Published var ghost: GhostOpponent?
    @Published var playerStats = MatchStats()
    @Published var ghostStats = MatchStats()
    @Published var matchResult: MatchResult?
    @Published var matchTimer: Int = 0
    @Published var isSearching = false

    private var timerTask: Task<Void, Never>?

    // MARK: - Models

    enum MatchState {
        case lobby, searching, active, result
    }

    enum MatchResult {
        case victory, defeat

        var title: String {
            switch self {
            case .victory: return "VICTORY"
            case .defeat: return "DEFEAT"
            }
        }

        var icon: String {
            switch self {
            case .victory: return "trophy.fill"
            case .defeat: return "xmark.shield.fill"
            }
        }

        var color: String {
            switch self {
            case .victory: return "#22c55e"
            case .defeat: return "#ef4444"
            }
        }

        var xpReward: Int {
            switch self {
            case .victory: return 150
            case .defeat: return 25
            }
        }
    }

    struct GhostOpponent {
        let username: String
        let level: Int
        let exercises: [GhostExercise]
    }

    struct GhostExercise {
        let name: String
        let sets: Int
        let reps: Int
        let weight: Double
        let formScore: Int
    }

    struct MatchStats {
        var formScore: Int = 0
        var totalVolume: Double = 0
        var totalReps: Int = 0
    }

    // MARK: - Ghost Names (matches React GhostMatchView.jsx)

    private static let ghostNames = [
        "PhantomLift", "IronGhost", "ShadowRep", "SpecterPR", "GhostGains",
        "WreakHavoc", "SilentIron", "DarkVolume", "NightLifter", "VoidPress"
    ]

    private static let ghostExercises = [
        "Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row",
        "Pull-Up", "Dumbbell Curl", "Tricep Extension", "Leg Press", "Lat Pulldown"
    ]

    // MARK: - Find Match

    func findMatch(userLevel: Int) {
        isSearching = true
        matchState = .searching

        // Simulate matchmaking delay
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds

            let ghostLevel = max(1, userLevel + Int.random(in: -2...2))

            let exerciseCount = Int.random(in: 4...6)
            let exercises = (0..<exerciseCount).map { _ -> GhostExercise in
                let name = Self.ghostExercises.randomElement() ?? "Bench Press"
                let sets = Int.random(in: 3...5)
                let reps = Int.random(in: 6...15)
                let weight = Double(Int.random(in: 20...120))
                let formScore = min(95, 55 + ghostLevel * 3 + Int.random(in: 0...10))
                return GhostExercise(name: name, sets: sets, reps: reps, weight: weight, formScore: formScore)
            }

            ghost = GhostOpponent(
                username: Self.ghostNames.randomElement() ?? "GhostGains",
                level: ghostLevel,
                exercises: exercises
            )

            // Calculate ghost stats
            let totalVolume = exercises.reduce(0.0) { $0 + (Double($1.sets) * Double($1.reps) * $1.weight) }
            let totalReps = exercises.reduce(0) { $0 + ($1.sets * $1.reps) }
            let avgForm = exercises.reduce(0) { $0 + $1.formScore } / max(1, exercises.count)

            ghostStats = MatchStats(formScore: avgForm, totalVolume: totalVolume, totalReps: totalReps)

            isSearching = false
            matchState = .active
            startTimer()
        }
    }

    // MARK: - Start Timer

    private func startTimer() {
        matchTimer = 0
        timerTask = Task {
            for i in 1...8 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                matchTimer = i

                // Gradually reveal player stats (simulate workout analysis)
                let progress = Double(i) / 8.0
                playerStats.formScore = Int(Double(Int.random(in: 65...95)) * progress)
                playerStats.totalVolume = Double(Int.random(in: 500...3000)) * progress
                playerStats.totalReps = Int(Double(Int.random(in: 20...80)) * progress)
            }

            // Final stats
            playerStats.formScore = Int.random(in: 65...95)
            playerStats.totalVolume = Double(Int.random(in: 800...3000))
            playerStats.totalReps = Int.random(in: 30...80)

            // Determine winner
            var playerWins = 0
            if playerStats.formScore >= ghostStats.formScore { playerWins += 1 }
            if playerStats.totalVolume >= ghostStats.totalVolume { playerWins += 1 }
            if playerStats.totalReps >= ghostStats.totalReps { playerWins += 1 }

            matchResult = playerWins >= 2 ? .victory : .defeat
            matchState = .result
        }
    }

    // MARK: - Rematch

    func rematch(userLevel: Int) {
        timerTask?.cancel()
        matchResult = nil
        ghost = nil
        playerStats = MatchStats()
        ghostStats = MatchStats()
        matchTimer = 0
        findMatch(userLevel: userLevel)
    }

    // MARK: - Back to Lobby

    func backToLobby() {
        timerTask?.cancel()
        matchState = .lobby
        matchResult = nil
        ghost = nil
        playerStats = MatchStats()
        ghostStats = MatchStats()
        matchTimer = 0
    }
}
