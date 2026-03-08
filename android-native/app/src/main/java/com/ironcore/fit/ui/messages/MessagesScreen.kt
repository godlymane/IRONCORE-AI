package com.ironcore.fit.ui.messages

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.data.model.InboxMessage
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun MessagesScreen(
    navController: NavHostController? = null,
    viewModel: MessagesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // If a conversation is selected, show thread view
    if (uiState.selectedConversation != null) {
        ConversationThread(
            conversation = uiState.selectedConversation!!,
            currentUserId = viewModel.uiState.value.conversations
                .firstOrNull()?.messages?.firstOrNull()?.fromId.orEmpty(),
            onSend = { viewModel.sendMessage(it) },
            onBack = { viewModel.clearSelection() }
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Header ──────────────────────────────────────────
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController?.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = IronTextPrimary)
            }
            Text(
                text = "MESSAGES",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.weight(1f))
            if (uiState.unreadCount > 0) {
                Badge(
                    containerColor = IronRed,
                    contentColor = Color.White
                ) {
                    Text("${uiState.unreadCount}")
                }
            }
        }

        // ── Content ─────────────────────────────────────────
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = IronRed)
            }
        } else if (uiState.conversations.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.MailOutline,
                        contentDescription = null,
                        tint = IronTextTertiary,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No messages yet",
                        style = MaterialTheme.typography.bodyLarge,
                        color = IronTextTertiary
                    )
                    Text(
                        text = "Messages from other warriors will appear here",
                        style = MaterialTheme.typography.bodySmall,
                        color = IronTextTertiary
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(uiState.conversations, key = { it.peerId }) { conv ->
                    ConversationRow(
                        conversation = conv,
                        onClick = { viewModel.selectConversation(conv.peerId) }
                    )
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

// ── Conversation Row ────────────────────────────────────────────────

@Composable
private fun ConversationRow(
    conversation: Conversation,
    onClick: () -> Unit
) {
    val hasUnread = conversation.unreadCount > 0

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (hasUnread) GlowRed08 else GlassWhite03)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(IronSurfaceElevated),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = conversation.peerName.firstOrNull()?.uppercase() ?: "?",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = conversation.peerName.ifEmpty { "Unknown" },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = if (hasUnread) FontWeight.Bold else FontWeight.SemiBold,
                    color = IronTextPrimary
                )
                val timeStr = conversation.lastTimestamp?.toDate()?.let { date ->
                    SimpleDateFormat("MMM d", Locale.US).format(date)
                } ?: ""
                Text(
                    text = timeStr,
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    fontSize = 10.sp
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = conversation.lastMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (hasUnread) IronTextSecondary else IronTextTertiary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                if (hasUnread) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(IronRed),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${conversation.unreadCount}",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}

// ── Conversation Thread ─────────────────────────────────────────────

@Composable
private fun ConversationThread(
    conversation: Conversation,
    currentUserId: String,
    onSend: (String) -> Unit,
    onBack: () -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(conversation.messages.size) {
        if (conversation.messages.isNotEmpty()) {
            listState.animateScrollToItem(conversation.messages.lastIndex)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Thread Header ─────────────────────────────────
        Surface(color = IronBackgroundSecondary, tonalElevation = 2.dp) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = IronTextPrimary)
                }
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(IronSurfaceElevated),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = conversation.peerName.firstOrNull()?.uppercase() ?: "?",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronTextPrimary
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = conversation.peerName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary
                )
            }
        }

        // ── Messages ──────────────────────────────────────
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            state = listState,
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(conversation.messages, key = { it.id }) { msg ->
                val isFromPeer = msg.fromId == conversation.peerId
                ThreadBubble(message = msg, isFromPeer = isFromPeer)
            }
        }

        // ── Input Bar ─────────────────────────────────────
        Surface(color = IronBackgroundSecondary, tonalElevation = 4.dp) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = {
                        Text("Reply...", color = IronTextTertiary, style = MaterialTheme.typography.bodyMedium)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = IronTextPrimary,
                        unfocusedTextColor = IronTextPrimary,
                        focusedBorderColor = IronRed,
                        unfocusedBorderColor = GlassBorderSubtle,
                        cursorColor = IronRed,
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent
                    ),
                    shape = RoundedCornerShape(20.dp),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = {
                        if (messageText.isNotBlank()) {
                            onSend(messageText)
                            messageText = ""
                        }
                    },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = if (messageText.isNotBlank()) IronRed else GlassWhite08,
                        contentColor = Color.White
                    ),
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ThreadBubble(message: InboxMessage, isFromPeer: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = if (isFromPeer) Arrangement.Start else Arrangement.End
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(
                    if (isFromPeer) GlassWhite05 else IronRedDark.copy(alpha = 0.3f),
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isFromPeer) 4.dp else 16.dp,
                        bottomEnd = if (isFromPeer) 16.dp else 4.dp
                    )
                )
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(
                text = message.text,
                style = MaterialTheme.typography.bodyMedium,
                color = IronTextPrimary,
                lineHeight = 20.sp
            )

            val timeStr = message.createdAt?.toDate()?.let { date ->
                SimpleDateFormat("h:mm a", Locale.US).format(date)
            } ?: ""
            if (timeStr.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = timeStr,
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    fontSize = 10.sp
                )
            }
        }
    }
}
