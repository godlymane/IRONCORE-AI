package com.ironcore.fit.ui.arena

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ═══════════════════════════════════════════════════════════════════
// Battles Tab — GhostMatch + CommunityBoss + Tournaments
// ═══════════════════════════════════════════════════════════════════

@Composable
fun BattlesTab(navController: NavHostController? = null) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ── Ghost Match Card ────────────────────────────────
        item { GhostMatchCard(onClick = { navController?.navigate("ghost_match") }) }

        // ── Community Boss Card ─────────────────────────────
        item { CommunityBossCard() }

        // ── Tournaments Section ─────────────────────────────
        item { TournamentsCard() }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

// ── Ghost Match Card ───────────────────────────────────────────────

@Composable
private fun GhostMatchCard(onClick: () -> Unit = {}) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "GHOST MATCH",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Black,
                        color = IronPurple,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Race against a phantom rival",
                        style = MaterialTheme.typography.bodySmall,
                        color = IronTextTertiary
                    )
                }
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(IronPurple.copy(alpha = 0.4f), Color.Transparent)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.DirectionsRun,
                        contentDescription = null,
                        tint = IronPurple,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Quick stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                GhostStat(label = "Win Rate", value = "68%")
                GhostStat(label = "Streak", value = "4")
                GhostStat(label = "Reward", value = "+150 XP")
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = onClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = IronPurple),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "START GHOST MATCH",
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

@Composable
private fun GhostStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Black,
            color = IronTextPrimary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = IronTextTertiary,
            fontSize = 10.sp
        )
    }
}

// ── Community Boss Card ────────────────────────────────────────────

@Composable
private fun CommunityBossCard() {
    // Sample state — will be Firestore real-time
    val bossName = "Ironclad Behemoth"
    val currentHP = 45_000L
    val totalHP = 100_000L
    val hpPercent = (currentHP.toFloat() / totalHP.toFloat()).coerceIn(0f, 1f)
    val isActive = currentHP > 0
    val contributors = listOf(
        Triple("CommanderRex", 12_300L, false),
        Triple("SpartanFit", 9_800L, false),
        Triple("IronWolf", 8_500L, false),
        Triple("You", 6_200L, true),
        Triple("BlazeRunner", 5_100L, false)
    )

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (isActive) {
                            Text(
                                text = "ACTION REQUIRED",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = IronRed,
                                modifier = Modifier
                                    .background(IronRed.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 8.dp, vertical = 2.dp),
                                letterSpacing = 1.sp,
                                fontSize = 9.sp
                            )
                        } else {
                            Text(
                                text = "SECTOR CLEARED",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = IronGreen,
                                modifier = Modifier
                                    .background(IronGreen.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 8.dp, vertical = 2.dp),
                                letterSpacing = 1.sp,
                                fontSize = 9.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = bossName,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Black,
                        fontStyle = FontStyle.Italic,
                        color = IronTextPrimary,
                        letterSpacing = (-0.5).sp
                    )
                }

                Icon(
                    imageVector = if (isActive) Icons.Default.GpsFixed else Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = if (isActive) IronRed.copy(alpha = 0.5f) else IronGreen.copy(alpha = 0.5f),
                    modifier = Modifier.size(32.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // HP Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "BOSS INTEGRITY",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = IronTextTertiary,
                    letterSpacing = 1.sp,
                    fontSize = 10.sp
                )
                Text(
                    text = "${formatBossHP(currentHP)} / ${formatBossHP(totalHP)}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isActive) IronRed else IronGreen,
                    fontSize = 11.sp
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // HP progress bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(14.dp)
                    .clip(RoundedCornerShape(7.dp))
                    .background(GlassWhite05)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraction = hpPercent)
                        .clip(RoundedCornerShape(7.dp))
                        .background(
                            Brush.horizontalGradient(
                                if (isActive) listOf(IronRedLight, IronRedDark)
                                else listOf(IronGreen, IronGreen)
                            )
                        )
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Top Contributors
            Text(
                text = "TOP CONTRIBUTORS",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = IronTextTertiary,
                letterSpacing = 1.sp,
                fontSize = 10.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            contributors.forEachIndexed { index, (name, damage, isMe) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isMe) GlowRed05 else Color.Transparent,
                            RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${index + 1}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Black,
                        color = when (index) {
                            0 -> IronYellow
                            1 -> Color(0xFFC0C0C0)
                            2 -> Color(0xFFCD7F32)
                            else -> IronTextTertiary
                        },
                        modifier = Modifier.width(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isMe) IronRed else IronTextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = formatBossHP(damage),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = IronRed
                        )
                        Text(
                            text = "DAMAGE",
                            style = MaterialTheme.typography.labelSmall,
                            color = IronTextTertiary,
                            fontSize = 8.sp,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = { /* TODO: deal damage via Cloud Function */ },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = IronRed),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "DEAL DAMAGE",
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

// ── Tournaments Card ───────────────────────────────────────────────

@Composable
private fun TournamentsCard() {
    // Sample state — will be Firestore real-time
    val tournamentName = "Iron Gauntlet S3"
    val timeRemaining = "2d 14h"
    val standings = listOf(
        Triple("CommanderRex", 3_450, 1),
        Triple("SpartanFit", 2_890, 2),
        Triple("IronWolf", 2_340, 3),
        Triple("You", 1_780, 4),
        Triple("BlazeRunner", 1_560, 5)
    )

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "TOURNAMENT",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Black,
                        color = IronOrange,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = tournamentName,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        fontStyle = FontStyle.Italic,
                        color = IronTextPrimary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "ENDS IN",
                        style = MaterialTheme.typography.labelSmall,
                        color = IronTextTertiary,
                        fontSize = 9.sp,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = timeRemaining,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        color = IronOrange
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Standings header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp)
            ) {
                Text(
                    text = "#",
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    modifier = Modifier.width(24.dp),
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "GLADIATOR",
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    modifier = Modifier.weight(1f),
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    fontSize = 10.sp
                )
                Text(
                    text = "SCORE",
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    fontSize = 10.sp
                )
            }

            HorizontalDivider(
                color = GlassWhite08,
                modifier = Modifier.padding(vertical = 8.dp)
            )

            // Standings rows
            standings.forEach { (name, score, rank) ->
                val isMe = name == "You"
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isMe) GlowRed05 else Color.Transparent,
                            RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 4.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "$rank",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Black,
                        color = when (rank) {
                            1 -> IronYellow
                            2 -> Color(0xFFC0C0C0)
                            3 -> Color(0xFFCD7F32)
                            else -> IronTextTertiary
                        },
                        modifier = Modifier.width(24.dp)
                    )
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isMe) IronRed else IronTextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "$score",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronOrange
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = { /* TODO: join tournament */ },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = IronOrange),
                border = androidx.compose.foundation.BorderStroke(1.dp, IronOrange.copy(alpha = 0.4f))
            ) {
                Icon(Icons.Default.EmojiEvents, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "VIEW TOURNAMENT",
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

private fun formatBossHP(n: Long): String = when {
    n >= 1_000_000 -> "${n / 1_000_000}M"
    n >= 1_000 -> "${n / 1_000}K"
    else -> n.toString()
}
