import SwiftUI
import FirebaseAuth

/// Arena — the competitive hub. Tab-based: League (tiers + leaderboard) | Battles (PvP).
/// Mirrors ArenaView.jsx + CommunityView.jsx from React prototype.
struct ArenaView: View {
    @StateObject private var leagueVM = LeagueViewModel()
    @StateObject private var arenaVM = ArenaViewModel()
    @EnvironmentObject var authVM: AuthViewModel

    @State private var activeTab = 0

    private var uid: String { authVM.uid ?? "" }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                tabPicker
                tabContent
            }
        }
        .onAppear {
            guard !uid.isEmpty else { return }
            leagueVM.startListening(uid: uid)
            arenaVM.startListening(uid: uid)
        }
        .onDisappear {
            leagueVM.stopListening()
            arenaVM.stopListening()
        }
        .sheet(isPresented: $arenaVM.showResult) {
            if let result = arenaVM.lastResult {
                BattleResultSheet(result: result) {
                    arenaVM.dismissResult()
                }
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("ARENA")
                    .font(.system(size: 24, weight: .black))
                    .italic()
                    .foregroundColor(.white)
                    .tracking(-1)

                Text("COMPETE • RANK UP • DOMINATE")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(2)
            }

            Spacer()

            // XP badge
            HStack(spacing: 4) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 12))
                Text("\(leagueVM.userXP)")
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundColor(Color(hex: "#eab308"))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "#eab308").opacity(0.15))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color(hex: "#eab308").opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 0) {
            tabButton("League", icon: "crown.fill", tag: 0)
            tabButton("Battles", icon: "bolt.fill", tag: 1)
        }
        .padding(4)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    private func tabButton(_ title: String, icon: String, tag: Int) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { activeTab = tag }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                Text(title)
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundColor(activeTab == tag ? .white : .gray)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                Group {
                    if activeTab == tag {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(
                                LinearGradient(
                                    colors: [Color.ironRed.opacity(0.8), Color.ironRedDark.opacity(0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    }
                }
            )
        }
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        if activeTab == 0 {
            LeagueView(vm: leagueVM, uid: uid, profile: authVM.profile)
        } else {
            BattlesView(
                arenaVM: arenaVM,
                leagueVM: leagueVM,
                uid: uid,
                profile: authVM.profile
            )
        }
    }
}

// MARK: - Battles View

