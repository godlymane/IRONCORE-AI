import SwiftUI

/// Social feed — activity feed, locker room chat, media posts, inbox.
/// Mirrors CommunityView.jsx from React prototype.
/// 4 sub-tabs: Feed, Locker (chat), Media (posts), Inbox.
struct SocialFeedView: View {
    @StateObject private var vm = SocialFeedViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    let uid: String

    var body: some View {
        VStack(spacing: 0) {
            header
            tabPicker
            tabContent
        }
        .background(Color.black)
        .onAppear { vm.startListening(uid: uid) }
        .onDisappear { vm.stopListening() }
        .sheet(isPresented: $vm.showNewPost) { newPostSheet }
        .sheet(isPresented: $vm.showPlayerDetail) { playerDetailSheet }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("COMMUNITY")
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(.white)
                    .tracking(1)
                Text("Connect • Compete • Conquer")
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
            }
            Spacer()
            // Unread inbox count
            if !vm.inbox.filter({ !$0.read }).isEmpty {
                Text("\(vm.inbox.filter { !$0.read }.count)")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Color.ironRed))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 4) {
            ForEach(SocialFeedViewModel.SocialTab.allCases) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        vm.selectedTab = tab
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 11))
                        Text(tab.rawValue.uppercased())
                            .font(.system(size: 11, weight: .black))
                    }
                    .foregroundColor(vm.selectedTab == tab ? .white : .textTertiary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        Capsule().fill(
                            vm.selectedTab == tab
                                ? Color.ironRed.opacity(0.3)
                                : Color.white.opacity(0.05)
                        )
                    )
                    .overlay(
                        Capsule().stroke(
                            vm.selectedTab == tab
                                ? Color.ironRedLight.opacity(0.4)
                                : Color.clear,
                            lineWidth: 1
                        )
                    )
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch vm.selectedTab {
        case .feed:
            feedTab
        case .chat:
            chatTab
        case .posts:
            postsTab
        case .inbox:
            inboxTab
        }
    }

    // MARK: - Feed Tab (Activity Feed)

    private var feedTab: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 8) {
                if vm.activityFeed.isEmpty && vm.dataLoaded {
                    emptyState(icon: "bolt.slash", title: "No Activity Yet", subtitle: "Complete workouts and challenges to see activity here")
                } else {
                    ForEach(vm.activityFeed) { event in
                        FeedEventRow(event: event, vm: vm)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Chat Tab (Locker Room)

    private var chatTab: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(spacing: 8) {
                        if vm.chatMessages.isEmpty && vm.dataLoaded {
                            emptyState(icon: "bubble.left.and.bubble.right", title: "Locker Room", subtitle: "Talk trash, share wins, motivate each other")
                        } else {
                            ForEach(vm.chatMessages) { msg in
                                ChatBubble(message: msg, isMe: msg.userId == uid, vm: vm)
                                    .id(msg.id)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
                .onChange(of: vm.chatMessages.count) { _, _ in
                    if let last = vm.chatMessages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Chat input
            chatInputBar
        }
    }

    private var chatInputBar: some View {
        HStack(spacing: 10) {
            TextField("Talk trash...", text: $vm.chatInput)
                .font(.system(size: 14))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.white.opacity(0.08))
                )

            Button {
                Task {
                    await vm.sendChatMessage(
                        uid: uid,
                        username: authVM.profile?.goal ?? "Athlete",
                        photo: "",
                        xp: authVM.profile?.xp ?? 0
                    )
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(
                        vm.chatInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? Color.gray
                            : LinearGradient.ironGradient
                    )
            }
            .disabled(vm.chatInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Rectangle()
                .fill(Color.black)
                .overlay(
                    Rectangle()
                        .fill(Color.white.opacity(0.05))
                        .frame(height: 1),
                    alignment: .top
                )
        )
    }

    // MARK: - Posts Tab (Media)

    private var postsTab: some View {
        VStack(spacing: 0) {
            // New post button
            Button { vm.showNewPost = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16))
                    Text("SHARE PROGRESS")
                        .font(.system(size: 13, weight: .black))
                }
                .foregroundColor(.ironRedLight)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Color.ironRed.opacity(0.1))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                        )
                )
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 12) {
                    if vm.posts.isEmpty && vm.dataLoaded {
                        emptyState(icon: "photo.on.rectangle.angled", title: "No Posts Yet", subtitle: "Be the first to share your progress")
                    } else {
                        ForEach(vm.posts) { post in
                            PostCard(post: post, vm: vm)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 120)
            }
        }
    }

    // MARK: - Inbox Tab

    private var inboxTab: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 8) {
                if vm.inbox.isEmpty && vm.dataLoaded {
                    emptyState(icon: "envelope.open", title: "Inbox Empty", subtitle: "Messages from other athletes will appear here")
                } else {
                    ForEach(vm.inbox) { msg in
                        InboxRow(message: msg, vm: vm)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Empty State

    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 60)
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(Color.gray.opacity(0.3))
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
            Text(subtitle)
                .font(.system(size: 13))
                .foregroundColor(.textTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - New Post Sheet

    private var newPostSheet: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if let image = vm.newPostImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 300)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    Button {
                        // PhotosPicker would go here — placeholder for now
                    } label: {
                        VStack(spacing: 12) {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 40))
                                .foregroundColor(.ironRedLight)
                            Text("Select Photo")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.textTertiary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.white.opacity(0.05))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.white.opacity(0.1), style: StrokeStyle(lineWidth: 2, dash: [8]))
                                )
                        )
                    }
                }

                TextField("Add a caption (max 300 chars)", text: $vm.newPostCaption)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.08))
                    )

                if vm.isUploadingPost {
                    ProgressView()
                        .tint(.ironRedLight)
                }

                Spacer()
            }
            .padding(16)
            .background(Color.black.ignoresSafeArea())
            .navigationTitle("New Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { vm.showNewPost = false }
                        .foregroundColor(.textTertiary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") {
                        Task {
                            await vm.createPost(
                                uid: uid,
                                username: authVM.profile?.goal ?? "Athlete",
                                userPhoto: "",
                                xp: authVM.profile?.xp ?? 0
                            )
                        }
                    }
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.ironRedLight)
                    .disabled(vm.newPostImage == nil || vm.isUploadingPost)
                }
            }
        }
        .presentationDetents([.large])
    }

    // MARK: - Player Detail Sheet

    private var playerDetailSheet: some View {
        NavigationStack {
            if let player = vm.selectedPlayer {
                VStack(spacing: 20) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(Color.ironRed.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Text(String(player.username.prefix(1)).uppercased())
                            .font(.system(size: 28, weight: .black))
                            .foregroundColor(.ironRedLight)
                    }

                    VStack(spacing: 4) {
                        Text(player.username)
                            .font(.system(size: 20, weight: .black))
                            .foregroundColor(.white)
                        Text("Level \(vm.levelForXP(player.xp)) • \(player.xp) XP")
                            .font(.system(size: 14))
                            .foregroundColor(.textTertiary)
                    }

                    // Follow button
                    Button {
                        Task { await vm.toggleFollow(uid: uid, targetUserId: player.id) }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: vm.following.contains(player.id) ? "checkmark" : "plus")
                                .font(.system(size: 12, weight: .bold))
                            Text(vm.following.contains(player.id) ? "FOLLOWING" : "FOLLOW")
                                .font(.system(size: 13, weight: .black))
                        }
                        .foregroundColor(vm.following.contains(player.id) ? .ironRedLight : .white)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(
                                    vm.following.contains(player.id)
                                        ? Color.ironRed.opacity(0.1)
                                        : Color.ironRed
                                )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(
                                    vm.following.contains(player.id)
                                        ? Color.ironRedLight.opacity(0.3)
                                        : Color.clear,
                                    lineWidth: 1
                                )
                        )
                    }

                    Spacer()
                }
                .padding(24)
                .background(Color.black.ignoresSafeArea())
                .navigationTitle("Player")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { vm.showPlayerDetail = false }
                            .foregroundColor(.textTertiary)
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Feed Event Row

