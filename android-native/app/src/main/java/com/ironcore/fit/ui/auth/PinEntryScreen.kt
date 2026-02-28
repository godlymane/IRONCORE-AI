package com.ironcore.fit.ui.auth

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*
import com.ironcore.fit.util.HapticFeedback
import com.ironcore.fit.util.PlayerIdentity

/**
 * PIN entry mode determines the screen's behavior.
 *
 * SETUP   – user creates a new 6-digit PIN.
 * CONFIRM – user re-enters the PIN they just created (internal transition from SETUP).
 * VERIFY  – user enters their existing PIN which is checked against a stored SHA-256 hash.
 */
enum class PinMode { SETUP, CONFIRM, VERIFY }

/**
 * Full-screen PIN entry composable.
 *
 * Renders a branded header, six animated PIN dots, a 3x4 number pad, and
 * contextual error / recovery UI.  Matches the React PinEntryView.jsx
 * behavior one-to-one:
 *
 * - 6-digit PIN with animated dot fill
 * - SHA-256 hash comparison in verify mode
 * - Maximum 3 verification attempts before showing recovery
 * - Haptic feedback on every digit press, success, and error
 *
 * @param mode        Initial PIN mode (SETUP or VERIFY).
 * @param storedPinHash  The SHA-256 hex digest of the user's stored PIN (verify mode only).
 * @param onComplete  Called with the PIN hash on successful setup or verification.
 * @param onForgot    Called when the user taps "Use Recovery Phrase" after 3 failed attempts.
 */
@Composable
fun PinEntryScreen(
    mode: PinMode = PinMode.VERIFY,
    storedPinHash: String? = null,
    onComplete: (String) -> Unit = {},
    onForgot: () -> Unit = {}
) {
    val context = LocalContext.current

    // Current digits entered so far (0-6 characters).
    var pin by remember { mutableStateOf("") }

    // Holds the first PIN entry during the SETUP -> CONFIRM flow.
    var confirmPin by remember { mutableStateOf("") }

    // Active mode — may transition from SETUP -> CONFIRM internally.
    var currentMode by remember { mutableStateOf(mode) }

    // User-facing error string, cleared on next digit press.
    var error by remember { mutableStateOf<String?>(null) }

    // Failed verification attempts counter.
    var attempts by remember { mutableIntStateOf(0) }

    val title = when (currentMode) {
        PinMode.SETUP -> "Create your PIN"
        PinMode.CONFIRM -> "Confirm your PIN"
        PinMode.VERIFY -> "Enter your PIN"
    }

    val subtitle = when (currentMode) {
        PinMode.SETUP -> "Choose a 6-digit PIN to secure your profile"
        PinMode.CONFIRM -> "Re-enter the same PIN to confirm"
        PinMode.VERIFY -> "Enter your 6-digit PIN to continue"
    }

    // ── Digit handler ────────────────────────────────────────────
    fun handleDigit(digit: String) {
        if (pin.length >= 6) return
        HapticFeedback.light(context)
        pin += digit
        error = null

        if (pin.length == 6) {
            when (currentMode) {
                PinMode.SETUP -> {
                    // Save PIN and move to confirmation step.
                    confirmPin = pin
                    pin = ""
                    currentMode = PinMode.CONFIRM
                }

                PinMode.CONFIRM -> {
                    if (pin == confirmPin) {
                        HapticFeedback.success(context)
                        onComplete(PlayerIdentity.hashPin(pin))
                    } else {
                        HapticFeedback.error(context)
                        error = "PINs don't match. Try again."
                        pin = ""
                        confirmPin = ""
                        currentMode = PinMode.SETUP
                    }
                }

                PinMode.VERIFY -> {
                    val hash = PlayerIdentity.hashPin(pin)
                    if (hash == storedPinHash) {
                        HapticFeedback.success(context)
                        onComplete(hash)
                    } else {
                        attempts++
                        HapticFeedback.error(context)
                        pin = ""
                        error = if (attempts >= 3) {
                            "Too many attempts"
                        } else {
                            "Wrong PIN. ${3 - attempts} attempt${if (3 - attempts != 1) "s" else ""} left."
                        }
                    }
                }
            }
        }
    }

    // ── Delete handler ───────────────────────────────────────────
    fun handleDelete() {
        if (pin.isNotEmpty()) {
            HapticFeedback.light(context)
            pin = pin.dropLast(1)
        }
    }

    // ── UI ────────────────────────────────────────────────────────
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
            // ── Branding ─────────────────────────────────────────
            Text(
                text = "IRONCORE",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = IronRed,
                letterSpacing = 4.sp
            )

            Spacer(modifier = Modifier.height(48.dp))

            // ── Title & subtitle ─────────────────────────────────
            Text(
                text = title,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextPrimary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = IronTextTertiary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            // ── PIN dots ─────────────────────────────────────────
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(6) { index ->
                    val filled = index < pin.length
                    val dotColor by animateColorAsState(
                        targetValue = if (filled) IronRed else IronCardBorder,
                        animationSpec = spring(),
                        label = "pinDot$index"
                    )
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(dotColor)
                            .border(
                                width = 1.dp,
                                color = if (filled) IronRed else IronCardBorder,
                                shape = CircleShape
                            )
                    )
                }
            }

            // ── Error message ────────────────────────────────────
            if (error != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = error!!,
                    color = IronRed,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(48.dp))

            // ── Number pad ───────────────────────────────────────
            val keys = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("", "0", "DEL")
            )

            keys.forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    row.forEach { key ->
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .then(
                                    if (key.isNotEmpty()) {
                                        Modifier
                                            .background(IronSurfaceElevated)
                                            .clickable(
                                                interactionSource = remember { MutableInteractionSource() },
                                                indication = null
                                            ) {
                                                if (key == "DEL") handleDelete() else handleDigit(key)
                                            }
                                    } else {
                                        Modifier
                                    }
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            when (key) {
                                "DEL" -> Icon(
                                    imageVector = Icons.AutoMirrored.Filled.Backspace,
                                    contentDescription = "Delete",
                                    tint = IronTextSecondary,
                                    modifier = Modifier.size(24.dp)
                                )

                                "" -> { /* blank spacer cell */ }

                                else -> Text(
                                    text = key,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = IronTextPrimary
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // ── Recovery option (after 3 failed attempts) ────────
            if (attempts >= 3 && currentMode == PinMode.VERIFY) {
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = onForgot) {
                    Text(
                        text = "Use Recovery Phrase",
                        color = IronRedLight,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