private struct BattlesView: View {
    @ObservedObject var arenaVM: ArenaViewModel
    @ObservedObject var leagueVM: LeagueViewModel
    let uid: String
    let profile: UserProfile?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                matchmakingSection
                pendingBattlesSection
                activeBattlesSection
                battleHistorySection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 20)
        }
    }

    // MARK: - Matchmaking

    private var matchmakingSection: some View {
        VStack(spacing: 16) {
            if arenaVM.isSearching {
                // Searching animation
                VStack(spacing: 16) {
                    HStack(spacing: 8) {
                        ProgressView()
                            .tint(.ironRedLight)
                        Text("SEARCHING FOR OPPONENT...")
                            .font(.system(size: 12, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .tracking(2)
                    }

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.white.opacity(0.08))
                                .frame(height: 6)

                            RoundedRectangle(cornerRadius: 4)
                                .fill(LinearGradient.ironGradient)
                                .frame(width: geo.size.width * arenaVM.searchProgress, height: 6)
                                .animation(.linear(duration: 0.1), value: arenaVM.searchProgress)
                        }
                    }
                    .frame(height: 6)

                    Button { arenaVM.cancelMatchmaking() } label: {
                        Text("Cancel")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.gray)
                    }
                }
                .padding(20)
                .modifier(GlassCard())

            } else if arenaVM.matchFound, let opponent = arenaVM.selectedOpponent {
                // Opponent found — show challenge card
                OpponentCard(
                    opponent: opponent,
                    onChallenge: {
                        Task {
                            await arenaVM.challengePlayer(
                                uid: uid,
                                username: profile?.goal ?? "Warrior",
                                userXP: leagueVM.userXP,
                                opponent: opponent
                            )
                        }
                    },
                    onCancel: { arenaVM.cancelMatchmaking() }
                )

            } else {
                // Find opponent button
                Button {
                    arenaVM.startMatchmaking(
                        leaderboard: leagueVM.leaderboard,
                        userXP: leagueVM.userXP,
                        uid: uid
                    )
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "bolt.circle.fill")
                            .font(.system(size: 24))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("FIND OPPONENT")
                                .font(.system(size: 16, weight: .black))
                            Text("24h Volume War • +100 XP for winner")
                                .font(.system(size: 11))
                                .foregroundColor(Color.white.opacity(0.6))
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color.white.opacity(0.4))
                    }
                    .foregroundColor(.white)
                    .padding(20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    colors: [Color.ironRed.opacity(0.3), Color.ironRedDark.opacity(0.15)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                            )
                    )
                    .shadow(color: Color.ironRed.opacity(0.2), radius: 15)
                }
            }
        }
    }

    // MARK: - Pending Battles (incoming challenges)

    @ViewBuilder
    private var pendingBattlesSection: some View {
        if !arenaVM.pendingBattles.isEmpty {
            VStack(spacing: 12) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#f59e0b"))
                        Text("INCOMING CHALLENGES")
                            .font(.system(size: 12, weight: .black))
                            .foregroundColor(Color(hex: "#f59e0b"))
                            .tracking(1)
                    }
                    Spacer()
                    Text("\(arenaVM.pendingBattles.count)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: "#f59e0b"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule().fill(Color(hex: "#f59e0b").opacity(0.15))
                        )
                }

                ForEach(arenaVM.pendingBattles) { battle in
                    PendingBattleCard(battle: battle, uid: uid) { action in
                        Task {
                            switch action {
                            case .accept: await arenaVM.acceptBattle(battle.id)
                            case .decline: await arenaVM.declineBattle(battle.id)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Active Battles

    @ViewBuilder
    private var activeBattlesSection: some View {
        if !arenaVM.activeBattles.isEmpty {
            VStack(spacing: 12) {
                HStack {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text("ACTIVE BATTLES")
                            .font(.system(size: 12, weight: .black))
                            .foregroundColor(.green)
                            .tracking(1)
                    }
                    Spacer()
                }

                ForEach(arenaVM.activeBattles) { battle in
                    ActiveBattleCard(
                        battle: battle,
                        uid: uid,
                        leaderboard: leagueVM.leaderboard,
                        timeRemaining: arenaVM.timeRemaining(for: battle)
                    )
                }
            }
        }
    }

    // MARK: - Battle History

    private var battleHistorySection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("BATTLE LOG")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(Color.white.opacity(0.5))
                    .tracking(1)
                Spacer()
            }

            if arenaVM.battleHistory.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "shield.slash")
                        .font(.system(size: 32))
                        .foregroundColor(Color.gray.opacity(0.3))
                    Text("No battles yet")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                    Text("Challenge someone from the leaderboard")
                        .font(.system(size: 11))
                        .foregroundColor(Color.gray.opacity(0.5))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .modifier(GlassCard())
            } else {
                ForEach(arenaVM.battleHistory) { battle in
                    BattleHistoryRow(battle: battle, uid: uid)
                }
            }
        }
    }
}

// MARK: - Opponent Card (matchmaking result)

private struct OpponentCard: View {
    let opponent: ArenaViewModel.Opponent
    let onChallenge: () -> Void
    let onCancel: () -> Void

