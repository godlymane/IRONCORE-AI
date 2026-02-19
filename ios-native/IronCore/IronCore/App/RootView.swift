import SwiftUI

struct RootView: View {
    @EnvironmentObject var authVM: AuthViewModel

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch authVM.authState {
            case .loading:
                SplashView()

            case .unauthenticated:
                LoginView()

            case .onboarding:
                OnboardingView()

            case .authenticated:
                MainTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authVM.authState)
    }
}

struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 48))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.ironRed, .ironRedLight],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text("IRONCORE")
                .font(.system(size: 28, weight: .black, design: .default))
                .italic()
                .foregroundColor(.white)
            ProgressView()
                .tint(.ironRed)
        }
    }
}
