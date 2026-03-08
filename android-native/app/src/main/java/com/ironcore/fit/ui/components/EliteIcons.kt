package com.ironcore.fit.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.*
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Elite Icons — Exact port of EliteIcons.jsx
// ALL paths use M/L only — NO curves (angular design)
// 6 icons: Flame, Swords, Dumbbell, Brain, Heart, Crown
// Each has active/inactive states, gradients, glow, pulse animations
// ══════════════════════════════════════════════════════════════════

// ── Helper: Parse SVG-like M/L path to Compose Path ────────────
private fun buildPath(pathData: String, scale: Float = 1f): Path {
    val path = Path()
    val tokens = pathData.trim().split(Regex("\\s+"))
    var i = 0
    while (i < tokens.size) {
        when (tokens[i]) {
            "M" -> {
                path.moveTo(tokens[i + 1].toFloat() * scale, tokens[i + 2].toFloat() * scale)
                i += 3
            }
            "L" -> {
                path.lineTo(tokens[i + 1].toFloat() * scale, tokens[i + 2].toFloat() * scale)
                i += 3
            }
            "Z" -> {
                path.close()
                i += 1
            }
            else -> i += 1
        }
    }
    return path
}

// ── Inactive stroke style ──────────────────────────────────────
private val inactiveColor = IconInactive          // #6B7280
private val inactiveColorLight = IconInactiveLight // #4B5563
private val inactiveColorDark = IconInactiveDark   // #374151

// ════════════════════════════════════════════════════════════════
// 1. ELITE FLAME (HOME/DASHBOARD)
// Outer 7-point flame, middle flame, inner glass, hot core diamond
// Pulse: scale [1, 1.08, 1], 1.5s
// ════════════════════════════════════════════════════════════════

@Composable
fun EliteFlameIcon(
    active: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp
) {
    val scale = rememberPulseScale(
        minScale = 1f,
        maxScale = if (active) 1.08f else 1f,
        durationMillis = 1500
    )

    // Inner core flicker
    val coreAlpha = rememberPulseAlpha(
        minAlpha = 0.6f,
        maxAlpha = 1f,
        durationMillis = 500
    )

    // Mid flame flicker
    val midAlpha = rememberPulseAlpha(
        minAlpha = 0.6f,
        maxAlpha = 0.9f,
        durationMillis = 800
    )

    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension / 24f
        val cx = this.size.width / 2f
        val cy = this.size.height / 2f

        // Scale transform for pulse
        if (active) {
            drawContext.transform.scale(scale, scale, Offset(cx, cy))
        }

        // Outer flame path: M12 1 L15.5 7 L20 11 L18 15 L16 20 L12 23 L8 20 L6 15 L4 11 L8.5 7 Z
        val outerFlame = buildPath("M 12 1 L 15.5 7 L 20 11 L 18 15 L 16 20 L 12 23 L 8 20 L 6 15 L 4 11 L 8.5 7 Z", s)

        if (active) {
            // Gradient fill: #7F0000 → #991b1b → #b91c1c → #dc2626 → #FF3333 (bottom to top)
            val flameGradient = Brush.verticalGradient(
                colorStops = arrayOf(
                    0f to IronRedDarkest,      // #7F0000
                    0.35f to IronRedDeep,      // #991b1b
                    0.6f to IronRedDark,       // #b91c1c
                    0.85f to IronRed,          // #dc2626
                    1f to Color(0xFFFF3333)
                ),
                startY = 23f * s,
                endY = 1f * s
            )
            drawPath(outerFlame, flameGradient)
            drawPath(outerFlame, color = IronRed, style = Stroke(width = 1.5f * s / 10f))

            // Middle flame: M12 4 L15 9 L17 13 L15 17.5 L12 20 L9 17.5 L7 13 L9 9 Z
            val midFlame = buildPath("M 12 4 L 15 9 L 17 13 L 15 17.5 L 12 20 L 9 17.5 L 7 13 L 9 9 Z", s)
            val midGradient = Brush.verticalGradient(
                colors = listOf(Color(0xFFFF4444), IronRedDark),
                startY = 20f * s,
                endY = 4f * s
            )
            drawPath(midFlame, midGradient, alpha = midAlpha)

            // Inner glass: M12 7 L14.5 13 L12 18 L9.5 13 Z
            val innerGlass = buildPath("M 12 7 L 14.5 13 L 12 18 L 9.5 13 Z", s)
            val glassGradient = Brush.verticalGradient(
                colors = listOf(Color.White.copy(alpha = 0.25f), Color.White.copy(alpha = 0.05f)),
                startY = 7f * s,
                endY = 18f * s
            )
            drawPath(innerGlass, glassGradient, alpha = 0.45f)

            // Hot core diamond: M12 11 L13.5 14 L12 17 L10.5 14 Z
            val core = buildPath("M 12 11 L 13.5 14 L 12 17 L 10.5 14 Z", s)
            drawPath(core, color = Color(0xFFFF4444), alpha = coreAlpha)
        } else {
            // Inactive: stroke only
            drawPath(outerFlame, color = inactiveColor, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
            // Detail line
            val detailLine = buildPath("M 12 4 L 14 9 L 12 20 L 10 9 Z", s)
            drawPath(detailLine, color = inactiveColor, style = Stroke(width = 0.5f * s / 10f), alpha = 0.4f)
        }
    }
}

