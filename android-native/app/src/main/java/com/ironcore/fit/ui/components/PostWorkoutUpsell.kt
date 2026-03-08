package com.ironcore.fit.ui.components

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Post-Workout Upsell — Context-aware prompt after workout
// Matches React PostWorkoutUpsell.jsx (Ghost IC-013):
// 3 variants: form, history, competitive
// Rules: No show on first 3 workouts, max 1x/week, 3-strike suppress
// ══════════════════════════════════════════════════════════════════

private const val PREFS_KEY = "ironcore_upsell_state"
private const val KEY_DISMISS_COUNT = "dismiss_count"
private const val KEY_LAST_SHOWN = "last_shown"
private const val SEVEN_DAYS_MS = 7L * 24 * 60 * 60 * 1000

// Variant definitions — Ghost IC-013 copy
private enum class UpsellVariant(
    val icon: ImageVector,
    val header: String?,     // null = dynamic for history
    val body: String,
    val hook: String?,
    val features: List<String>,
    val cta: String
) {
    FORM(
        icon = Icons.Default.CameraAlt,
        header = "YOUR SESSION IS LOGGED. YOUR FORM DATA ISN'T.",
        body = "Free tier gives you a form score. Premium gives you the breakdown \u2014 rep-by-rep analysis, joint angle tracking, weak point identification, and week-over-week form improvement trends.",
        hook = "You just trained. The AI watched. Premium shows you exactly what it saw.",
        features = listOf(
            "Rep-by-rep form breakdown",
            "Joint angle tracking & correction history",
            "Weak point identification per exercise",
            "Form improvement trends (weekly)"
        ),
        cta = "UNLOCK FULL ANALYSIS"
    ),
    HISTORY(
        icon = Icons.Default.Schedule,
        header = null, // Uses "${totalWorkouts} SESSIONS LOGGED. FREE TIER KEEPS 30 DAYS."
        body = "Your training history is data. Patterns, progression, weak points \u2014 it's all in there. But free tier erases everything older than 30 days.",
        hook = "Premium keeps your entire record. Every session. Every PR. Every form score. Permanent.",
        features = listOf(
            "Unlimited workout history",
            "Long-term progression tracking",
            "PR timeline (every record, forever)",
            "Export your data anytime"
        ),
        cta = "KEEP YOUR FULL RECORD"
    ),
    COMPETITIVE(
        icon = Icons.Default.FitnessCenter,
        header = "YOU'RE COMPETING. COMPETE WITH BETTER TOOLS.",
        body = "Free tier gets you into the Arena. Premium gets you priority matchmaking, detailed opponent analysis, and battle replay breakdowns that show exactly where you won or lost points.",
        hook = null,
        features = listOf(
            "Priority Arena matchmaking",
            "Opponent form analysis",
            "Battle replay with scoring breakdown",
            "Exclusive league badges & cosmetics"
        ),
        cta = "GET THE EDGE"
    );
}

/**
 * Select variant based on user behavior — priority: Form > History > Competitive
 */
private fun selectVariant(
    hadFormCheck: Boolean,
    totalWorkouts: Int,
    hasArenaHistory: Boolean
): UpsellVariant {
    if (hadFormCheck) return UpsellVariant.FORM
    if (totalWorkouts >= 10) return UpsellVariant.HISTORY
    if (hasArenaHistory) return UpsellVariant.COMPETITIVE
    return UpsellVariant.HISTORY
}

private fun getUpsellPrefs(context: Context): SharedPreferences {
    return context.getSharedPreferences(PREFS_KEY, Context.MODE_PRIVATE)
}

