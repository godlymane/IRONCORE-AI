package com.ironcore.fit.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

/**
 * Firestore path: users/{uid}/workouts/{workoutId}
 *
 * Matches the React app's Firestore schema exactly so users can
 * switch between web and native seamlessly.
 */
data class Workout(
    val id: String = "",
    val name: String = "",
    val type: String = "strength",        // "strength" | "cardio" | "flexibility"
    val exercises: List<WorkoutExercise> = emptyList(),
    val duration: Long = 0,               // seconds
    val caloriesBurned: Int = 0,
    val xpEarned: Int = 0,
    val date: String = "",                // "YYYY-MM-DD"
    val startedAt: Timestamp? = null,
    @ServerTimestamp val completedAt: Timestamp? = null
)

data class WorkoutExercise(
    val name: String = "",
    val muscleGroup: String = "",
    val isCustom: Boolean = false,
    val sets: List<ExerciseSet> = emptyList()
)

data class ExerciseSet(
    val weight: Double = 0.0,
    val reps: Int = 0,
    val rpe: Int? = null,
    val completed: Boolean = false
)

/**
 * Firestore path: workoutTemplates/{templateId}
 *
 * User-created workout templates that can be reused to start new workouts.
 */
data class WorkoutTemplate(
    val id: String = "",
    val userId: String = "",
    val name: String = "",
    val type: String = "strength",
    val exercises: List<WorkoutExercise> = emptyList(),
    @com.google.firebase.firestore.ServerTimestamp val createdAt: com.google.firebase.Timestamp? = null
)
