import Foundation
import StoreKit
import FirebaseAuth
import FirebaseFirestore

/// StoreKit 2 service — handles all iOS in-app purchase and subscription logic.
/// Replaces Razorpay (web/Android only). Writes to same Firestore paths as verifyPayment Cloud Function.
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
    private let db = Firestore.firestore()

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
                await activateSubscription(transaction: transaction, product: product)
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

                    // Sync to Firestore
                    await syncSubscriptionToFirestore(transaction: transaction)
                }
            }
        }

        if !foundActive {
            isPremium = false
            currentSubscription = nil
            expiryDate = nil

            // Mark expired in Firestore if needed
            await markExpiredInFirestore()
        }
    }

    // MARK: - Transaction Listener (background)

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                if let transaction = try? self?.checkVerified(result) {
                    await self?.activateSubscription(transaction: transaction, product: nil)
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

    // MARK: - Activate Subscription (Firestore write)
    // Writes to same paths as verifyPayment Cloud Function — unified data model

    private func activateSubscription(transaction: StoreKit.Transaction, product: Product?) async {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let planId = mapProductToPlanId(transaction.productID)
        let now = Date()
        let expiry = transaction.expirationDate ?? Calendar.current.date(byAdding: .month, value: 1, to: now)!

        let subscriptionData: [String: Any] = [
            "planId": planId,
            "status": "active",
            "startDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
            "expiryDate": ISO8601DateFormatter().string(from: expiry),
            "paymentId": "apple_\(transaction.id)",
            "orderId": "apple_\(transaction.originalID)",
            "platform": "ios",
            "updatedAt": FieldValue.serverTimestamp()
        ]

        let batch = db.batch()

        // Same paths as verifyPayment Cloud Function
        let userDoc = db.document("users/\(uid)")
        batch.setData(["subscription": subscriptionData, "isPremium": true], forDocument: userDoc, merge: true)

        let profileDoc = db.document("users/\(uid)/data/profile")
        batch.setData(["subscription": subscriptionData, "isPremium": true], forDocument: profileDoc, merge: true)

        // Analytics record (same collection as Razorpay path)
        let subDoc = db.document("subscriptions/\(uid)_apple_\(transaction.id)")
        batch.setData([
            "userId": uid,
            "planId": planId,
            "status": "active",
            "startDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
            "expiryDate": ISO8601DateFormatter().string(from: expiry),
            "paymentId": "apple_\(transaction.id)",
            "orderId": "apple_\(transaction.originalID)",
            "platform": "ios",
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ], forDocument: subDoc)

        do {
            try await batch.commit()
            isPremium = true
            currentSubscription = transaction
            expiryDate = expiry
        } catch {
            print("[StoreKit] Firestore batch write failed: \(error)")
        }
    }

    private func markExpiredInFirestore() async {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let expiredData: [String: Any] = [
            "isPremium": false,
            "subscription.status": "expired",
            "subscription.updatedAt": FieldValue.serverTimestamp()
        ]

        let batch = db.batch()
        batch.setData(expiredData, forDocument: db.document("users/\(uid)"), merge: true)
        batch.setData(expiredData, forDocument: db.document("users/\(uid)/data/profile"), merge: true)

        try? await batch.commit()
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
