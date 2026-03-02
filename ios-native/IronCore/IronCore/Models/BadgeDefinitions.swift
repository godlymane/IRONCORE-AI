import SwiftUI

// MARK: - Badge Category

enum BadgeCategory: String, CaseIterable, Identifiable {
    case consistency = "CONSISTENCY"
    case strength = "STRENGTH"
    case social = "SOCIAL"
    case mastery = "MASTERY"
    case milestones = "MILESTONES"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .consistency: return "Consistency"
        case .strength: return "Strength"
        case .social: return "Social"
        case .mastery: return "Mastery"
        case .milestones: return "Milestones"
        }
    }

    var icon: String {
        switch self {
        case .consistency: return "\u{1F525}"   // fire
        case .strength: return "\u{1F4AA}"      // flexed bicep
        case .social: return "\u{2694}\u{FE0F}"  // crossed swords
        case .mastery: return "\u{1F9E0}"       // brain
        case .milestones: return "\u{1F48E}"    // gem
        }
    }

    var themeColor: Color {
        switch self {
        case .consistency: return Color.orange
        case .strength: return Color.ironRed
        case .social: return Color(hex: "#3b82f6")
        case .mastery: return Color(hex: "#a855f7")
        case .milestones: return Color(hex: "#06b6d4")
        }
    }
}

// MARK: - Badge Rarity

enum BadgeRarity: String, CaseIterable, Identifiable, Comparable {
    case common
    case uncommon
    case rare
    case epic
    case legendary

    var id: String { rawValue }

    var label: String {
        switch self {
        case .common: return "Common"
        case .uncommon: return "Uncommon"
        case .rare: return "Rare"
        case .epic: return "Epic"
        case .legendary: return "Legendary"
        }
    }

    var color: Color {
        switch self {
        case .common: return Color(hex: "#9ca3af")      // gray-400
        case .uncommon: return Color(hex: "#4ade80")     // green-400
        case .rare: return Color(hex: "#60a5fa")         // blue-400
        case .epic: return Color(hex: "#c084fc")         // purple-400
        case .legendary: return Color(hex: "#fbbf24")    // yellow-400
        }
    }

    var borderColor: Color {
        switch self {
        case .common: return Color(hex: "#4b5563").opacity(0.6)    // gray-600
        case .uncommon: return Color(hex: "#16a34a").opacity(0.4)  // green-600
        case .rare: return Color(hex: "#3b82f6").opacity(0.4)      // blue-500
        case .epic: return Color(hex: "#a855f7").opacity(0.4)      // purple-500
        case .legendary: return Color(hex: "#eab308").opacity(0.4) // yellow-500
        }
    }

    var bgColor: Color {
        switch self {
        case .common: return Color(hex: "#1f2937").opacity(0.5)    // gray-800
        case .uncommon: return Color(hex: "#14532d").opacity(0.2)  // green-900
        case .rare: return Color(hex: "#1e3a5f").opacity(0.2)      // blue-900
        case .epic: return Color(hex: "#3b0764").opacity(0.2)      // purple-900
        case .legendary: return Color(hex: "#713f12").opacity(0.2) // yellow-900
        }
    }

    var glowRadius: CGFloat {
        switch self {
        case .common: return 0
        case .uncommon: return 0
        case .rare: return 6
        case .epic: return 10
        case .legendary: return 16
        }
    }

    private var sortOrder: Int {
        switch self {
        case .common: return 0
        case .uncommon: return 1
        case .rare: return 2
        case .epic: return 3
        case .legendary: return 4
        }
    }

    static func < (lhs: BadgeRarity, rhs: BadgeRarity) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}

// MARK: - User Badge Data

/// Aggregated user stats for client-side badge checking.
/// Populated from Firestore collections without any extra writes.
struct UserBadgeData {
    var workoutCount: Int = 0
    var currentStreak: Int = 0
    var longestStreak: Int = 0
    var level: Int = 1
    var totalVolume: Double = 0
    var bestFormScore: Double = 0
    var battlesWon: Int = 0
    var bossesContributed: Int = 0
    var followersCount: Int = 0
    var mealCount: Int = 0
    var photoCount: Int = 0
    var progressCount: Int = 0
    var league: String = ""
    var xp: Int = 0
}

