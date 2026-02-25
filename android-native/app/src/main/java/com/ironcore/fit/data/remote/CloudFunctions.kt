package com.ironcore.fit.data.remote

import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Typed wrapper around Firebase Cloud Functions callables.
 * Mirrors the Cloud Functions in functions/index.js.
 */
@Singleton
class CloudFunctions @Inject constructor(
    private val functions: FirebaseFunctions
) {

    /** Call Gemini AI via server proxy. Rate-limited per feature. */
    suspend fun callGemini(
        prompt: String,
        systemPrompt: String = "",
        imageBase64: String? = null,
        expectJson: Boolean = false,
        feature: String = "chat"
    ): GeminiResponse {
        val data = hashMapOf(
            "prompt" to prompt,
            "systemPrompt" to systemPrompt,
            "expectJson" to expectJson,
            "feature" to feature
        )
        imageBase64?.let { data["imageBase64"] = it }

        val result = functions.getHttpsCallable("callGemini").call(data).await()
        val map = result.data as Map<*, *>
        val rateLimit = map["rateLimit"] as? Map<*, *>
        return GeminiResponse(
            text = map["text"] as? String ?: "",
            remaining = (rateLimit?.get("remaining") as? Number)?.toInt() ?: 0,
            retryAfter = (rateLimit?.get("retryAfter") as? Number)?.toInt()
        )
    }

    /** Analyze food photo/text for macro estimation. */
    suspend fun analyzeFood(mealText: String, imageBase64: String? = null): FoodAnalysis {
        val data = hashMapOf<String, Any>("mealText" to mealText)
        imageBase64?.let { data["imageBase64"] = it }

        val result = functions.getHttpsCallable("analyzeFood").call(data).await()
        val map = result.data as Map<*, *>
        return FoodAnalysis(
            mealName = map["mealName"] as? String ?: mealText,
            calories = (map["calories"] as? Number)?.toInt() ?: 0,
            protein = (map["protein"] as? Number)?.toDouble() ?: 0.0,
            carbs = (map["carbs"] as? Number)?.toDouble() ?: 0.0,
            fat = (map["fat"] as? Number)?.toDouble() ?: 0.0
        )
    }

    /**
     * Verify a Google Play purchase with the server.
     * The server writes subscription data to Firestore.
     */
    suspend fun verifyGooglePlayPurchase(
        purchaseToken: String,
        productId: String,
        planId: String
    ): Boolean {
        val data = hashMapOf(
            "purchaseToken" to purchaseToken,
            "productId" to productId,
            "planId" to planId
        )
        val result = functions.getHttpsCallable("verifyGooglePlayPurchase").call(data).await()
        val map = result.data as Map<*, *>
        return map["success"] as? Boolean ?: false
    }
}

data class GeminiResponse(
    val text: String,
    val remaining: Int,
    val retryAfter: Int? = null
)

data class FoodAnalysis(
    val mealName: String,
    val calories: Int,
    val protein: Double,
    val carbs: Double,
    val fat: Double
)
