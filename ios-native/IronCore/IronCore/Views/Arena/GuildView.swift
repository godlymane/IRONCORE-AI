import SwiftUI
import FirebaseAuth

/// Guilds — team features: create, join, chat, challenges, leaderboard, wars.
/// Mirrors Guilds.jsx from React prototype. Premium-gated.
struct GuildView: View {
    @StateObject private var vm = GuildViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel

    private var uid: String { authVM.uid ?? "" }
    private var username: String { authVM.user?.displayName ?? "Warrior" }
    private var avatarUrl: String { authVM.user?.photoURL?.absoluteString ?? "" }
    private var guildId: String? { authVM.profile?.guildId }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if !premiumVM.isPremium {
                premiumGate
            } else if vm.loading {
                loadingState
            } else if vm.browsing {
                GuildBrowserView(vm: vm, uid: uid, username: username, avatarUrl: avatarUrl)
            } else if let guild = vm.currentGuild {
                GuildDetailView(vm: vm, guild: guild, uid: uid, username: username, avatarUrl: avatarUrl)
            }
        }
        .onAppear {
            guard !uid.isEmpty else { return }
            vm.start(uid: uid, guildId: guildId)
        }
        .onDisappear {
            vm.stop()
        }
        .sheet(isPresented: $vm.showCreateSheet) {
            CreateGuildSheet(vm: vm, uid: uid, username: username, avatarUrl: avatarUrl)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $vm.showTransferSheet) {
            TransferLeadershipSheet(vm: vm, uid: uid)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .alert(leaveAlertTitle, isPresented: $vm.showLeaveConfirm) {
            Button("Cancel", role: .cancel) { }
            if isLeaderSolo {
                Button("Leave & Disband", role: .destructive) {
                    Task { await vm.leaveGuild(uid: uid) }
                }
            } else {
                Button("Leave", role: .destructive) {
                    Task { await vm.leaveGuild(uid: uid) }
                }
            }
        } message: {
            Text(leaveAlertBody)
        }
        .alert("Disband guild?", isPresented: $vm.showDisbandConfirm) {
            TextField("Type guild name to confirm", text: $vm.disbandConfirmText)
            Button("Cancel", role: .cancel) { vm.disbandConfirmText = "" }
            Button("Disband", role: .destructive) {
                guard vm.disbandConfirmText == vm.currentGuild?.name else { return }
                Task { await vm.disbandGuild(uid: uid) }
            }
        } message: {
            Text("This action is permanent. Your guild and all its history will be deleted. All members will be removed. This cannot be undone.\n\nType \"\(vm.currentGuild?.name ?? "")\" to confirm.")
        }
    }

    private var isLeaderSolo: Bool {
        guard let guild = vm.currentGuild else { return false }
        return guild.ownerId == uid && guild.memberCount <= 1
    }

    private var leaveAlertTitle: String {
        if isLeaderSolo { return "Leave and disband?" }
        return "Leave guild?"
    }

    private var leaveAlertBody: String {
        if isLeaderSolo {
            return "You're the only member. Leaving will delete the guild permanently."
        }
        return "You'll lose access to guild chat and war contributions. You can rejoin if the guild is open."
    }

    // MARK: - Premium Gate

    private var premiumGate: some View {
        VStack(spacing: 20) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color(hex: "#eab308").opacity(0.1))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Circle().stroke(Color(hex: "#eab308").opacity(0.3), lineWidth: 1)
                    )
                Image(systemName: "lock.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color(hex: "#eab308"))
            }

            Text("IRON GUILDS")
                .font(.system(size: 24, weight: .black))
                .italic()
                .foregroundColor(.white)

            Text("Create and join guilds to compete with friends.\nAvailable on Premium.")
                .font(.system(size: 14))
                .foregroundColor(Color.white.opacity(0.5))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button {
                _ = premiumVM.requirePremium("guilds")
            } label: {
                Text("UNLOCK GUILDS")
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
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
            }

            Spacer()
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(.ironRedLight)
            Text("Loading Guild Data...")
                .font(.system(size: 13))
                .foregroundColor(Color.white.opacity(0.5))
        }
    }
}

