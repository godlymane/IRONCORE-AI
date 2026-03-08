package com.ironcore.fit.ui.arena

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.data.model.ChatMessage
import com.ironcore.fit.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Locale

// ── Tab composable ─────────────────────────────────────────────────

@Composable
fun CommunityChatTab(
    messages: List<ChatMessage>,
    currentUserId: String,
    onSend: (String) -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Auto-scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        if (messages.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("No messages yet. Start the conversation!", color = IronTextTertiary)
            }
        } else {
            // ── Message List ────────────────────────────────────
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                state = listState,
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                reverseLayout = false
            ) {
                items(messages, key = { it.id }) { msg ->
                    ChatBubble(message = msg, isMe = msg.userId == currentUserId)
                }
                item { Spacer(modifier = Modifier.height(4.dp)) }
            }
        }

        // ── Input Bar ───────────────────────────────────────
        ChatInputBar(
            value = messageText,
            onValueChange = { messageText = it },
            onSend = {
                if (messageText.isNotBlank()) {
                    onSend(messageText)
                    messageText = ""
                }
            }
        )
    }
}

// ── Chat Bubble ────────────────────────────────────────────────────

@Composable
private fun ChatBubble(message: ChatMessage, isMe: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
    ) {
        if (!isMe) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(IronSurfaceElevated),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = message.username.firstOrNull()?.uppercase() ?: "?",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    fontSize = 13.sp
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
        }

        Column(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(
                    if (isMe) IronRedDark.copy(alpha = 0.3f) else GlassWhite05,
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isMe) 16.dp else 4.dp,
                        bottomEnd = if (isMe) 4.dp else 16.dp
                    )
                )
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            if (!isMe) {
                Text(
                    text = message.username,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = IronRed,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
            }

            Text(
                text = message.text,
                style = MaterialTheme.typography.bodyMedium,
                color = IronTextPrimary,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(2.dp))

            val timeStr = message.createdAt?.toDate()?.let { date ->
                SimpleDateFormat("h:mm a", Locale.US).format(date)
            } ?: ""
            if (timeStr.isNotEmpty()) {
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

// ── Input Bar ──────────────────────────────────────────────────────

@Composable
private fun ChatInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit
) {
    Surface(
        color = IronBackgroundSecondary,
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text(
                        "Type a message...",
                        color = IronTextTertiary,
                        style = MaterialTheme.typography.bodyMedium
                    )
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
                onClick = onSend,
                colors = IconButtonDefaults.iconButtonColors(
                    containerColor = if (value.isNotBlank()) IronRed else GlassWhite08,
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
