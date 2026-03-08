package com.ironcore.fit.ui.profile

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.components.GlassTier
import com.ironcore.fit.ui.components.ProfileSkeleton
import com.ironcore.fit.ui.navigation.SubScreen
import com.ironcore.fit.ui.theme.*
import com.ironcore.fit.util.XpCalculator
import kotlinx.coroutines.delay

@Composable
fun ProfileScreen(
    navController: NavHostController? = null,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var showTargetsDialog by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    // Stagger entrance
    var sectionsVisible by remember { mutableStateOf(false) }
    LaunchedEffect(state.isLoading) {
        if (!state.isLoading) {
            delay(100)
            sectionsVisible = true
        }
    }

    if (state.isLoading) {
        ProfileSkeleton(
            modifier = Modifier
                .fillMaxSize()
                .background(IronBlack)
        )
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ── 1. Profile Header ────────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 0) {
                ProfileHeader(
                    displayName = state.displayName,
                    email = state.email,
                    level = state.level,
                    league = state.league,
                    xp = state.xp,
                    photoUrl = state.photoUrl
                )
            }
        }

        // ── 2. Stats Grid ────────────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 1) {
                StatsGrid(
                    level = state.level,
                    xp = state.xp,
                    streak = state.currentStreak,
                    longestStreak = state.longestStreak
                )
            }
        }

        // ── 3. Subscription Card ─────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 2) {
                SubscriptionCard(
                    isPremium = state.isPremium,
                    planName = state.subscriptionPlan,
                    expiryDate = state.subscriptionExpiry
                )
            }
        }

        // ── 4. Daily Targets ─────────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 3) {
                DailyTargetsCard(
                    calories = state.dailyCalories,
                    protein = state.dailyProtein,
                    carbs = state.dailyCarbs,
                    fats = state.dailyFats,
                    onEdit = { showTargetsDialog = true }
                )
            }
        }

        // ── 5. Quick Actions ─────────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 4) {
                Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                    SectionHeader("Quick Actions")
                    Spacer(modifier = Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        padding = 0.dp,
                        cornerRadius = 20.dp
                    ) {
                        Column {
                            ActionRow(
                                icon = Icons.Outlined.Shield,
                                label = if (state.hasPin) "Change PIN" else "Set Up PIN",
                                sublabel = if (state.hasPin) "PIN is active" else "Secure your profile",
                                iconTint = IronGreen,
                                showDivider = true,
                                onClick = {
                                    navController?.navigate(
                                        if (state.hasPin) SubScreen.PIN_VERIFY else SubScreen.PIN_SETUP
                                    )
                                }
                            )
                            ActionRow(
                                icon = Icons.Outlined.EmojiEvents,
                                label = "Achievements",
                                sublabel = "View your trophies",
                                iconTint = IronYellow,
                                showDivider = true,
                                onClick = { navController?.navigate(SubScreen.ACHIEVEMENTS) }
                            )
                            ActionRow(
                                icon = Icons.Outlined.Leaderboard,
                                label = "League",
                                sublabel = state.league,
                                iconTint = IronOrange,
                                showDivider = true,
                                onClick = { navController?.navigate(SubScreen.LEAGUE) }
                            )
                            ActionRow(
                                icon = Icons.Outlined.CardMembership,
                                label = "Player Card",
                                sublabel = "Your identity",
                                iconTint = IronPurple,
                                showDivider = true,
                                onClick = { navController?.navigate(SubScreen.PLAYER_CARD) }
                            )
                            ActionRow(
                                icon = Icons.Outlined.BarChart,
                                label = "Statistics",
                                sublabel = "Detailed analytics",
                                iconTint = IronBlue,
                                showDivider = false,
                                onClick = { navController?.navigate(SubScreen.STATS) }
                            )
                        }
                    }
                }
            }
        }

        // ── 6. Settings ──────────────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 5) {
                Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                    SectionHeader("Settings")
                    Spacer(modifier = Modifier.height(10.dp))
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        padding = 0.dp,
                        cornerRadius = 20.dp
                    ) {
                        Column {
                            ToggleRow(
                                icon = Icons.Outlined.Notifications,
                                label = "Notifications",
                                sublabel = "Push alerts & reminders",
                                iconTint = IronBlue,
                                isChecked = state.notificationsEnabled,
                                onToggle = { viewModel.toggleNotifications() },
                                showDivider = true
                            )
                            ToggleRow(
                                icon = Icons.Outlined.Vibration,
                                label = "Haptics",
                                sublabel = "Vibration feedback",
                                iconTint = IronPurple,
                                isChecked = state.hapticsEnabled,
                                onToggle = { viewModel.toggleHaptics() },
                                showDivider = true
                            )
                            ToggleRow(
                                icon = Icons.AutoMirrored.Outlined.VolumeUp,
                                label = "Sound",
                                sublabel = "Audio effects",
                                iconTint = IronGreen,
                                isChecked = state.soundEnabled,
                                onToggle = { viewModel.toggleSound() },
                                showDivider = true
                            )
                            ActionRow(
                                icon = Icons.Outlined.Settings,
                                label = "App Settings",
                                sublabel = "Preferences & more",
                                iconTint = IronTextSecondary,
                                showDivider = true,
                                onClick = { navController?.navigate(SubScreen.SETTINGS) }
                            )
                            ActionRow(
                                icon = Icons.Outlined.Info,
                                label = "About IronCore",
                                sublabel = "Version 1.0.0",
                                iconTint = IronTextTertiary,
                                showDivider = false,
                                onClick = { }
                            )
                        }
                    }
                }
            }
        }

        // ── 7. Sign Out ──────────────────────────────────────────────
        item {
            StaggerItem(visible = sectionsVisible, index = 6) {
                Column {
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedButton(
                        onClick = { showLogoutConfirm = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = IronRed),
                        border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                            brush = Brush.linearGradient(
                                listOf(IronRed.copy(alpha = 0.3f), IronRed.copy(alpha = 0.1f))
                            )
                        )
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Logout, null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Sign Out",
                            fontWeight = FontWeight.Bold,
                            fontFamily = OswaldFontFamily,
                            letterSpacing = 1.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(40.dp))
                }
            }
        }
    }

    // ── Dialogs ──────────────────────────────────────────────────────

    if (showTargetsDialog) {
        EditTargetsDialog(
            currentCalories = state.dailyCalories,
            currentProtein = state.dailyProtein,
            currentCarbs = state.dailyCarbs,
            currentFats = state.dailyFats,
            isSaving = state.isSaving,
            onSave = { cal, pro, carb, fat ->
                viewModel.updateDailyTargets(cal, pro, carb, fat)
                showTargetsDialog = false
            },
            onDismiss = { showTargetsDialog = false }
        )
    }

    // ── 7. Logout Confirmation (glass styled) ────────────────────────
    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            containerColor = Color(0xF2121212),
            shape = RoundedCornerShape(24.dp),
            title = {
                Text(
                    "SIGN OUT",
                    color = IronTextPrimary,
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    letterSpacing = 2.sp
                )
            },
            text = {
                Text(
                    "Are you sure you want to sign out? You'll need to log in again to access your data.",
                    color = IronTextSecondary,
                    fontFamily = InterFontFamily,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutConfirm = false
                        viewModel.logout()
                    }
                ) {
                    Text(
                        "SIGN OUT",
                        color = IronRed,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) {
                    Text("Cancel", color = IronTextTertiary, fontFamily = InterFontFamily)
                }
            }
        )
    }

    // Error handling
    state.error?.let { error ->
        LaunchedEffect(error) {
            delay(3000)
            viewModel.clearError()
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// Stagger Animation Wrapper
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun StaggerItem(
    visible: Boolean,
    index: Int,
    content: @Composable () -> Unit
) {
    var itemVisible by remember { mutableStateOf(false) }
    LaunchedEffect(visible) {
        if (visible) {
            delay(index * 60L)
            itemVisible = true
        }
    }

    AnimatedVisibility(
        visible = itemVisible,
        enter = fadeIn(tween(300, easing = FastOutSlowInEasing)) +
                slideInVertically(
                    initialOffsetY = { 30 },
                    animationSpec = tween(350, easing = FastOutSlowInEasing)
                )
    ) {
        content()
    }
}

// ══════════════════════════════════════════════════════════════════════
// 1. Profile Header — Avatar + Name + Level + League + XP Bar
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun ProfileHeader(
    displayName: String,
    email: String,
    level: Int,
    league: String,
    xp: Long,
    photoUrl: String
) {
    val levelProgress = XpCalculator.getLevelProgress(xp)

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        tier = GlassTier.LIQUID
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Avatar with level badge
            Box(contentAlignment = Alignment.BottomEnd) {
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(IronRed, IronRedDark, IronRedDeep)
                            )
                        )
                        .border(3.dp, IronRed.copy(alpha = 0.5f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = displayName.firstOrNull()?.uppercase() ?: "?",
                        fontSize = 36.sp,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                // Level badge overlay
                Box(
                    modifier = Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(IronRed, IronRedDark))
                        )
                        .border(2.dp, IronBlack, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$level",
                        fontSize = 12.sp,
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Display name — Oswald heading
            Text(
                text = displayName.uppercase(),
                fontSize = 24.sp,
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 1.sp
            )

            // Email
            Text(
                text = email,
                fontSize = 12.sp,
                fontFamily = InterFontFamily,
                color = IronTextTertiary
            )

            Spacer(modifier = Modifier.height(14.dp))

            // League badge pill
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        Brush.horizontalGradient(
                            listOf(IronRed.copy(alpha = 0.15f), IronRed.copy(alpha = 0.05f))
                        )
                    )
                    .border(1.dp, IronRed.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 18.dp, vertical = 6.dp)
            ) {
                Text(
                    text = league.uppercase(),
                    fontSize = 11.sp,
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    color = IronRed,
                    letterSpacing = 2.sp
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // XP progress bar
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "LEVEL $level",
                        fontSize = 10.sp,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        color = IronTextSecondary,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "${levelProgress.currentXpInLevel}/${levelProgress.xpNeededForNext} XP",
                        fontSize = 10.sp,
                        fontFamily = JetBrainsMonoFontFamily,
                        fontWeight = FontWeight.Medium,
                        color = IronTextTertiary
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(IronCardBorder)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(levelProgress.progress)
                            .clip(RoundedCornerShape(3.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(IronRedDark, IronRed, IronRedLight)
                                )
                            )
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// 2. Stats Grid — 4 mini glass cards with JetBrains Mono numbers
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun StatsGrid(level: Int, xp: Long, streak: Int, longestStreak: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        StatCard(
            icon = Icons.Filled.Star,
            value = "$level",
            label = "Level",
            color = IronYellow,
            modifier = Modifier.weight(1f)
        )
        StatCard(
            icon = Icons.Filled.Bolt,
            value = formatXp(xp),
            label = "Total XP",
            color = IronRed,
            modifier = Modifier.weight(1f)
        )
        StatCard(
            icon = Icons.Filled.LocalFireDepartment,
            value = "$streak",
            label = "Streak",
            color = IronOrange,
            modifier = Modifier.weight(1f)
        )
        StatCard(
            icon = Icons.Filled.MilitaryTech,
            value = "$longestStreak",
            label = "Best",
            color = IronGreen,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun StatCard(
    icon: ImageVector,
    value: String,
    label: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier,
        cornerRadius = 16.dp,
        padding = 10.dp
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            // JetBrains Mono number
            Text(
                text = value,
                fontSize = 18.sp,
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
            Text(
                text = label.uppercase(),
                fontSize = 8.sp,
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.Medium,
                color = IronTextTertiary,
                letterSpacing = 1.sp
            )
        }
    }
}

private fun formatXp(xp: Long): String {
    return when {
        xp >= 10_000 -> "${xp / 1000}K"
        xp >= 1_000 -> String.format("%.1fK", xp / 1000.0)
        else -> "$xp"
    }
}

// ══════════════════════════════════════════════════════════════════════
// 3. Subscription Card — Premium status, plan, expiry, manage
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun SubscriptionCard(isPremium: Boolean, planName: String, expiryDate: String) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        highlight = isPremium
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (isPremium) Brush.linearGradient(listOf(IronRed, IronRedDark))
                            else Brush.linearGradient(listOf(IronCardBorder, IronCard))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isPremium) Icons.Filled.WorkspacePremium
                        else Icons.Outlined.Lock,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column {
                    Text(
                        text = planName.uppercase(),
                        fontSize = 14.sp,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        color = IronTextPrimary,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = if (isPremium && expiryDate.isNotBlank()) "Expires $expiryDate"
                        else if (isPremium) "Active"
                        else "Upgrade for full access",
                        fontSize = 11.sp,
                        fontFamily = InterFontFamily,
                        color = IronTextTertiary
                    )
                }
            }

            if (!isPremium) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            Brush.linearGradient(listOf(IronRed, IronRedDark))
                        )
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "UPGRADE",
                        fontSize = 10.sp,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(GlassWhite08)
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "MANAGE",
                        fontSize = 10.sp,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        color = IronTextSecondary,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// 4. Daily Targets Card — Editable macros with glass input fields
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun DailyTargetsCard(
    calories: Int,
    protein: Int,
    carbs: Int,
    fats: Int,
    onEdit: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "DAILY TARGETS",
                    fontSize = 13.sp,
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    letterSpacing = 2.sp
                )
                TextButton(onClick = onEdit) {
                    Icon(
                        Icons.Outlined.Edit,
                        null,
                        modifier = Modifier.size(14.dp),
                        tint = IronRed
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Edit",
                        color = IronRed,
                        fontSize = 12.sp,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                MacroItem("Calories", "$calories", "kcal", IronRed)
                MacroItem("Protein", "${protein}g", "", IronBlue)
                MacroItem("Carbs", "${carbs}g", "", IronYellow)
                MacroItem("Fats", "${fats}g", "", IronOrange)
            }
        }
    }
}

