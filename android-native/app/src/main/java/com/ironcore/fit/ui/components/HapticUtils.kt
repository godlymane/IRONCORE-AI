package com.ironcore.fit.ui.components

import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalView

// ══════════════════════════════════════════════════════════════════
// Haptic Feedback Utility — native vibration on taps/events
// Matches React: navigator.vibrate(10) on buttons,
// [10,50,10] on pull-to-refresh, longer on achievements
// ══════════════════════════════════════════════════════════════════

enum class HapticStyle {
    /** Light tap — button press, toggle, selection */
    LIGHT,
    /** Medium — confirmation, tab switch */
    MEDIUM,
    /** Heavy — achievement, level up, PR */
    HEAVY,
    /** Error — form validation, network error */
    ERROR,
    /** Success — workout complete, purchase done */
    SUCCESS
}

/** Fire haptic feedback from a View reference */
fun View.performHaptic(style: HapticStyle) {
    val constant = when (style) {
        HapticStyle.LIGHT -> HapticFeedbackConstants.CLOCK_TICK
        HapticStyle.MEDIUM -> HapticFeedbackConstants.CONTEXT_CLICK
        HapticStyle.HEAVY -> HapticFeedbackConstants.LONG_PRESS
        HapticStyle.ERROR -> HapticFeedbackConstants.REJECT
        HapticStyle.SUCCESS -> HapticFeedbackConstants.CONFIRM
    }
    try {
        performHapticFeedback(constant)
    } catch (_: Exception) {
        // Fallback for older APIs that don't support REJECT/CONFIRM
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }
}

/** Composable-friendly haptic trigger */
@Composable
fun rememberHaptic(): (HapticStyle) -> Unit {
    val view = LocalView.current
    return remember(view) { { style: HapticStyle -> view.performHaptic(style) } }
}

/** Modifier that adds haptic feedback to any clickable */
fun Modifier.hapticClickable(
    style: HapticStyle = HapticStyle.LIGHT,
    onClick: () -> Unit
): Modifier = composed {
    val view = LocalView.current
    this.clickable(
        interactionSource = remember { MutableInteractionSource() },
        indication = null
    ) {
        view.performHaptic(style)
        onClick()
    }
}
