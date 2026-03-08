package com.ironcore.fit.ui.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.ProgressEntry
import com.ironcore.fit.data.model.Workout
import com.ironcore.fit.data.repository.FitnessRepository
import com.ironcore.fit.data.repository.UserRepository
import com.ironcore.fit.data.repository.WorkoutRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ── UI State ─────────────────────────────────────────────────────

data class WeightPoint(val date: String, val weight: Double)

data class PersonalRecord(
    val exercise: String,
    val weight: Double,
    val reps: Int,
    val date: String,
    val isNew: Boolean = false
)

data class MuscleHeat(val name: String, val tier: Int) // tier 0-5

data class WeeklySummary(
    val thisWeekVolume: Long = 0,
    val lastWeekVolume: Long = 0,
    val thisWeekWorkouts: Int = 0,
    val lastWeekWorkouts: Int = 0,
    val thisWeekCalories: Int = 0,
    val lastWeekCalories: Int = 0
)

data class PredictiveStats(
    val recoveryScore: Int = 100,
    val injuryRisk: Int = 10,
    val volumeTrendPercent: Int = 0,
    val projectedWeeklyVolume: Long = 0
)

data class ProgressUiState(
    val weightEntries: List<WeightPoint> = emptyList(),
    val currentWeight: Double? = null,
    val muscleIntensity: Map<String, Int> = emptyMap(),
    val workoutDates: Set<String> = emptySet(),
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val weeklySummary: WeeklySummary = WeeklySummary(),
    val personalRecords: List<PersonalRecord> = emptyList(),
    val predictive: PredictiveStats = PredictiveStats(),
    val isLoading: Boolean = true
)

// ── ViewModel ────────────────────────────────────────────────────

