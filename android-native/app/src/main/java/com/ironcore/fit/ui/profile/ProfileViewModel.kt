package com.ironcore.fit.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.UserProfile
import com.ironcore.fit.data.repository.UserRepository
import com.ironcore.fit.util.XpCalculator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

data class ProfileUiState(
    val displayName: String = "",
    val email: String = "",
    val photoUrl: String = "",
    val xp: Long = 0,
    val level: Int = 1,
    val league: String = "Iron Novice",
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val isPremium: Boolean = false,
    val subscriptionPlan: String = "Free",
    val subscriptionExpiry: String = "",
    val dailyCalories: Int = 2000,
    val dailyProtein: Int = 150,
    val dailyCarbs: Int = 200,
    val dailyFats: Int = 60,
    val goal: String = "",
    val hasPin: Boolean = false,
    // Settings toggles
    val notificationsEnabled: Boolean = true,
    val hapticsEnabled: Boolean = true,
    val soundEnabled: Boolean = true,
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        val user = auth.currentUser ?: run {
            _uiState.value = ProfileUiState(isLoading = false)
            return
        }

        viewModelScope.launch {
            try {
                userRepository.profileFlow(user.uid).collect { profile ->
                    if (profile != null) {
                        val level = XpCalculator.calculateLevel(profile.xp)
                        val league = XpCalculator.getLeague(profile.xp)
                        val subPlan = when (profile.subscription?.planId) {
                            "premium.monthly" -> "Premium Monthly"
                            "premium.yearly" -> "Premium Yearly"
                            else -> "Free"
                        }

                        // Check if PIN exists
                        val pinExists = checkPinExists(user.uid)

                        _uiState.value = ProfileUiState(
                            displayName = user.displayName ?: "Recruit",
                            email = user.email ?: "",
                            photoUrl = profile.photoURL,
                            xp = profile.xp,
                            level = level,
                            league = league,
                            currentStreak = profile.currentStreak,
                            longestStreak = profile.longestStreak,
                            isPremium = profile.isPremium,
                            subscriptionPlan = subPlan,
                            subscriptionExpiry = profile.subscription?.expiryDate ?: "",
                            goal = profile.guildRole ?: "",
                            hasPin = pinExists,
                            isLoading = false
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Failed to load profile: ${e.localizedMessage}"
                )
            }
        }
    }

    private suspend fun checkPinExists(uid: String): Boolean {
        return try {
            val snapshot = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("data").document("profile")
                .get()
                .await()
            !snapshot.getString("pin").isNullOrBlank()
        } catch (_: Exception) {
            false
        }
    }

    fun updateDailyTargets(calories: Int, protein: Int, carbs: Int, fats: Int) {
        val uid = auth.currentUser?.uid ?: return
        _uiState.value = _uiState.value.copy(isSaving = true)

        viewModelScope.launch {
            try {
                userRepository.updateProfile(uid, mapOf(
                    "dailyCalories" to calories,
                    "dailyProtein" to protein,
                    "dailyCarbs" to carbs,
                    "dailyFats" to fats
                ))
                _uiState.value = _uiState.value.copy(
                    dailyCalories = calories,
                    dailyProtein = protein,
                    dailyCarbs = carbs,
                    dailyFats = fats,
                    isSaving = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    error = "Failed to save targets: ${e.localizedMessage}"
                )
            }
        }
    }

    fun toggleNotifications() {
        _uiState.value = _uiState.value.copy(
            notificationsEnabled = !_uiState.value.notificationsEnabled
        )
    }

    fun toggleHaptics() {
        _uiState.value = _uiState.value.copy(
            hapticsEnabled = !_uiState.value.hapticsEnabled
        )
    }

    fun toggleSound() {
        _uiState.value = _uiState.value.copy(
            soundEnabled = !_uiState.value.soundEnabled
        )
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun logout() {
        userRepository.logout()
    }
}
