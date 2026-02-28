package com.ironcore.fit.ui.league

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.KeyboardArrowUp
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

// ── Local state models ──────────────────────────────────────────

private data class LeagueUiState(
    val currentUserId: String = "me",
    val currentUserName: String = "You",
    val currentXP: Long = 2800,
    val currentLeague: League = League.SILVER,
    val leaderboard: List<LeaderboardRow> = emptyList()
)

private data class LeaderboardRow(
    val id: String,
    val rank: Int,
    val name: String,
    val xp: Long,
    val league: League
)

@Composable
fun LeagueScreen(navController: NavHostController? = null) {
    val uiState = remember {
        LeagueUiState(
            currentXP = 2800,
            currentLeague = League.SILVER,
            leaderboard = listOf(
                LeaderboardRow("1", 1, "AlphaGrind", 12400, League.DIAMOND),
                LeaderboardRow("2", 2, "BeastMode_99", 9800, League.PLATINUM),
                LeaderboardRow("3", 3, "IronWolf", 7200, League.PLATINUM),
                LeaderboardRow("4", 4, "SpartanFit", 5500, League.GOLD),
                LeaderboardRow("5", 5, "NovaPush", 4100, League.GOLD),
                LeaderboardRow("6", 6, "TitanGrip", 3400, League.GOLD),
                LeaderboardRow("me", 7, "You", 2800, League.SILVER),
                LeaderboardRow("8", 8, "SweatKing", 2100, League.SILVER),
                LeaderboardRow("9", 9, "FitReaper", 1600, League.SILVER),
                LeaderboardRow("10", 10, "PumpHero", 800, League.BRONZE)
            )
        )
    }

    val nextLeague = League.entries
        .filter { it.minPoints > uiState.currentXP }
        .minByOrNull { it.minPoints }
    val progressToNext = if (nextLeague != null) {
        val currentMin = uiState.currentLeague.minPoints
        ((uiState.currentXP - currentMin).toFloat() / (nextLeague.minPoints - currentMin).toFloat())
            .coerceIn(0f, 1f)
    } else 1f

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
                text = "LEAGUE",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
        }

        // ── Current League Tier ─────────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // League badge
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.radialGradient(
                                    colors = listOf(
                                        Color(uiState.currentLeague.color),
                                        Color(uiState.currentLeague.color).copy(alpha = 0.3f)
                                    )
                                )
                            )
                            .border(2.dp, Color(uiState.currentLeague.color), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.EmojiEvents,
                            contentDescription = null,
                            tint = IronBlack,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = uiState.currentLeague.displayName.uppercase(),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(uiState.currentLeague.color),
                        letterSpacing = 2.sp
                    )
                    Text(
                        text = "${uiState.currentXP} XP",
                        style = MaterialTheme.typography.bodyLarge,
                        color = IronTextSecondary
                    )

                    // Progress to next league
                    if (nextLeague != null) {
                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.KeyboardArrowUp,
                                contentDescription = null,
                                tint = IronGreen,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Next: ${nextLeague.displayName}",
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextTertiary
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = "${nextLeague.minPoints - uiState.currentXP} XP needed",
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextTertiary
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        LinearProgressIndicator(
                            progress = { progressToNext },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp),
                            color = Color(nextLeague.color),
                            trackColor = GlassWhite
                        )
                    } else {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "MAX LEAGUE REACHED",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronYellow,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }

        // ── Leaderboard Header ──────────────────────────────
        item {
            Text(
                text = "LEADERBOARD",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = IronTextSecondary,
                letterSpacing = 1.sp
            )
        }

        // ── Leaderboard Card ────────────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    // Table header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("#", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary, modifier = Modifier.width(32.dp))
                        Text("Player", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary, modifier = Modifier.weight(1f))
                        Text("XP", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary, modifier = Modifier.width(64.dp), textAlign = TextAlign.End)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Tier", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary, modifier = Modifier.width(48.dp), textAlign = TextAlign.Center)
                    }

                    HorizontalDivider(color = GlassWhite)

                    uiState.leaderboard.forEach { entry ->
                        val isCurrentUser = entry.id == uiState.currentUserId
                        LeaderboardRowItem(entry = entry, isCurrentUser = isCurrentUser)
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun LeaderboardRowItem(entry: LeaderboardRow, isCurrentUser: Boolean) {
    val bgColor = if (isCurrentUser) IronRed.copy(alpha = 0.15f) else Color.Transparent
    val borderMod = if (isCurrentUser) {
        Modifier.border(1.dp, IronRed.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
    } else Modifier

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(borderMod)
            .background(bgColor, RoundedCornerShape(8.dp))
            .padding(vertical = 10.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Rank
        Text(
            text = "#${entry.rank}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (entry.rank <= 3) FontWeight.Bold else FontWeight.Normal,
            color = when (entry.rank) {
                1 -> IronYellow
                2 -> Color(0xFFC0C0C0)
                3 -> Color(0xFFCD7F32)
                else -> IronTextTertiary
            },
            modifier = Modifier.width(32.dp)
        )

        // Name
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = entry.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isCurrentUser) FontWeight.Bold else FontWeight.Normal,
                color = if (isCurrentUser) IronRed else IronTextPrimary
            )
        }

        // XP
        Text(
            text = "${entry.xp}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = IronTextPrimary,
            modifier = Modifier.width(64.dp),
            textAlign = TextAlign.End
        )

        Spacer(modifier = Modifier.width(8.dp))

        // Tier badge
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(Color(entry.league.color).copy(alpha = 0.2f))
                .border(1.dp, Color(entry.league.color), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = entry.league.displayName.first().toString(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = Color(entry.league.color)
            )
        }
    }
}
