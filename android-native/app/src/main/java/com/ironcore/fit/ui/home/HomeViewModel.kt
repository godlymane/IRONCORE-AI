package com.ironcore.fit.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val displayName: String = "",
    val xp: Long = 0,
    val level: Int = 1,
    val streak: Int = 0,
    val isPremium: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        val userId = auth.currentUser?.uid ?: return
        _uiState.value = _uiState.value.copy(
            displayName = auth.currentUser?.displayName ?: ""
        )

        viewModelScope.launch {
            userRepository.profileFlow(userId).collect { profile ->
                if (profile != null) {
                    _uiState.value = _uiState.value.copy(
                        xp = profile.xp,
                        level = profile.level,
                        streak = profile.currentStreak,
                        isPremium = profile.isPremium
                    )
                }
            }
        }
    }
}