// MARK: - Guild Browser (no guild joined)

private struct GuildBrowserView: View {
    @ObservedObject var vm: GuildViewModel
    let uid: String
    let username: String
    let avatarUrl: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("IRON GUILDS")
                            .font(.system(size: 24, weight: .black))
                            .italic()
                            .foregroundColor(.white)
                            .tracking(-1)

                        Text("Join a clan, compete together.")
                            .font(.system(size: 13))
                            .foregroundColor(Color.white.opacity(0.5))
                    }

                    Spacer()

                    Button {
                        vm.showCreateSheet = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "plus")
                                .font(.system(size: 12, weight: .bold))
                            Text("Create")
                                .font(.system(size: 13, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.ironRed, Color.ironRedDark],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )
                    }
                }

                if vm.availableGuilds.isEmpty {
                    emptyState
                } else {
                    ForEach(vm.availableGuilds) { guild in
                        GuildBrowserCard(guild: guild) {
                            Task { await vm.joinGuild(guild.id, uid: uid, username: username, avatarUrl: avatarUrl) }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "shield.lefthalf.filled")
                .font(.system(size: 48))
                .foregroundColor(Color.white.opacity(0.15))

            Text("No guilds found.")
                .font(.system(size: 14))
                .foregroundColor(Color.white.opacity(0.5))

            Text("Be the first to start one!")
                .font(.system(size: 13))
                .foregroundColor(.gray)

            Button {
                vm.showCreateSheet = true
            } label: {
                Text("Start a Guild")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.08))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    )
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color.white.opacity(0.1), style: StrokeStyle(lineWidth: 1, dash: [8]))
        )
    }
}

// MARK: - Guild Browser Card

private struct GuildBrowserCard: View {
    let guild: GuildViewModel.Guild
    let onJoin: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRed, Color(hex: "#9333ea")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 50, height: 50)

                Image(systemName: guild.icon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(guild.name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(guild.description)
                    .font(.system(size: 12))
                    .foregroundColor(Color.white.opacity(0.5))
                    .lineLimit(1)

                HStack(spacing: 10) {
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 10))
                        Text("\(guild.memberCount)/\(guild.maxMembers)")
                            .font(.system(size: 11))
                    }
                    .foregroundColor(Color.white.opacity(0.6))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(Color.white.opacity(0.08)))

                    Text("Lvl \(guild.level)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#eab308"))
                }
            }

            Spacer()

            Button(action: onJoin) {
                Text("Join")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.white.opacity(0.08))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                            )
                    )
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }
}

// MARK: - Guild Detail View (5 tabs: chat, members, challenges, leaderboard, wars)

private struct GuildDetailView: View {
    @ObservedObject var vm: GuildViewModel
    let guild: GuildViewModel.Guild
    let uid: String
    let username: String
    let avatarUrl: String

    @State private var activeTab = 0

    var body: some View {
        VStack(spacing: 0) {
            guildHeader

            switch activeTab {
            case 0:
                GuildChatView(vm: vm, guildId: guild.id, uid: uid, username: username, avatarUrl: avatarUrl)
            case 1:
                GuildMembersView(vm: vm, members: guild.members, uid: uid)
            case 2:
                GuildChallengesView(challenges: vm.weeklyChallenges)
            case 3:
                GuildLeaderboardView(members: vm.memberLeaderboard, uid: uid)
            case 4:
                GuildWarsView(activeWar: vm.activeWar, pastWars: vm.pastWars, guildName: guild.name)
            default:
                EmptyView()
            }
        }
    }

