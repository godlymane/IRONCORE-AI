import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Profile screen — stats summary, achievements, league history, weight tracking, settings.
/// Mirrors ProfileHub.jsx + StatsView.jsx + TrackView.jsx from React prototype.
/// Data: users/{uid}/data/profile, users/{uid}/workouts, users/{uid}/meals, users/{uid}/progress
@MainActor
final class ProfileViewModel: ObservableObject {

    // MARK: - Published State

    @Published var selectedTab: ProfileTab = .overview

    // Stats
    @Published var totalWorkouts: Int = 0
    @Published var totalMeals: Int = 0
    @Published var currentStreak: Int = 0
    @Published var totalXP: Int = 0

    // Weight tracking (users/{uid}/progress)
    @Published var weightHistory: [WeightEntry] = []

    // Discipline heatmap (last 90 days)
    @Published var heatmapData: [DayScore] = []

    // Achievements
    @Published var unlockedAchievements: Set<String> = []

    // Profile completion
    @Published var completionPercent: Double = 0
    @Published var missingItems: [String] = []

    @Published var dataLoaded = false

    private let firestore = FirestoreService.shared
    private var workoutListener: ListenerRegistration?
    private var mealListener: ListenerRegistration?
    private var progressListener: ListenerRegistration?

    // MARK: - Data Models

    enum ProfileTab: String, CaseIterable, Identifiable {
        case overview = "Overview"
        case stats = "Stats"
        case achievements = "Trophies"
        case settings = "Settings"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .overview: return "person.fill"
            case .stats: return "chart.bar.fill"
            case .achievements: return "trophy.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }

    struct WeightEntry: Identifiable {
        let id: String
        let weight: Double
        let date: String
        let createdAt: Date?
    }

    struct DayScore: Identifiable {
        let id: String // date string
        let score: Int  // 0=nothing, 1=partial, 2=workout OR meal, 3=both
    }

    // MARK: - Achievement Definitions (matches achievements.js)

    struct Achievement: Identifiable {
        let id: String
        let name: String
        let description: String
        let icon: String
        let xp: Int
        let rarity: Rarity
        let category: Category

        enum Rarity: String {
            case common, uncommon, rare, epic, legendary

            var color: String {
                switch self {
                case .common: return "#9ca3af"
                case .uncommon: return "#34d399"
                case .rare: return "#ef4444"
                case .epic: return "#a855f7"
                case .legendary: return "#fbbf24"
                }
            }
        }

        enum Category: String {
            case consistency, strength, social, nutrition, milestone, special
        }
    }

