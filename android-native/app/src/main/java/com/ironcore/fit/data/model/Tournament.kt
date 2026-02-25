package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /tournaments/{tournamentId}
 * Also mirrored at /global/tournament for active singleton.
 */
data class Tournament(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val status: String = "upcoming",
    val rules: String = "",
    val rewards: List<TournamentReward> = emptyList(),
    val participantCount: Int = 0,
    @ServerTimestamp val createdAt: Timestamp? = null
)

data class TournamentReward(
    val rank: Int = 0,
    val reward: String = ""
)

/**
 * Firestore path: /tournaments/{id}/participants/{userId}
 */
data class TournamentParticipant(
    val userId: String = "",
    val username: String = "",
    val avatarUrl: String = "",
    val score: Long = 0,
    val rank: Int = 0,
    val joinedAt: Timestamp? = null
)