@HiltViewModel
class ProgressViewModel @Inject constructor(
    private val workoutRepo: WorkoutRepository,
    private val fitnessRepo: FitnessRepository,
    private val userRepo: UserRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProgressUiState())
    val uiState: StateFlow<ProgressUiState> = _uiState.asStateFlow()

    private val uid get() = auth.currentUser?.uid ?: ""

    init {
        loadData()
    }

    private fun loadData() {
        if (uid.isEmpty()) return

        // Collect workouts
        viewModelScope.launch {
            workoutRepo.workoutsFlow(limit = 100).collect { workouts ->
                updateWithWorkouts(workouts)
            }
        }

        // Collect weight/progress entries
        viewModelScope.launch {
            fitnessRepo.progressFlow(uid).collect { entries ->
                updateWithProgressEntries(entries)
            }
        }

        // Collect profile for streak data
        viewModelScope.launch {
            userRepo.profileFlow(uid).collect { profile ->
                if (profile != null) {
                    _uiState.update {
                        it.copy(
                            currentStreak = profile.currentStreak,
                            longestStreak = profile.longestStreak
                        )
                    }
                }
            }
        }

        // Load workout dates for streak calendar
        viewModelScope.launch {
            try {
                val dates = workoutRepo.getWorkoutDates()
                _uiState.update { it.copy(workoutDates = dates.toSet()) }
            } catch (_: Exception) { }
        }
    }

    private fun updateWithWorkouts(workouts: List<Workout>) {
        val today = LocalDate.now()
        val fmt = DateTimeFormatter.ISO_LOCAL_DATE

        // ── Muscle Intensity (last 14 days) ────────────────────
        val twoWeeksAgo = today.minusDays(14)
        val recentWorkouts = workouts.filter { w ->
            try {
                val d = LocalDate.parse(w.date, fmt)
                !d.isBefore(twoWeeksAgo)
            } catch (_: Exception) { false }
        }

        val muscleScores = mutableMapOf<String, Int>()
        recentWorkouts.forEach { workout ->
            workout.exercises.forEach { exercise ->
                val group = normalizeMuscleGroup(exercise.muscleGroup)
                val hardSets = exercise.sets.count { it.completed }
                val avgRpe = exercise.sets.mapNotNull { it.rpe }.average()
                    .takeIf { !it.isNaN() } ?: 7.0
                val score = (hardSets * (avgRpe / 10.0)).toInt().coerceAtLeast(1)
                muscleScores[group] = (muscleScores[group] ?: 0) + score
            }
        }

        // Convert raw scores to tiers 0-5
        val maxScore = muscleScores.values.maxOrNull() ?: 1
        val muscleIntensity = muscleScores.mapValues { (_, score) ->
            when {
                score == 0 -> 0
                score < maxScore * 0.15 -> 1
                score < maxScore * 0.35 -> 2
                score < maxScore * 0.55 -> 3
                score < maxScore * 0.80 -> 4
                else -> 5
            }
        }

        // ── Weekly Summary ─────────────────────────────────────
        val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1) // Monday
        val startOfLastWeek = startOfWeek.minusDays(7)

        val thisWeekWorkouts = workouts.filter { w ->
            try {
                val d = LocalDate.parse(w.date, fmt)
                !d.isBefore(startOfWeek) && !d.isAfter(today)
            } catch (_: Exception) { false }
        }
        val lastWeekWorkouts = workouts.filter { w ->
            try {
                val d = LocalDate.parse(w.date, fmt)
                !d.isBefore(startOfLastWeek) && d.isBefore(startOfWeek)
            } catch (_: Exception) { false }
        }

        val thisWeekVolume = thisWeekWorkouts.sumOf { calcVolume(it) }
        val lastWeekVolume = lastWeekWorkouts.sumOf { calcVolume(it) }
        val thisWeekCals = thisWeekWorkouts.sumOf { it.caloriesBurned }
        val lastWeekCals = lastWeekWorkouts.sumOf { it.caloriesBurned }

        val weeklySummary = WeeklySummary(
            thisWeekVolume = thisWeekVolume,
            lastWeekVolume = lastWeekVolume,
            thisWeekWorkouts = thisWeekWorkouts.size,
            lastWeekWorkouts = lastWeekWorkouts.size,
            thisWeekCalories = thisWeekCals,
            lastWeekCalories = lastWeekCals
        )

        // ── Personal Records ───────────────────────────────────
        val prMap = mutableMapOf<String, PersonalRecord>()
        workouts.forEach { workout ->
            workout.exercises.forEach { exercise ->
                exercise.sets.filter { it.completed }.forEach { set ->
                    val key = exercise.name.lowercase()
                    val existing = prMap[key]
                    if (existing == null || set.weight > existing.weight) {
                        prMap[key] = PersonalRecord(
                            exercise = exercise.name,
                            weight = set.weight,
                            reps = set.reps,
                            date = workout.date,
                            isNew = false
                        )
                    }
                }
            }
        }
        // Mark PRs from the last 7 days as "new"
        val weekAgo = today.minusDays(7)
        val prs = prMap.values
            .map { pr ->
                try {
                    val d = LocalDate.parse(pr.date, fmt)
                    pr.copy(isNew = !d.isBefore(weekAgo))
                } catch (_: Exception) { pr }
            }
            .sortedByDescending { it.weight }

        // ── Predictive Analytics ───────────────────────────────
        val lastWorkout = workouts.firstOrNull()
        val hoursSinceLastWorkout = if (lastWorkout?.completedAt != null) {
            val lastMs = lastWorkout.completedAt!!.toDate().time
            val nowMs = System.currentTimeMillis()
            ((nowMs - lastMs) / 3_600_000.0).coerceAtMost(72.0)
        } else 72.0

        val recoveryScore = ((hoursSinceLastWorkout / 48.0) * 100).toInt().coerceIn(0, 100)

        val workoutsLast7Days = workouts.count { w ->
            try {
                val d = LocalDate.parse(w.date, fmt)
                ChronoUnit.DAYS.between(d, today) <= 7
            } catch (_: Exception) { false }
        }

        val injuryRisk = when {
            workoutsLast7Days >= 6 -> 45
            workoutsLast7Days >= 5 -> 25
            workoutsLast7Days >= 3 -> 15
            else -> 10
        } + if (recoveryScore < 40) 15 else 0

        val volumeTrendPercent = if (lastWeekVolume > 0) {
            ((thisWeekVolume - lastWeekVolume) * 100 / lastWeekVolume).toInt()
        } else 0

        val predictive = PredictiveStats(
            recoveryScore = recoveryScore,
            injuryRisk = injuryRisk.coerceIn(0, 100),
            volumeTrendPercent = volumeTrendPercent,
            projectedWeeklyVolume = if (thisWeekWorkouts.isNotEmpty()) {
                val daysIntoWeek = today.dayOfWeek.value.toLong().coerceAtLeast(1)
                thisWeekVolume * 7 / daysIntoWeek
            } else lastWeekVolume
        )

        _uiState.update {
            it.copy(
                muscleIntensity = muscleIntensity,
                weeklySummary = weeklySummary,
                personalRecords = prs,
                predictive = predictive,
                isLoading = false
            )
        }
    }

    private fun updateWithProgressEntries(entries: List<ProgressEntry>) {
        val sorted = entries
            .filter { it.weight != null && it.date.isNotEmpty() }
            .sortedBy { it.date }

        val weightEntries = sorted.map { WeightPoint(it.date, it.weight!!) }
        val currentWeight = sorted.lastOrNull()?.weight

        _uiState.update {
            it.copy(
                weightEntries = weightEntries,
                currentWeight = currentWeight
            )
        }
    }

    private fun calcVolume(workout: Workout): Long {
        return workout.exercises.sumOf { exercise ->
            exercise.sets.filter { it.completed }.sumOf { set ->
                (set.weight * set.reps).toLong()
            }
        }
    }

    /**
     * Normalize muscle group names from workout data to our heatmap keys.
     * Handles variations like "Chest", "chest", "Back", "Shoulders", etc.
     */
    private fun normalizeMuscleGroup(group: String): String {
        return when (group.lowercase().trim()) {
            "chest", "pecs", "pectorals" -> "Chest"
            "back", "lats", "latissimus" -> "Back"
            "shoulders", "delts", "deltoids" -> "Shoulders"
            "biceps", "bis" -> "Biceps"
            "triceps", "tris" -> "Triceps"
            "forearms", "forearm", "grip" -> "Forearms"
            "quads", "quadriceps", "legs" -> "Quads"
            "hamstrings", "hams" -> "Hamstrings"
            "calves", "calf" -> "Calves"
            "glutes", "glute", "hips" -> "Glutes"
            "abs", "abdominals", "core" -> "Core"
            "traps", "trapezius" -> "Traps"
            "lower back", "lower_back", "erectors" -> "Lower Back"
            else -> group.replaceFirstChar { it.uppercase() }
        }
    }
}