    static let allAchievements: [Achievement] = [
        // Consistency
        Achievement(id: "first_workout", name: "First Rep", description: "Complete your first workout", icon: "figure.strengthtraining.traditional", xp: 50, rarity: .common, category: .consistency),
        Achievement(id: "streak_3", name: "Hat Trick", description: "3-day streak", icon: "flame", xp: 75, rarity: .common, category: .consistency),
        Achievement(id: "streak_7", name: "Iron Week", description: "7-day streak", icon: "flame.fill", xp: 150, rarity: .uncommon, category: .consistency),
        Achievement(id: "streak_14", name: "Fortnight Fury", description: "14-day streak", icon: "bolt.fill", xp: 300, rarity: .rare, category: .consistency),
        Achievement(id: "streak_30", name: "Monthly Machine", description: "30-day streak", icon: "star.fill", xp: 500, rarity: .epic, category: .consistency),
        Achievement(id: "streak_100", name: "Century Club", description: "100-day streak", icon: "crown.fill", xp: 2000, rarity: .legendary, category: .consistency),

        // Strength
        Achievement(id: "first_pr", name: "PR Hunter", description: "Set your first personal record", icon: "arrow.up.circle.fill", xp: 100, rarity: .common, category: .strength),
        Achievement(id: "volume_1k", name: "Ton Club", description: "1,000 lbs in one workout", icon: "scalemass.fill", xp: 150, rarity: .uncommon, category: .strength),
        Achievement(id: "volume_10k", name: "Iron Giant", description: "10,000 lbs in one workout", icon: "dumbbell.fill", xp: 400, rarity: .rare, category: .strength),

        // Social
        Achievement(id: "arena_first", name: "Gladiator", description: "Complete your first battle", icon: "shield.lefthalf.filled", xp: 75, rarity: .common, category: .social),
        Achievement(id: "arena_champion", name: "Champion", description: "Win 10 battles", icon: "trophy.fill", xp: 400, rarity: .rare, category: .social),
        Achievement(id: "chat_first", name: "Voice Heard", description: "Send first message", icon: "bubble.left.fill", xp: 25, rarity: .common, category: .social),
        Achievement(id: "post_first", name: "Showcase", description: "Share a progress photo", icon: "photo.fill", xp: 75, rarity: .common, category: .social),

        // Nutrition
        Achievement(id: "meal_first", name: "First Bite", description: "Log your first meal", icon: "fork.knife", xp: 25, rarity: .common, category: .nutrition),
        Achievement(id: "meal_week", name: "Meal Prepper", description: "Log meals for 7 days", icon: "calendar", xp: 150, rarity: .uncommon, category: .nutrition),
        Achievement(id: "protein_goal", name: "Protein King", description: "Hit protein goal 30 times", icon: "bolt.heart.fill", xp: 300, rarity: .rare, category: .nutrition),

        // Milestones
        Achievement(id: "workouts_10", name: "Double Digits", description: "Complete 10 workouts", icon: "10.circle.fill", xp: 100, rarity: .common, category: .milestone),
        Achievement(id: "workouts_50", name: "Fifty Strong", description: "Complete 50 workouts", icon: "50.circle.fill", xp: 300, rarity: .uncommon, category: .milestone),
        Achievement(id: "workouts_100", name: "Centurion", description: "Complete 100 workouts", icon: "figure.walk.diamond.fill", xp: 750, rarity: .rare, category: .milestone),
        Achievement(id: "xp_1000", name: "Rising Star", description: "Earn 1,000 XP", icon: "star.circle.fill", xp: 100, rarity: .common, category: .milestone),
        Achievement(id: "xp_10000", name: "Platinum Status", description: "Earn 10,000 XP", icon: "star.fill", xp: 500, rarity: .epic, category: .milestone),
    ]

    // MARK: - Start Listening

    func startListening(uid: String, profile: UserProfile?) {
        // Workouts — count + streak + heatmap data
        workoutListener = firestore.listenToWorkouts(uid: uid) { [weak self] docs in
            Task { @MainActor in
                guard let self else { return }
                self.totalWorkouts = docs.count
                self.calculateStreak(from: docs)
                self.buildHeatmap(workouts: docs, meals: nil)
                self.checkAchievements(workoutCount: docs.count, profile: profile)
                self.dataLoaded = true
            }
        }

        // Meals — count
        mealListener = firestore.listenToMeals(uid: uid) { [weak self] docs in
            Task { @MainActor in
                guard let self else { return }
                self.totalMeals = docs.count
                self.buildHeatmap(workouts: nil, meals: docs)
            }
        }

        // Progress (weight entries)
        progressListener = db.collection("users").document(uid)
            .collection("progress")
            .order(by: "createdAt", descending: true)
            .limit(to: 20)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.weightHistory = snapshot?.documents.compactMap { doc -> WeightEntry? in
                        let data = doc.data()
                        guard let weight = data["weight"] as? Double else { return nil }
                        return WeightEntry(
                            id: doc.documentID,
                            weight: weight,
                            date: data["date"] as? String ?? "",
                            createdAt: (data["createdAt"] as? Timestamp)?.dateValue()
                        )
                    } ?? []
                }
            }

