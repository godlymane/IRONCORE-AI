package com.ironcore.fit.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Pull-to-Refresh — Custom pull indicator with glass styling
// Matches React PremiumUI.jsx PullToRefresh:
// - Touch-based, 60px threshold to trigger
// - Fire emoji spinner in red gradient circle
// - Spring animation on release
// - Haptic feedback on trigger
// ══════════════════════════════════════════════════════════════════

@Composable
fun IronPullToRefresh(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val density = LocalDensity.current
    val triggerThresholdPx = with(density) { 60.dp.toPx() }
    val maxPullPx = with(density) { 100.dp.toPx() }

    var pullDistance by remember { mutableFloatStateOf(0f) }
    var isTriggered by remember { mutableStateOf(false) }
    val haptic = rememberHaptic()

    // Animate pull distance back to 0 on release
    val animatedPull by animateFloatAsState(
        targetValue = if (isRefreshing) triggerThresholdPx else if (!isTriggered) 0f else pullDistance,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "pullDistance"
    )

    // Spinner rotation while refreshing
    val infiniteTransition = rememberInfiniteTransition(label = "refreshSpin")
    val spinRotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "spinRotation"
    )

    val nestedScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                // When pulling back up while indicator is showing
                if (pullDistance > 0 && available.y < 0 && !isRefreshing) {
                    val consumed = available.y.coerceAtLeast(-pullDistance)
                    pullDistance += consumed
                    return Offset(0f, consumed)
                }
                return Offset.Zero
            }

            override fun onPostScroll(
                consumed: Offset,
                available: Offset,
                source: NestedScrollSource
            ): Offset {
                // Overscroll — pull down when at top
                if (available.y > 0 && !isRefreshing) {
                    val dampedDelta = available.y / 2f // 50% damping like React
                    pullDistance = (pullDistance + dampedDelta).coerceIn(0f, maxPullPx)
                    isTriggered = true
                    return Offset(0f, available.y)
                }
                return Offset.Zero
            }

            override suspend fun onPreFling(available: Velocity): Velocity {
                if (pullDistance > triggerThresholdPx && !isRefreshing) {
                    haptic(HapticStyle.MEDIUM)
                    onRefresh()
                }
                isTriggered = false
                pullDistance = 0f
                return Velocity.Zero
            }
        }
    }

    val displayPull = if (isTriggered || isRefreshing) animatedPull else 0f
    val pullFraction = (displayPull / triggerThresholdPx).coerceIn(0f, 1.5f)

    Box(
        modifier = modifier.nestedScroll(nestedScrollConnection)
    ) {
        // Pull indicator
        val indicatorAlpha = ((pullFraction - 0.3f) / 0.7f).coerceIn(0f, 1f)

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = with(density) { (displayPull - 50.dp.toPx()).coerceAtLeast(0f).toDp() })
                .zIndex(1f)
                .alpha(indicatorAlpha),
            contentAlignment = Alignment.TopCenter
        ) {
            // Red gradient circle with fire emoji
            val rotation = if (isRefreshing) spinRotation else pullFraction * 360f * 3f

            Box(
                modifier = Modifier
                    .padding(top = 8.dp)
                    .size(40.dp)
                    .rotate(rotation)
                    .scale(pullFraction.coerceIn(0.5f, 1f))
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(IronRed, IronRedDeep)
                        ),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "\uD83D\uDD25", // 🔥
                    fontSize = 18.sp
                )
            }
        }

        // Content offset
        Box(
            modifier = Modifier.offset(
                y = with(density) { displayPull.toDp() }
            )
        ) {
            content()
        }
    }
}
