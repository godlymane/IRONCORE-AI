package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /users/{userId}/meals/{mealId}
 */
data class Meal(
    val id: String = "",
    val date: String = "",
    val userId: String = "",
    val mealName: String = "",
    val calories: Int = 0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    val notes: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)
