package com.ironcore.fit.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
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
import javax.inject.Inject
import kotlin.math.roundToInt

// ══════════════════════════════════════════════════════════════════
// Cardio Activities — matches React CardioView.jsx
// ══════════════════════════════════════════════════════════════════

enum class CardioActivity(
    val label: String,
    val emoji: String,
    val description: String
) {
    TREADMILL("Treadmill", "\uD83C\uDFC3", "VO2-based calculation"),
    WALKING("Walking", "\uD83D\uDEB6", "MET-based calculation"),
    CYCLING("Cycling", "\uD83D\uDEB4", "MET-based calculation")
}

enum class WalkingIntensity(val label: String, val met: Double) {
    LOW("Casual (3 mph)", 3.0),
    MODERATE("Brisk (4 mph)", 4.5),
    AGGRESSIVE("Power Walk (4.5+ mph)", 6.0)
}

enum class CyclingIntensity(val label: String, val met: Double) {
    CASUAL("Casual (<10 mph)", 4.0),
    MODERATE("Moderate (12-14 mph)", 6.8),
    HIGH("Vigorous (14-16 mph)", 10.0),
    EXTREME("Racing (>20 mph)", 12.0)
}

// ══════════════════════════════════════════════════════════════════
// UI State
// ══════════════════════════════════════════════════════════════════

data class CardioUiState(
    // Activity selection
    val selectedActivity: CardioActivity? = null,

    // Session state
    val isSessionActive: Boolean = false,
    val elapsed: Int = 0,  // seconds

    // Treadmill inputs
    val treadmillSpeed: String = "6.0",     // mph
    val treadmillIncline: String = "0",     // %
    val treadmillDuration: String = "30",   // minutes

    // Walking inputs
    val walkingDuration: String = "30",     // minutes
    val walkingIntensity: WalkingIntensity = WalkingIntensity.MODERATE,

    // Cycling inputs
    val cyclingDuration: String = "30",     // minutes
    val cyclingIntensity: CyclingIntensity = CyclingIntensity.MODERATE,

    // User biometrics (kg)
    val bodyWeight: String = "70",

    // Result
    val caloriesResult: Int? = null,
    val isCalculating: Boolean = false,

    // Save
    val isSaving: Boolean = false,
    val saveError: String? = null,

    // History
    val cardioHistory: List<Workout> = emptyList(),
    val isLoading: Boolean = true
)

// ══════════════════════════════════════════════════════════════════
// ViewModel
// ══════════════════════════════════════════════════════════════════

