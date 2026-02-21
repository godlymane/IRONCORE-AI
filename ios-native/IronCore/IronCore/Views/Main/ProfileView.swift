import SwiftUI

/// Profile hub — stats, achievements, weight tracking, league, settings.
/// Mirrors ProfileHub.jsx + StatsView.jsx + TrackView.jsx from React prototype.
/// 4 sub-tabs: Overview, Stats, Trophies, Settings.
struct ProfileView: View {
    @StateObject private var vm = ProfileViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    let profile: UserProfile?
    let uid: String

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            tabPicker
            tabContent
        }
        .background(Color.black)
        .onAppear { vm.startListening(uid: uid, profile: profile) }
        .onDisappear { vm.stopListening() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("PROFILE")
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                        .tracking(1)

                    // Level badge
                    HStack(spacing: 6) {
                        Text("LV.\(vm.level)")
                            .font(.system(size: 12, weight: .black, design: .monospaced))
                            .foregroundColor(.ironRedLight)
                        Text("•")
                            .foregroundColor(.textTertiary)
                        Text(vm.currentLeague.name.uppercased())
                            .font(.system(size: 12, weight: .black))
                            .foregroundColor(Color(hex: LeagueViewModel.tierColor(for: vm.currentLeague.name).primary))
                            .tracking(1)
                    }
                }
                Spacer()
            }

            // Level progress bar
            VStack(spacing: 6) {
                HStack {
                    Text("Level \(vm.level)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textTertiary)
                    Spacer()
                    Text("\(vm.xpInLevel)/\(vm.xpToNext) XP")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.ironRedLight)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(LinearGradient.ironGradient)
                            .frame(width: geo.size.width * vm.levelProgress, height: 6)
                            .animation(.easeOut(duration: 0.6), value: vm.levelProgress)
                    }
                }
                .frame(height: 6)
            }

            // Quick stats
            HStack(spacing: 12) {
                QuickStat(value: "\(vm.totalXP)", label: "XP", color: .ironRedLight)
                QuickStat(value: "\(vm.totalWorkouts)", label: "WORKOUTS", color: Color(hex: "#34d399"))
                QuickStat(value: "\(vm.totalMeals)", label: "MEALS", color: Color(hex: "#60a5fa"))
            }

            // Profile completion (hidden when 100%)
            if vm.completionPercent < 1.0 {
                completionCard
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    private var completionCard: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "#fbbf24"))
                Text("PROFILE \(Int(vm.completionPercent * 100))% COMPLETE")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color(hex: "#fbbf24"))
                    .tracking(1)
                Spacer()
            }
            ForEach(vm.missingItems, id: \.self) { item in
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 4, height: 4)
                    Text(item)
                        .font(.system(size: 12))
                        .foregroundColor(.textSecondary)
                    Spacer()
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(hex: "#fbbf24").opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(hex: "#fbbf24").opacity(0.2), lineWidth: 1)
                )
        )
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 4) {
            ForEach(ProfileViewModel.ProfileTab.allCases) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        vm.selectedTab = tab
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 11))
                        Text(tab.rawValue.uppercased())
                            .font(.system(size: 10, weight: .black))
                    }
                    .foregroundColor(vm.selectedTab == tab ? .white : .textTertiary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(
                        Capsule().fill(
                            vm.selectedTab == tab
                                ? Color.ironRed.opacity(0.3)
                                : Color.white.opacity(0.05)
                        )
                    )
                    .overlay(
                        Capsule().stroke(
                            vm.selectedTab == tab
                                ? Color.ironRedLight.opacity(0.4)
                                : Color.clear,
                            lineWidth: 1
                        )
                    )
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch vm.selectedTab {
        case .overview:
            overviewTab
        case .stats:
            statsTab
        case .achievements:
            achievementsTab
        case .settings:
            settingsTab
        }
    }

    // MARK: - Overview Tab (TrackView — body metrics + weight history)

    private var overviewTab: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // Body metrics grid
                metricsGrid

                // Weight history
                if !vm.weightHistory.isEmpty {
                    weightHistoryCard
                }

                // BMI / Advanced metrics
                if let w = profile?.weight, let h = profile?.height, w > 0, h > 0 {
                    advancedMetrics(weight: w, height: h)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 120)
        }
    }

    private var metricsGrid: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                MetricCard(
                    label: "WEIGHT",
                    value: profile?.weight.map { String(format: "%.1f", $0) } ?? "—",
                    unit: "kg",
                    icon: "scalemass.fill",
                    color: .ironRedLight
                )
                MetricCard(
                    label: "HEIGHT",
                    value: profile?.height.map { String(format: "%.0f", $0) } ?? "—",
                    unit: "cm",
                    icon: "ruler.fill",
                    color: Color(hex: "#60a5fa")
                )
            }
            HStack(spacing: 12) {
                MetricCard(
                    label: "BODY FAT",
                    value: profile?.bodyFat.map { String(format: "%.1f", $0) } ?? "—",
                    unit: "%",
                    icon: "percent",
                    color: Color(hex: "#06b6d4")
                )
                MetricCard(
                    label: "TARGET",
                    value: profile?.targetWeight.map { String(format: "%.1f", $0) } ?? "—",
                    unit: "kg",
                    icon: "target",
                    color: Color(hex: "#34d399")
                )
            }
        }
    }

    private var weightHistoryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#fbbf24"))
                    Text("WEIGHT LOG")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.white)
                        .tracking(1)
                }
                Spacer()
                Text("Last \(min(vm.weightHistory.count, 5))")
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
            }

            ForEach(Array(vm.weightHistory.prefix(5))) { entry in
                HStack {
                    Text(entry.date)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(.textTertiary)
                    Spacer()
                    Text(String(format: "%.1f kg", entry.weight))
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
                .padding(.vertical, 4)
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    private func advancedMetrics(weight: Double, height: Double) -> some View {
        let heightM = height / 100.0
        let bmi = weight / (heightM * heightM)
        let bodyFat = profile?.bodyFat ?? 20
        let leanMass = weight * (1 - bodyFat / 100.0)
        let ffmi = leanMass / (heightM * heightM) + 6.1 * (1.8 - heightM)

        return HStack(spacing: 12) {
            VStack(spacing: 8) {
                Text("BMI")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.textTertiary)
                    .tracking(1)
                Text(String(format: "%.1f", bmi))
                    .font(.system(size: 28, weight: .black, design: .monospaced))
                    .foregroundColor(bmiColor(bmi))
                Text(bmiLabel(bmi))
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(bmiColor(bmi).opacity(0.7))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .modifier(GlassCard())

            VStack(spacing: 8) {
                Text("FFMI")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.textTertiary)
                    .tracking(1)
                Text(String(format: "%.1f", ffmi))
                    .font(.system(size: 28, weight: .black, design: .monospaced))
                    .foregroundColor(Color(hex: "#06b6d4"))
                Text("Muscle Index")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.textTertiary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .modifier(GlassCard())
        }
    }

    // MARK: - Stats Tab (Discipline heatmap + league card)

    private var statsTab: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // League progress card
                leagueCard

                // Streak card
                streakCard

                // 90-day discipline heatmap
                heatmapCard
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 120)
        }
    }

    private var leagueCard: some View {
        let league = vm.currentLeague
        let tierColors = LeagueViewModel.tierColor(for: league.name)
        let tierColor = Color(hex: tierColors.primary)
        let nextLeague = Leagues.all.first { $0.minXP > vm.totalXP }

        return VStack(spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: LeagueViewModel.tierIcon(for: league.name))
                        .font(.system(size: 14))
                        .foregroundColor(tierColor)
                    Text(league.name.uppercased())
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(tierColor)
                        .tracking(1)
                }
                Spacer()
                Text("\(vm.totalXP) XP")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }

            if let next = nextLeague {
                let progress = Double(vm.totalXP - league.minXP) / Double(next.minXP - league.minXP)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 8)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [tierColor, tierColor.opacity(0.6)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * min(1, max(0, progress)), height: 8)
                            .animation(.easeOut(duration: 0.6), value: progress)
                            .shadow(color: tierColor.opacity(0.5), radius: 4)
                    }
                }
                .frame(height: 8)

                HStack {
                    Text(league.name)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(tierColor)
                    Spacer()
                    let nextColors = LeagueViewModel.tierColor(for: next.name)
                    Text(next.name)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: nextColors.primary))
                }
            } else {
                Text("MAX TIER")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(Color(hex: "#a855f7"))
                    .tracking(1)
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    private var streakCard: some View {
        HStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("\(vm.currentStreak)")
                    .font(.system(size: 36, weight: .black, design: .monospaced))
                    .foregroundColor(vm.currentStreak > 0 ? Color(hex: "#fbbf24") : .textTertiary)
                Text("DAY STREAK")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.textTertiary)
                    .tracking(1)
            }

            Spacer()

            if vm.currentStreak >= 3 {
                Image(systemName: "flame.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "#fbbf24"), Color(hex: "#f97316")],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    private var heatmapCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("90-DAY DISCIPLINE")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.white)
                    .tracking(1)
                Spacer()
                HStack(spacing: 8) {
                    heatmapLegend(color: Color(hex: "#ef4444"), label: "Both")
                    heatmapLegend(color: Color(hex: "#34d399"), label: "One")
                    heatmapLegend(color: Color(hex: "#374151"), label: "None")
                }
            }

            // Grid — 7 columns (days of week) × 13 rows
            let columns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 7)
            LazyVGrid(columns: columns, spacing: 3) {
                ForEach(vm.heatmapData) { day in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(heatmapColor(day.score))
                        .frame(height: 14)
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    private func heatmapLegend(color: Color, label: String) -> some View {
        HStack(spacing: 3) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.textTertiary)
        }
    }

    private func heatmapColor(_ score: Int) -> Color {
        switch score {
        case 3: return Color(hex: "#ef4444") // workout + meal
        case 2: return Color(hex: "#34d399") // one of them
        case 1: return Color(hex: "#4b5563")
        default: return Color(hex: "#1f2937")
        }
    }

    // MARK: - Achievements Tab (Trophies)

    private var achievementsTab: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // Summary
                HStack(spacing: 16) {
                    VStack(spacing: 4) {
                        Text("\(vm.unlockedAchievements.count)")
                            .font(.system(size: 28, weight: .black, design: .monospaced))
                            .foregroundColor(Color(hex: "#fbbf24"))
                        Text("UNLOCKED")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.textTertiary)
                            .tracking(1)
                    }
                    VStack(spacing: 4) {
                        Text("\(ProfileViewModel.allAchievements.count)")
                            .font(.system(size: 28, weight: .black, design: .monospaced))
                            .foregroundColor(.textTertiary)
                        Text("TOTAL")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.textTertiary)
                            .tracking(1)
                    }
                    Spacer()
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(hex: "#fbbf24"), Color(hex: "#f97316")],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                }
                .padding(16)
                .modifier(GlassCard())

                // Achievement grid
                let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(ProfileViewModel.allAchievements) { achievement in
                        AchievementCard(
                            achievement: achievement,
                            isUnlocked: vm.unlockedAchievements.contains(achievement.id)
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Settings Tab

    private var settingsTab: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // Account section
                VStack(alignment: .leading, spacing: 12) {
                    Text("ACCOUNT")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.textTertiary)
                        .tracking(2)

                    if let email = authVM.user?.email {
                        HStack(spacing: 10) {
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.textTertiary)
                            Text(email)
                                .font(.system(size: 14))
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(14)
                        .modifier(GlassCard())
                    }

                    // Premium status
                    HStack(spacing: 10) {
                        Image(systemName: profile?.isPremium == true ? "checkmark.seal.fill" : "lock.fill")
                            .font(.system(size: 14))
                            .foregroundColor(profile?.isPremium == true ? Color(hex: "#34d399") : .textTertiary)
                        Text(profile?.isPremium == true ? "Premium Active" : "Free Plan")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(profile?.isPremium == true ? Color(hex: "#34d399") : .white)
                        Spacer()
                        if profile?.isPremium != true {
                            Text("UPGRADE")
                                .font(.system(size: 11, weight: .black))
                                .foregroundColor(.ironRedLight)
                                .tracking(1)
                        }
                    }
                    .padding(14)
                    .modifier(GlassCard())
                }

                // Data & Export section
                VStack(alignment: .leading, spacing: 12) {
                    Text("DATA & EXPORT")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.textTertiary)
                        .tracking(2)

                    SettingsRow(icon: "arrow.down.doc.fill", title: "Export Workouts", subtitle: "\(vm.totalWorkouts) workouts", isPro: true)
                    SettingsRow(icon: "arrow.down.doc.fill", title: "Export Meals", subtitle: "\(vm.totalMeals) meals", isPro: true)
                    SettingsRow(icon: "externaldrive.fill", title: "Full Backup", subtitle: "JSON export", isPro: true)
                }

                // Sign out
                VStack(alignment: .leading, spacing: 12) {
                    Text("DANGER ZONE")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.textTertiary)
                        .tracking(2)

                    Button {
                        authVM.signOut()
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.system(size: 14))
                                .foregroundColor(.ironRedLight)
                            Text("Sign Out")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.ironRedLight)
                            Spacer()
                        }
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color.ironRed.opacity(0.08))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.ironRedLight.opacity(0.2), lineWidth: 1)
                        )
                    }
                }

                // Footer
                VStack(spacing: 4) {
                    Text("IronCore Fit v1.0.0")
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)
                    Text("Your Phone. Your Trainer.")
                        .font(.system(size: 11))
                        .foregroundColor(Color.white.opacity(0.2))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Helpers

    private func bmiColor(_ bmi: Double) -> Color {
        if bmi < 18.5 { return Color(hex: "#60a5fa") }
        if bmi < 25 { return Color(hex: "#34d399") }
        if bmi < 30 { return Color(hex: "#fbbf24") }
        return Color(hex: "#ef4444")
    }

    private func bmiLabel(_ bmi: Double) -> String {
        if bmi < 18.5 { return "Underweight" }
        if bmi < 25 { return "Normal" }
        if bmi < 30 { return "Overweight" }
        return "Obese"
    }
}

