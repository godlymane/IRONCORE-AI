import SwiftUI
import FirebaseCore

@main
struct IronCoreApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var firestoreManager = FirestoreManager.shared
    @StateObject private var storeKitManager = StoreKitManager.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .environmentObject(firestoreManager)
                .environmentObject(storeKitManager)
                .preferredColorScheme(.dark)
        }
    }
}
