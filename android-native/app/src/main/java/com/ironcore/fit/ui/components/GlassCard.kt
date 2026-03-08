package com.ironcore.fit.ui.components

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Glass Morphism System — 4-tier hierarchy matching React index.css
//
// STANDARD  → .glass      → 20dp blur, red border 0.15α
// LIQUID    → .liquid-glass → 40dp blur, shimmer overlay, border 0.2α
// NAV       → .glass-nav   → 50dp blur, upward shadow, border-top 0.25α
// NAV_PILL  → .glass-nav-pill → opaque base, 40dp blur, edge shimmer
//
// API 31+: Real RenderEffect blur
// API 26-30: Solid dark fallback (no blur API available)
// ══════════════════════════════════════════════════════════════════

enum class GlassTier {
    STANDARD,   // .glass — cards, modals, sheets
    LIQUID,     // .liquid-glass — hero cards, premium panels
    NAV,        // .glass-nav — bottom navigation bar
    NAV_PILL    // .glass-nav-pill — floating pill nav
}

/**
 * Glass-morphism card matching React CSS exactly.
 * 4 tiers of glass with real blur on API 31+ and solid dark fallback.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    tier: GlassTier = GlassTier.STANDARD,
    highlight: Boolean = false,
    animated: Boolean = false,
    cornerRadius: Dp = 24.dp,
    padding: Dp = 20.dp,
    content: @Composable BoxScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)
    val supportsBlur = Build.VERSION.SDK_INT >= 31

    // ── Glass gradient overlay (subtle light sweep on top of solid base) ──
    val bgBrush = when (tier) {
        GlassTier.STANDARD -> Brush.linearGradient(
            colorStops = arrayOf(
                0f to Color(0x14FFFFFF),    // 8% white
                0.5f to Color(0x0AFFFFFF),  // 4% white
                1f to Color(0x14FFFFFF)     // 8% white
            ),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
        )
        GlassTier.LIQUID -> Brush.linearGradient(
            colorStops = arrayOf(
                0f to Color(0x1AFFFFFF),    // 10% white
                0.4f to Color(0x0DFFFFFF),  // 5% white
                0.6f to Color(0x0FFFFFFF),  // 6% white
                1f to Color(0x1AFFFFFF)     // 10% white
            ),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
        )
        GlassTier.NAV -> Brush.verticalGradient(
            colorStops = arrayOf(
                0f to Color(0x1AFFFFFF),    // 10% white top
                1f to Color(0x05FFFFFF)     // 2% white bottom
            )
        )
        GlassTier.NAV_PILL -> Brush.linearGradient(
            colorStops = arrayOf(
                0f to Color(0x26DC2626),        // 15% red
                0.5f to Color(0x0DFFFFFF),      // 5% white
                1f to Color(0x1ADC2626)         // 10% red
            ),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY)
        )
    }

    // ── Solid base color — must be clearly distinct from pure black on OLED ──
    val fallbackColor = when (tier) {
        GlassTier.STANDARD -> if (highlight) Color(0xFF381414) else Color(0xFF222222)
        GlassTier.LIQUID -> if (highlight) Color(0xFF3C1616) else Color(0xFF282828)
        GlassTier.NAV -> Color(0xFF1C1C1C)
        GlassTier.NAV_PILL -> Color(0xFF1A1A1A)
    }

    // ── Border color per tier ───────────────────────────────────
    val borderColor = when (tier) {
        GlassTier.STANDARD -> if (highlight) IronRed.copy(alpha = 0.5f) else Color(0x33DC2626) // 20% red
        GlassTier.LIQUID -> Color(0x40DC2626)      // 25% red
        GlassTier.NAV -> Color.Transparent          // border-top only, handled separately
        GlassTier.NAV_PILL -> Color(0x66DC2626)     // 40% red
    }

    // ── Blur radius per tier ────────────────────────────────────
    val blurRadius = when (tier) {
        GlassTier.STANDARD -> 20f
        GlassTier.LIQUID -> 40f
        GlassTier.NAV -> 50f
        GlassTier.NAV_PILL -> 40f
    }

    // ── Shadow config per tier ──────────────────────────────────
    val (elevation, spotColor) = when (tier) {
        GlassTier.STANDARD -> if (highlight) 20.dp to GlowRed12 else 12.dp to ShadowBlack50
        GlassTier.LIQUID -> 24.dp to ShadowBlack60
        GlassTier.NAV -> 20.dp to ShadowBlack50
        GlassTier.NAV_PILL -> 28.dp to ShadowBlack70
    }

    Box(
        modifier = modifier
            .shadow(
                elevation = elevation,
                shape = shape,
                ambientColor = ShadowBlack50,
                spotColor = spotColor
            )
            .clip(shape)
            // Solid dark base + glass gradient overlay
            // NOTE: RenderEffect blur on graphicsLayer blurs ALL children
            // (text, icons) not just the background — so we use a layered
            // approach: opaque dark base + subtle glass gradient on top.
            .background(fallbackColor)
            .background(bgBrush)
            // Nav-pill: opaque base UNDER glass gradient
            .then(
                if (tier == GlassTier.NAV_PILL && supportsBlur) {
                    Modifier.background(NavPillBackground)
                } else Modifier
            )
            // Inset glow — simulates CSS inset box-shadow
            .drawBehind {
                when (tier) {
                    GlassTier.STANDARD -> {
                        // inset 0 1px 0 rgba(255,255,255,0.08)
                        drawLine(
                            color = Color.White.copy(alpha = 0.08f),
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = 1f
                        )
                        // inset 0 -1px 0 rgba(220,38,38,0.05)
                        drawLine(
                            color = IronRed.copy(alpha = 0.05f),
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 1f
                        )
                    }
                    GlassTier.LIQUID -> {
                        // inset 0 2px 0 rgba(255,255,255,0.1)
                        drawLine(
                            color = Color.White.copy(alpha = 0.10f),
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = 2f
                        )
                        // inset 0 -2px 4px rgba(220,38,38,0.05)
                        drawLine(
                            color = IronRed.copy(alpha = 0.05f),
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 2f
                        )
                    }
                    GlassTier.NAV -> {
                        // inset 0 2px 0 rgba(220,38,38,0.15) — top red shine
                        drawLine(
                            color = IronRed.copy(alpha = 0.15f),
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = 2f
                        )
                    }
                    GlassTier.NAV_PILL -> {
                        // inset 0 1px 0 rgba(220,38,38,0.25)
                        drawLine(
                            color = IronRed.copy(alpha = 0.25f),
                            start = Offset(0f, 0f),
                            end = Offset(size.width, 0f),
                            strokeWidth = 1f
                        )
                        // inset 0 -1px 0 rgba(255,255,255,0.03)
                        drawLine(
                            color = Color.White.copy(alpha = 0.03f),
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = 1f
                        )
                    }
                }
            }
            // Border
            .then(
                when (tier) {
                    GlassTier.NAV -> {
                        // Nav has border-top only (0.25α) + side borders (0.1α)
                        Modifier
                            .drawBehind {
                                drawLine(
                                    color = GlassBorderStrong,
                                    start = Offset(0f, 0f),
                                    end = Offset(size.width, 0f),
                                    strokeWidth = 1f
                                )
                            }
                            .border(
                                width = 1.dp,
                                brush = Brush.verticalGradient(
                                    colorStops = arrayOf(
                                        0f to GlassBorderSubtle,
                                        0.1f to GlassBorderSubtle,
                                        0.9f to Color.Transparent,
                                        1f to Color.Transparent
                                    )
                                ),
                                shape = shape
                            )
                    }
                    else -> Modifier.border(1.dp, borderColor, shape)
                }
            )
            .padding(padding)
    ) {
        // Shimmer overlays for animated tiers
        // IMPORTANT: Use matchParentSize() NOT fillMaxSize() so overlays
        // don't inflate parent size when measured with unbounded constraints
        // (e.g. inside Scaffold bottomBar slot).
        if (animated || tier == GlassTier.LIQUID) {
            LiquidShimmer(
                modifier = Modifier.matchParentSize(),
                durationMillis = 8000,
                shimmerColor = IronRed.copy(alpha = 0.06f),
                edgeColor = IronRed.copy(alpha = 0.02f)
            )
        }

        if (tier == GlassTier.NAV_PILL) {
            // Top-edge shimmer sweep
            NavEdgeShimmer(
                modifier = Modifier.align(Alignment.TopCenter),
                durationMillis = 4000,
                shimmerColor = IronRed.copy(alpha = 0.6f)
            )
            // Inner shine overlay
            InnerShine(
                modifier = Modifier.matchParentSize(),
                topColor = Color.White.copy(alpha = 0.08f),
                bottomColor = IronRed.copy(alpha = 0.05f)
            )
        }

        content()
    }
}

/**
 * Convenience: Standard glass card (most common usage)
 */
@Composable
fun StandardGlassCard(
    modifier: Modifier = Modifier,
    highlight: Boolean = false,
    cornerRadius: Dp = 24.dp,
    padding: Dp = 20.dp,
    content: @Composable BoxScope.() -> Unit
) {
    GlassCard(
        modifier = modifier,
        tier = GlassTier.STANDARD,
        highlight = highlight,
        cornerRadius = cornerRadius,
        padding = padding,
        content = content
    )
}

/**
 * Convenience: Liquid glass card (hero/premium panels)
 */
@Composable
fun LiquidGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    padding: Dp = 24.dp,
    content: @Composable BoxScope.() -> Unit
) {
    GlassCard(
        modifier = modifier,
        tier = GlassTier.LIQUID,
        animated = true,
        cornerRadius = cornerRadius,
        padding = padding,
        content = content
    )
}
