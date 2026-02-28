package com.ironcore.fit.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Haptic feedback utility for tactile responses throughout the app.
 *
 * Provides light / medium / heavy taps and patterned success / error
 * vibrations. Uses the modern VibratorManager API on Android 12+ and
 * falls back to the legacy Vibrator service on older versions.
 */
object HapticFeedback {

    private fun getVibrator(context: Context): Vibrator {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    /** Quick, subtle tap -- button presses, toggles. */
    fun light(context: Context) {
        val vibrator = getVibrator(context)
        vibrator.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE))
    }

    /** Standard tap -- selection changes, navigation. */
    fun medium(context: Context) {
        val vibrator = getVibrator(context)
        vibrator.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
    }

    /** Strong tap -- important confirmations, milestones. */
    fun heavy(context: Context) {
        val vibrator = getVibrator(context)
        vibrator.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
    }

    /** Double-pulse pattern -- workout completed, achievement unlocked. */
    fun success(context: Context) {
        val vibrator = getVibrator(context)
        vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 30, 50, 30), -1))
    }

    /** Triple-pulse pattern -- validation errors, failed actions. */
    fun error(context: Context) {
        val vibrator = getVibrator(context)
        vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 60, 40, 60, 40, 60), -1))
    }
}
