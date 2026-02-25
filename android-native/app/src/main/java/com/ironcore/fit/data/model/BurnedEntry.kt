package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /users/{userId}/burned/{entryId}
 */
data class BurnedEntry(
    val id: String = "",
    val date: String = "",
    val userId: String = "",
    val caloriesBurned: Int = 0,
    val duration: Int = 0,
    val activity: String = "",
    val notes: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)
