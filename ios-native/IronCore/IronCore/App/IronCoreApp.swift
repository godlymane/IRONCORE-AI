import SwiftUI
import FirebaseCore
import FirebaseAuth

@main
struct IronCoreApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authViewModel)
                .preferredColorScheme(.dark)
                .task {
                    // Eagerly load StoreKit products + check entitlements on launch
                    await StoreKitService.shared.loadProducts()
                    await StoreKitService.shared.checkEntitlements()
                }
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }

    // Google Sign-In URL handler
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return AuthService.shared.handleGoogleSignInURL(url)
    }
}
