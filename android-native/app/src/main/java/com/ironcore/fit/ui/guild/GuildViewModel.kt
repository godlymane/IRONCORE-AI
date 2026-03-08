package com.ironcore.fit.ui.guild

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.ChatMessage
import com.ironcore.fit.data.model.Guild
import com.ironcore.fit.data.model.UserProfile
import com.ironcore.fit.data.repository.SocialRepository
import com.ironcore.fit.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── UI State ─────────────────────────────────────────────────────────

data class GuildUiState(
    val hasGuild: Boolean = false,
    val guild: Guild? = null,
    val guildChat: List<ChatMessage> = emptyList(),
    val memberProfiles: List<GuildMemberInfo> = emptyList(),
    val currentUserId: String = "",
    val currentUsername: String = "",
    val currentUserPhoto: String = "",
    val isLoading: Boolean = true,
    val isJoining: Boolean = false,
    val error: String? = null,
    // Community Boss (from Firestore global/data/boss)
    val bossName: String = "Iron Titan",
    val bossCurrentHP: Long = 45_000,
    val bossTotalHP: Long = 100_000,
    val bossActive: Boolean = true
)

data class GuildMemberInfo(
    val userId: String,
    val username: String,
    val xp: Long,
    val role: String, // "owner" | "member"
    val photoURL: String = ""
)

// ── ViewModel ────────────────────────────────────────────────────────

@HiltViewModel
class GuildViewModel @Inject constructor(
    private val socialRepo: SocialRepository,
    private val userRepo: UserRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _uiState = MutableStateFlow(GuildUiState())
    val uiState: StateFlow<GuildUiState> = _uiState.asStateFlow()

    init {
        val uid = auth.currentUser?.uid ?: ""
        _uiState.update { it.copy(currentUserId = uid) }

        if (uid.isNotEmpty()) {
            // Watch user profile for guildId
            viewModelScope.launch {
                userRepo.profileFlow(uid).collect { profile ->
                    if (profile != null) {
                        _uiState.update {
                            it.copy(
                                currentUsername = auth.currentUser?.displayName ?: "Recruit",
                                currentUserPhoto = profile.photoURL
                            )
                        }
                        val guildId = profile.guildId
                        if (!guildId.isNullOrEmpty()) {
                            loadGuild(guildId)
                        } else {
                            _uiState.update { it.copy(hasGuild = false, isLoading = false) }
                        }
                    } else {
                        _uiState.update { it.copy(isLoading = false) }
                    }
                }
            }
        } else {
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    private fun loadGuild(guildId: String) {
        viewModelScope.launch {
            socialRepo.guildFlow(guildId).collect { guild ->
                if (guild != null) {
                    _uiState.update {
                        it.copy(
                            hasGuild = true,
                            guild = guild,
                            isLoading = false
                        )
                    }
                    // Load member profiles
                    loadMemberProfiles(guild)
                } else {
                    _uiState.update { it.copy(hasGuild = false, isLoading = false) }
                }
            }
        }
        // Guild chat
        viewModelScope.launch {
            socialRepo.guildChatFlow(guildId, 50).collect { messages ->
                _uiState.update { it.copy(guildChat = messages) }
            }
        }
    }

    private suspend fun loadMemberProfiles(guild: Guild) {
        val profiles = guild.members.mapNotNull { memberId ->
            try {
                val profile = userRepo.getProfile(memberId)
                if (profile != null) {
                    GuildMemberInfo(
                        userId = memberId,
                        username = profile.userId, // Will be replaced by display name from leaderboard
                        xp = profile.xp,
                        role = if (memberId == guild.ownerId) "owner" else "member",
                        photoURL = profile.photoURL
                    )
                } else null
            } catch (_: Exception) { null }
        }.sortedByDescending { it.xp }
        _uiState.update { it.copy(memberProfiles = profiles) }
    }

    // ── Actions ──────────────────────────────────────────────────────

    fun joinGuild(guildId: String) {
        val uid = _uiState.value.currentUserId
        if (uid.isEmpty()) return
        _uiState.update { it.copy(isJoining = true) }
        viewModelScope.launch {
            try {
                socialRepo.joinGuild(guildId, uid)
                userRepo.updateProfile(uid, mapOf("guildId" to guildId, "guildRole" to "member"))
                _uiState.update { it.copy(isJoining = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isJoining = false, error = e.message) }
            }
        }
    }

    fun leaveGuild() {
        val state = _uiState.value
        val guildId = state.guild?.id ?: return
        val uid = state.currentUserId
        if (uid.isEmpty()) return
        viewModelScope.launch {
            try {
                socialRepo.leaveGuild(guildId, uid)
                userRepo.updateProfile(uid, mapOf("guildId" to "", "guildRole" to ""))
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun sendGuildChatMessage(text: String) {
        val state = _uiState.value
        val guildId = state.guild?.id ?: return
        if (text.isBlank() || state.currentUserId.isEmpty()) return
        viewModelScope.launch {
            socialRepo.sendGuildMessage(
                guildId,
                ChatMessage(
                    userId = state.currentUserId,
                    username = state.currentUsername,
                    photo = state.currentUserPhoto,
                    text = text,
                    createdAt = Timestamp.now()
                )
            )
        }
    }

    fun createGuild(name: String, description: String) {
        val state = _uiState.value
        if (name.isBlank() || state.currentUserId.isEmpty()) return
        _uiState.update { it.copy(isJoining = true) }
        viewModelScope.launch {
            try {
                val guild = Guild(
                    name = name,
                    description = description,
                    ownerId = state.currentUserId,
                    members = listOf(state.currentUserId),
                    memberCount = 1,
                    createdAt = Timestamp.now()
                )
                val guildId = socialRepo.createGuild(guild)
                userRepo.updateProfile(state.currentUserId, mapOf("guildId" to guildId, "guildRole" to "owner"))
                _uiState.update { it.copy(isJoining = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isJoining = false, error = e.message) }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
