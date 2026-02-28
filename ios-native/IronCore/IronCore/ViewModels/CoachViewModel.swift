import Foundation
import FirebaseFunctions
import FirebaseFirestore
import FirebaseAuth

/// AI Coach Chat ViewModel — calls callGemini Cloud Function.
/// Mirrors CoachView.jsx from React prototype.
/// Rate limited: 3 free calls/day, unlimited for premium.
@MainActor
final class CoachViewModel: ObservableObject {

    // MARK: - Published State

    @Published var messages: [ChatMessage] = []
    @Published var input = ""
    @Published var isLoading = false
    @Published var mode: CoachMode = .chat

    // Workout Generator
    @Published var genEquipment = "gym"
    @Published var genDuration = "45"
    @Published var genFocus = "Push"
    @Published var customFocus = ""
    @Published var generatedPlan: GeneratedWorkout?
    @Published var missionStarted = false
    @Published var errorMessage: String?

    private let functions = Functions.functions()
    private let firestore = FirestoreService.shared

    // MARK: - Models

    struct ChatMessage: Identifiable, Equatable {
        let id = UUID()
        let role: Role
        let text: String

        enum Role { case user, ai }
    }

    enum CoachMode: String, CaseIterable {
        case chat = "Chat Coach"
        case generator = "Generate"
    }

    struct GeneratedWorkout {
        let title: String
        let exercises: [GeneratedExercise]
    }

    struct GeneratedExercise {
        let name: String
        let sets: String
        let reps: String
        let rest: String
    }

    static let splits = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Arnold", "Bro Split", "Custom"]
    static let equipmentOptions = [
        ("gym", "Full Gym"),
        ("dumbbells", "DB Only"),
        ("bodyweight", "Bodyweight"),
        ("home", "Home Gym"),
    ]
    static let durationOptions = ["15", "30", "45", "60"]

    // MARK: - System Prompt (matches React CoachView.jsx)

    private static let systemPrompt = """
    You are IronCore — the most elite AI fitness coach on the planet. You are NOT a generic chatbot. You are a world-class strength & nutrition coach with 20+ years of experience training pro athletes.

    PERSONALITY:
    - Direct, intense, no-nonsense — like a drill sergeant who actually cares
    - Short punchy answers (2-4 sentences max unless user asks for detail)
    - Use fitness slang naturally: "gains", "PR", "DOMS", "cut", "bulk", "progressive overload"
    - Motivational but realistic — never give generic advice
    - When user is vague, ask ONE sharp follow-up question

    RULES:
    - NEVER say "I'm just an AI" or "consult a doctor for medical advice" — you ARE the expert
    - Give SPECIFIC numbers: exact sets, reps, weights, macros, calories — not ranges
    - Tailor every answer to the user's profile data provided below
    - If they share a meal, estimate macros quickly and tell them if they're on/off track
    - For workout questions, give exercise NAMES, not categories
    - Be brutally honest about bad habits but frame it as "here's how to fix it"
    - Remember the conversation context — don't repeat yourself
    """

    // MARK: - Init with Welcome

    func initialize(profile: UserProfile?) {
        let goal = profile?.goal ?? "improve fitness"
        let greeting = "Ready to work. Goal: \(goal). What do you need — training, nutrition, or recovery?"
        messages = [ChatMessage(role: .ai, text: greeting)]
    }

    // MARK: - Send Message

    func sendMessage(
        profile: UserProfile?,
        meals: [[String: Any]],
        workouts: [[String: Any]],
        isPremium: Bool
    ) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isLoading else { return }

        // Rate limit check
        if !isPremium {
            let usedToday = UserDefaults.standard.integer(forKey: dailyUsageKey)
            if usedToday >= FeatureLimits.freeAICallsPerDay {
                messages.append(ChatMessage(role: .ai, text: "Daily limit reached. Upgrade to Premium for unlimited coaching."))
                return
            }
        }

        let userMsg = ChatMessage(role: .user, text: text)
        messages.append(userMsg)
        input = ""
        isLoading = true

        do {
            let context = buildContext(profile: profile, meals: meals, workouts: workouts)
            let history = buildConversationHistory()

            let fullPrompt = """
            \(Self.systemPrompt)

            \(context)

            CONVERSATION SO FAR:
            \(history)
            User: \(text)

            Coach (respond in character — short, specific, intense):
            """

            let result = try await functions.httpsCallable("callGemini").call([
                "prompt": text,
                "systemPrompt": fullPrompt,
                "expectJson": false
            ])

            if let response = result.data as? [String: Any],
               let responseText = response["text"] as? String {
                messages.append(ChatMessage(role: .ai, text: responseText))
                incrementDailyUsage()
            } else {
                messages.append(ChatMessage(role: .ai, text: "Connection dropped. Try again."))
            }
        } catch {
            messages.append(ChatMessage(role: .ai, text: "Network error. Check your connection and try again."))
        }

