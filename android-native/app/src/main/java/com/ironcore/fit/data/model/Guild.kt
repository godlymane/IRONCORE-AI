package com.ironcore.fit.data.model

import com.google.firebase.Timestamp

/**
 * Firestore path: guilds/{guildId}
 *
 * Simplified guild model matching the current React app schema.
 * Members are stored as a list of user IDs; detailed member info
 * is fetched separately from user profiles.
 */
data class Guild(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val ownerId: String = "",
    val members: List<String> = emptyList(),
    val memberCount: Int = 0,
    val maxMembers: Int = 50,
    val totalXP: Long = 0,
    val league: String = "iron",
    val iconURL: String? = null,
    val createdAt: Timestamp? = null
)
