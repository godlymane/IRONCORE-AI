package com.ironcore.fit.data.model

import com.google.firebase.Timestamp

/**
 * Firestore path: users/{uid}/progress/{entryId}
 *
 * Body-weight and body-composition tracking entries.
 * [weight] and [bodyFatPercentage] are nullable because
 * a user may log only one of them per entry.
 */
data class ProgressEntry(
    val id: String = "",
    val weight: Double? = null,
    val bodyFatPercentage: Double? = null,
    val date: String = "",                // "YYYY-MM-DD"
    val notes: String = "",
    val timestamp: Timestamp? = null
)
