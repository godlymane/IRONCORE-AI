package com.ironcore.fit.ui.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*

/**
 * Body heatmap showing muscle group training intensity.
 * Arranged in a body-like grid layout with front/back toggle.
 * Each muscle group cell is colored by tier (0-5).
 *
 * Tier colors match React BodyHeatmap.jsx:
 *   0 = cold grey, 1 = dim grey, 2 = blue, 3 = yellow, 4 = orange, 5 = red
 */
@Composable
fun BodyHeatmapView(
    muscleIntensity: Map<String, Int>,
    modifier: Modifier = Modifier
) {
    var showFront by remember { mutableStateOf(true) }

    Column(modifier = modifier) {
        // Toggle
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            HeatmapToggle(
                label = "Front",
                selected = showFront,
                onClick = { showFront = true }
            )
            Spacer(modifier = Modifier.width(12.dp))
            HeatmapToggle(
                label = "Back",
                selected = !showFront,
                onClick = { showFront = false }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (showFront) {
            FrontView(muscleIntensity)
        } else {
            BackView(muscleIntensity)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Tier legend
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Cold", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary)
            Spacer(modifier = Modifier.width(6.dp))
            for (tier in 0..5) {
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(tierColor(tier))
                )
                if (tier < 5) Spacer(modifier = Modifier.width(4.dp))
            }
            Spacer(modifier = Modifier.width(6.dp))
            Text("Hot", style = MaterialTheme.typography.labelSmall, color = IronTextTertiary)
        }
    }
}

@Composable
private fun FrontView(intensity: Map<String, Int>) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Traps
        MuscleRow(listOf("Traps" to intensity.getOrDefault("Traps", 0)))
        // Shoulders + Chest
        MuscleRow(
            listOf(
                "Shoulders" to intensity.getOrDefault("Shoulders", 0),
                "Chest" to intensity.getOrDefault("Chest", 0),
                "Shoulders" to intensity.getOrDefault("Shoulders", 0)
            ),
            labels = listOf("Delts", "Chest", "Delts")
        )
        // Biceps + Core
        MuscleRow(
            listOf(
                "Biceps" to intensity.getOrDefault("Biceps", 0),
                "Core" to intensity.getOrDefault("Core", 0),
                "Biceps" to intensity.getOrDefault("Biceps", 0)
            ),
            labels = listOf("Biceps", "Abs", "Biceps")
        )
        // Forearms
        MuscleRow(listOf("Forearms" to intensity.getOrDefault("Forearms", 0)))
        // Quads
        MuscleRow(
            listOf(
                "Quads" to intensity.getOrDefault("Quads", 0),
                "Quads" to intensity.getOrDefault("Quads", 0)
            ),
            labels = listOf("Quad L", "Quad R")
        )
        // Calves
        MuscleRow(
            listOf(
                "Calves" to intensity.getOrDefault("Calves", 0),
                "Calves" to intensity.getOrDefault("Calves", 0)
            ),
            labels = listOf("Calf L", "Calf R")
        )
    }
}

@Composable
private fun BackView(intensity: Map<String, Int>) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        // Traps
        MuscleRow(listOf("Traps" to intensity.getOrDefault("Traps", 0)))
        // Rear Delts + Back
        MuscleRow(
            listOf(
                "Shoulders" to intensity.getOrDefault("Shoulders", 0),
                "Back" to intensity.getOrDefault("Back", 0),
                "Shoulders" to intensity.getOrDefault("Shoulders", 0)
            ),
            labels = listOf("Rear Delt", "Lats", "Rear Delt")
        )
        // Triceps + Lower Back
        MuscleRow(
            listOf(
                "Triceps" to intensity.getOrDefault("Triceps", 0),
                "Lower Back" to intensity.getOrDefault("Lower Back", 0),
                "Triceps" to intensity.getOrDefault("Triceps", 0)
            ),
            labels = listOf("Triceps", "Lower Back", "Triceps")
        )
        // Glutes
        MuscleRow(listOf("Glutes" to intensity.getOrDefault("Glutes", 0)))
        // Hamstrings
        MuscleRow(
            listOf(
                "Hamstrings" to intensity.getOrDefault("Hamstrings", 0),
                "Hamstrings" to intensity.getOrDefault("Hamstrings", 0)
            ),
            labels = listOf("Ham L", "Ham R")
        )
        // Calves
        MuscleRow(
            listOf(
                "Calves" to intensity.getOrDefault("Calves", 0),
                "Calves" to intensity.getOrDefault("Calves", 0)
            ),
            labels = listOf("Calf L", "Calf R")
        )
    }
}

@Composable
private fun MuscleRow(
    muscles: List<Pair<String, Int>>,
    labels: List<String>? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(0.85f),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)
    ) {
        muscles.forEachIndexed { index, (_, tier) ->
            val label = labels?.getOrNull(index) ?: muscles[index].first
            MuscleCell(label = label, tier = tier, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun MuscleCell(
    label: String,
    tier: Int,
    modifier: Modifier = Modifier
) {
    val bgColor = tierColor(tier)
    val borderColor = if (tier >= 4) {
        tierColor(tier).copy(alpha = 0.6f)
    } else {
        Color.White.copy(alpha = 0.06f)
    }

    Box(
        modifier = modifier
            .height(36.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor.copy(alpha = 0.25f))
            .border(1.dp, borderColor, RoundedCornerShape(8.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = if (tier >= 3) IronTextPrimary else IronTextTertiary
        )
    }
}

@Composable
private fun HeatmapToggle(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val bg = if (selected) IronRed.copy(alpha = 0.2f) else Color.Transparent
    val border = if (selected) IronRed.copy(alpha = 0.4f) else GlassWhite10

    androidx.compose.material3.TextButton(
        onClick = onClick,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(8.dp))
    ) {
        Text(
            label,
            color = if (selected) IronRed else IronTextTertiary,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

/** Tier → color, matching React BodyHeatmap.jsx */
private fun tierColor(tier: Int): Color = when (tier) {
    0 -> Color(0xFF1F2937) // cold grey
    1 -> Color(0xFF374151) // dim grey
    2 -> Color(0xFF0EA5E9) // blue
    3 -> Color(0xFFEAB308) // yellow
    4 -> Color(0xFFF97316) // orange
    5 -> Color(0xFFEF4444) // red
    else -> Color(0xFF1F2937)
}
