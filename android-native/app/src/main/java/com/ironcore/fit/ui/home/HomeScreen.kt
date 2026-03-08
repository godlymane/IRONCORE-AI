package com.ironcore.fit.ui.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MonitorWeight
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
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
import android.content.Intent
import android.os.Build
import com.ironcore.fit.data.model.Meal
import com.ironcore.fit.ui.components.DashboardSkeleton
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.components.GlassTier
import com.ironcore.fit.ui.components.IronPullToRefresh
import com.ironcore.fit.ui.components.LiquidGlassCard
import com.ironcore.fit.ui.components.StandardGlassCard
import com.ironcore.fit.ui.components.ProgressShimmer
import com.ironcore.fit.ui.theme.*
import com.nova.companion.biohack.audio.NeuroAudioService

// ─────────────────────────────────────────────────────────────────────
// Forge helper — multiplier & fire color based on streak days
// Matches ForgeHUD.jsx thresholds exactly
// ─────────────────────────────────────────────────────────────────────

private fun forgeMultiplier(days: Int): String = when {
    days >= 30 -> "x3"
    days >= 14 -> "x2.5"
    days >= 7  -> "x2"
    days >= 3  -> "x1.5"
    else       -> "x1"
}

private fun forgeFireColor(days: Int): Color = when {
    days >= 30 -> IronYellow        // gold
    days >= 14 -> IronOrange        // orange
    days >= 7  -> IronRedLight      // bright red
    days >= 3  -> IronRed           // red
    else       -> IconInactive      // grey
}

// ─────────────────────────────────────────────────────────────────────
// Iron Score color thresholds — matches DashboardView.jsx
// ─────────────────────────────────────────────────────────────────────

private fun ironScoreColor(score: Int): Color = when {
    score >= 80 -> IronYellow       // gold
    score >= 60 -> IronOrange       // orange
    score >= 30 -> IronRed          // red
    else        -> IconInactive     // grey
}

