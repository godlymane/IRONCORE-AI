import Foundation
import FirebaseFirestore
import FirebaseAuth

/// Chronicle data — mirrors ChronicleView.jsx from React prototype.
/// Daily diary with date picker, summary grid, macro chart, and timeline.
@MainActor
final class ChronicleViewModel: ObservableObject {

    // MARK: - Published State

    @Published var selectedDate: String = FirestoreService.todayString()
    @Published var dataLoaded: Bool = false

    // Raw Firestore data
    @Published var allMeals: [[String: Any]] = []
    @Published var allBurned: [[String: Any]] = []
    @Published var allWorkouts: [[String: Any]] = []
    @Published var allProgress: [[String: Any]] = []

    // Delete confirmation
    @Published var pendingDelete: TimelineEntry? = nil
    @Published var showDeleteConfirm: Bool = false

    // MARK: - Private

    private let firestore = FirestoreService.shared
    private var mealsListener: ListenerRegistration?
    private var burnedListener: ListenerRegistration?
    private var workoutsListener: ListenerRegistration?
    private var progressListener: ListenerRegistration?

    private let FREE_HISTORY_DAYS = 7

    // MARK: - Timeline Entry

    struct TimelineEntry: Identifiable {
        let id: String
        let type: EntryType
        let name: String
        let detail: String
        let calories: Int
        let protein: Int
        let carbs: Int
        let fat: Int
        let timestamp: Double
        let icon: String
        let iconColor: IconColor

        enum EntryType: String {
            case meal
            case workout
            case cardio
        }

        enum IconColor {
            case water, meal, workout, cardio

            var foreground: String {
                switch self {
                case .water: return "#f59e0b"
                case .meal: return "#dc2626"
                case .workout: return "#22c55e"
                case .cardio: return "#f97316"
                }
            }

            var background: String {
                switch self {
                case .water: return "#f59e0b"
                case .meal: return "#dc2626"
                case .workout: return "#22c55e"
                case .cardio: return "#f97316"
                }
            }
        }

        var formattedTime: String {
            guard timestamp > 0 else { return "" }
            let date = Date(timeIntervalSince1970: timestamp)
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"
            return formatter.string(from: date)
        }
    }

    // MARK: - Date Generation

    /// All dates from account creation to today
    func allAvailableDates(creationTimestamp: Date?) -> [String] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let startDate: Date
        if let creation = creationTimestamp {
            startDate = calendar.startOfDay(for: creation)
        } else {
            startDate = calendar.date(byAdding: .day, value: -7, to: today) ?? today
        }

