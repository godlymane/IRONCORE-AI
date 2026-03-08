package com.ironcore.fit.ui.arena

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
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
import com.ironcore.fit.data.model.LeaderboardEntry
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ── Tab composable ─────────────────────────────────────────────────

@Composable
fun LeaderboardTab(
    entries: List<LeaderboardEntry>,
    currentUserId: String,
    isLoading: Boolean
) {
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = IronRed)
        }
        return
    }

    if (entries.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No leaderboard data yet", color = IronTextTertiary)
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // ── Your Position Card ──────────────────────────────
        item {
            val userIndex = entries.indexOfFirst { it.id == currentUserId }
            if (userIndex >= 0) {
                UserPositionCard(rank = userIndex + 1, entry = entries[userIndex])
            }
        }

        // ── Leaderboard List ────────────────────────────────
        itemsIndexed(entries) { index, entry ->
            LeaderboardRow(
                rank = index + 1,
                entry = entry,
                isCurrentUser = entry.id == currentUserId
            )
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

// ── Your Position Card ─────────────────────────────────────────────

@Composable
private fun UserPositionCard(rank: Int, entry: LeaderboardEntry) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(listOf(IronRed, IronRedDark))
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "#$rank",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "YOUR POSITION",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = IronRed,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "${formatXP(entry.xp)} XP",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    fontStyle = FontStyle.Italic,
                    color = IronTextPrimary
                )
                Text(
                    text = "${entry.league}  |  Lv. ${entry.level}",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary
                )
            }

            Icon(
                imageVector = Icons.Default.EmojiEvents,
                contentDescription = null,
                tint = IronYellow,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

// ── Leaderboard Row ────────────────────────────────────────────────

@Composable
private fun LeaderboardRow(rank: Int, entry: LeaderboardEntry, isCurrentUser: Boolean) {
    val bgModifier = if (isCurrentUser) {
        Modifier.background(
            Brush.horizontalGradient(
                listOf(GlowRed08, Color.Transparent)
            ),
            RoundedCornerShape(12.dp)
        )
    } else Modifier

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(bgModifier)
            .background(GlassWhite03, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Rank indicator
        Box(
            modifier = Modifier.width(32.dp),
            contentAlignment = Alignment.Center
        ) {
            when (rank) {
                1 -> Icon(
                    Icons.Default.EmojiEvents,
                    contentDescription = "1st",
                    tint = Color(0xFFFFD700),
                    modifier = Modifier.size(22.dp)
                )
                2 -> Icon(
                    Icons.Default.EmojiEvents,
                    contentDescription = "2nd",
                    tint = Color(0xFFC0C0C0),
                    modifier = Modifier.size(20.dp)
                )
                3 -> Icon(
                    Icons.Default.EmojiEvents,
                    contentDescription = "3rd",
                    tint = Color(0xFFCD7F32),
                    modifier = Modifier.size(20.dp)
                )
                else -> Text(
                    text = "#$rank",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = IronTextTertiary
                )
            }
        }

        Spacer(modifier = Modifier.width(10.dp))

        // Avatar
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(if (isCurrentUser) IronRedDark else IronSurfaceElevated),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = entry.username.firstOrNull()?.uppercase() ?: "?",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.width(10.dp))

        // Name + league label
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = entry.username.ifEmpty { "Unknown" },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isCurrentUser) IronRed else IronTextPrimary
                )
                if (isCurrentUser) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "YOU",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                        color = IronRedLight,
                        fontSize = 9.sp,
                        modifier = Modifier
                            .background(IronRedDark.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 1.dp)
                    )
                }
            }
            Text(
                text = "Lv. ${entry.level}  |  ${entry.league}",
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary,
                fontSize = 11.sp
            )
        }

        // XP
        Text(
            text = formatXP(entry.xp),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary
        )
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

private fun formatXP(xp: Long): String = when {
    xp >= 1_000_000 -> "${xp / 1_000_000}.${(xp % 1_000_000) / 100_000}M"
    xp >= 10_000 -> "${xp / 1_000}.${(xp % 1_000) / 100}K"
    xp >= 1_000 -> "${xp / 1_000},${"%03d".format(xp % 1_000)}"
    else -> xp.toString()
}
