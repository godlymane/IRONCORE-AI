package com.ironcore.fit.ui.battlepass

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
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
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ── Local state models ──────────────────────────────────────────

private enum class TierState { LOCKED, UNLOCKED, CLAIMED }

private data class BattlePassUiState(
    val seasonNumber: Int = 3,
    val seasonName: String = "Season of Iron",
    val daysRemaining: Int = 18,
    val currentXP: Int = 2400,
    val isPremium: Boolean = false,
    val showPremiumTrack: Boolean = false,
    val tiers: List<TierUiItem> = emptyList()
)

private data class TierUiItem(
    val tier: Int,
    val xpRequired: Int,
    val freeReward: String,
    val premiumReward: String,
    val state: TierState,
    val emoji: String
)

@Composable
fun BattlePassScreen(navController: NavHostController? = null) {
    var showPremium by remember { mutableStateOf(false) }

    val uiState = remember {
        BattlePassUiState(
            tiers = listOf(
                TierUiItem(1, 0, "100 XP Boost", "Flame Avatar Frame", TierState.CLAIMED, "\uD83D\uDD25"),
                TierUiItem(2, 200, "Water Bottle Badge", "Gold Name Color", TierState.CLAIMED, "\uD83C\uDFC6"),
                TierUiItem(3, 500, "Streak Shield x1", "Red Glow Effect", TierState.CLAIMED, "\uD83D\uDEE1\uFE0F"),
                TierUiItem(4, 900, "200 XP Boost", "Diamond Card Border", TierState.UNLOCKED, "\uD83D\uDC8E"),
                TierUiItem(5, 1400, "Bronze Badge", "Exclusive Emote Pack", TierState.UNLOCKED, "\uD83C\uDF1F"),
                TierUiItem(6, 2000, "Streak Freeze x2", "Beast Mode Title", TierState.UNLOCKED, "\u2744\uFE0F"),
                TierUiItem(7, 2800, "500 XP Boost", "Crimson Avatar", TierState.LOCKED, "\uD83C\uDFAF"),
                TierUiItem(8, 3800, "Silver Badge", "Lightning Effect", TierState.LOCKED, "\u26A1"),
                TierUiItem(9, 5000, "Gold Badge", "Iron Crown", TierState.LOCKED, "\uD83D\uDC51"),
                TierUiItem(10, 6500, "Legendary Title", "Season Champion Frame", TierState.LOCKED, "\uD83C\uDF1E")
            )
        )
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
            Text(
                text = "BATTLE PASS",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
        }

        // ── Season Info Card ────────────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = uiState.seasonName.uppercase(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = IronRed,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "Season ${uiState.seasonNumber}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = IronTextSecondary
                            )
                        }

                        // Days remaining badge
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(IronRed.copy(alpha = 0.2f))
                                .border(1.dp, IronRed.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Schedule,
                                    contentDescription = null,
                                    tint = IronRed,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${uiState.daysRemaining}d left",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = IronRed
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // XP Progress
                    val maxTierXP = uiState.tiers.maxOf { it.xpRequired }
                    val overallProgress = (uiState.currentXP.toFloat() / maxTierXP.toFloat()).coerceIn(0f, 1f)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "${uiState.currentXP} XP",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = IronTextPrimary
                        )
                        Text(
                            text = "$maxTierXP XP",
                            style = MaterialTheme.typography.bodySmall,
                            color = IronTextTertiary
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { overallProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp),
                        color = IronRed,
                        trackColor = GlassWhite
                    )
                }
            }
        }

        // ── Free / Premium Toggle ───────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilterChip(
                        selected = !showPremium,
                        onClick = { showPremium = false },
                        label = {
                            Text(
                                "FREE TRACK",
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = IronRed,
                            selectedLabelColor = IronTextPrimary,
                            containerColor = Color.Transparent,
                            labelColor = IronTextTertiary
                        )
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    FilterChip(
                        selected = showPremium,
                        onClick = { showPremium = true },
                        label = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.WorkspacePremium,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "PREMIUM",
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                            }
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = IronPurple,
                            selectedLabelColor = IronTextPrimary,
                            containerColor = Color.Transparent,
                            labelColor = IronTextTertiary
                        )
                    )
                }
            }
        }

        // ── Horizontal Tier List ────────────────────────────
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                uiState.tiers.forEach { tier ->
                    TierCard(
                        tier = tier,
                        showPremium = showPremium,
                        currentXP = uiState.currentXP,
                        isPremiumUser = uiState.isPremium
                    )
                }
            }
        }

        // ── Tier Detail List (vertical) ─────────────────────
        item {
            Text(
                text = "ALL TIERS",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = IronTextSecondary,
                letterSpacing = 1.sp
            )
        }

        uiState.tiers.forEach { tier ->
            item(key = "tier_${tier.tier}") {
                TierDetailRow(
                    tier = tier,
                    showPremium = showPremium,
                    currentXP = uiState.currentXP
                )
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun TierCard(
    tier: TierUiItem,
    showPremium: Boolean,
    currentXP: Int,
    isPremiumUser: Boolean
) {
    val reward = if (showPremium) tier.premiumReward else tier.freeReward
    val isLocked = tier.state == TierState.LOCKED
    val accentColor = when (tier.state) {
        TierState.CLAIMED -> IronGreen
        TierState.UNLOCKED -> IronYellow
        TierState.LOCKED -> IronTextTertiary
    }

    GlassCard(
        modifier = Modifier
            .width(130.dp)
            .height(170.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Tier number badge
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(accentColor.copy(alpha = 0.2f))
                    .border(1.dp, accentColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${tier.tier}",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = accentColor
                )
            }

            // Emoji
            Text(
                text = if (isLocked) "\uD83D\uDD12" else tier.emoji,
                fontSize = 28.sp
            )

            // Reward name
            Text(
                text = reward,
                style = MaterialTheme.typography.bodySmall,
                color = if (isLocked) IronTextTertiary else IronTextPrimary,
                textAlign = TextAlign.Center,
                maxLines = 2,
                lineHeight = 14.sp
            )

            // XP requirement
            Text(
                text = "${tier.xpRequired} XP",
                style = MaterialTheme.typography.labelSmall,
                color = IronTextTertiary
            )
        }
    }
}

@Composable
private fun TierDetailRow(
    tier: TierUiItem,
    showPremium: Boolean,
    currentXP: Int
) {
    val reward = if (showPremium) tier.premiumReward else tier.freeReward
    val accentColor = when (tier.state) {
        TierState.CLAIMED -> IronGreen
        TierState.UNLOCKED -> IronYellow
        TierState.LOCKED -> IronTextTertiary
    }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tier number
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(accentColor.copy(alpha = 0.2f))
                    .border(1.dp, accentColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${tier.tier}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = accentColor
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Emoji + reward
            Text(text = tier.emoji, fontSize = 22.sp)
            Spacer(modifier = Modifier.width(8.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = reward,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (tier.state == TierState.LOCKED) IronTextTertiary else IronTextPrimary
                )
                Text(
                    text = "${tier.xpRequired} XP required",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary
                )
            }

            // State indicator / Claim button
            when (tier.state) {
                TierState.CLAIMED -> {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = "Claimed",
                        tint = IronGreen,
                        modifier = Modifier.size(24.dp)
                    )
                }
                TierState.UNLOCKED -> {
                    Button(
                        onClick = { /* TODO: claim reward */ },
                        colors = ButtonDefaults.buttonColors(containerColor = IronRed),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text(
                            "CLAIM",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }
                }
                TierState.LOCKED -> {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = "Locked",
                        tint = IronTextTertiary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
