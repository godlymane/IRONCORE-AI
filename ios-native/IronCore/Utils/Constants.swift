import Foundation

// MARK: - Levels & Leagues (must match React constants.js)

struct LevelTier {
    let name: String
    let minXP: Int
}

let LEVELS: [LevelTier] = [
    LevelTier(name: "Iron Novice", minXP: 0),
    LevelTier(name: "Bronze", minXP: 1000),
    LevelTier(name: "Silver", minXP: 2500),
    LevelTier(name: "Gold", minXP: 5000),
    LevelTier(name: "Platinum", minXP: 10000),
    LevelTier(name: "Diamond", minXP: 25000),
]

// MARK: - XP Rewards (must match React useFitnessData.js)

enum XPReward {
    static let meal = 10
    static let workout = 50
    static let progress = 20
    static let cardio = 15
    static let battleWin = 100
}

// MARK: - Exercise Database (must match React constants.js)

struct ExerciseInfo {
    let name: String
    let muscle: String
    let secondary: [String]
}

let EXERCISE_DB: [ExerciseInfo] = [
    ExerciseInfo(name: "Barbell Squat", muscle: "quads", secondary: ["glutes", "lower_back"]),
    ExerciseInfo(name: "Bench Press", muscle: "chest", secondary: ["triceps", "shoulders"]),
    ExerciseInfo(name: "Deadlift", muscle: "lower_back", secondary: ["glutes", "hamstrings"]),
    ExerciseInfo(name: "Overhead Press", muscle: "shoulders", secondary: ["triceps"]),
    ExerciseInfo(name: "Barbell Row", muscle: "upper_back", secondary: ["biceps"]),
    ExerciseInfo(name: "Pull-Up", muscle: "upper_back", secondary: ["biceps"]),
    ExerciseInfo(name: "Dumbbell Curl", muscle: "biceps", secondary: []),
    ExerciseInfo(name: "Tricep Extension", muscle: "triceps", secondary: []),
    ExerciseInfo(name: "Leg Press", muscle: "quads", secondary: ["glutes"]),
    ExerciseInfo(name: "Leg Curl", muscle: "hamstrings", secondary: []),
    ExerciseInfo(name: "Calf Raise", muscle: "calves", secondary: []),
    ExerciseInfo(name: "Lateral Raise", muscle: "shoulders", secondary: []),
    ExerciseInfo(name: "Chest Fly", muscle: "chest", secondary: []),
    ExerciseInfo(name: "Cable Row", muscle: "upper_back", secondary: ["biceps"]),
    ExerciseInfo(name: "Lat Pulldown", muscle: "upper_back", secondary: ["biceps"]),
    ExerciseInfo(name: "Romanian Deadlift", muscle: "hamstrings", secondary: ["glutes", "lower_back"]),
    ExerciseInfo(name: "Hip Thrust", muscle: "glutes", secondary: ["hamstrings"]),
    ExerciseInfo(name: "Plank", muscle: "core", secondary: []),
    ExerciseInfo(name: "Russian Twist", muscle: "core", secondary: []),
    ExerciseInfo(name: "Face Pull", muscle: "shoulders", secondary: ["upper_back"]),
    ExerciseInfo(name: "Dip", muscle: "triceps", secondary: ["chest", "shoulders"]),
]

// MARK: - Validation Limits (must match React useFitnessData.js)

enum ValidationLimits {
    static let maxWeight: Double = 2000
    static let maxReps = 1000
    static let maxMessageLength = 500
    static let maxCaptionLength = 300
    static let maxUsernameLength = 50
}

// MARK: - Premium Feature Limits

enum FeatureLimits {
    static let freeAICallsPerDay = 3
    static let freeProgressPhotos = 5
    static let freeWorkoutHistoryDays = 7
}

// MARK: - StoreKit Product IDs

enum ProductID {
    static let proMonthly = "pro_monthly"
    static let proYearly = "pro_yearly"
    static let battlePass = "battle_pass_season"

    static let all: [String] = [proMonthly, proYearly, battlePass]
    static let subscriptions: [String] = [proMonthly, proYearly]
}