// ════════════════════════════════════════════════════════════════
// 2. CROSSED SWORDS (ARENA/COMPETITION)
// Two swords at 45°, hilts, clash spark 4-point star
// ════════════════════════════════════════════════════════════════

@Composable
fun EliteSwordsIcon(
    active: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp
) {
    val sparkScale = rememberPulseScale(
        minScale = 0.8f,
        maxScale = if (active) 1.3f else 0.8f,
        durationMillis = 400
    )
    val sparkAlpha = rememberPulseAlpha(
        minAlpha = 0.7f,
        maxAlpha = 1f,
        durationMillis = 400
    )

    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension / 24f

        // Sword gradient: #FF3333 → #b91c1c → #991b1b (diagonal)
        val swordGradient = Brush.linearGradient(
            colorStops = arrayOf(
                0f to Color(0xFFFF3333),
                0.5f to IronRedDark,
                1f to IronRedDeep
            ),
            start = Offset(0f, 0f),
            end = Offset(24f * s, 24f * s)
        )

        // Left blade: M3 3 L5 2 L14 11 L15 13 L13 15 L11 14 L2 5 Z
        val leftBlade = buildPath("M 3 3 L 5 2 L 14 11 L 15 13 L 13 15 L 11 14 L 2 5 Z", s)
        // Right blade: M21 3 L19 2 L10 11 L9 13 L11 15 L13 14 L22 5 Z
        val rightBlade = buildPath("M 21 3 L 19 2 L 10 11 L 9 13 L 11 15 L 13 14 L 22 5 Z", s)

        if (active) {
            drawPath(leftBlade, swordGradient)
            drawPath(leftBlade, color = IronRed, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
            drawPath(rightBlade, swordGradient)
            drawPath(rightBlade, color = IronRed, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))

            // Edge highlights
            val leftEdge = buildPath("M 4 3 L 5 2.5 L 13 10.5 L 12 12 Z", s)
            val rightEdge = buildPath("M 20 3 L 19 2.5 L 11 10.5 L 12 12 Z", s)
            drawPath(leftEdge, color = Color.White.copy(alpha = 0.12f))
            drawPath(rightEdge, color = Color.White.copy(alpha = 0.12f))

            // Left hilt
            val leftGuard = buildPath("M 5 16 L 4 14 L 6 14 L 7 16 Z", s)
            val leftGrip = buildPath("M 5 16 L 4.5 19 L 6.5 19 L 6 16 Z", s)
            drawPath(leftGuard, color = IronRedDeep)
            drawPath(leftGuard, color = IronRedDark, style = Stroke(width = 1f * s / 10f))
            drawPath(leftGrip, color = Color(0xFF660000))

            // Right hilt
            val rightGuard = buildPath("M 19 16 L 20 14 L 18 14 L 17 16 Z", s)
            val rightGrip = buildPath("M 19 16 L 19.5 19 L 17.5 19 L 18 16 Z", s)
            drawPath(rightGuard, color = IronRedDeep)
            drawPath(rightGuard, color = IronRedDark, style = Stroke(width = 1f * s / 10f))
            drawPath(rightGrip, color = Color(0xFF660000))

            // Clash spark — 4-point star
            val cx = this.size.width / 2f
            val cy = 12f * s
            scale(sparkScale, sparkScale, Offset(cx, cy)) {
                val sparkV = buildPath("M 12 9 L 13 12 L 12 15 L 11 12 Z", s)
                val sparkH = buildPath("M 9 12 L 12 11 L 15 12 L 12 13 Z", s)
                drawPath(sparkV, color = Color(0xFFFF4444), alpha = sparkAlpha)
                drawPath(sparkH, color = Color(0xFFFF4444), alpha = sparkAlpha)
            }
        } else {
            drawPath(leftBlade, color = inactiveColor, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
            drawPath(rightBlade, color = inactiveColor, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
            // Hilts inactive
            val leftGuard = buildPath("M 5 16 L 4 14 L 6 14 L 7 16 Z", s)
            val rightGuard = buildPath("M 19 16 L 20 14 L 18 14 L 17 16 Z", s)
            drawPath(leftGuard, color = inactiveColorLight)
            drawPath(leftGuard, color = inactiveColor, style = Stroke(width = 1f * s / 10f))
            drawPath(rightGuard, color = inactiveColorLight)
            drawPath(rightGuard, color = inactiveColor, style = Stroke(width = 1f * s / 10f))
            val leftGrip = buildPath("M 5 16 L 4.5 19 L 6.5 19 L 6 16 Z", s)
            val rightGrip = buildPath("M 19 16 L 19.5 19 L 17.5 19 L 18 16 Z", s)
            drawPath(leftGrip, color = inactiveColorDark)
            drawPath(rightGrip, color = inactiveColorDark)
        }
    }
}

// ════════════════════════════════════════════════════════════════
// 3. POWER DUMBBELL (TRAIN/WORKOUT)
// Chamfered rectangular plates, center bar, power diamond
// Animation: rotate [-3, 3, -3] 0.5s
// ════════════════════════════════════════════════════════════════

@Composable
fun EliteDumbbellIcon(
    active: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp
) {
    val rotation by rememberInfiniteTransition(label = "dbRotation").animateFloat(
        initialValue = -3f,
        targetValue = 3f,
        animationSpec = infiniteRepeatable(
            animation = tween(250, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dbRotate"
    )

    val diamondScale = rememberPulseScale(
        minScale = 1f,
        maxScale = if (active) 1.4f else 1f,
        durationMillis = 600
    )

    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension / 24f
        val cx = this.size.width / 2f
        val cy = this.size.height / 2f

        if (active) {
            rotate(rotation, Offset(cx, cy)) {
                drawDumbbellBody(s, active = true)
            }
        } else {
            drawDumbbellBody(s, active = false)
        }

        // Power diamond at center
        if (active) {
            val diamond = buildPath("M 12 10 L 13 12 L 12 14 L 11 12 Z", s)
            scale(diamondScale, diamondScale, Offset(cx, cy)) {
                drawPath(diamond, color = Color(0xFFFF4444), alpha = 0.9f)
            }
        }
    }
}

private fun DrawScope.drawDumbbellBody(s: Float, active: Boolean) {
    val plateGradient = Brush.verticalGradient(
        colorStops = arrayOf(
            0f to Color(0xFFFF3333),
            0.4f to IronRedDark,
            1f to IronRedDarkest
        ),
        startY = 5f * s,
        endY = 19f * s
    )
    val innerGradient = Brush.verticalGradient(
        colors = listOf(IronRedDark, Color(0xFF660000)),
        startY = 7f * s,
        endY = 17f * s
    )

    // Left outer plate
    val leftOuter = buildPath("M 1 6 L 2 5 L 6 5 L 7 6 L 7 18 L 6 19 L 2 19 L 1 18 Z", s)
    drawPath(leftOuter, if (active) plateGradient else SolidColor(inactiveColorLight))
    drawPath(leftOuter, color = if (active) IronRed else inactiveColor, style = Stroke(width = 1f * s / 10f, join = StrokeJoin.Miter))

    // Left inner plate
    val leftInner = buildPath("M 3 7.5 L 3.5 7 L 5.5 7 L 6 7.5 L 6 16.5 L 5.5 17 L 3.5 17 L 3 16.5 Z", s)
    drawPath(leftInner, if (active) innerGradient else SolidColor(inactiveColorDark))

    // Right outer plate
    val rightOuter = buildPath("M 17 6 L 18 5 L 22 5 L 23 6 L 23 18 L 22 19 L 18 19 L 17 18 Z", s)
    drawPath(rightOuter, if (active) plateGradient else SolidColor(inactiveColorLight))
    drawPath(rightOuter, color = if (active) IronRed else inactiveColor, style = Stroke(width = 1f * s / 10f, join = StrokeJoin.Miter))

    // Right inner plate
    val rightInner = buildPath("M 18 7.5 L 18.5 7 L 20.5 7 L 21 7.5 L 21 16.5 L 20.5 17 L 18.5 17 L 18 16.5 Z", s)
    drawPath(rightInner, if (active) innerGradient else SolidColor(inactiveColorDark))

    // Center bar
    val bar = buildPath("M 7 10.5 L 17 10.5 L 17 13.5 L 7 13.5 Z", s)
    drawPath(bar, color = if (active) IronRedDark else inactiveColor)
    drawPath(bar, color = if (active) IronRedDeep else inactiveColorLight, style = Stroke(width = 0.5f * s / 10f))

    // Glass highlight on top of plates
    if (active) {
        val leftGlass = buildPath("M 2 5.5 L 6 5.5 L 6 7 L 2 7 Z", s)
        val rightGlass = buildPath("M 18 5.5 L 22 5.5 L 22 7 L 18 7 Z", s)
        val glassBrush = Brush.verticalGradient(
            colors = listOf(Color.White.copy(alpha = 0.2f), Color.Transparent),
            startY = 5.5f * s,
            endY = 7f * s
        )
        drawPath(leftGlass, glassBrush)
        drawPath(rightGlass, glassBrush)
    }

    // Detail lines
    drawLine(
        color = if (active) IronRed.copy(alpha = 0.2f) else Color(0x33555555),
        start = Offset(4f * s, 9f * s),
        end = Offset(4f * s, 15f * s),
        strokeWidth = 0.5f * s / 10f
    )
    drawLine(
        color = if (active) IronRed.copy(alpha = 0.2f) else Color(0x33555555),
        start = Offset(20f * s, 9f * s),
        end = Offset(20f * s, 15f * s),
        strokeWidth = 0.5f * s / 10f
    )
}

// ════════════════════════════════════════════════════════════════
// 4. AI BRAIN (AI COACH)
// Angular brain polygon, center divide, 4 neural nodes
// Nodes pulse sequentially: delay 0/0.2/0.35/0.5s
// ════════════════════════════════════════════════════════════════

@Composable
fun EliteBrainIcon(
    active: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp
) {
    // 4 neural nodes with staggered pulse
    val node1Alpha = rememberPulseAlpha(minAlpha = 0.4f, maxAlpha = 1f, durationMillis = 700, delayMillis = 0)
    val node2Alpha = rememberPulseAlpha(minAlpha = 0.4f, maxAlpha = 1f, durationMillis = 700, delayMillis = 200)
    val node3Alpha = rememberPulseAlpha(minAlpha = 0.4f, maxAlpha = 1f, durationMillis = 700, delayMillis = 350)
    val node4Alpha = rememberPulseAlpha(minAlpha = 0.4f, maxAlpha = 1f, durationMillis = 700, delayMillis = 500)

    // Connection lines pulse
    val connAlpha = rememberPulseAlpha(minAlpha = 0.3f, maxAlpha = 0.7f, durationMillis = 1200)

    // Energy rays pulse
    val rayAlpha = rememberPulseAlpha(minAlpha = 0.3f, maxAlpha = 0.6f, durationMillis = 1500)

    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension / 24f

        // Brain gradient
        val brainGradient = Brush.linearGradient(
            colorStops = arrayOf(
                0f to Color(0xFFFF4444),
                0.5f to IronRedDark,
                1f to IronRedDeep
            ),
            start = Offset(0f, 0f),
            end = Offset(24f * s, 24f * s)
        )

        // Brain silhouette
        val brain = buildPath(
            "M 12 2 L 15 3 L 18 4 L 20 6 L 21 9 L 21 12 L 20 15 L 18 17 L 16 18 L 14 19 L 14 22 L 10 22 L 10 19 L 8 18 L 6 17 L 4 15 L 3 12 L 3 9 L 4 6 L 6 4 L 9 3 Z", s
        )

        if (active) {
            drawPath(brain, brainGradient)
            drawPath(brain, color = IronRed, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
        } else {
            drawPath(brain, color = inactiveColor, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
        }

        // Center divide line
        drawLine(
            color = if (active) IronRedDeep else Color(0xFF555555),
            start = Offset(12f * s, 3.5f * s),
            end = Offset(12f * s, 18.5f * s),
            strokeWidth = 1f * s / 10f
        )

        // Lobe segment lines
        val segColor = if (active) IronRedDeep.copy(alpha = 0.53f) else Color(0x44555555)
        drawLine(segColor, Offset(6f * s, 8f * s), Offset(10f * s, 9f * s), 0.8f * s / 10f)
        drawLine(segColor, Offset(14f * s, 9f * s), Offset(18f * s, 8f * s), 0.8f * s / 10f)
        drawLine(segColor, Offset(5f * s, 13f * s), Offset(10f * s, 12f * s), 0.8f * s / 10f)
        drawLine(segColor, Offset(14f * s, 12f * s), Offset(19f * s, 13f * s), 0.8f * s / 10f)

        if (active) {
            // Glass highlight on upper lobe
            val glass = buildPath("M 9 3.5 L 12 2.5 L 14 3.5 L 12 5 Z", s)
            val glassBrush = Brush.linearGradient(
                colors = listOf(Color.White.copy(alpha = 0.15f), Color.Transparent),
                start = Offset(9f * s, 2.5f * s),
                end = Offset(14f * s, 5f * s)
            )
            drawPath(glass, glassBrush)

            // Neural nodes — diamond shapes with staggered alpha
            val node1 = buildPath("M 7 8 L 8 7 L 9 8 L 8 9 Z", s)
            val node2 = buildPath("M 15 8 L 16 7 L 17 8 L 16 9 Z", s)
            val node3 = buildPath("M 12 12 L 13 11 L 14 12 L 13 13 Z", s)
            val node4 = buildPath("M 7 14 L 8 13 L 9 14 L 8 15 Z", s)

            drawPath(node1, color = Color.White, alpha = node1Alpha)
            drawPath(node2, color = Color.White, alpha = node2Alpha)
            drawPath(node3, color = Color.White, alpha = node3Alpha)
            drawPath(node4, color = Color.White, alpha = node4Alpha)

            // Connection lines between nodes
            val connColor = Color.White.copy(alpha = connAlpha)
            drawLine(connColor, Offset(8f * s, 8f * s), Offset(13f * s, 12f * s), 0.6f * s / 10f)
            drawLine(connColor, Offset(16f * s, 8f * s), Offset(13f * s, 12f * s), 0.6f * s / 10f)
            drawLine(connColor, Offset(8f * s, 8f * s), Offset(16f * s, 8f * s), 0.6f * s / 10f)
            drawLine(connColor, Offset(8f * s, 14f * s), Offset(13f * s, 12f * s), 0.6f * s / 10f)

            // Energy rays
            val rayColor = Color(0xFFFF4444)
            drawLine(rayColor, Offset(2f * s, 9f * s), Offset(3f * s, 9f * s), 1.5f * s / 10f, alpha = rayAlpha)
            drawLine(rayColor, Offset(21f * s, 9f * s), Offset(22f * s, 9f * s), 1.5f * s / 10f, alpha = rayAlpha)
            drawLine(rayColor, Offset(3f * s, 6f * s), Offset(4f * s, 6.5f * s), 1f * s / 10f, alpha = rayAlpha)
            drawLine(rayColor, Offset(20f * s, 6f * s), Offset(21f * s, 6.5f * s), 1f * s / 10f, alpha = rayAlpha)
        }

        // Base band / stem
        val stem = buildPath("M 10 20 L 14 20 L 14 22 L 10 22 Z", s)
        drawPath(stem, color = if (active) Color(0xFF660000) else inactiveColorLight)
        drawPath(stem, color = if (active) IronRedDeep else Color(0xFF555555), style = Stroke(width = 0.5f * s / 10f))
    }
}

// ════════════════════════════════════════════════════════════════
// 5. PULSE HEART (CARDIO)
// Angular heart 8 vertices, EKG pulse line
// Heartbeat: scale [1, 1.12, 1, 1.08, 1], 0.7s
// ════════════════════════════════════════════════════════════════

@Composable
fun EliteHeartIcon(
    active: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp
) {
    // Custom heartbeat: mimics scale [1, 1.12, 1, 1.08, 1] over 700ms
    val infiniteTransition = rememberInfiniteTransition(label = "heartbeat")
    val heartScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 700
                1f at 0 using FastOutSlowInEasing
                1.12f at 120 using FastOutSlowInEasing
                1f at 280 using FastOutSlowInEasing
                1.08f at 450 using FastOutSlowInEasing
                1f at 700 using FastOutSlowInEasing
            },
            repeatMode = RepeatMode.Restart
        ),
        label = "heartScale"
    )

    // EKG line draw animation
    val ekgProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ekgDraw"
    )

    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension / 24f
        val cx = this.size.width / 2f
        val cy = this.size.height / 2f

        if (active) {
            drawContext.transform.scale(heartScale, heartScale, Offset(cx, cy))
        }

        // Heart gradient
        val heartGradient = Brush.verticalGradient(
            colorStops = arrayOf(
                0f to Color(0xFFFF3333),
                0.4f to IronRedLight,
                0.7f to IronRed,
                1f to IronRedDeep
            ),
            startY = 2f * s,
            endY = 22f * s
        )

        // Angular heart: M12 5 L9 2 L5 2 L2 5 L2 9 L5 14 L12 22 L19 14 L22 9 L22 5 L19 2 L15 2 Z
        val heart = buildPath("M 12 5 L 9 2 L 5 2 L 2 5 L 2 9 L 5 14 L 12 22 L 19 14 L 22 9 L 22 5 L 19 2 L 15 2 Z", s)

        if (active) {
            drawPath(heart, heartGradient)
            drawPath(heart, color = IronRedLight, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))

            // Inner depth shadow
            val innerHeart = buildPath("M 12 7 L 10 4 L 7 4 L 5 6 L 5 9 L 7 13 L 12 19 L 17 13 L 19 9 L 19 6 L 17 4 L 14 4 Z", s)
            val depthBrush = Brush.verticalGradient(
                colors = listOf(IronRedDark.copy(alpha = 0.4f), Color(0xFF660000).copy(alpha = 0.6f)),
                startY = 4f * s,
                endY = 19f * s
            )
            drawPath(innerHeart, depthBrush)

            // Glass highlight upper left
            val glassHL = buildPath("M 9 2.5 L 5 2.5 L 3 5 L 3 7 L 5 4.5 L 9 3.5 Z", s)
            val glassBrush = Brush.linearGradient(
                colors = listOf(Color.White.copy(alpha = 0.18f), Color.Transparent),
                start = Offset(5f * s, 2.5f * s),
                end = Offset(9f * s, 7f * s)
            )
            drawPath(glassHL, glassBrush)

            // EKG pulse line: sharp zigzag
            if (ekgProgress > 0.05f) {
                val ekgPath = Path().apply {
                    moveTo(3f * s, 11f * s)
                    lineTo(6f * s, 11f * s)
                    lineTo(7.5f * s, 11f * s)
                    lineTo(9f * s, 7f * s)
                    lineTo(10.5f * s, 14f * s)
                    lineTo(12f * s, 9f * s)
                    lineTo(13.5f * s, 13f * s)
                    lineTo(15f * s, 11f * s)
                    lineTo(17f * s, 11f * s)
                    lineTo(21f * s, 11f * s)
                }
                val ekgAlpha = when {
                    ekgProgress < 0.1f -> ekgProgress * 10f
                    ekgProgress > 0.8f -> (1f - ekgProgress) * 5f
                    else -> 1f
                }
                drawPath(
                    ekgPath,
                    color = Color.White,
                    style = Stroke(width = 1.8f * s / 10f, join = StrokeJoin.Miter),
                    alpha = ekgAlpha.coerceIn(0f, 1f)
                )
            }
        } else {
            drawPath(heart, color = inactiveColor, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
            // Subtle EKG hint
            val ekgHint = Path().apply {
                moveTo(5f * s, 12f * s)
                lineTo(8f * s, 12f * s)
                lineTo(9.5f * s, 9f * s)
                lineTo(11f * s, 14f * s)
                lineTo(12.5f * s, 10f * s)
                lineTo(14f * s, 12f * s)
                lineTo(19f * s, 12f * s)
            }
            drawPath(ekgHint, color = inactiveColor, style = Stroke(width = 1f * s / 10f), alpha = 0.4f)
        }
    }
}

