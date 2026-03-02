import SwiftUI

/// Tournament detail — header with countdown, prize breakdown, rules, live leaderboard,
/// user position highlight, join/leave button, participant count progress bar.
struct TournamentDetailView: View {
    let tournament: Tournament
    @ObservedObject var vm: TournamentViewModel
    let uid: String
    let userXP: Int

    @Environment(\.dismiss) private var dismiss

    private var statusColor: Color { Color(hex: tournament.status.color) }
    private var displayName: String { "Warrior" } // fallback; profile.username preferred

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Custom nav bar
                navBar

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        tournamentHeader
                        countdownSection
                        participantProgressBar
                        prizeSection
                        rulesSection
                        leaderboardSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 100) // space for bottom button
                }
            }

            // Floating bottom action
            VStack {
                Spacer()
                bottomAction
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            vm.selectTournament(tournament, uid: uid, userXP: userXP)
        }
        .onDisappear {
            vm.deselectTournament()
        }
        .alert("Error", isPresented: $vm.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "Something went wrong.")
        }
    }

    // MARK: - Navigation Bar

    private var navBar: some View {
        HStack {
            Button { dismiss() } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .bold))
                    Text("Back")
                        .font(.system(size: 15, weight: .semibold))
                }
                .foregroundColor(.ironRedLight)
            }

            Spacer()

            // Status badge
            HStack(spacing: 4) {
                if tournament.status == .active {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 6, height: 6)
                }
                Text(tournament.status.displayName.uppercased())
                    .font(.system(size: 10, weight: .black))
                    .tracking(1)
            }
            .foregroundColor(statusColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                Capsule()
                    .fill(statusColor.opacity(0.12))
                    .overlay(
                        Capsule()
                            .stroke(statusColor.opacity(0.25), lineWidth: 1)
                    )
            )
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Tournament Header

    private var tournamentHeader: some View {
        VStack(spacing: 10) {
            // Type + metric badges
            HStack(spacing: 8) {
                badgePill(
                    icon: tournament.type.icon,
                    text: tournament.type.displayName,
                    color: tournament.type.badgeColor
                )
                badgePill(
                    icon: tournament.metric.icon,
                    text: tournament.metric.displayName,
                    color: "#dc2626"
                )
            }

            Text(tournament.name)
                .font(.system(size: 26, weight: .black))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text(tournament.description)
                .font(.system(size: 14))
                .foregroundColor(Color.white.opacity(0.5))
                .multilineTextAlignment(.center)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    private func badgePill(icon: String, text: String, color: String) -> some View {
        let c = Color(hex: color)
        return HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
            Text(text.uppercased())
                .font(.system(size: 10, weight: .black))
                .tracking(0.5)
        }
        .foregroundColor(c)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(
            Capsule().fill(c.opacity(0.12))
        )
    }

    // MARK: - Countdown

    private var countdownSection: some View {
        VStack(spacing: 8) {
            Text(tournament.status == .upcoming ? "STARTS IN" : tournament.status == .active ? "ENDS IN" : "ENDED")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(statusColor)
                .tracking(2)

            Text(vm.countdownText.isEmpty ? tournament.timeRemainingFormatted : vm.countdownText)
                .font(.system(size: 36, weight: .black, design: .monospaced))
                .foregroundColor(.white)

            Text(tournament.dateRangeFormatted)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(statusColor.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(statusColor.opacity(0.15), lineWidth: 1)
                )
        )
    }

    // MARK: - Participant Progress Bar

    private var participantProgressBar: some View {
        let current = vm.selectedTournament?.currentParticipants ?? tournament.currentParticipants
        let max = tournament.maxParticipants
        let progress = max > 0 ? Double(current) / Double(max) : 0

        return VStack(spacing: 8) {
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 11))
                    Text("PARTICIPANTS")
                        .font(.system(size: 10, weight: .black))
                        .tracking(1)
                }
                .foregroundColor(Color.white.opacity(0.5))

                Spacer()

                Text("\(current) / \(max)")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [.ironRed, .ironRedLight],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * min(1, progress), height: 8)
                        .animation(.easeOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: 8)

            if tournament.isFull {
                Text("TOURNAMENT FULL")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.ironRedLight)
                    .tracking(1)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Prize Section

    private var prizeSection: some View {
        VStack(spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#ffd700"))
                    Text("PRIZES")
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(Color(hex: "#ffd700"))
                        .tracking(1)
                }
                Spacer()
                Text("\(tournament.prizePool) XP Pool")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: "#ffd700").opacity(0.7))
            }

            ForEach(tournament.rewards) { reward in
                PrizeRow(reward: reward)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(hex: "#ffd700").opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color(hex: "#ffd700").opacity(0.12), lineWidth: 1)
                )
        )
    }

    // MARK: - Rules Section

    private var rulesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "doc.text.fill")
                    .font(.system(size: 12))
                Text("RULES")
                    .font(.system(size: 12, weight: .black))
                    .tracking(1)
            }
            .foregroundColor(Color.white.opacity(0.5))

            Text(tournament.rules)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color.white.opacity(0.7))
                .lineSpacing(4)

            // Metric info
            HStack(spacing: 8) {
                Image(systemName: tournament.metric.icon)
                    .font(.system(size: 12))
                    .foregroundColor(.ironRedLight)
                Text("Ranked by: \(tournament.metric.displayName) (\(tournament.metric.unit))")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.ironRedLight)
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Leaderboard Section

    private var leaderboardSection: some View {
        VStack(spacing: 14) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "list.number")
                        .font(.system(size: 12))
                    Text("LEADERBOARD")
                        .font(.system(size: 12, weight: .black))
                        .tracking(1)
                }
                .foregroundColor(Color.white.opacity(0.5))

                Spacer()

                if let rank = vm.userRank {
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 10))
                        Text("You: #\(rank)")
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundColor(.ironRedLight)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule().fill(Color.ironRed.opacity(0.15))
                    )
                }
            }

            if vm.leaderboard.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.3")
                        .font(.system(size: 28))
                        .foregroundColor(Color.gray.opacity(0.25))
                    Text("No participants yet")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                    Text("Be the first to join!")
                        .font(.system(size: 11))
                        .foregroundColor(Color.gray.opacity(0.5))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 30)
            } else {
                ForEach(vm.leaderboard) { participant in
                    LeaderboardRow(
                        participant: participant,
                        isCurrentUser: participant.uid == uid,
                        metric: tournament.metric
                    )
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Bottom Action (Join/Leave)

    @ViewBuilder
    private var bottomAction: some View {
        if tournament.status != .completed {
            VStack(spacing: 0) {
                // Gradient fade
                LinearGradient(
                    colors: [Color.black.opacity(0), Color.black],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 30)

                VStack(spacing: 8) {
                    if vm.isJoined {
                        // Joined — show rank + leave button
                        HStack(spacing: 12) {
                            // User rank card
                            VStack(spacing: 2) {
                                Text("YOUR RANK")
                                    .font(.system(size: 9, weight: .black))
                                    .foregroundColor(Color.white.opacity(0.5))
                                    .tracking(1)
                                Text("#\(vm.userRank ?? 0)")
                                    .font(.system(size: 22, weight: .black, design: .monospaced))
                                    .foregroundColor(.ironRedLight)
                            }
                            .frame(width: 90)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.ironRed.opacity(0.12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.ironRed.opacity(0.2), lineWidth: 1)
                                    )
                            )

                            // Score
                            VStack(spacing: 2) {
                                Text("YOUR SCORE")
                                    .font(.system(size: 9, weight: .black))
                                    .foregroundColor(Color.white.opacity(0.5))
                                    .tracking(1)
                                Text(String(format: "%.0f", vm.userScore))
                                    .font(.system(size: 22, weight: .black, design: .monospaced))
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.04))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.06), lineWidth: 1)
                                    )
                            )

                            // Leave button
                            if tournament.status == .upcoming {
                                Button {
                                    Task {
                                        await vm.leaveTournament(
                                            tournamentId: tournament.id ?? "",
                                            uid: uid
                                        )
                                    }
                                } label: {
                                    VStack(spacing: 2) {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 18))
                                        Text("LEAVE")
                                            .font(.system(size: 9, weight: .black))
                                            .tracking(0.5)
                                    }
                                    .foregroundColor(.gray)
                                    .frame(width: 60)
                                    .padding(.vertical, 12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.white.opacity(0.04))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14)
                                                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                            )
                                    )
                                }
                                .disabled(vm.isLeaving)
                            }
                        }
                    } else {
                        // Not joined — show join button
                        Button {
                            Task {
                                await vm.joinTournament(
                                    tournamentId: tournament.id ?? "",
                                    uid: uid,
                                    displayName: displayName,
                                    avatarEmoji: "&#x1f4aa;",
                                    userXP: userXP
                                )
                            }
                        } label: {
                            HStack(spacing: 10) {
                                if vm.isJoining {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: "bolt.circle.fill")
                                        .font(.system(size: 20))
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("JOIN TOURNAMENT")
                                        .font(.system(size: 16, weight: .black))
                                    if tournament.entryFee > 0 {
                                        Text("Entry fee: \(tournament.entryFee) XP")
                                            .font(.system(size: 11))
                                            .foregroundColor(Color.white.opacity(0.6))
                                    } else {
                                        Text("Free entry")
                                            .font(.system(size: 11))
                                            .foregroundColor(Color.white.opacity(0.6))
                                    }
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color.white.opacity(0.4))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(
                                RoundedRectangle(cornerRadius: 18)
                                    .fill(
                                        LinearGradient(
                                            colors: vm.eligibility.canJoin
                                                ? [Color.ironRed, Color.ironRedDark]
                                                : [Color.gray.opacity(0.3), Color.gray.opacity(0.2)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                            .shadow(
                                color: vm.eligibility.canJoin
                                    ? Color.ironRed.opacity(0.3)
                                    : Color.clear,
                                radius: 15
                            )
                        }
                        .disabled(!vm.eligibility.canJoin || vm.isJoining)

                        // Eligibility message
                        if !vm.eligibility.canJoin, case .insufficientXP(let required, let current) = vm.eligibility {
                            Text("Need \(required) XP to enter (you have \(current))")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color(hex: "#f59e0b"))
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
                .background(Color.black)
            }
        }
    }
}

// MARK: - Prize Row

private struct PrizeRow: View {
    let reward: TournamentReward

    private var rankColor: Color {
        switch reward.rankMin {
        case 1: return Color(hex: "#ffd700")   // gold
        case 2: return Color(hex: "#c0c0c0")   // silver
        case 3: return Color(hex: "#cd7f32")   // bronze
        default: return Color.white.opacity(0.5)
        }
    }

    private var rankIcon: String {
        switch reward.rankMin {
        case 1: return "medal.fill"
        case 2: return "medal.fill"
        case 3: return "medal.fill"
        default: return "number"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Rank
            ZStack {
                Circle()
                    .fill(rankColor.opacity(0.15))
                    .frame(width: 40, height: 40)
                if reward.rankMin <= 3 {
                    Image(systemName: rankIcon)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(rankColor)
                } else {
                    Text(reward.rankLabel)
                        .font(.system(size: 12, weight: .black))
                        .foregroundColor(rankColor)
                }
            }

            // Rank label
            VStack(alignment: .leading, spacing: 2) {
                Text(reward.rankLabel)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("Place")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
            }

            Spacer()

            // Reward
            HStack(spacing: 6) {
                Image(systemName: reward.rewardIcon)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: reward.rewardColor))
                Text(reward.rewardLabel)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(hex: reward.rewardColor))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: reward.rewardColor).opacity(0.1))
            )
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Leaderboard Row