        isLoading = false
    }

    // MARK: - Quick Prompts

    func sendQuickPrompt(
        _ prompt: String,
        profile: UserProfile?,
        meals: [[String: Any]],
        workouts: [[String: Any]],
        isPremium: Bool
    ) async {
        input = prompt
        await sendMessage(profile: profile, meals: meals, workouts: workouts, isPremium: isPremium)
    }

    // MARK: - Generate Workout

    func generateWorkout(profile: UserProfile?, workouts: [[String: Any]], isPremium: Bool) async {
        if !isPremium {
            let usedToday = UserDefaults.standard.integer(forKey: dailyUsageKey)
            if usedToday >= FeatureLimits.freeAICallsPerDay {
                errorMessage = "Daily limit reached. Upgrade to Premium."
                return
            }
        }

        isLoading = true
        generatedPlan = nil
        errorMessage = nil

        let focus = genFocus == "Custom" ? customFocus : genFocus
        let context = buildContext(profile: profile, meals: [], workouts: workouts)

        let prompt = """
        Based on this user's profile and recent workouts, create a \(genDuration) minute \(focus) workout using \(genEquipment). Consider their experience level and goals. Avoid repeating exercises from their recent workouts if possible.

        \(context)

        Return ONLY valid JSON: { "title": "string", "exercises": [ { "name": "string", "sets": "string", "reps": "string", "rest": "string" } ] }
        """

        do {
            let result = try await functions.httpsCallable("callGemini").call([
                "prompt": prompt,
                "systemPrompt": "You are an expert strength coach. Return only valid JSON, no markdown.",
                "expectJson": true,
                "feature": "workout"
            ])

            if let response = result.data as? [String: Any],
               let text = response["text"] as? String {
                if let plan = parseWorkoutPlan(text) {
                    generatedPlan = plan
                    incrementDailyUsage()
                } else {
                    errorMessage = "AI failed to generate plan. Try again."
                }
            }
        } catch {
            errorMessage = "Coach is busy. Try again."
        }

        isLoading = false
    }

    // MARK: - Start Mission (save generated workout)

    func startMission(uid: String) async {
        guard let plan = generatedPlan, !missionStarted else { return }
        missionStarted = true

        let exercises: [[String: Any]] = plan.exercises.map { ex in
            let setCount = Int(ex.sets) ?? 3
            let sets: [[String: Any]] = (0..<setCount).map { _ in
                ["w": "", "r": ex.reps.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)]
            }
            return ["name": ex.name, "sets": sets]
        }

        let focus = genFocus == "Custom" ? customFocus : genFocus
        let data: [String: Any] = [
            "title": plan.title,
            "exercises": exercises,
            "duration": Int(genDuration) ?? 45,
            "focus": focus,
            "equipment": genEquipment,
            "source": "ai-coach",
            "date": todayString(),
            "createdAt": FieldValue.serverTimestamp()
        ]

        do {
            try await firestore.addWorkout(uid: uid, data: data)
        } catch {
            missionStarted = false
        }
    }

    func resetGenerator() {
        generatedPlan = nil
        missionStarted = false
        errorMessage = nil
    }

    // MARK: - Context Builder (matches React buildContext)

    private func buildContext(profile: UserProfile?, meals: [[String: Any]], workouts: [[String: Any]]) -> String {
        let today = todayString()

        let todayMeals = meals.filter { ($0["date"] as? String) == today }
        let todayCals = todayMeals.reduce(0.0) { $0 + ($1["calories"] as? Double ?? 0) }
        let todayProtein = todayMeals.reduce(0.0) { $0 + ($1["protein"] as? Double ?? 0) }
        let todayCarbs = todayMeals.reduce(0.0) { $0 + ($1["carbs"] as? Double ?? 0) }
        let todayFat = todayMeals.reduce(0.0) { $0 + ($1["fat"] as? Double ?? 0) }

        let recentWorkouts = workouts.prefix(5).map { w in
            let title = (w["title"] as? String) ?? (w["focus"] as? String) ?? "Workout"
            let exercises = (w["exercises"] as? [[String: Any]])?.compactMap { $0["name"] as? String }.joined(separator: ", ") ?? ""
            return "\(title): \(exercises)"
        }.joined(separator: " | ")

        let w = profile?.weight ?? 0
        let h = profile?.height ?? 0
        let a = profile?.age ?? 0
        let goal = profile?.goal ?? "?"
        let dailyTarget = profile?.dailyCalories ?? 0
        let proteinTarget = profile?.dailyProtein ?? 0

        return """
        USER PROFILE: Weight: \(w)kg, Height: \(h)cm, Age: \(a), Goal: \(goal), Daily Calorie Target: \(dailyTarget)kcal, Protein Target: \(proteinTarget)g

        TODAY'S INTAKE: \(Int(todayCals))kcal consumed (P:\(Int(todayProtein))g C:\(Int(todayCarbs))g F:\(Int(todayFat))g) from \(todayMeals.count) meals

        RECENT WORKOUTS (last 5): \(recentWorkouts.isEmpty ? "None logged yet" : recentWorkouts)
        TOTAL WORKOUTS: \(workouts.count), XP: \(profile?.xp ?? 0)
        """
    }

    private func buildConversationHistory() -> String {
        messages.suffix(8).map { msg in
            "\(msg.role == .user ? "User" : "Coach"): \(msg.text)"
        }.joined(separator: "\n")
    }

    // MARK: - Parse Workout JSON

    private func parseWorkoutPlan(_ text: String) -> GeneratedWorkout? {
        // Clean markdown wrappers
        var cleaned = text
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard let data = cleaned.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let title = json["title"] as? String,
              let exercisesArr = json["exercises"] as? [[String: Any]] else {
            return nil
        }

        let exercises = exercisesArr.compactMap { ex -> GeneratedExercise? in
            guard let name = ex["name"] as? String else { return nil }
            return GeneratedExercise(
                name: name,
                sets: "\(ex["sets"] ?? "3")",
                reps: "\(ex["reps"] ?? "10")",
                rest: "\(ex["rest"] ?? "60s")"
            )
        }

        guard !exercises.isEmpty else { return nil }
        return GeneratedWorkout(title: title, exercises: exercises)
    }

    // MARK: - Rate Limiting

    private var dailyUsageKey: String {
        "ironcore_ai_usage_\(todayString())"
    }

    private func incrementDailyUsage() {
        let key = dailyUsageKey
        let current = UserDefaults.standard.integer(forKey: key)
        UserDefaults.standard.set(current + 1, forKey: key)
    }

    private func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}
