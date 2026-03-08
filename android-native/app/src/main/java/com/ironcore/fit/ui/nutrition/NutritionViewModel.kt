package com.ironcore.fit.ui.nutrition

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ironcore.fit.data.repository.NutritionRepository
import com.ironcore.fit.data.repository.UserRepository
import com.ironcore.fit.data.model.Meal as NutritionMeal
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

/**
 * ViewModel for the Nutrition Command screen.
 *
 * Combines today's meals from NutritionRepository with user profile
 * goals from UserRepository. Exposes a single [NutritionUiState] flow
 * consumed by NutritionScreen.
 */
@HiltViewModel
class NutritionViewModel @Inject constructor(
    private val nutritionRepository: NutritionRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NutritionUiState())
    val uiState: StateFlow<NutritionUiState> = _uiState.asStateFlow()

    private val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())

    init {
        observeTodayMeals()
    }

    private fun observeTodayMeals() {
        viewModelScope.launch {
            nutritionRepository.todayMealsFlow().collect { meals ->
                val totalCals = meals.sumOf { it.calories }
                val totalProtein = meals.sumOf { it.protein }
                val totalCarbs = meals.sumOf { it.carbs }
                val totalFat = meals.sumOf { it.fat }

                val uiMeals = meals.map { meal ->
                    MealUiItem(
                        id = meal.id,
                        name = meal.name,
                        emoji = guessMealEmoji(meal.name),
                        calories = meal.calories,
                        protein = meal.protein.toInt(),
                        carbs = meal.carbs.toInt(),
                        fat = meal.fat.toInt(),
                        time = meal.time?.toDate()?.let { timeFormat.format(it) } ?: ""
                    )
                }

                _uiState.update { current ->
                    current.copy(
                        todaysMeals = uiMeals,
                        totalCals = totalCals,
                        totalProtein = totalProtein,
                        totalCarbs = totalCarbs,
                        totalFat = totalFat
                    )
                }
            }
        }
    }

    // ── Public actions ───────────────────────────────────────────

    fun addMeal(name: String, cals: Int, protein: Double, carbs: Double, fat: Double) {
        viewModelScope.launch {
            val meal = NutritionMeal(
                name = name,
                calories = cals,
                protein = protein,
                carbs = carbs,
                fat = fat
            )
            nutritionRepository.addMeal(meal)
        }
    }

    fun addWater() {
        _uiState.update { it.copy(waterGlasses = it.waterGlasses + 1) }
    }

    fun removeWater() {
        _uiState.update { it.copy(waterGlasses = (it.waterGlasses - 1).coerceAtLeast(0)) }
    }

    fun deleteMeal(mealId: String) {
        viewModelScope.launch {
            nutritionRepository.deleteMeal(mealId)
        }
    }

    // ── Helpers ──────────────────────────────────────────────────

    /** Simple keyword-based emoji for common meal types. */
    private fun guessMealEmoji(name: String): String {
        val lower = name.lowercase()
        return when {
            lower.contains("chicken") -> "\uD83C\uDF57"  // poultry leg
            lower.contains("egg") -> "\uD83C\uDF73"      // cooking
            lower.contains("salad") || lower.contains("veg") -> "\uD83E\uDD57" // green salad
            lower.contains("rice") -> "\uD83C\uDF5A"     // rice
            lower.contains("protein") || lower.contains("shake") -> "\uD83E\uDD64" // cup with straw
            lower.contains("oat") || lower.contains("cereal") -> "\uD83C\uDF5C" // bowl
            lower.contains("fish") || lower.contains("salmon") || lower.contains("tuna") -> "\uD83C\uDF63" // sushi
            lower.contains("steak") || lower.contains("beef") -> "\uD83E\uDD69" // steak
            lower.contains("fruit") || lower.contains("apple") || lower.contains("banana") -> "\uD83C\uDF4E" // apple
            lower.contains("bread") || lower.contains("toast") || lower.contains("sandwich") -> "\uD83C\uDF5E" // bread
            lower.contains("pasta") || lower.contains("noodle") -> "\uD83C\uDF5D" // spaghetti
            lower.contains("pizza") -> "\uD83C\uDF55"    // pizza
            lower.contains("coffee") -> "\u2615"          // coffee
            lower.contains("milk") || lower.contains("dairy") -> "\uD83E\uDD5B" // glass of milk
            lower.contains("snack") || lower.contains("bar") -> "\uD83C\uDF6B" // chocolate bar
            else -> "\uD83C\uDF7D\uFE0F"                 // plate with cutlery
        }
    }
}

/** Immutable UI state exposed to NutritionScreen. */
data class NutritionUiState(
    val todaysMeals: List<MealUiItem> = emptyList(),
    val totalCals: Int = 0,
    val totalProtein: Double = 0.0,
    val totalCarbs: Double = 0.0,
    val totalFat: Double = 0.0,
    val totalBurned: Int = 0,
    val waterGlasses: Int = 0,
    // Goals — defaults, overridden by user profile when available
    val calorieGoal: Int = 2200,
    val proteinGoal: Double = 150.0,
    val carbsGoal: Double = 250.0,
    val fatGoal: Double = 70.0,
    val burnGoal: Int = 500
)
