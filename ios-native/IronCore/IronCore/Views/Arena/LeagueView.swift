import SwiftUI

/// League display — tier badge, XP progress bar, top 50 leaderboard, promotion animation.
/// Mirrors League section of ArenaView.jsx from React prototype.
struct LeagueView: View {
    @ObservedObject var vm: LeagueViewModel
    let uid: String
    let profile: UserProfile?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                tierCard
                progressCard
                leaderboardSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
        .overlay {
            if vm.showPromotion {
                promotionOverlay
            }
        }
    }

    // MARK: - Tier Badge Card

    private var tierCard: some View {
        let colors = LeagueViewModel.tierColor(for: vm.currentTier.name)
        let tierColor = Color(hex: colors.primary)

        return VStack(spacing: 16) {
            // Tier icon
            ZStack {
                Circle()
                    .fill(tierColor.opacity(0.15))
                    .frame(width: 88, height: 88)

                Circle()
                    .stroke(tierColor.opacity(0.4), lineWidth: 2)
                    .frame(width: 88, height: 88)

                Image(systemName: LeagueViewModel.tierIcon(for: vm.currentTier.name))
                    .font(.system(size: 36))
                    .foregroundColor(tierColor)
            }
            .shadow(color: tierColor.opacity(0.3), radius: 20)

            VStack(spacing: 4) {
                Text(vm.currentTier.name.uppercased())
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(tierColor)
                    .tracking(2)

                Text("\(vm.userXP) XP")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.6))
            }

            if vm.userRank > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "number")
                        .font(.system(size: 12))
                    Text("\(vm.userRank)")
                        .font(.system(size: 16, weight: .black))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(tierColor.opacity(0.2))
                        .overlay(Capsule().stroke(tierColor.opacity(0.3), lineWidth: 1))
                )
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: [tierColor.opacity(0.08), Color.white.opacity(0.02)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(tierColor.opacity(0.2), lineWidth: 1)
                )
        )
    }

    // MARK: - Progress to Next Tier

    private var progressCard: some View {
        let colors = LeagueViewModel.tierColor(for: vm.currentTier.name)
        let tierColor = Color(hex: colors.primary)

        return VStack(spacing: 12) {
            HStack {
                Text("TIER PROGRESS")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.white.opacity(0.5))
                    .tracking(2)
                Spacer()
                if let next = vm.nextTier {
                    Text("\(vm.userXP - vm.currentTier.minXP) / \(next.minXP - vm.currentTier.minXP)")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(tierColor)
                } else {
                    Text("MAX TIER")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(Color(hex: "#a855f7"))
                        .tracking(1)
                }
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 12)

                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: [tierColor, tierColor.opacity(0.7)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * vm.progressToNext, height: 12)
                        .animation(.easeOut(duration: 0.8), value: vm.progressToNext)
                        .shadow(color: tierColor.opacity(0.5), radius: 6)
                }
            }
            .frame(height: 12)

            // Tier labels
            HStack {
                Text(vm.currentTier.name)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(tierColor)
                Spacer()
                if let next = vm.nextTier {
                    let nextColors = LeagueViewModel.tierColor(for: next.name)
                    Text(next.name)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: nextColors.primary))
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - Leaderboard

    private var leaderboardSection: some View {
        VStack(spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#ffd700"))
                    Text("LEADERBOARD")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)
                        .tracking(1)
                }
                Spacer()
                Text("TOP 50")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.4))
            }

            if vm.leaderboard.isEmpty && vm.dataLoaded {
                VStack(spacing: 8) {
                    Image(systemName: "person.3")
                        .font(.system(size: 32))
                        .foregroundColor(Color.gray.opacity(0.3))
                    Text("No competitors yet")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .modifier(GlassCard())
            } else {
                ForEach(vm.leaderboard) { entry in
                    LeaderboardRow(entry: entry, isCurrentUser: entry.id == uid)
                }
            }
        }
    }

    // MARK: - Promotion Overlay

    private var promotionOverlay: some View {
        ZStack {
            Color.black.opacity(0.85)
                .ignoresSafeArea()
                .onTapGesture { vm.dismissPromotion() }

            VStack(spacing: 24) {
                if let tier = vm.promotedTo {
                    let colors = LeagueViewModel.tierColor(for: tier.name)
                    let tierColor = Color(hex: colors.primary)

                    Text("PROMOTED")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(tierColor)
                        .tracking(4)

                    ZStack {
                        Circle()
                            .fill(tierColor.opacity(0.15))
                            .frame(width: 120, height: 120)

                        Circle()
                            .stroke(tierColor, lineWidth: 3)
                            .frame(width: 120, height: 120)

                        Image(systemName: LeagueViewModel.tierIcon(for: tier.name))
                            .font(.system(size: 52))
                            .foregroundColor(tierColor)
                    }
                    .shadow(color: tierColor.opacity(0.5), radius: 30)

                    Text(tier.name.uppercased())
                        .font(.system(size: 28, weight: .black))
                        .foregroundColor(.white)

                    if let prev = vm.previousTier {
                        Text("Up from \(prev.name)")
                            .font(.system(size: 14))
                            .foregroundColor(Color.white.opacity(0.5))
                    }

                    Button { vm.dismissPromotion() } label: {
                        Text("LET'S GO")
                            .font(.system(size: 14, weight: .black))
                            .foregroundColor(.white)
                            .padding(.horizontal, 40)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(
                                        LinearGradient(
                                            colors: [tierColor, tierColor.opacity(0.7)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                            .shadow(color: tierColor.opacity(0.4), radius: 15)
                    }
                }
            }
            .transition(.scale.combined(with: .opacity))
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: vm.showPromotion)
    }
}

// MARK: - Leaderboard Row

private struct LeaderboardRow: View {
    let entry: LeagueViewModel.LeaderboardEntry
    let isCurrentUser: Bool

    var body: some View {
        let colors = LeagueViewModel.tierColor(for: entry.league)
        let tierColor = Color(hex: colors.primary)

        HStack(spacing: 12) {
            // Rank
            ZStack {
                if entry.rank <= 3 {
                    Circle()
                        .fill(rankColor.opacity(0.2))
                        .frame(width: 32, height: 32)
                }
                Text("\(entry.rank)")
                    .font(.system(size: entry.rank <= 3 ? 14 : 13, weight: .black, design: .monospaced))
                    .foregroundColor(entry.rank <= 3 ? rankColor : .gray)
            }
            .frame(width: 32)

            // Avatar placeholder
            ZStack {
                Circle()
                    .fill(tierColor.opacity(0.2))
                    .frame(width: 36, height: 36)
                Text(String(entry.username.prefix(1)).uppercased())
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(tierColor)
            }

            // Name + League
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.username)
                    .font(.system(size: 14, weight: isCurrentUser ? .black : .semibold))
                    .foregroundColor(isCurrentUser ? .ironRedLight : .white)
                    .lineLimit(1)
                Text(entry.league)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(tierColor.opacity(0.7))
            }

            Spacer()

            // XP
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(entry.xp)")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                Text("XP")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.4))
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(isCurrentUser ? Color.ironRed.opacity(0.1) : Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(
                            isCurrentUser ? Color.ironRedLight.opacity(0.3) : Color.white.opacity(0.06),
                            lineWidth: 1
                        )
                )
        )
    }

    private var rankColor: Color {
        switch entry.rank {
        case 1: return Color(hex: "#ffd700") // gold
        case 2: return Color(hex: "#c0c0c0") // silver
        case 3: return Color(hex: "#cd7f32") // bronze
        default: return .gray
        }
    }
}
