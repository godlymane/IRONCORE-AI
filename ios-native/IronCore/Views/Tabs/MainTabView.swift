import SwiftUI

/// Main 6-tab navigation — mirrors React App.jsx activeTab routing
/// Tabs: Dashboard, Workout, AI Lab, Cardio, Arena, Profile
struct MainTabView: View {
    @State private var activeTab: AppTab = .dashboard
    @EnvironmentObject var firestoreManager: FirestoreManager
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        TabView(selection: $activeTab) {
            DashboardTab()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(AppTab.dashboard)

            WorkoutTab()
                .tabItem {
                    Label("Workout", systemImage: "dumbbell.fill")
                }
                .tag(AppTab.workout)

            AILabTab()
                .tabItem {
                    Label("AI Lab", systemImage: "camera.viewfinder")
                }
                .tag(AppTab.ailab)

            CardioTab()
                .tabItem {
                    Label("Cardio", systemImage: "flame.fill")
                }
                .tag(AppTab.cardio)

            ArenaTab()
                .tabItem {
                    Label("Arena", systemImage: "trophy.fill")
                }
                .tag(AppTab.arena)

            ProfileTab()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(AppTab.profile)
        }
        .tint(.red)
        .onChange(of: activeTab) { oldTab, newTab in
            handleTabChange(from: oldTab, to: newTab)
        }
    }

    /// Manage listener lifecycle on tab change (mirrors React lazy listener pattern)
    private func handleTabChange(from oldTab: AppTab, to newTab: AppTab) {
        guard let uid = authManager.currentUser?.uid else { return }

        // Start social listeners when entering Arena
        if newTab == .arena {
            firestoreManager.startSocialListeners(uid: uid)
        }

        // Stop social listeners when leaving Arena
        if oldTab == .arena && newTab != .arena {
            firestoreManager.stopSocialListeners()
        }

        // Start photo listener when entering Profile
        if newTab == .profile {
            firestoreManager.startPhotoListener(uid: uid)
        }
    }
}

enum AppTab: String, Hashable {
    case dashboard
    case workout
    case ailab
    case cardio
    case arena
    case profile
}