        // Profile completion
        calculateCompletion(profile: profile)
        totalXP = profile?.xp ?? 0
    }

    private let db = Firestore.firestore()

    func stopListening() {
        workoutListener?.remove()
        mealListener?.remove()
        progressListener?.remove()
    }

    // MARK: - Streak Calculation (matches React useFitnessData.js)

    private func calculateStreak(from workouts: [[String: Any]]) {
        let dates = Set(workouts.compactMap { $0["date"] as? String })
        var streak = 0
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        var checkDate = Date()

        while true {
            let dateStr = formatter.string(from: checkDate)
            if dates.contains(dateStr) {
                streak += 1
                checkDate = Calendar.current.date(byAdding: .day, value: -1, to: checkDate) ?? checkDate
            } else {
                break
            }
        }
        currentStreak = streak
    }

    // MARK: - Heatmap (last 90 days — matches StatsView.jsx discipline grid)

    private var _workoutDates: Set<String> = []
    private var _mealDates: Set<String> = []

    private func buildHeatmap(workouts: [[String: Any]]?, meals: [[String: Any]]?) {
        if let workouts {
            _workoutDates = Set(workouts.compactMap { $0["date"] as? String })
        }
        if let meals {
            _mealDates = Set(meals.compactMap { $0["date"] as? String })
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        var days: [DayScore] = []

        for i in 0..<90 {
            let date = Calendar.current.date(byAdding: .day, value: -i, to: Date()) ?? Date()
            let dateStr = formatter.string(from: date)
            let hasWorkout = _workoutDates.contains(dateStr)
            let hasMeal = _mealDates.contains(dateStr)

            let score: Int
            if hasWorkout && hasMeal { score = 3 }
            else if hasWorkout || hasMeal { score = 2 }
            else { score = 0 }

            days.append(DayScore(id: dateStr, score: score))
        }
        heatmapData = days.reversed()
    }

    // MARK: - Profile Completion (matches ProfileHub.jsx)

    func calculateCompletion(profile: UserProfile?) {
        guard let p = profile else { completionPercent = 0; return }

        var checks = 0
        var missing: [String] = []

        if (p.weight ?? 0) > 0 && (p.height ?? 0) > 0 && (p.age ?? 0) > 0 {
            checks += 1
        } else { missing.append("Complete body stats") }

        if !p.goal.isEmpty { checks += 1 } else { missing.append("Set a goal") }
        if (p.dailyCalories ?? 0) > 0 { checks += 1 } else { missing.append("Calculate macros") }
        if totalWorkouts > 0 { checks += 1 } else { missing.append("Log first workout") }
        if totalMeals > 0 { checks += 1 } else { missing.append("Log first meal") }
        if !weightHistory.isEmpty { checks += 1 } else { missing.append("Track progress") }

        completionPercent = Double(checks) / 6.0
        missingItems = Array(missing.prefix(2))
    }

    // MARK: - Achievement Check

    private func checkAchievements(workoutCount: Int, profile: UserProfile?) {
        var unlocked = Set<String>()
        let xp = profile?.xp ?? 0

        // Workout milestones
        if workoutCount >= 1 { unlocked.insert("first_workout") }
        if workoutCount >= 10 { unlocked.insert("workouts_10") }
        if workoutCount >= 50 { unlocked.insert("workouts_50") }
        if workoutCount >= 100 { unlocked.insert("workouts_100") }

        // Streak
        if currentStreak >= 3 { unlocked.insert("streak_3") }
        if currentStreak >= 7 { unlocked.insert("streak_7") }
        if currentStreak >= 14 { unlocked.insert("streak_14") }
        if currentStreak >= 30 { unlocked.insert("streak_30") }
        if currentStreak >= 100 { unlocked.insert("streak_100") }

        // Meal
        if totalMeals >= 1 { unlocked.insert("meal_first") }

        // XP
        if xp >= 1000 { unlocked.insert("xp_1000") }
        if xp >= 10000 { unlocked.insert("xp_10000") }

        unlockedAchievements = unlocked
    }

    // MARK: - Computed

    var level: Int { max(1, totalXP / 500 + 1) }
    var xpInLevel: Int { totalXP % 500 }
    var xpToNext: Int { 500 }
    var levelProgress: Double { Double(xpInLevel) / Double(xpToNext) }

    var currentLeague: LeagueLevel { Leagues.level(for: totalXP) }

    var bmi: Double? {
        // Calculated from latest weight + profile height
        return nil // Calculated in view from profile data
    }
}
