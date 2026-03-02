package com.ironcore.fit.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

/**
 * Landing screen — first thing users see.
 * Two buttons: "Create Account" and "Log In".
 * Matches React PlayerCardView.jsx landing step.
 */
@Composable
fun LandingScreen(
    onCreateAccount: () -> Unit,
    onLogin: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack),
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
                fontSize = 42.sp,
                fontWeight = FontWeight.Black,
                color = IronRed,
                letterSpacing = 6.sp
            )
            Text(
                text = "FIT",
                fontSize = 22.sp,
                fontWeight = FontWeight.Light,
                color = IronTextSecondary,
                letterSpacing = 10.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Your Phone. Your Trainer.",
                fontSize = 16.sp,
                color = IronTextTertiary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.weight(1f))

            // ── Create Account button ────────────────────────────
            Button(
                onClick = onCreateAccount,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = IronRed),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "CREATE ACCOUNT",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    letterSpacing = 2.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ── Log In button ────────────────────────────────────
            OutlinedButton(
                onClick = onLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = IronTextPrimary
                ),
                border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                    brush = androidx.compose.ui.graphics.SolidColor(IronCardBorder)
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "LOG IN",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    letterSpacing = 2.sp
                )
            }

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