// ─────────────────────────────────────────────────────────────────────
// Reusable ProgressRing — Canvas arc with glow
// ─────────────────────────────────────────────────────────────────────
@Composable
fun ProgressRing(
    progress: Float,
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

// ═════════════════════════════════════════════════════════════════════
// ExpBar — 4px red gradient progress bar with shimmer + level badge
// Matches ExpBar.jsx exactly
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun ExpBar(state: HomeUiState) {
    val animatedProgress by animateFloatAsState(
        targetValue = state.xpProgress.coerceIn(0f, 1f),
        animationSpec = tween(800, easing = FastOutSlowInEasing),
        label = "xpBar"
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        // Top row: Level + XP text
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Level badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .background(
                            brush = Brush.linearGradient(
                                colors = listOf(IronRed, IronRedDark)
                            ),
                            shape = RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "LV ${state.level}",
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        color = Color.White,
                        letterSpacing = 0.5.sp
                    )
                }
                Text(
                    text = "${state.xpInLevel} / ${state.xpForNextLevel} XP",
                    fontFamily = JetBrainsMonoFontFamily,
                    fontWeight = FontWeight.Medium,
                    fontSize = 10.sp,
                    color = IronTextTertiary
                )
            }

            // Total XP
            Text(
                text = "${state.xp} XP",
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
                color = IronRedLight
            )
        }

        // Progress bar — 4px height with shimmer
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color.White.copy(alpha = 0.08f))
        ) {
            // Fill
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(animatedProgress)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(IronRedDark, IronRed, IronRedLight)
                        )
                    )
            ) {
                // Shimmer overlay on fill
                ProgressShimmer(
                    modifier = Modifier.fillMaxSize(),
                    durationMillis = 2000,
                    shimmerColor = Color.White.copy(alpha = 0.25f)
                )
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// ForgeHUD — Streak fire icon + multiplier + shield
// Matches ForgeHUD.jsx exactly
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun ForgeHUD(state: HomeUiState) {
    val days = state.currentForge
    val fireColor = forgeFireColor(days)
    val multiplier = forgeMultiplier(days)
    val pulseScale = rememberPulseScale(
        minScale = 1f,
        maxScale = if (days >= 7) 1.08f else 1f,
        durationMillis = 1500
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Left: Fire + streak count + multiplier
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Fire icon with pulse
            Icon(
                imageVector = Icons.Default.LocalFireDepartment,
                contentDescription = "Forge streak",
                tint = fireColor,
                modifier = Modifier
                    .size(22.dp)
                    .graphicsLayer {
                        scaleX = pulseScale
                        scaleY = pulseScale
                    }
            )

            // Streak count
            Text(
                text = "$days",
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = fireColor
            )
            Text(
                text = "DAY FORGE",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 11.sp,
                color = IronTextTertiary,
                letterSpacing = 1.5.sp
            )

            // Multiplier badge
            if (days >= 3) {
                Box(
                    modifier = Modifier
                        .background(
                            fireColor.copy(alpha = 0.15f),
                            RoundedCornerShape(6.dp)
                        )
                        .border(
                            1.dp,
                            fireColor.copy(alpha = 0.3f),
                            RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = multiplier,
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        color = fireColor
                    )
                }
            }
        }

        // Right: Shield count + longest streak
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Shield button
            if (state.forgeShieldCount > 0) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                    modifier = Modifier
                        .background(
                            IronBlue.copy(alpha = 0.1f),
                            RoundedCornerShape(8.dp)
                        )
                        .border(
                            1.dp,
                            IronBlue.copy(alpha = 0.25f),
                            RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Streak shields",
                        tint = IronBlue,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "${state.forgeShieldCount}",
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = IronBlue
                    )
                }
            }

            // Best streak
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "BEST",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 8.sp,
                    color = IronTextTertiary,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "${state.longestForge}d",
                    fontFamily = JetBrainsMonoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = IronTextSecondary
                )
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// Iron Score Card — Glass card with score + trend
// Matches DashboardView.jsx Iron Score section
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun IronScoreCard(state: HomeUiState) {
    val scoreColor = ironScoreColor(state.ironScore)
    val animatedScore by animateFloatAsState(
        targetValue = state.ironScore.toFloat(),
        animationSpec = tween(1000, easing = FastOutSlowInEasing),
        label = "ironScore"
    )
    val animatedRingProgress by animateFloatAsState(
        targetValue = state.ironScore / 100f,
        animationSpec = tween(1200, easing = FastOutSlowInEasing),
        label = "ironScoreRing"
    )

    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        padding = 20.dp
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left: Title + description
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "IRON SCORE",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = scoreColor,
                    letterSpacing = 2.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Overall fitness adherence",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Normal,
                    fontSize = 12.sp,
                    color = IronTextTertiary
                )
                Spacer(modifier = Modifier.height(8.dp))

                // Trend
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val trendUp = state.scoreDelta >= 0
                    Icon(
                        imageVector = if (trendUp) Icons.AutoMirrored.Filled.TrendingUp
                        else Icons.AutoMirrored.Filled.TrendingDown,
                        contentDescription = null,
                        tint = if (trendUp) IronGreen else IronRed,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${if (state.scoreDelta >= 0) "+" else ""}${state.scoreDelta}",
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (trendUp) IronGreen else IronRed
                    )
                    Text(
                        text = " this week",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Normal,
                        fontSize = 11.sp,
                        color = IronTextTertiary
                    )
                }
            }

            // Right: Score ring
            ProgressRing(
                progress = animatedRingProgress,
                size = 80.dp,
                strokeWidth = 6.dp,
                progressColor = scoreColor,
                glowColor = scoreColor.copy(alpha = 0.3f)
            ) {
                Text(
                    text = "${animatedScore.toInt()}",
                    fontFamily = JetBrainsMonoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                    color = scoreColor
                )
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// HomeScreen (Dashboard) — Full layout with stagger animations
// ═════════════════════════════════════════════════════════════════════
@Composable
fun HomeScreen(
    navController: NavHostController? = null,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // ── Skeleton loading state ─────────────────────────────────
    if (uiState.isLoading) {
        DashboardSkeleton(
            modifier = Modifier
                .fillMaxSize()
                .background(IronBlack)
        )
        return
    }

    // ── Pull-to-refresh wrapper (no AnimatedVisibility — stagger handles fade-in) ──
    IronPullToRefresh(
        isRefreshing = uiState.isRefreshing,
        onRefresh = { viewModel.refresh() }
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(IronBlack),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // ── 0. ExpBar (top HUD) ─────────────────────────────
            item {
                ExpBar(state = uiState)
            }

            // ── 1. ForgeHUD ─────────────────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(0)) {
                    ForgeHUD(state = uiState)
                }
            }

            // ── 2. Profile Header ───────────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(1)) {
                    DashboardHeader(uiState)
                }
            }

            // ── 2b. Daily Weigh-In ───────────────────────────────
            if (!uiState.hasLoggedWeightToday && !uiState.weighInDismissed) {
                item {
                    Box(modifier = Modifier.staggerDelay(2)) {
                        DailyWeighInCard(
                            value = uiState.weighInValue,
                            loading = uiState.weighInLoading,
                            onValueChange = { viewModel.onWeighInValueChanged(it) },
                            onLog = { viewModel.logWeight() },
                            onDismiss = { viewModel.dismissWeighIn() }
                        )
                    }
                }
            }

            // ── 3. Main Stats (Calorie + Protein Rings) ─────────
            item {
                Box(modifier = Modifier.staggerDelay(3)) {
                    MainStatsCard(uiState)
                }
            }

            // ── 4. Iron Score ────────────────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(4)) {
                    IronScoreCard(uiState)
                }
            }

            // ── 5. Daily Drop Challenge ─────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(5)) {
                    DailyDropCard(
                        challenge = uiState.dailyDrop,
                        completed = uiState.dropCompleted,
                        claiming = uiState.dropClaiming,
                        onComplete = { viewModel.completeDailyDrop() }
                    )
                }
            }

            // ── 5b. Quick Log with AI Vision ─────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(6)) {
                    QuickLogAICard(
                        mealText = uiState.mealText,
                        aiStatus = uiState.aiStatus,
                        loading = uiState.quickLogLoading,
                        showManualEntry = uiState.showManualEntry,
                        manualMealName = uiState.manualMealName,
                        manualCals = uiState.manualCals,
                        manualProtein = uiState.manualProtein,
                        manualCarbs = uiState.manualCarbs,
                        manualFat = uiState.manualFat,
                        onMealTextChange = { viewModel.onMealTextChanged(it) },
                        onSpotMacros = { viewModel.spotMacros() },
                        onToggleManual = { viewModel.toggleManualEntry() },
                        onManualFieldChange = { name, cals, protein, carbs, fat ->
                            viewModel.onManualFieldChanged(name, cals, protein, carbs, fat)
                        },
                        onSubmitManual = { viewModel.submitManualMeal() }
                    )
                }
            }

            // ── 6. Quick Action Buttons ─────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(7)) {
                    QuickActionsRow(
                        loading = uiState.quickLogLoading,
                        onLog = { preset -> viewModel.logQuickMeal(preset) }
                    )
                }
            }

            // ── 7. Neuro-Hack ───────────────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(8)) {
                    NeuroHackSection()
                }
            }

            // ── 8. Today's Meals ────────────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(9)) {
                    TodaysMealsList(meals = uiState.todaysMeals.takeLast(5))
                }
            }

            // ── 9. Motivation Card ──────────────────────────────
            item {
                Box(modifier = Modifier.staggerDelay(10)) {
                    MotivationCard()
                }
            }

            // Bottom spacer for nav bar
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    } // IronPullToRefresh
}

