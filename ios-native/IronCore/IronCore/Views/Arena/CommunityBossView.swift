import SwiftUI

/// Community Boss Raids — global boss fight where all users deal damage.
/// Mirrors CommunityBoss.jsx from React prototype.
struct CommunityBossView: View {
    @StateObject private var vm = CommunityBossViewModel()
    @EnvironmentObject var authVM: AuthViewModel

    private var uid: String { authVM.uid ?? "" }
    private var username: String { authVM.profile?.goal ?? "Warrior" }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                if vm.isLoading {
                    loadingState
                } else if let boss = vm.boss {
                    bossCard(boss)
                    actionSection(boss)
                    leaderboardSection
                } else {
                    noBossState
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .onAppear { vm.startListening() }
        .onDisappear { vm.stopListening() }
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack(spacing: 16) {
            Spacer().frame(height: 40)
            ProgressView()
                .tint(.ironRedLight)
                .scaleEffect(1.2)
            Text("Loading Boss Raid...")
                .font(.system(size: 13))
                .foregroundColor(.gray)
            Spacer()
        }
    }

    private var noBossState: some View {
        VStack(spacing: 16) {
            Spacer().frame(height: 60)
            Image(systemName: "shield.checkered")
                .font(.system(size: 48))
                .foregroundColor(.gray.opacity(0.3))
            Text("NO ACTIVE BOSS")
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
            Text("The community has defeated all current bosses.\nA new challenger will appear soon.")
                .font(.system(size: 13))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
            Spacer()
        }
    }

    // MARK: - Boss Card

