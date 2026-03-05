package com.ironcore.fit.ui.auth

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
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
 * Username entry screen with real-time availability checking.
 * Glass morphism styling matching React Capacitor app.
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            IconButton(onClick = onBack) {
                Icon(
                    Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextPrimary
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

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

            // Glass username input with availability indicator
            GlassInput(
                value = rawInput,
                onValueChange = {
                    rawInput = it
                    onUsernameChanged(it)
                },
                placeholder = "Username",
                modifier = Modifier.fillMaxWidth(),
                prefix = {
                    Text(
                        text = "@",
                        color = IronTextTertiary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                },
                suffix = {
                    when {
                        isCheckingUsername -> CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = IronTextTertiary
                        )
                        isUsernameAvailable == true -> Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = "Available",
                            tint = IronGreen,
                            modifier = Modifier.size(20.dp)
                        )
                        isUsernameAvailable == false -> Icon(
                            Icons.Default.Close,
                            contentDescription = "Taken",
                            tint = IronRed,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            )

            // Status text
            Spacer(modifier = Modifier.height(8.dp))
            when {
                usernameError != null -> Text(
                    text = usernameError,
                    color = IronRed,
                    fontSize = 12.sp
                )
                isUsernameAvailable == true -> Text(
                    text = "Available!",
                    color = IronGreen,
                    fontSize = 12.sp
                )
            }

            // Global error
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

            GlassButton(
                text = "CONTINUE",
                onClick = onConfirm,
                variant = ButtonVariant.PRIMARY,
                enabled = isUsernameAvailable == true && usernameError == null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
