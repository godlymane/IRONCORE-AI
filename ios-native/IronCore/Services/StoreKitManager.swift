import Foundation
import StoreKit
import Combine

/// StoreKit 2 manager for Premium subscriptions and Battle Pass
/// Replaces Razorpay from the React app for iOS payments
final class StoreKitManager: ObservableObject {
    static let shared = StoreKitManager()

    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []
    @Published var isPremium = false
    @Published var isLoading = false

    private var transactionListener: Task<Void, Error>?

    private init() {
        transactionListener = listenForTransactions()
        Task { await loadProducts() }
    }

    deinit {
        transactionListener?.cancel()
    }

    // MARK: - Load Products

    func loadProducts() async {
        do {
            let storeProducts = try await Product.products(for: Set(ProductID.all))
            await MainActor.run {
                self.products = storeProducts.sorted { $0.price < $1.price }
            }
        } catch {
            print("Failed to load products: \(error)")
        }
    }

    // MARK: - Purchase

    func purchase(_ product: Product, uid: String) async throws -> Transaction? {
        await MainActor.run { isLoading = true }
        defer { Task { @MainActor in isLoading = false } }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)

            // Verify with our server via Cloud Function
            let environment = transaction.environment == .production ? "production" : "sandbox"
            let subscription = try await CloudFunctionService.shared.verifyAppleTransaction(
                userId: uid,
                transactionId: String(transaction.id),
                originalTransactionId: String(transaction.originalID),
                planId: product.id,
                environment: environment.rawValue
            )

            // Update local profile with subscription
            try await FirestoreManager.shared.updateProfile(uid: uid, data: [
                "subscription": [
                    "planId": subscription.planId,
                    "status": subscription.status,
                    "startDate": subscription.startDate,
                    "expiryDate": subscription.expiryDate,
                    "paymentId": subscription.paymentId,
                    "orderId": subscription.orderId,
                    "platform": "ios",
                    "verifiedByServer": true,
                ] as [String: Any],
                "isPremium": true,
            ])

            await transaction.finish()

            await MainActor.run {
                self.purchasedProductIDs.insert(product.id)
                self.isPremium = ProductID.subscriptions.contains(product.id)
            }

            return transaction

        case .userCancelled:
            return nil

        case .pending:
            return nil

        @unknown default:
            return nil
        }
    }

    // MARK: - Restore Purchases

    func restorePurchases() async {
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                await MainActor.run {
                    purchasedProductIDs.insert(transaction.productID)
                    if ProductID.subscriptions.contains(transaction.productID) {
                        isPremium = true
                    }
                }
            }
        }
    }

    // MARK: - Check Premium Status

    func checkPremiumStatus() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result),
               ProductID.subscriptions.contains(transaction.productID) {
                await MainActor.run { isPremium = true }
                return true
            }
        }
        await MainActor.run { isPremium = false }
        return false
    }

    // MARK: - Feature Gating (mirrors React PremiumContext)

    func canUseFeature(_ feature: String, currentUsage: Int = 0) -> Bool {
        if isPremium { return true }
        switch feature {
        case "aiCoach":
            return currentUsage < FeatureLimits.freeAICallsPerDay
        case "progressPhotos":
            return currentUsage < FeatureLimits.freeProgressPhotos
        case "guilds":
            return false
        default:
            return true
        }
    }

    // MARK: - Helpers

    /// Get a specific product by ID
    func product(for id: String) -> Product? {
        products.first { $0.id == id }
    }

    /// Monthly subscription product
    var monthlyProduct: Product? { product(for: ProductID.proMonthly) }

    /// Yearly subscription product
    var yearlyProduct: Product? { product(for: ProductID.proYearly) }

    /// Battle pass product
    var battlePassProduct: Product? { product(for: ProductID.battlePass) }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    private func listenForTransactions() -> Task<Void, Error> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                if let transaction = try? self?.checkVerified(result) {
                    await MainActor.run {
                        self?.purchasedProductIDs.insert(transaction.productID)
                        if ProductID.subscriptions.contains(transaction.productID) {
                            self?.isPremium = true
                        }
                    }
                    await transaction.finish()
                }
            }
        }
    }
}

enum StoreKitError: LocalizedError {
    case failedVerification

    var errorDescription: String? {
        switch self {
        case .failedVerification:
            return "Transaction verification failed"
        }
    }
}
