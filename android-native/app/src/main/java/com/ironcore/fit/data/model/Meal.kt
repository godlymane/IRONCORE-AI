package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /users/{userId}/meals/{mealId}
 *
 * Single source of truth for meal data. Used by NutritionRepository,
 * NutritionViewModel, HomeViewModel, HomeScreen, and NutritionDay.
 */
data class Meal(
    val id: String = "",
    val name: String = "",
    val calories: Int = 0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    val time: Timestamp? = null,
    val date: String = "",
    val aiAnalyzed: Boolean = false,
    val userId: String = "",
    val notes: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null
)