@Composable
private fun MacroItem(label: String, value: String, unit: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // JetBrains Mono for the number
        Text(
            text = value,
            fontSize = 20.sp,
            fontFamily = JetBrainsMonoFontFamily,
            fontWeight = FontWeight.Bold,
            color = color
        )
        if (unit.isNotBlank()) {
            Text(
                text = unit,
                fontSize = 9.sp,
                fontFamily = InterFontFamily,
                color = IronTextTertiary
            )
        }
        Text(
            text = label.uppercase(),
            fontSize = 9.sp,
            fontFamily = OswaldFontFamily,
            fontWeight = FontWeight.Medium,
            color = IronTextSecondary,
            letterSpacing = 1.sp
        )
    }
}

// ══════════════════════════════════════════════════════════════════════
// 5. Action Row — Glass row with icon, label, chevron
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun ActionRow(
    icon: ImageVector,
    label: String,
    sublabel: String,
    iconTint: Color = IronTextSecondary,
    showDivider: Boolean = false,
    onClick: () -> Unit
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = 18.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(iconTint.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    fontSize = 14.sp,
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = IronTextPrimary
                )
                Text(
                    text = sublabel,
                    fontSize = 11.sp,
                    fontFamily = InterFontFamily,
                    color = IronTextTertiary
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = IronTextTertiary,
                modifier = Modifier.size(20.dp)
            )
        }
        if (showDivider) {
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 18.dp),
                thickness = 0.5.dp,
                color = GlassWhite05
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// 6. Toggle Row — Settings with switch
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun ToggleRow(
    icon: ImageVector,
    label: String,
    sublabel: String,
    iconTint: Color,
    isChecked: Boolean,
    onToggle: () -> Unit,
    showDivider: Boolean = false
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onToggle)
                .padding(horizontal = 18.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(iconTint.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    fontSize = 14.sp,
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = IronTextPrimary
                )
                Text(
                    text = sublabel,
                    fontSize = 11.sp,
                    fontFamily = InterFontFamily,
                    color = IronTextTertiary
                )
            }
            Switch(
                checked = isChecked,
                onCheckedChange = { onToggle() },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = IronRed,
                    checkedBorderColor = IronRed,
                    uncheckedThumbColor = IronTextTertiary,
                    uncheckedTrackColor = IronCardBorder,
                    uncheckedBorderColor = IronCardBorder
                )
            )
        }
        if (showDivider) {
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = 18.dp),
                thickness = 0.5.dp,
                color = GlassWhite05
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════════
// Section Header — Oswald uppercase
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        fontSize = 12.sp,
        fontFamily = OswaldFontFamily,
        fontWeight = FontWeight.Bold,
        color = IronTextTertiary,
        letterSpacing = 2.sp,
        modifier = Modifier.padding(start = 4.dp)
    )
}

