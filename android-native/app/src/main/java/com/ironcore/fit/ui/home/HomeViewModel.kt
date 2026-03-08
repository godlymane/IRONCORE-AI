package com.ironcore.fit.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.Meal
import com.ironcore.fit.data.remote.CloudFunctions
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

    // XP Level Progress
    val xpProgress: Float = 0f,         // 0..1 within current level
    val xpInLevel: Long = 0,
    val xpForNextLevel: Long = 100,

    // Iron Score
    val ironScore: Int = 0,             // 0..100
    val scoreDelta: Int = 0,            // weekly trend

    // Forge (streak-based)
    val currentForge: Int = 0,          // consecutive days
    val longestForge: Int = 0,
    val forgeShieldCount: Int = 0,

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

    // Daily Weigh-In (matches React DashboardView.jsx)
    val weighInValue: String = "",
    val weighInLoading: Boolean = false,
    val hasLoggedWeightToday: Boolean = false,
    val weighInDismissed: Boolean = false,

    // Quick Log with AI Vision (matches React DashboardView.jsx)
    val mealText: String = "",
    val aiStatus: String = "",
    val showManualEntry: Boolean = false,
    val manualMealName: String = "",
    val manualCals: String = "",
    val manualProtein: String = "",
    val manualCarbs: String = "",
    val manualFat: String = "",

    // Loading
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false
)

