package com.ironcore.fit.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*
import kotlinx.coroutines.delay

// ══════════════════════════════════════════════════════════════════
// Splash Screen — Animated app logo on launch
// Matches React PremiumUI.jsx SplashScreen:
// Phase 1 (0-500ms): Logo scales in from 0 → 1
// Phase 2 (500-1200ms): Brand text fades in
// Phase 3 (1200-1800ms): Tagline fades in
// Phase 4 (1800-2500ms): Everything fades out
// ══════════════════════════════════════════════════════════════════

enum class SplashPhase {
    LOGO, BRAND, TAGLINE, FADEOUT, DONE
}

@Composable
fun IronCoreSplashScreen(
    onComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    var phase by remember { mutableStateOf(SplashPhase.LOGO) }

    // Phase timing
    LaunchedEffect(Unit) {
        delay(500)
        phase = SplashPhase.BRAND
        delay(700)
        phase = SplashPhase.TAGLINE
        delay(600)
        phase = SplashPhase.FADEOUT
        delay(700)
        phase = SplashPhase.DONE
        onComplete()
    }

    // Logo scale: 0 → 1 with spring
    val logoScale by animateFloatAsState(
        targetValue = when (phase) {
            SplashPhase.LOGO -> 0f
            SplashPhase.FADEOUT, SplashPhase.DONE -> 1.1f
            else -> 1f
        },
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "logoScale"
    )

    val logoAlpha by animateFloatAsState(
        targetValue = if (phase == SplashPhase.FADEOUT || phase == SplashPhase.DONE) 0f else 1f,
        animationSpec = tween(500),
        label = "logoAlpha"
    )

    // Brand text
    val brandAlpha by animateFloatAsState(
        targetValue = when (phase) {
            SplashPhase.BRAND, SplashPhase.TAGLINE -> 1f
            SplashPhase.FADEOUT, SplashPhase.DONE -> 0f
            else -> 0f
        },
        animationSpec = tween(400),
        label = "brandAlpha"
    )

    // Tagline
    val taglineAlpha by animateFloatAsState(
        targetValue = when (phase) {
            SplashPhase.TAGLINE -> 1f
            SplashPhase.FADEOUT, SplashPhase.DONE -> 0f
            else -> 0f
        },
        animationSpec = tween(400),
        label = "taglineAlpha"
    )

    // Container fade
    val containerAlpha by animateFloatAsState(
        targetValue = if (phase == SplashPhase.DONE) 0f else 1f,
        animationSpec = tween(300),
        label = "containerAlpha"
    )

    if (phase == SplashPhase.DONE) return

    Box(
        modifier = modifier
            .fillMaxSize()
            .alpha(containerAlpha)
            .background(IronBlack),
        contentAlignment = Alignment.Center
    ) {
        // Ambient particles behind logo
        AmbientParticles(
            modifier = Modifier.fillMaxSize(),
            count = 8,
            enabled = true
        )

        // Red glow behind logo
        Box(
            modifier = Modifier
                .size(200.dp)
                .alpha(logoAlpha * 0.4f)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            IronRed.copy(alpha = 0.3f),
                            Color.Transparent
                        ),
                        radius = 300f
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Logo text (using text as logo placeholder)
            Text(
                text = "IC",
                fontSize = 72.sp,
                fontWeight = FontWeight.Black,
                color = IronRed,
                modifier = Modifier
                    .scale(logoScale)
                    .alpha(logoAlpha),
                textAlign = TextAlign.Center
            )

            // Brand name
            Text(
                text = "IRONCORE",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 8.sp,
                modifier = Modifier.alpha(brandAlpha),
                textAlign = TextAlign.Center
            )

            // Tagline
            Text(
                text = "Your Phone. Your Trainer.",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = IronTextTertiary,
                modifier = Modifier.alpha(taglineAlpha),
                textAlign = TextAlign.Center
            )
        }
    }
}