private struct LeaderboardRow: View {
    let participant: TournamentParticipant
    let isCurrentUser: Bool
    let metric: TournamentMetric

    private var rankColor: Color {
        if let hex = participant.medalColor {
            return Color(hex: hex)
        }
        return Color.white.opacity(0.5)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Rank
            ZStack {
                if participant.rank <= 3 {
                    Circle()
                        .fill(rankColor.opacity(0.2))
                        .frame(width: 36, height: 36)
                    Image(systemName: "medal.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(rankColor)
                } else {
                    Text("#\(participant.rank)")
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(Color.white.opacity(0.5))
                        .frame(width: 36, height: 36)
                }
            }

            // Avatar
            ZStack {
                Circle()
                    .fill(
                        isCurrentUser
                            ? Color.ironRed.opacity(0.2)
                            : Color.white.opacity(0.06)
                    )
                    .frame(width: 36, height: 36)
                Text(participant.avatarEmoji.isEmpty ? "💪" : participant.avatarEmoji)
                    .font(.system(size: 16))
            }

            // Name
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(participant.displayName)
                        .font(.system(size: 14, weight: isCurrentUser ? .black : .semibold))
                        .foregroundColor(isCurrentUser ? .ironRedLight : .white)
                        .lineLimit(1)

                    if isCurrentUser {
                        Text("YOU")
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(
                                Capsule().fill(Color.ironRed.opacity(0.2))
                            )
                    }
                }
            }

            Spacer()

            // Score
            VStack(alignment: .trailing, spacing: 2) {
                Text(String(format: "%.0f", participant.score))
                    .font(.system(size: 16, weight: .black, design: .monospaced))
                    .foregroundColor(participant.rank <= 3 ? rankColor : .white)
                Text(metric.unit)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.4))
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(
            Group {
                if isCurrentUser {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.ironRed.opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.ironRed.opacity(0.15), lineWidth: 1)
                        )
                }
            }
        )
    }
}
