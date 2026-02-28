package com.ironcore.fit.data.model

import com.google.firebase.Timestamp

/**
 * Firestore path: arenaMatches/{matchId}
 *
 * PvP arena matches. Replaces the older Battle model with the
 * current schema used by the React app and Cloud Functions.
 */
data class ArenaMatch(
    val id: String = "",
    val player1Id: String = "",
    val player2Id: String = "",
    val player1Score: Int = 0,
    val player2Score: Int = 0,
    val player1Name: String = "",
    val player2Name: String = "",
    val status: String = "pending",       // "pending" | "active" | "completed"
    val winnerId: String? = null,
    val exercise: String = "",
    val createdAt: Timestamp? = null,
    val completedAt: Timestamp? = null
)