// ── ViewModel ───────────────────────────────────────────────────────
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val userRepository: UserRepository,
    private val nutritionRepository: NutritionRepository,
    private val cloudFunctions: CloudFunctions
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
                        val levelProgress = XpCalculator.getLevelProgress(profile.xp)
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
                            // XP progress
                            xpProgress = levelProgress.progress,
                            xpInLevel = levelProgress.currentXpInLevel,
                            xpForNextLevel = levelProgress.xpNeededForNext,
                            // Forge
                            currentForge = profile.currentStreak,
                            longestForge = profile.longestStreak,
                            forgeShieldCount = profile.streakShields,
                            isLoading = false
                        )
                        // Recalculate iron score with new profile data
                        recalculateIronScore()
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
        recalculateIronScore()
    }

    // ── Iron Score Computation ─────────────────────────────────────────
    // Matches DashboardView.jsx: 40% calorie adherence + 30% protein +
    // 20% streak consistency + 10% activity

    private fun recalculateIronScore() {
        val s = _uiState.value
        val calAdherence = if (s.dailyTarget > 0) {
            val ratio = s.netCalories.toFloat() / s.dailyTarget
            // 1.0 when exactly on target, drops off above/below
            (1f - (ratio - 1f).coerceIn(-1f, 1f).let { kotlin.math.abs(it) }).coerceIn(0f, 1f)
        } else 0f

        val proAdherence = if (s.dailyProteinTarget > 0) {
            (s.totalProtein.toFloat() / s.dailyProteinTarget).coerceIn(0f, 1f)
        } else 0f

        val streakFactor = (s.currentForge / 30f).coerceIn(0f, 1f)
        val activityFactor = (s.todaysBurned / 500f).coerceIn(0f, 1f)

        val raw = (calAdherence * 0.4f + proAdherence * 0.3f +
                streakFactor * 0.2f + activityFactor * 0.1f) * 100f

        _uiState.value = s.copy(ironScore = raw.toInt().coerceIn(0, 100))
    }

    // ── Pull-to-Refresh ─────────────────────────────────────────────

    fun refresh() {
        _uiState.value = _uiState.value.copy(isRefreshing = true)
        viewModelScope.launch {
            try {
                loadData()
            } finally {
                kotlinx.coroutines.delay(600) // Brief delay for visual feedback
                _uiState.value = _uiState.value.copy(isRefreshing = false)
            }
        }
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

    // ── Daily Weigh-In (matches React DashboardView.jsx) ──────────────

    fun onWeighInValueChanged(value: String) {
        _uiState.value = _uiState.value.copy(weighInValue = value)
    }

    fun dismissWeighIn() {
        _uiState.value = _uiState.value.copy(weighInDismissed = true)
    }

    fun logWeight() {
        val w = _uiState.value.weighInValue.toFloatOrNull() ?: return
        if (w < 20f || w > 500f) return
        val userId = auth.currentUser?.uid ?: return

        _uiState.value = _uiState.value.copy(weighInLoading = true)
        viewModelScope.launch {
            try {
                // Log weight entry to Firestore
                userRepository.updateProfile(userId, mapOf(
                    "lastWeight" to w,
                    "weightLog.$today" to w,
                    "lastWeightDate" to today
                ))
                // Award XP
                userRepository.awardXP(userId, 50, "weight_log")

                _uiState.value = _uiState.value.copy(
                    weighInValue = "",
                    weighInLoading = false,
                    hasLoggedWeightToday = true
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(weighInLoading = false)
            }
        }
    }

    // ── Quick Log with AI Vision ──────────────────────────────────────

    fun onMealTextChanged(value: String) {
        _uiState.value = _uiState.value.copy(mealText = value)
    }

    fun toggleManualEntry() {
        _uiState.value = _uiState.value.copy(
            showManualEntry = !_uiState.value.showManualEntry
        )
    }

    fun onManualFieldChanged(
        name: String? = null, cals: String? = null,
        protein: String? = null, carbs: String? = null, fat: String? = null
    ) {
        val s = _uiState.value
        _uiState.value = s.copy(
            manualMealName = name ?: s.manualMealName,
            manualCals = cals ?: s.manualCals,
            manualProtein = protein ?: s.manualProtein,
            manualCarbs = carbs ?: s.manualCarbs,
            manualFat = fat ?: s.manualFat
        )
    }

    fun submitManualMeal() {
        val s = _uiState.value
        if (s.manualMealName.isBlank()) return

        viewModelScope.launch {
            try {
                val meal = Meal(
                    name = s.manualMealName,
                    calories = s.manualCals.toIntOrNull() ?: 0,
                    protein = s.manualProtein.toDoubleOrNull() ?: 0.0,
                    carbs = s.manualCarbs.toDoubleOrNull() ?: 0.0,
                    fat = s.manualFat.toDoubleOrNull() ?: 0.0,
                    date = today,
                    time = Timestamp.now(),
                    aiAnalyzed = false
                )
                nutritionRepository.addMeal(meal)
                val userId = auth.currentUser?.uid
                if (userId != null) userRepository.awardXP(userId, XpCalculator.XP_MEAL, "meal_log")

                _uiState.value = _uiState.value.copy(
                    showManualEntry = false,
                    manualMealName = "", manualCals = "",
                    manualProtein = "", manualCarbs = "", manualFat = ""
                )
            } catch (_: Exception) { }
        }
    }

    /** AI-analyze text or image → log meal. Matches React spotMacros(). */
    fun spotMacros(imageBase64: String? = null) {
        val text = _uiState.value.mealText
        if (text.isBlank() && imageBase64 == null) return

        _uiState.value = _uiState.value.copy(
            quickLogLoading = true,
            aiStatus = if (imageBase64 != null) "Scanning..." else "Analyzing..."
        )

        viewModelScope.launch {
            try {
                val result = cloudFunctions.analyzeFood(
                    mealText = text.ifBlank { null },
                    imageBase64 = imageBase64
                )
                if (result.mealName.isNotBlank()) {
                    val meal = Meal(
                        name = result.mealName,
                        calories = result.calories,
                        protein = result.protein,
                        carbs = result.carbs,
                        fat = result.fat,
                        date = today,
                        time = Timestamp.now(),
                        aiAnalyzed = true
                    )
                    nutritionRepository.addMeal(meal)
                    val userId = auth.currentUser?.uid
                    if (userId != null) userRepository.awardXP(userId, XpCalculator.XP_MEAL, "ai_meal_log")

                    _uiState.value = _uiState.value.copy(
                        mealText = "", aiStatus = "", quickLogLoading = false
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        aiStatus = "", quickLogLoading = false, showManualEntry = true
                    )
                }
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    aiStatus = "", quickLogLoading = false, showManualEntry = true
                )
            }
        }
    }
}
