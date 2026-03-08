package com.ironcore.fit.ui.achievements

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ── Local state models ──────────────────────────────────────────

private enum class Rarity(val label: String, val color: Color) {
    COMMON("Common", Color(0xFF9CA3AF)),        // gray-400
    UNCOMMON("Uncommon", Color(0xFF22C55E)),     // green
    RARE("Rare", Color(0xFF3B82F6)),             // blue
    EPIC("Epic", Color(0xFFA855F7)),             // purple
    LEGENDARY("Legendary", Color(0xFFF59E0B))    // amber/gold
}

private data class AchievementUiItem(
    val id: String,
    val title: String,
    val description: String,
    val emoji: String,
    val category: String,     // "strength"|"consistency"|"social"|"nutrition"
    val rarity: Rarity = Rarity.COMMON,
    val xpReward: Int,
    val progress: Float,      // 0.0 to 1.0
    val unlocked: Boolean
)

private val categoryColors = mapOf(
    "strength" to Color(0xFFDC2626),   // IronRed
    "consistency" to Color(0xFFFBBF24), // IronYellow
    "social" to Color(0xFFA855F7),     // IronPurple
    "nutrition" to Color(0xFF22C55E)   // IronGreen
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AchievementsScreen(navController: NavHostController? = null) {
    var selectedCategory by remember { mutableStateOf<String?>(null) }

    val achievements = remember {
        listOf(
            // Strength
            AchievementUiItem("s1", "First Rep", "Complete your first workout", "\uD83D\uDCAA", "strength", Rarity.COMMON, 50, 1f, true),
            AchievementUiItem("s2", "Iron Foundation", "Log 10 workouts", "\uD83C\uDFCB\uFE0F", "strength", Rarity.UNCOMMON, 100, 0.7f, false),
            AchievementUiItem("s3", "Century Club", "Complete 100 workouts", "\uD83D\uDD25", "strength", Rarity.EPIC, 500, 0.23f, false),
            AchievementUiItem("s4", "1RM Breaker", "Set a new personal record", "\uD83C\uDFC6", "strength", Rarity.RARE, 150, 1f, true),
            AchievementUiItem("s5", "Volume King", "Log 100,000 lbs total volume", "\uD83D\uDC51", "strength", Rarity.LEGENDARY, 300, 0.45f, false),
            // Consistency
            AchievementUiItem("c1", "Spark", "3-day streak", "\u26A1", "consistency", Rarity.COMMON, 50, 1f, true),
            AchievementUiItem("c2", "On Fire", "7-day streak", "\uD83D\uDD25", "consistency", Rarity.UNCOMMON, 100, 0.57f, false),
            AchievementUiItem("c3", "Unstoppable", "30-day streak", "\uD83C\uDF1F", "consistency", Rarity.LEGENDARY, 300, 0.13f, false),
            AchievementUiItem("c4", "Early Bird", "Log a workout before 7 AM", "\uD83C\uDF05", "consistency", Rarity.RARE, 75, 0f, false),
            // Social
            AchievementUiItem("o1", "Team Player", "Join a guild", "\uD83D\uDEE1\uFE0F", "social", Rarity.COMMON, 50, 1f, true),
            AchievementUiItem("o2", "Arena Warrior", "Win 5 arena battles", "\u2694\uFE0F", "social", Rarity.RARE, 150, 0.4f, false),
            AchievementUiItem("o3", "Boss Slayer", "Deal 10K damage to community boss", "\uD83D\uDC79", "social", Rarity.EPIC, 200, 0.65f, false),
            // Nutrition
            AchievementUiItem("n1", "Fuel Up", "Log your first meal", "\uD83C\uDF7D\uFE0F", "nutrition", Rarity.COMMON, 50, 1f, true),
            AchievementUiItem("n2", "Macro Master", "Hit your macro targets 7 days in a row", "\uD83C\uDFAF", "nutrition", Rarity.EPIC, 200, 0.28f, false),
            AchievementUiItem("n3", "Hydrated", "Log 8 glasses of water 5 days in a row", "\uD83D\uDCA7", "nutrition", Rarity.UNCOMMON, 100, 0.6f, false),
            AchievementUiItem("n4", "Clean Eater", "Log 30 meals with all macros tracked", "\uD83E\uDD57", "nutrition", Rarity.RARE, 150, 0.33f, false)
        )
    }

    val categories = listOf("strength", "consistency", "social", "nutrition")
    val filteredAchievements = if (selectedCategory != null) {
        achievements.filter { it.category == selectedCategory }
    } else achievements

    // Summary stats
    val totalUnlocked = achievements.count { it.unlocked }
    val totalXPEarned = achievements.filter { it.unlocked }.sumOf { it.xpReward }
    val rarityBreakdown = Rarity.entries.associateWith { r ->
        achievements.count { it.rarity == r && it.unlocked } to achievements.count { it.rarity == r }
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ── Header ──────────────────────────────────────────
        item(span = { GridItemSpan(2) }) {
            Column {
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "ACHIEVEMENTS",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    letterSpacing = 2.sp
                )
            }
        }

        // ── Summary Card ────────────────────────────────────
        item(span = { GridItemSpan(2) }) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$totalUnlocked",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = IronYellow
                        )
                        Text(
                            text = "/ ${achievements.size} Unlocked",
                            style = MaterialTheme.typography.bodySmall,
                            color = IronTextTertiary
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "$totalXPEarned",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = IronRed
                        )
                        Text(
                            text = "XP Earned",
                            style = MaterialTheme.typography.bodySmall,
                            color = IronTextTertiary
                        )
                    }
                }
            }
        }

        // ── Rarity Collection Progress ──────────────────────
        item(span = { GridItemSpan(2) }) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "COLLECTION",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronTextSecondary,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Rarity.entries.forEach { rarity ->
                        val (collected, total) = rarityBreakdown[rarity] ?: (0 to 0)
                        if (total > 0) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 3.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = rarity.label,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = rarity.color,
                                    modifier = Modifier.width(80.dp)
                                )
                                LinearProgressIndicator(
                                    progress = { collected.toFloat() / total.toFloat() },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(4.dp),
                                    color = rarity.color,
                                    trackColor = GlassWhite
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "$collected/$total",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = IronTextTertiary,
                                    modifier = Modifier.width(28.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // ── Category Filter Chips ───────────────────────────
        item(span = { GridItemSpan(2) }) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedCategory == null,
                    onClick = { selectedCategory = null },
                    label = { Text("All", fontWeight = FontWeight.Bold) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = IronRed,
                        selectedLabelColor = IronTextPrimary,
                        containerColor = Color.Transparent,
                        labelColor = IronTextTertiary
                    )
                )
                categories.forEach { cat ->
                    val catColor = categoryColors[cat] ?: IronTextTertiary
                    FilterChip(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = if (selectedCategory == cat) null else cat },
                        label = {
                            Text(
                                cat.replaceFirstChar { it.uppercase() },
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = catColor,
                            selectedLabelColor = IronBlack,
                            containerColor = Color.Transparent,
                            labelColor = IronTextTertiary
                        )
                    )
                }
            }
        }

        // ── Achievement Grid ────────────────────────────────
        items(filteredAchievements, key = { it.id }) { achievement ->
            AchievementCard(achievement)
        }

        // Bottom spacer
        item(span = { GridItemSpan(2) }) {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun AchievementCard(achievement: AchievementUiItem) {
    val catColor = categoryColors[achievement.category] ?: IronTextTertiary
    val cardAlpha = if (achievement.unlocked) 1f else 0.55f

    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(cardAlpha)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Emoji icon — border uses rarity color when unlocked
            val borderColor = if (achievement.unlocked) achievement.rarity.color else Color.Transparent
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (achievement.unlocked) borderColor.copy(alpha = 0.15f)
                        else GlassWhite
                    )
                    .then(
                        if (achievement.unlocked) Modifier.border(1.5.dp, borderColor, CircleShape)
                        else Modifier
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (achievement.unlocked) achievement.emoji else "\uD83D\uDD12",
                    fontSize = 22.sp
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Title
            Text(
                text = achievement.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (achievement.unlocked) IronTextPrimary else IronTextTertiary,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Description
            Text(
                text = achievement.description,
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 14.sp
            )

            // Rarity label
            Text(
                text = achievement.rarity.label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = if (achievement.unlocked) achievement.rarity.color else IronTextTertiary,
                fontSize = 9.sp,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Progress bar
            LinearProgressIndicator(
                progress = { achievement.progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp),
                color = if (achievement.unlocked) catColor else IronTextTertiary,
                trackColor = GlassWhite
            )

            Spacer(modifier = Modifier.height(6.dp))

            // XP reward
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Star,
                    contentDescription = null,
                    tint = if (achievement.unlocked) IronYellow else IronTextTertiary,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "+${achievement.xpReward} XP",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (achievement.unlocked) IronYellow else IronTextTertiary
                )
            }
        }
    }
}
