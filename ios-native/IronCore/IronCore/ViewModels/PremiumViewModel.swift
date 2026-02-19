import Foundation
import StoreKit
import FirebaseAuth

/// Premium feature gating — mirrors PremiumContext.jsx from React prototype.
/// Manages subscription state, paywall triggers, and per-feature limit checks.
@MainActor
final class PremiumViewModel: ObservableObject {
    @Published var isPremium: Bool = false
    @Published var plan: String = "free"
    @Published var expiryDate: Date?
    @Published var loading: Bool = true

    // Paywall state
    @Published var showPaywall: Bool = false
    @Published var paywallFeature: String?

    private let storeKit = StoreKitService.shared
    private let firestore = FirestoreService.shared

    // MARK: - Feature Limits (matches paymentService.js PRICING_PLANS)

    struct FeatureLimits {
        let aiCoachCalls: Int      // per day, Int.max = unlimited
        let progressPhotos: Int    // total, Int.max = unlimited
        let workoutHistory: Int    // days, Int.max = unlimited
        let guilds: Bool
        let unlimitedHistory: Bool
    }

    static let freeLimits = FeatureLimits(
        aiCoachCalls: 3,
        progressPhotos: 5,
        workoutHistory: 7,
        guilds: false,
        unlimitedHistory: false
    )

    static let premiumLimits = FeatureLimits(
        aiCoachCalls: .max,
        progressPhotos: .max,
        workoutHistory: .max,
        guilds: true,
        unlimitedHistory: true
    )

    var features: FeatureLimits {
        isPremium ? Self.premiumLimits : Self.freeLimits
    }

    // MARK: - Contextual Paywall Messages (matches PremiumPaywall.jsx)

    static let contextualLines: [String: String] = [
        "aiCoachCalls": "Full form analysis is a Premium feature.",
        "progressPhotos": "Unlimited progress photos require Premium.",
        "guilds": "Creating a guild requires Premium.",
        "battlePassTrack": "This cosmetic is exclusive to Premium members.",
        "unlimitedHistory": "Your history older than 30 days is locked.",
        "analytics": "You tried to access Advanced Analytics.",
        "export": "Data export is available on Premium."
    ]

    // MARK: - Init

    func checkStatus() async {
        loading = true

        // Check StoreKit entitlements first (source of truth on iOS)
        await storeKit.loadProducts()
        await storeKit.checkEntitlements()

        isPremium = storeKit.isPremium
        expiryDate = storeKit.expiryDate

        if isPremium {
            // Determine plan from current subscription
            if let sub = storeKit.currentSubscription {
                plan = sub.productID == StoreKitService.yearlyProductID ? "pro_yearly" : "pro_monthly"
            }
        } else {
            // Fallback: check Firestore (handles cross-platform subscriptions from web/Android)
            await checkFirestoreStatus()
        }

        loading = false
    }

    private func checkFirestoreStatus() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        do {
            if let profile = try await firestore.getProfile(uid: uid) {
                if profile.isPremium == true,
                   let sub = profile.subscription,
                   sub.status == "active",
                   let expiryStr = sub.expiryDate,
                   let expiry = ISO8601DateFormatter().date(from: expiryStr),
                   expiry > Date() {
                    isPremium = true
                    plan = sub.planId ?? "pro_monthly"
                    expiryDate = expiry
                }
            }
        } catch {
            print("[Premium] Firestore check failed: \(error)")
        }
    }

    // MARK: - Feature Gating (matches requirePremium/checkFeature from React)

    /// Returns true if premium. If not, triggers paywall and returns false.
    func requirePremium(_ featureName: String) -> Bool {
        if isPremium { return true }
        paywallFeature = featureName
        showPaywall = true
        return false
    }

    /// Check if user can use a feature given current usage count.
    func checkFeature(_ featureName: String, currentUsage: Int = 0) -> Bool {
        if isPremium { return true }

        switch featureName {
        case "aiCoachCalls":
            return currentUsage < features.aiCoachCalls
        case "progressPhotos":
            return currentUsage < features.progressPhotos
        case "workoutHistory":
            return currentUsage < features.workoutHistory
        case "guilds":
            return features.guilds
        case "unlimitedHistory":
            return features.unlimitedHistory
        default:
            return false
        }
    }

    // MARK: - Purchase Flow

    func purchase(planId: String) async {
        guard let product = storeKit.product(for: planId) else { return }
        await storeKit.purchase(product)

        if storeKit.purchaseState == .success {
            isPremium = true
            plan = planId
            expiryDate = storeKit.expiryDate
            showPaywall = false
            paywallFeature = nil
        }
    }

    func restorePurchases() async {
        await storeKit.restorePurchases()
        isPremium = storeKit.isPremium
        expiryDate = storeKit.expiryDate
        if isPremium {
            showPaywall = false
        }
    }

    func closePaywall() {
        showPaywall = false
        paywallFeature = nil
    }
}
