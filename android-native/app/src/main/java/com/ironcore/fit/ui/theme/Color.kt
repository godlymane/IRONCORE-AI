package com.ironcore.fit.ui.theme

import androidx.compose.ui.graphics.Color

// ══════════════════════════════════════════════════════════════════
// IronCore Canonical Color Tokens — Exact match to React index.css
// ══════════════════════════════════════════════════════════════════

// ── Primary Accent System ────────────────────────────────────────
val IronRed = Color(0xFFDC2626)           // --color-accent
val IronRedLight = Color(0xFFEF4444)       // --color-accent-light
val IronRedExtraLight = Color(0xFFF87171)  // --color-accent-extra-light
val IronRedDark = Color(0xFFB91C1C)        // --color-accent-dark / secondary
val IronRedDeep = Color(0xFF991B1B)        // --color-accent-deep / tertiary
val IronRedDarkest = Color(0xFF7F0000)     // Gradient endpoint (icon flames)

// ── Accent Glow ──────────────────────────────────────────────────
val IronAccentGlow = Color(0x80DC2626)     // rgba(220,38,38,0.5) — --color-accent-glow
val IronGoldGlow = Color(0x80DC2626)       // rgba(220,38,38,0.5) — --color-gold-glow (BlayzEx red)

// ── Backgrounds — Pure Black System ──────────────────────────────
val IronBlack = Color(0xFF000000)          // --color-background
val IronBackgroundSecondary = Color(0xFF080808) // --color-background-secondary
val IronSurface = Color(0xFF0A0A0A)        // elevated surface
val IronSurfaceElevated = Color(0xFF141414) // card background
val IronCard = Color(0xFF1A1A1A)           // card fill
val IronCardBorder = Color(0xFF2A2A2A)     // card border

// ── CSS Variable Surface Colors ──────────────────────────────────
val IronSurfaceRedTint = Color(0x08DC2626)     // rgba(220,38,38,0.03) — --color-surface
val IronSurfaceRedHover = Color(0x14DC2626)    // rgba(220,38,38,0.08) — --color-surface-hover

// ── Text ─────────────────────────────────────────────────────────
val IronTextPrimary = Color(0xFFFFFFFF)         // --color-text
val IronTextSecondary = Color(0xCCFFFFFF)       // rgba(255,255,255,0.8) — --color-text-secondary
val IronTextTertiary = Color(0x80FFFFFF)        // rgba(255,255,255,0.5) — --color-text-muted
val IronTextDisabled = Color(0xFF737373)        // disabled state

// ── Status / Gamification ────────────────────────────────────────
val IronGreen = Color(0xFF22C55E)
val IronYellow = Color(0xFFFBBF24)
val IronBlue = Color(0xFF3B82F6)
val IronOrange = Color(0xFFF97316)
val IronPurple = Color(0xFFA855F7)
val IronAmberGold = Color(0xFFF59E0B)      // Used in particle systems

// ── Glass Alpha Variants ─────────────────────────────────────────
// White overlays for glass surfaces
val GlassWhite03 = Color(0x08FFFFFF)       // 3% white
val GlassWhite05 = Color(0x0DFFFFFF)       // 5% white
val GlassWhite08 = Color(0x14FFFFFF)       // 8% white
val GlassWhite10 = Color(0x1AFFFFFF)       // 10% white
val GlassWhite15 = Color(0x26FFFFFF)       // 15% white
val GlassWhite20 = Color(0x33FFFFFF)       // 20% white

// Red-tinted glass borders (matching CSS)
val GlassBorderSubtle = Color(0x1ADC2626)  // rgba(220,38,38,0.1) — inactive border
val GlassBorderDefault = Color(0x26DC2626) // rgba(220,38,38,0.15) — .glass border
val GlassBorderMedium = Color(0x33DC2626)  // rgba(220,38,38,0.2) — .liquid-glass border
val GlassBorderStrong = Color(0x40DC2626)  // rgba(220,38,38,0.25) — .glass-nav border-top
val GlassBorderIntense = Color(0x59DC2626) // rgba(220,38,38,0.35) — .glass-nav-pill border

// ── Nav-Pill Specific ────────────────────────────────────────────
val NavPillBackground = Color(0xF5080808)  // rgba(8,8,8,0.96) — opaque pill base
val NavPillRedTint08 = Color(0x14DC2626)   // rgba(220,38,38,0.08)
val NavPillRedTint05 = Color(0x0DDC2626)   // rgba(220,38,38,0.05)

// ── Shadow / Glow Colors ─────────────────────────────────────────
val ShadowBlack50 = Color(0x80000000)      // rgba(0,0,0,0.5)
val ShadowBlack60 = Color(0x99000000)      // rgba(0,0,0,0.6)
val ShadowBlack70 = Color(0xB3000000)      // rgba(0,0,0,0.7)
val GlowRed03 = Color(0x08DC2626)          // rgba(220,38,38,0.03)
val GlowRed05 = Color(0x0DDC2626)          // rgba(220,38,38,0.05)
val GlowRed08 = Color(0x14DC2626)          // rgba(220,38,38,0.08)
val GlowRed12 = Color(0x1FDC2626)          // rgba(220,38,38,0.12)
val GlowRed15 = Color(0x26DC2626)          // rgba(220,38,38,0.15)
val GlowRed25 = Color(0x40DC2626)          // rgba(220,38,38,0.25)
val GlowRed40 = Color(0x66DC2626)          // rgba(220,38,38,0.4)

// ── Icon Inactive Color ──────────────────────────────────────────
val IconInactive = Color(0xFF6B7280)       // Tailwind gray-500
val IconInactiveLight = Color(0xFF4B5563)  // Tailwind gray-600
val IconInactiveDark = Color(0xFF374151)   // Tailwind gray-700

// ── Backward compat aliases ──────────────────────────────────────
val GlassWhite = GlassWhite10
val GlassBorder = GlassWhite20
