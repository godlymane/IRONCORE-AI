package com.ironcore.fit.ui.auth

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text
import com.ironcore.fit.ui.components.ButtonVariant
import com.ironcore.fit.ui.components.GlassButton
import com.ironcore.fit.ui.theme.*

/**
 * Landing screen — first thing users see.
 * Two buttons: "Create Account" and "Log In".
 * Glass morphism styling matching React Capacitor app exactly.
 */
@Composable
fun LandingScreen(
    onCreateAccount: () -> Unit,
    onLogin: () -> Unit
) {
    // Fade-in on mount
    val fadeIn = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        fadeIn.animateTo(
            targetValue = 1f,
            animationSpec = tween(600, easing = FastOutSlowInEasing)
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .alpha(fadeIn.value),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp)
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // ── Branding ─────────────────────────────────────────
            Text(
                text = "IRONCORE",
                fontFamily = OswaldFontFamily,
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = IronRed,
                letterSpacing = 6.sp
            )
            Text(
                text = "FIT",
                fontFamily = OswaldFontFamily,
                fontSize = 22.sp,
                fontWeight = FontWeight.Normal,
                color = IronTextSecondary,
                letterSpacing = 10.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Your Phone. Your Trainer.",
                fontFamily = InterFontFamily,
                fontSize = 16.sp,
                color = IronTextTertiary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.weight(1f))

            // ── Create Account — gradient red button ──────────────
            GlassButton(
                text = "CREATE ACCOUNT",
                onClick = onCreateAccount,
                variant = ButtonVariant.PRIMARY,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // ── Log In — glass secondary button ───────────────────
            GlassButton(
                text = "LOG IN",
                onClick = onLogin,
                variant = ButtonVariant.SECONDARY,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            )

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
