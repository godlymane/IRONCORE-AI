package com.ironcore.fit.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.Meal
import com.ironcore.fit.data.repository.NutritionRepository
import com.ironcore.fit.data.repository.UserRepository
import com.ironcore.fit.util.DateFormatters
import com.ironcore.fit.util.XpCalculator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

// ── Daily challenge definitions (rotated by day of month) ────────────
data class DailyChallenge(
    val title: String,
    val xpReward: Long,
    val emoji: String
)

private val DAILY_CHALLENGES = listOf(
    DailyChallenge("50 Pushups", 300, "\uD83D\uDCAA"),
    DailyChallenge("30 Min Run", 400, "\uD83C\uDFC3"),
    DailyChallenge("100 Air Squats", 350, "\uD83E\uDDB5"),
    DailyChallenge("No Sugar Today", 500, "\uD83D\uDEAB"),
    DailyChallenge("2min Plank", 250, "\uD83E\uDDD8"),
    DailyChallenge("200 Jumping Jacks", 300, "\u26A1"),
    DailyChallenge("Walk 10k Steps", 350, "\uD83D\uDEB6"),
    DailyChallenge("20 Burpees", 400, "\uD83D\uDD25"),
    DailyChallenge("Stretch 15 Min", 200, "\uD83E\uDDD8"),
    DailyChallenge("Drink 3L Water", 250, "\uD83D\uDCA7")
)

// ── Preset quick-log meals ──────────────────────────────────────────
data class QuickMealPreset(
    val name: String,
    val emoji: String,
    val calories: Int,
    val protein: Double,
    val carbs: Double,
    val fat: Double
)

val QUICK_MEAL_PRESETS = listOf(
    QuickMealPreset("Water", "\uD83D\uDCA7", 0, 0.0, 0.0, 0.0),
    QuickMealPreset("Protein Shake", "\u26A1", 130, 25.0, 5.0, 2.0),
    QuickMealPreset("2 Eggs", "\uD83E\uDD5A", 140, 12.0, 1.0, 10.0),
    QuickMealPreset("Chicken Breast", "\uD83C\uDF57", 280, 53.0, 0.0, 6.0)
)

// ── UI State ────────────────────────────────────────────────────────
data class HomeUiState(
    // User info
    val displayName: String = "",
    val photoUrl: String = "",
    val xp: Long = 0,
    val level: Int = 1,
    val streak: Int = 0,
    val isPremium: Boolean = false,
    val goal: String = "",

    // Nutrition targets
    val dailyTarget: Int = 2000,
    val dailyProteinTarget: Int = 150,

    // Today's computed values
    val todaysMeals: List<Meal> = emptyList(),
    val todaysBurned: Int = 0,
    val netCalories: Int = 0,
    val totalProtein: Double = 0.0,
    val totalCarbs: Double = 0.0,
    val totalFat: Double = 0.0,
    val calorieProgress: Float = 0f,   // 0..1
    val proteinProgress: Float = 0f,   // 0..1
    val caloriesLeft: Int = 2000,

    // Daily drop
    val dailyDrop: DailyChallenge = DAILY_CHALLENGES[0],
    val dropCompleted: Boolean = false,
    val dropClaiming: Boolean = false,

    // Quick log
    val quickLogLoading: Boolean = false,

    // Loading
    val isLoading: Boolean = true
)