        var dates: [String] = []
        var current = startDate
        while current <= today {
            dates.append(formatter.string(from: current))
            current = calendar.date(byAdding: .day, value: 1, to: current) ?? today.addingTimeInterval(86400)
        }
        return dates
    }

    /// Filtered dates based on premium status
    func visibleDates(allDates: [String], isPremium: Bool) -> [String] {
        guard !isPremium else { return allDates }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let cutoff = Calendar.current.date(byAdding: .day, value: -FREE_HISTORY_DAYS, to: Date()) ?? Date()
        let cutoffString = formatter.string(from: cutoff)
        return allDates.filter { $0 >= cutoffString }
    }

    func hasLockedHistory(allDates: [String], isPremium: Bool) -> Bool {
        return !isPremium && allDates.count > visibleDates(allDates: allDates, isPremium: isPremium).count
    }

    /// Day label from date string
    func dayLabel(for dateStr: String) -> (weekday: String, day: Int) {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateStr) else { return ("", 0) }
        let weekday = date.formatted(.dateTime.weekday(.abbreviated)).uppercased()
        let day = Calendar.current.component(.day, from: date)
        return (weekday, day)
    }

    // MARK: - Computed Properties for Selected Date

    var dayMeals: [[String: Any]] {
        allMeals.filter { ($0["date"] as? String) == selectedDate }
    }

    var dayWorkouts: [[String: Any]] {
        allWorkouts.filter { doc in
            if let dateStr = doc["date"] as? String {
                return dateStr == selectedDate
            }
            if let ts = doc["createdAt"] as? Timestamp {
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                return formatter.string(from: ts.dateValue()) == selectedDate
            }
            return false
        }
    }

    var dayBurned: [[String: Any]] {
        allBurned.filter { ($0["date"] as? String) == selectedDate }
    }

    var dayWeight: String {
        let entry = allProgress.first { ($0["date"] as? String) == selectedDate }
        if let w = entry?["weight"] as? Double {
            return String(format: "%.1f", w)
        }
        if let w = entry?["weight"] as? Int {
            return "\(w)"
        }
        return "--"
    }

    // MARK: - Totals

    var totalCalories: Int {
        dayMeals.reduce(0) { $0 + intVal($1["calories"]) }
    }

    var totalProtein: Int {
        dayMeals.reduce(0) { $0 + intVal($1["protein"]) }
    }

    var totalCarbs: Int {
        dayMeals.reduce(0) { $0 + intVal($1["carbs"]) }
    }

    var totalFat: Int {
        dayMeals.reduce(0) { $0 + intVal($1["fat"]) }
    }

    var totalBurned: Int {
        dayBurned.reduce(0) { $0 + intVal($1["calories"]) }
    }

    var waterIntake: Int {
        dayMeals.filter { ($0["mealName"] as? String) == "Water" }.count * 250
    }

    var netCalories: Int {
        totalCalories - totalBurned
    }

    func dailyCalorieTarget(_ profile: UserProfile?) -> Int {
        profile?.dailyCalories ?? 2000
    }

    func dailyProteinTarget(_ profile: UserProfile?) -> Int {
        profile?.dailyProtein ?? 150
    }

    // MARK: - Macro Chart Data

    struct MacroBar: Identifiable {
        let id = UUID()
        let name: String
        let value: Int
        let color: String
    }

    var macroChartData: [MacroBar] {
        [
            MacroBar(name: "Protein", value: totalProtein, color: "#dc2626"),
            MacroBar(name: "Carbs", value: totalCarbs, color: "#facc15"),
            MacroBar(name: "Fats", value: totalFat, color: "#f87171")
        ]
    }

    // MARK: - Timeline

    var timeline: [TimelineEntry] {
        var entries: [TimelineEntry] = []

        for doc in dayMeals {
            let name = doc["mealName"] as? String ?? "Meal"
            let isWater = name == "Water"
            let ts = timestampValue(doc["createdAt"])

            entries.append(TimelineEntry(
                id: doc["id"] as? String ?? UUID().uuidString,
                type: .meal,
                name: name,
                detail: isWater ? "250ml" : "\(intVal(doc["calories"])) kcal  \(intVal(doc["protein"]))P \(intVal(doc["carbs"]))C \(intVal(doc["fat"]))F",
                calories: intVal(doc["calories"]),
                protein: intVal(doc["protein"]),
                carbs: intVal(doc["carbs"]),
                fat: intVal(doc["fat"]),
                timestamp: ts,
                icon: isWater ? "drop.fill" : "fork.knife",
                iconColor: isWater ? .water : .meal
            ))
        }

        for doc in dayWorkouts {
            let ts = timestampValue(doc["createdAt"])
            entries.append(TimelineEntry(
                id: doc["id"] as? String ?? UUID().uuidString,
                type: .workout,
                name: doc["name"] as? String ?? "Workout Session",
                detail: "Workout Session",
                calories: 0,
                protein: 0, carbs: 0, fat: 0,
                timestamp: ts,
                icon: "dumbbell.fill",
                iconColor: .workout
            ))
        }

        for doc in dayBurned {
            let ts = timestampValue(doc["createdAt"])
            entries.append(TimelineEntry(
                id: doc["id"] as? String ?? UUID().uuidString,
                type: .cardio,
                name: doc["activityType"] as? String ?? "Cardio",
                detail: "\(intVal(doc["calories"])) kcal  \(doc["details"] as? String ?? "")",
                calories: intVal(doc["calories"]),
                protein: 0, carbs: 0, fat: 0,
                timestamp: ts,
                icon: "flame.fill",
                iconColor: .cardio
            ))
        }

        return entries.sorted { $0.timestamp > $1.timestamp }
    }

    // MARK: - Listening

    func startListening(uid: String) {
        mealsListener = firestore.listenToMeals(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.allMeals = docs
                self?.dataLoaded = true
            }
        }

        burnedListener = firestore.listenToBurned(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.allBurned = docs
            }
        }

        workoutsListener = firestore.listenToWorkouts(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.allWorkouts = docs
            }
        }

        progressListener = firestore.listenToProgress(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.allProgress = docs
            }
        }
    }

    func stopListening() {
        mealsListener?.remove()
        burnedListener?.remove()
        workoutsListener?.remove()
        progressListener?.remove()
    }

    // MARK: - Delete Entry

    func requestDelete(_ entry: TimelineEntry) {
        pendingDelete = entry
        showDeleteConfirm = true
    }

    func confirmDelete(uid: String) async {
        guard let entry = pendingDelete else { return }
        switch entry.type {
        case .meal:
            try? await firestore.deleteMeal(uid: uid, mealId: entry.id)
        case .workout:
            try? await firestore.deleteWorkout(uid: uid, workoutId: entry.id)
        case .cardio:
            try? await firestore.deleteBurned(uid: uid, burnedId: entry.id)
        }
        pendingDelete = nil
        showDeleteConfirm = false
    }

    func cancelDelete() {
        pendingDelete = nil
        showDeleteConfirm = false
    }

    // MARK: - Helpers

    private func intVal(_ val: Any?) -> Int {
        if let i = val as? Int { return i }
        if let d = val as? Double { return Int(d) }
        if let s = val as? String { return Int(s) ?? 0 }
        return 0
    }

    private func timestampValue(_ val: Any?) -> Double {
        if let ts = val as? Timestamp {
            return ts.dateValue().timeIntervalSince1970
        }
        if let d = val as? Double { return d }
        if let i = val as? Int { return Double(i) }
        return 0
    }
}
