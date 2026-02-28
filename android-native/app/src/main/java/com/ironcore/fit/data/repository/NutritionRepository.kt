package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.ironcore.fit.data.model.NutritionDay
import com.ironcore.fit.util.DateFormatters
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

// Alias to avoid clashes in files that also use other "Meal"-like types
import com.ironcore.fit.data.model.Meal as NutritionMeal

/**
 * Repository for nutrition / meal tracking.
 *
 * Firestore path: users/{uid}/meals/{mealId}
 *
 * Each meal document stores individual food entries with macro data.
 * The todayMealsFlow filters to just today's date so the nutrition
 * dashboard only shows current-day intake.
 */
@Singleton
class NutritionRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore
) {
    private val uid get() = auth.currentUser?.uid
        ?: throw IllegalStateException("Not authenticated")

    private fun mealsRef() = db.collection("users").document(uid).collection("meals")

    /**
     * Real-time stream of today's meals.
     * Filters by the "date" field matching today's ISO date string.
     */
    fun todayMealsFlow(): Flow<List<NutritionMeal>> = callbackFlow {
        val today = DateFormatters.today()
        val listener = mealsRef()
            .whereEqualTo("date", today)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val meals = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(NutritionMeal::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(meals)
            }
        awaitClose { listener.remove() }
    }

    /**
     * Add a meal entry. If the date is empty, defaults to today.
     * Returns the generated document ID.
     */
    suspend fun addMeal(meal: NutritionMeal): String {
        val data = mapOf(
            "name" to meal.name,
            "calories" to meal.calories,
            "protein" to meal.protein,
            "carbs" to meal.carbs,
            "fat" to meal.fat,
            "date" to meal.date.ifEmpty { DateFormatters.today() },
            "time" to Timestamp.now(),
            "aiAnalyzed" to meal.aiAnalyzed
        )
        val docRef = mealsRef().add(data).await()
        return docRef.id
    }

    /** Delete a meal entry by its document ID. */
    suspend fun deleteMeal(mealId: String) {
        mealsRef().document(mealId).delete().await()
    }
}
