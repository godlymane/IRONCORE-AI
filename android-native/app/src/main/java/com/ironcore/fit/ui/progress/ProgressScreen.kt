package com.ironcore.fit.ui.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.components.GlassTier
import com.ironcore.fit.ui.theme.*

@Composable
fun ProgressScreen(
    navController: NavHostController? = null,
    viewModel: ProgressViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 100.dp)
    ) {
        // ── Header ──────────────────────────────────────────
        item {
            Text(
                "Progress",
                style = MaterialTheme.typography.headlineLarge,
                color = IronTextPrimary,
                fontWeight = FontWeight.Bold
            )
        }

        // ── Weight Chart ────────────────────────────────────
        item {
            SectionHeader(icon = Icons.AutoMirrored.Filled.ShowChart, title = "Weight Trend")
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    if (state.currentWeight != null) {
                        Row(
                            verticalAlignment = Alignment.Bottom,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                "%.1f".format(state.currentWeight),
                                style = MaterialTheme.typography.headlineMedium,
                                color = IronTextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "lbs",
                                style = MaterialTheme.typography.bodyMedium,
                                color = IronTextTertiary,
                                modifier = Modifier.padding(bottom = 4.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    WeightChart(
                        entries = state.weightEntries,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // ── Streak Calendar ─────────────────────────────────
        item {
            SectionHeader(icon = Icons.Default.CalendarMonth, title = "Activity Streak")
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        StreakStat(
                            value = state.currentStreak.toString(),
                            label = "Current",
                            color = IronRed
                        )
                        StreakStat(
                            value = state.longestStreak.toString(),
                            label = "Longest",
                            color = IronRedLight
                        )
                        StreakStat(
                            value = state.workoutDates.size.toString(),
                            label = "Total Days",
                            color = IronTextSecondary
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    StreakCalendar(
                        workoutDates = state.workoutDates,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // ── Body Heatmap ────────────────────────────────────
        item {
            SectionHeader(icon = Icons.Default.Person, title = "Muscle Heatmap")
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                BodyHeatmapView(
                    muscleIntensity = state.muscleIntensity,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        // ── Weekly Summary ──────────────────────────────────
        item {
            SectionHeader(icon = Icons.Default.Insights, title = "This Week vs Last")
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ComparisonRow(
                        label = "Workouts",
                        thisWeek = state.weeklySummary.thisWeekWorkouts.toString(),
                        lastWeek = state.weeklySummary.lastWeekWorkouts.toString(),
                        suffix = ""
                    )
                    ComparisonRow(
                        label = "Volume",
                        thisWeek = formatVolume(state.weeklySummary.thisWeekVolume),
                        lastWeek = formatVolume(state.weeklySummary.lastWeekVolume),
                        suffix = "lbs"
                    )
                    ComparisonRow(
                        label = "Calories",
                        thisWeek = state.weeklySummary.thisWeekCalories.toString(),
                        lastWeek = state.weeklySummary.lastWeekCalories.toString(),
                        suffix = "kcal"
                    )
                }
            }
        }

        // ── Personal Records ────────────────────────────────
        item {
            SectionHeader(icon = Icons.Default.EmojiEvents, title = "Personal Records")
        }

        if (state.personalRecords.isEmpty()) {
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "Complete workouts to see your PRs",
                        style = MaterialTheme.typography.bodyMedium,
                        color = IronTextTertiary
                    )
                }
            }
        } else {
            items(state.personalRecords.take(10)) { pr ->
                PRCard(pr)
            }
        }

        // ── Predictive Analytics ────────────────────────────
        item {
            SectionHeader(icon = Icons.Default.AutoGraph, title = "Insights")
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                tier = GlassTier.LIQUID
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    // Recovery Score
                    InsightGauge(
                        label = "Recovery",
                        value = state.predictive.recoveryScore,
                        maxValue = 100,
                        color = when {
                            state.predictive.recoveryScore >= 70 -> IronGreen
                            state.predictive.recoveryScore >= 40 -> IronYellow
                            else -> IronRed
                        },
                        description = when {
                            state.predictive.recoveryScore >= 70 -> "Fully recovered — ready to train"
                            state.predictive.recoveryScore >= 40 -> "Partially recovered — light session OK"
                            else -> "Still recovering — consider rest"
                        }
                    )

                    HorizontalDivider(color = GlassWhite08)

                    // Injury Risk
                    InsightGauge(
                        label = "Injury Risk",
                        value = state.predictive.injuryRisk,
                        maxValue = 100,
                        color = when {
                            state.predictive.injuryRisk <= 20 -> IronGreen
                            state.predictive.injuryRisk <= 40 -> IronYellow
                            else -> IronRed
                        },
                        description = when {
                            state.predictive.injuryRisk <= 20 -> "Low risk — training load is balanced"
                            state.predictive.injuryRisk <= 40 -> "Moderate — watch for overtraining"
                            else -> "High risk — reduce volume this week"
                        }
                    )

                    HorizontalDivider(color = GlassWhite08)

                    // Volume Trend
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                "Volume Trend",
                                style = MaterialTheme.typography.titleSmall,
                                color = IronTextPrimary
                            )
                            Text(
                                "This week vs last week",
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextTertiary
                            )
                        }
                        val trend = state.predictive.volumeTrendPercent
                        val trendColor = when {
                            trend > 5 -> IronGreen
                            trend < -5 -> IronRed
                            else -> IronTextSecondary
                        }
                        val arrow = when {
                            trend > 0 -> "+"
                            else -> ""
                        }
                        Text(
                            "$arrow$trend%",
                            style = MaterialTheme.typography.headlineSmall,
                            color = trendColor,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

// ── Reusable Components ──────────────────────────────────────────

@Composable
private fun SectionHeader(icon: ImageVector, title: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = IronRed,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            color = IronTextPrimary,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun StreakStat(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            value,
            style = MaterialTheme.typography.headlineSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = IronTextTertiary
        )
    }
}

@Composable
private fun ComparisonRow(
    label: String,
    thisWeek: String,
    lastWeek: String,
    suffix: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = IronTextSecondary,
            modifier = Modifier.weight(1f)
        )
        Column(horizontalAlignment = Alignment.End) {
            Text(
                if (suffix.isNotEmpty()) "$thisWeek $suffix" else thisWeek,
                style = MaterialTheme.typography.titleSmall,
                color = IronTextPrimary,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "was ${if (suffix.isNotEmpty()) "$lastWeek $suffix" else lastWeek}",
                style = MaterialTheme.typography.labelSmall,
                color = IronTextTertiary
            )
        }
    }
}

@Composable
private fun PRCard(pr: PersonalRecord) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        highlight = pr.isNew,
        cornerRadius = 16.dp,
        padding = 14.dp
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Trophy icon
            Icon(
                Icons.Default.EmojiEvents,
                contentDescription = null,
                tint = if (pr.isNew) IronRedLight else IronTextTertiary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        pr.exercise,
                        style = MaterialTheme.typography.titleSmall,
                        color = IronTextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (pr.isNew) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "NEW",
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                            color = IronRed,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(IronRed.copy(alpha = 0.15f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    shortDate(pr.date),
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "%.0f lbs".format(pr.weight),
                    style = MaterialTheme.typography.titleMedium,
                    color = IronRed,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "${pr.reps} reps",
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary
                )
            }
        }
    }
}

@Composable
private fun InsightGauge(
    label: String,
    value: Int,
    maxValue: Int,
    color: Color,
    description: String
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                label,
                style = MaterialTheme.typography.titleSmall,
                color = IronTextPrimary
            )
            Text(
                "$value%",
                style = MaterialTheme.typography.titleMedium,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(6.dp))

        // Progress bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(GlassWhite08)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(value.toFloat() / maxValue.coerceAtLeast(1))
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(3.dp))
                    .background(color)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            description,
            style = MaterialTheme.typography.bodySmall,
            color = IronTextTertiary
        )
    }
}

/** "2025-03-06" → "Mar 6" */
private fun shortDate(iso: String): String {
    return try {
        val parts = iso.split("-")
        val month = when (parts[1].toInt()) {
            1 -> "Jan"; 2 -> "Feb"; 3 -> "Mar"; 4 -> "Apr"; 5 -> "May"; 6 -> "Jun"
            7 -> "Jul"; 8 -> "Aug"; 9 -> "Sep"; 10 -> "Oct"; 11 -> "Nov"; 12 -> "Dec"
            else -> "?"
        }
        "$month ${parts[2].toInt()}"
    } catch (_: Exception) { iso }
}

private fun formatVolume(volume: Long): String {
    return when {
        volume >= 1_000_000 -> "%.1fM".format(volume / 1_000_000.0)
        volume >= 1_000 -> "%.1fK".format(volume / 1_000.0)
        else -> volume.toString()
    }
}