    private var guildHeader: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#7f1d1d"), Color(hex: "#581c87")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.ironRed.opacity(0.3), lineWidth: 1)
                    )

                Image(systemName: guild.icon)
                    .font(.system(size: 100))
                    .foregroundColor(Color.white.opacity(0.05))
                    .padding(16)

                VStack(spacing: 0) {
                    HStack(alignment: .top) {
                        HStack(spacing: 14) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.1))
                                    .frame(width: 56, height: 56)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                                    )

                                Image(systemName: guild.icon)
                                    .font(.system(size: 26, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text(guild.name.uppercased())
                                    .font(.system(size: 22, weight: .black))
                                    .italic()
                                    .foregroundColor(.white)
                                    .tracking(-0.5)
                                    .lineLimit(1)

                                Text(guild.description)
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(hex: "#fca5a5").opacity(0.7))
                                    .lineLimit(1)
                            }
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 2) {
                            Text("LEVEL")
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(Color(hex: "#fca5a5"))
                                .tracking(2)

                            Text("\(guild.level)")
                                .font(.system(size: 32, weight: .black))
                                .foregroundColor(.white)

                            Text("\(guild.xp) XP")
                                .font(.system(size: 11))
                                .foregroundColor(Color(hex: "#fca5a5"))
                        }
                    }

                    // Tab row — scrollable for 5 tabs
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            tabButton("Chat", icon: "bubble.left.fill", tag: 0)
                            tabButton("Members", icon: "person.2.fill", tag: 1)
                            tabButton("Challenges", icon: "flame.fill", tag: 2)
                            tabButton("Ranks", icon: "chart.bar.fill", tag: 3)
                            tabButton("Wars", icon: "swords", tag: 4)

                            Spacer()

                            Button {
                                vm.showLeaveConfirm = true
                            } label: {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color.ironRedLight.opacity(0.6))
                                    .padding(10)
                                    .background(
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(Color.ironRedLight.opacity(0.08))
                                    )
                            }
                        }
                    }
                    .padding(.top, 14)
                }
                .padding(20)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 12)
        }
    }

    private func tabButton(_ title: String, icon: String, tag: Int) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { activeTab = tag }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(title)
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundColor(activeTab == tag ? Color(hex: "#7f1d1d") : Color.white.opacity(0.7))
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(activeTab == tag ? Color.white : Color.black.opacity(0.2))
            )
        }
    }
}

// MARK: - Guild Chat

private struct GuildChatView: View {
    @ObservedObject var vm: GuildViewModel
    let guildId: String
    let uid: String
    let username: String
    let avatarUrl: String

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 10) {
                        if vm.chatMessages.isEmpty {
                            Text("Start the conversation...")
                                .font(.system(size: 13))
                                .foregroundColor(Color.white.opacity(0.2))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 80)
                        }

                        ForEach(vm.chatMessages) { msg in
                            if msg.isSystem {
                                SystemChatBubble(message: msg)
                                    .id(msg.id)
                            } else {
                                ChatBubble(message: msg, isMe: msg.userId == uid)
                                    .id(msg.id)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .onChange(of: vm.chatMessages.count) { _, _ in
                    if let lastId = vm.chatMessages.last?.id {
                        withAnimation { proxy.scrollTo(lastId, anchor: .bottom) }
                    }
                }
            }

            HStack(spacing: 10) {
                TextField("Message clan...", text: $vm.chatInput)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.black.opacity(0.4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    )
                    .onSubmit {
                        Task { await vm.sendMessage(guildId: guildId, uid: uid, username: username, avatarUrl: avatarUrl) }
                    }

                Button {
                    Task { await vm.sendMessage(guildId: guildId, uid: uid, username: username, avatarUrl: avatarUrl) }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.ironRed))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                Color.white.opacity(0.03)
                    .overlay(Rectangle().fill(Color.white.opacity(0.06)).frame(height: 1), alignment: .top)
            )
        }
    }
}

// MARK: - Chat Bubble

private struct ChatBubble: View {
    let message: GuildViewModel.ChatMessage
    let isMe: Bool

    var body: some View {
        HStack {
            if isMe { Spacer(minLength: 60) }

            VStack(alignment: isMe ? .trailing : .leading, spacing: 4) {
                if !isMe {
                    Text(message.username)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.5))
                }

                Text(message.message)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 18)
                            .fill(isMe ? Color.ironRed : Color.white.opacity(0.1))
                    )
            }

            if !isMe { Spacer(minLength: 60) }
        }
    }
}

// MARK: - System Chat Bubble (centered, dimmed, no avatar)

private struct SystemChatBubble: View {
    let message: GuildViewModel.ChatMessage

