import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Stats / Analytics data — mirrors StatsView.jsx from React prototype.
/// Manages workouts, meals, progress, and all derived metrics:
/// league, archetype radar, discipline grid, muscle heatmap, correlation trend, achievements.
@MainActor
final class StatsViewModel: ObservableObject {
    // MARK: - Raw Data
    @Published var workouts: [[String: Any]] = []
    @Published var meals: [[String: Any]] = []
    @Published var progress: [[String: Any]] = []
    @Published var dataLoaded: Bool = false

    // MARK: - Listeners
    private let firestore = FirestoreService.shared
    private let db = Firestore.firestore()
    private var workoutsListener: ListenerRegistration?
    private var mealsListener: ListenerRegistration?
    private var progressListener: ListenerRegistration?

    // MARK: - Exercise DB (matches constants.js EXERCISE_DB)
    struct ExerciseEntry {
        let name: String
        let muscle: String
        let secondary: [String]
    }

    static let exerciseDB: [ExerciseEntry] = [
        // LEGS
        ExerciseEntry(name: "Barbell Squat", muscle: "quads", secondary: ["glutes", "lower_back"]),
        ExerciseEntry(name: "Leg Press", muscle: "quads", secondary: ["glutes"]),
        ExerciseEntry(name: "Bulgarian Split Squat", muscle: "glutes", secondary: ["quads", "hamstrings"]),
        ExerciseEntry(name: "Romanian Deadlift", muscle: "hamstrings", secondary: ["glutes", "lower_back"]),
        ExerciseEntry(name: "Leg Extension", muscle: "quads", secondary: []),
        ExerciseEntry(name: "Hamstring Curl", muscle: "hamstrings", secondary: []),
        ExerciseEntry(name: "Calf Raise", muscle: "calves", secondary: []),
        // PUSH
        ExerciseEntry(name: "Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"]),
        ExerciseEntry(name: "Incline Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"]),
        ExerciseEntry(name: "Overhead Press", muscle: "front_delts", secondary: ["triceps"]),
        ExerciseEntry(name: "Lateral Raise", muscle: "side_delts", secondary: ["traps"]),
        ExerciseEntry(name: "Tricep Extension", muscle: "triceps", secondary: []),
        ExerciseEntry(name: "Push Up", muscle: "chest", secondary: ["core", "triceps"]),
        ExerciseEntry(name: "Dips", muscle: "triceps", secondary: ["chest", "front_delts"]),
        // PULL
        ExerciseEntry(name: "Deadlift", muscle: "lower_back", secondary: ["hamstrings", "glutes", "traps"]),
        ExerciseEntry(name: "Pull Up", muscle: "lats", secondary: ["biceps", "rear_delts"]),
        ExerciseEntry(name: "Lat Pulldown", muscle: "lats", secondary: ["biceps"]),
        ExerciseEntry(name: "Barbell Row", muscle: "lats", secondary: ["lower_back", "biceps", "rear_delts"]),
        ExerciseEntry(name: "Face Pull", muscle: "rear_delts", secondary: ["traps"]),
        ExerciseEntry(name: "Dumbbell Curl", muscle: "biceps", secondary: ["forearms"]),
        ExerciseEntry(name: "Hammer Curl", muscle: "biceps", secondary: ["forearms"]),
        // CORE
        ExerciseEntry(name: "Plank", muscle: "abs", secondary: ["core"]),
        ExerciseEntry(name: "Crunches", muscle: "abs", secondary: []),
    ]

    // MARK: - League System (matches LEAGUES in StatsView.jsx)

    struct League {
        let name: String
        let minXP: Int
        let color: LeagueColor
    }

    struct LeagueColor {
        let primary: (r: Double, g: Double, b: Double)
    }

    static let leagues: [League] = [
        League(name: "Iron", minXP: 0, color: LeagueColor(primary: (156, 163, 175))),          // gray-400
        League(name: "Bronze", minXP: 1000, color: LeagueColor(primary: (194, 120, 48))),       // orange-700ish
        League(name: "Silver", minXP: 2500, color: LeagueColor(primary: (203, 213, 225))),      // slate-300
        League(name: "Gold", minXP: 5000, color: LeagueColor(primary: (250, 204, 21))),         // yellow-400
        League(name: "Platinum", minXP: 10000, color: LeagueColor(primary: (34, 211, 238))),    // cyan-400
        League(name: "Diamond", minXP: 25000, color: LeagueColor(primary: (248, 113, 113))),    // red-400
    ]

    // MARK: - Start / Stop Listening

    func startListening(uid: String) {
        workoutsListener = firestore.listenToWorkouts(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.workouts = docs
                self?.markLoaded()
            }
        }

        mealsListener = firestore.listenToMeals(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.meals = docs
                self?.markLoaded()
            }
        }

        progressListener = db.collection("users").document(uid)
            .collection("progress")
            .order(by: "createdAt", descending: true)
            .limit(to: 100)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.progress = snapshot?.documents.map { doc -> [String: Any] in
                        var data = doc.data()
                        data["id"] = doc.documentID
                        return data
                    } ?? []
                    self.markLoaded()
                }
            }
    }

    func stopListening() {
        workoutsListener?.remove()
        mealsListener?.remove()
        progressListener?.remove()
    }

    private func markLoaded() {
        if !dataLoaded { dataLoaded = true }
    }

    // MARK: - League Computed Properties

    func currentLeague(xp: Int) -> League {
        Self.leagues.last(where: { xp >= $0.minXP }) ?? Self.leagues[0]
    }

    func nextLeague(xp: Int) -> League? {
        Self.leagues.first(where: { $0.minXP > xp })
    }

    func leagueProgress(xp: Int) -> Double {
        let current = currentLeague(xp: xp)
        guard let next = nextLeague(xp: xp) else { return 100 }
        let range = Double(next.minXP - current.minXP)
        guard range > 0 else { return 100 }
        return min(Double(xp - current.minXP) / range * 100, 100)
    }

    // MARK: - Muscle Intensity Heatmap

    struct MuscleIntensity {
        var chest: Double = 0
        var lats: Double = 0
        var traps: Double = 0
        var lower_back: Double = 0
        var quads: Double = 0
        var hamstrings: Double = 0
        var calves: Double = 0
        var glutes: Double = 0
        var front_delts: Double = 0
        var side_delts: Double = 0
        var rear_delts: Double = 0
        var biceps: Double = 0
        var triceps: Double = 0
        var forearms: Double = 0
        var abs: Double = 0
        var core: Double = 0

        mutating func add(to muscle: String, value: Double) {
            switch muscle {
            case "chest": chest += value
            case "lats": lats += value
            case "traps": traps += value
            case "lower_back": lower_back += value
            case "quads": quads += value
            case "hamstrings": hamstrings += value
            case "calves": calves += value
            case "glutes": glutes += value
            case "front_delts": front_delts += value
            case "side_delts": side_delts += value
            case "rear_delts": rear_delts += value
            case "biceps": biceps += value
            case "triceps": triceps += value
            case "forearms": forearms += value
            case "abs": abs += value
            case "core": core += value
            default: break
            }
        }

        func value(for muscle: String) -> Double {
            switch muscle {
            case "chest": return chest
            case "lats": return lats
            case "traps": return traps
            case "lower_back": return lower_back
            case "quads": return quads
            case "hamstrings": return hamstrings
            case "calves": return calves
            case "glutes": return glutes
            case "front_delts": return front_delts
            case "side_delts": return side_delts
            case "rear_delts": return rear_delts
            case "biceps": return biceps
            case "triceps": return triceps
            case "forearms": return forearms
            case "abs": return abs
            case "core": return core
            default: return 0
            }
        }

        var totalHardSets: Double {
            chest + lats + traps + lower_back + quads + hamstrings +
            calves + glutes + front_delts + side_delts + rear_delts +
            biceps + triceps + forearms + abs + core
        }

        /// Tier: 0=dark, 1=gray, 2=cyan, 3=yellow, 4=orange, 5=red
        func tier(for muscle: String) -> Int {
            let score = value(for: muscle)
            if score == 0 { return 0 }
            if score < 2 { return 1 }
            if score < 5 { return 2 }
            if score < 8 { return 3 }
            if score < 12 { return 4 }
            return 5
        }
    }

    var muscleIntensity: MuscleIntensity {
        var stats = MuscleIntensity()
        for w in workouts {
            guard let exercises = w["exercises"] as? [[String: Any]] else { continue }
            for ex in exercises {
                let exName = (ex["name"] as? String ?? "").lowercased()
                let dbEntry = Self.exerciseDB.first(where: { $0.name.lowercased() == exName })
                    ?? Self.exerciseDB.first(where: { exName.contains($0.name.lowercased()) })
                guard let entry = dbEntry else { continue }
                guard let sets = ex["sets"] as? [[String: Any]] else { continue }

                var hardSets: Double = 0
                for s in sets {
                    let rpe: Double
                    if let rpeVal = s["rpe"] as? Double {
                        rpe = rpeVal
                    } else if let rpeStr = s["rpe"] as? String, let parsed = Double(rpeStr) {
                        rpe = parsed
                    } else {
                        rpe = 7
                    }
                    hardSets += max(rpe / 10, 0.5)
                }

                stats.add(to: entry.muscle, value: hardSets)
                for sec in entry.secondary {
                    stats.add(to: sec, value: hardSets * 0.5)
                }
            }
        }
        return stats
    }

    // MARK: - Discipline Grid (90-day heatmap)

    struct DisciplineDay {
        let date: String
        let score: Int   // 0=none, 1=partial, 2=perfect(green), 3=dirty(red: workout+food+within target)
    }

    func disciplineGrid(dailyTarget: Int) -> [DisciplineDay] {
        let calendar = Calendar.current
        let today = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let target = dailyTarget > 0 ? dailyTarget : 2500

        var days: [DisciplineDay] = []
        for i in stride(from: 89, through: 0, by: -1) {
            guard let d = calendar.date(byAdding: .day, value: -i, to: today) else { continue }
            let dateStr = formatter.string(from: d)

            let hasWorkout = workouts.contains { w in
                workoutDateString(w) == dateStr
            }

            let dayMeals = meals.filter { ($0["date"] as? String) == dateStr }
            let hasFood = !dayMeals.isEmpty
            let dayCals = dayMeals.reduce(0) { total, m in
                total + intValue(m["calories"])
            }

            var score = 0
            if hasWorkout && hasFood {
                let withinTarget = dayCals >= Int(Double(target) * 0.9) && dayCals <= Int(Double(target) * 1.1)
                score = withinTarget ? 3 : 2
            } else if hasWorkout || hasFood {
                score = 1
            }
            days.append(DisciplineDay(date: dateStr, score: score))
        }
        return days
    }

    // MARK: - Lifter Archetype (Radar Chart Data)

    struct ArchetypeAxis {
        let label: String
        let value: Double   // 0-100
    }

    func archetypeData(xp: Int, dailyTarget: Int) -> [ArchetypeAxis] {
        let now = Date()
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        // Consistency: % of last 30 days with a workout or meal logged
        var activeDays = Set<String>()
        for w in workouts {
            let dateStr = workoutDateString(w)
            if let d = formatter.date(from: dateStr),
               calendar.dateComponents([.day], from: d, to: now).day ?? 999 < 30 {
                activeDays.insert(dateStr)
            }
        }
        for m in meals {
            if let dateStr = m["date"] as? String,
               let d = formatter.date(from: dateStr),
               calendar.dateComponents([.day], from: d, to: now).day ?? 999 < 30 {
                activeDays.insert(dateStr)
            }
        }
        let consistency = min(100, Double(activeDays.count) / 30.0 * 100)

        // Intensity: avg RPE over last 14 days, scaled *10
        var totalRpe: Double = 0
        var rpeCount = 0
        for w in workouts {
            let dateStr = workoutDateString(w)
            if let d = formatter.date(from: dateStr),
               calendar.dateComponents([.day], from: d, to: now).day ?? 999 < 14 {
                if let exercises = w["exercises"] as? [[String: Any]] {
                    for ex in exercises {
                        if let sets = ex["sets"] as? [[String: Any]] {
                            for s in sets {
                                let rpe: Double
                                if let v = s["rpe"] as? Double { rpe = v }
                                else if let str = s["rpe"] as? String, let v = Double(str) { rpe = v }
                                else { rpe = 7 }
                                totalRpe += rpe
                                rpeCount += 1
                            }
                        }
                    }
                }
            }
        }
        let intensity = rpeCount > 0 ? min(100, (totalRpe / Double(rpeCount)) * 10) : 0

        // Discipline: % of last 14 days with both workout AND food logged (score >= 2)
        let grid = disciplineGrid(dailyTarget: dailyTarget)
        let last14 = grid.suffix(14)
        let perfectDays = last14.filter { $0.score >= 2 }.count
        let discipline = min(100, Double(perfectDays) / 14.0 * 100)

        // Frequency: workouts per week over last 28 days (5+/wk = 100)
        let last28Workouts = workouts.filter { w in
            let dateStr = workoutDateString(w)
            if let d = formatter.date(from: dateStr) {
                return (calendar.dateComponents([.day], from: d, to: now).day ?? 999) < 28
            }
            return false
        }.count
        let frequency = min(100, Double(last28Workouts) / 4.0 / 5.0 * 100)

        // Legacy: total XP scaled (25000 = Diamond = 100)
        let legacy = min(100, Double(xp) / 25000.0 * 100)

        return [
            ArchetypeAxis(label: "Consistency", value: consistency.rounded()),
            ArchetypeAxis(label: "Intensity", value: intensity.rounded()),
            ArchetypeAxis(label: "Discipline", value: discipline.rounded()),
            ArchetypeAxis(label: "Frequency", value: frequency.rounded()),
            ArchetypeAxis(label: "Legacy", value: legacy.rounded()),
        ]
    }

    // MARK: - Correlation / Trend Data (14-day chart)

    struct TrendPoint: Identifiable {
        let id = UUID()
        let dateLabel: String
        let date: String
        let score: Double       // discipline bar height (0, 50, 100)
        let weight: Double?     // body weight or nil
    }

    func trendData(dailyTarget: Int, profileWeight: Double?) -> [TrendPoint] {
        let grid = disciplineGrid(dailyTarget: dailyTarget)

        var dailyMap: [String: (height: Double, score: Int)] = [:]
        for d in grid {
            var height: Double = 0
            if d.score >= 2 { height = 100 }
            else if d.score == 1 { height = 50 }
            dailyMap[d.date] = (height, d.score)
        }

        let sortedDates = dailyMap.keys.sorted().suffix(14)
        guard let firstDateStr = sortedDates.first else { return [] }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let firstDate = formatter.date(from: firstDateStr) ?? Date()

        // Sort progress entries
        let sortedProgress = progress.sorted { a, b in
            (a["date"] as? String ?? "") < (b["date"] as? String ?? "")
        }

        // Find last known weight before chart window
        var lastKnownWeight: Double? = sortedProgress
            .filter { entry in
                if let dateStr = entry["date"] as? String, let d = formatter.date(from: dateStr) {
                    return d < firstDate && (entry["weight"] as? Double) != nil
                }
                return false
            }
            .last
            .flatMap { $0["weight"] as? Double } ?? profileWeight

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"

        var points: [TrendPoint] = []
        for dateStr in sortedDates {
            let entry = dailyMap[dateStr]!

            // Check if there is a weight log for this date
            if let progressEntry = sortedProgress.first(where: { ($0["date"] as? String) == dateStr }),
               let w = progressEntry["weight"] as? Double {
                lastKnownWeight = w
            }

            let label = formatter.date(from: dateStr).map { displayFormatter.string(from: $0) } ?? dateStr

            points.append(TrendPoint(
                dateLabel: label,
                date: dateStr,
                score: entry.height,
                weight: lastKnownWeight != nil && lastKnownWeight! > 0 ? lastKnownWeight : nil
            ))
        }
        return points
    }

    // MARK: - Achievements

    struct Achievement: Identifiable {
        let id: String
        let title: String
        let desc: String
        let icon: String         // SF Symbol name
        let unlocked: Bool
        let rarity: Rarity

        enum Rarity: String {
            case common, rare, epic, legendary
        }
    }

    func achievements(xp: Int) -> [Achievement] {
        let totalSets = muscleIntensity.totalHardSets
        return [
            Achievement(
                id: "a1", title: "First Blood", desc: "Log 1st workout",
                icon: "star.fill", unlocked: workouts.count > 0, rarity: .common
            ),
            Achievement(
                id: "a2", title: "Iron Addict", desc: "10 workouts total",
                icon: "figure.strengthtraining.traditional", unlocked: workouts.count >= 10, rarity: .rare
            ),
            Achievement(
                id: "a3", title: "Savage", desc: "50 Hard Sets",
                icon: "bolt.fill", unlocked: totalSets >= 50, rarity: .rare
            ),
            Achievement(
                id: "a4", title: "Warlord", desc: "Reach Level 5",
                icon: "medal.fill", unlocked: xp >= 5000, rarity: .epic
            ),
            Achievement(
                id: "a5", title: "God Mode", desc: "Reach 10,000 XP",
                icon: "crown.fill", unlocked: xp >= 10000, rarity: .legendary
            ),
        ]
    }

    // MARK: - Helpers

    private func workoutDateString(_ w: [String: Any]) -> String {
        if let ts = w["createdAt"] as? Timestamp {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            return formatter.string(from: ts.dateValue())
        }
        return w["date"] as? String ?? ""
    }

    private func intValue(_ val: Any?) -> Int {
        if let i = val as? Int { return i }
        if let d = val as? Double { return Int(d) }
        if let s = val as? String, let i = Int(s) { return i }
        return 0
    }
}
