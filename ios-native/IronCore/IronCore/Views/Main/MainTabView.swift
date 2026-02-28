import SwiftUI

/// Main tab navigation — matches App.jsx tab structure
/// 6 tabs: Home, Arena, Lift, AI, Feed, Me
struct MainTabView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel
    @State private var selectedTab = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()

            // Tab content
            TabView(selection: $selectedTab) {
                DashboardView(profile: authVM.profile)
                    .tag(0)
                ArenaView()
                    .tag(1)
                WorkoutView(uid: authVM.uid ?? "")
                    .tag(2)
                AILabView()
                    .tag(3)
                SocialFeedView(uid: authVM.uid ?? "")
                    .tag(4)
                ProfileView(profile: authVM.profile, uid: authVM.uid ?? "")
                    .tag(5)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Custom tab bar
            customTabBar

            // Paywall overlay — triggered by premiumVM.showPaywall from anywhere
            if premiumVM.showPaywall {
                PaywallView()
                    .environmentObject(premiumVM)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
                    .zIndex(100)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: premiumVM.showPaywall)
        // Push notification deep link handlers
        .onReceive(NotificationCenter.default.publisher(for: .navigateToDashboard)) { _ in
            withAnimation { selectedTab = TabItem.home.rawValue }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToArena)) { _ in
            withAnimation { selectedTab = TabItem.arena.rawValue }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToWorkout)) { _ in
            withAnimation { selectedTab = TabItem.workout.rawValue }
        }
        .onReceive(NotificationCenter.default.publisher(for: .navigateToProfile)) { _ in
            withAnimation { selectedTab = TabItem.profile.rawValue }
        }
    }

    // MARK: - Custom Tab Bar (matches React tab navigation)
    private var customTabBar: some View {
        HStack(spacing: 0) {
            ForEach(TabItem.allCases) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedTab = tab.rawValue
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 20, weight: selectedTab == tab.rawValue ? .bold : .regular))
                            .foregroundColor(selectedTab == tab.rawValue ? .ironRedLight : .textTertiary)

                        Text(tab.label)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(selectedTab == tab.rawValue ? .ironRedLight : .textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 4)
        .background(
            Rectangle()
                .fill(Color.black)
                .overlay(
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [Color.white.opacity(0.05), Color.clear],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(height: 1),
                    alignment: .top
                )
                .ignoresSafeArea(edges: .bottom)
        )
    }
}

// MARK: - Tab Items (matches React TABS array in App.jsx)
enum TabItem: Int, CaseIterable, Identifiable {
    case home = 0
    case arena = 1
    case workout = 2
    case aiLab = 3
    case cardio = 4
    case profile = 5

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .home: return "Home"
        case .arena: return "Arena"
        case .workout: return "Lift"
        case .aiLab: return "AI"
        case .cardio: return "Feed"
        case .profile: return "Me"
        }
    }

    var icon: String {
        switch self {
        case .home: return "flame.fill"
        case .arena: return "shield.lefthalf.filled"
        case .workout: return "dumbbell.fill"
        case .aiLab: return "brain.head.profile"
        case .cardio: return "bubble.left.and.bubble.right.fill"
        case .profile: return "crown.fill"
        }
    }
}

// MARK: - Placeholder Views (Phase 1 — replaced in later phases)

struct AILabPlaceholder: View {
    var body: some View {
        PlaceholderTab(icon: "brain.head.profile", title: "AI Lab", subtitle: "Form Coach • AI Chat • Recovery")
    }
}

private struct PlaceholderTab: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(LinearGradient.ironGradient)

            Text(title.uppercased())
                .font(.system(size: 24, weight: .black))
                .italic()
                .foregroundColor(.white)

            Text(subtitle)
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)

            Text("Coming in Phase 2")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.ironRedLight)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Capsule().fill(Color.ironRed.opacity(0.1)))

            Spacer()
        }
    }
}
