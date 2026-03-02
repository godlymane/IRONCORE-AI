import SwiftUI
import FirebaseAuth

/// Tournament list — section tabs for Active / Upcoming / Past.
/// Each card shows name, type badge, time remaining, participant count, prize info, metric.
/// Tap card to navigate to TournamentDetailView.
struct TournamentListView: View {
    @StateObject private var vm = TournamentViewModel()
    @EnvironmentObject var authVM: AuthViewModel

    @State private var activeTab = 0

    private var uid: String { authVM.uid ?? "" }
    private var userXP: Int { authVM.profile?.xp ?? 0 }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                sectionTabs
                tournamentContent
            }
        }
        .onAppear {
            vm.startListening()
        }
        .onDisappear {
            vm.stopListening()
        }
        .alert("Error", isPresented: $vm.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "Something went wrong.")
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("TOURNAMENTS")
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(.white)
                    .tracking(-0.5)

                Text("COMPETE FOR GLORY")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(2)
            }

            Spacer()

            // Tournament count badge
            HStack(spacing: 4) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 12))
                Text("\(vm.activeTournaments.count) LIVE")
                    .font(.system(size: 11, weight: .black))
            }
            .foregroundColor(Color(hex: "#22c55e"))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "#22c55e").opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color(hex: "#22c55e").opacity(0.25), lineWidth: 1)
                    )
            )
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Section Tabs

    private var sectionTabs: some View {
        HStack(spacing: 0) {
            sectionTab("Active", count: vm.activeTournaments.count, tag: 0, color: "#22c55e")
            sectionTab("Upcoming", count: vm.upcomingTournaments.count, tag: 1, color: "#3b82f6")
            sectionTab("Past", count: vm.completedTournaments.count, tag: 2, color: "#6b7280")
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

    private func sectionTab(_ title: String, count: Int, tag: Int, color: String) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { activeTab = tag }
        } label: {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .black))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule().fill(
                                activeTab == tag
                                    ? Color(hex: color).opacity(0.3)
                                    : Color.white.opacity(0.1)
                            )
                        )
                }
            }
            .foregroundColor(activeTab == tag ? .white : .gray)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                Group {
                    if activeTab == tag {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: color).opacity(0.2))
                    }
                }
            )
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var tournamentContent: some View {
        let tournaments: [Tournament] = {
            switch activeTab {
            case 0: return vm.activeTournaments
            case 1: return vm.upcomingTournaments
            case 2: return vm.completedTournaments
            default: return vm.activeTournaments
            }
        }()

        if vm.isLoading && vm.allTournaments.isEmpty {
            loadingState
        } else if tournaments.isEmpty {
            emptyState
        } else {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 14) {
                    ForEach(tournaments) { tournament in
                        NavigationLink {
                            TournamentDetailView(
                                tournament: tournament,
                                vm: vm,
                                uid: uid,
                                userXP: userXP
                            )
                        } label: {
                            TournamentCard(tournament: tournament)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()

            Image(systemName: activeTab == 0 ? "trophy" : activeTab == 1 ? "clock" : "checkmark.circle")
                .font(.system(size: 40))
                .foregroundColor(Color.gray.opacity(0.25))

            Text(activeTab == 0 ? "No active tournaments" : activeTab == 1 ? "No upcoming tournaments" : "No past tournaments")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.gray)

            Text("Check back soon for new competitions")
                .font(.system(size: 12))
                .foregroundColor(Color.gray.opacity(0.5))

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView()
                .tint(.ironRedLight)
            Text("Loading tournaments...")
                .font(.system(size: 13))
                .foregroundColor(.gray)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Tournament Card

private struct TournamentCard: View {
    let tournament: Tournament

    private var statusColor: Color { Color(hex: tournament.status.color) }
    private var typeColor: Color { Color(hex: tournament.type.badgeColor) }
    private var metricColor: Color { Color.ironRedLight }

    var body: some View {
        VStack(spacing: 14) {
            // Top row: type badge + status + time
            HStack {
                // Type badge
                HStack(spacing: 4) {
                    Image(systemName: tournament.type.icon)
                        .font(.system(size: 10))
                    Text(tournament.type.displayName.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(0.5)
                }
                .foregroundColor(typeColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule().fill(typeColor.opacity(0.15))
                )

                // Metric badge
                HStack(spacing: 4) {
                    Image(systemName: tournament.metric.icon)
                        .font(.system(size: 10))
                    Text(tournament.metric.displayName.uppercased())
                        .font(.system(size: 9, weight: .bold))
                        .tracking(0.5)
                }
                .foregroundColor(metricColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    Capsule().fill(metricColor.opacity(0.12))
                )

                Spacer()

                // Status indicator
                HStack(spacing: 4) {
                    if tournament.status == .active {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 6, height: 6)
                    }
                    Text(tournament.status.displayName.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(0.5)
                }
                .foregroundColor(statusColor)
            }

            // Tournament name + description
            VStack(alignment: .leading, spacing: 4) {
                Text(tournament.name)
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(tournament.description)
                    .font(.system(size: 12))
                    .foregroundColor(Color.white.opacity(0.5))
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Bottom row: participants + prize + time
            HStack(spacing: 16) {
                // Participants
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 10))
                    Text("\(tournament.currentParticipants)/\(tournament.maxParticipants)")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                }
                .foregroundColor(Color.white.opacity(0.6))

                // Prize pool
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "#ffd700"))
                    Text("\(tournament.prizePool) XP")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "#ffd700"))
                }

                Spacer()

                // Time
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                    Text(tournament.status == .completed ? tournament.dateRangeFormatted : tournament.timeRemainingFormatted)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                }
                .foregroundColor(statusColor)
            }

            // Participant progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(
                            LinearGradient(
                                colors: [statusColor.opacity(0.8), statusColor.opacity(0.4)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * tournament.participantProgress, height: 4)
                }
            }
            .frame(height: 4)

            // Entry fee
            if tournament.entryFee > 0 && tournament.status != .completed {
                HStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 9))
                        Text("Entry: \(tournament.entryFee) XP")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .foregroundColor(Color.white.opacity(0.4))
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.06), Color.white.opacity(0.02)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            tournament.status == .active
                                ? statusColor.opacity(0.2)
                                : Color.white.opacity(0.06),
                            lineWidth: 1
                        )
                )
        )
    }
}
