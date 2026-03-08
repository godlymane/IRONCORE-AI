package com.ironcore.fit.ui.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * GitHub contribution-style streak calendar.
 * Shows last 90 days as a grid of colored cells.
 * Workout days = red, empty days = dark grey.
 */
@Composable
fun StreakCalendar(
    workoutDates: Set<String>,
    modifier: Modifier = Modifier
) {
    val fmt = DateTimeFormatter.ISO_LOCAL_DATE
    val today = remember { LocalDate.now() }
    val days = remember(today) { 90 }
    val startDate = remember(today) { today.minusDays(days.toLong() - 1) }

    // Build grid: 7 rows (Mon-Sun) x N weeks
    val weeks = remember(today, workoutDates) {
        val grid = mutableListOf<List<DayCell>>()
        var current = startDate

        // Align to Monday
        while (current.dayOfWeek.value != 1 && current.isBefore(today.plusDays(1))) {
            current = current.plusDays(1)
        }
        current = startDate

        val allDays = mutableListOf<DayCell>()
        while (!current.isAfter(today)) {
            val dateStr = current.format(fmt)
            allDays.add(DayCell(dateStr, workoutDates.contains(dateStr)))
            current = current.plusDays(1)
        }

        // Pad start to align with day of week
        val firstDow = startDate.dayOfWeek.value // 1=Mon, 7=Sun
        val padded = MutableList(firstDow - 1) { DayCell("", false) } + allDays

        // Split into weeks (columns of 7)
        padded.chunked(7).forEach { week ->
            grid.add(week)
        }
        grid
    }

    Column(modifier = modifier) {
        // Day labels
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val dayLabels = listOf("M", "T", "W", "T", "F", "S", "S")
            dayLabels.forEach { label ->
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = IronTextTertiary,
                    modifier = Modifier.width(12.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Calendar grid — rows = day of week, columns = weeks
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            weeks.forEach { weekDays ->
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    weekDays.forEach { day ->
                        val color = when {
                            day.date.isEmpty() -> IronBlack // padding cell
                            day.hasWorkout -> IronRed
                            else -> Color_CellEmpty
                        }
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(color)
                        )
                    }
                    // Pad short weeks
                    repeat(7 - weekDays.size) {
                        Box(modifier = Modifier.size(12.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Legend
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("Less", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary)
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color_CellEmpty)
            )
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(IronRedDark)
            )
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(IronRed)
            )
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(IronRedLight)
            )
            Text("More", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary)
        }
    }
}

private data class DayCell(val date: String, val hasWorkout: Boolean)

private val Color_CellEmpty = GlassWhite08
