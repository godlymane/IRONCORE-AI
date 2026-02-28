package com.ironcore.fit.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
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
import com.ironcore.fit.ui.navigation.SubScreen
import com.ironcore.fit.ui.theme.*
import com.ironcore.fit.util.XpCalculator

@Composable
fun ProfileScreen(
    navController: NavHostController? = null,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var showTargetsDialog by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    if (state.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize().background(IronBlack),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = IronRed)
        }
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
        // ── Profile Header ─────────────────────────────────────────
        item {
            ProfileHeader(
                displayName = state.displayName,
                email = state.email,
                level = state.level,
                league = state.league,
                xp = state.xp,
                photoUrl = state.photoUrl
            )
        }

        // ── Stats Row ──────────────────────────────────────────────
        item {
            StatsRow(
                level = state.level,
                xp = state.xp,
                streak = state.currentStreak,
                longestStreak = state.longestStreak
            )
        }

        // ── Subscription ───────────────────────────────────────────
        item {
            SubscriptionCard(
                isPremium = state.isPremium,
                planName = state.subscriptionPlan,
                expiryDate = state.subscriptionExpiry
            )
        }

        // ── Daily Targets ──────────────────────────────────────────
        item {
            DailyTargetsCard(
                calories = state.dailyCalories,
                protein = state.dailyProtein,
                carbs = state.dailyCarbs,
                fats = state.dailyFats,
                onEdit = { showTargetsDialog = true }
            )
        }

        // ── Quick Actions ──────────────────────────────────────────
        item {
            SectionHeader("Quick Actions")
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                SettingsRow(
                    icon = Icons.Outlined.Shield,
                    label = if (state.hasPin) "Change PIN" else "Set Up PIN",
                    sublabel = if (state.hasPin) "PIN is active" else "Secure your profile",
                    iconTint = IronGreen,
                    onClick = {
                        navController?.navigate(
                            if (state.hasPin) SubScreen.PIN_VERIFY else SubScreen.PIN_SETUP
                        )
                    }
                )
                SettingsRow(
                    icon = Icons.Outlined.EmojiEvents,
                    label = "Achievements",
                    sublabel = "View your trophies",
                    iconTint = IronYellow,
                    onClick = { navController?.navigate(SubScreen.ACHIEVEMENTS) }
                )
                SettingsRow(
                    icon = Icons.Outlined.Leaderboard,
                    label = "League",
                    sublabel = state.league,
                    iconTint = IronOrange,
                    onClick = { navController?.navigate(SubScreen.LEAGUE) }
                )
                SettingsRow(
                    icon = Icons.Outlined.CardMembership,
                    label = "Player Card",
                    sublabel = "Your identity",
                    iconTint = IronPurple,
                    onClick = { navController?.navigate(SubScreen.PLAYER_CARD) }
                )
                SettingsRow(
                    icon = Icons.Outlined.BarChart,
                    label = "Statistics",
                    sublabel = "Detailed analytics",
                    iconTint = IronBlue,
                    onClick = { navController?.navigate(SubScreen.STATS) }
                )
            }
        }

        // ── Account ────────────────────────────────────────────────
        item {
            SectionHeader("Account")
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                SettingsRow(
                    icon = Icons.Outlined.Settings,
                    label = "Settings",
                    sublabel = "App preferences",
                    onClick = { navController?.navigate(SubScreen.SETTINGS) }
                )
                SettingsRow(
                    icon = Icons.Outlined.Info,
                    label = "About IronCore",
                    sublabel = "Version 1.0.0",
                    onClick = { }
                )
            }
        }

        // ── Sign Out ───────────────────────────────────────────────
        item {
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = { showLogoutConfirm = true },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = IronRed),
                border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                    brush = Brush.linearGradient(listOf(IronRed.copy(alpha = 0.3f), IronRed.copy(alpha = 0.1f)))
                )
            ) {
                Icon(Icons.Default.Logout, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out", fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // ── Dialogs ────────────────────────────────────────────────────

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

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            containerColor = IronSurfaceElevated,
            title = {
                Text("Sign Out", color = IronTextPrimary, fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "Are you sure you want to sign out?",
                    color = IronTextSecondary
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutConfirm = false
                    viewModel.logout()
                }) {
                    Text("Sign Out", color = IronRed, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutConfirm = false }) {
                    Text("Cancel", color = IronTextTertiary)
                }
            }
        )
    }

    // Error snackbar
    state.error?.let { error ->
        LaunchedEffect(error) {
            // Auto-clear after showing
            kotlinx.coroutines.delay(3000)
            viewModel.clearError()
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Profile Header
// ══════════════════════════════════════════════════════════════════

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

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Avatar
            Box(contentAlignment = Alignment.BottomEnd) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(IronRed, IronRedDark))
                        )
                        .border(2.dp, IronRed.copy(alpha = 0.5f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = displayName.firstOrNull()?.uppercase() ?: "?",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
                // Level badge
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(IronSurfaceElevated)
                        .border(2.dp, IronRed, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$level",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = IronRed
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = displayName,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                color = IronTextPrimary
            )
            Text(
                text = email,
                fontSize = 12.sp,
                color = IronTextTertiary
            )

            Spacer(modifier = Modifier.height(12.dp))

            // League badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(IronRed.copy(alpha = 0.1f))
                    .border(1.dp, IronRed.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            ) {
                Text(
                    text = league.uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    color = IronRed,
                    letterSpacing = 2.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // XP progress bar
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Level $level",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = IronTextSecondary
                    )
                    Text(
                        text = "${levelProgress.currentXpInLevel}/${levelProgress.xpNeededForNext} XP",
                        fontSize = 11.sp,
                        color = IronTextTertiary
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
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
                                Brush.horizontalGradient(listOf(IronRed, IronRedLight))
                            )
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Stats Row
// ══════════════════════════════════════════════════════════════════

@Composable
private fun StatsRow(level: Int, xp: Long, streak: Int, longestStreak: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        StatPill(
            icon = Icons.Filled.Star,
            value = "$level",
            label = "Level",
            color = IronYellow,
            modifier = Modifier.weight(1f)
        )
        StatPill(
            icon = Icons.Filled.Bolt,
            value = "${xp}",
            label = "Total XP",
            color = IronRed,
            modifier = Modifier.weight(1f)
        )
        StatPill(
            icon = Icons.Filled.LocalFireDepartment,
            value = "$streak",
            label = "Streak",
            color = IronOrange,
            modifier = Modifier.weight(1f)
        )
        StatPill(
            icon = Icons.Filled.MilitaryTech,
            value = "$longestStreak",
            label = "Best",
            color = IronGreen,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun StatPill(
    icon: ImageVector,
    value: String,
    label: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.08f))
            .border(1.dp, color.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = IronTextPrimary
            )
            Text(
                text = label,
                fontSize = 9.sp,
                color = IronTextTertiary,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Subscription Card
// ══════════════════════════════════════════════════════════════════

@Composable
private fun SubscriptionCard(isPremium: Boolean, planName: String, expiryDate: String) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (isPremium) Brush.linearGradient(listOf(IronRed, IronRedDark))
                            else Brush.linearGradient(listOf(IronCardBorder, IronCard))
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isPremium) Icons.Filled.WorkspacePremium else Icons.Outlined.Lock,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = planName,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = IronTextPrimary
                    )
                    Text(
                        text = if (isPremium && expiryDate.isNotBlank()) "Expires $expiryDate"
                        else if (isPremium) "Active"
                        else "Upgrade for full access",
                        fontSize = 11.sp,
                        color = IronTextTertiary
                    )
                }
            }

            if (!isPremium) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Brush.linearGradient(listOf(IronRed, IronRedDark)))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "UPGRADE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Daily Targets Card
