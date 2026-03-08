package com.ironcore.fit.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

// ══════════════════════════════════════════════════════════════════
// Gold Confetti Burst — matches React PremiumUI.jsx GoldConfetti
// 50 particles, gold/amber colors, angular physics, 2s duration
// Triggers on: achievements, level-ups, PR completion
// ══════════════════════════════════════════════════════════════════

private data class ConfettiParticle(
    val x: Float,
    val y: Float,
    val velocityX: Float,
    val velocityY: Float,
    val rotation: Float,
    val rotationSpeed: Float,
    val size: Float,
    val color: Color,
    val shape: Int // 0=rect, 1=circle
)

private val confettiColors = listOf(
    Color(0xFFFFD700), // Gold
    Color(0xFFFFA500), // Orange
    Color(0xFFF59E0B), // Amber
    Color(0xFFEAB308), // Yellow-600
    Color(0xFFDC2626), // IronRed accent
    Color(0xFFEF4444), // Red-400
)

@Composable
fun GoldConfetti(
    trigger: Boolean,
    modifier: Modifier = Modifier,
    particleCount: Int = 50,
    durationMs: Int = 2000,
    onComplete: () -> Unit = {}
) {
    var particles by remember { mutableStateOf<List<ConfettiParticle>>(emptyList()) }
    var isActive by remember { mutableStateOf(false) }

    val progress = remember { Animatable(0f) }

    LaunchedEffect(trigger) {
        if (!trigger) return@LaunchedEffect

        // Generate burst particles from center-top
        particles = List(particleCount) {
            val angle = Random.nextFloat() * Math.PI.toFloat() * 2f
            val speed = Random.nextFloat() * 800f + 200f
            ConfettiParticle(
                x = 0.5f,
                y = 0.3f,
                velocityX = cos(angle) * speed,
                velocityY = sin(angle) * speed - 400f, // upward bias
                rotation = Random.nextFloat() * 360f,
                rotationSpeed = Random.nextFloat() * 720f - 360f,
                size = Random.nextFloat() * 8f + 4f,
                color = confettiColors.random(),
                shape = Random.nextInt(2)
            )
        }

        isActive = true
        progress.snapTo(0f)
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMs, easing = LinearEasing)
        )
        isActive = false
        particles = emptyList()
        onComplete()
    }

    if (!isActive || particles.isEmpty()) return

    val gravity = 1200f
    val t = progress.value

    Canvas(modifier = modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height

        particles.forEach { p ->
            val elapsed = t * (durationMs / 1000f)

            val px = p.x * w + p.velocityX * elapsed
            val py = p.y * h + p.velocityY * elapsed + 0.5f * gravity * elapsed * elapsed
            val rotation = p.rotation + p.rotationSpeed * elapsed
            val alpha = (1f - t).coerceIn(0f, 1f)

            if (py < h + 100f) {
                rotate(rotation, pivot = Offset(px, py)) {
                    val halfSize = p.size
                    if (p.shape == 0) {
                        drawRect(
                            color = p.color.copy(alpha = alpha),
                            topLeft = Offset(px - halfSize, py - halfSize / 2),
                            size = Size(halfSize * 2, halfSize)
                        )
                    } else {
                        drawCircle(
                            color = p.color.copy(alpha = alpha),
                            radius = halfSize,
                            center = Offset(px, py)
                        )
                    }
                }
            }
        }
    }
}

/** State holder for triggering confetti */
@Composable
fun rememberConfettiState(): MutableState<Boolean> {
    return remember { mutableStateOf(false) }
}
