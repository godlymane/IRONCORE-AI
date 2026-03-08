package com.ironcore.fit.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Shimmer Effects — matching React CSS animations exactly
// 3 types: liquid (8s), nav-edge (4s), progress (2s)
// ══════════════════════════════════════════════════════════════════

/**
 * Liquid shimmer overlay — matches .liquid-glass::before
 * Slow red-tinted light sweep: 8s ease-in-out infinite
 * translateX from -25% to 25%
 */
@Composable
fun LiquidShimmer(
    modifier: Modifier = Modifier,
    durationMillis: Int = 8000,
    shimmerColor: Color = IronRed.copy(alpha = 0.06f),
    edgeColor: Color = IronRed.copy(alpha = 0.02f)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "liquidShimmer")

    val offsetX by infiniteTransition.animateFloat(
        initialValue = -0.25f,
        targetValue = 0.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis / 2, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "liquidShimmerX"
    )

    // Use the passed modifier directly (caller handles sizing via matchParentSize/fillMaxSize)
    Box(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colorStops = arrayOf(
                            0f to Color.Transparent,
                            0.45f to edgeColor,
                            0.5f to shimmerColor,
                            0.55f to edgeColor,
                            1f to Color.Transparent
                        ),
                        startX = offsetX * 1000f - 500f,
                        endX = offsetX * 1000f + 500f
                    )
                )
        )
    }
}

/**
 * Nav edge shimmer — matches .glass-nav-pill::before
 * Red light sweep along top edge: 4s ease-in-out infinite
 * Only 1px height, translateX from -30% to 30%
 */
@Composable
fun NavEdgeShimmer(
    modifier: Modifier = Modifier,
    durationMillis: Int = 4000,
    shimmerColor: Color = IronRed.copy(alpha = 0.6f)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "navEdgeShimmer")

    val progress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "navEdgeProgress"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(1.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colorStops = arrayOf(
                            0f to Color.Transparent,
                            maxOf(0f, progress - 0.15f) to Color.Transparent,
                            progress to shimmerColor,
                            minOf(1f, progress + 0.15f) to Color.Transparent,
                            1f to Color.Transparent
                        )
                    )
                )
        )
    }
}

/**
 * Progress shimmer — matches @keyframes progress-shimmer
 * Linear sweep: 2s linear infinite
 * Used for loading bars, XP progress
 */
@Composable
fun ProgressShimmer(
    modifier: Modifier = Modifier,
    durationMillis: Int = 2000,
    shimmerColor: Color = Color.White.copy(alpha = 0.15f)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "progressShimmer")

    val progress by infiniteTransition.animateFloat(
        initialValue = -1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "progressShimmerX"
    )

    Box(modifier = modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colorStops = arrayOf(
                            0f to Color.Transparent,
                            0.4f to Color.Transparent,
                            0.5f to shimmerColor,
                            0.6f to Color.Transparent,
                            1f to Color.Transparent
                        ),
                        start = Offset(progress * 1000f, 0f),
                        end = Offset(progress * 1000f + 500f, 0f)
                    )
                )
        )
    }
}

/**
 * Skeleton shimmer — matches React EliteSkeleton
 * x: [-100%, 100%], 1.5s, red-tinted
 */
@Composable
fun SkeletonShimmer(
    modifier: Modifier = Modifier,
    baseColor: Color = IronRed.copy(alpha = 0.08f),
    highlightColor: Color = IronRed.copy(alpha = 0.15f),
    durationMillis: Int = 1500
) {
    val infiniteTransition = rememberInfiniteTransition(label = "skeletonShimmer")

    val translateX by infiniteTransition.animateFloat(
        initialValue = -1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "skeletonX"
    )

    Box(
        modifier = modifier
            .background(baseColor)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color.Transparent,
                            highlightColor,
                            Color.Transparent
                        ),
                        start = Offset(translateX * 1000f - 200f, 0f),
                        end = Offset(translateX * 1000f + 200f, 0f)
                    )
                )
        )
    }
}

/**
 * Inner shine overlay — matches .glass-nav-pill::after
 * Inset white highlight for depth effect
 */
@Composable
fun InnerShine(
    modifier: Modifier = Modifier,
    topColor: Color = Color.White.copy(alpha = 0.08f),
    bottomColor: Color = IronRed.copy(alpha = 0.05f)
) {
    // Use the passed modifier directly (caller handles sizing via matchParentSize/fillMaxSize)
    Box(
        modifier = modifier
            .background(
                Brush.verticalGradient(
                    colorStops = arrayOf(
                        0f to topColor,
                        0.05f to Color.Transparent,
                        0.95f to Color.Transparent,
                        1f to bottomColor
                    )
                )
            )
    )
}