    private func bossCard(_ boss: CommunityBoss) -> some View {
        VStack(spacing: 16) {
            // Boss icon + name
            ZStack {
                Circle()
                    .fill(Color.ironRed.opacity(0.15))
                    .frame(width: 72, height: 72)
                Image(systemName: "flame.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.ironRedLight)
            }

            Text(boss.name)
                .font(.system(size: 22, weight: .black))
                .foregroundColor(.white)

            // Status badge
            Text(vm.isDefeated ? "DEFEATED" : "ACTIVE")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(vm.isDefeated ? .green : .ironRedLight)
                .tracking(2)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(
                    Capsule()
                        .fill(vm.isDefeated ? Color.green.opacity(0.15) : Color.ironRed.opacity(0.15))
                )

            // HP Bar
            VStack(spacing: 6) {
                HStack {
                    Text("HP")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.gray)
                        .tracking(2)
                    Spacer()
                    Text("\(boss.currentHP) / \(boss.totalHP)")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 16)

                        RoundedRectangle(cornerRadius: 6)
                            .fill(hpColor)
                            .frame(width: geo.size.width * vm.hpPercent, height: 16)
                            .animation(.easeOut(duration: 0.5), value: vm.hpPercent)
                    }
                }
                .frame(height: 16)

                Text("\(Int(vm.hpPercent * 100))% remaining")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.gray)
            }

            // Contributors count
            HStack(spacing: 6) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.cyan)
                Text("\(boss.contributors.count) warriors joined")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.gray)
            }
        }
        .padding(20)
        .modifier(GlassCard())
    }

    private var hpColor: LinearGradient {
        if vm.hpPercent > 0.5 {
            return LinearGradient(colors: [Color.green, Color.green.opacity(0.8)], startPoint: .leading, endPoint: .trailing)
        } else if vm.hpPercent > 0.25 {
            return LinearGradient(colors: [Color(hex: "#eab308"), Color.orange], startPoint: .leading, endPoint: .trailing)
        } else {
            return LinearGradient(colors: [Color.ironRed, Color.ironRedLight], startPoint: .leading, endPoint: .trailing)
        }
    }

    // MARK: - Action Section

    @ViewBuilder
    private func actionSection(_ boss: CommunityBoss) -> some View {
        if vm.isActive {
            // Deal damage section
            VStack(spacing: 12) {
                let damage = calculateDamage()

                Text("Your Workout Power: \(damage) DMG")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.ironRedLight)

                Button {
                    Task {
                        await vm.dealDamage(uid: uid, username: username, damage: damage)
                    }
                } label: {
                    HStack(spacing: 8) {
                        if vm.isDealingDamage {
                            ProgressView().tint(.white).scaleEffect(0.8)
                        } else {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 16))
                        }
                        Text(vm.isDealingDamage ? "ATTACKING..." : "DEAL DAMAGE")
                            .font(.system(size: 16, weight: .black))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: [Color.ironRed, Color.ironRedDark],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .shadow(color: Color.ironRed.opacity(0.4), radius: 12)
                }
                .disabled(vm.isDealingDamage)

                // User contribution
                if let contrib = vm.userContribution(uid: uid) {
                    HStack {
                        Text("Your damage:")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                        Spacer()
                        Text("\(contrib.damageDealt) total")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(.ironRedLight)
                    }
                }

                if let rank = vm.userRank(uid: uid) {
                    HStack {
                        Text("Your rank:")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                        Spacer()
                        Text("#\(rank)")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(hex: "#eab308"))
                    }
                }
            }
            .padding(16)
            .modifier(GlassCard())

        } else if vm.isDefeated {
            // Claim reward
            VStack(spacing: 12) {
                Image(systemName: "gift.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color(hex: "#eab308"))

                Text("Boss Defeated!")
                    .font(.system(size: 16, weight: .black))
                    .foregroundColor(.white)

                if vm.hasClaimedReward(uid: uid) {
                    Text("Reward Claimed!")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.green)
                } else if vm.userContribution(uid: uid) != nil {
                    Button {
                        Task { await vm.claimReward(uid: uid) }
                    } label: {
                        HStack(spacing: 8) {
                            if vm.isClaiming {
                                ProgressView().tint(.black).scaleEffect(0.8)
                            }
                            Text(vm.isClaiming ? "CLAIMING..." : "CLAIM 500 XP")
                                .font(.system(size: 14, weight: .black))
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color(hex: "#eab308"))
                        )
                    }
                    .disabled(vm.isClaiming)
                } else {
                    Text("You didn't participate in this raid.")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
            }
            .padding(16)
            .modifier(GlassCard())
        }

        if let error = vm.errorMessage {
            Text(error)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.ironRedLight)
        }
    }

    // MARK: - Leaderboard

    private var leaderboardSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("TOP CONTRIBUTORS")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.white.opacity(0.4))
                    .tracking(2)
                Spacer()
            }

            if vm.topContributors.isEmpty {
                Text("No contributors yet. Be the first!")
                    .font(.system(size: 12))
                    .foregroundColor(.gray)
                    .padding(.vertical, 20)
            } else {
                ForEach(Array(vm.topContributors.enumerated()), id: \.element.userId) { idx, contributor in
                    HStack(spacing: 12) {
                        // Rank
                        Text("\(idx + 1)")
                            .font(.system(size: 14, weight: .black, design: .monospaced))
                            .foregroundColor(rankColor(idx))
                            .frame(width: 28)

                        // Avatar
                        ZStack {
                            Circle()
                                .fill(contributor.userId == uid ? Color.ironRed.opacity(0.2) : Color.white.opacity(0.06))
                                .frame(width: 36, height: 36)
                            Text(String(contributor.username.prefix(1)).uppercased())
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(contributor.userId == uid ? .ironRedLight : .gray)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(contributor.username)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(contributor.userId == uid ? .ironRedLight : .white)
                            Text("\(contributor.damageDealt) damage")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }

                        Spacer()

                        if idx == 0 {
                            Image(systemName: "crown.fill")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#ffd700"))
                        }
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - Helpers

    private func calculateDamage() -> Int {
        // Base damage from XP level
        let xp = authVM.profile?.xp ?? 0
        let baseDamage = max(50, xp / 10)
        return min(baseDamage, 500)
    }

    private func rankColor(_ index: Int) -> Color {
        switch index {
        case 0: return Color(hex: "#ffd700") // Gold
        case 1: return Color(hex: "#c0c0c0") // Silver
        case 2: return Color(hex: "#cd7f32") // Bronze
        default: return .gray
        }
    }
}
