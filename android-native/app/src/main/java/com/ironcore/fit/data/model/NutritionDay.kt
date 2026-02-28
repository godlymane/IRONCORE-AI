package com.ironcore.fit.data.model

/**
 * Firestore path: users/{uid}/nutrition/{date}
 *
 * One document per day. Each document holds the list of meals
 * and pre-computed macro totals for quick reads.
 *
 * The [Meal] type is defined in Meal.kt (single source of truth).
 */
data class NutritionDay(
    val date: String = "",                // "YYYY-MM-DD"
    val meals: List<Meal> = emptyList(),
    val totalCalories: Int = 0,
    val totalProtein: Double = 0.0,
    val totalCarbs: Double = 0.0,
    val totalFat: Double = 0.0
)
