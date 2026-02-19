import SwiftUI
import Combine

/// Onboarding data collected across all steps
struct OnboardingData {
    var goal: FitnessGoal = .maintain
    var gender: Gender = .male
    var weight: Double?
    var height: Double?
    var age: Int?
    var bodyFat: Double?
    var targetWeight: Double?
    var activityLevel: ActivityLevel = .moderate
    var intensity: IntensityLevel = .moderate

    // Calculated (populated in analysis step)
    var calculatedBMR: Int = 0
    var calculatedTDEE: Int = 0
    var calculatedCalories: Int = 0
    var calculatedProtein: Int = 0
    var calculatedCarbs: Int = 0
    var calculatedFat: Int = 0
}

enum OnboardingStep: Int, CaseIterable {
    case intro = 0
    case goal = 1
    case bio = 2
    case activity = 3
    case intensity = 4
    case analysis = 5
    case complete = 6

    var progressIndex: Int { min(rawValue, 5) } // 6 dots, 'complete' shares last dot
}

/// Onboarding state machine — matches OnboardingView.jsx exactly
@MainActor
final class OnboardingViewModel: ObservableObject {
    @Published var step: OnboardingStep = .intro
    @Published var data = OnboardingData()
    @Published var loadingProgress: Double = 0

    // Text bindings for numeric fields
    @Published var weightText = ""
    @Published var heightText = ""
    @Published var ageText = ""
    @Published var bodyFatText = ""
    @Published var targetWeightText = ""

    private var analysisTimer: Timer?

    var canProceedFromBio: Bool {
        !weightText.isEmpty && !heightText.isEmpty && !ageText.isEmpty
    }

    var calculated: (bmr: Int, tdee: Int, calories: Int, protein: Int, carbs: Int, fat: Int) {
        NutritionCalculator.calculate(
            weight: Double(weightText) ?? 70,
            height: Double(heightText) ?? 170,
            age: Int(ageText) ?? 25,
            gender: data.gender,
            activityLevel: data.activityLevel.rawValue,
            goal: data.goal,
            intensity: data.intensity
        )
    }

    // MARK: - Navigation

    func nextStep() {
        guard let next = OnboardingStep(rawValue: step.rawValue + 1) else { return }

        if step == .intensity {
            // Parse text fields into data before analysis
            data.weight = Double(weightText)
            data.height = Double(heightText)
            data.age = Int(ageText)
            data.bodyFat = Double(bodyFatText)
            data.targetWeight = Double(targetWeightText)

            // Calculate macros
            let calc = calculated
            data.calculatedBMR = calc.bmr
            data.calculatedTDEE = calc.tdee
            data.calculatedCalories = calc.calories
            data.calculatedProtein = calc.protein
            data.calculatedCarbs = calc.carbs
            data.calculatedFat = calc.fat
        }

        withAnimation(.easeInOut(duration: 0.3)) {
            step = next
        }

        if next == .analysis {
            startAnalysis()
        }
    }

    func previousStep() {
        guard let prev = OnboardingStep(rawValue: step.rawValue - 1), prev.rawValue >= 0 else { return }
        withAnimation(.easeInOut(duration: 0.3)) {
            step = prev
        }
    }

    // MARK: - Analysis Animation (matches React setInterval pattern)

    private func startAnalysis() {
        loadingProgress = 0
        analysisTimer?.invalidate()

        analysisTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] timer in
            Task { @MainActor in
                guard let self = self else {
                    timer.invalidate()
                    return
                }
                let increment = Double.random(in: 1...15)
                self.loadingProgress = min(100, self.loadingProgress + increment)

                if self.loadingProgress >= 100 {
                    timer.invalidate()
                    try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s delay
                    withAnimation {
                        self.step = .complete
                    }
                }
            }
        }
    }

    func cleanup() {
        analysisTimer?.invalidate()
    }
}
