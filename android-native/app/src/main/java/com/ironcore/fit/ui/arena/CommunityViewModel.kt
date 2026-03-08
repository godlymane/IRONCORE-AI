package com.ironcore.fit.ui.arena

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.*
import com.ironcore.fit.data.repository.SocialRepository
import com.ironcore.fit.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── UI State ─────────────────────────────────────────────────────────

data class CommunityUiState(
    val leaderboard: List<LeaderboardEntry> = emptyList(),
    val chatMessages: List<ChatMessage> = emptyList(),
    val posts: List<Post> = emptyList(),
    val inbox: List<InboxMessage> = emptyList(),
    val following: Set<String> = emptySet(),
    val currentUserId: String = "",
    val currentUsername: String = "",
    val currentUserPhoto: String = "",
    val currentUserXp: Long = 0,
    val isLoading: Boolean = true
)

// ── ViewModel ────────────────────────────────────────────────────────

@HiltViewModel
class CommunityViewModel @Inject constructor(
    private val socialRepo: SocialRepository,
    private val userRepo: UserRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _uiState = MutableStateFlow(CommunityUiState())
    val uiState: StateFlow<CommunityUiState> = _uiState.asStateFlow()

    init {
        val uid = auth.currentUser?.uid ?: ""
        _uiState.update { it.copy(currentUserId = uid) }

        // Load user profile for display name / photo
        if (uid.isNotEmpty()) {
            viewModelScope.launch {
                userRepo.profileFlow(uid).collect { profile ->
                    if (profile != null) {
                        _uiState.update {
                            it.copy(
                                currentUsername = auth.currentUser?.displayName ?: "Recruit",
                                currentUserPhoto = profile.photoURL,
                                currentUserXp = profile.xp
                            )
                        }
                    }
                }
            }
        }

        // Leaderboard
        viewModelScope.launch {
            userRepo.leaderboardFlow(50).collect { entries ->
                _uiState.update { it.copy(leaderboard = entries, isLoading = false) }
            }
        }

        // Global Chat
        viewModelScope.launch {
            socialRepo.chatFlow(50).collect { messages ->
                _uiState.update { it.copy(chatMessages = messages) }
            }
        }

        // Posts
        viewModelScope.launch {
            socialRepo.postsFlow(20).collect { posts ->
                _uiState.update { it.copy(posts = posts) }
            }
        }

        // Inbox
        if (uid.isNotEmpty()) {
            viewModelScope.launch {
                socialRepo.inboxFlow(uid).collect { messages ->
                    _uiState.update { it.copy(inbox = messages) }
                }
            }

            // Following list
            viewModelScope.launch {
                socialRepo.followingFlow(uid).collect { follows ->
                    _uiState.update { it.copy(following = follows.map { f -> f.id }.toSet()) }
                }
            }
        }
    }

    // ── Actions ──────────────────────────────────────────────────────

    fun sendChatMessage(text: String) {
        val state = _uiState.value
        if (text.isBlank() || state.currentUserId.isEmpty()) return
        viewModelScope.launch {
            socialRepo.sendChatMessage(
                ChatMessage(
                    userId = state.currentUserId,
                    username = state.currentUsername,
                    photo = state.currentUserPhoto,
                    text = text,
                    xp = state.currentUserXp,
                    createdAt = Timestamp.now()
                )
            )
        }
    }

    fun createPost(caption: String, imageUrl: String = "") {
        val state = _uiState.value
        if (caption.isBlank() || state.currentUserId.isEmpty()) return
        viewModelScope.launch {
            socialRepo.createPost(
                Post(
                    imageUrl = imageUrl,
                    caption = caption,
                    userId = state.currentUserId,
                    username = state.currentUsername,
                    userPhoto = state.currentUserPhoto,
                    xp = state.currentUserXp,
                    createdAt = Timestamp.now()
                )
            )
        }
    }

    fun toggleFollow(targetUserId: String) {
        val uid = _uiState.value.currentUserId
        if (uid.isEmpty()) return
        viewModelScope.launch {
            socialRepo.toggleFollow(uid, targetUserId)
        }
    }

    fun sendDirectMessage(targetUserId: String, text: String) {
        val state = _uiState.value
        if (text.isBlank() || state.currentUserId.isEmpty()) return
        viewModelScope.launch {
            socialRepo.sendPrivateMessage(
                targetUserId,
                InboxMessage(
                    fromId = state.currentUserId,
                    fromName = state.currentUsername,
                    fromPhoto = state.currentUserPhoto,
                    text = text,
                    createdAt = Timestamp.now()
                )
            )
        }
    }

    fun markMessageRead(messageId: String) {
        val uid = _uiState.value.currentUserId
        if (uid.isEmpty()) return
        viewModelScope.launch {
            socialRepo.markMessageRead(uid, messageId)
        }
    }
}
