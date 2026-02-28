package com.ironcore.fit.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ══════════════════════════════════════════════════════════════════
// Fitness goals — matching React app's onboarding goal options
// ══════════════════════════════════════════════════════════════════

enum class FitnessGoal(val label: String, val description: String, val icon: String) {
    BUILD_MUSCLE("Build Muscle", "Pack on size and strength", "muscle"),
    LOSE_FAT("Lose Fat", "Burn fat, get shredded", "fire"),
    GET_STRONGER("Get Stronger", "Push your limits every session", "bolt"),
    STAY_ACTIVE("Stay Active", "Move daily, feel great", "heart");

    /** Firestore-safe string value matching the React app's stored format. */
    val firestoreValue: String get() = label
}

// ══════════════════════════════════════════════════════════════════
// UI state
// ══════════════════════════════════════════════════════════════════

data class OnboardingUiState(
    val currentPage: Int = 0,
    val selectedGoal: FitnessGoal? = null,
    val isSavingGoal: Boolean = false,
    val isCompletingOnboarding: Boolean = false,
    val isComplete: Boolean = false,
    val error: String? = null
) {
    val totalPages: Int = 5
    val isLastPage: Boolean get() = currentPage == totalPages - 1
    val canProceed: Boolean get() = when (currentPage) {
        1 -> selectedGoal != null  // Goal page requires selection
        else -> true
    }
}

// ══════════════════════════════════════════════════════════════════
// ViewModel
// ══════════════════════════════════════════════════════════════════

/**
 * Manages the 5-screen onboarding flow state.
 *
 * Firestore writes:
 *   - users/{uid}/data/profile.goal         (page 2 selection)
 *   - users/{uid}/data/profile.onboardingComplete = true  (on finish)
 */
@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    // ── Page navigation ──────────────────────────────────────────

    fun nextPage() {
        _uiState.update { state ->
            if (state.currentPage < state.totalPages - 1) {
                state.copy(currentPage = state.currentPage + 1)
            } else {
                state
            }
        }
    }

    fun goToPage(page: Int) {
        _uiState.update { it.copy(currentPage = page.coerceIn(0, it.totalPages - 1)) }
    }

    // ── Goal selection ───────────────────────────────────────────

    fun selectGoal(goal: FitnessGoal) {
        _uiState.update { it.copy(selectedGoal = goal, error = null) }
    }

    /**
     * Persist the selected goal to Firestore.
     * Called when the user leaves the goal page or explicitly taps "Next".
     */
    fun saveGoal() {
        val goal = _uiState.value.selectedGoal ?: return
        val uid = auth.currentUser?.uid ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isSavingGoal = true, error = null) }
            try {
                userRepository.updateProfile(uid, mapOf("goal" to goal.firestoreValue))
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.localizedMessage) }
            } finally {
                _uiState.update { it.copy(isSavingGoal = false) }
            }
        }
    }

    // ── Complete onboarding ──────────────────────────────────────

    /**
     * Marks onboarding as complete in Firestore and signals the
     * navigation layer to transition to the main app.
     */
    fun completeOnboarding() {
        val uid = auth.currentUser?.uid ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isCompletingOnboarding = true, error = null) }
            try {
                // Save goal if user selected one but hasn't persisted yet
                _uiState.value.selectedGoal?.let { goal ->
                    userRepository.updateProfile(uid, mapOf("goal" to goal.firestoreValue))
                }
                // Mark onboarding complete
                userRepository.updateProfile(uid, mapOf("onboardingComplete" to true))
                _uiState.update { it.copy(isComplete = true) }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.localizedMessage) }
            } finally {
                _uiState.update { it.copy(isCompletingOnboarding = false) }
            }
        }
    }

    /**
     * Skip the premium upsell — still completes onboarding
     * but does not start a trial.
     */
    fun skipPremium() {
        completeOnboarding()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