    var body: some View {
        let oppColors = LeagueViewModel.tierColor(for: opponent.league)
        let tierColor = Color(hex: oppColors.primary)

        VStack(spacing: 16) {
            Text("OPPONENT FOUND")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(.ironRedLight)
                .tracking(3)

            // Opponent info
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(tierColor.opacity(0.2))
                        .frame(width: 56, height: 56)
                    Text(String(opponent.username.prefix(1)).uppercased())
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(tierColor)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(opponent.username)
                        .font(.system(size: 18, weight: .black))
                        .foregroundColor(.white)
                    HStack(spacing: 8) {
                        Text(opponent.league)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(tierColor)
                        Text("•")
                            .foregroundColor(.gray)
                        Text("\(opponent.xp) XP")
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(.gray)
                    }
                }

                Spacer()
            }

            // Win probability
            VStack(spacing: 6) {
                HStack {
                    Text("Win Probability")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.5))
                    Spacer()
                    Text("\(Int(opponent.winProbability))%")
                        .font(.system(size: 14, weight: .black, design: .monospaced))
                        .foregroundColor(opponent.winProbability >= 50 ? .green : .ironRedLight)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 8)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(opponent.winProbability >= 50
                                  ? Color.green.opacity(0.8)
                                  : Color.ironRedLight.opacity(0.8))
                            .frame(width: geo.size.width * opponent.winProbability / 100, height: 8)
                    }
                }
                .frame(height: 8)
            }

            // Action buttons
            HStack(spacing: 12) {
                Button(action: onCancel) {
                    Text("Pass")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.white.opacity(0.06))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                }

                Button(action: onChallenge) {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 12))
                        Text("CHALLENGE")
                            .font(.system(size: 14, weight: .black))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(
                                LinearGradient(
                                    colors: [Color.ironRed, Color.ironRedDark],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .shadow(color: Color.ironRed.opacity(0.4), radius: 10)
                }
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                )
        )
    }
}

// MARK: - Pending Battle Card

private struct PendingBattleCard: View {
    let battle: ArenaViewModel.Battle
    let uid: String
    let onAction: (PendingAction) -> Void

    enum PendingAction { case accept, decline }

    private var challenger: ArenaViewModel.BattlePlayer { battle.challenger }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(hex: "#f59e0b").opacity(0.2))
                    .frame(width: 44, height: 44)
                Image(systemName: "bolt.fill")
                    .font(.system(size: 18))
                    .foregroundColor(Color(hex: "#f59e0b"))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(challenger.username)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("\(challenger.xp) XP • Volume War")
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }

            Spacer()

            HStack(spacing: 8) {
                Button { onAction(.decline) } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.gray)
                        .padding(10)
                        .background(
                            Circle().fill(Color.white.opacity(0.06))
                        )
                }

                Button { onAction(.accept) } label: {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(
                            Circle().fill(Color.green.opacity(0.8))
                        )
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(hex: "#f59e0b").opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(hex: "#f59e0b").opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Active Battle Card

private struct ActiveBattleCard: View {
    let battle: ArenaViewModel.Battle
    let uid: String
    let leaderboard: [LeagueViewModel.LeaderboardEntry]
    let timeRemaining: String

    private var isChallenger: Bool { battle.challenger.userId == uid }
    private var me: ArenaViewModel.BattlePlayer { isChallenger ? battle.challenger : battle.opponent }
    private var them: ArenaViewModel.BattlePlayer { isChallenger ? battle.opponent : battle.challenger }

    private var myVolume: Int {
        leaderboard.first(where: { $0.id == me.userId })?.todayVolume ?? 0
    }
    private var theirVolume: Int {
        leaderboard.first(where: { $0.id == them.userId })?.todayVolume ?? 0
    }
    private var amWinning: Bool { myVolume >= theirVolume }

    var body: some View {
        VStack(spacing: 14) {
            // Header
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text("LIVE")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.green)
                        .tracking(2)
                }

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                    Text(timeRemaining)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                }
                .foregroundColor(.gray)
            }

            // VS display
            HStack {
                // Me
                VStack(spacing: 4) {
                    Text("YOU")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(amWinning ? .green : .gray)
                        .tracking(1)
                    Text("\(myVolume)")
                        .font(.system(size: 24, weight: .black, design: .monospaced))
                        .foregroundColor(amWinning ? .green : .white)
                    Text("kg vol")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)

                // VS
                VStack(spacing: 4) {
                    Text("VS")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(.ironRedLight)
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.ironRedLight)
                }

                // Opponent
                VStack(spacing: 4) {
                    Text(them.username.prefix(8).uppercased())
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(!amWinning ? .green : .gray)
                        .tracking(1)
                    Text("\(theirVolume)")
                        .font(.system(size: 24, weight: .black, design: .monospaced))
                        .foregroundColor(!amWinning ? .green : .white)
                    Text("kg vol")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }

            // Score bar
            GeometryReader { geo in
                let total = max(1, myVolume + theirVolume)
                let myWidth = geo.size.width * CGFloat(myVolume) / CGFloat(total)

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.ironRedLight.opacity(0.3))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.green.opacity(0.8))
                        .frame(width: myWidth, height: 8)
                        .animation(.easeOut, value: myVolume)
                }
            }
            .frame(height: 8)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.green.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Battle History Row

