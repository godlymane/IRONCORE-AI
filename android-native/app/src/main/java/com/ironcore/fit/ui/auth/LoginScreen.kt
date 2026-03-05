package com.ironcore.fit.ui.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.components.*
import com.ironcore.fit.ui.theme.*

/**
 * Login screen — username entry → PIN pad.
 *
 * Two-phase flow matching React LoginScreen.jsx:
 *   Phase 1: Enter username (@ prefix)
 *   Phase 2: Enter 6-digit PIN (via embedded PinEntryScreen)
 *
 * Glass morphism styling matching Capacitor app exactly.
 */
@Composable
fun LoginScreen(
    loginUsername: String,
    loginAttempts: Int,
    isLoading: Boolean,
    error: String?,
    onUsernameChanged: (String) -> Unit,
    onPinComplete: (String) -> Unit,
    onBack: () -> Unit,
    onRecovery: () -> Unit
) {
    var showPinPad by remember { mutableStateOf(false) }
    var localUsername by remember { mutableStateOf(loginUsername) }

    // Fade in animation
    val fadeIn = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        fadeIn.animateTo(1f, animationSpec = tween(500, easing = FastOutSlowInEasing))
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .alpha(fadeIn.value)
    ) {
        AnimatedContent(
            targetState = showPinPad,
            transitionSpec = {
                slideInHorizontally { if (targetState) it else -it } + fadeIn() togetherWith
                        slideOutHorizontally { if (targetState) -it else it } + fadeOut()
            },
            label = "loginPhase"
        ) { isPinPhase ->
            if (!isPinPhase) {
                // ────────────────────────────────────────────────
                // Phase 1: Username entry
                // ────────────────────────────────────────────────
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 32.dp)
                ) {
                    Spacer(modifier = Modifier.height(16.dp))

                    // Back button
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = IronTextPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Branding
                    Text(
                        text = "IRONCORE",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = IronRed,
                        letterSpacing = 4.sp
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    Text(
                        text = "Welcome back",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = IronTextPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Enter your username to continue",
                        fontSize = 14.sp,
                        color = IronTextTertiary
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    // Glass username input
                    GlassInput(
                        value = localUsername,
                        onValueChange = {
                            localUsername = it
                            onUsernameChanged(it)
                        },
                        placeholder = "Username",
                        modifier = Modifier.fillMaxWidth(),
                        prefix = {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = IronTextTertiary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    )

                    // Error from previous login attempt
                    if (error != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = error,
                            color = IronRed,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // Continue → show PIN pad
                    GlassButton(
                        text = "CONTINUE",
                        onClick = { showPinPad = true },
                        variant = ButtonVariant.PRIMARY,
                        enabled = localUsername.isNotBlank(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Recovery phrase link
                    GlassButton(
                        text = "USE RECOVERY PHRASE",
                        onClick = onRecovery,
                        variant = ButtonVariant.GHOST,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(32.dp))
                }
            } else {
                // ────────────────────────────────────────────────
                // Phase 2: PIN entry
                // ────────────────────────────────────────────────
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Back arrow to go back to username
                    Row(
                        modifier = Modifier.padding(start = 16.dp, top = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { showPinPad = false }) {
                            Icon(
                                Icons.Default.ArrowBack,
                                contentDescription = "Back to username",
                                tint = IronTextPrimary
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "@${localUsername.removePrefix("@").lowercase().trim()}",
                            fontSize = 16.sp,
                            color = IronTextSecondary
                        )
                    }

                    // Loading overlay
                    if (isLoading) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                CircularProgressIndicator(color = IronRed)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "Signing in...",
                                    color = IronTextTertiary,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    } else {
                        PinEntryScreen(
                            mode = PinMode.SETUP,
                            onComplete = { pinHash -> onPinComplete(pinHash) },
                            onForgot = onRecovery
                        )
                    }

                    // Show error below PIN pad
                    if (error != null && !isLoading) {
                        Text(
                            text = error,
                            color = IronRed,
                            fontSize = 14.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 32.dp)
                        )
                    }
                }
            }
        }
    }
}
