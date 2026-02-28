import SwiftUI
import FirebaseAuth

/// Dashboard — the Home tab. Mirrors DashboardView.jsx from React prototype.
/// Shows daily macro rings, AI food logging, streak, daily drop, quick log buttons.
struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    let profile: UserProfile?
    @State private var showNutrition = false

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                headerSection
                mainStatsCard
                quickLogButtons
                DailyChallengesCard(
                    todayWorkoutCount: viewModel.todaysWorkoutCount,
                    todayMealCount: viewModel.todaysMealCount,
                    todayCaloriesBurned: viewModel.caloriesOut,
                    onXPClaimed: { xp in
                        if let uid = Auth.auth().currentUser?.uid {
                            Task { await viewModel.addXP(uid: uid, amount: xp) }
                        }
                    }
                )
                nutritionLink
                aiSearchCard
                dailyDropCard
                motivationCard
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
        .background(Color.black)
        .onAppear {
            if let uid = Auth.auth().currentUser?.uid {
                viewModel.startListening(uid: uid)
            }
        }
        .onDisappear {
            viewModel.stopListening()
        }
        .fullScreenCover(isPresented: $showNutrition) {
            NavigationStack {
                NutritionView(uid: Auth.auth().currentUser?.uid ?? "", profile: profile)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button { showNutrition = false } label: {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                        }
                    }
                    .toolbarBackground(.black, for: .navigationBar)
            }
        }
        .alert("AI Nutrition Analysis", isPresented: $viewModel.showAIConsentDialog) {
            Button("Allow", role: nil) { viewModel.grantAIConsent() }
            Button("Don't Allow", role: .cancel) { viewModel.denyAIConsent() }
        } message: {
            Text("IronCore uses Google's Gemini AI to estimate macros from your food description. Your text will be sent to Google's servers for processing. No personal data beyond the food description is shared. You can revoke this in Settings at any time.")
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text("DASHBOARD")
                    .font(.system(size: 24, weight: .black))
                    .italic()
                    .foregroundColor(.white)

                if let goal = profile?.goal, !goal.isEmpty {
                    Text("\(goal.capitalized) Protocol")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color.white.opacity(0.5))
                }
            }

            Spacer()

            // Notification bell
            if let uid = Auth.auth().currentUser?.uid {
                NotificationBellButton(uid: uid)
                    .padding(.trailing, 8)
            }

            // XP badge
            HStack(spacing: 4) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 12))
                Text("\(profile?.xp ?? 0)")
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundColor(Color(hex: "#eab308"))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "#eab308").opacity(0.15))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "#eab308").opacity(0.3), lineWidth: 1))
            )

            // Streak badge
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12))
                Text("\(viewModel.streak)")
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundColor(Color.orange)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.orange.opacity(0.15))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.orange.opacity(0.3), lineWidth: 1))
            )
        }
        .padding(.top, 8)
    }

    // MARK: - Main Stats (Macro Rings)

    private var mainStatsCard: some View {
        VStack(spacing: 16) {
            HStack(spacing: 0) {
                // Calorie ring
                VStack(spacing: 6) {
                    ProgressRing(
                        progress: viewModel.calorieProgress(profile: profile),
                        color: Color(hex: "#dc2626"),
                        size: 100,
                        lineWidth: 8
                    ) {
                        VStack(spacing: 0) {
                            Text("\(viewModel.netCalories)")
                                .font(.system(size: 22, weight: .black))
                                .foregroundColor(.white)
                            Text("kcal")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(Color.white.opacity(0.5))
                        }
                    }
                    Text("Net Calories")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.5))
                    Text("\(max(0, viewModel.dailyCalorieTarget(profile: profile) - viewModel.netCalories)) left")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#dc2626"))
                }
                .frame(maxWidth: .infinity)

                // Protein ring
                VStack(spacing: 6) {
                    ProgressRing(
                        progress: viewModel.proteinProgress(profile: profile),
                        color: Color(hex: "#f59e0b"),
                        size: 100,
                        lineWidth: 8
                    ) {
                        VStack(spacing: 0) {
                            Text("\(viewModel.protein)")
                                .font(.system(size: 22, weight: .black))
                                .foregroundColor(.white)
                            Text("g")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(Color.white.opacity(0.5))
                        }
                    }
                    Text("Protein")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.5))
                    Text("\(max(0, viewModel.dailyProteinTarget(profile: profile) - viewModel.protein))g left")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#f59e0b"))
                }
                .frame(maxWidth: .infinity)

                // Mini macros
                VStack(alignment: .leading, spacing: 10) {
                    MacroRow(label: "Carbs", value: "\(viewModel.carbs)g", color: Color(hex: "#eab308"))
                    MacroRow(label: "Fat", value: "\(viewModel.fat)g", color: Color(hex: "#ec4899"))
                    MacroRow(label: "Burned", value: "\(viewModel.caloriesOut)", color: Color.orange)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(20)
        .modifier(GlassCard())
    }

    // MARK: - Quick Log Buttons

    private var quickLogButtons: some View {
        HStack(spacing: 10) {
            QuickLogButton(icon: "drop.fill", label: "Water", color: Color(hex: "#06b6d4")) {
                if let uid = Auth.auth().currentUser?.uid {
                    Task { await viewModel.logWater(uid: uid) }
                }
            }
            QuickLogButton(icon: "bolt.fill", label: "Protein", color: Color(hex: "#eab308")) {
                if let uid = Auth.auth().currentUser?.uid {
                    Task { await viewModel.logProteinShake(uid: uid) }
                }
            }
            QuickLogButton(icon: "circle.fill", label: "Eggs", color: Color.orange) {
                if let uid = Auth.auth().currentUser?.uid {
                    Task { await viewModel.logEggs(uid: uid) }
                }
            }
            QuickLogButton(icon: "fork.knife", label: "Chicken", color: Color(hex: "#22c55e")) {
                if let uid = Auth.auth().currentUser?.uid {
                    Task { await viewModel.logChicken(uid: uid) }
                }
            }
        }
    }

    // MARK: - Nutrition Link

    private var nutritionLink: some View {
        Button { showNutrition = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "chart.pie.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.ironRedLight)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Nutrition Command")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Text("Macros • Water • Meal Log")
                        .font(.system(size: 11))
                        .foregroundColor(Color.gray.opacity(0.5))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color.gray.opacity(0.4))
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )
        }
    }

    // MARK: - AI Search Card

    private var aiSearchCard: some View {
        VStack(spacing: 12) {
            HStack {
                TextField("e.g. 200g chicken breast and rice", text: $viewModel.mealText)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.white.opacity(0.05))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.1), lineWidth: 1))
                    )
                    .submitLabel(.go)
                    .onSubmit {
                        if let uid = Auth.auth().currentUser?.uid {
                            viewModel.requestSpotMacros(uid: uid)
                        }
                    }

                Button {
                    if let uid = Auth.auth().currentUser?.uid {
                        viewModel.requestSpotMacros(uid: uid)
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(
                            LinearGradient(colors: [Color(hex: "#dc2626"), Color(hex: "#b91c1c")], startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                        .cornerRadius(12)
                        .shadow(color: Color(hex: "#dc2626").opacity(0.5), radius: 8, y: 4)
                }
            }

            if !viewModel.aiStatus.isEmpty {
                HStack(spacing: 6) {
                    ProgressView()
                        .tint(Color(hex: "#dc2626"))
                        .scaleEffect(0.8)
                    Text(viewModel.aiStatus)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(hex: "#dc2626"))
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - Daily Drop

    private var dailyDropCard: some View {
        let drop = viewModel.todaysDailyDrop

        return VStack(spacing: 12) {
            HStack {
                Text("DAILY DROP")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        LinearGradient(colors: [Color(hex: "#dc2626"), Color(hex: "#b91c1c")], startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(6)

                Spacer()

                Image(systemName: "sparkles")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#dc2626"))
            }

            HStack {
                Text("\(drop.emoji) \(drop.text)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                Text("+\(drop.xp) XP")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(hex: "#dc2626"))
            }

            Button {
                if let uid = Auth.auth().currentUser?.uid {
                    Task { await viewModel.completeDailyDrop(uid: uid, xp: drop.xp) }
                }
            } label: {
                Text(viewModel.dailyDropCompleted ? "DONE!" : "COMPLETE")
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        viewModel.dailyDropCompleted
                            ? LinearGradient(colors: [Color(hex: "#22c55e"), Color(hex: "#16a34a")], startPoint: .leading, endPoint: .trailing)
                            : LinearGradient(colors: [Color(hex: "#dc2626"), Color(hex: "#b91c1c")], startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(10)
            }
            .disabled(viewModel.dailyDropCompleted)
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - Motivation

    private var motivationCard: some View {
        let quote = viewModel.todaysQuote

        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "#dc2626"))
                Text("Daily Motivation")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.5))
            }

            Text("\"\(quote.text)\"")
                .font(.system(size: 14, weight: .medium))
                .italic()
                .foregroundColor(Color.white.opacity(0.8))
                .fixedSize(horizontal: false, vertical: true)

            Text("— \(quote.author)")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(hex: "#dc2626"))
        }
        .padding(16)
        .modifier(GlassCard())
    }
}

// MARK: - Supporting Components

struct ProgressRing<Content: View>: View {
    let progress: Double
    let color: Color
    let size: CGFloat
    let lineWidth: CGFloat
    @ViewBuilder let content: () -> Content

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.08), lineWidth: lineWidth)
                .frame(width: size, height: size)

            Circle()
                .trim(from: 0, to: min(progress / 100, 1.0))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .frame(width: size, height: size)
                .shadow(color: color.opacity(0.5), radius: 6)
                .animation(.easeOut(duration: 1.0), value: progress)

            content()
        }
    }
}

struct MacroRow: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color.white.opacity(0.5))
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

struct QuickLogButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(color)
                Text(label)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.6))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(color.opacity(0.1))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(color.opacity(0.2), lineWidth: 1))
            )
        }
    }
}