private struct BattleHistoryRow: View {
    let battle: ArenaViewModel.Battle
    let uid: String

    private var won: Bool { battle.winnerId == uid }
    private var declined: Bool { battle.status == .declined }
    private var isChallenger: Bool { battle.challenger.userId == uid }
    private var opponentName: String {
        isChallenger ? battle.opponent.username : battle.challenger.username
    }

    var body: some View {
        HStack(spacing: 12) {
            // Result icon
            ZStack {
                Circle()
                    .fill(resultColor.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: resultIcon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(resultColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("vs \(opponentName)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(resultLabel)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(resultColor)
            }

            Spacer()

            if won && !declined {
                Text("+100 XP")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(.green)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    private var resultColor: Color {
        if declined { return .gray }
        return won ? .green : .ironRedLight
    }

    private var resultIcon: String {
        if declined { return "xmark" }
        return won ? "trophy.fill" : "shield.slash"
    }

    private var resultLabel: String {
        if declined { return "Declined" }
        return won ? "Victory" : "Defeat"
    }
}

// MARK: - Battle Result Sheet

private struct BattleResultSheet: View {
    let result: ArenaViewModel.BattleResult
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                // Result header
                Text(result.won ? "VICTORY" : "DEFEAT")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(result.won ? .green : .ironRedLight)
                    .tracking(4)

                Image(systemName: result.won ? "trophy.fill" : "shield.slash")
                    .font(.system(size: 56))
                    .foregroundColor(result.won ? Color(hex: "#ffd700") : .gray)
                    .shadow(color: result.won ? Color(hex: "#ffd700").opacity(0.5) : .clear, radius: 20)

                // Score comparison
                HStack(spacing: 32) {
                    VStack(spacing: 4) {
                        Text("YOU")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.gray)
                            .tracking(1)
                        Text("\(result.myVolume)")
                            .font(.system(size: 28, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                        Text("kg volume")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }

                    Text("VS")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.ironRedLight)

                    VStack(spacing: 4) {
                        Text("OPP")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.gray)
                            .tracking(1)
                        Text("\(result.opponentVolume)")
                            .font(.system(size: 28, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                        Text("kg volume")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }
                }

                // XP earned
                if result.xpEarned > 0 {
                    HStack(spacing: 6) {
                        Image(systemName: "star.fill")
                            .foregroundColor(Color(hex: "#ffd700"))
                        Text("+\(result.xpEarned) XP")
                            .font(.system(size: 18, weight: .black))
                            .foregroundColor(Color(hex: "#ffd700"))
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(
                        Capsule()
                            .fill(Color(hex: "#ffd700").opacity(0.15))
                    )
                }

                Button(action: onDismiss) {
                    Text("CONTINUE")
                        .font(.system(size: 14, weight: .black))
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
                }
                .padding(.horizontal, 20)
            }
            .padding(20)
        }
    }
}
