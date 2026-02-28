package com.ironcore.fit.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val IronCoreDarkScheme = darkColorScheme(
    primary = IronRed,
    onPrimary = IronTextPrimary,
    primaryContainer = IronRedDark,
    onPrimaryContainer = IronTextPrimary,
    secondary = IronRedLight,
    onSecondary = IronTextPrimary,
    background = IronBlack,
    onBackground = IronTextPrimary,
    surface = IronSurface,
    onSurface = IronTextPrimary,
    surfaceVariant = IronSurfaceElevated,
    onSurfaceVariant = IronTextSecondary,
    outline = IronCardBorder,
    error = Color(0xFFEF4444),
    onError = IronTextPrimary
)

@Composable
fun IronCoreTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = IronCoreDarkScheme,
        typography = IronCoreTypography,
        content = content
    )
}
