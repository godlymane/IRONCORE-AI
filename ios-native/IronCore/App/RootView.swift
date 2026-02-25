import SwiftUI

struct RootView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var firestoreManager: FirestoreManager

    var body: some View {
        Group {
            if authManager.isLoading {
                LaunchScreen()
            } else if let user = authManager.currentUser {
                if firestoreManager.profileLoaded && !firestoreManager.profileExists {
                    OnboardingView()
                } else {
                    MainTabView()
                }
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.currentUser != nil)
    }
}

struct LaunchScreen: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(.red)
                Text("IRONCORE")
                    .font(.system(size: 32, weight: .black, design: .default))
                    .foregroundStyle(.white)
                    .tracking(4)
            }
        }
    }
}