// MARK: - Quick Stat

private struct QuickStat: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .black, design: .monospaced))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 9, weight: .black))
                .foregroundColor(.textTertiary)
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .modifier(GlassCard())
    }
}

// MARK: - Metric Card

private struct MetricCard: View {
    let label: String
    let value: String
    let unit: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundColor(color.opacity(0.7))
                Text(label)
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.textTertiary)
                    .tracking(1)
            }
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 24, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
                Text(unit)
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .modifier(GlassCard())
    }
}

// MARK: - Achievement Card

private struct AchievementCard: View {
    let achievement: ProfileViewModel.Achievement
    let isUnlocked: Bool

    var body: some View {
        let rarityColor = Color(hex: achievement.rarity.color)

        VStack(spacing: 8) {
            Image(systemName: achievement.icon)
                .font(.system(size: 24))
                .foregroundColor(isUnlocked ? rarityColor : .gray.opacity(0.3))

            Text(achievement.name)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(isUnlocked ? .white : .gray)
                .lineLimit(1)

            Text(achievement.description)
                .font(.system(size: 10))
                .foregroundColor(isUnlocked ? .textSecondary : .gray.opacity(0.4))
                .lineLimit(2)
                .multilineTextAlignment(.center)

            HStack(spacing: 4) {
                Text("+\(achievement.xp) XP")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(isUnlocked ? rarityColor : .gray.opacity(0.3))
                Text("•")
                    .foregroundColor(.textTertiary)
                Text(achievement.rarity.rawValue.uppercased())
                    .font(.system(size: 8, weight: .black))
                    .foregroundColor(isUnlocked ? rarityColor.opacity(0.7) : .gray.opacity(0.3))
                    .tracking(0.5)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    isUnlocked
                        ? rarityColor.opacity(0.06)
                        : Color.white.opacity(0.02)
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isUnlocked
                        ? rarityColor.opacity(0.2)
                        : Color.white.opacity(0.04),
                    lineWidth: 1
                )
        )
        .opacity(isUnlocked ? 1 : 0.5)
    }
}

// MARK: - Settings Row

private struct SettingsRow: View {
    let icon: String
    let title: String
    let subtitle: String
    var isPro: Bool = false

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    if isPro {
                        Text("PRO")
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.ironRed.opacity(0.15)))
                    }
                }
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
        }
        .padding(14)
        .modifier(GlassCard())
    }
}
