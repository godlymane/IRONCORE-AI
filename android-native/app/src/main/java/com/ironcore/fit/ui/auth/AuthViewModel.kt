package com.ironcore.fit.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.ironcore.fit.data.remote.CloudFunctions
import com.ironcore.fit.data.repository.UserRepository
import com.ironcore.fit.util.PlayerIdentity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Auth flow step — mirrors React PlayerCardView.jsx step states.
 *
 * LANDING   → "Create Account" / "Log In" buttons
 * USERNAME  → Username entry + availability check
 * PIN_SETUP → 6-digit PIN creation (via PinEntryScreen in SETUP mode)
 * CREATING  → Account being created (loading spinner)
 * REVEAL    → Recovery phrase + QR code + save confirmation
 * LOGIN     → Username + PIN login (existing account)
 * RECOVERY  → Recovery phrase entry
 */
enum class AuthStep {
    LANDING, USERNAME, PIN_SETUP, CREATING, REVEAL, LOGIN, RECOVERY
}

data class AuthUiState(
    val step: AuthStep = AuthStep.LANDING,
    val isLoading: Boolean = false,
    val error: String? = null,
    // Username flow
    val username: String = "",
    val usernameError: String? = null,
    val isUsernameAvailable: Boolean? = null,
    val isCheckingUsername: Boolean = false,
    // Account creation result
    val recoveryPhrase: String = "",
    val hasSavedPhrase: Boolean = false,
    // Login flow
    val loginUsername: String = "",
    val loginAttempts: Int = 0,
    // Recovery flow
    val recoveryInput: String = ""
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val cloudFunctions: CloudFunctions
) : ViewModel() {

    val currentUser: StateFlow<FirebaseUser?> = MutableStateFlow(userRepository.currentUser).also { flow ->
        viewModelScope.launch {
            userRepository.authStateFlow().collect { user ->
                (flow as MutableStateFlow).value = user
            }
        }
    }

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    // Debounce job for username availability checking
    private var usernameCheckJob: Job? = null

    // Stored PIN hash from the setup step (used during account creation)
    private var pendingPinHash: String? = null

    // ── Navigation ─────────────────────────────────────────────

    fun goToLanding() {
        _uiState.value = AuthUiState(step = AuthStep.LANDING)
        pendingPinHash = null
    }

    fun goToCreateAccount() {
        _uiState.value = AuthUiState(step = AuthStep.USERNAME)
    }

    fun goToLogin() {
        _uiState.value = AuthUiState(step = AuthStep.LOGIN)
    }

    fun goToRecovery() {
        _uiState.value = _uiState.value.copy(
            step = AuthStep.RECOVERY,
            error = null
        )
    }

    fun goToPinSetup() {
        _uiState.value = _uiState.value.copy(
            step = AuthStep.PIN_SETUP,
            error = null
        )
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    // ── Username step ──────────────────────────────────────────

    fun onUsernameChanged(raw: String) {
        val validation = PlayerIdentity.validateUsername(raw)
        val clean = validation.clean ?: raw.removePrefix("@").lowercase()

        _uiState.value = _uiState.value.copy(
            username = clean,
            usernameError = if (raw.isNotBlank()) validation.error else null,
            isUsernameAvailable = null,
            isCheckingUsername = validation.valid
        )

        usernameCheckJob?.cancel()
        if (validation.valid) {
            usernameCheckJob = viewModelScope.launch {
                delay(500) // Debounce 500ms — matches React
                try {
                    val available = userRepository.isUsernameAvailable(clean)
                    _uiState.value = _uiState.value.copy(
                        isUsernameAvailable = available,
                        isCheckingUsername = false,
                        usernameError = if (!available) "Username taken" else null
                    )
                } catch (e: Exception) {
                    _uiState.value = _uiState.value.copy(
                        isCheckingUsername = false,
                        usernameError = "Couldn't check availability"
                    )
                }
            }
        }
    }

    fun confirmUsername() {
        val state = _uiState.value
        if (state.isUsernameAvailable == true && state.usernameError == null) {
            goToPinSetup()
        }
    }

    // ── PIN setup → Account creation ───────────────────────────

    /**
     * Called when the user completes PIN setup in PinEntryScreen.
     * Receives the SHA-256 hash of their chosen PIN.
     */
    fun onPinSetComplete(pinHash: String) {
        pendingPinHash = pinHash
        createAccount()
    }

    /**
     * Full account creation flow — matches React handlePinSet():
     * 1. signInAnonymously()
     * 2. generatePhrase()
     * 3. hashPhrase()
     * 4. claimUsername in usernames collection
     * 5. Write profile to users/{uid}/data/profile
     * 6. Show CardRevealScreen
     */
    private fun createAccount() {
        val pinHash = pendingPinHash ?: return
        val username = _uiState.value.username

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                step = AuthStep.CREATING,
                isLoading = true,
                error = null
            )

            try {
                // 1. Anonymous sign-in to get a UID
                val user = userRepository.signInAnonymously()
                val uid = user.uid

                // 2. Generate 12-word recovery phrase
                val phrase = PlayerIdentity.generatePhrase()

                // 3. Hash the phrase for storage
                val phraseHash = PlayerIdentity.hashPhrase(phrase)

                // 4. Claim username in Firestore
                userRepository.claimUsername(username, uid)

                // 5. Write full profile
                userRepository.initializePinUser(
                    uid = uid,
                    username = username,
                    pinHash = pinHash,
                    phraseHash = phraseHash
                )

                // 6. Success → show recovery phrase reveal
                _uiState.value = _uiState.value.copy(
                    step = AuthStep.REVEAL,
                    isLoading = false,
                    recoveryPhrase = phrase
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    step = AuthStep.USERNAME,
                    isLoading = false,
                    error = e.localizedMessage ?: "Account creation failed"
                )
            }
        }
    }

    // ── Card reveal ────────────────────────────────────────────

    fun setPhraseSaved(saved: Boolean) {
        _uiState.value = _uiState.value.copy(hasSavedPhrase = saved)
    }

    /**
     * User confirmed they saved their recovery phrase.
     * Auth state listener will pick up the signed-in user
     * and AppNavigation will transition to MainApp.
     */
    fun completeOnboarding() {
        // The user is already signed in from createAccount().
        // Just clear the auth flow state — the auth state flow
        // will drive navigation to the main app.
        _uiState.value = AuthUiState()
    }

    // ── Login with PIN ─────────────────────────────────────────

    fun onLoginUsernameChanged(value: String) {
        _uiState.value = _uiState.value.copy(
            loginUsername = value.removePrefix("@").lowercase().trim(),
            error = null
        )
    }

    /**
     * PIN-based login: username + pinHash → Cloud Function → custom token → signIn.
     * Matches React LoginScreen.jsx loginWithPin flow.
     */
    fun loginWithPin(pinHash: String) {
        val username = _uiState.value.loginUsername
        if (username.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Enter your username")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                // Call Cloud Function: loginWithPin({username, pinHash})
                @Suppress("UNCHECKED_CAST")
                val result = cloudFunctions.loginWithPin(username, pinHash)
                val token = result["token"] as? String
                    ?: throw Exception("Invalid server response")

                // Sign in with the custom token
                userRepository.signInWithCustomToken(token)

                // Success — auth state listener will navigate to MainApp
                _uiState.value = _uiState.value.copy(isLoading = false)
            } catch (e: Exception) {
                val attempts = _uiState.value.loginAttempts + 1
                val errorMsg = mapFirebaseError(e)

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    loginAttempts = attempts,
                    error = errorMsg
                )
            }
        }
    }

    // ── Recovery ───────────────────────────────────────────────

    fun onRecoveryInputChanged(value: String) {
        _uiState.value = _uiState.value.copy(
            recoveryInput = value,
            error = null
        )
    }

    /**
     * Recovery phrase login: phrase → Cloud Function → custom token → signIn.
     * Matches React LoginScreen.jsx handleRecovery flow.
     */
    fun submitRecoveryPhrase() {
        val phrase = _uiState.value.recoveryInput.trim()
        if (phrase.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Enter your recovery phrase")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                @Suppress("UNCHECKED_CAST")
                val result = cloudFunctions.recoverAccount(phrase)
                val token = result["token"] as? String
                    ?: throw Exception("Invalid server response")

                userRepository.signInWithCustomToken(token)
                _uiState.value = _uiState.value.copy(isLoading = false)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = mapFirebaseError(e)
                )
            }
        }
    }

    // ── Logout ──────────────────────────────────────────────────

    fun logout() {
        userRepository.logout()
        _uiState.value = AuthUiState()
    }

    // ── Error mapping (matches React LoginScreen.jsx) ──────────

    private fun mapFirebaseError(e: Exception): String {
        val message = e.message ?: return "Something went wrong"

        return when {
            "resource-exhausted" in message || "RESOURCE_EXHAUSTED" in message ->
                "Too many attempts. Try again in a few minutes."
            "not-found" in message || "NOT_FOUND" in message ->
                "Account not found. Check your username."
            "invalid-argument" in message || "INVALID_ARGUMENT" in message ->
                "Wrong PIN. Please try again."
            "unavailable" in message || "UNAVAILABLE" in message ->
                "Server unavailable. Check your connection."
            "deadline-exceeded" in message || "DEADLINE_EXCEEDED" in message ->
                "Request timed out. Try again."
            "internal" in message || "INTERNAL" in message ->
                "Server error. Try again later."
            "unauthenticated" in message || "UNAUTHENTICATED" in message ->
                "Authentication failed."
            "permission-denied" in message || "PERMISSION_DENIED" in message ->
                "Access denied."
            else -> e.localizedMessage ?: "Something went wrong"
        }
    }
}
