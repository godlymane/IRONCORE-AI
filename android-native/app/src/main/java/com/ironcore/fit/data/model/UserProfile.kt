package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.PropertyName
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /users/{userId}/data/profile
 * Mirrors React useFitnessData.js profile schema exactly.
 */
data class UserProfile(
    val schemaVersion: Int = 1,
    val userId: String = "",
    val photoURL: String = "",
    val xp: Long = 0,
    val level: Int = 0,
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val streakFreezeCount: Int = 1,
    val streakShields: Int = 0,
    val shieldActiveUntil: String? = null,
    val doubleXPTokens: Int = 0,
    val lastLoginAt: Timestamp? = null,
    val lastStreakUpdateAt: Timestamp? = null,
    val dailyDrops: Map<String, Boolean> = emptyMap(),
    val dailyRewardsClaimed: Map<String, Boolean> = emptyMap(),
    val rewardDayIndex: Int = 0,
    val lastRewardMonth: String = "",
    val subscription: SubscriptionInfo? = null,
    val isPremium: Boolean = false,
    val guildId: String? = null,
    val guildRole: String? = null,
    val stackConfig: List<String> = emptyList(),
    val inventory: List<InventoryItem> = emptyList()
)

data class SubscriptionInfo(
    val planId: String = "free",
    val status: String = "expired",
    val startDate: String = "",
    val expiryDate: String = "",
    val paymentId: String = "",
    val orderId: String = "",
    val updatedAt: Timestamp? = null
)

data class InventoryItem(
    val item: String = "",
    val boughtAt: Timestamp? = null,
    val receivedAt: Timestamp? = null
)
