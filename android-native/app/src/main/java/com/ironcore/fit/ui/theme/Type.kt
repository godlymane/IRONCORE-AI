package com.ironcore.fit.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.ironcore.fit.R

// ══════════════════════════════════════════════════════════════════
// Custom Font Families — Matching React index.css exactly
// Inter (body), Oswald (headings), JetBrains Mono (data)
// ══════════════════════════════════════════════════════════════════

val InterFontFamily = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
)

val OswaldFontFamily = FontFamily(
    Font(R.font.oswald_medium, FontWeight.Medium),
    Font(R.font.oswald_semibold, FontWeight.SemiBold),
    Font(R.font.oswald_bold, FontWeight.Bold),
)

val JetBrainsMonoFontFamily = FontFamily(
    Font(R.font.jetbrains_mono_regular, FontWeight.Normal),
    Font(R.font.jetbrains_mono_medium, FontWeight.Medium),
    Font(R.font.jetbrains_mono_bold, FontWeight.Bold),
)

// ══════════════════════════════════════════════════════════════════
// Typography Scale — matches React BlayzEx theme
// Display/Headline: Oswald (bold, uppercase, tight tracking)
// Title/Body: Inter (clean, readable)
// Label/Data: Inter or JetBrains Mono for numbers
// ══════════════════════════════════════════════════════════════════

val IronCoreTypography = Typography(
    // Oswald headings — bold, tight letter-spacing like CSS .font-heading
    displayLarge = TextStyle(
        fontFamily = OswaldFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.02).sp,
        color = IronTextPrimary
    ),
    headlineLarge = TextStyle(
        fontFamily = OswaldFontFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.02).sp,
        color = IronTextPrimary
    ),
    headlineMedium = TextStyle(
        fontFamily = OswaldFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.02).sp,
        color = IronTextPrimary
    ),
    // Inter for title/body/label
    titleLarge = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
        color = IronTextPrimary
    ),
    titleMedium = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        color = IronTextPrimary
    ),
    bodyLarge = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        color = IronTextSecondary
    ),
    bodyMedium = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = IronTextSecondary
    ),
    bodySmall = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        color = IronTextTertiary
    ),
    labelLarge = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.5.sp,
        color = IronTextPrimary
    ),
    labelMedium = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
        color = IronTextSecondary
    ),
    labelSmall = TextStyle(
        fontFamily = InterFontFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.5.sp,
        color = IronTextTertiary
    )
)

// ══════════════════════════════════════════════════════════════════
// Convenience text styles for direct use
// ══════════════════════════════════════════════════════════════════

/** Oswald uppercase heading — matches CSS .font-heading */
val HeadingStyle = TextStyle(
    fontFamily = OswaldFontFamily,
    fontWeight = FontWeight.Bold,
    letterSpacing = (-0.02).sp,
    color = IronTextPrimary
)

/** Oswald uppercase italic — matches CSS .font-heading-italic */
val HeadingItalicStyle = TextStyle(
    fontFamily = OswaldFontFamily,
    fontWeight = FontWeight.Bold,
    fontStyle = FontStyle.Italic,
    letterSpacing = (-0.02).sp,
    color = IronTextPrimary
)

/** JetBrains Mono for data/numbers/stats */
val DataStyle = TextStyle(
    fontFamily = JetBrainsMonoFontFamily,
    fontWeight = FontWeight.Medium,
    color = IronTextPrimary
)

/** JetBrains Mono bold for large stat numbers */
val StatNumberStyle = TextStyle(
    fontFamily = JetBrainsMonoFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 28.sp,
    color = IronTextPrimary
)
