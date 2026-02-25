import Foundation
import FirebaseFunctions

/// Calls shared Cloud Functions (same functions/ backend as React app)
/// Mirrors React helpers.js callGemini + paymentService.js
final class CloudFunctionService {
    static let shared = CloudFunctionService()

    private let functions = Functions.functions()

    private init() {}

    // MARK: - AI Services

    /// Call Gemini AI via Cloud Function (mirrors React callGemini)
    func callGemini(
        prompt: String,
        systemPrompt: String? = nil,
        imageBase64: String? = nil,
        expectJson: Bool = false,
        feature: String? = nil
    ) async throws -> String {
        var data: [String: Any] = ["prompt": prompt]
        if let systemPrompt { data["systemPrompt"] = systemPrompt }
        if let imageBase64 { data["imageBase64"] = imageBase64 }
        data["expectJson"] = expectJson
        if let feature { data["feature"] = feature }

        let result = try await functions.httpsCallable("callGemini").call(data)
        guard let response = result.data as? [String: Any],
              let text = response["text"] as? String else {
            throw CloudFunctionError.invalidResponse
        }
        return text
    }

    /// Analyze food via Cloud Function (mirrors React analyzeFood)
    func analyzeFood(mealText: String, imageBase64: String? = nil) async throws -> MealAnalysis {
        var data: [String: Any] = ["mealText": mealText]
        if let imageBase64 { data["imageBase64"] = imageBase64 }

        let result = try await functions.httpsCallable("analyzeFood").call(data)
        guard let response = result.data as? [String: Any] else {
            throw CloudFunctionError.invalidResponse
        }

        return MealAnalysis(
            mealName: response["mealName"] as? String ?? mealText,
            calories: response["calories"] as? Double ?? 0,
            protein: response["protein"] as? Double ?? 0,
            carbs: response["carbs"] as? Double ?? 0,
            fat: response["fat"] as? Double ?? 0
        )
    }

    // MARK: - Payment Verification (for Apple IAP)

    /// Verify Apple receipt with server (mirrors React verifyPayment but for iOS)
    func verifyAppleTransaction(
        userId: String,
        transactionId: String,
        originalTransactionId: String,
        planId: String,
        environment: String
    ) async throws -> SubscriptionInfo {
        let data: [String: Any] = [
            "userId": userId,
            "transactionId": transactionId,
            "originalTransactionId": originalTransactionId,
            "planId": planId,
            "platform": "ios",
            "environment": environment,
        ]

        let result = try await functions.httpsCallable("verifyApplePayment").call(data)
        guard let response = result.data as? [String: Any],
              let subscription = response["subscription"] as? [String: Any] else {
            throw CloudFunctionError.invalidResponse
        }

        return SubscriptionInfo(
            planId: subscription["planId"] as? String ?? planId,
            status: subscription["status"] as? String ?? "active",
            startDate: subscription["startDate"] as? String ?? iso8601String(),
            expiryDate: subscription["expiryDate"] as? String ?? "",
            paymentId: transactionId,
            orderId: originalTransactionId,
            platform: "ios",
            verifiedByServer: true
        )
    }
}

struct MealAnalysis {
    let mealName: String
    let calories: Double
    let protein: Double
    let carbs: Double
    let fat: Double
}

enum CloudFunctionError: LocalizedError {
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from Cloud Function"
        }
    }
}
