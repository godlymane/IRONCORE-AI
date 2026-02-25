import SwiftUI

/// 5-screen onboarding flow — mirrors React OnboardingView.jsx
/// Screens: Welcome → Goal → AI Intro → First Workout → Premium Upsell
struct OnboardingView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var firestoreManager: FirestoreManager
    @State private var currentStep = 0

    private let totalSteps = 5

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack {
                // Progress dots
                HStack(spacing: 8) {
                    ForEach(0..<totalSteps, id: \.self) { step in
                        Circle()
                            .fill(step <= currentStep ? Color.red : Color.gray.opacity(0.3))
                            .frame(width: 8, height: 8)
                    }
                }
                .padding(.top, 20)

                // Content
                TabView(selection: $currentStep) {
                    WelcomeStep(onNext: nextStep).tag(0)
                    GoalStep(onNext: nextStep).tag(1)
                    AIIntroStep(onNext: nextStep).tag(2)
                    FirstWorkoutStep(onNext: nextStep).tag(3)
                    PremiumUpsellStep(onComplete: completeOnboarding).tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentStep)
            }
        }
    }

    private func nextStep() {
        withAnimation { currentStep += 1 }
    }

    private func completeOnboarding() {
        guard let uid = authManager.currentUser?.uid else { return }
        Task {
            try? await firestoreManager.updateProfile(uid: uid, data: [
                "onboarded": true,
            ])
        }
    }
}

// MARK: - Onboarding Steps

struct WelcomeStep: View {
    let onNext: () -> Void

    var body: some View {
        OnboardingStepLayout(
            icon: "flame.fill",
            title: "Welcome to IronCore",
            subtitle: "Your AI-powered fitness companion. Train smarter, compete harder, level up faster.",
            buttonTitle: "Let's Go",
            action: onNext
        )
    }
}

struct GoalStep: View {
    let onNext: () -> Void
    @State private var selectedGoal: String?

    private let goals = [
        ("Build Muscle", "figure.strengthtraining.traditional"),
        ("Lose Weight", "flame"),
        ("Stay Active", "figure.run"),
        ("Get Stronger", "dumbbell"),
    ]

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Text("What's your goal?")
                .font(.title2.bold())
                .foregroundStyle(.white)

            ForEach(goals, id: \.0) { goal, icon in
                Button {
                    selectedGoal = goal
                } label: {
                    HStack {
                        Image(systemName: icon)
                            .frame(width: 24)
                        Text(goal)
                            .font(.headline)
                        Spacer()
                        if selectedGoal == goal {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.red)
                        }
                    }
                    .padding()
                    .background(selectedGoal == goal ? Color.red.opacity(0.2) : Color.white.opacity(0.05))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal)

            Spacer()

            Button(action: onNext) {
                Text("Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(selectedGoal != nil ? Color.red : Color.gray)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(selectedGoal == nil)
            .padding(.horizontal)
            .padding(.bottom, 40)
        }
    }
}

struct AIIntroStep: View {
    let onNext: () -> Void

    var body: some View {
        OnboardingStepLayout(
            icon: "camera.viewfinder",
            title: "AI Form Correction",
            subtitle: "Point your camera at yourself while working out. Our AI watches your form in real-time and gives instant corrections.",
            buttonTitle: "Continue",
            action: onNext
        )
    }
}

struct FirstWorkoutStep: View {
    let onNext: () -> Void

    var body: some View {
        OnboardingStepLayout(
            icon: "dumbbell.fill",
            title: "Log Your First Workout",
            subtitle: "Every workout earns XP. Climb the leaderboard, join leagues, and compete in the Arena.",
            buttonTitle: "Continue",
            action: onNext
        )
    }
}

struct PremiumUpsellStep: View {
    let onComplete: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "crown.fill")
                .font(.system(size: 56))
                .foregroundStyle(.yellow)

            Text("Go Premium")
                .font(.title2.bold())
                .foregroundStyle(.white)

            VStack(alignment: .leading, spacing: 12) {
                PremiumFeatureRow(text: "Unlimited AI form correction")
                PremiumFeatureRow(text: "Unlimited AI coaching")
                PremiumFeatureRow(text: "Full league access")
                PremiumFeatureRow(text: "Guild creation & management")
                PremiumFeatureRow(text: "Premium Battle Pass track")
            }
            .padding(.horizontal)

            Spacer()

            VStack(spacing: 12) {
                Button(action: {
                    // TODO: trigger StoreKit purchase flow
                    onComplete()
                }) {
                    Text("Start Free Trial")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button(action: onComplete) {
                    Text("Maybe Later")
                        .font(.subheadline)
                        .foregroundStyle(.gray)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 40)
        }
    }
}

struct PremiumFeatureRow: View {
    let text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.red)
            Text(text)
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Reusable Step Layout

struct OnboardingStepLayout: View {
    let icon: String
    let title: String
    let subtitle: String
    let buttonTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundStyle(.red)

            Text(title)
                .font(.title2.bold())
                .foregroundStyle(.white)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer()

            Button(action: action) {
                Text(buttonTitle)
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal)
            .padding(.bottom, 40)
        }
    }
}
