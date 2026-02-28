import SwiftUI

/// Ghost Match — async PvP against AI-generated ghost opponents.
/// Mirrors GhostMatchView.jsx from React prototype.
/// Flow: lobby → searching → active match → result.
struct GhostMatchView: View {
    @StateObject private var vm = GhostMatchViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel

    private var uid: String { authVM.uid ?? "" }

    var body: some View {
        VStack(spacing: 0) {
            switch vm.state {
            case .lobby:
                lobbyContent
            case .searching:
                searchingContent
            case .active:
                activeMatchContent
            case .result:
                resultContent
            }
        }
    }

    // MARK: - Lobby

    private var lobbyContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 24) {
                Spacer().frame(height: 20)

                // Icon
                ZStack {
                    Circle()
                        .fill(Color(hex: "#9333ea").opacity(0.15))
                        .frame(width: 80, height: 80)
                    Image(systemName: "figure.run")
                        .font(.system(size: 36))
                        .foregroundColor(Color(hex: "#9333ea"))
                }

                VStack(spacing: 8) {
                    Text("GHOST MATCH")
                        .font(.system(size: 24, weight: .black))
                        .foregroundColor(.white)
                        .tracking(-0.5)

                    Text("Battle a ghost opponent in a timed workout challenge. Compare form, volume, and reps to win.")
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                // Stats
                HStack(spacing: 16) {
                    statBadge(icon: "trophy.fill", label: "Wins", value: "\(vm.wins)", color: .green)
                    statBadge(icon: "xmark.shield", label: "Losses", value: "\(vm.losses)", color: .ironRedLight)
                    statBadge(icon: "star.fill", label: "XP Earned", value: "\(vm.totalXPEarned)", color: Color(hex: "#eab308"))
                }

                // Find match button
                Button {
                    vm.findMatch()
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "bolt.circle.fill")
                            .font(.system(size: 20))
                        Text("FIND GHOST MATCH")
                            .font(.system(size: 16, weight: .black))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        RoundedRectangle(cornerRadius: 18)
                            .fill(
                                LinearGradient(
                                    colors: [Color(hex: "#9333ea"), Color(hex: "#7c3aed")],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
                    .shadow(color: Color(hex: "#9333ea").opacity(0.4), radius: 15)
                }
                .padding(.horizontal, 16)

                // Rewards info
                VStack(spacing: 8) {
                    rewardRow(icon: "trophy.fill", text: "Victory: +150 XP", color: .green)
                    rewardRow(icon: "shield.slash", text: "Defeat: +25 XP", color: .gray)
                    rewardRow(icon: "clock.fill", text: "Match Duration: ~8 seconds", color: .cyan)
                }
                .padding(.horizontal, 24)

                Spacer()
            }
            .padding(.bottom, 100)
        }
    }

    // MARK: - Searching

    private var searchingContent: some View {
        VStack(spacing: 24) {
            Spacer()

            ProgressView()
                .tint(Color(hex: "#9333ea"))
                .scaleEffect(1.5)

            Text("SEARCHING FOR GHOST...")
                .font(.system(size: 14, weight: .black))
                .foregroundColor(Color(hex: "#9333ea"))
                .tracking(3)

            Text("Analyzing workout patterns...")
                .font(.system(size: 12))
                .foregroundColor(.gray)

            Spacer()
        }
    }

    // MARK: - Active Match

    private var activeMatchContent: some View {
        VStack(spacing: 20) {
            // Timer
            HStack(spacing: 8) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 14))
                Text("\(vm.matchTimeRemaining)s")
                    .font(.system(size: 20, weight: .black, design: .monospaced))
            }
            .foregroundColor(vm.matchTimeRemaining <= 3 ? .ironRedLight : Color(hex: "#9333ea"))
            .padding(.top, 20)

            if let ghost = vm.currentOpponent {
                // VS Display
                HStack(spacing: 0) {
                    // You
                    VStack(spacing: 8) {
                        Text("YOU")
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(.green)
                            .tracking(2)

                        ZStack {
                            Circle()
                                .fill(Color.green.opacity(0.15))
                                .frame(width: 60, height: 60)
                            Image(systemName: "person.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.green)
                        }

                        if let stats = vm.myStats {
                            VStack(spacing: 4) {
                                statLine("Form", value: "\(stats.formScore)%", color: .green)
                                statLine("Volume", value: "\(stats.totalVolume)kg", color: .cyan)
                                statLine("Reps", value: "\(stats.totalReps)", color: .orange)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)

                    // VS
                    VStack(spacing: 4) {
                        Text("VS")
                            .font(.system(size: 24, weight: .black))
                            .foregroundColor(Color(hex: "#9333ea"))
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "#9333ea"))
                    }

                    // Ghost
                    VStack(spacing: 8) {
                        Text(ghost.username.prefix(8).uppercased())
                            .font(.system(size: 10, weight: .black))
                            .foregroundColor(Color(hex: "#9333ea"))
                            .tracking(2)

                        ZStack {
                            Circle()
                                .fill(Color(hex: "#9333ea").opacity(0.15))
                                .frame(width: 60, height: 60)
                            Image(systemName: "figure.run")
                                .font(.system(size: 24))
                                .foregroundColor(Color(hex: "#9333ea"))
                        }

                        if let stats = vm.ghostStats {
                            VStack(spacing: 4) {
                                statLine("Form", value: "\(stats.formScore)%", color: Color(hex: "#9333ea"))
                                statLine("Volume", value: "\(stats.totalVolume)kg", color: Color(hex: "#9333ea"))
                                statLine("Reps", value: "\(stats.totalReps)", color: Color(hex: "#9333ea"))
                            }
                        } else {
                            VStack(spacing: 4) {
                                statLine("Form", value: "???", color: .gray)
                                statLine("Volume", value: "???", color: .gray)
                                statLine("Reps", value: "???", color: .gray)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Result

    private var resultContent: some View {
        VStack(spacing: 24) {
            Spacer()

            let won = vm.matchResult == .victory

            Text(won ? "VICTORY" : "DEFEAT")
                .font(.system(size: 36, weight: .black))
                .foregroundColor(won ? .green : .ironRedLight)
                .tracking(4)

            Image(systemName: won ? "trophy.fill" : "shield.slash")
                .font(.system(size: 56))
                .foregroundColor(won ? Color(hex: "#ffd700") : .gray)
                .shadow(color: won ? Color(hex: "#ffd700").opacity(0.5) : .clear, radius: 20)

            // Stat comparison
            if let my = vm.myStats, let ghost = vm.ghostStats {
                VStack(spacing: 12) {
                    comparisonRow("Form Score", myVal: "\(my.formScore)%", ghostVal: "\(ghost.formScore)%", myWins: my.formScore >= ghost.formScore)
                    comparisonRow("Total Volume", myVal: "\(my.totalVolume)kg", ghostVal: "\(ghost.totalVolume)kg", myWins: my.totalVolume >= ghost.totalVolume)
                    comparisonRow("Total Reps", myVal: "\(my.totalReps)", ghostVal: "\(ghost.totalReps)", myWins: my.totalReps >= ghost.totalReps)
                }
                .padding(16)
                .modifier(GlassCard())
            }

            // XP earned
            HStack(spacing: 6) {
                Image(systemName: "star.fill")
                    .foregroundColor(Color(hex: "#ffd700"))
                Text("+\(vm.xpEarned) XP")
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(Color(hex: "#ffd700"))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Capsule().fill(Color(hex: "#ffd700").opacity(0.15)))

            // Actions
            VStack(spacing: 12) {
                Button { vm.findMatch() } label: {
                    Text("PLAY AGAIN")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(
                                    LinearGradient(
                                        colors: [Color(hex: "#9333ea"), Color(hex: "#7c3aed")],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                        )
                }

                Button { vm.returnToLobby() } label: {
                    Text("Back to Lobby")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 16)

            Spacer()
        }
    }

    // MARK: - Helpers

    private func statBadge(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(color)
            Text(value)
                .font(.system(size: 16, weight: .black, design: .monospaced))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(color.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(color.opacity(0.15), lineWidth: 1)
                )
        )
    }

    private func rewardRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(color)
            Text(text)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color.white.opacity(0.6))
            Spacer()
        }
    }

    private func statLine(_ label: String, value: String, color: Color) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(color)
        }
    }

    private func comparisonRow(_ label: String, myVal: String, ghostVal: String, myWins: Bool) -> some View {
        HStack {
            Text(myVal)
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(myWins ? .green : .white)
                .frame(maxWidth: .infinity)

            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.gray)
                .frame(maxWidth: .infinity)

            Text(ghostVal)
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(!myWins ? Color(hex: "#9333ea") : .white)
                .frame(maxWidth: .infinity)
        }
    }
}
