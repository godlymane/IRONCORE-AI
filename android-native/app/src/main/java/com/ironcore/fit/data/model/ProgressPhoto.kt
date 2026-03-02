package com.ironcore.fit.data.model

import com.google.firebase.Timestamp

/**
 * Firestore path: users/{uid}/photos/{photoId}
 *
 * Progress photo entries for body transformation tracking.
 */
data class ProgressPhoto(
    val id: String = "",
    val url: String = "",
    val storagePath: String = "",
    val note: String = "",
    val type: String = "",           // "front", "side", "back", "custom"
    val date: String = "",           // "YYYY-MM-DD"
    val createdAt: Timestamp? = null
)
