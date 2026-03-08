package com.ironcore.fit.ui.guild

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

@Composable
fun GuildScreen(
    navController: NavHostController? = null,
    viewModel: GuildViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.isLoading) {
        Box(modifier = Modifier.fillMaxSize().background(IronBlack), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = IronRed)
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ── Header ──────────────────────────────────────────
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { navController?.popBackStack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = IronTextPrimary)
                }
                Text(
                    text = "GUILD",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    letterSpacing = 2.sp
                )
            }
        }

        if (uiState.hasGuild && uiState.guild != null) {
            val guild = uiState.guild!!

            // ── Guild Info Card ──────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Shield,
                                contentDescription = null,
                                tint = IronPurple,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = guild.name,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = IronTextPrimary
                                )
                                Text(
                                    text = "${guild.memberCount} members",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = IronTextTertiary
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            GuildStatItem("Guild XP", formatNumber(guild.totalXP), IronPurple)
                            GuildStatItem("Members", "${guild.memberCount}", IronBlue)
                            GuildStatItem("League", guild.league, IronYellow)
                        }

                        if (guild.description.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = guild.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextSecondary
                            )
                        }
                    }
                }
            }

            // ── Members List ────────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text(
                            text = "MEMBERS",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronPurple,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        if (uiState.memberProfiles.isEmpty()) {
                            Text("Loading members...", color = IronTextTertiary)
                        } else {
                            uiState.memberProfiles.forEachIndexed { index, member ->
                                MemberRow(rank = index + 1, member = member)
                                if (index < uiState.memberProfiles.lastIndex) {
                                    HorizontalDivider(
                                        color = GlassWhite,
                                        modifier = Modifier.padding(vertical = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── Guild Chat ──────────────────────────────────
            item {
                GuildChatSection(
                    messages = uiState.guildChat,
                    currentUserId = uiState.currentUserId,
                    onSend = { viewModel.sendGuildChatMessage(it) }
                )
            }

            // ── Leave Guild ─────────────────────────────────
            item {
                OutlinedButton(
                    onClick = { viewModel.leaveGuild() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = IronTextTertiary)
                ) {
                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("LEAVE GUILD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }

        } else {
            // ── No Guild State ──────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Groups,
                            contentDescription = null,
                            tint = IronTextTertiary,
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "You're not in a guild yet",
                            style = MaterialTheme.typography.bodyLarge,
                            color = IronTextSecondary,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Join a team to compete in guild wars and boss fights",
                            style = MaterialTheme.typography.bodyMedium,
                            color = IronTextTertiary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(
                                onClick = { /* TODO: create guild dialog */ },
                                colors = ButtonDefaults.buttonColors(containerColor = IronRed)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("CREATE GUILD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            }
                            OutlinedButton(
                                onClick = { /* TODO: browse guilds */ },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = IronTextPrimary)
                            ) {
                                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("JOIN GUILD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            }
                        }
                    }
                }
            }
        }

        // ── Community Boss Section ──────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "COMMUNITY BOSS",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = IronRed,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(IronRedDark),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("\uD83D\uDC79", fontSize = 24.sp)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = uiState.bossName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = IronTextPrimary
                            )
                            Text(
                                text = if (uiState.bossActive) "ACTIVE" else "DEFEATED",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (uiState.bossActive) IronGreen else IronTextTertiary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    val hpProgress = (uiState.bossCurrentHP.toFloat() / uiState.bossTotalHP.toFloat())
                        .coerceIn(0f, 1f)
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("HP", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary)
                            Text(
                                text = "${formatNumber(uiState.bossCurrentHP)} / ${formatNumber(uiState.bossTotalHP)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = IronTextSecondary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { hpProgress },
                            modifier = Modifier.fillMaxWidth().height(10.dp),
                            color = when {
                                hpProgress > 0.5f -> IronRed
                                hpProgress > 0.2f -> IronOrange
                                else -> IronYellow
                            },
                            trackColor = GlassWhite
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { /* TODO: deal damage via Cloud Function */ },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = IronRed)
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("DEAL DAMAGE", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }

    // Error snackbar
    uiState.error?.let { error ->
        LaunchedEffect(error) {
            // Show briefly then clear
            kotlinx.coroutines.delay(3000)
            viewModel.clearError()
        }
    }
}

// ── Guild Chat Section ──────────────────────────────────────────────

@Composable
private fun GuildChatSection(
    messages: List<com.ironcore.fit.data.model.ChatMessage>,
    currentUserId: String,
    onSend: (String) -> Unit
) {
    var chatText by remember { mutableStateOf("") }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(
                text = "GUILD CHAT",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = IronPurple,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.height(8.dp))

            if (messages.isEmpty()) {
                Text(
                    text = "No guild messages yet",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary,
                    modifier = Modifier.padding(vertical = 16.dp)
                )
            } else {
                // Show last 5 messages
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    messages.takeLast(5).forEach { msg ->
                        val isMe = msg.userId == currentUserId
                        Row {
                            if (!isMe) {
                                Text(
                                    text = msg.username,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = IronPurple,
                                    fontSize = 11.sp
                                )
                                Text(": ", color = IronTextTertiary, fontSize = 11.sp)
                            } else {
                                Text(
                                    text = "You: ",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = IronRed,
                                    fontSize = 11.sp
                                )
                            }
                            Text(
                                text = msg.text,
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextPrimary,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Input
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = chatText,
                    onValueChange = { chatText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = {
                        Text("Message guild...", color = IronTextTertiary, style = MaterialTheme.typography.bodySmall)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = IronTextPrimary,
                        unfocusedTextColor = IronTextPrimary,
                        focusedBorderColor = IronPurple,
                        unfocusedBorderColor = GlassBorderSubtle,
                        cursorColor = IronPurple,
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent
                    ),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (chatText.isNotBlank()) {
                            onSend(chatText)
                            chatText = ""
                        }
                    },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = if (chatText.isNotBlank()) IronPurple else GlassWhite08,
                        contentColor = Color.White
                    ),
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

// ── Supporting Composables ──────────────────────────────────────────

@Composable
private fun GuildStatItem(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = IronTextTertiary
        )
    }
}

@Composable
private fun MemberRow(rank: Int, member: GuildMemberInfo) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "#$rank",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = IronTextTertiary,
            modifier = Modifier.width(32.dp)
        )

        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(IronSurfaceElevated),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = member.username.firstOrNull()?.toString()?.uppercase() ?: "?",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.width(10.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = member.username.ifEmpty { member.userId.take(8) },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = IronTextPrimary
                )
                if (member.role == "owner") {
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Default.Star,
                        contentDescription = "Owner",
                        tint = IronYellow,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
            Text(
                text = "${member.xp} XP",
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary
            )
        }
    }
}

private fun formatNumber(n: Long): String = when {
    n >= 1_000_000 -> "${n / 1_000_000}M"
    n >= 1_000 -> "${n / 1_000}K"
    else -> n.toString()
}
