package com.ironcore.fit.ui.workout

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Train Screen — Root with Lift / Cardio segmented control
// Matches React TrainView.jsx: sliding pill, spring animation
// ══════════════════════════════════════════════════════════════════

private enum class TrainTab(val label: String) {
    LIFT("LIFT"),
    CARDIO("CARDIO")
}

@Composable
fun TrainScreen(
    navController: NavHostController? = null
) {
    var selectedTab by remember { mutableStateOf(TrainTab.LIFT) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Segmented Control ───────────────────────────────────
        SegmentedControl(
            selectedTab = selectedTab,
            onTabSelected = { selectedTab = it },
            modifier = Modifier
                .padding(horizontal = 20.dp, vertical = 12.dp)
        )

        // ── Tab Content ─────────────────────────────────────────
        when (selectedTab) {
            TrainTab.LIFT -> WorkoutScreen(navController = navController)
            TrainTab.CARDIO -> CardioScreen()
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Segmented control with sliding pill indicator
// Spring: stiffness 500, dampingRatio ~0.44 (matches React damping 35)
// ══════════════════════════════════════════════════════════════════

@Composable
private fun SegmentedControl(
    selectedTab: TrainTab,
    onTabSelected: (TrainTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val tabs = TrainTab.entries

    // Animated pill offset as fraction (0f = left, 1f = right)
    val pillOffset by animateFloatAsState(
        targetValue = if (selectedTab == TrainTab.LIFT) 0f else 1f,
        animationSpec = spring(
            stiffness = 500f,
            dampingRatio = 0.4375f  // ~damping 35 / (2 * sqrt(500))
        ),
        label = "pill_offset"
    )

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.04f),
                        Color.White.copy(alpha = 0.02f)
                    )
                )
            )
    ) {
        val tabWidth = maxWidth / tabs.size

        // ── Sliding pill (background indicator) ─────────────
        Box(
            modifier = Modifier
                .offset(x = tabWidth * pillOffset)
                .width(tabWidth)
                .fillMaxHeight()
                .padding(3.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            IronRed.copy(alpha = 0.9f),
                            IronRedDark.copy(alpha = 0.8f)
                        )
                    )
                )
        )

        // ── Tab labels ──────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEach { tab ->
                val isSelected = tab == selectedTab

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onTabSelected(tab) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = tab.label,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        letterSpacing = 2.sp,
                        color = if (isSelected)
                            IronTextPrimary
                        else
                            IronTextTertiary
                    )
                }
            }
        }
    }
}
