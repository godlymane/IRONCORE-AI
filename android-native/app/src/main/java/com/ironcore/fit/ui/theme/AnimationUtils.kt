package com.ironcore.fit.ui.theme

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import kotlinx.coroutines.delay

// ══════════════════════════════════════════════════════════════════
// Animation Utilities — Exact match to Framer Motion specs
// From UIComponents.jsx: fadeIn, slideUp, scaleIn, staggerContainer
// ══════════════════════════════════════════════════════════════════

// ── Spring Specs (matching Framer Motion) ────────────────────────

/** Default spring — matches Framer Motion spring() */
val IronSpringDefault = spring<Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMediumLow
)

/** Nav button spring — stiffness 500, damping 25 (NavBtn in UIComponents.jsx) */
val IronSpringNav = spring<Float>(
    dampingRatio = 0.625f, // ~25/40
    stiffness = 500f
)

/** Pull-to-refresh spring — stiffness 300, damping 30 */
val IronSpringPull = spring<Float>(
    dampingRatio = 0.75f, // ~30/40
    stiffness = 300f
)

/** Bouncy spring — for celebratory animations */
val IronSpringBouncy = spring<Float>(
    dampingRatio = Spring.DampingRatioMediumBouncy,
    stiffness = Spring.StiffnessMediumLow
)

// ── Easing Curves ────────────────────────────────────────────────

/** Matches Framer Motion [0.22, 1, 0.36, 1] — used for PageTransition */
val IronEaseOut = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)

/** Standard Material ease-out */
val IronEaseStandard = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)

// ── Tween Specs ──────────────────────────────────────────────────

/** fadeIn: 300ms — matches Framer Motion fadeIn variant */
val IronFadeIn = tween<Float>(
    durationMillis = 300,
    easing = FastOutSlowInEasing
)

/** slideUp: 300ms with custom ease — matches slideUp variant */
val IronSlideUp = tween<Float>(
    durationMillis = 300,
    easing = IronEaseOut
)

/** scaleIn: 300ms — matches scaleIn variant */
val IronScaleIn = tween<Float>(
    durationMillis = 300,
    easing = FastOutSlowInEasing
)

/** Page transition: 300ms with [0.22, 1, 0.36, 1] easing */
val IronPageTransition = tween<Float>(
    durationMillis = 300,
    easing = IronEaseOut
)

// ── Enter/Exit Transitions ───────────────────────────────────────

/** fadeIn: opacity 0→1, 300ms */
fun ironFadeIn(): EnterTransition = fadeIn(
    animationSpec = tween(300, easing = FastOutSlowInEasing)
)

/** fadeOut: opacity 1→0, 200ms */
fun ironFadeOut(): ExitTransition = fadeOut(
    animationSpec = tween(200, easing = FastOutSlowInEasing)
)

/** slideUp + fade: y:20→0, opacity 0→1, 300ms — matches slideUp variant */
fun ironSlideUpEnter(): EnterTransition = slideInVertically(
    initialOffsetY = { 20 },
    animationSpec = tween(300, easing = IronEaseOut)
) + fadeIn(animationSpec = tween(300, easing = IronEaseOut))

/** scaleIn + fade: scale 0.9→1, opacity 0→1, 300ms — matches scaleIn variant */
fun ironScaleInEnter(): EnterTransition = scaleIn(
    initialScale = 0.9f,
    animationSpec = tween(300, easing = FastOutSlowInEasing)
) + fadeIn(animationSpec = tween(300))

/** Page transition enter: x offset + scale 0.98→1 + fade */
fun ironPageEnter(direction: Int = 1): EnterTransition = slideInHorizontally(
    initialOffsetX = { direction * 30 },
    animationSpec = tween(300, easing = IronEaseOut)
) + scaleIn(
    initialScale = 0.98f,
    animationSpec = tween(300, easing = IronEaseOut)
) + fadeIn(animationSpec = tween(300, easing = IronEaseOut))

/** Page transition exit: fade + slide */
fun ironPageExit(direction: Int = -1): ExitTransition = slideOutHorizontally(
    targetOffsetX = { direction * 30 },
    animationSpec = tween(200, easing = IronEaseOut)
) + fadeOut(animationSpec = tween(200))

// ── Stagger Helper ───────────────────────────────────────────────

/**
 * Stagger delay for items in a list — matches staggerContainer (50ms stagger).
 * Uses animateFloatAsState for smooth, reliable alpha + translationY animation.
 * Safe to use inside LazyColumn — animation replays on each composition.
 */
fun Modifier.staggerDelay(
    index: Int,
    delayPerItem: Int = 50
): Modifier = composed {
    var triggered by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(index * delayPerItem.toLong())
        triggered = true
    }
    val alpha by animateFloatAsState(
        targetValue = if (triggered) 1f else 0f,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "staggerAlpha_$index"
    )
    val translationY by animateFloatAsState(
        targetValue = if (triggered) 0f else 20f,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "staggerY_$index"
    )
    this.graphicsLayer {
        this.alpha = alpha
        this.translationY = translationY
    }
}

// ── Press Scale Modifier ─────────────────────────────────────────

/**
 * Press scale animation — matches React press-effect (scale 0.97 on active)
 * and NavBtn (scale 0.85 press, 1.1 active).
 */
@Composable
fun animatePressScale(
    isPressed: Boolean,
    pressedScale: Float = 0.97f,
    normalScale: Float = 1f
): Float {
    val scale by animateFloatAsState(
        targetValue = if (isPressed) pressedScale else normalScale,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "pressScale"
    )
    return scale
}

// ── Infinite Pulse (for active icons) ────────────────────────────

/**
 * Pulse animation — matches icon active states.
 * EliteFlameIcon: scale [1, 1.08, 1], 1.5s
 * EliteHeartIcon: scale [1, 1.12, 1, 1.08, 1], 0.7s
 */
@Composable
fun rememberPulseScale(
    minScale: Float = 1f,
    maxScale: Float = 1.08f,
    durationMillis: Int = 1500
): Float {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = minScale,
        targetValue = maxScale,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis / 2, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )
    return scale
}

/**
 * Infinite opacity pulse — matches neural node animations.
 * Typical: opacity [0.4, 1, 0.4], 700ms
 */
@Composable
fun rememberPulseAlpha(
    minAlpha: Float = 0.4f,
    maxAlpha: Float = 1f,
    durationMillis: Int = 700,
    delayMillis: Int = 0
): Float {
    val infiniteTransition = rememberInfiniteTransition(label = "alphaPulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = minAlpha,
        targetValue = maxAlpha,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis / 2,
                delayMillis = delayMillis,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )
    return alpha
}
