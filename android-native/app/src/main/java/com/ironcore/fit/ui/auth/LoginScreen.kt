package com.ironcore.fit.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

/**
 * Login screen — username entry → PIN pad.
 *
 * Two-phase flow matching React LoginScreen.jsx:
 *   Phase 1: Enter username (@ prefix)
 *   Phase 2: Enter 6-digit PIN (via embedded PinEntryScreen)
 *
 * Recovery phrase option shown after 3 failed PIN attempts.
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
    // Phase 1: username entry.  Phase 2: PIN entry.
    var showPinPad by remember { mutableStateOf(false) }
    var localUsername by remember { mutableStateOf(loginUsername) }

    // When loading finishes with no error and user was authenticated,
    // the auth state listener handles navigation.

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        if (!showPinPad) {
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

                // Username input
                OutlinedTextField(
                    value = localUsername,
                    onValueChange = {
                        localUsername = it
                        onUsernameChanged(it)
                    },
                    label = { Text("Username") },
                    prefix = { Text("@", color = IronTextTertiary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = IronRed,
                        unfocusedBorderColor = IronCardBorder,
                        focusedLabelColor = IronRed,
                        unfocusedLabelColor = IronTextTertiary,
                        cursorColor = IronRed,
                        focusedTextColor = IronTextPrimary,
                        unfocusedTextColor = IronTextPrimary
                    ),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Ascii,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            if (localUsername.isNotBlank()) {
                                showPinPad = true
                            }
                        }
                    )
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
                Button(
                    onClick = { showPinPad = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = IronRed),
                    shape = RoundedCornerShape(14.dp),
                    enabled = localUsername.isNotBlank()
                ) {
                    Text(
                        text = "CONTINUE",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        letterSpacing = 2.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Recovery phrase link
                TextButton(
                    onClick = onRecovery,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Use recovery phrase instead",
                        color = IronTextSecondary,
                        fontSize = 14.sp
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        } else {
            // ────────────────────────────────────────────────
            // Phase 2: PIN entry
            // ────────────────────────────────────────────────
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Small back arrow to go back to username
                Row(
                    modifier = Modifier
                        .padding(start = 16.dp, top = 16.dp),
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
                    // PIN pad — uses the existing PinEntryScreen composable
                    // in a "login" mode where we don't store the hash locally
                    // but instead send it to the Cloud Function
                    PinEntryScreen(
                        mode = PinMode.SETUP,  // SETUP mode auto-submits after 6 digits
                        onComplete = { pinHash ->
                            onPinComplete(pinHash)
                        },
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
