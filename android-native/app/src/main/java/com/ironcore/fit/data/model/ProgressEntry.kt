package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /users/{userId}/progress/{entryId}
 */
data class ProgressEntry(
    val id: String = "",
    val date: String = "",
    val userId: String = "",
    val weight: Double = 0.0,
    val bodyFatPercentage: Double? = null,
    val notes: String = "",
    val mood: String? = null,
    @ServerTimestamp val createdAt: Timestamp? = null
)

/**
 * Firestore path: /users/{userId}/photos/{photoId}
 */
data class ProgressPhoto(
    val id: String = "",
    val url: String = "",
    val storagePath: String = "",
    val note: String = "",
    val type: String = "front",
    val date: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)
