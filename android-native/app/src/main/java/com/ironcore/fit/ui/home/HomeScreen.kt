package com.ironcore.fit.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.data.model.Meal
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ─────────────────────────────────────────────────────────────────────
// Reusable ProgressRing — Canvas arc with glow
// ─────────────────────────────────────────────────────────────────────
@Composable
fun ProgressRing(
    progress: Float,          // 0f..1f
    modifier: Modifier = Modifier,
    size: Dp = 120.dp,
    strokeWidth: Dp = 8.dp,
    trackColor: Color = Color.White.copy(alpha = 0.1f),
    progressColor: Color = IronRed,
    glowColor: Color = progressColor.copy(alpha = 0.4f),
    content: @Composable () -> Unit = {}
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "ring_progress"
    )

    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        // Draw arc on a Canvas behind the content
        Box(
            modifier = Modifier
                .matchParentSize()
                .drawBehind {
                    val stroke = strokeWidth.toPx()
                    val arcSize = Size(
                        this.size.width - stroke,
                        this.size.height - stroke
                    )
                    val topLeft = Offset(stroke / 2f, stroke / 2f)

                    // Track
                    drawArc(
                        color = trackColor,
                        startAngle = -90f,
                        sweepAngle = 360f,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = stroke, cap = StrokeCap.Round)
                    )

                    // Progress arc
                    val sweep = animatedProgress * 360f
                    if (sweep > 0f) {
                        drawArc(
                            color = progressColor,
                            startAngle = -90f,
                            sweepAngle = sweep,
                            useCenter = false,
                            topLeft = topLeft,
                            size = arcSize,
                            style = Stroke(width = stroke, cap = StrokeCap.Round)
                        )
                        // Glow layer
                        drawArc(
                            color = glowColor,
                            startAngle = -90f,
                            sweepAngle = sweep,
                            useCenter = false,
                            topLeft = topLeft,
                            size = arcSize,
                            style = Stroke(width = stroke + 4.dp.toPx(), cap = StrokeCap.Round)
                        )
                    }
                }
        )
        content()
    }
}

// ─────────────────────────────────────────────────────────────────────
// HomeScreen (Dashboard)
// ─────────────────────────────────────────────────────────────────────
@Composable
fun HomeScreen(
    navController: NavHostController? = null,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Entrance animation
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { visible = true }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(400))
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(IronBlack),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // ── Header ──────────────────────────────────────────
            item { DashboardHeader(uiState) }

            // ── Main Stats (Calorie + Protein Rings) ────────────
            item { MainStatsCard(uiState) }

            // ── Daily Drop Challenge ────────────────────────────
            item {
                DailyDropCard(
                    challenge = uiState.dailyDrop,
                    completed = uiState.dropCompleted,
                    claiming = uiState.dropClaiming,
                    onComplete = { viewModel.completeDailyDrop() }
                )
            }

            // ── Quick Action Buttons ────────────────────────────
            item {
                QuickActionsRow(
                    loading = uiState.quickLogLoading,
                    onLog = { preset -> viewModel.logQuickMeal(preset) }
                )
            }

            // ── Today's Meals ───────────────────────────────────
            item {
                TodaysMealsList(meals = uiState.todaysMeals.takeLast(5))
            }

            // ── Motivation Card ─────────────────────────────────
            item { MotivationCard() }

            // Bottom spacer for nav bar
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// Dashboard Header
// ─────────────────────────────────────────────────────────────────────
@Composable
private fun DashboardHeader(state: HomeUiState) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Left: Avatar area + text
        Row(verticalAlignment = Alignment.CenterVertically) {
            // Profile circle with level badge
            Box {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(IronCard)
                        .border(
                            width = 2.dp,
                            brush = Brush.linearGradient(
                                colors = listOf(IronRed, IronRedDark)
                            ),
                            shape = RoundedCornerShape(14.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = state.displayName.firstOrNull()?.uppercase() ?: "R",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        color = IronTextSecondary
                    )
                }

                // Level badge
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .offset(x = 4.dp, y = 4.dp)
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(IronRed, IronRedDark)
                            ),
                            shape = RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 5.dp, vertical = 1.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${state.level}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "DASHBOARD",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    fontStyle = FontStyle.Italic,
                    color = IronTextPrimary,
                    letterSpacing = (-0.5).sp
                )
                if (state.goal.isNotEmpty()) {
                    Text(
                        text = "${state.goal} Protocol",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = IronRedLight,
                        letterSpacing = 1.sp
                    )
                }
            }
        }

        // Right: XP + Streak badges
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            // XP badge
            BadgePill(
                icon = Icons.Default.EmojiEvents,
                text = "${state.xp}",
                iconTint = IronYellow,
                textColor = IronYellow,
                borderColor = IronYellow.copy(alpha = 0.3f),
                bgBrush = Brush.linearGradient(
                    colors = listOf(
                        IronYellow.copy(alpha = 0.15f),
                        IronYellow.copy(alpha = 0.05f)
                    )
                )
            )

            // Streak badge
            BadgePill(
                icon = Icons.Default.LocalFireDepartment,
                text = "${state.streak}",
                iconTint = IronOrange,
                textColor = IronOrange,
                borderColor = IronOrange.copy(alpha = 0.3f),
                bgBrush = Brush.linearGradient(
                    colors = listOf(
                        IronOrange.copy(alpha = 0.15f),
                        IronOrange.copy(alpha = 0.05f)
                    )
                )
            )
        }
    }
}

