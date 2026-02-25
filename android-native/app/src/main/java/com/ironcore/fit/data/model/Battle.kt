package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /battles/{battleId}
 */
data class Battle(
    val id: String = "",
    val challenger: BattlePlayer = BattlePlayer(),
    val opponent: BattlePlayer = BattlePlayer(),
    val status: String = "pending",
    val battleType: String = "ranked",
    val winnerId: String? = null,
    @ServerTimestamp val createdAt: Timestamp? = null,
    val acceptedAt: Timestamp? = null,
    val declinedAt: Timestamp? = null,
    val completedAt: Timestamp? = null,
    val expiresAt: Timestamp? = null
)

data class BattlePlayer(
    val userId: String = "",
    val username: String = "",
    val photo: String = "",
    val xp: Long = 0
)