// ═════════════════════════════════════════════════════════════════════
// Dashboard Header — Avatar + greeting + badges
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun DashboardHeader(state: HomeUiState) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Left: Avatar + text
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
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
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
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "DASHBOARD",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp,
                    color = IronTextPrimary,
                    letterSpacing = (-0.5).sp
                )
                if (state.goal.isNotEmpty()) {
                    Text(
                        text = "${state.goal} Protocol",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = IronRedLight,
                        letterSpacing = 1.sp
                    )
                }
            }
        }

        // Right: XP + Streak badges
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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

            BadgePill(
                icon = Icons.Default.LocalFireDepartment,
                text = "${state.streak}",
                iconTint = forgeFireColor(state.currentForge),
                textColor = forgeFireColor(state.currentForge),
                borderColor = forgeFireColor(state.currentForge).copy(alpha = 0.3f),
                bgBrush = Brush.linearGradient(
                    colors = listOf(
                        forgeFireColor(state.currentForge).copy(alpha = 0.15f),
                        forgeFireColor(state.currentForge).copy(alpha = 0.05f)
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
            fontFamily = JetBrainsMonoFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            color = textColor
        )
    }
}

// ═════════════════════════════════════════════════════════════════════
// Main Stats Card — Calorie + Protein Rings + Macro Badges
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun MainStatsCard(state: HomeUiState) {
    StandardGlassCard(modifier = Modifier.fillMaxWidth()) {
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
                                fontFamily = JetBrainsMonoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp,
                                color = IronTextPrimary
                            )
                            Text(
                                text = "/ ${state.dailyTarget}",
                                fontFamily = JetBrainsMonoFontFamily,
                                fontWeight = FontWeight.Medium,
                                fontSize = 11.sp,
                                color = IronTextTertiary
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "CALORIES",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 10.sp,
                        color = IronTextSecondary,
                        letterSpacing = 2.sp
                    )
                    Text(
                        text = "${state.caloriesLeft} left",
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = IronRed
                    )
                }

                // Protein Ring — Amber to match React (#f59e0b)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    ProgressRing(
                        progress = state.proteinProgress,
                        size = 100.dp,
                        strokeWidth = 8.dp,
                        progressColor = IronAmberGold,
                        glowColor = IronAmberGold.copy(alpha = 0.35f)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "${state.totalProtein.toInt()}g",
                                fontFamily = JetBrainsMonoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp,
                                color = IronTextPrimary
                            )
                            Text(
                                text = "/ ${state.dailyProteinTarget}g",
                                fontFamily = JetBrainsMonoFontFamily,
                                fontWeight = FontWeight.Medium,
                                fontSize = 10.sp,
                                color = IronTextTertiary
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "PROTEIN",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 10.sp,
                        color = IronTextSecondary,
                        letterSpacing = 2.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Macro mini badges
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
            fontFamily = JetBrainsMonoFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp,
            color = color
        )
        Text(
            text = label.uppercase(),
            fontFamily = OswaldFontFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 9.sp,
            color = color.copy(alpha = 0.7f),
            letterSpacing = 1.sp
        )
    }
}

