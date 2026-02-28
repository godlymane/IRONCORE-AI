package com.ironcore.fit.ui.playercard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ironcore.fit.data.model.League
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ── Local state model ───────────────────────────────────────────

private data class PlayerCardUiState(
    val userName: String = "IronWarrior",
    val level: Int = 14,
    val league: League = League.SILVER,
    val totalXP: Long = 2800,
    val workoutsCompleted: Int = 87,
    val currentStreak: Int = 12,
    val longestStreak: Int = 28,
    val benchPR: String = "225 lbs",
    val squatPR: String = "315 lbs",
    val deadliftPR: String = "405 lbs",
    val recoveryPhrase: String = "iron-wolf-thunder-spark-42",
    val pin: String = "****",
    val hasPIN: Boolean = true
)

@Composable
fun PlayerCardScreen(navController: NavHostController? = null) {
    val uiState = remember { PlayerCardUiState() }

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
            Text(
                text = "PLAYER CARD",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
        }

        // ── The Card ────────────────────────────────────────
        item {
            PlayerCardDisplay(uiState)
        }

        // ── Stats Grid ──────────────────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "COMBAT STATS",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = IronRed,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        StatBox("Workouts", "${uiState.workoutsCompleted}", IronRed)
                        StatBox("Streak", "${uiState.currentStreak}d", IronOrange)
                        StatBox("Best Streak", "${uiState.longestStreak}d", IronYellow)
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = GlassWhite)
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "1RM RECORDS",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronTextSecondary,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        PRItem("Bench", uiState.benchPR, "\uD83C\uDFCB\uFE0F")
                        PRItem("Squat", uiState.squatPR, "\uD83E\uDDB5")
                        PRItem("Deadlift", uiState.deadliftPR, "\uD83D\uDCAA")
                    }
                }
            }
        }

        // ── Recovery Phrase ──────────────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Key,
                            contentDescription = null,
                            tint = IronYellow,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "RECOVERY PHRASE",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronYellow,
                            letterSpacing = 1.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(IronSurface)
                            .border(1.dp, IronYellow.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = uiState.recoveryPhrase,
                            style = MaterialTheme.typography.bodyMedium,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            color = IronTextPrimary,
                            letterSpacing = 1.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Save this phrase to recover your account. Do not share it.",
                        style = MaterialTheme.typography.bodySmall,
                        color = IronTextTertiary
                    )
                }
            }
        }

        // ── PIN Management ──────────────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Lock,
                            contentDescription = null,
                            tint = IronBlue,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "PIN SECURITY",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronBlue,
                            letterSpacing = 1.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = if (uiState.hasPIN) "PIN is set" else "No PIN configured",
                                style = MaterialTheme.typography.bodyMedium,
                                color = IronTextPrimary
                            )
                            Text(
                                text = if (uiState.hasPIN) "Your account is protected"
                                else "Set a PIN for extra security",
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextTertiary
                            )
                        }

                        if (uiState.hasPIN) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = IronGreen,
                                modifier = Modifier.size(24.dp)
                            )
                        } else {
                            OutlinedButton(
                                onClick = { /* TODO: navigate to PIN setup */ },
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = IronBlue
                                )
                            ) {
                                Text("SET PIN", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            }
                        }
                    }
                }
            }
        }

        // ── Share Button ────────────────────────────────────
        item {
            Button(
                onClick = { /* TODO: share card as image */ },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = IronRed),
                contentPadding = PaddingValues(vertical = 14.dp)
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "SHARE PLAYER CARD",
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

// ── The visual player card ──────────────────────────────────────

@Composable
private fun PlayerCardDisplay(state: PlayerCardUiState) {
    val leagueColor = Color(state.league.color)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.6f)
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF1A1A2E),
                        Color(0xFF16213E),
                        Color(0xFF0F3460)
                    )
                )
            )
            .border(
                width = 2.dp,
                brush = Brush.linearGradient(
                    colors = listOf(leagueColor, IronRed, leagueColor)
                ),
                shape = RoundedCornerShape(20.dp)
            )
            .padding(20.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top row: name + league badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = state.userName,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = IronTextPrimary,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Level ${state.level}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = IronTextSecondary
                    )
                }

                // League badge
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(leagueColor.copy(alpha = 0.3f))
                        .border(2.dp, leagueColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.EmojiEvents,
                        contentDescription = null,
                        tint = leagueColor,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            // Middle: XP display
            Column {
                Text(
                    text = "${state.totalXP}",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = IronRed,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "TOTAL XP",
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    letterSpacing = 2.sp
                )
            }

            // Bottom row: league name + stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                // League tier text
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(leagueColor.copy(alpha = 0.15f))
                        .border(1.dp, leagueColor.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = state.league.displayName.uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = leagueColor,
                        letterSpacing = 1.sp
                    )
                }

                // Mini stats
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    MiniStat("\uD83C\uDFCB\uFE0F", "${state.workoutsCompleted}")
                    MiniStat("\uD83D\uDD25", "${state.currentStreak}d")
                }
            }
        }

        // IronCore branding watermark
        Text(
            text = "IRONCORE",
            style = MaterialTheme.typography.labelSmall,
            color = IronTextPrimary.copy(alpha = 0.08f),
            fontWeight = FontWeight.Bold,
            letterSpacing = 8.sp,
            fontSize = 32.sp,
            modifier = Modifier.align(Alignment.Center)
        )
    }
}

@Composable
private fun MiniStat(emoji: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(text = emoji, fontSize = 14.sp)
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary
        )
    }
}

@Composable
private fun StatBox(label: String, value: String, color: Color) {
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
private fun PRItem(lift: String, weight: String, emoji: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = emoji, fontSize = 22.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = weight,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary
        )
        Text(
            text = lift,
            style = MaterialTheme.typography.bodySmall,
            color = IronTextTertiary
        )
    }
}
