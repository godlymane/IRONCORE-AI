import Foundation
import FirebaseFirestore

// MARK: - Tournament Type

enum TournamentType: String, Codable, CaseIterable {
    case solo
    case guild
    case global

    var displayName: String {
        switch self {
        case .solo: return "Solo"
        case .guild: return "Guild"
        case .global: return "Global"
        }
    }

    var icon: String {
        switch self {
        case .solo: return "person.fill"
        case .guild: return "person.3.fill"
        case .global: return "globe"
        }
    }

    var badgeColor: String {
        switch self {
        case .solo: return "#3b82f6"   // blue
        case .guild: return "#8b5cf6"  // purple
        case .global: return "#f59e0b" // amber
        }
    }
}

// MARK: - Tournament Status

enum TournamentStatus: String, Codable, CaseIterable {
    case upcoming
    case active
    case completed

    var displayName: String {
        switch self {
        case .upcoming: return "Upcoming"
        case .active: return "Live"
        case .completed: return "Completed"
        }
    }

    var icon: String {
        switch self {
        case .upcoming: return "clock.fill"
        case .active: return "bolt.fill"
        case .completed: return "checkmark.circle.fill"
        }
    }

    var color: String {
        switch self {
        case .upcoming: return "#3b82f6"   // blue
        case .active: return "#22c55e"     // green
        case .completed: return "#6b7280"  // gray
        }
    }
}

// MARK: - Tournament Metric

enum TournamentMetric: String, Codable, CaseIterable {
    case totalVolume
    case workoutCount
    case streakDays
    case xpEarned

    var displayName: String {
        switch self {
        case .totalVolume: return "Total Volume"
        case .workoutCount: return "Workout Count"
        case .streakDays: return "Streak Days"
        case .xpEarned: return "XP Earned"
        }
    }

    var icon: String {
        switch self {
        case .totalVolume: return "scalemass.fill"
        case .workoutCount: return "figure.strengthtraining.traditional"
        case .streakDays: return "flame.fill"
        case .xpEarned: return "star.fill"
        }
    }

    var unit: String {
        switch self {
        case .totalVolume: return "kg"
        case .workoutCount: return "sessions"
        case .streakDays: return "days"
        case .xpEarned: return "XP"
        }
    }
}

// MARK: - Tournament Reward

struct TournamentReward: Codable, Identifiable, Hashable {
    var id: String { "\(rankMin)-\(rankMax)-\(rewardType)" }

    let rankMin: Int
    let rankMax: Int
    let rewardType: RewardType
    let amount: Int
    let label: String?

    enum RewardType: String, Codable {
        case xp
        case powerUp
        case badge
        case title
    }

    /// Human-readable rank range: "1st", "2nd-3rd", "4th-10th"
    var rankLabel: String {
        if rankMin == rankMax {
            return ordinal(rankMin)
        }
        return "\(ordinal(rankMin))-\(ordinal(rankMax))"
    }

    /// Human-readable reward description
    var rewardLabel: String {
        if let label = label, !label.isEmpty { return label }
        switch rewardType {
        case .xp: return "\(amount) XP"
        case .powerUp: return "\(amount)x Power-Up"
        case .badge: return "Exclusive Badge"
        case .title: return "Exclusive Title"
        }
    }

    var rewardIcon: String {
        switch rewardType {
        case .xp: return "star.fill"
        case .powerUp: return "bolt.circle.fill"
        case .badge: return "shield.fill"
        case .title: return "crown.fill"
        }
    }

    var rewardColor: String {
        switch rewardType {
        case .xp: return "#ffd700"
        case .powerUp: return "#3b82f6"
        case .badge: return "#8b5cf6"
        case .title: return "#f59e0b"
        }
    }

    private func ordinal(_ n: Int) -> String {
        let suffix: String
        let ones = n % 10
        let tens = (n / 10) % 10
        if tens == 1 {
            suffix = "th"
        } else {
            switch ones {
            case 1: suffix = "st"
            case 2: suffix = "nd"
            case 3: suffix = "rd"
            default: suffix = "th"
            }
        }
        return "\(n)\(suffix)"
    }
}

// MARK: - Tournament

struct Tournament: Codable, Identifiable, Hashable {
    @DocumentID var id: String?
    let name: String
    let description: String
    let type: TournamentType
    var status: TournamentStatus
    let startDate: Date
    let endDate: Date
    let entryFee: Int               // XP cost to join
    let prizePool: Int              // Total XP in prize pool
    let maxParticipants: Int
    var currentParticipants: Int
    let rules: String
    let metric: TournamentMetric
    let rewards: [TournamentReward]
    let createdAt: Date?

    // MARK: - Computed

    var isFull: Bool { currentParticipants >= maxParticipants }

    var participantProgress: Double {
        guard maxParticipants > 0 else { return 0 }
        return min(1.0, Double(currentParticipants) / Double(maxParticipants))
    }

    /// Time remaining until end (for active) or until start (for upcoming)
    var targetDate: Date {
        status == .upcoming ? startDate : endDate
    }

    /// Seconds remaining until the target date
    var secondsRemaining: TimeInterval {
        max(0, targetDate.timeIntervalSinceNow)
    }

    /// Formatted time remaining: "2d 14h 32m" or "3h 15m"
    var timeRemainingFormatted: String {
        let total = Int(secondsRemaining)
        if total <= 0 { return "Ended" }

        let days = total / 86400
        let hours = (total % 86400) / 3600
        let minutes = (total % 3600) / 60

        if days > 0 {
            return "\(days)d \(hours)h \(minutes)m"
        } else if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    /// Short date range: "Mar 1-7"
    var dateRangeFormatted: String {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        let start = f.string(from: startDate)
        f.dateFormat = "d"
        let end = f.string(from: endDate)
        return "\(start)-\(end)"
    }

    // Hashable conformance using id
    static func == (lhs: Tournament, rhs: Tournament) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Tournament Participant

struct TournamentParticipant: Codable, Identifiable, Hashable {
    @DocumentID var id: String?    // same as uid
    let uid: String
    let displayName: String
    let avatarEmoji: String
    var score: Double
    var rank: Int
    let joinedAt: Date?

    // Hashable conformance
    static func == (lhs: TournamentParticipant, rhs: TournamentParticipant) -> Bool {
        lhs.uid == rhs.uid
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(uid)
    }

    /// Medal color for top 3
    var medalColor: String? {
        switch rank {
        case 1: return "#ffd700"   // gold
        case 2: return "#c0c0c0"   // silver
        case 3: return "#cd7f32"   // bronze
        default: return nil
        }
    }

    /// Medal icon for top 3
    var medalIcon: String? {
        switch rank {
        case 1: return "medal.fill"
        case 2: return "medal.fill"
        case 3: return "medal.fill"
        default: return nil
        }
    }
}
