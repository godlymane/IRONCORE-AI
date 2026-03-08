package com.ironcore.fit.ui.arena

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.components.GlassTier
import com.ironcore.fit.ui.theme.*

// ── Arena sub-tab definitions ──────────────────────────────────────

private enum class ArenaTab(val label: String, val icon: ImageVector) {
    LEADERBOARD("Leaderboard", Icons.Default.EmojiEvents),
    CHAT("Chat", Icons.Default.Forum),
    BATTLES("Battles", Icons.Default.Bolt)
}

@Composable
fun ArenaScreen(
    navController: NavHostController? = null,
    viewModel: CommunityViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(ArenaTab.LEADERBOARD) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Header ──────────────────────────────────────────────
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            Text(
                text = "ARENA",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
                fontStyle = FontStyle.Italic,
                color = IronTextPrimary,
                letterSpacing = 3.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Compete. Dominate. Rise.",
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary,
                letterSpacing = 1.sp
            )
        }

        // ── Sub-Tab Bar ─────────────────────────────────────────
        ArenaTabBar(
            selectedTab = selectedTab,
            onTabSelected = { selectedTab = it }
        )

        Spacer(modifier = Modifier.height(8.dp))

        // ── Quick Actions ───────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            QuickActionChip(
                icon = Icons.Default.Shield,
                label = "Battle Pass",
                modifier = Modifier.weight(1f),
                onClick = { navController?.navigate("battle_pass") }
            )
            QuickActionChip(
                icon = Icons.Default.Stars,
                label = "Achievements",
                modifier = Modifier.weight(1f),
                onClick = { navController?.navigate("achievements") }
            )
            QuickActionChip(
                icon = Icons.Default.Groups,
                label = "Guild",
                modifier = Modifier.weight(1f),
                onClick = { navController?.navigate("guild_dashboard") }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Tab Content ─────────────────────────────────────────
        when (selectedTab) {
            ArenaTab.LEADERBOARD -> LeaderboardTab(
                entries = uiState.leaderboard,
                currentUserId = uiState.currentUserId,
                isLoading = uiState.isLoading
            )
            ArenaTab.CHAT -> CommunityChatTab(
                messages = uiState.chatMessages,
                currentUserId = uiState.currentUserId,
                onSend = { viewModel.sendChatMessage(it) }
            )
            ArenaTab.BATTLES -> BattlesTab(navController = navController)
        }
    }
}

// ── Sub-Tab Bar ─────────────────────────────────────────────────────

@Composable
private fun ArenaTabBar(
    selectedTab: ArenaTab,
    onTabSelected: (ArenaTab) -> Unit
) {
    GlassCard(
        tier = GlassTier.NAV,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ArenaTab.entries.forEach { tab ->
                val isSelected = tab == selectedTab
                val tint by animateColorAsState(
                    targetValue = if (isSelected) IronRed else IronTextTertiary,
                    animationSpec = spring(),
                    label = "tabTint"
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .then(
                            if (isSelected) Modifier.background(GlowRed08)
                            else Modifier
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onTabSelected(tab) }
                        .padding(vertical = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.label,
                        tint = tint,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = tab.label.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
                        color = tint,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}

// ── Quick-Action Chip ───────────────────────────────────────────────

@Composable
private fun QuickActionChip(
    icon: ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    GlassCard(
        modifier = modifier.clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
            onClick = onClick
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = IronRed,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = IronTextSecondary,
                letterSpacing = 0.5.sp,
                fontSize = 9.sp
            )
        }
    }
}