// ══════════════════════════════════════════════════════════════════

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
                    text = "Daily Targets",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary
                )
                TextButton(onClick = onEdit) {
                    Text("Edit", color = IronRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                TargetItem("Calories", "$calories", "kcal", IronRed)
                TargetItem("Protein", "${protein}g", "", IronBlue)
                TargetItem("Carbs", "${carbs}g", "", IronYellow)
                TargetItem("Fats", "${fats}g", "", IronOrange)
            }
        }
    }
}

@Composable
private fun TargetItem(label: String, value: String, unit: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = color
        )
        if (unit.isNotBlank()) {
            Text(text = unit, fontSize = 9.sp, color = IronTextTertiary)
        }
        Text(
            text = label,
            fontSize = 10.sp,
            color = IronTextSecondary,
            fontWeight = FontWeight.Medium
        )
    }
}

// ══════════════════════════════════════════════════════════════════
// Settings Row
// ══════════════════════════════════════════════════════════════════

@Composable
private fun SettingsRow(
    icon: ImageVector,
    label: String,
    sublabel: String,
    iconTint: Color = IronTextSecondary,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .background(GlassWhite)
            .padding(horizontal = 16.dp, vertical = 14.dp),
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
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextPrimary
            )
            Text(
                text = sublabel,
                fontSize = 11.sp,
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
}

// ══════════════════════════════════════════════════════════════════
// Section Header
// ══════════════════════════════════════════════════════════════════

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        color = IronTextTertiary,
        letterSpacing = 2.sp,
        modifier = Modifier.padding(start = 4.dp, top = 4.dp)
    )
}

// ══════════════════════════════════════════════════════════════════
// Edit Targets Dialog
// ══════════════════════════════════════════════════════════════════

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
        containerColor = IronSurfaceElevated,
        title = {
            Text(
                "Edit Daily Targets",
                color = IronTextPrimary,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                TargetTextField("Calories (kcal)", calories) { calories = it }
                TargetTextField("Protein (g)", protein) { protein = it }
                TargetTextField("Carbs (g)", carbs) { carbs = it }
                TargetTextField("Fats (g)", fats) { fats = it }
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
                    Text("Save", color = IronRed, fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = IronTextTertiary)
            }
        }
    )
}

@Composable
private fun TargetTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = { newValue ->
            if (newValue.all { it.isDigit() } && newValue.length <= 5) {
                onValueChange(newValue)
            }
        },
        label = { Text(label, color = IronTextTertiary) },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = IronRed,
            unfocusedBorderColor = IronCardBorder,
            focusedTextColor = IronTextPrimary,
            unfocusedTextColor = IronTextPrimary,
            cursorColor = IronRed
        )
    )
}
