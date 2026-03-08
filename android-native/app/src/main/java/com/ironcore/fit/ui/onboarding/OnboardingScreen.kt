package com.ironcore.fit.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ironcore.fit.ui.components.ButtonVariant
import com.ironcore.fit.ui.components.GlassButton
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ══════════════════════════════════════════════════════════════════
// Stagger animation helper — each element fades + slides up in sequence
// ══════════════════════════════════════════════════════════════════

@Composable
private fun rememberStaggerAnimations(
    count: Int,
    baseDelay: Int = 80,
    duration: Int = 400
): List<Animatable<Float, *>> {
    val animations = remember { List(count) { Animatable(0f) } }

    LaunchedEffect(Unit) {
        animations.forEachIndexed { index, anim ->
            launch {
                delay((index * baseDelay).toLong())
                anim.animateTo(
                    targetValue = 1f,
                    animationSpec = tween(
                        durationMillis = duration,
                        easing = FastOutSlowInEasing
                    )
                )
            }
        }
    }

    return animations
}

private fun Modifier.staggerElement(progress: Float): Modifier {
    return this.graphicsLayer {
        alpha = progress
        translationY = (1f - progress) * 40f
    }
}

// ══════════════════════════════════════════════════════════════════
// OnboardingScreen — 5-page HorizontalPager flow
// ══════════════════════════════════════════════════════════════════

