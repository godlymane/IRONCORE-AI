package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /global/data/chat/{messageId}
 * Also used for guild chat: /guilds/{guildId}/chat/{messageId}
 */
data class ChatMessage(
    val id: String = "",
    val userId: String = "",
    val username: String = "",
    val photo: String = "",
    val text: String = "",
    val xp: Long? = null,
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /global/data/posts/{postId}
 */
data class Post(
    val id: String = "",
    val imageUrl: String = "",
    val caption: String = "",
    val userId: String = "",
    val username: String = "",
    val userPhoto: String = "",
    val xp: Long = 0,
    val likes: Int = 0,
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /global/data/feed/{feedId}
 * Immutable — no updates or deletes allowed.
 */
data class FeedEvent(
    val id: String = "",
    val type: String = "",
    val message: String = "",
    val details: String = "",
    val username: String = "",
    val userId: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /users/{userId}/inbox/{messageId}
 */
data class InboxMessage(
    val id: String = "",
    val fromId: String = "",
    val fromName: String = "",
    val fromPhoto: String = "",
    val text: String = "",
    val read: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /users/{userId}/notifications/{notificationId}
 */
data class Notification(
    val id: String = "",
    val type: String = "",
    val title: String = "",
    val message: String = "",
    val read: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /users/{userId}/following/{targetUserId}
 */
data class Following(
    val id: String = "",
    val followedAt: Timestamp? = null
)