// MARK: - Badge Definition

struct BadgeDefinition: Identifiable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let category: BadgeCategory
    let rarity: BadgeRarity
    let check: (UserBadgeData) -> Bool
}

// MARK: - All Badges

/// 21 hardcoded badges — mirrors badgeDefinitions.js from the React prototype.
/// Unlock status is computed client-side against UserBadgeData. No Firestore writes needed.
struct BadgeRegistry {

    static let all: [BadgeDefinition] = [

        // CONSISTENCY (5)

        BadgeDefinition(
            id: "first_blood",
            name: "First Blood",
            description: "Log your first workout",
            icon: "\u{1FA78}",        // drop of blood
            category: .consistency,
            rarity: .common,
            check: { $0.workoutCount >= 1 }
        ),
        BadgeDefinition(
            id: "iron_will",
            name: "Iron Will",
            description: "Maintain a 7-day streak",
            icon: "\u{1F525}",        // fire
            category: .consistency,
            rarity: .uncommon,
            check: { $0.currentStreak >= 7 || $0.longestStreak >= 7 }
        ),
        BadgeDefinition(
            id: "unbreakable",
            name: "Unbreakable",
            description: "Maintain a 30-day streak",
            icon: "\u{26D3}\u{FE0F}", // chains
            category: .consistency,
            rarity: .rare,
            check: { $0.longestStreak >= 30 }
        ),
        BadgeDefinition(
            id: "eternal_flame",
            name: "Eternal Flame",
            description: "Maintain a 100-day streak",
            icon: "\u{1F30B}",        // volcano
            category: .consistency,
            rarity: .legendary,
            check: { $0.longestStreak >= 100 }
        ),
        BadgeDefinition(
            id: "centurion",
            name: "Centurion",
            description: "Complete 100 workouts",
            icon: "\u{1F3DB}\u{FE0F}", // classical building
            category: .consistency,
            rarity: .epic,
            check: { $0.workoutCount >= 100 }
        ),

        // STRENGTH (5)

        BadgeDefinition(
            id: "iron_starter",
            name: "Iron Starter",
            description: "Reach Level 5",
            icon: "\u{26A1}",         // lightning
            category: .strength,
            rarity: .common,
            check: { $0.level >= 5 }
        ),
        BadgeDefinition(
            id: "forged",
            name: "Forged in Fire",
            description: "Reach Level 10",
            icon: "\u{1F528}",        // hammer
            category: .strength,
            rarity: .uncommon,
            check: { $0.level >= 10 }
        ),
        BadgeDefinition(
            id: "titan",
            name: "Titan",
            description: "Reach Level 25",
            icon: "\u{1F5FF}",        // moai
            category: .strength,
            rarity: .epic,
            check: { $0.level >= 25 }
        ),
        BadgeDefinition(
            id: "volume_king",
            name: "Volume King",
            description: "Lift 100,000 kg total volume",
            icon: "\u{1F451}",        // crown
            category: .strength,
            rarity: .legendary,
            check: { $0.totalVolume >= 100_000 }
        ),
        BadgeDefinition(
            id: "perfect_form",
            name: "Perfect Form",
            description: "Score 95%+ in AI form correction",
            icon: "\u{1F3AF}",        // bullseye
            category: .strength,
            rarity: .rare,
            check: { $0.bestFormScore >= 95 }
        ),

        // SOCIAL (5)

        BadgeDefinition(
            id: "gladiator",
            name: "Gladiator",
            description: "Win your first PvP battle",
            icon: "\u{2694}\u{FE0F}", // crossed swords
            category: .social,
            rarity: .common,
            check: { $0.battlesWon >= 1 }
        ),
        BadgeDefinition(
            id: "champion",
            name: "Champion",
            description: "Win 10 PvP battles",
            icon: "\u{1F3C6}",        // trophy
            category: .social,
            rarity: .rare,
            check: { $0.battlesWon >= 10 }
        ),
        BadgeDefinition(
            id: "warlord",
            name: "Warlord",
            description: "Win 50 PvP battles",
            icon: "\u{1F6E1}\u{FE0F}", // shield
            category: .social,
            rarity: .epic,
            check: { $0.battlesWon >= 50 }
        ),
        BadgeDefinition(
            id: "boss_slayer",
            name: "Boss Slayer",
            description: "Deal damage to a Community Boss",
            icon: "\u{1F409}",        // dragon
            category: .social,
            rarity: .uncommon,
            check: { $0.bossesContributed >= 1 }
        ),
        BadgeDefinition(
            id: "recruiter",
            name: "Recruiter",
            description: "Have 5 followers",
            icon: "\u{1F4E2}",        // loudspeaker
            category: .social,
            rarity: .uncommon,
            check: { $0.followersCount >= 5 }
        ),

        // MASTERY (3)

        BadgeDefinition(
            id: "nutritionist",
            name: "Nutritionist",
            description: "Log 100 meals",
            icon: "\u{1F957}",        // green salad
            category: .mastery,
            rarity: .rare,
            check: { $0.mealCount >= 100 }
        ),
        BadgeDefinition(
            id: "photographer",
            name: "Photographer",
            description: "Take 10 progress photos",
            icon: "\u{1F4F8}",        // camera with flash
            category: .mastery,
            rarity: .uncommon,
            check: { $0.photoCount >= 10 }
        ),
        BadgeDefinition(
            id: "data_driven",
            name: "Data Driven",
            description: "Log weight 30 times",
            icon: "\u{1F4CA}",        // bar chart
            category: .mastery,
            rarity: .rare,
            check: { $0.progressCount >= 30 }
        ),

        // MILESTONES (3)

        BadgeDefinition(
            id: "diamond_league",
            name: "Diamond League",
            description: "Reach Diamond league tier",
            icon: "\u{1F48E}",        // gem
            category: .milestones,
            rarity: .legendary,
            check: { $0.league.lowercased().contains("diamond") }
        ),
        BadgeDefinition(
            id: "xp_hoarder",
            name: "XP Hoarder",
            description: "Earn 50,000 total XP",
            icon: "\u{1F4B0}",        // money bag
            category: .milestones,
            rarity: .epic,
            check: { $0.xp >= 50_000 }
        ),
        BadgeDefinition(
            id: "ten_k",
            name: "10K Club",
            description: "Earn 10,000 XP",
            icon: "\u{1F396}\u{FE0F}", // military medal
            category: .milestones,
            rarity: .rare,
            check: { $0.xp >= 10_000 }
        ),
    ]

