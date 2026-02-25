package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /community_boss/current
 * Singleton document — the active global boss fight.
 */
data class CommunityBoss(
    val id: String = "current",
    val bossId: String = "",
    val name: String = "",
    val totalHP: Long = 0,
    val currentHP: Long = 0,
    val contributors: List<BossContributor> = emptyList(),
    val status: String = "active",
    @ServerTimestamp val startedAt: Timestamp? = null,
    val defeatedAt: Timestamp? = null,
    @ServerTimestamp val lastDamageAt: Timestamp? = null
)

data class BossContributor(
    val userId: String = "",
    val username: String = "",
    val damageDealt: Long = 0,
    val joinedAt: String = "",
    val claimedXP: Boolean = false
)