@Composable
fun OnboardingScreen(
    viewModel: OnboardingViewModel = hiltViewModel(),
    onComplete: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val pagerState = rememberPagerState(pageCount = { uiState.totalPages })
    val scope = rememberCoroutineScope()

    // Sync pager with ViewModel page state
    LaunchedEffect(uiState.currentPage) {
        if (pagerState.currentPage != uiState.currentPage) {
            pagerState.animateScrollToPage(uiState.currentPage)
        }
    }

    // Keep ViewModel in sync when user swipes
    LaunchedEffect(pagerState.currentPage) {
        viewModel.goToPage(pagerState.currentPage)
    }

    // Navigate away when onboarding completes
    LaunchedEffect(uiState.isComplete) {
        if (uiState.isComplete) {
            onComplete()
        }
    }

    // Save goal when leaving page 1
    LaunchedEffect(pagerState.currentPage) {
        if (pagerState.currentPage > 1 && uiState.selectedGoal != null) {
            viewModel.saveGoal()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Pager ────────────────────────────────────────────────
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { page ->
            when (page) {
                0 -> WelcomePage()
                1 -> GoalSelectionPage(
                    selectedGoal = uiState.selectedGoal,
                    onGoalSelected = viewModel::selectGoal
                )
                2 -> AIIntroPage()
                3 -> FirstWorkoutPage()
                4 -> PremiumUpsellPage(
                    isLoading = uiState.isCompletingOnboarding,
                    onStartTrial = { viewModel.completeOnboarding() },
                    onSkip = { viewModel.skipPremium() }
                )
            }
        }

        // ── Back button (top-left, pages 1-3) ────────────────────
        if (pagerState.currentPage in 1..3) {
            IconButton(
                onClick = {
                    scope.launch {
                        pagerState.animateScrollToPage(pagerState.currentPage - 1)
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(start = 8.dp, top = 40.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextSecondary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        // ── Skip button (top-right, pages 0-3) ──────────────────
        if (pagerState.currentPage < 4) {
            TextButton(
                onClick = {
                    scope.launch {
                        pagerState.animateScrollToPage(4)
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(end = 8.dp, top = 40.dp)
            ) {
                Text(
                    text = "SKIP",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = IronTextTertiary,
                    letterSpacing = 1.sp
                )
            }
        }

        // ── Bottom controls overlay ──────────────────────────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, IronBlack),
                        startY = 0f,
                        endY = 80f
                    )
                )
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Page dots indicator
            PageDotsIndicator(
                totalPages = uiState.totalPages,
                currentPage = pagerState.currentPage
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Navigation button (hidden on last page — it has its own buttons)
            if (pagerState.currentPage < 4) {
                val buttonText = when (pagerState.currentPage) {
                    0 -> "GET STARTED"
                    1 -> if (uiState.selectedGoal != null) "CONTINUE" else "SELECT A GOAL"
                    else -> "NEXT"
                }

                val enabled = uiState.canProceed

                GlassButton(
                    text = buttonText,
                    onClick = {
                        scope.launch {
                            if (pagerState.currentPage == 1 && uiState.selectedGoal != null) {
                                viewModel.saveGoal()
                            }
                            viewModel.nextPage()
                        }
                    },
                    enabled = enabled,
                    variant = ButtonVariant.PRIMARY,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                )
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Page dots indicator
// ══════════════════════════════════════════════════════════════════

@Composable
private fun PageDotsIndicator(
    totalPages: Int,
    currentPage: Int
) {
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(totalPages) { index ->
            val isSelected = index == currentPage

            val width by animateDpAsState(
                targetValue = if (isSelected) 24.dp else 8.dp,
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                label = "dotWidth"
            )

            val color by animateColorAsState(
                targetValue = if (isSelected) IronRed else IronTextTertiary.copy(alpha = 0.4f),
                animationSpec = tween(300),
                label = "dotColor"
            )

            Box(
                modifier = Modifier
                    .padding(horizontal = 3.dp)
                    .width(width)
                    .height(8.dp)
                    .clip(CircleShape)
                    .background(color)
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Page 0 — Welcome (animated entrance)
// ══════════════════════════════════════════════════════════════════

@Composable
private fun WelcomePage() {
    val stagger = rememberStaggerAnimations(count = 5, baseDelay = 120, duration = 500)

    // Pulsing glow animation for the logo badge
    val pulseTransition = rememberInfiniteTransition(label = "logoPulse")
    val glowAlpha by pulseTransition.animateFloat(
        initialValue = 0.08f,
        targetValue = 0.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glowAlpha"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack),
        contentAlignment = Alignment.Center
    ) {
        // Subtle radial glow behind the logo
        Box(
            modifier = Modifier
                .size(300.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            IronRed.copy(alpha = glowAlpha),
                            Color.Transparent
                        ),
                        radius = 400f
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 32.dp)
        ) {
            // Icon badge — animated entrance
            Box(
                modifier = Modifier
                    .staggerElement(stagger[0].value)
                    .size(80.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(IronRed, IronRedDark)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.FitnessCenter,
                    contentDescription = null,
                    tint = IronTextPrimary,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Brand name
            Text(
                text = "IRONCORE",
                fontFamily = OswaldFontFamily,
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 8.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.staggerElement(stagger[1].value)
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Accent line under brand
            Box(
                modifier = Modifier
                    .staggerElement(stagger[2].value)
                    .width(60.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(IronRed)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Tagline
            Text(
                text = "YOUR PHONE. YOUR TRAINER.",
                fontFamily = OswaldFontFamily,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = IronRed,
                letterSpacing = 4.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.staggerElement(stagger[3].value)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Description
            Text(
                text = "AI-powered form correction, real-time coaching, and gamified progression. The future of fitness is in your pocket.",
                fontFamily = InterFontFamily,
                fontSize = 16.sp,
                fontWeight = FontWeight.Normal,
                color = IronTextSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp,
                modifier = Modifier.staggerElement(stagger[4].value)
            )

            // Extra bottom spacing so content doesn't overlap the button area
            Spacer(modifier = Modifier.height(120.dp))
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Page 1 — Goal Selection
// ══════════════════════════════════════════════════════════════════

@Composable
private fun GoalSelectionPage(
    selectedGoal: FitnessGoal?,
    onGoalSelected: (FitnessGoal) -> Unit
) {
    // 2 header texts + 4 goal cards = 6 stagger slots
    val stagger = rememberStaggerAnimations(count = 6, baseDelay = 80)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(80.dp))

        Text(
            text = "WHAT'S YOUR GOAL?",
            fontFamily = OswaldFontFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[0].value)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "We'll customize your experience",
            fontFamily = InterFontFamily,
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[1].value)
        )

        Spacer(modifier = Modifier.height(40.dp))

        // Goal cards
        FitnessGoal.entries.forEachIndexed { index, goal ->
            val isSelected = selectedGoal == goal

            Box(modifier = Modifier.staggerElement(stagger[index + 2].value)) {
                GoalCard(
                    goal = goal,
                    isSelected = isSelected,
                    onClick = { onGoalSelected(goal) }
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
        }

        // Bottom spacing for the pager button
        Spacer(modifier = Modifier.height(120.dp))
    }
}

@Composable
private fun GoalCard(
    goal: FitnessGoal,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) IronRed else GlassBorderDefault,
        animationSpec = tween(200),
        label = "goalBorder"
    )
    val bgColor by animateColorAsState(
        targetValue = if (isSelected) IronRed.copy(alpha = 0.12f) else GlassWhite03,
        animationSpec = tween(200),
        label = "goalBg"
    )
    val scale by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0.98f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "goalScale"
    )

    val icon: ImageVector = when (goal) {
        FitnessGoal.BUILD_MUSCLE -> Icons.Filled.FitnessCenter
        FitnessGoal.LOSE_FAT -> Icons.Filled.LocalFireDepartment
        FitnessGoal.GET_STRONGER -> Icons.Filled.Bolt
        FitnessGoal.STAY_ACTIVE -> Icons.Filled.FavoriteBorder
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(16.dp))
            .background(bgColor)
            .border(
                width = if (isSelected) 1.5.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(16.dp)
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(20.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Icon circle
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected) IronRed.copy(alpha = 0.2f)
                        else IronSurfaceElevated
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (isSelected) IronRed else IronTextSecondary,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = goal.label.uppercase(),
                    fontFamily = OswaldFontFamily,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = goal.description,
                    fontFamily = InterFontFamily,
                    fontSize = 13.sp,
                    color = IronTextSecondary
                )
            }

            // Check mark
            if (isSelected) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = "Selected",
                    tint = IronRed,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Page 2 — AI Introduction
// ══════════════════════════════════════════════════════════════════

@Composable
private fun AIIntroPage() {
    val stagger = rememberStaggerAnimations(count = 5, baseDelay = 100)

    // Pulsing ring animation
    val ringPulse = rememberInfiniteTransition(label = "ringPulse")
    val ringScale by ringPulse.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "ringScale"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(80.dp))

        // Camera icon with animated glow rings
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.staggerElement(stagger[0].value)
        ) {
            // Outer glow ring — pulsing
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .graphicsLayer { scaleX = ringScale; scaleY = ringScale }
                    .clip(CircleShape)
                    .background(IronRed.copy(alpha = 0.08f))
            )
            // Inner ring
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(IronRed.copy(alpha = 0.15f))
                    .border(1.dp, IronRed.copy(alpha = 0.3f), CircleShape)
            )
            Icon(
                imageVector = Icons.Filled.CameraAlt,
                contentDescription = "AI Camera",
                tint = IronRed,
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(40.dp))

        Text(
            text = "AI FORM CORRECTION",
            fontFamily = OswaldFontFamily,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[1].value)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "THIS IS YOUR EDGE",
            fontFamily = OswaldFontFamily,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = IronRed,
            letterSpacing = 4.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[2].value)
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Point your phone camera at yourself while you lift. Our AI watches every rep, corrects your form in real-time, and prevents injuries before they happen.",
            fontFamily = InterFontFamily,
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 24.sp,
            modifier = Modifier.staggerElement(stagger[3].value)
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Feature bullets
        Box(modifier = Modifier.staggerElement(stagger[4].value)) {
            GlassCard(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    AIFeatureRow(
                        icon = Icons.Filled.Verified,
                        text = "Real-time pose detection"
                    )
                    AIFeatureRow(
                        icon = Icons.AutoMirrored.Filled.TrendingUp,
                        text = "Rep counting & tempo tracking"
                    )
                    AIFeatureRow(
                        icon = Icons.Filled.Star,
                        text = "Form score on every set"
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(120.dp))
    }
}

@Composable
private fun AIFeatureRow(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = IronRed,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = text,
            fontFamily = InterFontFamily,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = IronTextPrimary
        )
    }
}

// ══════════════════════════════════════════════════════════════════
// Page 3 — First Workout Preview
// ══════════════════════════════════════════════════════════════════

@Composable
private fun FirstWorkoutPage() {
    // icon + title + subtitle + card + stats row = 5
    val stagger = rememberStaggerAnimations(count = 5, baseDelay = 100)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(80.dp))

        // Play icon
        Box(
            modifier = Modifier
                .staggerElement(stagger[0].value)
                .size(72.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        colors = listOf(IronRed, IronRedDark)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.PlayArrow,
                contentDescription = null,
                tint = IronTextPrimary,
                modifier = Modifier.size(36.dp)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "READY TO LIFT",
            fontFamily = OswaldFontFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[1].value)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Here's what your sessions look like",
            fontFamily = InterFontFamily,
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[2].value)
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Workout preview card
        Box(modifier = Modifier.staggerElement(stagger[3].value)) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "TODAY'S SESSION",
                        fontFamily = OswaldFontFamily,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = IronRed,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    WorkoutPreviewRow(
                        exercise = "Bench Press",
                        sets = "4 x 8",
                        icon = Icons.Filled.FitnessCenter
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    WorkoutPreviewRow(
                        exercise = "Barbell Row",
                        sets = "4 x 10",
                        icon = Icons.Filled.FitnessCenter
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    WorkoutPreviewRow(
                        exercise = "Overhead Press",
                        sets = "3 x 8",
                        icon = Icons.Filled.FitnessCenter
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    WorkoutPreviewRow(
                        exercise = "Bicep Curls",
                        sets = "3 x 12",
                        icon = Icons.Filled.FitnessCenter
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Stats preview row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .staggerElement(stagger[4].value),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatPreviewCard(
                label = "DURATION",
                value = "45 min",
                icon = Icons.Filled.Timer,
                modifier = Modifier.weight(1f)
            )
            StatPreviewCard(
                label = "XP EARNED",
                value = "+120",
                icon = Icons.Filled.Star,
                modifier = Modifier.weight(1f)
            )
            StatPreviewCard(
                label = "STREAK",
                value = "Day 1",
                icon = Icons.Filled.LocalFireDepartment,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(120.dp))
    }
}

@Composable
private fun WorkoutPreviewRow(
    exercise: String,
    sets: String,
    icon: ImageVector
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(IronSurfaceElevated),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = IronTextTertiary,
                modifier = Modifier.size(18.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = exercise,
            fontFamily = InterFontFamily,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = IronTextPrimary,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = sets,
            fontFamily = JetBrainsMonoFontFamily,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = IronTextTertiary
        )
    }
}

@Composable
private fun StatPreviewCard(
    label: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = IronRed,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                fontFamily = JetBrainsMonoFontFamily,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
                fontFamily = InterFontFamily,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextTertiary,
                letterSpacing = 1.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Page 4 — Premium Upsell
// ══════════════════════════════════════════════════════════════════

@Composable
private fun PremiumUpsellPage(
    isLoading: Boolean,
    onStartTrial: () -> Unit,
    onSkip: () -> Unit
) {
    // badge + title + subtitle + features card + pricing + button + skip + footnote = 8
    val stagger = rememberStaggerAnimations(count = 8, baseDelay = 70)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(60.dp))

        // Premium badge
        Box(
            modifier = Modifier
                .staggerElement(stagger[0].value)
                .size(72.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            IronRed,
                            IronRedLight,
                            IronRed
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.WorkspacePremium,
                contentDescription = null,
                tint = IronTextPrimary,
                modifier = Modifier.size(36.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "UNLOCK PREMIUM",
            fontFamily = OswaldFontFamily,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[1].value)
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Elevate every session",
            fontFamily = InterFontFamily,
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[2].value)
        )

        Spacer(modifier = Modifier.height(28.dp))

        // Premium features list
        Box(modifier = Modifier.staggerElement(stagger[3].value)) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    PremiumFeatureRow("Unlimited AI form correction")
                    PremiumFeatureRow("Unlimited AI coaching calls")
                    PremiumFeatureRow("Full league access (Iron to Diamond)")
                    PremiumFeatureRow("Arena PvP battles")
                    PremiumFeatureRow("Guild features & team challenges")
                    PremiumFeatureRow("Advanced analytics & insights")
                    PremiumFeatureRow("Ad-free experience")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Pricing
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.staggerElement(stagger[4].value)
        ) {
            Text(
                text = "$12.99",
                fontFamily = OswaldFontFamily,
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
            Text(
                text = "/mo",
                fontFamily = InterFontFamily,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = IronTextTertiary,
                modifier = Modifier.padding(bottom = 6.dp)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "or $79.99/year (save 49%)",
            fontFamily = InterFontFamily,
            fontSize = 13.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.staggerElement(stagger[5].value)
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Start Trial — GlassButton with PRIMARY variant
        Box(modifier = Modifier.staggerElement(stagger[6].value)) {
            GlassButton(
                text = if (isLoading) "" else "START FREE TRIAL",
                onClick = onStartTrial,
                enabled = !isLoading,
                variant = ButtonVariant.PRIMARY,
                isLoading = isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Skip button
        TextButton(
            onClick = onSkip,
            enabled = !isLoading,
            modifier = Modifier.staggerElement(stagger[7].value)
        ) {
            Text(
                text = "SKIP FOR NOW",
                fontFamily = InterFontFamily,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextTertiary,
                letterSpacing = 1.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Free includes: basic tracking + 3 AI coach calls/day",
            fontFamily = InterFontFamily,
            fontSize = 11.sp,
            color = IronTextTertiary.copy(alpha = 0.6f),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun PremiumFeatureRow(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(20.dp)
                .clip(CircleShape)
                .background(IronRed.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = IronRed,
                modifier = Modifier.size(16.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = text,
            fontFamily = InterFontFamily,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = IronTextPrimary
        )
    }
}
