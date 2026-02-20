import Foundation
import FirebaseFirestore

// MARK: - Firestore Data Models
// These match the React prototype exactly: users/{uid}/data/profile

enum FitnessGoal: String, Codable, CaseIterable {
    case lose
    case maintain
    case gain

    var displayName: String {
        switch self {
        case .lose: return "Fat Loss"
        case .maintain: return "Maintenance"
        case .gain: return "Hypertrophy"
        }
    }

    var description: String {
        switch self {
        case .lose: return "Maximize caloric deficit. Prioritize protein retention."
        case .maintain: return "Optimize performance. Recomp body composition."
        case .gain: return "Caloric surplus. Maximize tissue growth."
        }
    }

    var iconName: String {
        switch self {
        case .lose: return "flame.fill"
        case .maintain: return "shield.fill"
        case .gain: return "dumbbell.fill"
        }
    }

    var proteinMultiplier: Double {
        switch self {
        case .lose: return 2.2
        case .gain: return 2.0
        case .maintain: return 1.8
        }
    }

    var fatPercent: Double {
        switch self {
        case .lose, .gain: return 0.25
        case .maintain: return 0.30
        }
    }
}

enum Gender: String, Codable, CaseIterable {
    case male
    case female
}

enum ActivityLevel: Double, CaseIterable {
    case sedentary = 1.2
    case light = 1.375
    case moderate = 1.55
    case active = 1.725
    case athlete = 1.9

    var label: String {
        switch self {
        case .sedentary: return "Sedentary"
        case .light: return "Light"
        case .moderate: return "Moderate"
        case .active: return "Active"
        case .athlete: return "Athlete"
        }
    }

    var description: String {
        switch self {
        case .sedentary: return "Desk job, no exercise"
        case .light: return "1-2 days/week"
        case .moderate: return "3-5 days/week"
        case .active: return "6-7 days/week"
        case .athlete: return "Intense daily training"
        }
    }

    var icon: String {
        switch self {
        case .sedentary: return "sofa.fill"
        case .light: return "figure.walk"
        case .moderate: return "figure.run"
        case .active: return "figure.strengthtraining.traditional"
        case .athlete: return "flame.fill"
        }
    }
}

enum IntensityLevel: String, Codable, CaseIterable {
    case conservative
    case moderate
    case aggressive

    var label: String {
        switch self {
        case .conservative: return "Steady"
        case .moderate: return "Optimized"
        case .aggressive: return "Extreme"
        }
    }

    var description: String {
        switch self {
        case .conservative: return "Slow & sustainable"
        case .moderate: return "Balanced approach"
        case .aggressive: return "Maximum effort"
        }
    }

    func calorieAdjustment(for goal: FitnessGoal) -> Int {
        switch (self, goal) {
        case (.conservative, .lose): return -300
        case (.conservative, .gain): return 200
        case (.moderate, .lose): return -500
        case (.moderate, .gain): return 350
        case (.aggressive, .lose): return -750
        case (.aggressive, .gain): return 500
        default: return 0
        }
    }
}

struct UserProfile: Codable {
    // Onboarding data
    var goal: String
    var gender: String
    var weight: Double?
    var height: Double?
    var age: Int?
    var bodyFat: Double?
    var targetWeight: Double?
    var activityLevel: Double
    var intensity: String

    // Calculated values (Mifflin-St Jeor)
    var bmr: Int?
    var tdee: Int?
    var dailyCalories: Int?
    var dailyProtein: Int?
    var dailyCarbs: Int?
    var dailyFat: Int?

    // System
    var onboarded: Bool
    var lastUpdated: Date?
    var schemaVersion: Int?

    // Premium
    var isPremium: Bool?
    var subscription: SubscriptionInfo?

    // Gamification
    var xp: Int?
    var league: String?

    // Founder
    var founderBadge: Bool?

    init() {
        self.goal = FitnessGoal.maintain.rawValue
        self.gender = Gender.male.rawValue
        self.activityLevel = ActivityLevel.moderate.rawValue
        self.intensity = IntensityLevel.moderate.rawValue
        self.onboarded = false
    }
}

struct SubscriptionInfo: Codable {
    var planId: String?
    var status: String?
    var startDate: String?
    var expiryDate: String?
    var paymentId: String?
    var orderId: String?
    var platform: String?  // "ios", "android", or nil (web/Razorpay)
}

// MARK: - Nutrition Calculator (matches React OnboardingView.jsx lines 65-102)
struct NutritionCalculator {
    /// Mifflin-St Jeor BMR formula — exact match to React prototype
    static func calculate(
        weight: Double,
        height: Double,
        age: Int,
        gender: Gender,
        activityLevel: Double,
        goal: FitnessGoal,
        intensity: IntensityLevel
    ) -> (bmr: Int, tdee: Int, calories: Int, protein: Int, carbs: Int, fat: Int) {
        let w = weight > 0 ? weight : 70
        let h = height > 0 ? height : 170
        let a = Double(age > 0 ? age : 25)

        // BMR: Mifflin-St Jeor
        let bmr: Double
        if gender == .male {
            bmr = (10 * w) + (6.25 * h) - (5 * a) + 5
        } else {
            bmr = (10 * w) + (6.25 * h) - (5 * a) - 161
        }

        let tdee = Int(round(bmr * activityLevel))

        // Target calories
        var targetCalories = tdee
        if goal != .maintain {
            let adjustment = intensity.calorieAdjustment(for: goal)
            targetCalories = max(1200, tdee + adjustment)
        }

        // Macros
        let protein = Int(round(w * goal.proteinMultiplier))
        let fat = Int(round(Double(targetCalories) * goal.fatPercent / 9))
        let carbCals = Double(targetCalories) - Double(protein * 4) - Double(fat * 9)
        let carbs = Int(round(max(0, carbCals) / 4))

        return (
            bmr: Int(round(bmr)),
            tdee: tdee,
            calories: targetCalories,
            protein: protein,
            carbs: carbs,
            fat: fat
        )
    }
}