    // MARK: - Queries

    static var totalCount: Int { all.count }

    static func badges(for category: BadgeCategory) -> [BadgeDefinition] {
        all.filter { $0.category == category }
    }

    static func badge(byId id: String) -> BadgeDefinition? {
        all.first { $0.id == id }
    }

    static func unlockedBadges(data: UserBadgeData) -> [BadgeDefinition] {
        all.filter { $0.check(data) }
    }

    static func lockedBadges(data: UserBadgeData) -> [BadgeDefinition] {
        all.filter { !$0.check(data) }
    }

    static func unlockedSet(data: UserBadgeData) -> Set<String> {
        Set(all.compactMap { $0.check(data) ? $0.id : nil })
    }

    static func unlockProgress(data: UserBadgeData) -> (unlocked: Int, total: Int, percent: Int) {
        let unlocked = unlockedBadges(data: data).count
        let total = all.count
        let percent = total > 0 ? Int(round(Double(unlocked) / Double(total) * 100)) : 0
        return (unlocked, total, percent)
    }

    static func rarityBreakdown(data: UserBadgeData) -> [(rarity: BadgeRarity, unlocked: Int, total: Int)] {
        let set = unlockedSet(data: data)
        return BadgeRarity.allCases.map { rarity in
            let rarityBadges = all.filter { $0.rarity == rarity }
            let unlockedCount = rarityBadges.filter { set.contains($0.id) }.count
            return (rarity, unlockedCount, rarityBadges.count)
        }
    }
}