    var body: some View {
        HStack {
            Spacer()
            Text(message.message)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color.white.opacity(0.35))
                .italic()
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
            Spacer()
        }
    }
}

// MARK: - Guild Members (with officer actions)

private struct GuildMembersView: View {
    @ObservedObject var vm: GuildViewModel
    let members: [GuildViewModel.GuildMember]
    let uid: String

    private var myRole: String {
        members.first(where: { $0.userId == uid })?.role ?? "member"
    }

    private var isLeader: Bool { myRole == "leader" }
    private var isStaff: Bool { myRole == "leader" || myRole == "officer" }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 10) {
                ForEach(members) { member in
                    MemberRow(
                        member: member,
                        isMe: member.userId == uid,
                        viewerIsLeader: isLeader,
                        viewerIsStaff: isStaff,
                        onPromote: { vm.showPromoteConfirm = member },
                        onDemote: { vm.showDemoteConfirm = member },
                        onKick: { vm.showKickConfirm = member }
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .padding(.bottom, 80)
        }
        .alert("Promote \(vm.showPromoteConfirm?.username ?? "")?", isPresented: Binding(
            get: { vm.showPromoteConfirm != nil },
            set: { if !$0 { vm.showPromoteConfirm = nil } }
        )) {
            Button("Cancel", role: .cancel) { vm.showPromoteConfirm = nil }
            Button("Promote") {
                if let m = vm.showPromoteConfirm { Task { await vm.promoteMember(m) } }
            }
        } message: {
            Text("They'll become an Officer. Officers can invite members, kick below their rank, and start wars.")
        }
        .alert("Demote \(vm.showDemoteConfirm?.username ?? "")?", isPresented: Binding(
            get: { vm.showDemoteConfirm != nil },
            set: { if !$0 { vm.showDemoteConfirm = nil } }
        )) {
            Button("Cancel", role: .cancel) { vm.showDemoteConfirm = nil }
            Button("Demote", role: .destructive) {
                if let m = vm.showDemoteConfirm { Task { await vm.demoteMember(m) } }
            }
        } message: {
            Text("They'll lose Officer permissions and become a regular Member.")
        }
        .alert("Remove \(vm.showKickConfirm?.username ?? "")?", isPresented: Binding(
            get: { vm.showKickConfirm != nil },
            set: { if !$0 { vm.showKickConfirm = nil } }
        )) {
            Button("Cancel", role: .cancel) { vm.showKickConfirm = nil }
            Button("Remove", role: .destructive) {
                if let m = vm.showKickConfirm { Task { await vm.kickMember(m) } }
            }
        } message: {
            Text("They'll be removed from the guild immediately. They can rejoin if the guild is open.")
        }
    }
}

