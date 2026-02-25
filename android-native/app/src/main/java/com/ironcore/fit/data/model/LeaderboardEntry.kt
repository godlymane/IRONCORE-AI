package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /leaderboard/{userId}
 * Denormalized for fast global queries — sorted by xp desc.
 */
data class LeaderboardEntry(
    val id: String = "",
    val username: String = "",
    val xp: Long = 0,
    val level: Int = 0,
    val league: String = "Iron Novice",
    val avatarUrl: String = "",
    val photo: String = "",
    val todayVolume: Long = 0,
    val rank: Int = 0,
    @ServerTimestamp val lastUpdated: Timestamp? = null
)