@HiltViewModel
class CardioViewModel @Inject constructor(
    private val workoutRepository: WorkoutRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CardioUiState())
    val uiState: StateFlow<CardioUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null
    private var sessionStartTimestamp: Timestamp? = null

    init {
        loadCardioHistory()
    }

    private fun loadCardioHistory() {
        viewModelScope.launch {
            workoutRepository.workoutsFlow(limit = 30).collect { workouts ->
                _uiState.value = _uiState.value.copy(
                    cardioHistory = workouts.filter { it.type == "cardio" },
                    isLoading = false
                )
            }
        }
    }

    // ── Activity selection ───────────────────────────────────────

    fun selectActivity(activity: CardioActivity) {
        _uiState.value = _uiState.value.copy(
            selectedActivity = activity,
            caloriesResult = null
        )
    }

    fun clearActivity() {
        _uiState.value = _uiState.value.copy(
            selectedActivity = null,
            caloriesResult = null,
            isSessionActive = false
        )
        timerJob?.cancel()
    }

    // ── Input updates ───────────────────────────────────────────

    fun updateBodyWeight(value: String) {
        _uiState.value = _uiState.value.copy(bodyWeight = value)
    }

    fun updateTreadmillSpeed(value: String) {
        _uiState.value = _uiState.value.copy(treadmillSpeed = value)
    }

    fun updateTreadmillIncline(value: String) {
        _uiState.value = _uiState.value.copy(treadmillIncline = value)
    }

    fun updateTreadmillDuration(value: String) {
        _uiState.value = _uiState.value.copy(treadmillDuration = value)
    }

    fun updateWalkingDuration(value: String) {
        _uiState.value = _uiState.value.copy(walkingDuration = value)
    }

    fun updateWalkingIntensity(intensity: WalkingIntensity) {
        _uiState.value = _uiState.value.copy(walkingIntensity = intensity)
    }

    fun updateCyclingDuration(value: String) {
        _uiState.value = _uiState.value.copy(cyclingDuration = value)
    }

    fun updateCyclingIntensity(intensity: CyclingIntensity) {
        _uiState.value = _uiState.value.copy(cyclingIntensity = intensity)
    }

    // ── Calculation ─────────────────────────────────────────────

    fun calculateCalories() {
        val state = _uiState.value
        val weightKg = state.bodyWeight.toDoubleOrNull() ?: return

        _uiState.value = state.copy(isCalculating = true)

        val calories = when (state.selectedActivity) {
            CardioActivity.TREADMILL -> calculateTreadmillCalories(
                speedMph = state.treadmillSpeed.toDoubleOrNull() ?: 6.0,
                inclinePercent = state.treadmillIncline.toDoubleOrNull() ?: 0.0,
                durationMin = state.treadmillDuration.toDoubleOrNull() ?: 30.0,
                weightKg = weightKg
            )
            CardioActivity.WALKING -> calculateMETCalories(
                met = state.walkingIntensity.met,
                durationMin = state.walkingDuration.toDoubleOrNull() ?: 30.0,
                weightKg = weightKg
            )
            CardioActivity.CYCLING -> calculateMETCalories(
                met = state.cyclingIntensity.met,
                durationMin = state.cyclingDuration.toDoubleOrNull() ?: 30.0,
                weightKg = weightKg
            )
            null -> 0
        }

        _uiState.value = _uiState.value.copy(
            caloriesResult = calories,
            isCalculating = false
        )
    }

    // ── Session management ──────────────────────────────────────

    fun startSession() {
        sessionStartTimestamp = Timestamp.now()
        _uiState.value = _uiState.value.copy(
            isSessionActive = true,
            elapsed = 0
        )
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

    fun stopSession() {
        timerJob?.cancel()
        calculateCalories()
        _uiState.value = _uiState.value.copy(isSessionActive = false)
    }

    fun saveCardioWorkout() {
        val state = _uiState.value
        val activity = state.selectedActivity ?: return
        val calories = state.caloriesResult ?: return

        viewModelScope.launch {
            _uiState.value = state.copy(isSaving = true)
            try {
                val durationSec = if (state.elapsed > 0) {
                    state.elapsed.toLong()
                } else {
                    val durationMin = when (activity) {
                        CardioActivity.TREADMILL -> state.treadmillDuration.toLongOrNull() ?: 30
                        CardioActivity.WALKING -> state.walkingDuration.toLongOrNull() ?: 30
                        CardioActivity.CYCLING -> state.cyclingDuration.toLongOrNull() ?: 30
                    }
                    durationMin * 60
                }

                val workout = Workout(
                    name = "${activity.label} Session",
                    type = "cardio",
                    exercises = listOf(
                        WorkoutExercise(
                            name = activity.label,
                            muscleGroup = "cardio",
                            isCustom = false,
                            sets = emptyList()
                        )
                    ),
                    duration = durationSec,
                    caloriesBurned = calories,
                    xpEarned = (calories / 10).coerceAtLeast(5),
                    date = DateFormatters.today(),
                    startedAt = sessionStartTimestamp
                )
                workoutRepository.saveWorkout(workout)
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    selectedActivity = null,
                    caloriesResult = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    saveError = e.message ?: "Failed to save cardio workout"
                )
            }
        }
    }

    // ── Calorie formulas (matches React CardioView.jsx) ─────────

    /**
     * Treadmill VO2-based:
     * VO2 = 3.5 + (speed × 26.8 × 0.2) + (speed × 26.8 × 0.9 × incline/100)
     * speed in m/min = mph × 26.8
     * kcal/min = VO2 × weightKg / 200
     */
    private fun calculateTreadmillCalories(
        speedMph: Double,
        inclinePercent: Double,
        durationMin: Double,
        weightKg: Double
    ): Int {
        val speedMetersPerMin = speedMph * 26.8
        val vo2 = 3.5 + (speedMetersPerMin * 0.2) + (speedMetersPerMin * 0.9 * inclinePercent / 100.0)
        val kcalPerMin = vo2 * weightKg / 200.0
        return (kcalPerMin * durationMin).roundToInt()
    }

    /**
     * MET-based: calories = MET × weightKg × durationHours
     */
    private fun calculateMETCalories(
        met: Double,
        durationMin: Double,
        weightKg: Double
    ): Int {
        val durationHours = durationMin / 60.0
        return (met * weightKg * durationHours).roundToInt()
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