private struct MemberRow: View {
    let member: GuildViewModel.GuildMember
    let isMe: Bool
    let viewerIsLeader: Bool
    let viewerIsStaff: Bool
    let onPromote: () -> Void
    let onDemote: () -> Void
    let onKick: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 42, height: 42)

                Text(String(member.username.prefix(1)).uppercased())
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(member.username)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)

                    if member.isLeader {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "#eab308"))
                    } else if member.isOfficer {
                        Image(systemName: "star.fill")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "#8b5cf6"))
                    }

                    if isMe {
                        Text("YOU")
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.ironRedLight.opacity(0.15)))
                    }
                }

                Text(member.role.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(roleColor)
                    .tracking(1)
            }

            Spacer()

            // XP badge
            Text("\(member.weeklyXP) XP")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "#eab308"))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(Color(hex: "#eab308").opacity(0.1)))

            // Staff actions (only on other members)
            if !isMe && !member.isLeader {
                Menu {
                    if viewerIsLeader {
                        if member.isOfficer {
                            Button { onDemote() } label: {
                                Label("Demote to Member", systemImage: "arrow.down.circle")
                            }
                        } else {
                            Button { onPromote() } label: {
                                Label("Promote to Officer", systemImage: "arrow.up.circle")
                            }
                        }
                    }
                    if viewerIsStaff {
                        Button(role: .destructive) { onKick() } label: {
                            Label("Kick", systemImage: "person.badge.minus")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 14))
                        .foregroundColor(Color.white.opacity(0.4))
                        .padding(8)
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    private var roleColor: Color {
        switch member.role {
        case "leader": return Color(hex: "#eab308")
        case "officer": return Color(hex: "#8b5cf6")
        default: return Color.white.opacity(0.4)
        }
    }
}

// MARK: - Guild Challenges Tab

private struct GuildChallengesView: View {
    let challenges: [GuildViewModel.WeeklyChallenge]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 12) {
                // Section header
                VStack(alignment: .leading, spacing: 4) {
                    Text("WEEKLY CHALLENGES")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                        .tracking(-0.5)

                    Text("Squad goals. Contribute reps, earn bonus XP.")
                        .font(.system(size: 12))
                        .foregroundColor(Color.white.opacity(0.5))
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if challenges.isEmpty {
                    emptyState("No active challenges.", icon: "flame", subtitle: "New challenges drop every Monday. Check back then.")
                } else {
                    ForEach(challenges) { challenge in
                        challengeCard(challenge)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .padding(.bottom, 80)
        }
    }

    private func challengeCard(_ c: GuildViewModel.WeeklyChallenge) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(c.isComplete ? Color.green.opacity(0.15) : Color.ironRed.opacity(0.15))
                        .frame(width: 42, height: 42)

                    Image(systemName: c.icon)
                        .font(.system(size: 18))
                        .foregroundColor(c.isComplete ? .green : .ironRedLight)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(c.title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)

                    Text(c.description)
                        .font(.system(size: 12))
                        .foregroundColor(Color.white.opacity(0.5))
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(c.current)/\(c.target)")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(c.isComplete ? .green : .white)

                    Text(c.unit.uppercased())
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.gray)
                        .tracking(1)
                }
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.08))

                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: c.isComplete
                                    ? [Color.green.opacity(0.8), Color.green.opacity(0.4)]
                                    : [Color.ironRed.opacity(0.8), Color.ironRed.opacity(0.4)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * c.progress)
                }
            }
            .frame(height: 6)

            // Expiry
            if let exp = c.expiresAt {
                HStack {
                    Spacer()
                    Text("Ends \(exp, style: .relative)")
                        .font(.system(size: 10))
                        .foregroundColor(Color.white.opacity(0.3))
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(c.isComplete ? Color.green.opacity(0.2) : Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }
}

// MARK: - Guild Leaderboard Tab

private struct GuildLeaderboardView: View {
    let members: [GuildViewModel.GuildMember]
    let uid: String

    private var myRank: Int? {
        guard let idx = members.firstIndex(where: { $0.userId == uid }) else { return nil }
        return idx + 1
    }

    private var myXP: Int {
        members.first(where: { $0.userId == uid })?.weeklyXP ?? 0
    }

    var body: some View {
        ZStack(alignment: .bottom) {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 8) {
                // Section header
                VStack(alignment: .leading, spacing: 4) {
                    Text("SQUAD RANKINGS")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(.white)
                        .tracking(-0.5)

                    Text("Who's putting in work this week.")
                        .font(.system(size: 12))
                        .foregroundColor(Color.white.opacity(0.5))
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if members.isEmpty {
                    emptyState("No activity yet.", icon: "chart.bar", subtitle: "Start logging workouts. Your contributions show up here.")
                } else {
                    ForEach(Array(members.enumerated()), id: \.element.id) { index, member in
                        HStack(spacing: 12) {
                            // Rank
                            ZStack {
                                Circle()
                                    .fill(rankColor(index))
                                    .frame(width: 32, height: 32)

                                Text("\(index + 1)")
                                    .font(.system(size: 14, weight: .black))
                                    .foregroundColor(.white)
                            }

                            // Avatar
                            ZStack {
                                Circle()
                                    .fill(Color.white.opacity(0.08))
                                    .frame(width: 36, height: 36)

                                Text(String(member.username.prefix(1)).uppercased())
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 4) {
                                    Text(member.username)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)

                                    if member.isLeader {
                                        Image(systemName: "crown.fill")
                                            .font(.system(size: 9))
                                            .foregroundColor(Color(hex: "#eab308"))
                                    }
                                }

                                Text(member.role.uppercased())
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(Color.white.opacity(0.3))
                                    .tracking(1)
                            }

                            Spacer()

                            Text("\(member.weeklyXP)")
                                .font(.system(size: 18, weight: .black))
                                .foregroundColor(Color(hex: "#eab308"))

                            Text("XP")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(hex: "#eab308").opacity(0.6))
                        }
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(index == 0 ? Color(hex: "#eab308").opacity(0.06) : Color.white.opacity(0.04))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(index == 0 ? Color(hex: "#eab308").opacity(0.2) : Color.white.opacity(0.06), lineWidth: 1)
                                )
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .padding(.bottom, 80)
        }

            // Sticky bottom bar: Your position
            if let rank = myRank {
                HStack(spacing: 8) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.ironRedLight)

                    Text("You: #\(rank)")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.white)

                    Text("·")
                        .foregroundColor(Color.white.opacity(0.3))

                    Text("\(myXP) XP this week")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(hex: "#eab308"))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
        } // ZStack
    }

    private func rankColor(_ index: Int) -> Color {
        switch index {
        case 0: return Color(hex: "#eab308") // Gold
        case 1: return Color(hex: "#94a3b8") // Silver
        case 2: return Color(hex: "#cd7c2f") // Bronze
        default: return Color.white.opacity(0.1)
        }
    }
}