@Composable
private fun BadgePill(
    icon: ImageVector,
    text: String,
    iconTint: Color,
    textColor: Color,
    borderColor: Color,
    bgBrush: Brush
) {
    Row(
        modifier = Modifier
            .background(bgBrush, RoundedCornerShape(12.dp))
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(14.dp)
        )
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Black,
            color = textColor
        )
    }
}

// ─────────────────────────────────────────────────────────────────────
// Main Stats Card — Calorie + Protein Rings + Macro Badges
// ─────────────────────────────────────────────────────────────────────
@Composable
private fun MainStatsCard(state: HomeUiState) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Two rings side by side
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Calorie Ring
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    ProgressRing(
                        progress = state.calorieProgress,
                        size = 130.dp,
                        strokeWidth = 10.dp,
                        progressColor = IronRed,
                        glowColor = IronRed.copy(alpha = 0.35f)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "${state.netCalories}",
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Black,
                                color = IronTextPrimary
                            )
                            Text(
                                text = "/ ${state.dailyTarget}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = IronTextTertiary
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "CALORIES",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = IronTextSecondary,
                        letterSpacing = 2.sp
                    )
                    Text(
                        text = "${state.caloriesLeft} left",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = IronRed
                    )
                }

                // Protein Ring
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    ProgressRing(
                        progress = state.proteinProgress,
                        size = 100.dp,
                        strokeWidth = 8.dp,
                        progressColor = IronBlue,
                        glowColor = IronBlue.copy(alpha = 0.35f)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "${state.totalProtein.toInt()}g",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black,
                                color = IronTextPrimary
                            )
                            Text(
                                text = "/ ${state.dailyProteinTarget}g",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = IronTextTertiary
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "PROTEIN",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = IronTextSecondary,
                        letterSpacing = 2.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Macro mini badges row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                MacroMiniBadge(
                    label = "Carbs",
                    value = "${state.totalCarbs.toInt()}g",
                    color = IronYellow
                )
                MacroMiniBadge(
                    label = "Fat",
                    value = "${state.totalFat.toInt()}g",
                    color = IronOrange
                )
                MacroMiniBadge(
                    label = "Burned",
                    value = "${state.todaysBurned}",
                    color = IronGreen
                )
            }
        }
    }
}

@Composable
private fun MacroMiniBadge(
    label: String,
    value: String,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .background(
                color.copy(alpha = 0.08f),
                RoundedCornerShape(10.dp)
            )
            .border(
                1.dp,
                color.copy(alpha = 0.2f),
                RoundedCornerShape(10.dp)
            )
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = value,
            fontSize = 14.sp,
            fontWeight = FontWeight.Black,
            color = color
        )
        Text(
            text = label.uppercase(),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = color.copy(alpha = 0.7f),
            letterSpacing = 1.sp
        )
    }
}

