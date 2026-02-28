import SwiftUI
import FirebaseCore
import FirebaseAuth
import FirebaseMessaging

@main
struct IronCoreApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var premiumViewModel = PremiumViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authViewModel)
                .environmentObject(premiumViewModel)
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

        // Configure push notifications (FCM + local + categories)
        NotificationService.shared.configure()

        return true
    }

    // Google Sign-In URL handler
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return AuthService.shared.handleGoogleSignInURL(url)
    }

    // MARK: - Remote Notifications (APNS → FCM)

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Forward APNS token to Firebase Cloud Messaging
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNS] Failed to register: \(error.localizedDescription)")
    }
}
