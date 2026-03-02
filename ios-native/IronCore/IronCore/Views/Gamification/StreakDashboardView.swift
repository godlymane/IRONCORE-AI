import SwiftUI

/// Streak Dashboard — displays streak number, shields, multiplier, heatmap, and shield controls.
/// Dark theme with fire/orange gradient accents for streak elements.
struct StreakDashboardView: View {
    @ObservedObject var vm: EngagementViewModel

    @State private var showShieldConfirmation: Bool = false
    @State private var shieldActivated: Bool = false

    var body: some View {
        VStack(spacing: 20) {
            // MARK: - Big Streak Display
            streakHeroSection

            // MARK: - Stats Row (Shield Count, Multiplier, Longest Streak)
            statsRow

            // MARK: - Streak At Risk Warning
            if vm.streakAtRisk {
                streakAtRiskBanner
            }

            // MARK: - 30-Day Heatmap
            heatmapSection

            // MARK: - Milestone Progress
            milestoneSection

            // MARK: - Shield Controls
            if vm.streakAtRisk || vm.isShieldActive {
                shieldSection
            }
        }
        .padding(20)
        .modifier(GlassCard())
        .alert("Use Streak Shield?", isPresented: $showShieldConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Activate Shield") {
                Task { await activateShield() }
            }
        } message: {
            Text("This will protect your streak for 24 hours. You have \(vm.streakShields) shield\(vm.streakShields == 1 ? "" : "s") remaining.")
        }
    }

    // MARK: - Streak Hero Section

    private var streakHeroSection: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.orange)

                    Text("STREAK")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.white)
                        .tracking(2)
                }

                Spacer()

                // Shield status badge
                if vm.isShieldActive {
                    HStack(spacing: 4) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 10))
                        Text("SHIELDED")
                            .font(.system(size: 9, weight: .black))
                            .tracking(0.5)
                    }
                    .foregroundColor(.cyan)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Color.cyan.opacity(0.15))
                    )
                }
            }

            // Big streak number with fire gradient
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                // Fire icon
                Image(systemName: "flame.fill")
                    .font(.system(size: 42))
                    .foregroundStyle(
                        LinearGradient(
                            colors: streakFlameColors,
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .shadow(color: .orange.opacity(0.5), radius: 12)

                // Streak number
                Text("\(vm.currentStreak)")
                    .font(.system(size: 72, weight: .black, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.white, Color.white.opacity(0.8)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .orange.opacity(0.3), radius: 8)

                VStack(alignment: .leading, spacing: 2) {
                    Text(vm.currentStreak == 1 ? "DAY" : "DAYS")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.textTertiary)
                        .tracking(2)

                    if let label = vm.streakMultiplierLabel {
                        Text(label)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.orange)
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }

    /// Flame colors scale with streak length
    private var streakFlameColors: [Color] {
        if vm.currentStreak >= 30 {
            // Hot: red -> orange -> yellow -> white
            return [.red, .orange, Color(hex: "#eab308"), .white]
        } else if vm.currentStreak >= 7 {
            // Warm: red -> orange -> yellow
            return [.ironRed, .orange, Color(hex: "#eab308")]
        } else if vm.currentStreak >= 3 {
            // Starting: red -> orange
            return [.ironRedDark, .ironRed, .orange]
        } else {
            // Cold: gray -> subtle red
            return [Color(hex: "#6b7280"), .ironRedDark, .ironRed]
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 0) {
            // Streak Shields
            statItem(
                icon: "shield.fill",
                iconColor: .cyan,
                value: "\(vm.streakShields)",
                label: "SHIELDS",
                maxLabel: "/ \(EngagementConfig.maxStreakShields)"
            )

            Divider()
                .frame(height: 36)
                .overlay(Color.white.opacity(0.08))

            // XP Multiplier
            statItem(
                icon: "bolt.fill",
                iconColor: Color(hex: "#eab308"),
                value: String(format: "%.1fx", vm.effectiveMultiplier),
                label: "MULTIPLIER",
                maxLabel: nil
            )

            Divider()
                .frame(height: 36)
                .overlay(Color.white.opacity(0.08))

            // Longest Streak
            statItem(
                icon: "trophy.fill",
                iconColor: Color(hex: "#f59e0b"),
                value: "\(vm.longestStreak)",
                label: "RECORD",
                maxLabel: "days"
            )
        }
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.03))
        )
    }

    private func statItem(icon: String, iconColor: Color, value: String, label: String, maxLabel: String?) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(iconColor)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 18, weight: .black, design: .monospaced))
                    .foregroundColor(.white)

                if let max = maxLabel {
                    Text(max)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.textTertiary)
                }
            }

            Text(label)
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(.textTertiary)
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Streak At Risk Banner

    private var streakAtRiskBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 16))
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 2) {
                Text("STREAK AT RISK")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.orange)
                    .tracking(1)

                Text("Complete a workout today or use a Streak Shield to protect your \(vm.currentStreak)-day streak!")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.6))
            }

            Spacer()

            if vm.streakShields > 0 {
                Button {
                    showShieldConfirmation = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "shield.fill")
                            .font(.system(size: 10))
                        Text("USE")
                            .font(.system(size: 10, weight: .black))
                            .tracking(0.5)
                    }
                    .foregroundColor(.cyan)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(Color.cyan.opacity(0.15))
                    )
                    .overlay(
                        Capsule()
                            .stroke(Color.cyan.opacity(0.3), lineWidth: 1)
                    )
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.orange.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.orange.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - 30-Day Heatmap

    private var heatmapSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("LAST 30 DAYS")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.textTertiary)
                    .tracking(1)

                Spacer()

                // Legend
                HStack(spacing: 8) {
                    legendItem(color: Color.white.opacity(0.06), label: "Off")
                    legendItem(color: .ironRed.opacity(0.6), label: "Active")
                    legendItem(color: .ironRed, label: "Today")
                }
            }

            // Heatmap grid (6 rows x 5 columns)
            let days = vm.last30Days
            let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(Array(days.enumerated()), id: \.offset) { index, dateString in
                    heatmapCell(dateString: dateString, isToday: dateString == EngagementService.todayString())
                }
            }
        }
    }

    private func heatmapCell(dateString: String, isToday: Bool) -> some View {
        let hasWorkout = vm.hasWorkout(on: dateString)
        let dayNumber = dayOfMonth(from: dateString)

        return VStack(spacing: 1) {
            RoundedRectangle(cornerRadius: 4)
                .fill(
                    hasWorkout
                        ? (isToday ? Color.ironRed : Color.ironRed.opacity(0.6))
                        : Color.white.opacity(0.04)
                )
                .frame(height: 28)
                .overlay(
                    Group {
                        if isToday {
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.ironRedLight, lineWidth: 1.5)
                        }
                    }
                )
                .shadow(color: isToday && hasWorkout ? .ironRed.opacity(0.4) : .clear, radius: 4)

            Text(dayNumber)
                .font(.system(size: 7, weight: .medium, design: .monospaced))
                .foregroundColor(isToday ? .white : .textTertiary)
        }
    }

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 3) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 8, weight: .medium))
                .foregroundColor(.textTertiary)
        }
    }

    private func dayOfMonth(from dateString: String) -> String {
        let parts = dateString.split(separator: "-")
        guard parts.count == 3, let day = Int(parts[2]) else { return "?" }
        return "\(day)"
    }

    // MARK: - Milestone Progress

    private var milestoneSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("MILESTONES")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.textTertiary)
                .tracking(1)

            ForEach(EngagementConfig.streakMilestones, id: \.days) { milestone in
                let isReached = vm.currentStreak >= milestone.days
                let isNext = !isReached && (vm.nextMilestone?.days == milestone.days)

                HStack(spacing: 12) {
                    // Milestone icon
                    ZStack {
                        Circle()
                            .fill(
                                isReached ? Color.orange.opacity(0.2)
                                : isNext ? Color.white.opacity(0.08)
                                : Color.white.opacity(0.03)
                            )
                            .frame(width: 32, height: 32)

                        Image(systemName: isReached ? milestone.sfSymbol : "lock.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(
                                isReached ? .orange
                                : isNext ? .white.opacity(0.4)
                                : .white.opacity(0.15)
                            )
                    }

                    // Title + days
                    VStack(alignment: .leading, spacing: 2) {
                        Text(milestone.title)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(isReached ? .white : .textTertiary)

                        Text("\(milestone.days) day streak")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.textTertiary)
                    }

                    Spacer()

                    // XP reward
                    HStack(spacing: 3) {
                        Text("+\(milestone.bonusXP)")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                        Text("XP")
                            .font(.system(size: 8, weight: .bold))
                    }
                    .foregroundColor(isReached ? .orange : .textTertiary)

                    // Status icon
                    if isReached {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.green)
                    } else if isNext {
                        // Progress indicator
                        let progress = Double(vm.currentStreak) / Double(milestone.days)
                        ZStack {
                            Circle()
                                .stroke(Color.white.opacity(0.1), lineWidth: 2)
                                .frame(width: 20, height: 20)
                            Circle()
                                .trim(from: 0, to: progress)
                                .stroke(Color.orange, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                                .frame(width: 20, height: 20)
                                .rotationEffect(.degrees(-90))
                        }
                    }
                }
                .padding(.vertical, 4)
                .opacity(isReached || isNext ? 1 : 0.5)
            }
        }
    }

    // MARK: - Shield Section

    private var shieldSection: some View {
        VStack(spacing: 12) {
            if vm.isShieldActive, let expires = vm.shieldExpiresAt {
                // Active shield countdown
                HStack(spacing: 12) {
                    Image(systemName: "shield.checkered")
                        .font(.system(size: 22))
                        .foregroundColor(.cyan)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("SHIELD ACTIVE")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.cyan)
                            .tracking(1)

                        Text("Expires \(expires, style: .relative)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.textTertiary)
                    }

                    Spacer()

                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.cyan.opacity(0.5))
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.cyan.opacity(0.06))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.cyan.opacity(0.15), lineWidth: 1)
                )
            } else if vm.streakAtRisk && vm.streakShields > 0 {
                // Shield available to use
                Button {
                    showShieldConfirmation = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "shield.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.cyan)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("USE STREAK SHIELD")
                                .font(.system(size: 12, weight: .black))
                                .foregroundColor(.white)
                                .tracking(1)

                            Text("Protect your streak for 24 hours")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(.textTertiary)
                        }

                        Spacer()

                        HStack(spacing: 4) {
                            Text("\(vm.streakShields)")
                                .font(.system(size: 14, weight: .black))
                                .foregroundColor(.cyan)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.textTertiary)
                        }
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.cyan.opacity(0.06))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.cyan.opacity(0.2), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Actions

    private func activateShield() async {
        await vm.useStreakShield()
        shieldActivated = true
    }
}

// MARK: - Preview

#if DEBUG
struct StreakDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            StreakDashboardView(vm: EngagementViewModel())
                .padding()
        }
        .background(Color.black)
        .preferredColorScheme(.dark)
    }
}
#endif
