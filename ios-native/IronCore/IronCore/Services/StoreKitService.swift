import Foundation
import StoreKit
import FirebaseAuth
import FirebaseFirestore
import FirebaseFunctions

/// StoreKit 2 service — handles all iOS in-app purchase and subscription logic.
/// Replaces Razorpay (web/Android only).
///
/// SECURITY: After StoreKit verifies a purchase locally, we call the
/// `verifyAppleReceipt` Cloud Function which validates with Apple's
/// App Store Server API before writing subscription data to Firestore.
/// The client NEVER writes subscription/isPremium fields directly.
@MainActor
final class StoreKitService: ObservableObject {
    static let shared = StoreKitService()

    // Product IDs — must match App Store Connect configuration
    static let monthlyProductID = "com.ironcore.fit.pro_monthly"
    static let yearlyProductID = "com.ironcore.fit.pro_yearly"

    @Published private(set) var products: [Product] = []
    @Published private(set) var purchaseState: PurchaseState = .idle
    @Published private(set) var isPremium: Bool = false
    @Published private(set) var currentSubscription: StoreKit.Transaction?
    @Published private(set) var expiryDate: Date?

    private var transactionListener: Task<Void, Never>?
    private let functions = Functions.functions()

    enum PurchaseState: Equatable {
        case idle
        case purchasing
        case success
        case failed(String)
    }

    private init() {
        transactionListener = listenForTransactions()
    }

    deinit {
        transactionListener?.cancel()
    }

    // MARK: - Load Products from App Store

    func loadProducts() async {
        do {
            let storeProducts = try await Product.products(for: [
                Self.monthlyProductID,
                Self.yearlyProductID
            ])
            products = storeProducts.sorted { $0.price < $1.price }
        } catch {
            print("[StoreKit] Failed to load products: \(error)")
        }
    }

    // MARK: - Purchase

    func purchase(_ product: Product) async {
        purchaseState = .purchasing

        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await activateSubscription(transaction: transaction)
                await transaction.finish()
                purchaseState = .success

            case .userCancelled:
                purchaseState = .idle

            case .pending:
                // Transaction requires approval (e.g., Ask to Buy)
                purchaseState = .idle

            @unknown default:
                purchaseState = .failed("Unknown purchase result")
            }
        } catch {
            purchaseState = .failed(error.localizedDescription)
        }
    }

    // MARK: - Restore Purchases

    func restorePurchases() async {
        try? await AppStore.sync()
        await checkEntitlements()
    }

    // MARK: - Check Current Entitlements

    func checkEntitlements() async {
        var foundActive = false

        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                if transaction.productID == Self.monthlyProductID ||
                   transaction.productID == Self.yearlyProductID {
                    currentSubscription = transaction
                    expiryDate = transaction.expirationDate
                    isPremium = true
                    foundActive = true
                }
            }
        }

        if !foundActive {
            isPremium = false
            currentSubscription = nil
            expiryDate = nil
        }
    }

    // MARK: - Transaction Listener (background)

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                if let transaction = try? self?.checkVerified(result) {
                    await self?.activateSubscription(transaction: transaction)
                    await transaction.finish()
                }
            }
        }
    }

    // MARK: - Verification

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }

    // MARK: - Activate Subscription (via Cloud Function)
    // Calls verifyAppleReceipt which validates with Apple's App Store Server API
    // and writes to Firestore using Admin SDK (bypasses security rules).

    private func activateSubscription(transaction: StoreKit.Transaction) async {
        guard Auth.auth().currentUser != nil else { return }

        let data: [String: Any] = [
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "productId": transaction.productID
        ]

        do {
            let result = try await functions.httpsCallable("verifyAppleReceipt").call(data)

            if let response = result.data as? [String: Any],
               let success = response["success"] as? Bool, success {
                isPremium = true
                currentSubscription = transaction
                expiryDate = transaction.expirationDate
                print("[StoreKit] Server verification successful")
            } else {
                print("[StoreKit] Server verification returned unexpected response")
                // Still mark premium locally — StoreKit already verified
                isPremium = true
                currentSubscription = transaction
                expiryDate = transaction.expirationDate
            }
        } catch {
            print("[StoreKit] Server verification failed: \(error)")
            // StoreKit already verified the purchase locally.
            // Mark premium optimistically — server will catch up on next launch.
            isPremium = true
            currentSubscription = transaction
            expiryDate = transaction.expirationDate
        }
    }

    // MARK: - Helpers

    private func mapProductToPlanId(_ productID: String) -> String {
        switch productID {
        case Self.monthlyProductID: return "pro_monthly"
        case Self.yearlyProductID: return "pro_yearly"
        default: return "unknown"
        }
    }

    /// Get the display product for a plan
    func product(for planId: String) -> Product? {
        let productID = planId == "pro_yearly" ? Self.yearlyProductID : Self.monthlyProductID
        return products.first { $0.id == productID }
    }
}
