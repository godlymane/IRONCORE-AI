import SwiftUI

/// Daily Rewards calendar view — 30-day reward cycle with escalating values.
/// Mirrors the daily reward system from the React prototype (engagementData.js).
/// Dark theme, red accents, calendar grid layout.
struct DailyRewardsView: View {
    @ObservedObject var vm: EngagementViewModel

    @State private var showClaimAnimation: Bool = false
    @State private var claimedRewardLabel: String = ""

    // Grid: 7 columns for a week-style layout
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)

    var body: some View {
        VStack(spacing: 20) {
            // MARK: - Header Stats
            headerSection

            // MARK: - Calendar Grid
            calendarGrid

            // MARK: - Claim Button
            claimButton

            // MARK: - Next Reward Preview
            if let next = vm.nextReward, !vm.canClaimDailyReward {
                nextRewardPreview(next)
            }
        }
        .padding(20)
        .modifier(GlassCard())
        .overlay(claimOverlay)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(spacing: 12) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.ironRed)

                    Text("DAILY REWARDS")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.white)
                        .tracking(2)
                }

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                    Text("Resets in \(vm.timeUntilDailyReset)")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                }
                .foregroundColor(.gray)
            }

            // Streak & Multiplier bar
            HStack(spacing: 16) {
                // Current streak
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.orange)
                    Text("\(vm.currentStreak)")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                    Text("DAY STREAK")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.textTertiary)
                        .tracking(0.5)
                }

                Spacer()

                // Multiplier
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#eab308"))
                    Text(String(format: "%.1fx", vm.effectiveMultiplier))
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                    Text("XP")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.textTertiary)
                        .tracking(0.5)
                }

                Spacer()

                // Claims this month
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                    Text("\(vm.thisMonthClaims)")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                    Text("CLAIMED")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.textTertiary)
                        .tracking(0.5)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Calendar Grid

    private var calendarGrid: some View {
        VStack(spacing: 4) {
            // Day labels
            HStack(spacing: 8) {
                ForEach(["M", "T", "W", "T", "F", "S", "S"], id: \.self) { day in
                    Text(day)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.textTertiary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.bottom, 4)

            // Reward day cells (1-31 in a 7-column grid)
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(vm.allDailyRewards) { reward in
                    rewardCell(reward)
                }
            }
        }
    }

    private func rewardCell(_ reward: DailyReward) -> some View {
        let isClaimed = vm.isDayClaimed(dayIndex: reward.day - 1)
        let isCurrent = vm.isCurrentDay(reward.day)
        let isFuture = reward.day > vm.dailyRewardDay + 1

        return VStack(spacing: 2) {
            // Icon
            ZStack {
                if isClaimed {
                    // Claimed: checkmark
                    Circle()
                        .fill(Color.green.opacity(0.15))
                        .frame(width: 32, height: 32)
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.green)
                } else if isCurrent {
                    // Current day: red glow
                    Circle()
                        .fill(Color.ironRed.opacity(0.2))
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle()
                                .stroke(Color.ironRed, lineWidth: 2)
                        )
                        .shadow(color: .ironRed.opacity(0.5), radius: 6)
                    Image(systemName: reward.sfSymbol)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.ironRedLight)
                } else if isFuture {
                    // Future: locked
                    Circle()
                        .fill(Color.white.opacity(0.04))
                        .frame(width: 32, height: 32)
                    Image(systemName: "lock.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Color.white.opacity(0.15))
                } else {
                    // Available but not yet claimed (missed day)
                    Circle()
                        .fill(Color.white.opacity(0.06))
                        .frame(width: 32, height: 32)
                    Image(systemName: reward.sfSymbol)
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)
                }
            }

            // Day number
            Text("\(reward.day)")
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(isCurrent ? .white : .textTertiary)
        }
        .frame(height: 48)
    }

    // MARK: - Claim Button

    private var claimButton: some View {
        Group {
            if vm.canClaimDailyReward, let reward = vm.nextReward {
                Button {
                    Task { await claimReward() }
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: reward.sfSymbol)
                            .font(.system(size: 18, weight: .bold))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("CLAIM DAY \(vm.dailyRewardDay + 1)")
                                .font(.system(size: 14, weight: .black))
                                .tracking(1)

                            Text(reward.label)
                                .font(.system(size: 11, weight: .medium))
                                .opacity(0.8)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(LinearGradient.ironGradient)
                    )
                    .shadow(color: .ironRed.opacity(0.4), radius: 12, y: 4)
                }
                .disabled(vm.isLoading)
                .opacity(vm.isLoading ? 0.6 : 1)
                .scaleEffect(vm.canClaimDailyReward ? 1.0 : 0.95)
                .animation(.spring(response: 0.3), value: vm.canClaimDailyReward)
            } else {
                // Already claimed today
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.green)

                    Text("REWARD CLAIMED")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.green)
                        .tracking(1)

                    Spacer()

                    Text("Come back tomorrow!")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.textTertiary)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.green.opacity(0.08))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.green.opacity(0.2), lineWidth: 1)
                )
            }
        }
    }

    // MARK: - Next Reward Preview

    private func nextRewardPreview(_ reward: DailyReward) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "arrow.right.circle.fill")
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)

            Text("NEXT:")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.textTertiary)
                .tracking(0.5)

            Image(systemName: reward.sfSymbol)
                .font(.system(size: 12))
                .foregroundColor(rewardColor(for: reward.type))

            Text(reward.label)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)

            Spacer()

            Text("Day \(reward.day)")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.textTertiary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.03))
        )
    }

    // MARK: - Claim Overlay Animation

    private var claimOverlay: some View {
        Group {
            if showClaimAnimation {
                ZStack {
                    Color.black.opacity(0.6)
                        .ignoresSafeArea()

                    VStack(spacing: 16) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 48))
                            .foregroundColor(Color(hex: "#eab308"))
                            .scaleEffect(showClaimAnimation ? 1.2 : 0.5)

                        Text("REWARD CLAIMED!")
                            .font(.system(size: 18, weight: .black))
                            .foregroundColor(.white)
                            .tracking(2)

                        Text(claimedRewardLabel)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.ironRedLight)

                        Text("+\(vm.lastClaimResult?.reward.amount ?? 0) XP")
                            .font(.system(size: 24, weight: .black))
                            .foregroundColor(Color(hex: "#eab308"))
                            .opacity(vm.lastClaimResult?.reward.type == .xp ? 1 : 0)
                    }
                    .padding(32)
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(LinearGradient(
                                colors: [Color(hex: "#1a1a1a"), Color(hex: "#0a0a0a")],
                                startPoint: .top,
                                endPoint: .bottom
                            ))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color(hex: "#eab308").opacity(0.3), lineWidth: 1)
                    )
                    .shadow(color: Color(hex: "#eab308").opacity(0.3), radius: 20)
                    .scaleEffect(showClaimAnimation ? 1 : 0.8)
                }
                .transition(.opacity)
                .onTapGesture {
                    withAnimation(.easeOut(duration: 0.2)) {
                        showClaimAnimation = false
                    }
                }
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: showClaimAnimation)
    }

    // MARK: - Actions

    private func claimReward() async {
        await vm.claimDailyReward()
        if let result = vm.lastClaimResult {
            claimedRewardLabel = result.message
            withAnimation {
                showClaimAnimation = true
            }
            // Auto-dismiss after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation {
                    showClaimAnimation = false
                }
            }
        }
    }

    // MARK: - Helpers

    private func rewardColor(for type: DailyRewardType) -> Color {
        switch type {
        case .xp: return Color(hex: "#eab308")
        case .item: return .ironRed
        case .mystery: return Color(hex: "#a855f7")
        case .premium: return Color(hex: "#f59e0b")
        }
    }
}

// MARK: - Preview

#if DEBUG
struct DailyRewardsView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            DailyRewardsView(vm: EngagementViewModel())
                .padding()
        }
        .background(Color.black)
        .preferredColorScheme(.dark)
    }
}
#endif