// ════════════════════════════════════════════════════════════════
// 6. ELITE CROWN (PROFILE/USER)
// 5-point crown, base band, center diamond, side jewels
// Center jewel: pulse scale [1, 1.15, 1], 0.8s
// Band shimmer: opacity [0.3, 0.7, 0.3], 2s
// ════════════════════════════════════════════════════════════════

@Composable
fun EliteCrownIcon(
    active: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp
) {
    val jewelScale = rememberPulseScale(
        minScale = 1f,
        maxScale = if (active) 1.15f else 1f,
        durationMillis = 800
    )
    val bandAlpha = rememberPulseAlpha(
        minAlpha = 0.3f,
        maxAlpha = 0.7f,
        durationMillis = 2000
    )

    Canvas(modifier = modifier.size(size)) {
        val s = this.size.minDimension / 24f

        // Crown gradient
        val crownGradient = Brush.verticalGradient(
            colorStops = arrayOf(
                0f to Color(0xFFFF4444),
                0.3f to IronRed,
                0.6f to IronRedDark,
                1f to IronRedDeep
            ),
            startY = 2f * s,
            endY = 17f * s
        )

        // Crown body: 5 points
        val crown = buildPath(
            "M 2 17 L 2 10 L 5 5 L 6 10 L 9 4 L 10 9 L 12 2 L 14 9 L 15 4 L 18 10 L 19 5 L 22 10 L 22 17 Z", s
        )

        if (active) {
            drawPath(crown, crownGradient)
            drawPath(crown, color = IronRed, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))

            // Inner depth shadow
            val depthPath = buildPath(
                "M 4 16 L 4 11 L 6 7 L 7 11 L 9.5 6 L 10.5 10 L 12 4.5 L 13.5 10 L 14.5 6 L 17 11 L 18 7 L 20 11 L 20 16 Z", s
            )
            val depthBrush = Brush.verticalGradient(
                colors = listOf(IronRedDark.copy(alpha = 0.5f), Color(0xFF660000).copy(alpha = 0.7f)),
                startY = 4.5f * s,
                endY = 16f * s
            )
            drawPath(depthPath, depthBrush)
        } else {
            drawPath(crown, color = inactiveColor, style = Stroke(width = 1.5f * s / 10f, join = StrokeJoin.Miter))
        }

        // Base band
        val band = buildPath("M 2 17 L 22 17 L 22 20 L 2 20 Z", s)
        drawPath(band, color = if (active) IronRedDarkest else inactiveColorLight)
        drawPath(band, color = if (active) IronRedDeep else Color(0xFF555555), style = Stroke(width = 0.5f * s / 10f))

        if (active) {
            // Center jewel — large diamond
            val cx = 12f * s
            val cy = 10.5f * s
            scale(jewelScale, jewelScale, Offset(cx, cy)) {
                val jewel = buildPath("M 12 8 L 13.5 10.5 L 12 13 L 10.5 10.5 Z", s)
                drawPath(jewel, color = Color(0xFFFF4444))
                drawPath(jewel, color = Color(0xFFFF6666), style = Stroke(width = 0.5f * s / 10f))
            }

            // Side jewels
            val leftJewel = buildPath("M 6 10 L 7 9 L 7.5 11 Z", s)
            val rightJewel = buildPath("M 18 10 L 17 9 L 16.5 11 Z", s)
            val farLeft = buildPath("M 4 12 L 5 11 L 5 13 Z", s)
            val farRight = buildPath("M 20 12 L 19 11 L 19 13 Z", s)

            drawPath(leftJewel, color = IronRedLight)
            drawPath(rightJewel, color = IronRedLight)
            drawPath(farLeft, color = IronRed, alpha = 0.7f)
            drawPath(farRight, color = IronRed, alpha = 0.7f)

            // Band shimmer highlight
            val shimmerBrush = Brush.horizontalGradient(
                colorStops = arrayOf(
                    0f to Color.Transparent,
                    0.5f to Color.White.copy(alpha = 0.15f),
                    1f to Color.Transparent
                ),
                startX = 3f * s,
                endX = 21f * s
            )
            val shimmerRect = buildPath("M 3 17.5 L 21 17.5 L 21 18.3 L 3 18.3 Z", s)
            drawPath(shimmerRect, shimmerBrush, alpha = bandAlpha)

            // Band detail notches
            val notchColor = IronRedDeep.copy(alpha = 0.27f)
            drawLine(notchColor, Offset(8f * s, 17f * s), Offset(8f * s, 20f * s), 0.5f * s / 10f)
            drawLine(notchColor, Offset(12f * s, 17f * s), Offset(12f * s, 20f * s), 0.5f * s / 10f)
            drawLine(notchColor, Offset(16f * s, 17f * s), Offset(16f * s, 20f * s), 0.5f * s / 10f)
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// NAV ICON SET — matches React NavIcons export
// ══════════════════════════════════════════════════════════════════

data class NavIconEntry(
    val key: String,
    val icon: @Composable (active: Boolean, modifier: Modifier, size: Dp) -> Unit
)

val NavIcons = mapOf(
    "home" to @Composable { active: Boolean, modifier: Modifier, size: Dp ->
        EliteFlameIcon(active, modifier, size)
    },
    "arena" to @Composable { active: Boolean, modifier: Modifier, size: Dp ->
        EliteSwordsIcon(active, modifier, size)
    },
    "train" to @Composable { active: Boolean, modifier: Modifier, size: Dp ->
        EliteDumbbellIcon(active, modifier, size)
    },
    "ailab" to @Composable { active: Boolean, modifier: Modifier, size: Dp ->
        EliteBrainIcon(active, modifier, size)
    },
    "pulse" to @Composable { active: Boolean, modifier: Modifier, size: Dp ->
        EliteHeartIcon(active, modifier, size)
    },
    "profile" to @Composable { active: Boolean, modifier: Modifier, size: Dp ->
        EliteCrownIcon(active, modifier, size)
    }
)