// MARK: - Guild Wars Tab

private struct GuildWarsView: View {
    let activeWar: GuildViewModel.GuildWar?
    let pastWars: [GuildViewModel.GuildWar]
    let guildName: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // Active war
                if let war = activeWar {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("ACTIVE WAR")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .tracking(1.5)

                        warCard(war, isActive: true)
                    }
                }

                // Past wars
                if !pastWars.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("WAR HISTORY")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.gray)
                            .tracking(1.5)

                        ForEach(pastWars) { war in
                            warCard(war, isActive: false)
                        }
                    }
                }

                if activeWar == nil && pastWars.isEmpty {
                    emptyState("No wars yet", icon: "swords", subtitle: "Guild wars are matched weekly")
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .padding(.bottom, 80)
        }
    }

    private func warCard(_ war: GuildViewModel.GuildWar, isActive: Bool) -> some View {
        VStack(spacing: 14) {
            // VS header
            HStack {
                VStack(spacing: 4) {
                    Image(systemName: "shield.lefthalf.filled")
                        .font(.system(size: 24))
                        .foregroundColor(.ironRedLight)
                    Text(guildName)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 2) {
                    Text("VS")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(Color.white.opacity(0.4))
                        .tracking(2)

                    if isActive, let end = war.endsAt {
                        Text(end, style: .relative)
                            .font(.system(size: 10))
                            .foregroundColor(Color.white.opacity(0.3))
                    }
                }

                VStack(spacing: 4) {
                    Image(systemName: war.opponentGuildIcon)
                        .font(.system(size: 24))
                        .foregroundColor(Color(hex: "#8b5cf6"))
                    Text(war.opponentGuildName)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
            }

            // Scores
            HStack {
                Text("\(war.ourScore)")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(war.ourScore >= war.theirScore ? .green : .ironRedLight)
                    .frame(maxWidth: .infinity)

                Text(war.metric.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.3))
                    .tracking(1)

                Text("\(war.theirScore)")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(war.theirScore > war.ourScore ? .green : Color.white.opacity(0.5))
                    .frame(maxWidth: .infinity)
            }

            // Status badge (for past wars)
            if !isActive {
                Text(war.status.uppercased())
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(statusColor(war.status))
                    .tracking(1.5)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(statusColor(war.status).opacity(0.1)))
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(isActive ? Color.ironRed.opacity(0.06) : Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(isActive ? Color.ironRed.opacity(0.3) : Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }

    private func statusColor(_ s: String) -> Color {
        switch s {
        case "won": return .green
        case "lost": return .ironRedLight
        case "draw": return Color(hex: "#eab308")
        default: return .gray
        }
    }
}

// MARK: - Create Guild Sheet (with icon picker)

private struct CreateGuildSheet: View {
    @ObservedObject var vm: GuildViewModel
    let uid: String
    let username: String
    let avatarUrl: String

    @State private var name = ""
    @State private var desc = ""
    @State private var selectedIcon = GuildViewModel.guildIcons[0]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    Text("CREATE GUILD")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(.white)

                    // Error message
                    if !vm.createError.isEmpty {
                        Text(vm.createError)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.ironRedLight)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.ironRedLight.opacity(0.08))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.ironRedLight.opacity(0.2), lineWidth: 1)
                                    )
                            )
                    }

                    // Icon picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("CHOOSE YOUR CREST")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.textTertiary)

                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 6), spacing: 8) {
                            ForEach(GuildViewModel.guildIcons, id: \.self) { icon in
                                Button {
                                    selectedIcon = icon
                                } label: {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(selectedIcon == icon ? Color.ironRed.opacity(0.3) : Color.white.opacity(0.06))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .stroke(selectedIcon == icon ? Color.ironRed.opacity(0.6) : Color.white.opacity(0.1), lineWidth: 1)
                                            )

                                        Image(systemName: icon)
                                            .font(.system(size: 20))
                                            .foregroundColor(selectedIcon == icon ? .white : .gray)
                                    }
                                    .frame(height: 44)
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("GUILD NAME")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.textTertiary)

                        TextField("e.g. Iron Legion", text: $name)
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.black.opacity(0.4))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("DESCRIPTION")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.textTertiary)

                        TextField("What does your squad stand for? (120 chars)", text: $desc, axis: .vertical)
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                            .lineLimit(3...5)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.black.opacity(0.4))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                    }

                    HStack(spacing: 12) {
                        Button { dismiss() } label: {
                            Text("Cancel")
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

                        Button {
                            Task {
                                await vm.createGuild(
                                    name: name,
                                    description: desc,
                                    icon: selectedIcon,
                                    uid: uid,
                                    username: username,
                                    avatarUrl: avatarUrl
                                )
                            }
                        } label: {
                            Text("CREATE")
                                .font(.system(size: 14, weight: .black))
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
                        }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                .padding(20)
            }
        }
    }
}