// ── ViewModel ───────────────────────────────────────────────────────
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val userRepository: UserRepository,
    private val nutritionRepository: NutritionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val today: String = DateFormatters.today()
    private val dayOfMonth: Int = LocalDate.now().dayOfMonth

    init {
        loadData()
    }

    // ── Data Loading ────────────────────────────────────────────────

    private fun loadData() {
        val userId = auth.currentUser?.uid ?: return

        // Set initial display name from Firebase Auth
        _uiState.value = _uiState.value.copy(
            displayName = auth.currentUser?.displayName ?: "",
            photoUrl = auth.currentUser?.photoUrl?.toString() ?: "",
            dailyDrop = DAILY_CHALLENGES[dayOfMonth % DAILY_CHALLENGES.size]
        )

        // Observe profile
        viewModelScope.launch {
            userRepository.profileFlow(userId)
                .catch { /* silently handle Firestore errors */ }
                .collect { profile ->
                    if (profile != null) {
                        val level = XpCalculator.calculateLevel(profile.xp)
                        val dropDone = profile.dailyDrops[today] == true

                        _uiState.value = _uiState.value.copy(
                            displayName = auth.currentUser?.displayName
                                ?: profile.userId.take(8),
                            photoUrl = profile.photoURL,
                            xp = profile.xp,
                            level = level,
                            streak = profile.currentStreak,
                            isPremium = profile.isPremium,
                            dropCompleted = dropDone,
                            isLoading = false
                        )
                    }
                }
        }

        // Observe today's meals
        viewModelScope.launch {
            nutritionRepository.todayMealsFlow()
                .catch { /* silently handle errors */ }
                .collect { meals ->
                    recalculateMacros(meals)
                }
        }
    }

    private fun recalculateMacros(meals: List<Meal>) {
        val state = _uiState.value
        val target = state.dailyTarget
        val proteinTarget = state.dailyProteinTarget

        val totalCals = meals.sumOf { it.calories }
        val totalProtein = meals.sumOf { it.protein }
        val totalCarbs = meals.sumOf { it.carbs }
        val totalFat = meals.sumOf { it.fat }

        val net = (totalCals - state.todaysBurned).coerceAtLeast(0)
        val calProgress = if (target > 0) (net.toFloat() / target).coerceIn(0f, 1f) else 0f
        val proProgress = if (proteinTarget > 0) (totalProtein.toFloat() / proteinTarget).coerceIn(0f, 1f) else 0f
        val left = (target - net).coerceAtLeast(0)

        _uiState.value = state.copy(
            todaysMeals = meals,
            netCalories = net,
            totalProtein = totalProtein,
            totalCarbs = totalCarbs,
            totalFat = totalFat,
            calorieProgress = calProgress,
            proteinProgress = proProgress,
            caloriesLeft = left,
            isLoading = false
        )
    }

    // ── Quick Meal Logging ──────────────────────────────────────────

    fun logQuickMeal(preset: QuickMealPreset) {
        val userId = auth.currentUser?.uid ?: return
        _uiState.value = _uiState.value.copy(quickLogLoading = true)

        viewModelScope.launch {
            try {
                val meal = Meal(
                    name = preset.name,
                    calories = preset.calories,
                    protein = preset.protein,
                    carbs = preset.carbs,
                    fat = preset.fat,
                    date = today,
                    time = Timestamp.now(),
                    aiAnalyzed = false
                )
                nutritionRepository.addMeal(meal)

                // Award XP for logging a meal
                userRepository.awardXP(userId, XpCalculator.XP_MEAL, "meal_log")
            } catch (_: Exception) {
                // Meal flow will auto-update UI; errors are transient
            } finally {
                _uiState.value = _uiState.value.copy(quickLogLoading = false)
            }
        }
    }

    // ── Daily Drop ──────────────────────────────────────────────────

    fun completeDailyDrop() {
        val userId = auth.currentUser?.uid ?: return
        val state = _uiState.value
        if (state.dropCompleted || state.dropClaiming) return

        _uiState.value = state.copy(dropClaiming = true)

        viewModelScope.launch {
            try {
                // Mark drop as completed for today
                userRepository.updateProfile(userId, mapOf(
                    "dailyDrops.$today" to true
                ))

                // Award XP
                userRepository.awardXP(userId, state.dailyDrop.xpReward, "daily_drop")

                _uiState.value = _uiState.value.copy(
                    dropCompleted = true,
                    dropClaiming = false
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(dropClaiming = false)
            }
        }
    }
}
