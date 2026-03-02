package com.ironcore.fit.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
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
 * Username entry screen with real-time availability checking.
 * Shows @ prefix, validates format, debounces Firestore lookups.
 * Matches React PlayerCardView.jsx UsernameScreen.
 */
@Composable
fun UsernameScreen(
    username: String,
    usernameError: String?,
    isUsernameAvailable: Boolean?,
    isCheckingUsername: Boolean,
    error: String?,
    onUsernameChanged: (String) -> Unit,
    onConfirm: () -> Unit,
    onBack: () -> Unit
) {
    var rawInput by remember { mutableStateOf(username) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // ── Back button ──────────────────────────────────────
            IconButton(onClick = onBack) {
                Icon(
                    Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextPrimary
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Title ────────────────────────────────────────────
            Text(
                text = "IRONCORE",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = IronRed,
                letterSpacing = 4.sp
            )
            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Choose your username",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextPrimary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "This is how other players will know you",
                fontSize = 14.sp,
                color = IronTextTertiary
            )

            Spacer(modifier = Modifier.height(32.dp))

            // ── Username input ───────────────────────────────────
            OutlinedTextField(
                value = rawInput,
                onValueChange = {
                    rawInput = it
                    onUsernameChanged(it)
                },
                label = { Text("Username") },
                prefix = { Text("@", color = IronTextTertiary) },
                trailingIcon = {
                    when {
                        isCheckingUsername -> CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = IronTextTertiary
                        )
                        isUsernameAvailable == true -> Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = "Available",
                            tint = IronGreen
                        )
                        isUsernameAvailable == false -> Icon(
                            Icons.Default.Close,
                            contentDescription = "Taken",
                            tint = IronRed
                        )
                    }
                },
                isError = usernameError != null,
                supportingText = {
                    when {
                        usernameError != null -> Text(usernameError, color = IronRed)
                        isUsernameAvailable == true -> Text("Available!", color = IronGreen)
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = if (isUsernameAvailable == true) IronGreen else IronRed,
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
                    onDone = { if (isUsernameAvailable == true) onConfirm() }
                )
            )

            // ── Global error ─────────────────────────────────────
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

            // ── Continue button ──────────────────────────────────
            Button(
                onClick = onConfirm,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = IronRed),
                shape = RoundedCornerShape(14.dp),
                enabled = isUsernameAvailable == true && usernameError == null
            ) {
                Text(
                    text = "CONTINUE",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    letterSpacing = 2.sp
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
