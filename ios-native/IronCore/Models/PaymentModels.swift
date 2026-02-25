import Foundation
import FirebaseFirestore

/// Payment order at `orders/{orderId}`
struct PaymentOrder: Codable, Identifiable {
    @DocumentID var id: String?
    var userId: String
    var planId: String
    var amount: Int             // amount in smallest currency unit
    var currency: String
    var razorpayOrderId: String
    var status: String          // "created", "paid"
    var paymentId: String?
    @ServerTimestamp var createdAt: Timestamp?
    @ServerTimestamp var paidAt: Timestamp?
}

/// Subscription record at `subscriptions/{userId}_{paymentId}`
struct SubscriptionRecord: Codable, Identifiable {
    @DocumentID var id: String?
    var userId: String
    var planId: String
    var status: String          // "active", "expired"
    var startDate: String       // ISO8601
    var expiryDate: String      // ISO8601
    var paymentId: String
    var orderId: String
    var platform: String?       // "ios" for Apple
    var verifiedByServer: Bool
    var appleTransactionId: String?
    var appleOriginalTransactionId: String?
    var appleEnvironment: String?   // "production", "sandbox"
    @ServerTimestamp var updatedAt: Timestamp?
    @ServerTimestamp var createdAt: Timestamp?
}
