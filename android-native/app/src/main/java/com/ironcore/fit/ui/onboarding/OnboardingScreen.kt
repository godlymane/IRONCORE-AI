package com.ironcore.fit.ui.onboarding

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
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
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*
import kotlinx.coroutines.launch

// ══════════════════════════════════════════════════════════════════
// OnboardingScreen — 5-page HorizontalPager flow
// ══════════════════════════════════════════════════════════════════

/**
 * Full-screen onboarding flow with 5 pages:
 *   0 - Welcome / Branding
 *   1 - Goal Selection
 *   2 - AI Introduction
 *   3 - First Workout Preview
 *   4 - Premium Upsell
 *
 * @param onComplete Called when onboarding finishes (navigate to main app)
 */
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
            if (!uiState.isLastPage || pagerState.currentPage < 4) {
                val buttonText = when (pagerState.currentPage) {
                    0 -> "GET STARTED"
                    1 -> if (uiState.selectedGoal != null) "CONTINUE" else "SELECT A GOAL"
                    else -> "NEXT"
                }

                val enabled = uiState.canProceed

                Button(
                    onClick = {
                        scope.launch {
                            if (pagerState.currentPage == 1 && uiState.selectedGoal != null) {
                                viewModel.saveGoal()
                            }
                            viewModel.nextPage()
                        }
                    },
                    enabled = enabled,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = IronRed,
                        contentColor = IronTextPrimary,
                        disabledContainerColor = IronRed.copy(alpha = 0.3f),
                        disabledContentColor = IronTextPrimary.copy(alpha = 0.4f)
                    )
                ) {
                    Text(
                        text = buttonText,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        letterSpacing = 2.sp
                    )
                }
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
// Page 0 — Welcome
// ══════════════════════════════════════════════════════════════════

@Composable
private fun WelcomePage() {
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
                            IronRed.copy(alpha = 0.12f),
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
            // Icon badge
            Box(
                modifier = Modifier
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
                fontSize = 42.sp,
                fontWeight = FontWeight.Black,
                color = IronTextPrimary,
                letterSpacing = 8.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(4.dp))

            // Accent line under brand
            Box(
                modifier = Modifier
                    .width(60.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(IronRed)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Tagline
            Text(
                text = "YOUR PHONE. YOUR TRAINER.",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = IronRed,
                letterSpacing = 4.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Description
            Text(
                text = "AI-powered form correction, real-time coaching, and gamified progression. The future of fitness is in your pocket.",
                fontSize = 16.sp,
                fontWeight = FontWeight.Normal,
                color = IronTextSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
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
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "We'll customize your experience",
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(40.dp))

        // Goal cards
        FitnessGoal.entries.forEach { goal ->
            val isSelected = selectedGoal == goal

            GoalCard(
                goal = goal,
                isSelected = isSelected,
                onClick = { onGoalSelected(goal) }
            )

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
        targetValue = if (isSelected) IronRed else GlassBorder,
        animationSpec = tween(200),
        label = "goalBorder"
    )
    val bgColor by animateColorAsState(
        targetValue = if (isSelected) IronRed.copy(alpha = 0.12f) else GlassWhite,
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
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = goal.description,
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
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(80.dp))

        // Camera icon with glow
        Box(contentAlignment = Alignment.Center) {
            // Outer glow ring
            Box(
                modifier = Modifier
                    .size(120.dp)
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
            fontSize = 26.sp,
            fontWeight = FontWeight.Black,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "THIS IS YOUR EDGE",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = IronRed,
            letterSpacing = 4.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Point your phone camera at yourself while you lift. Our AI watches every rep, corrects your form in real-time, and prevents injuries before they happen.",
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 24.sp
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Feature bullets
        GlassCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                AIFeatureRow(
                    icon = Icons.Filled.Verified,
                    text = "Real-time pose detection"
                )
                AIFeatureRow(
                    icon = Icons.Filled.TrendingUp,
                    text = "Rep counting & tempo tracking"
                )
                AIFeatureRow(
                    icon = Icons.Filled.Star,
                    text = "Form score on every set"
                )
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
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Here's what your sessions look like",
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Workout preview card
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "TODAY'S SESSION",
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

        Spacer(modifier = Modifier.height(16.dp))

        // Stats preview row
        Row(
            modifier = Modifier.fillMaxWidth(),
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
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = IronTextPrimary,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = sets,
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
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
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
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            color = IronTextPrimary,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Elevate every session",
            fontSize = 16.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(28.dp))

        // Premium features list
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

        Spacer(modifier = Modifier.height(24.dp))

        // Pricing
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.Center
        ) {
            Text(
                text = "$12.99",
                fontSize = 36.sp,
                fontWeight = FontWeight.Black,
                color = IronTextPrimary
            )
            Text(
                text = "/mo",
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = IronTextTertiary,
                modifier = Modifier.padding(bottom = 6.dp)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "or $79.99/year (save 49%)",
            fontSize = 13.sp,
            color = IronTextSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Start Trial button
        Button(
            onClick = onStartTrial,
            enabled = !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = IronRed,
                contentColor = IronTextPrimary,
                disabledContainerColor = IronRed.copy(alpha = 0.5f)
            )
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color = IronTextPrimary,
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    text = "START FREE TRIAL",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 2.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Skip button
        TextButton(
            onClick = onSkip,
            enabled = !isLoading
        ) {
            Text(
                text = "SKIP FOR NOW",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextTertiary,
                letterSpacing = 1.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Free includes: basic tracking + 3 AI coach calls/day",
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
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = IronTextPrimary
        )
    }
}
