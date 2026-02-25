import Foundation
import FirebaseFirestore

/// Embedded subscription map in both `users/{uid}` and `users/{uid}/data/profile`
struct SubscriptionInfo: Codable {
    var planId: String
    var status: String          // "active", "expired", "cancelled"
    var startDate: String       // ISO8601
    var expiryDate: String      // ISO8601
    var paymentId: String
    var orderId: String
    var platform: String?       // "ios" for Apple, nil for Razorpay
    var verifiedByServer: Bool
    @ServerTimestamp var updatedAt: Timestamp?

    var isActive: Bool {
        guard status == "active" else { return false }
        guard let expiry = ISO8601DateFormatter().date(from: expiryDate) else { return false }
        return expiry > Date()
    }
}
