import SwiftUI

/// Battle Pass — 30-tier seasonal progression with free & premium tracks.
/// Mirrors BattlePassView.jsx from React prototype.
struct BattlePassView: View {
    @StateObject private var vm = BattlePassViewModel()
    @EnvironmentObject var premiumVM: PremiumViewModel

    var body: some View {
        VStack(spacing: 0) {
            header
            progressBar
            tierList
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("BATTLE PASS")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(.white)
                        .tracking(-0.5)

                    Text("SEASON 1 — IRON ORIGINS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "#eab308"))
                        .tracking(2)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("TIER \(vm.currentTier)")
                        .font(.system(size: 16, weight: .black, design: .monospaced))
                        .foregroundColor(Color(hex: "#eab308"))

                    Text(vm.seasonTimeRemaining)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        VStack(spacing: 6) {
            HStack {
                Text("Tier \(vm.currentTier) Progress")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.gray)
                Spacer()
                Text("\(vm.currentXP) / \(vm.xpPerTier) XP")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: "#eab308"))
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: "#eab308"), Color(hex: "#f59e0b")],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * vm.tierProgress, height: 8)
                        .animation(.easeOut, value: vm.tierProgress)
                }
            }
            .frame(height: 8)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    // MARK: - Tier List

    private var tierList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 8) {
                ForEach(vm.rewards) { reward in
                    tierRow(reward)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
    }

    private func tierRow(_ reward: BattlePassViewModel.BattlePassReward) -> some View {
        let state = vm.tierState(reward.tier)
        let isUnlocked = state == .unlocked || state == .current

        return HStack(spacing: 12) {
            // Tier number
            ZStack {
                Circle()
                    .fill(tierCircleColor(state))
                    .frame(width: 36, height: 36)

                if state == .current {
                    Circle()
                        .stroke(Color(hex: "#eab308"), lineWidth: 2)
                        .frame(width: 36, height: 36)
                }

                Text("\(reward.tier)")
                    .font(.system(size: 14, weight: .black, design: .monospaced))
                    .foregroundColor(isUnlocked ? .white : .gray)
            }

            // Free reward
            VStack(alignment: .leading, spacing: 2) {
                Text("FREE")
                    .font(.system(size: 8, weight: .black))
                    .foregroundColor(Color.white.opacity(0.3))
                    .tracking(1)

                Text(reward.freeReward)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(isUnlocked ? .white : Color.white.opacity(0.4))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Claim free button
            if isUnlocked && !vm.isFreeClaimed(reward.tier) {
                Button {
                    vm.claimFreeReward(reward.tier)
                } label: {
                    Text("CLAIM")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule().fill(Color.green.opacity(0.8))
                        )
                }
            } else if vm.isFreeClaimed(reward.tier) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.green)
            }

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(width: 1, height: 36)

            // Premium reward
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 8))
                        .foregroundColor(Color(hex: "#eab308"))
                    Text("PREMIUM")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(Color(hex: "#eab308").opacity(0.6))
                        .tracking(1)
                }

                Text(reward.premiumReward)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(isUnlocked && premiumVM.isPremium ? Color(hex: "#eab308") : Color.white.opacity(0.3))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Claim premium button
            if isUnlocked && premiumVM.isPremium && !vm.isPremiumClaimed(reward.tier) {
                Button {
                    vm.claimPremiumReward(reward.tier)
                } label: {
                    Text("CLAIM")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.black)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule().fill(Color(hex: "#eab308"))
                        )
                }
            } else if vm.isPremiumClaimed(reward.tier) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "#eab308"))
            } else if !premiumVM.isPremium && isUnlocked {
                Image(systemName: "lock.fill")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "#eab308").opacity(0.4))
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(state == .current
                      ? Color(hex: "#eab308").opacity(0.06)
                      : Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(state == .current
                                ? Color(hex: "#eab308").opacity(0.2)
                                : Color.white.opacity(0.05), lineWidth: 1)
                )
        )
    }

    private func tierCircleColor(_ state: BattlePassViewModel.TierState) -> Color {
        switch state {
        case .unlocked: return Color.green.opacity(0.3)
        case .current: return Color(hex: "#eab308").opacity(0.2)
        case .locked: return Color.white.opacity(0.05)
        }
    }
}
