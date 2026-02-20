import Foundation

/// Exercise database — exact match to src/utils/constants.js EXERCISE_DB
struct Exercise: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let muscle: String
    let secondary: [String]
}

enum ExerciseDB {
    static let all: [Exercise] = [
        // LEGS
        Exercise(name: "Barbell Squat", muscle: "quads", secondary: ["glutes", "lower_back"]),
        Exercise(name: "Leg Press", muscle: "quads", secondary: ["glutes"]),
        Exercise(name: "Bulgarian Split Squat", muscle: "glutes", secondary: ["quads", "hamstrings"]),
        Exercise(name: "Romanian Deadlift", muscle: "hamstrings", secondary: ["glutes", "lower_back"]),
        Exercise(name: "Leg Extension", muscle: "quads", secondary: []),
        Exercise(name: "Hamstring Curl", muscle: "hamstrings", secondary: []),
        Exercise(name: "Calf Raise", muscle: "calves", secondary: []),

        // PUSH (Chest/Shoulders/Tri)
        Exercise(name: "Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"]),
        Exercise(name: "Incline Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"]),
        Exercise(name: "Overhead Press", muscle: "front_delts", secondary: ["triceps", "upper_chest"]),
        Exercise(name: "Lateral Raise", muscle: "side_delts", secondary: ["traps"]),
        Exercise(name: "Tricep Extension", muscle: "triceps", secondary: []),
        Exercise(name: "Push Up", muscle: "chest", secondary: ["core", "triceps"]),
        Exercise(name: "Dips", muscle: "triceps", secondary: ["chest", "front_delts"]),

        // PULL (Back/Bi)
        Exercise(name: "Deadlift", muscle: "lower_back", secondary: ["hamstrings", "glutes", "traps"]),
        Exercise(name: "Pull Up", muscle: "lats", secondary: ["biceps", "rear_delts"]),
        Exercise(name: "Lat Pulldown", muscle: "lats", secondary: ["biceps"]),
        Exercise(name: "Barbell Row", muscle: "lats", secondary: ["lower_back", "biceps", "rear_delts"]),
        Exercise(name: "Face Pull", muscle: "rear_delts", secondary: ["traps", "rotator_cuff"]),
        Exercise(name: "Dumbbell Curl", muscle: "biceps", secondary: ["forearms"]),
        Exercise(name: "Hammer Curl", muscle: "biceps", secondary: ["forearms"]),

        // CORE
        Exercise(name: "Plank", muscle: "abs", secondary: ["core"]),
        Exercise(name: "Crunches", muscle: "abs", secondary: []),
    ]

    static let names: [String] = all.map(\.name)

    static func find(_ name: String) -> Exercise? {
        all.first { $0.name == name }
    }
}

/// League levels — matches constants.js LEVELS
struct LeagueLevel {
    let name: String
    let minXP: Int
}

enum Leagues {
    static let all: [LeagueLevel] = [
        LeagueLevel(name: "Iron Novice", minXP: 0),
        LeagueLevel(name: "Bronze", minXP: 1000),
        LeagueLevel(name: "Silver", minXP: 2500),
        LeagueLevel(name: "Gold", minXP: 5000),
        LeagueLevel(name: "Platinum", minXP: 10000),
        LeagueLevel(name: "Diamond", minXP: 25000),
    ]

    static func level(for xp: Int) -> LeagueLevel {
        all.last { xp >= $0.minXP } ?? all[0]
    }
}
