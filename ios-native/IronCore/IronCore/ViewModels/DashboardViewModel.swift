import Foundation
import FirebaseFirestore
import FirebaseAuth
import FirebaseFunctions

/// Dashboard data — mirrors DashboardView.jsx from React prototype.
/// Manages meals, burned, workouts, streaks, and daily calculations.
@MainActor
final class DashboardViewModel: ObservableObject {
    // Daily totals
    @Published var caloriesIn: Int = 0
    @Published var caloriesOut: Int = 0
    @Published var protein: Int = 0
    @Published var carbs: Int = 0
    @Published var fat: Int = 0
    @Published var todaysWorkoutCount: Int = 0

    // Streak
    @Published var streak: Int = 0

    // AI food logging
    @Published var mealText: String = ""
    @Published var aiStatus: String = ""
    @Published var showManualEntry: Bool = false

    // AI Data Consent (Apple Nov 2025 guideline — explicit consent before callGemini)
    @Published var showAIConsentDialog: Bool = false
    @Published var aiConsentGranted: Bool = UserDefaults.standard.bool(forKey: "ironai_ai_data_consent")
    private var pendingSpotMacrosUID: String?

    // Daily drop
    @Published var dailyDropCompleted: Bool = false

    // Raw data
    @Published var meals: [[String: Any]] = []
    @Published var burned: [[String: Any]] = []
    @Published var workouts: [[String: Any]] = []

    @Published var dataLoaded: Bool = false

    private let firestore = FirestoreService.shared
    private var mealsListener: ListenerRegistration?
    private var burnedListener: ListenerRegistration?
    private var workoutsListener: ListenerRegistration?

    // MARK: - Daily Targets (from profile, with defaults)

    func dailyCalorieTarget(profile: UserProfile?) -> Int {
        profile?.dailyCalories ?? 2000
    }

    func dailyProteinTarget(profile: UserProfile?) -> Int {
        profile?.dailyProtein ?? 150
    }

    func dailyCarbsTarget(profile: UserProfile?) -> Int {
        profile?.dailyCarbs ?? 200
    }

    func dailyFatTarget(profile: UserProfile?) -> Int {
        profile?.dailyFat ?? 60
    }

    var netCalories: Int {
        max(0, caloriesIn - caloriesOut)
    }

    func calorieProgress(profile: UserProfile?) -> Double {
        let target = Double(dailyCalorieTarget(profile: profile))
        guard target > 0 else { return 0 }
        return min(Double(netCalories) / target * 100, 100)
    }

    func proteinProgress(profile: UserProfile?) -> Double {
        let target = Double(dailyProteinTarget(profile: profile))
        guard target > 0 else { return 0 }
        return min(Double(protein) / target * 100, 100)
    }

    // MARK: - Daily Drop

    struct DailyDrop {
        let text: String
        let xp: Int
        let emoji: String
    }

    static let challenges: [DailyDrop] = [
        DailyDrop(text: "50 Pushups", xp: 300, emoji: "💪"),
        DailyDrop(text: "30 Min Run", xp: 400, emoji: "🏃"),
        DailyDrop(text: "100 Air Squats", xp: 350, emoji: "🦵"),
        DailyDrop(text: "No Sugar Today", xp: 500, emoji: "🚫"),
        DailyDrop(text: "2min Plank", xp: 250, emoji: "🧘"),
    ]

    var todaysDailyDrop: DailyDrop {
        let dayOfMonth = Calendar.current.component(.day, from: Date())
        return Self.challenges[dayOfMonth % Self.challenges.count]
    }

    // MARK: - Motivation

    struct Quote {
        let text: String
        let author: String
    }

    static let quotes: [Quote] = [
        Quote(text: "The only bad workout is the one that didn't happen.", author: "Unknown"),
        Quote(text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown"),
        Quote(text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger"),
        Quote(text: "Don't count the days, make the days count.", author: "Muhammad Ali"),
        Quote(text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson"),
        Quote(text: "The only way to define your limits is by going beyond them.", author: "Arthur C. Clarke"),
    ]

    var todaysQuote: Quote {
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
        return Self.quotes[dayOfYear % Self.quotes.count]
    }

    // MARK: - Start Listening

    func startListening(uid: String) {
        let today = FirestoreService.todayString()

        mealsListener = firestore.listenToMeals(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.meals = docs
                self?.recalculate(today: today)
            }
        }

        burnedListener = firestore.listenToBurned(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.burned = docs
                self?.recalculate(today: today)
            }
        }

        workoutsListener = firestore.listenToWorkouts(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.workouts = docs
                self?.recalculate(today: today)
            }
        }
    }

    func stopListening() {
        mealsListener?.remove()
        burnedListener?.remove()
        workoutsListener?.remove()
    }

    // MARK: - Recalculate Daily Totals

    private func recalculate(today: String) {
        // Filter meals for today
        let todaysMeals = meals.filter { ($0["date"] as? String) == today }
        caloriesIn = todaysMeals.reduce(0) { $0 + (($1["calories"] as? Int) ?? Int(($1["calories"] as? Double) ?? 0)) }
        protein = todaysMeals.reduce(0) { $0 + (($1["protein"] as? Int) ?? Int(($1["protein"] as? Double) ?? 0)) }
        carbs = todaysMeals.reduce(0) { $0 + (($1["carbs"] as? Int) ?? Int(($1["carbs"] as? Double) ?? 0)) }
        fat = todaysMeals.reduce(0) { $0 + (($1["fat"] as? Int) ?? Int(($1["fat"] as? Double) ?? 0)) }

        // Filter burned for today
        let todaysBurned = burned.filter { ($0["date"] as? String) == today }
        caloriesOut = todaysBurned.reduce(0) { $0 + (($1["calories"] as? Int) ?? Int(($1["calories"] as? Double) ?? 0)) }

        // Count today's workouts
        todaysWorkoutCount = workouts.filter { ($0["date"] as? String) == today }.count

        // Calculate streak
        calculateStreak()

        dataLoaded = true
    }