// MARK: - Transfer Leadership Sheet

private struct TransferLeadershipSheet: View {
    @ObservedObject var vm: GuildViewModel
    let uid: String

    @Environment(\.dismiss) private var dismiss

    private var eligibleMembers: [GuildViewModel.GuildMember] {
        vm.currentGuild?.members.filter { $0.userId != uid } ?? []
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 16) {
                Text("TRANSFER LEADERSHIP")
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.white)

                Text("A guild can't exist without a leader. Select the new leader — you'll become an Officer.")
                    .font(.system(size: 13))
                    .foregroundColor(Color.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 8) {
                        ForEach(eligibleMembers) { member in
                            Button {
                                Task { await vm.transferLeadership(to: member, uid: uid) }
                            } label: {
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.white.opacity(0.08))
                                            .frame(width: 40, height: 40)

                                        Text(String(member.username.prefix(1)).uppercased())
                                            .font(.system(size: 16, weight: .bold))
                                            .foregroundColor(.white)
                                    }

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(member.username)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)

                                        Text(member.role.uppercased())
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(Color.white.opacity(0.4))
                                            .tracking(1)
                                    }

                                    Spacer()

                                    Image(systemName: "crown.fill")
                                        .font(.system(size: 14))
                                        .foregroundColor(Color(hex: "#eab308").opacity(0.5))
                                }
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(Color.white.opacity(0.04))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 14)
                                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                                        )
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                Button { dismiss() } label: {
                    Text("Cancel")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.white.opacity(0.06))
                        )
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
    }
}

// MARK: - Shared Empty State

private func emptyState(_ title: String, icon: String, subtitle: String) -> some View {
    VStack(spacing: 12) {
        Image(systemName: icon)
            .font(.system(size: 36))
            .foregroundColor(Color.white.opacity(0.12))

        Text(title)
            .font(.system(size: 14))
            .foregroundColor(Color.white.opacity(0.4))

        Text(subtitle)
            .font(.system(size: 12))
            .foregroundColor(Color.white.opacity(0.2))
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
}
