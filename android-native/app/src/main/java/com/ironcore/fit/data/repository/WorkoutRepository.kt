package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.ironcore.fit.data.model.Workout
import com.ironcore.fit.data.model.WorkoutExercise
import com.ironcore.fit.data.model.ExerciseSet
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for workout CRUD operations.
 *
 * Firestore path: users/{uid}/workouts/{workoutId}
 * Schema matches the React app exactly so users can switch
 * between web and native seamlessly.
 */
@Singleton
class WorkoutRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore
) {
    private val uid get() = auth.currentUser?.uid
        ?: throw IllegalStateException("Not authenticated")

    private fun workoutsRef() = db.collection("users").document(uid)
        .collection("workouts")

    /**
     * Real-time stream of the user's most recent workouts.
     * Ordered by completedAt descending so newest workouts appear first.
     */
    fun workoutsFlow(limit: Int = 30): Flow<List<Workout>> = callbackFlow {
        val listener = workoutsRef()
            .orderBy("completedAt", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val workouts = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Workout::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(workouts)
            }
        awaitClose { listener.remove() }
    }

    /**
     * Save a completed workout to Firestore.
     * Returns the generated document ID.
     *
     * Uses an explicit map instead of the data class directly so we
     * can set completedAt to Timestamp.now() at write time.
     */
    suspend fun saveWorkout(workout: Workout): String {
        val data = mapOf(
            "name" to workout.name,
            "type" to workout.type,
            "exercises" to workout.exercises.map { ex ->
                mapOf(
                    "name" to ex.name,
                    "muscleGroup" to ex.muscleGroup,
                    "isCustom" to ex.isCustom,
                    "sets" to ex.sets.map { set ->
                        mapOf(
                            "weight" to set.weight,
                            "reps" to set.reps,
                            "rpe" to set.rpe,
                            "completed" to set.completed
                        )
                    }
                )
            },
            "duration" to workout.duration,
            "caloriesBurned" to workout.caloriesBurned,
            "xpEarned" to workout.xpEarned,
            "date" to workout.date,
            "startedAt" to workout.startedAt,
            "completedAt" to Timestamp.now()
        )
        val docRef = workoutsRef().add(data).await()
        return docRef.id
    }

    /** Delete a workout by its document ID. */
    suspend fun deleteWorkout(workoutId: String) {
        workoutsRef().document(workoutId).delete().await()
    }

    /**
     * Returns a distinct list of date strings ("YYYY-MM-DD") on which
     * the user completed workouts. Used for streak calculation and
     * heatmap rendering.
     */
    suspend fun getWorkoutDates(): List<String> {
        val snapshots = workoutsRef().get().await()
        return snapshots.documents.mapNotNull { it.getString("date") }.distinct()
    }
}