private struct FeedEventRow: View {
    let event: SocialFeedViewModel.FeedEvent
    let vm: SocialFeedViewModel

    var body: some View {
        HStack(spacing: 12) {
            // Event type icon
            ZStack {
                Circle()
                    .fill(eventColor.opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: eventIcon)
                    .font(.system(size: 14))
                    .foregroundColor(eventColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(event.username)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                    Text(event.message)
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                        .lineLimit(1)
                }
                if !event.details.isEmpty {
                    Text(event.details)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(eventColor)
                }
            }

            Spacer()

            Text(vm.timeAgo(event.createdAt))
                .font(.system(size: 11))
                .foregroundColor(.textTertiary)
        }
        .padding(12)
        .modifier(GlassCard())
    }

    private var eventIcon: String {
        switch event.type {
        case "challenge": return "bolt.fill"
        case "level": return "arrow.up.circle.fill"
        case "workout": return "dumbbell.fill"
        case "battle": return "shield.lefthalf.filled"
        default: return "star.fill"
        }
    }

    private var eventColor: Color {
        switch event.type {
        case "challenge": return Color(hex: "#fbbf24")
        case "level": return Color(hex: "#34d399")
        case "workout": return .ironRedLight
        case "battle": return Color(hex: "#60a5fa")
        default: return .textSecondary
        }
    }
}

