package com.ironcore.fit.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.components.*
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
 * Full-screen PIN entry composable with glass morphism styling.
 *
 * Uses AnimatedPinDots and GlassNumberPad from IronCoreComponents
 * to match the React Capacitor app visuals exactly.
 *
 * - 6-digit PIN with spring-animated dot fill
 * - SHA-256 hash comparison in verify mode
 * - Maximum 3 verification attempts before showing recovery
 * - Haptic feedback on every digit press, success, and error
 */
@Composable
fun PinEntryScreen(
    mode: PinMode = PinMode.VERIFY,
    storedPinHash: String? = null,
    onComplete: (String) -> Unit = {},
    onForgot: () -> Unit = {}
) {
    val context = LocalContext.current

    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var currentMode by remember { mutableStateOf(mode) }
    var error by remember { mutableStateOf<String?>(null) }
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
    fun handleDigit(digit: Int) {
        if (pin.length >= 6) return
        HapticFeedback.light(context)
        pin += digit.toString()
        error = null

        if (pin.length == 6) {
            when (currentMode) {
                PinMode.SETUP -> {
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

            // ── Animated PIN dots (from IronCoreComponents) ──────
            AnimatedPinDots(
                pinLength = 6,
                filledCount = pin.length
            )

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

            // ── Glass Number Pad (from IronCoreComponents) ───────
            GlassNumberPad(
                onDigit = { digit -> handleDigit(digit) },
                onDelete = { handleDelete() }
            )

            // ── Recovery option (after 3 failed attempts) ────────
            if (attempts >= 3 && currentMode == PinMode.VERIFY) {
                Spacer(modifier = Modifier.height(16.dp))
                GlassButton(
                    text = "USE RECOVERY PHRASE",
                    onClick = onForgot,
                    variant = ButtonVariant.GHOST
                )
            }
        }
    }
}