// ─────────────────────────────────────────────────────────────────────
// Daily Drop Challenge Card
// ─────────────────────────────────────────────────────────────────────
@Composable
private fun DailyDropCard(
    challenge: DailyChallenge,
    completed: Boolean,
    claiming: Boolean,
    onComplete: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        IronRed.copy(alpha = 0.2f),
                        IronRedDark.copy(alpha = 0.08f)
                    )
                )
            )
            .border(
                1.dp,
                IronRed.copy(alpha = 0.3f),
                RoundedCornerShape(16.dp)
            )
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left: challenge info
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "DAILY DROP",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = IronRed,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.Default.Bolt,
                        contentDescription = null,
                        tint = IronYellow,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "+${challenge.xpReward} XP",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = IronYellow
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "${challenge.emoji}  ${challenge.title}",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = IronTextPrimary
                )
            }

            // Right: Complete/Done button
            if (completed) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(IronGreen.copy(alpha = 0.2f), CircleShape)
                        .border(1.dp, IronGreen.copy(alpha = 0.4f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Done",
                        tint = IronGreen,
                        modifier = Modifier.size(22.dp)
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(IronRed, IronRedDark)
                            )
                        )
                        .clickable(enabled = !claiming) { onComplete() }
                        .padding(horizontal = 18.dp, vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (claiming) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = "CLAIM",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// Quick Action Buttons (Water, Protein Shake, 2 Eggs, Chicken Breast)
// ─────────────────────────────────────────────────────────────────────
@Composable
private fun QuickActionsRow(
    loading: Boolean,
    onLog: (QuickMealPreset) -> Unit
) {
    Column {
        Text(
            text = "QUICK LOG",
            fontSize = 10.sp,
            fontWeight = FontWeight.Black,
            color = IronTextTertiary,
            letterSpacing = 2.sp,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            QUICK_MEAL_PRESETS.forEach { preset ->
                QuickActionButton(
                    preset = preset,
                    enabled = !loading,
                    onClick = { onLog(preset) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun QuickActionButton(
    preset: QuickMealPreset,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(GlassWhite)
            .border(1.dp, GlassBorder, RoundedCornerShape(14.dp))
            .clickable(enabled = enabled) { onClick() }
            .padding(vertical = 12.dp, horizontal = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = preset.emoji,
            fontSize = 24.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = preset.name,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = IronTextSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center
        )
        if (preset.calories > 0) {
            Text(
                text = "${preset.calories} cal",
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextTertiary
            )
        } else {
            Text(
                text = "+250ml",
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = IronBlue
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// Today's Meals Mini-List
// ─────────────────────────────────────────────────────────────────────
@Composable
private fun TodaysMealsList(meals: List<Meal>) {
    if (meals.isEmpty()) return

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "TODAY'S MEALS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = IronTextTertiary,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "${meals.size} logged",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextTertiary
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            meals.reversed().forEach { meal ->
                MealRow(meal)
                if (meal != meals.first()) {
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun MealRow(meal: Meal) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Color.White.copy(alpha = 0.04f),
                RoundedCornerShape(10.dp)
            )
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Restaurant,
                contentDescription = null,
                tint = IronRedLight,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = meal.name.ifEmpty { "Meal" },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${meal.protein.toInt()}p  ${meal.carbs.toInt()}c  ${meal.fat.toInt()}f",
                    fontSize = 10.sp,
                    color = IronTextTertiary
                )
            }
        }

        Text(
            text = "${meal.calories} cal",
            fontSize = 13.sp,
            fontWeight = FontWeight.Black,
            color = IronTextSecondary
        )
    }
}

// ─────────────────────────────────────────────────────────────────────
// Motivation Card
// ─────────────────────────────────────────────────────────────────────
@Composable
private fun MotivationCard() {
    val quotes = listOf(
        "The only bad workout is the one that didn't happen.",
        "Push harder than yesterday if you want a different tomorrow.",
        "Your body can stand almost anything. It's your mind you have to convince.",
        "Success isn't always about greatness. It's about consistency.",
        "The pain you feel today will be the strength you feel tomorrow.",
        "Don't stop when you're tired. Stop when you're done.",
        "Champions aren't made in gyms. Champions are made from something deep inside.",
        "Discipline is choosing between what you want now and what you want most."
    )

    val todayQuote = remember {
        quotes[java.time.LocalDate.now().dayOfYear % quotes.size]
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        GlassWhite,
                        Color.Transparent
                    )
                )
            )
            .border(1.dp, GlassBorder, RoundedCornerShape(16.dp))
            .padding(20.dp)
    ) {
        Column {
            Text(
                text = "DAILY FUEL",
                fontSize = 9.sp,
                fontWeight = FontWeight.Black,
                color = IronTextTertiary,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "\"$todayQuote\"",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                fontStyle = FontStyle.Italic,
                color = IronTextSecondary,
                lineHeight = 20.sp
            )
        }
    }
}
