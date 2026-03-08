package com.ironcore.fit.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RadialGradientShader
import androidx.compose.ui.graphics.ShaderBrush
import kotlin.random.Random

// ══════════════════════════════════════════════════════════════════
// Ambient Particles — Floating red/gold orbs
// Matches React AmbientFX.jsx: 15 huge orbs, 50-250px,
// blur(40px), mix-blend-screen, opacity 60%, 20-50s slow drift
// Performance-gated: only renders on capable devices
// ══════════════════════════════════════════════════════════════════

private data class AmbientOrb(
    val id: Int,
    val startX: Float,     // 0..1 fraction
    val startY: Float,     // 0..1 fraction
    val size: Float,       // radius in dp
    val color: Color,
    val durationMs: Int,   // 20-50s cycle
    val driftX: Float,     // ±drift pixels
    val driftY: Float,
    val startDelay: Int
)

private val orbColors = listOf(
    Color(0x66DC2626), // BlayzEx Red 40%
    Color(0x4D991B1B), // Deep Red 30%
    Color(0x33F59E0B), // Amber Gold 20%
)

@Composable
fun AmbientParticles(
    modifier: Modifier = Modifier,
    count: Int = 15,
    enabled: Boolean = true
) {
    if (!enabled) return

    val orbs = remember {
        List(count) { i ->
            AmbientOrb(
                id = i,
                startX = Random.nextFloat(),
                startY = Random.nextFloat(),
                size = Random.nextFloat() * 100f + 25f, // 25-125 radius
                color = orbColors[i % orbColors.size],
                durationMs = (Random.nextFloat() * 30000 + 20000).toInt(),
                driftX = Random.nextFloat() * 200f - 100f,
                driftY = Random.nextFloat() * 200f - 100f,
                startDelay = (Random.nextFloat() * 10000).toInt()
            )
        }
    }

    // Animate each orb with infinite transition
    val infiniteTransition = rememberInfiniteTransition(label = "ambient")

    val orbAnimations = orbs.map { orb ->
        val progressX by infiniteTransition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(
                    durationMillis = orb.durationMs,
                    easing = FastOutSlowInEasing
                ),
                repeatMode = RepeatMode.Reverse,
                initialStartOffset = StartOffset(orb.startDelay)
            ),
            label = "orbX_${orb.id}"
        )

        val progressY by infiniteTransition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(
                    durationMillis = (orb.durationMs * 1.3f).toInt(),
                    easing = FastOutSlowInEasing
                ),
                repeatMode = RepeatMode.Reverse,
                initialStartOffset = StartOffset(orb.startDelay + 2000)
            ),
            label = "orbY_${orb.id}"
        )

        val alpha by infiniteTransition.animateFloat(
            initialValue = 0.3f,
            targetValue = 0.8f,
            animationSpec = infiniteRepeatable(
                animation = tween(
                    durationMillis = orb.durationMs / 2,
                    easing = FastOutSlowInEasing
                ),
                repeatMode = RepeatMode.Reverse,
                initialStartOffset = StartOffset(orb.startDelay)
            ),
            label = "orbAlpha_${orb.id}"
        )

        Triple(progressX, progressY, alpha)
    }

    Canvas(
        modifier = modifier
            .fillMaxSize()
    ) {
        val w = size.width
        val h = size.height

        orbs.forEachIndexed { i, orb ->
            val (px, py, alpha) = orbAnimations[i]

            val cx = orb.startX * w + orb.driftX * (px * 2f - 1f)
            val cy = orb.startY * h + orb.driftY * (py * 2f - 1f)
            val radius = orb.size * (0.8f + px * 0.4f) // scale 0.8-1.2

            // Radial gradient orb — simulates blur(40px) + radial-gradient
            drawCircle(
                color = orb.color.copy(alpha = alpha * 0.6f),
                radius = radius,
                center = Offset(cx, cy),
                blendMode = BlendMode.Screen
            )

            // Soft outer glow
            drawCircle(
                color = orb.color.copy(alpha = alpha * 0.2f),
                radius = radius * 1.8f,
                center = Offset(cx, cy),
                blendMode = BlendMode.Screen
            )
        }
    }
}
