import Foundation
import FirebaseFirestore

/// Nutrition data — mirrors NutritionView.jsx + NutritionEnhancements.jsx
/// Manages today's meals, daily totals, water tracking, calorie burn.
@MainActor
final class NutritionViewModel: ObservableObject {

    // Daily totals (today only)
    @Published var caloriesIn: Int = 0
    @Published var protein: Int = 0
    @Published var carbs: Int = 0
    @Published var fat: Int = 0
    @Published var caloriesBurned: Int = 0

    // Today's meals
    @Published var todaysMeals: [MealEntry] = []
    @Published var waterCount: Int = 0

    // Add meal form
    @Published var showAddMeal = false
    @Published var newMealName = ""
    @Published var newMealCalories = ""
    @Published var newMealProtein = ""
    @Published var newMealCarbs = ""
    @Published var newMealFat = ""

    // Raw data
    @Published var allMeals: [[String: Any]] = []
    @Published var allBurned: [[String: Any]] = []
    @Published var dataLoaded = false

    private let firestore = FirestoreService.shared
    private var mealsListener: ListenerRegistration?
    private var burnedListener: ListenerRegistration?

    // MARK: - Parsed Meal Entry

    struct MealEntry: Identifiable {
        let id: String
        let mealName: String
        let calories: Int
        let protein: Int
        let carbs: Int
        let fat: Int
        let time: String
        let date: String

        var emoji: String {
            let lower = mealName.lowercased()
            if lower.contains("water") { return "💧" }
            if lower.contains("coffee") { return "☕" }
            if lower.contains("chicken") { return "🍗" }
            if lower.contains("egg") { return "🥚" }
            if lower.contains("protein") { return "🥤" }
            if lower.contains("rice") { return "🍚" }
            if lower.contains("shake") { return "🥤" }
            return "🍽️"
        }
    }

    // MARK: - Targets (from profile)

    func calorieTarget(_ profile: UserProfile?) -> Int { profile?.dailyCalories ?? 2000 }
    func proteinTarget(_ profile: UserProfile?) -> Int { profile?.dailyProtein ?? 150 }
    func carbsTarget(_ profile: UserProfile?) -> Int { profile?.dailyCarbs ?? 200 }
    func fatTarget(_ profile: UserProfile?) -> Int { profile?.dailyFat ?? 60 }

    var caloriesRemaining: Int { 0 } // computed per-call with profile

    func caloriesLeft(_ profile: UserProfile?) -> Int {
        max(0, calorieTarget(profile) - caloriesIn)
    }

    // MARK: - Macro Percentages (for pie chart)

    var totalMacroGrams: Int { protein + carbs + fat }

    var proteinPercent: Double {
        guard totalMacroGrams > 0 else { return 0 }
        return Double(protein) / Double(totalMacroGrams) * 100
    }

    var carbsPercent: Double {
        guard totalMacroGrams > 0 else { return 0 }
        return Double(carbs) / Double(totalMacroGrams) * 100
    }

    var fatPercent: Double {
        guard totalMacroGrams > 0 else { return 0 }
        return Double(fat) / Double(totalMacroGrams) * 100
    }

    // MARK: - Listening

    func startListening(uid: String) {
        let today = FirestoreService.todayString()

        mealsListener = firestore.listenToMeals(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.allMeals = docs
                self?.recalculate(today: today)
            }
        }

        burnedListener = firestore.listenToBurned(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.allBurned = docs
                self?.recalculate(today: today)
            }
        }
    }

    func stopListening() {
        mealsListener?.remove()
        burnedListener?.remove()
    }

    // MARK: - Recalculate

    private func recalculate(today: String) {
        // Filter meals for today
        let todayDocs = allMeals.filter { ($0["date"] as? String) == today }

        // Parse into MealEntry structs
        todaysMeals = todayDocs.compactMap { doc -> MealEntry? in
            let name = doc["mealName"] as? String ?? ""
            guard !name.isEmpty else { return nil }
            return MealEntry(
                id: doc["id"] as? String ?? UUID().uuidString,
                mealName: name,
                calories: intVal(doc["calories"]),
                protein: intVal(doc["protein"]),
                carbs: intVal(doc["carbs"]),
                fat: intVal(doc["fat"]),
                time: doc["time"] as? String ?? "",
                date: doc["date"] as? String ?? ""
            )
        }

        // Water count = meals where name is "Water"
        waterCount = todaysMeals.filter { $0.mealName == "Water" }.count

        // Daily totals (excluding water from calorie count since it's 0 anyway)
        caloriesIn = todaysMeals.reduce(0) { $0 + $1.calories }
        protein = todaysMeals.reduce(0) { $0 + $1.protein }
        carbs = todaysMeals.reduce(0) { $0 + $1.carbs }
        fat = todaysMeals.reduce(0) { $0 + $1.fat }

        // Burned today
        let todayBurned = allBurned.filter { ($0["date"] as? String) == today }
        caloriesBurned = todayBurned.reduce(0) { $0 + intVal($1["calories"]) }

        dataLoaded = true
    }

    private func intVal(_ val: Any?) -> Int {
        if let i = val as? Int { return i }
        if let d = val as? Double { return Int(d) }
        if let s = val as? String { return Int(s) ?? 0 }
        return 0
    }

    // MARK: - Add Meal (manual form)

    func addMeal(uid: String) async {
        guard !newMealName.isEmpty else { return }

        let time = {
            let f = DateFormatter()
            f.dateFormat = "HH:mm"
            return f.string(from: Date())
        }()

        try? await firestore.addMeal(uid: uid, meal: [
            "mealName": newMealName,
            "calories": Int(newMealCalories) ?? 0,
            "protein": Int(newMealProtein) ?? 0,
            "carbs": Int(newMealCarbs) ?? 0,
            "fat": Int(newMealFat) ?? 0,
            "time": time
        ])

        // Award XP (+10 for meal)
        try? await firestore.saveProfile(uid: uid, data: [
            "xp": FieldValue.increment(Int64(10))
        ])

        resetForm()
    }

    func resetForm() {
        newMealName = ""
        newMealCalories = ""
        newMealProtein = ""
        newMealCarbs = ""
        newMealFat = ""
        showAddMeal = false
    }

    // MARK: - Water

    func addWater(uid: String) async {
        try? await firestore.addMeal(uid: uid, meal: [
            "mealName": "Water",
            "calories": 0, "protein": 0, "carbs": 0, "fat": 0
        ])
    }

    // MARK: - Delete Meal

    func deleteMeal(uid: String, mealId: String) async {
        try? await firestore.deleteMeal(uid: uid, mealId: mealId)
    }
}