// ═════════════════════════════════════════════════════════════════════
// Daily Drop Challenge Card
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun DailyDropCard(
    challenge: DailyChallenge,
    completed: Boolean,
    claiming: Boolean,
    onComplete: () -> Unit
) {
    StandardGlassCard(
        modifier = Modifier.fillMaxWidth(),
        highlight = !completed,
        cornerRadius = 16.dp,
        padding = 16.dp
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
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
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
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        color = IronYellow
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "${challenge.emoji}  ${challenge.title}",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
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
                            fontFamily = OswaldFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color.White,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// Daily Weigh-In Card — matches React DashboardView.jsx
// Scale icon + weight input + LOG WEIGHT button + dismiss X
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun DailyWeighInCard(
    value: String,
    loading: Boolean,
    onValueChange: (String) -> Unit,
    onLog: () -> Unit,
    onDismiss: () -> Unit
) {
    StandardGlassCard(
        modifier = Modifier.fillMaxWidth(),
        highlight = true,
        cornerRadius = 16.dp,
        padding = 16.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header row: icon + title + dismiss X
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                IronRed.copy(alpha = 0.15f),
                                RoundedCornerShape(8.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.MonitorWeight,
                            contentDescription = null,
                            tint = IronRed,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "DAILY WEIGH-IN",
                            fontFamily = OswaldFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = IronRed,
                            letterSpacing = 2.sp
                        )
                        Text(
                            text = "Track your progress daily",
                            fontFamily = InterFontFamily,
                            fontSize = 11.sp,
                            color = IronTextTertiary
                        )
                    }
                }
                // Dismiss X
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clickable { onDismiss() }
                        .background(Color.White.copy(alpha = 0.05f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Dismiss",
                        tint = IronTextTertiary,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Input row: weight field + kg label + LOG button
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Weight input field
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    placeholder = {
                        Text(
                            "0.0",
                            color = IronTextTertiary.copy(alpha = 0.4f),
                            fontFamily = JetBrainsMonoFontFamily,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    textStyle = androidx.compose.ui.text.TextStyle(
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                        color = IronTextPrimary,
                        textAlign = TextAlign.Center
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = IronTextPrimary,
                        unfocusedTextColor = IronTextPrimary,
                        cursorColor = IronRed,
                        focusedBorderColor = IronRed.copy(alpha = 0.5f),
                        unfocusedBorderColor = IronCardBorder
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                // kg label
                Text(
                    text = "kg",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    color = IronTextTertiary
                )

                // LOG WEIGHT button
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(IronRed, IronRedDark)
                            )
                        )
                        .clickable(enabled = !loading && value.isNotBlank()) { onLog() }
                        .padding(horizontal = 18.dp, vertical = 14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = "LOG",
                            fontFamily = OswaldFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color.White,
                            letterSpacing = 1.5.sp
                        )
                    }
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// Quick Log with AI Vision — matches React DashboardView.jsx
// "Log with AI Vision" button, text input, manual entry form
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun QuickLogAICard(
    mealText: String,
    aiStatus: String,
    loading: Boolean,
    showManualEntry: Boolean,
    manualMealName: String,
    manualCals: String,
    manualProtein: String,
    manualCarbs: String,
    manualFat: String,
    onMealTextChange: (String) -> Unit,
    onSpotMacros: () -> Unit,
    onToggleManual: () -> Unit,
    onManualFieldChange: (String?, String?, String?, String?, String?) -> Unit,
    onSubmitManual: () -> Unit
) {
    StandardGlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 16.dp,
        padding = 16.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header: "Quick Log" + "Manual Entry" toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                IronRed.copy(alpha = 0.15f),
                                RoundedCornerShape(8.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = IronRed,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = "QUICK LOG",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = IronTextPrimary,
                        letterSpacing = 2.sp
                    )
                }

                // Manual Entry toggle
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (showManualEntry) IronRed.copy(alpha = 0.15f)
                            else Color.White.copy(alpha = 0.05f)
                        )
                        .clickable { onToggleManual() }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        tint = if (showManualEntry) IronRed else IronTextTertiary,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = "Manual",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Medium,
                        fontSize = 11.sp,
                        color = if (showManualEntry) IronRed else IronTextTertiary
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // AI Vision button — gradient with camera icon
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                IronRed.copy(alpha = 0.8f),
                                IronRedDark.copy(alpha = 0.9f)
                            )
                        )
                    )
                    .border(
                        1.dp,
                        IronRed.copy(alpha = 0.3f),
                        RoundedCornerShape(12.dp)
                    )
                    .clickable(enabled = !loading) { onSpotMacros() }
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "LOG WITH AI VISION",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color.White,
                        letterSpacing = 1.5.sp
                    )
                }
            }

            // AI status indicator
            if (aiStatus.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Pulse dot
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(IronRed, CircleShape)
                    )
                    Text(
                        text = aiStatus,
                        fontFamily = JetBrainsMonoFontFamily,
                        fontSize = 11.sp,
                        color = IronTextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Text input: "Or type e.g. 200g chicken..."
            OutlinedTextField(
                value = mealText,
                onValueChange = onMealTextChange,
                placeholder = {
                    Text(
                        "Or type e.g. 200g chicken...",
                        color = IronTextTertiary.copy(alpha = 0.5f),
                        fontFamily = InterFontFamily,
                        fontSize = 13.sp
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                trailingIcon = {
                    if (mealText.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(IronRed.copy(alpha = 0.15f))
                                .clickable(enabled = !loading) { onSpotMacros() }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "GO",
                                fontFamily = OswaldFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = IronRed,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = IronTextPrimary,
                    unfocusedTextColor = IronTextPrimary,
                    cursorColor = IronRed,
                    focusedBorderColor = IronRed.copy(alpha = 0.5f),
                    unfocusedBorderColor = IronCardBorder
                ),
                shape = RoundedCornerShape(12.dp)
            )

            // Manual Entry form (expandable)
            AnimatedVisibility(
                visible = showManualEntry,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Meal name
                    OutlinedTextField(
                        value = manualMealName,
                        onValueChange = { onManualFieldChange(it, null, null, null, null) },
                        placeholder = {
                            Text("Meal name", color = IronTextTertiary.copy(alpha = 0.5f),
                                fontFamily = InterFontFamily, fontSize = 13.sp)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = IronTextPrimary,
                            unfocusedTextColor = IronTextPrimary,
                            cursorColor = IronRed,
                            focusedBorderColor = IronRed.copy(alpha = 0.5f),
                            unfocusedBorderColor = IronCardBorder
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Macro grid: Cals | P | C | F
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Calories
                        OutlinedTextField(
                            value = manualCals,
                            onValueChange = { onManualFieldChange(null, it, null, null, null) },
                            placeholder = {
                                Text("Cals", color = IronTextTertiary.copy(alpha = 0.4f),
                                    fontSize = 11.sp)
                            },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = IronTextPrimary,
                                unfocusedTextColor = IronTextPrimary,
                                cursorColor = IronRed,
                                focusedBorderColor = IronRed.copy(alpha = 0.5f),
                                unfocusedBorderColor = IronCardBorder
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                        // Protein
                        OutlinedTextField(
                            value = manualProtein,
                            onValueChange = { onManualFieldChange(null, null, it, null, null) },
                            placeholder = {
                                Text("P (g)", color = IronTextTertiary.copy(alpha = 0.4f),
                                    fontSize = 11.sp)
                            },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = IronTextPrimary,
                                unfocusedTextColor = IronTextPrimary,
                                cursorColor = IronAmberGold,
                                focusedBorderColor = IronAmberGold.copy(alpha = 0.5f),
                                unfocusedBorderColor = IronCardBorder
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                        // Carbs
                        OutlinedTextField(
                            value = manualCarbs,
                            onValueChange = { onManualFieldChange(null, null, null, it, null) },
                            placeholder = {
                                Text("C (g)", color = IronTextTertiary.copy(alpha = 0.4f),
                                    fontSize = 11.sp)
                            },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = IronTextPrimary,
                                unfocusedTextColor = IronTextPrimary,
                                cursorColor = IronBlue,
                                focusedBorderColor = IronBlue.copy(alpha = 0.5f),
                                unfocusedBorderColor = IronCardBorder
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                        // Fat
                        OutlinedTextField(
                            value = manualFat,
                            onValueChange = { onManualFieldChange(null, null, null, null, it) },
                            placeholder = {
                                Text("F (g)", color = IronTextTertiary.copy(alpha = 0.4f),
                                    fontSize = 11.sp)
                            },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = IronTextPrimary,
                                unfocusedTextColor = IronTextPrimary,
                                cursorColor = IronGreen,
                                focusedBorderColor = IronGreen.copy(alpha = 0.5f),
                                unfocusedBorderColor = IronCardBorder
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }

                    // Submit manual meal button
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(IronRed, IronRedDark)
                                )
                            )
                            .clickable(enabled = manualMealName.isNotBlank()) {
                                onSubmitManual()
                            }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "LOG MEAL",
                            fontFamily = OswaldFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color.White,
                            letterSpacing = 1.5.sp
                        )
                    }
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// Quick Action Buttons (Water, Protein Shake, 2 Eggs, Chicken Breast)
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun QuickActionsRow(
    loading: Boolean,
    onLog: (QuickMealPreset) -> Unit
) {
    Column {
        Text(
            text = "QUICK LOG",
            fontFamily = OswaldFontFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 10.sp,
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
        Text(text = preset.emoji, fontSize = 24.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = preset.name,
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
            color = IronTextSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center
        )
        if (preset.calories > 0) {
            Text(
                text = "${preset.calories} cal",
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Medium,
                fontSize = 9.sp,
                color = IronTextTertiary
            )
        } else {
            Text(
                text = "+250ml",
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Medium,
                fontSize = 9.sp,
                color = IronBlue
            )
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// Today's Meals Mini-List
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun TodaysMealsList(meals: List<Meal>) {
    if (meals.isEmpty()) return

    StandardGlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "TODAY'S MEALS",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 10.sp,
                    color = IronTextTertiary,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "${meals.size} logged",
                    fontFamily = JetBrainsMonoFontFamily,
                    fontWeight = FontWeight.Medium,
                    fontSize = 10.sp,
                    color = IronTextTertiary
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            meals.reversed().forEachIndexed { index, meal ->
                MealRow(meal)
                if (index < meals.size - 1) {
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
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = IronTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${meal.protein.toInt()}p  ${meal.carbs.toInt()}c  ${meal.fat.toInt()}f",
                    fontFamily = JetBrainsMonoFontFamily,
                    fontWeight = FontWeight.Normal,
                    fontSize = 10.sp,
                    color = IronTextTertiary
                )
            }
        }

        Text(
            text = "${meal.calories} cal",
            fontFamily = JetBrainsMonoFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            color = IronTextSecondary
        )
    }
}

// ═════════════════════════════════════════════════════════════════════
// Neuro-Hack — Binaural Beat Controls (Android-native feature)
// ═════════════════════════════════════════════════════════════════════
@Composable
private fun NeuroHackSection() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val neuroPurple = IronPurple

    fun sendNeuroAction(action: String) {
        val intent = Intent(context, NeuroAudioService::class.java).apply {
            this.action = action
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    data class NeuroPreset(
        val label: String,
        val action: String,
        val color: Color,
        val isStop: Boolean = false
    )

    val presets = listOf(
        NeuroPreset("Fearless",   NeuroAudioService.ACTION_START_FEARLESS,    IronRed),
        NeuroPreset("God Mode",   NeuroAudioService.ACTION_START_GOD_MODE,    IronYellow),
        NeuroPreset("Flow State", NeuroAudioService.ACTION_START_INTELLIGENT, IronBlue),
        NeuroPreset("Recovery",   NeuroAudioService.ACTION_START_RECOVERY,    IronGreen),
        NeuroPreset("Stop",       NeuroAudioService.ACTION_STOP,              IronTextTertiary, isStop = true)
    )

    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 8.dp)
        ) {
            Text(
                text = "NEURO-HACK",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
                color = neuroPurple,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "BINAURAL",
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Medium,
                fontSize = 8.sp,
                color = IronTextTertiary,
                letterSpacing = 1.sp,
                modifier = Modifier
                    .background(
                        neuroPurple.copy(alpha = 0.15f),
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            presets.forEach { preset ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (preset.isStop)
                                Color.White.copy(alpha = 0.06f)
                            else
                                preset.color.copy(alpha = 0.12f)
                        )
                        .border(
                            1.dp,
                            if (preset.isStop)
                                GlassBorder
                            else
                                preset.color.copy(alpha = 0.3f),
                            RoundedCornerShape(12.dp)
                        )
                        .clickable { sendNeuroAction(preset.action) }
                        .padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = preset.label,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                        color = if (preset.isStop) IronTextSecondary else preset.color,
                        letterSpacing = 0.5.sp,
                        maxLines = 1,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
// Motivation Card — Daily quote with glass styling
// ═════════════════════════════════════════════════════════════════════
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
        "Discipline is choosing between what you want now and what you want most.",
        "The iron never lies. Two hundred pounds is always two hundred pounds.",
        "Suffer the pain of discipline, or suffer the pain of regret.",
        "The body achieves what the mind believes.",
        "Be stronger than your strongest excuse."
    )

    val todayQuote = remember {
        quotes[java.time.LocalDate.now().dayOfYear % quotes.size]
    }

    StandardGlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 16.dp,
        padding = 20.dp
    ) {
        Column {
            Text(
                text = "DAILY FUEL",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 9.sp,
                color = IronTextTertiary,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "\"$todayQuote\"",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Medium,
                fontStyle = FontStyle.Italic,
                fontSize = 14.sp,
                color = IronTextSecondary,
                lineHeight = 20.sp
            )
        }
    }
}
