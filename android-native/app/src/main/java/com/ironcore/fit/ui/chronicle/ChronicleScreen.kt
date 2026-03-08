package com.ironcore.fit.ui.chronicle

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.data.model.FeedEvent
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun ChronicleScreen(
    navController: NavHostController? = null,
    viewModel: ChronicleViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dateListState = rememberLazyListState()

    // Auto-scroll to selected date
    LaunchedEffect(uiState.selectedDate) {
        val idx = uiState.dates.indexOfFirst { it.date == uiState.selectedDate }
        if (idx >= 0) {
            dateListState.animateScrollToItem(maxOf(0, idx - 2))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Header ──────────────────────────────────────────
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { navController?.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = IronTextPrimary)
            }
            Text(
                text = "CHRONICLE",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
        }

        // ── Date Selector ───────────────────────────────────
        LazyRow(
            state = dateListState,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            contentPadding = PaddingValues(horizontal = 8.dp)
        ) {
            items(uiState.dates) { dateItem ->
                val isSelected = dateItem.date == uiState.selectedDate
                DateChip(
                    dateItem = dateItem,
                    isSelected = isSelected,
                    onClick = { viewModel.selectDate(dateItem.date) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Content ─────────────────────────────────────────
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = IronRed)
            }
        } else if (uiState.filteredEvents.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.HistoryEdu,
                        contentDescription = null,
                        tint = IronTextTertiary,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No activity for this day",
                        style = MaterialTheme.typography.bodyLarge,
                        color = IronTextTertiary
                    )
                    Text(
                        text = "Complete workouts and earn XP to build your chronicle",
                        style = MaterialTheme.typography.bodySmall,
                        color = IronTextTertiary
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Day summary
                item {
                    DaySummaryCard(events = uiState.filteredEvents)
                }

                // Timeline
                items(uiState.filteredEvents) { event ->
                    TimelineEventCard(event = event)
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

// ── Date Chip ───────────────────────────────────────────────────────

@Composable
private fun DateChip(
    dateItem: DateItem,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) Brush.linearGradient(listOf(IronRed, IronRedDark))
                else Brush.linearGradient(listOf(GlassWhite05, GlassWhite03))
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = dateItem.dayLabel,
            style = MaterialTheme.typography.labelSmall,
            color = if (isSelected) Color.White.copy(alpha = 0.8f) else IronTextTertiary,
            fontSize = 10.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "${dateItem.dayNum}",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Black,
            color = if (isSelected) Color.White else IronTextPrimary
        )
    }
}

// ── Day Summary Card ────────────────────────────────────────────────

@Composable
private fun DaySummaryCard(events: List<FeedEvent>) {
    val workoutCount = events.count { it.type == "workout" || it.type == "workout_complete" }
    val xpGained = events.count { it.type == "xp" || it.type == "level_up" }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            SummaryStatItem(
                icon = Icons.Default.FitnessCenter,
                value = "$workoutCount",
                label = "Workouts",
                color = IronRed
            )
            SummaryStatItem(
                icon = Icons.Default.Timeline,
                value = "${events.size}",
                label = "Events",
                color = IronBlue
            )
            SummaryStatItem(
                icon = Icons.Default.EmojiEvents,
                value = "$xpGained",
                label = "Milestones",
                color = IronYellow
            )
        }
    }
}

@Composable
private fun SummaryStatItem(
    icon: ImageVector,
    value: String,
    label: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
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

// ── Timeline Event Card ─────────────────────────────────────────────

@Composable
private fun TimelineEventCard(event: FeedEvent) {
    val (icon, iconColor) = when (event.type) {
        "workout", "workout_complete" -> Icons.Default.FitnessCenter to IronRed
        "xp" -> Icons.Default.Bolt to IronYellow
        "level_up" -> Icons.AutoMirrored.Filled.TrendingUp to IronGreen
        "achievement" -> Icons.Default.EmojiEvents to IronPurple
        "streak" -> Icons.Default.LocalFireDepartment to IronOrange
        else -> Icons.Default.Circle to IronTextTertiary
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(GlassWhite03, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Timeline dot
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(iconColor.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(18.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = event.message.ifEmpty { event.type.uppercase() },
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = IronTextPrimary
            )
            if (event.details.isNotEmpty()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = event.details,
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextSecondary
                )
            }

            val timeStr = event.createdAt?.toDate()?.let { date ->
                SimpleDateFormat("h:mm a", Locale.US).format(date)
            } ?: ""
            if (timeStr.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
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
