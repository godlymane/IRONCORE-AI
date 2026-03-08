package com.ironcore.fit.ui.messages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.ironcore.fit.data.model.InboxMessage
import com.ironcore.fit.data.model.UserProfile
import com.ironcore.fit.data.repository.SocialRepository
import com.ironcore.fit.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── UI State ─────────────────────────────────────────────────────────

data class MessagesUiState(
    val conversations: List<Conversation> = emptyList(),
    val selectedConversation: Conversation? = null,
    val isLoading: Boolean = true,
    val unreadCount: Int = 0,
    val composingTo: String = "",       // userId being composed to
    val composingToName: String = ""
)

data class Conversation(
    val peerId: String,
    val peerName: String,
    val peerPhoto: String,
    val lastMessage: String,
    val lastTimestamp: Timestamp? = null,
    val unreadCount: Int = 0,
    val messages: List<InboxMessage> = emptyList()
)

// ── ViewModel ────────────────────────────────────────────────────────

@HiltViewModel
class MessagesViewModel @Inject constructor(
    private val socialRepo: SocialRepository,
    private val userRepo: UserRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _uiState = MutableStateFlow(MessagesUiState())
    val uiState: StateFlow<MessagesUiState> = _uiState.asStateFlow()

    private val uid get() = auth.currentUser?.uid.orEmpty()

    init {
        if (uid.isNotEmpty()) {
            viewModelScope.launch {
                socialRepo.inboxFlow(uid).collect { messages ->
                    val grouped = messages
                        .groupBy { it.fromId }
                        .map { (peerId, msgs) ->
                            val latest = msgs.maxByOrNull { it.createdAt?.seconds ?: 0L }
                            Conversation(
                                peerId = peerId,
                                peerName = latest?.fromName.orEmpty(),
                                peerPhoto = latest?.fromPhoto.orEmpty(),
                                lastMessage = latest?.text.orEmpty(),
                                lastTimestamp = latest?.createdAt,
                                unreadCount = msgs.count { !it.read },
                                messages = msgs.sortedBy { it.createdAt?.seconds ?: 0L }
                            )
                        }
                        .sortedByDescending { it.lastTimestamp?.seconds ?: 0L }

                    _uiState.update { state ->
                        state.copy(
                            conversations = grouped,
                            unreadCount = grouped.sumOf { it.unreadCount },
                            isLoading = false,
                            // Keep selected conversation updated
                            selectedConversation = state.selectedConversation?.let { sel ->
                                grouped.find { it.peerId == sel.peerId }
                            }
                        )
                    }
                }
            }
        }
    }

    fun selectConversation(peerId: String) {
        val conv = _uiState.value.conversations.find { it.peerId == peerId }
        _uiState.update { it.copy(selectedConversation = conv) }

        // Mark all unread messages in this conversation as read
        if (conv != null && uid.isNotEmpty()) {
            viewModelScope.launch {
                conv.messages.filter { !it.read }.forEach { msg ->
                    try { socialRepo.markMessageRead(uid, msg.id) } catch (_: Exception) {}
                }
            }
        }
    }

    fun clearSelection() {
        _uiState.update { it.copy(selectedConversation = null) }
    }

    fun sendMessage(text: String) {
        val target = _uiState.value.selectedConversation?.peerId
            ?: _uiState.value.composingTo
        if (target.isEmpty() || text.isBlank()) return

        val user = auth.currentUser ?: return
        val profile = _uiState.value // We'll use auth display name
        val message = InboxMessage(
            fromId = user.uid,
            fromName = user.displayName ?: "You",
            fromPhoto = user.photoUrl?.toString().orEmpty(),
            text = text.trim()
        )

        viewModelScope.launch {
            try {
                socialRepo.sendPrivateMessage(target, message)
            } catch (_: Exception) {}
        }
    }

    fun startComposeTo(userId: String, userName: String) {
        _uiState.update {
            it.copy(composingTo = userId, composingToName = userName)
        }
    }

    fun clearCompose() {
        _uiState.update { it.copy(composingTo = "", composingToName = "") }
    }
}
