package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: /users/{userId}/workouts/{workoutId}
 * Exercise sets use short field names (w/r) to minimize doc size.
 */
data class Workout(
    val id: String = "",
    val date: String = "",
    val userId: String = "",
    val exercises: List<Exercise> = emptyList(),
    val notes: String = "",
    val duration: Int? = null,
    @ServerTimestamp val createdAt: Timestamp? = null
)

data class Exercise(
    val name: String = "",
    val muscle: String = "",
    val sets: List<ExerciseSet> = emptyList()
)

/** w = weight, r = reps. Short names match React exactly. */
data class ExerciseSet(
    val w: Double = 0.0,
    val r: Int = 0
)

/**
 * Firestore path: /workoutTemplates/{templateId}
 */
data class WorkoutTemplate(
    val id: String = "",
    val userId: String = "",
    val name: String = "",
    val exercises: List<Exercise> = emptyList(),
    @ServerTimestamp val createdAt: Timestamp? = null
)