    private func calculateStreak() {
        let mealDates = Set(meals.compactMap { $0["date"] as? String })
        let sorted = mealDates.sorted().reversed()
        let today = FirestoreService.todayString()
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        var count = 0
        var checkDate = formatter.date(from: today) ?? Date()

        // If no meals today, start from yesterday
        if !mealDates.contains(today) {
            checkDate = calendar.date(byAdding: .day, value: -1, to: checkDate) ?? checkDate
        }

        for _ in 0..<365 {
            let dateStr = formatter.string(from: checkDate)
            if mealDates.contains(dateStr) {
                count += 1
                checkDate = calendar.date(byAdding: .day, value: -1, to: checkDate) ?? checkDate
            } else {
                break
            }
        }

        streak = count
    }

    // MARK: - Quick Log Actions

    func logWater(uid: String) async {
        try? await firestore.addMeal(uid: uid, meal: [
            "mealName": "Water",
            "calories": 0, "protein": 0, "carbs": 0, "fat": 0
        ])
    }

    func logProteinShake(uid: String) async {
        try? await firestore.addMeal(uid: uid, meal: [
            "mealName": "Protein Shake",
            "calories": 120, "protein": 25, "carbs": 3, "fat": 1
        ])
    }

    func logEggs(uid: String) async {
        try? await firestore.addMeal(uid: uid, meal: [
            "mealName": "2 Whole Eggs",
            "calories": 155, "protein": 13, "carbs": 1, "fat": 11
        ])
    }

    func logChicken(uid: String) async {
        try? await firestore.addMeal(uid: uid, meal: [
            "mealName": "Chicken Breast 150g",
            "calories": 247, "protein": 46, "carbs": 0, "fat": 5
        ])
    }

    // MARK: - AI Data Consent (Apple App Review requirement — Nov 2025 guideline)

    /// Gate: must be called before any callGemini invocation.
    /// If consent not yet granted, shows dialog and defers the call.
    func requestSpotMacros(uid: String) {
        guard !mealText.isEmpty else { return }
        if aiConsentGranted {
            Task { await spotMacros(uid: uid) }
        } else {
            pendingSpotMacrosUID = uid
            showAIConsentDialog = true
        }
    }

    func grantAIConsent() {
        aiConsentGranted = true
        UserDefaults.standard.set(true, forKey: "ironai_ai_data_consent")
        showAIConsentDialog = false
        if let uid = pendingSpotMacrosUID {
            pendingSpotMacrosUID = nil
            Task { await spotMacros(uid: uid) }
        }
    }

    func denyAIConsent() {
        showAIConsentDialog = false
        pendingSpotMacrosUID = nil
    }

    // MARK: - AI Food Logging (calls callGemini Cloud Function)

    /// Private — always called through requestSpotMacros which enforces consent.
    private func spotMacros(uid: String) async {
        guard !mealText.isEmpty else { return }
        aiStatus = "Analyzing..."

        do {
            let functions = Functions.functions()
            let prompt = "Return JSON: { \"mealName\": \"string\", \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number } for \"\(mealText)\""

            let result = try await functions.httpsCallable("callGemini").call([
                "prompt": prompt,
                "systemPrompt": "Nutrition API. JSON Only.",
                "expectJson": true,
                "feature": "chat"
            ])

            if let data = result.data as? [String: Any],
               let text = data["text"] as? String {
                // Clean potential markdown code blocks
                let cleaned = text
                    .replacingOccurrences(of: "```json", with: "")
                    .replacingOccurrences(of: "```", with: "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)

                if let cleanedData = cleaned.data(using: .utf8),
                   let parsed = try? JSONSerialization.jsonObject(with: cleanedData) as? [String: Any],
                   let mealName = parsed["mealName"] as? String {
                    try await firestore.addMeal(uid: uid, meal: [
                        "mealName": mealName,
                        "calories": parsed["calories"] ?? 0,
                        "protein": parsed["protein"] ?? 0,
                        "carbs": parsed["carbs"] ?? 0,
                        "fat": parsed["fat"] ?? 0
                    ])
                    mealText = ""
                    aiStatus = ""
                    return
                }
            }

            aiStatus = ""
            showManualEntry = true
        } catch {
            aiStatus = ""
            showManualEntry = true
        }
    }

    // MARK: - Complete Daily Drop

    func completeDailyDrop(uid: String, xp: Int) async {
        let today = FirestoreService.todayString()
        try? await firestore.saveProfile(uid: uid, data: [
            "dailyDrops.\(today)": true,
            "xp": FieldValue.increment(Int64(xp))
        ])
        dailyDropCompleted = true
    }

    func checkDailyDropStatus(profile: UserProfile?) {
        // Profile doesn't have dailyDrops in Codable — check via raw Firestore
        // For now, rely on the published flag set after completion
    }
}
