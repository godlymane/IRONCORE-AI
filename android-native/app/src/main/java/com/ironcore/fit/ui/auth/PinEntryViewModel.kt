package com.ironcore.fit.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

/**
 * UI state for the PIN entry screen.
 *
 * @property storedPinHash  SHA-256 hex digest of the user's stored PIN, or null if no PIN has
 *                          been set yet (triggers setup mode).
 * @property hasPin         Convenience flag — true when [storedPinHash] is non-null and non-blank.
 * @property isLoading      True while the initial Firestore fetch is in flight.
 * @property error          User-facing error string, if something went wrong during load / save.
 */
data class PinUiState(
    val storedPinHash: String? = null,
    val hasPin: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null
)

/**
 * ViewModel backing [PinEntryScreen].
 *
 * Responsibilities:
 * 1. Load the current user's stored PIN hash from Firestore on init.
 * 2. Persist a newly-created PIN hash back to Firestore.
 *
 * The actual SHA-256 hashing and attempt-counting lives in the composable
 * itself (matching the React reference implementation), so this VM is
 * intentionally thin.
 */
@HiltViewModel
class PinEntryViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PinUiState())
    val uiState: StateFlow<PinUiState> = _uiState.asStateFlow()

    init {
        loadPinStatus()
    }

    // ── Load ──────────────────────────────────────────────────────

    /**
     * Fetch the user's profile from Firestore and extract the `pin` field.
     * The React app stores the PIN hash at `users/{uid}/data/profile.pin`.
     */
    private fun loadPinStatus() {
        val uid = auth.currentUser?.uid
        if (uid == null) {
            _uiState.value = PinUiState(isLoading = false)
            return
        }

        viewModelScope.launch {
            try {
                val profile = userRepository.getProfile(uid)
                // The UserProfile data class may not include a `pin` field yet.
                // We read it as a raw map value via the Firestore snapshot to stay
                // forward-compatible.  For now, `getProfile` returns a typed object,
                // so we do a separate lightweight read.
                val pinHash = readPinHashDirect(uid)

                _uiState.value = PinUiState(
                    storedPinHash = pinHash,
                    hasPin = !pinHash.isNullOrBlank(),
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = PinUiState(
                    isLoading = false,
                    error = "Failed to load PIN status: ${e.localizedMessage}"
                )
            }
        }
    }

    /**
     * Read the `pin` field directly from the Firestore profile document.
     * This avoids requiring the [UserProfile] data class to have a `pin` property.
     */
    private suspend fun readPinHashDirect(uid: String): String? {
        return try {
            val snapshot = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                .collection("users").document(uid)
                .collection("data").document("profile")
                .get()
                .await()
            snapshot.getString("pin")
        } catch (_: Exception) {
            null
        }
    }

    // ── Save ──────────────────────────────────────────────────────

    /**
     * Persist a newly-created PIN hash to the user's Firestore profile.
     *
     * @param uid     Firebase Auth UID.
     * @param pinHash SHA-256 hex digest produced by [PlayerIdentity.hashPin].
     */
    fun savePinHash(uid: String, pinHash: String) {
        viewModelScope.launch {
            try {
                userRepository.updateProfile(uid, mapOf("pin" to pinHash))
                _uiState.value = _uiState.value.copy(
                    storedPinHash = pinHash,
                    hasPin = true
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = "Failed to save PIN: ${e.localizedMessage}"
                )
            }
        }
    }

    /** Clear a transient error message. */
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

}