// ══════════════════════════════════════════════════════════════════════
// Edit Targets Dialog — Glass styled
// ══════════════════════════════════════════════════════════════════════

@Composable
private fun EditTargetsDialog(
    currentCalories: Int,
    currentProtein: Int,
    currentCarbs: Int,
    currentFats: Int,
    isSaving: Boolean,
    onSave: (Int, Int, Int, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var calories by remember { mutableStateOf(currentCalories.toString()) }
    var protein by remember { mutableStateOf(currentProtein.toString()) }
    var carbs by remember { mutableStateOf(currentCarbs.toString()) }
    var fats by remember { mutableStateOf(currentFats.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xF2121212),
        shape = RoundedCornerShape(24.dp),
        title = {
            Text(
                "EDIT TARGETS",
                color = IronTextPrimary,
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                letterSpacing = 2.sp
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                TargetTextField("Calories (kcal)", calories, IronRed) { calories = it }
                TargetTextField("Protein (g)", protein, IronBlue) { protein = it }
                TargetTextField("Carbs (g)", carbs, IronYellow) { carbs = it }
                TargetTextField("Fats (g)", fats, IronOrange) { fats = it }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onSave(
                        calories.toIntOrNull() ?: currentCalories,
                        protein.toIntOrNull() ?: currentProtein,
                        carbs.toIntOrNull() ?: currentCarbs,
                        fats.toIntOrNull() ?: currentFats
                    )
                },
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = IronRed,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        "SAVE",
                        color = IronRed,
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = IronTextTertiary, fontFamily = InterFontFamily)
            }
        }
    )
}

@Composable
private fun TargetTextField(
    label: String,
    value: String,
    accentColor: Color = IronRed,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = { newValue ->
            if (newValue.all { it.isDigit() } && newValue.length <= 5) {
                onValueChange(newValue)
            }
        },
        label = {
            Text(
                label,
                color = IronTextTertiary,
                fontFamily = InterFontFamily,
                fontSize = 12.sp
            )
        },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        textStyle = androidx.compose.ui.text.TextStyle(
            fontFamily = JetBrainsMonoFontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 16.sp,
            color = IronTextPrimary
        ),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = accentColor,
            unfocusedBorderColor = IronCardBorder,
            focusedTextColor = IronTextPrimary,
            unfocusedTextColor = IronTextPrimary,
            cursorColor = accentColor,
            focusedContainerColor = GlassWhite03,
            unfocusedContainerColor = Color.Transparent
        ),
        shape = RoundedCornerShape(14.dp)
    )
}
