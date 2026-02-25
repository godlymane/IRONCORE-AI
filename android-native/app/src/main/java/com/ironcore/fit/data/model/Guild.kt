package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /guilds/{guildId}
 */
data class Guild(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val emblem: String = "",
    val bio: String = "",
    val inviteCode: String = "",
    val leaderId: String = "",
    val ownerId: String = "",
    val members: List<GuildMember> = emptyList(),
    val memberCount: Int = 0,
    val maxMembers: Int = 30,
    val level: Int = 1,
    val totalXP: Long = 0,
    val isPublic: Boolean = true,
    val weeklyGoal: WeeklyGoal? = null,
    val weeklyGoalProgress: Int = 0,
    @ServerTimestamp val createdAt: Timestamp? = null
)

data class GuildMember(
    val userId: String = "",
    val username: String = "",
    val avatarUrl: String = "",
    val role: String = "member",
    val joinedAt: String = ""
)

data class WeeklyGoal(
    val metric: String = "volume",
    val target: Int = 0
)