// MARK: - Chat Bubble

private struct ChatBubble: View {
    let message: SocialFeedViewModel.ChatMessage
    let isMe: Bool
    let vm: SocialFeedViewModel

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if !isMe {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.ironRed.opacity(0.15))
                        .frame(width: 28, height: 28)
                    Text(String(message.username.prefix(1)).uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.ironRedLight)
                }
            }

            VStack(alignment: isMe ? .trailing : .leading, spacing: 2) {
                if !isMe {
                    HStack(spacing: 4) {
                        Text(message.username)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.ironRedLight)
                        Text("Lv.\(vm.levelForXP(message.xp))")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.textTertiary)
                    }
                }
                Text(message.text)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(isMe ? Color.ironRed.opacity(0.2) : Color.white.opacity(0.06))
                    )
                Text(vm.timeAgo(message.createdAt))
                    .font(.system(size: 10))
                    .foregroundColor(.textTertiary)
            }

            if isMe { Spacer() } else { Spacer() }
        }
        .frame(maxWidth: .infinity, alignment: isMe ? .trailing : .leading)
    }
}

// MARK: - Post Card

private struct PostCard: View {
    let post: SocialFeedViewModel.Post
    let vm: SocialFeedViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // User row
            HStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(Color.ironRed.opacity(0.15))
                        .frame(width: 32, height: 32)
                    Text(String(post.username.prefix(1)).uppercased())
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.ironRedLight)
                }

                VStack(alignment: .leading, spacing: 1) {
                    Text(post.username)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                    Text("Lv.\(vm.levelForXP(post.xp))")
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                Text(vm.timeAgo(post.createdAt))
                    .font(.system(size: 11))
                    .foregroundColor(.textTertiary)
            }

            // Image
            if !post.imageUrl.isEmpty {
                AsyncImage(url: URL(string: post.imageUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(maxHeight: 300)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    case .failure:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.05))
                            .frame(height: 200)
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.system(size: 24))
                                    .foregroundColor(.textTertiary)
                            )
                    default:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.05))
                            .frame(height: 200)
                            .overlay(ProgressView().tint(.ironRedLight))
                    }
                }
            }

            // Caption
            if !post.caption.isEmpty {
                Text(post.caption)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.9))
                    .lineLimit(3)
            }

            // Likes
            HStack(spacing: 4) {
                Image(systemName: "heart.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.ironRedLight.opacity(0.5))
                Text("\(post.likes)")
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(14)
        .modifier(GlassCard())
    }
}

// MARK: - Inbox Row

private struct InboxRow: View {
    let message: SocialFeedViewModel.InboxMessage
    let vm: SocialFeedViewModel

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.ironRed.opacity(0.15))
                    .frame(width: 36, height: 36)
                Text(String(message.fromName.prefix(1)).uppercased())
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.ironRedLight)
            }

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(message.fromName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                    Text(vm.timeAgo(message.createdAt))
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                }
                Text(message.text)
                    .font(.system(size: 13))
                    .foregroundColor(.textSecondary)
                    .lineLimit(2)
            }

            if !message.read {
                Circle()
                    .fill(Color.ironRed)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(12)
        .modifier(GlassCard())
    }
}
