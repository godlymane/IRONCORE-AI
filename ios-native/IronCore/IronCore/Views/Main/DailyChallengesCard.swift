import SwiftUI

/// Daily Challenges card — shown on the Dashboard.
/// Mirrors DailyChallenges.jsx from React prototype.
/// 3 daily quests with progress bars and XP rewards.
struct DailyChallengesCard: View {
    @StateObject private var vm = DailyChallengesViewModel()

    let todayWorkoutCount: Int
    let todayMealCount: Int
    let todayCaloriesBurned: Int
    let onXPClaimed: (Int) -> Void

    var body: some View {
        VStack(spacing: 14) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "target")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#eab308"))

                    Text("DAILY CHALLENGES")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(.white)
                        .tracking(1)
                }

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                    Text(vm.timeUntilReset)
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                }
                .foregroundColor(.gray)
            }

            // Challenge rows
            ForEach(vm.challenges) { challenge in
                challengeRow(challenge)
            }
        }
        .padding(16)
        .modifier(GlassCard())
        .onAppear {
            vm.updateChallenges(
                todayWorkoutCount: todayWorkoutCount,
                todayMealCount: todayMealCount,
                todayCaloriesBurned: todayCaloriesBurned
            )
        }
        .onChange(of: todayWorkoutCount) { _ in refreshChallenges() }
        .onChange(of: todayMealCount) { _ in refreshChallenges() }
        .onChange(of: todayCaloriesBurned) { _ in refreshChallenges() }
    }

    private func refreshChallenges() {
        vm.updateChallenges(
            todayWorkoutCount: todayWorkoutCount,
            todayMealCount: todayMealCount,
            todayCaloriesBurned: todayCaloriesBurned
        )
    }

    private func challengeRow(_ challenge: DailyChallengesViewModel.DailyChallenge) -> some View {
        let isClaimed = vm.isClaimed(challenge.id)

        return HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(challenge.isComplete ? Color.green.opacity(0.15) : Color.white.opacity(0.06))
                    .frame(width: 36, height: 36)
                Image(systemName: challenge.icon)
                    .font(.system(size: 14))
                    .foregroundColor(challenge.isComplete ? .green : .gray)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(challenge.title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(challenge.isComplete ? Color.green : Color.ironRedLight)
                            .frame(width: geo.size.width * challenge.progress, height: 6)
                            .animation(.easeOut, value: challenge.progress)
                    }
                }
                .frame(height: 6)

                Text(challenge.progressText)
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(.gray)
            }

            Spacer()

            // XP reward / claim button
            if isClaimed {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.green)
                    Text("Done")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.green)
                }
            } else if challenge.isComplete {
                Button {
                    if let xp = vm.claim(challengeId: challenge.id) {
                        onXPClaimed(xp)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                        Text("+\(challenge.xpReward)")
                            .font(.system(size: 11, weight: .black))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [Color(hex: "#eab308"), Color.orange],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                    )
                }
            } else {
                Text("+\(challenge.xpReward)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: "#eab308").opacity(0.5))
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isClaimed ? Color.green.opacity(0.04) : Color.white.opacity(0.02))
        )
    }
}
