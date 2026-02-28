package com.ironcore.fit.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.ironcore.fit.data.model.ExerciseSet
import com.ironcore.fit.data.model.Workout
import com.ironcore.fit.data.model.WorkoutExercise
import com.ironcore.fit.data.repository.WorkoutRepository
import com.ironcore.fit.util.DateFormatters
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

// ══════════════════════════════════════════════════════════════════
// Exercise database — matches the React EXERCISE_DB constant
// ══════════════════════════════════════════════════════════════════

val EXERCISE_DB = listOf(
    "Bench Press", "Squat", "Deadlift", "Overhead Press",
    "Barbell Row", "Pull Up", "Dip", "Leg Press",
    "Romanian Deadlift", "Incline Bench Press", "Cable Fly",
    "Lateral Raise", "Bicep Curl", "Tricep Extension",
    "Leg Curl", "Leg Extension", "Calf Raise", "Face Pull"
)

// ══════════════════════════════════════════════════════════════════
// UI State models
// ══════════════════════════════════════════════════════════════════

/**
 * Mutable state for a single set within an active session.
 * Weight/reps/rpe are Strings so we can show empty fields and
 * ghost-set placeholders without type conversion noise.
 */
data class SetState(
    val weight: String = "",
    val reps: String = "",
    val rpe: String = "",
    val completed: Boolean = false
)

/**
 * Mutable state for a single exercise within an active session.
 */
data class ExerciseState(
    val id: String = UUID.randomUUID().toString(),
    val name: String = EXERCISE_DB.first(),
    val isCustom: Boolean = false,
    val sets: List<SetState> = listOf(SetState()),
    val pr: Double = 0.0
)

/**
 * Top-level UI state for the entire Workout screen.
 */
data class WorkoutUiState(
    // Session state
    val isSessionActive: Boolean = false,
    val sessionName: String = "",
    val elapsed: Int = 0,            // seconds since session start
    val exercises: List<ExerciseState> = emptyList(),

    // Rest timer
    val restTimer: Int = 0,          // seconds remaining
    val isResting: Boolean = false,

    // History (list mode)
    val workoutHistory: List<Workout> = emptyList(),
    val isLoading: Boolean = true,

    // Feedback
    val isSaving: Boolean = false,
    val saveError: String? = null
)

// ══════════════════════════════════════════════════════════════════
// ViewModel
// ══════════════════════════════════════════════════════════════════

