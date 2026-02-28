package com.ironcore.fit.data.remote

import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Typed wrapper around Firebase Cloud Functions callables.
 * Mirrors all Cloud Functions in functions/index.js so both
 * the React web app and this native Android app share the same backend.
 */
@Singleton
class CloudFunctions @Inject constructor(
    private val functions: FirebaseFunctions
) {

    @Suppress("UNCHECKED_CAST")
    private suspend fun <T> call(name: String, data: Map<String, Any?> = emptyMap()): T {
        val result = functions.getHttpsCallable(name).call(data).await()
        return result.data as T
    }

    // ── Auth ──────────────────────────────────────────────────────

    suspend fun loginWithPin(username: String, pinHash: String): Map<String, Any> =
        call("loginWithPin", mapOf("username" to username, "pinHash" to pinHash))

    suspend fun recoverAccount(recoveryPhrase: String): Map<String, Any> =
        call("recoverAccount", mapOf("recoveryPhrase" to recoveryPhrase))

    // ── AI Coach ─────────────────────────────────────────────────

    suspend fun getAICoachResponse(message: String, context: String): Map<String, Any> =
        call("getAICoachResponse", mapOf("message" to message, "context" to context))

    /** Call Gemini AI via server proxy. Rate-limited per feature. */
    suspend fun callGemini(
        prompt: String,
        systemPrompt: String = "",
        imageBase64: String? = null,
        expectJson: Boolean = false,
        feature: String = "chat"
    ): GeminiResponse {
        val data = hashMapOf<String, Any?>(
            "prompt" to prompt,
            "systemPrompt" to systemPrompt,
            "expectJson" to expectJson,
            "feature" to feature
        )
        imageBase64?.let { data["imageBase64"] = it }

        val result = functions.getHttpsCallable("callGemini").call(data).await()
        @Suppress("UNCHECKED_CAST")
        val map = result.data as Map<*, *>
        val rateLimit = map["rateLimit"] as? Map<*, *>
        return GeminiResponse(
            text = map["text"] as? String ?: "",
            remaining = (rateLimit?.get("remaining") as? Number)?.toInt() ?: 0,
            retryAfter = (rateLimit?.get("retryAfter") as? Number)?.toInt()
        )
    }

    // ── Nutrition ─────────────────────────────────────────────────

    /** Analyze food photo/text for macro estimation. */
    suspend fun analyzeFood(mealText: String? = null, imageBase64: String? = null): FoodAnalysis {
        val data = hashMapOf<String, Any?>()
        mealText?.let { data["mealText"] = it }
        imageBase64?.let { data["imageBase64"] = it }

        val result = functions.getHttpsCallable("analyzeFood").call(data).await()
        @Suppress("UNCHECKED_CAST")
        val map = result.data as Map<*, *>
        return FoodAnalysis(
            mealName = map["mealName"] as? String ?: (mealText ?: ""),
            calories = (map["calories"] as? Number)?.toInt() ?: 0,
            protein = (map["protein"] as? Number)?.toDouble() ?: 0.0,
            carbs = (map["carbs"] as? Number)?.toDouble() ?: 0.0,
            fat = (map["fat"] as? Number)?.toDouble() ?: 0.0
        )
    }

    // ── Arena ─────────────────────────────────────────────────────

    suspend fun matchmake(): Map<String, Any> = call("matchmake")

    suspend fun submitArenaScore(matchId: String, score: Int): Map<String, Any> =
        call("submitArenaScore", mapOf("matchId" to matchId, "score" to score))

    // ── Guild ─────────────────────────────────────────────────────

    suspend fun createGuild(name: String, description: String): Map<String, Any> =
        call("createGuild", mapOf("name" to name, "description" to description))

    suspend fun joinGuild(guildId: String): Map<String, Any> =
        call("joinGuild", mapOf("guildId" to guildId))

    suspend fun leaveGuild(guildId: String): Map<String, Any> =
        call("leaveGuild", mapOf("guildId" to guildId))

    // ── Community Boss ────────────────────────────────────────────

    suspend fun dealBossDamage(bossId: String, damage: Int): Map<String, Any> =
        call("dealBossDamage", mapOf("bossId" to bossId, "damage" to damage))

    // ── Payment ───────────────────────────────────────────────────

    /**
     * Verify a Google Play purchase with the server.
     * The server writes subscription data to Firestore.
     */
    suspend fun verifyGooglePlayPurchase(
        purchaseToken: String,
        productId: String
    ): Map<String, Any> =
        call("verifyPayment", mapOf(
            "platform" to "android",
            "purchaseToken" to purchaseToken,
            "productId" to productId
        ))

    // ── League ────────────────────────────────────────────────────

    suspend fun calculateLeagues(): Map<String, Any> = call("calculateLeagues")
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