@Composable
fun PostWorkoutUpsell(
    show: Boolean,
    isPremium: Boolean = false,
    totalWorkouts: Int = 0,
    hadFormCheck: Boolean = false,
    hasArenaHistory: Boolean = false,
    formScore: Int? = null,
    onUpgrade: () -> Unit = {},
    onDismiss: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(show) {
        if (!show || isPremium) return@LaunchedEffect

        // Rule: No show on first 3 workouts
        if (totalWorkouts < 4) return@LaunchedEffect

        val prefs = getUpsellPrefs(context)
        val dismissCount = prefs.getInt(KEY_DISMISS_COUNT, 0)
        val lastShown = prefs.getLong(KEY_LAST_SHOWN, 0L)

        // Rule: 3-strike permanent suppress
        if (dismissCount >= 3) return@LaunchedEffect

        // Rule: Max 1x/week
        if (lastShown > 0 && System.currentTimeMillis() - lastShown < SEVEN_DAYS_MS) return@LaunchedEffect

        // Rule: Don't upsell after frustration (form score < 50%)
        if (formScore != null && formScore < 50) return@LaunchedEffect

        visible = true
    }

    val handleDismiss = {
        val prefs = getUpsellPrefs(context)
        prefs.edit()
            .putInt(KEY_DISMISS_COUNT, prefs.getInt(KEY_DISMISS_COUNT, 0) + 1)
            .putLong(KEY_LAST_SHOWN, System.currentTimeMillis())
            .apply()
        visible = false
        onDismiss()
    }

    val handleCTA = {
        val prefs = getUpsellPrefs(context)
        prefs.edit()
            .putLong(KEY_LAST_SHOWN, System.currentTimeMillis())
            .apply()
        visible = false
        onUpgrade()
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(200)),
        exit = fadeOut(tween(200))
    ) {
        val variant = selectVariant(hadFormCheck, totalWorkouts, hasArenaHistory)
        val header = if (variant == UpsellVariant.HISTORY) {
            "$totalWorkouts SESSIONS LOGGED. FREE TIER KEEPS 30 DAYS."
        } else {
            variant.header ?: ""
        }

        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f))
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() }
                ) { handleDismiss() },
            contentAlignment = Alignment.BottomCenter
        ) {
            AnimatedVisibility(
                visible = true,
                enter = slideInVertically(
                    initialOffsetY = { it },
                    animationSpec = spring(dampingRatio = 0.8f, stiffness = 300f)
                ),
                exit = slideOutVertically(targetOffsetY = { it })
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.65f)
                        .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color(0xFB191919),
                                    Color(0xFC0A0A0A)
                                )
                            )
                        )
                        .border(
                            width = 1.dp,
                            color = GlassBorderSubtle,
                            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                        )
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) { /* Consume clicks */ }
                        .verticalScroll(rememberScrollState())
                ) {
                    // Drag handle
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp, bottom = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .width(40.dp)
                                .height(4.dp)
                                .background(GlassWhite20, RoundedCornerShape(2.dp))
                        )
                    }

                    Column(
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Icon + Header
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(
                                                IronAmberGold.copy(alpha = 0.2f),
                                                IronAmberGold.copy(alpha = 0.1f)
                                            )
                                        ),
                                        RoundedCornerShape(16.dp)
                                    )
                                    .border(
                                        1.dp,
                                        IronAmberGold.copy(alpha = 0.3f),
                                        RoundedCornerShape(16.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    variant.icon,
                                    contentDescription = null,
                                    tint = IronAmberGold,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                            Text(
                                text = header,
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        // Body
                        Text(
                            text = variant.body,
                            color = Color.White.copy(alpha = 0.5f),
                            fontSize = 12.sp,
                            lineHeight = 18.sp
                        )

                        // Hook
                        if (variant.hook != null) {
                            Text(
                                text = variant.hook,
                                color = Color.White.copy(alpha = 0.7f),
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.sp,
                                lineHeight = 18.sp
                            )
                        }

                        // Feature highlights
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            variant.features.forEach { feature ->
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.ChevronRight,
                                        contentDescription = null,
                                        tint = IronAmberGold,
                                        modifier = Modifier.size(10.dp)
                                    )
                                    Text(
                                        text = feature,
                                        color = Color.White.copy(alpha = 0.6f),
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }

                        // CTAs
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(top = 4.dp)
                        ) {
                            // Primary CTA
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(
                                        Brush.linearGradient(
                                            listOf(IronRed, Color(0xFFEA580C))
                                        )
                                    )
                                    .clickable { handleCTA() }
                                    .padding(vertical = 14.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.WorkspacePremium,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = variant.cta,
                                        color = Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp
                                    )
                                }
                            }

                            // See plans
                            TextButton(
                                onClick = { handleCTA() },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "See plans & pricing",
                                    color = Color.White.copy(alpha = 0.4f),
                                    fontSize = 12.sp
                                )
                            }

                            // Not now
                            TextButton(
                                onClick = { handleDismiss() },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "NOT NOW",
                                    color = Color.White.copy(alpha = 0.25f),
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