@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutUiState())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var restTimerJob: Job? = null
    private var sessionStartTimestamp: Timestamp? = null

    companion object {
        private const val DEFAULT_REST_SECONDS = 90
    }

    // ── Initialization ────────────────────────────────────────────

    init {
        loadWorkoutHistory()
    }

    private fun loadWorkoutHistory() {
        viewModelScope.launch {
            workoutRepository.workoutsFlow(limit = 50).collect { workouts ->
                _uiState.value = _uiState.value.copy(
                    workoutHistory = workouts,
                    isLoading = false
                )
            }
        }
    }

    // ── Session lifecycle ─────────────────────────────────────────

    fun startSession() {
        val workoutCount = _uiState.value.workoutHistory.size
        sessionStartTimestamp = Timestamp.now()
        _uiState.value = _uiState.value.copy(
            isSessionActive = true,
            sessionName = "Workout #${workoutCount + 1}",
            elapsed = 0,
            exercises = emptyList(),
            restTimer = 0,
            isResting = false,
            saveError = null
        )
        startSessionTimer()
    }

    fun discardSession() {
        timerJob?.cancel()
        restTimerJob?.cancel()
        _uiState.value = _uiState.value.copy(
            isSessionActive = false,
            elapsed = 0,
            exercises = emptyList(),
            isResting = false,
            restTimer = 0
        )
    }

    fun finishSession() {
        val state = _uiState.value
        if (state.exercises.isEmpty()) {
            discardSession()
            return
        }

        timerJob?.cancel()
        restTimerJob?.cancel()

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            try {
                val workout = buildWorkoutFromSession(state)
                workoutRepository.saveWorkout(workout)
                _uiState.value = _uiState.value.copy(
                    isSessionActive = false,
                    isSaving = false,
                    elapsed = 0,
                    exercises = emptyList(),
                    isResting = false,
                    restTimer = 0
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    saveError = e.message ?: "Failed to save workout"
                )
            }
        }
    }

    fun updateSessionName(name: String) {
        _uiState.value = _uiState.value.copy(sessionName = name)
    }

    // ── Exercise operations ───────────────────────────────────────

    fun addExercise() {
        val defaultName = EXERCISE_DB.first()
        val newExercise = ExerciseState(
            name = defaultName,
            pr = getPR(defaultName)
        )
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises + newExercise
        )
    }

    fun removeExercise(exerciseId: String) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.filter { it.id != exerciseId }
        )
    }

    fun updateExerciseName(exerciseId: String, newName: String) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { ex ->
                if (ex.id == exerciseId) {
                    ex.copy(name = newName, pr = getPR(newName))
                } else ex
            }
        )
    }

    fun toggleCustomMode(exerciseId: String) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { ex ->
                if (ex.id == exerciseId) {
                    val nowCustom = !ex.isCustom
                    ex.copy(
                        isCustom = nowCustom,
                        name = if (nowCustom) "" else EXERCISE_DB.first(),
                        pr = if (nowCustom) 0.0 else getPR(EXERCISE_DB.first())
                    )
                } else ex
            }
        )
    }

    // ── Set operations ────────────────────────────────────────────

    fun addSet(exerciseId: String) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { ex ->
                if (ex.id == exerciseId) {
                    ex.copy(sets = ex.sets + SetState())
                } else ex
            }
        )
    }

    fun updateSet(exerciseId: String, setIndex: Int, field: String, value: String) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { ex ->
                if (ex.id == exerciseId) {
                    val newSets = ex.sets.toMutableList()
                    if (setIndex in newSets.indices) {
                        newSets[setIndex] = when (field) {
                            "weight" -> newSets[setIndex].copy(weight = value)
                            "reps" -> newSets[setIndex].copy(reps = value)
                            "rpe" -> newSets[setIndex].copy(rpe = value)
                            else -> newSets[setIndex]
                        }
                    }
                    ex.copy(sets = newSets)
                } else ex
            }
        )
    }

    fun toggleSetComplete(exerciseId: String, setIndex: Int) {
        _uiState.value = _uiState.value.copy(
            exercises = _uiState.value.exercises.map { ex ->
                if (ex.id == exerciseId) {
                    val newSets = ex.sets.toMutableList()
                    if (setIndex in newSets.indices) {
                        val isNowComplete = !newSets[setIndex].completed
                        newSets[setIndex] = newSets[setIndex].copy(completed = isNowComplete)

                        // Start rest timer when a set is completed
                        if (isNowComplete) {
                            startRestTimer()
                        }
                    }
                    ex.copy(sets = newSets)
                } else ex
            }
        )
    }

    // ── Rest timer ────────────────────────────────────────────────

    private fun startRestTimer() {
        restTimerJob?.cancel()
        _uiState.value = _uiState.value.copy(
            restTimer = DEFAULT_REST_SECONDS,
            isResting = true
        )
        restTimerJob = viewModelScope.launch {
            while (_uiState.value.restTimer > 0) {
                delay(1000)
                _uiState.value = _uiState.value.copy(
                    restTimer = _uiState.value.restTimer - 1
                )
            }
            _uiState.value = _uiState.value.copy(isResting = false)
        }
    }

    fun cancelRest() {
        restTimerJob?.cancel()
        _uiState.value = _uiState.value.copy(
            isResting = false,
            restTimer = 0
        )
    }

    fun addRestTime(seconds: Int) {
        _uiState.value = _uiState.value.copy(
            restTimer = _uiState.value.restTimer + seconds
        )
    }

    // ── Session timer ─────────────────────────────────────────────

    private fun startSessionTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.value = _uiState.value.copy(
                    elapsed = _uiState.value.elapsed + 1
                )
            }
        }
    }

    // ── Ghost sets & PR detection ─────────────────────────────────

    /**
     * Look up the ghost (previous) set for a given exercise name
     * and set index. Returns null if no historical data exists.
     */
    fun getGhostSet(exerciseName: String, setIndex: Int): ExerciseSet? {
        val history = _uiState.value.workoutHistory
        for (workout in history) {
            val matchingExercise = workout.exercises.firstOrNull { it.name == exerciseName }
            if (matchingExercise != null && setIndex < matchingExercise.sets.size) {
                return matchingExercise.sets[setIndex]
            }
        }
        return null
    }

    /**
     * Get the personal record (max weight ever lifted) for a given
     * exercise name across all workout history.
     */
    fun getPR(exerciseName: String): Double {
        var maxWeight = 0.0
        for (workout in _uiState.value.workoutHistory) {
            for (exercise in workout.exercises) {
                if (exercise.name == exerciseName) {
                    for (set in exercise.sets) {
                        if (set.weight > maxWeight) {
                            maxWeight = set.weight
                        }
                    }
                }
            }
        }
        return maxWeight
    }

    /**
     * Check if a specific set's weight exceeds the current PR
     * for that exercise (i.e. it would be a new PR).
     */
    fun isNewPR(exerciseName: String, weight: String): Boolean {
        val w = weight.toDoubleOrNull() ?: return false
        val currentPR = getPR(exerciseName)
        return currentPR > 0.0 && w > currentPR
    }

    // ── Delete from history ───────────────────────────────────────

    fun deleteWorkout(workoutId: String) {
        viewModelScope.launch {
            try {
                workoutRepository.deleteWorkout(workoutId)
            } catch (_: Exception) {
                // Firestore snapshot listener will remove it from the list
            }
        }
    }

    // ── Private helpers ───────────────────────────────────────────

    /**
     * Converts the in-memory session state into a [Workout] data
     * model ready for Firestore persistence.
     */
    private fun buildWorkoutFromSession(state: WorkoutUiState): Workout {
        val exercises = state.exercises.map { ex ->
            WorkoutExercise(
                name = ex.name,
                muscleGroup = "",
                isCustom = ex.isCustom,
                sets = ex.sets.map { set ->
                    ExerciseSet(
                        weight = set.weight.toDoubleOrNull() ?: 0.0,
                        reps = set.reps.toIntOrNull() ?: 0,
                        rpe = set.rpe.toIntOrNull(),
                        completed = set.completed
                    )
                }
            )
        }

        // Rough calorie estimate: ~5 cal per completed set
        val completedSets = exercises.sumOf { ex -> ex.sets.count { it.completed } }
        val estimatedCalories = completedSets * 5

        // XP: 10 per exercise + 5 per completed set
        val xp = (exercises.size * 10) + (completedSets * 5)

        return Workout(
            name = state.sessionName,
            type = "strength",
            exercises = exercises,
            duration = state.elapsed.toLong(),
            caloriesBurned = estimatedCalories,
            xpEarned = xp,
            date = DateFormatters.today(),
            startedAt = sessionStartTimestamp
        )
    }

    /**
     * Epley formula: 1RM = weight * (1 + reps/30).
     * Used when saving a finished workout for stat tracking.
     */
    fun calculate1RM(weight: Double, reps: Int): Int {
        if (weight <= 0 || reps <= 0 || reps > 30) return 0
        return Math.round(weight * (1.0 + reps.toDouble() / 30.0)).toInt()
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        restTimerJob?.cancel()
    }
}
