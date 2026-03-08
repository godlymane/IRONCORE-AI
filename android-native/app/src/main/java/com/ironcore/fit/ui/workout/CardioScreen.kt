package com.ironcore.fit.ui.workout

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.components.GlassTier
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Cardio Screen — matches React CardioView.jsx
// 3 activity cards → input form → calorie result → save
// ══════════════════════════════════════════════════════════════════

@Composable
fun CardioScreen(
    viewModel: CardioViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    AnimatedContent(
        targetState = uiState.selectedActivity,
        transitionSpec = {
            fadeIn(tween(250)) + slideInHorizontally { it / 4 } togetherWith
                    fadeOut(tween(200)) + slideOutHorizontally { -it / 4 }
        },
        label = "cardio_content"
    ) { activity ->
        if (activity == null) {
            ActivitySelectionView(
                onSelect = { viewModel.selectActivity(it) }
            )
        } else {
            CardioInputView(
                activity = activity,
                uiState = uiState,
                viewModel = viewModel
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Activity selection grid — 3 cards with stagger animation
// ══════════════════════════════════════════════════════════════════

@Composable
private fun ActivitySelectionView(
    onSelect: (CardioActivity) -> Unit
) {
    val activities = CardioActivity.entries

    // Stagger entrance
    val visible = remember { mutableStateListOf<Boolean>() }
    LaunchedEffect(Unit) {
        visible.clear()
        activities.forEach { _ -> visible.add(false) }
        activities.forEachIndexed { i, _ ->
            kotlinx.coroutines.delay(80L * i)
            visible[i] = true
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Section header
        Text(
            text = "SELECT ACTIVITY",
            fontFamily = OswaldFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            letterSpacing = 2.sp,
            color = IronTextTertiary,
            modifier = Modifier.padding(bottom = 4.dp)
        )

        activities.forEachIndexed { index, activity ->
            val isVisible = visible.getOrElse(index) { false }
            AnimatedVisibility(
                visible = isVisible,
                enter = fadeIn(tween(300)) + slideInVertically(
                    initialOffsetY = { 40 },
                    animationSpec = spring(dampingRatio = 0.7f, stiffness = 400f)
                )
            ) {
                ActivityCard(
                    activity = activity,
                    onClick = { onSelect(activity) }
                )
            }
        }

        Spacer(modifier = Modifier.height(100.dp))
    }
}

@Composable
private fun ActivityCard(
    activity: CardioActivity,
    onClick: () -> Unit
) {
    GlassCard(
        tier = GlassTier.STANDARD,
        cornerRadius = 20.dp,
        padding = 0.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Activity emoji in circle
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(IronRed.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = activity.emoji,
                    fontSize = 24.sp
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = activity.label.uppercase(),
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    letterSpacing = 1.sp,
                    color = IronTextPrimary
                )
                Text(
                    text = activity.description,
                    fontFamily = InterFontFamily,
                    fontSize = 12.sp,
                    color = IronTextTertiary
                )
            }

            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = IronTextTertiary,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Input form per activity type
// ══════════════════════════════════════════════════════════════════

@Composable
private fun CardioInputView(
    activity: CardioActivity,
    uiState: CardioUiState,
    viewModel: CardioViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Back + title row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            IconButton(onClick = { viewModel.clearActivity() }) {
                Icon(
                    Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextPrimary,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "${activity.emoji}  ${activity.label.uppercase()}",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
                letterSpacing = 1.sp,
                color = IronTextPrimary
            )
        }

        // Body weight input (shared)
        GlassCard(tier = GlassTier.STANDARD, cornerRadius = 16.dp, padding = 16.dp) {
            Column {
                Text(
                    text = "BODY WEIGHT",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                    letterSpacing = 1.5.sp,
                    color = IronTextTertiary
                )
                Spacer(modifier = Modifier.height(8.dp))
                CardioInput(
                    value = uiState.bodyWeight,
                    onValueChange = { viewModel.updateBodyWeight(it) },
                    suffix = "kg"
                )
            }
        }

        // Activity-specific inputs
        when (activity) {
            CardioActivity.TREADMILL -> TreadmillInputs(uiState, viewModel)
            CardioActivity.WALKING -> WalkingInputs(uiState, viewModel)
            CardioActivity.CYCLING -> CyclingInputs(uiState, viewModel)
        }

        // Calculate / Session button
        if (uiState.isSessionActive) {
            LiveSessionCard(uiState, viewModel)
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Calculate button
                Button(
                    onClick = { viewModel.calculateCalories() },
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = IronRed
                    )
                ) {
                    Text(
                        "CALCULATE",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        letterSpacing = 1.sp,
                        color = IronTextPrimary
                    )
                }

                // Start live session
                OutlinedButton(
                    onClick = { viewModel.startSession() },
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, IronRed.copy(alpha = 0.5f))
                ) {
                    Icon(
                        Icons.Filled.PlayArrow,
                        contentDescription = null,
                        tint = IronRed,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "LIVE",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        letterSpacing = 1.sp,
                        color = IronRed
                    )
                }
            }
        }

        // Result display
        uiState.caloriesResult?.let { calories ->
            CalorieResultCard(calories = calories, onSave = { viewModel.saveCardioWorkout() }, isSaving = uiState.isSaving)
        }

        Spacer(modifier = Modifier.height(100.dp))
    }
}

// ── Treadmill inputs ─────────────────────────────────────────

@Composable
private fun TreadmillInputs(uiState: CardioUiState, viewModel: CardioViewModel) {
    GlassCard(tier = GlassTier.STANDARD, cornerRadius = 16.dp, padding = 16.dp) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "TREADMILL SETTINGS",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                letterSpacing = 1.5.sp,
                color = IronTextTertiary
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Speed", fontSize = 11.sp, color = IronTextTertiary, fontFamily = InterFontFamily)
                    Spacer(modifier = Modifier.height(4.dp))
                    CardioInput(
                        value = uiState.treadmillSpeed,
                        onValueChange = { viewModel.updateTreadmillSpeed(it) },
                        suffix = "mph"
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("Incline", fontSize = 11.sp, color = IronTextTertiary, fontFamily = InterFontFamily)
                    Spacer(modifier = Modifier.height(4.dp))
                    CardioInput(
                        value = uiState.treadmillIncline,
                        onValueChange = { viewModel.updateTreadmillIncline(it) },
                        suffix = "%"
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("Duration", fontSize = 11.sp, color = IronTextTertiary, fontFamily = InterFontFamily)
                    Spacer(modifier = Modifier.height(4.dp))
                    CardioInput(
                        value = uiState.treadmillDuration,
                        onValueChange = { viewModel.updateTreadmillDuration(it) },
                        suffix = "min"
                    )
                }
            }
        }
    }
}

// ── Walking inputs ───────────────────────────────────────────

@Composable
private fun WalkingInputs(uiState: CardioUiState, viewModel: CardioViewModel) {
    GlassCard(tier = GlassTier.STANDARD, cornerRadius = 16.dp, padding = 16.dp) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "WALKING SETTINGS",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                letterSpacing = 1.5.sp,
                color = IronTextTertiary
            )

            // Duration
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Duration", fontSize = 12.sp, color = IronTextSecondary, fontFamily = InterFontFamily, modifier = Modifier.width(72.dp))
                CardioInput(
                    value = uiState.walkingDuration,
                    onValueChange = { viewModel.updateWalkingDuration(it) },
                    suffix = "min"
                )
            }

            // Intensity selector
            Text("Intensity", fontSize = 12.sp, color = IronTextSecondary, fontFamily = InterFontFamily)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                WalkingIntensity.entries.forEach { intensity ->
                    IntensityChip(
                        label = intensity.label,
                        isSelected = uiState.walkingIntensity == intensity,
                        onClick = { viewModel.updateWalkingIntensity(intensity) }
                    )
                }
            }
        }
    }
}

// ── Cycling inputs ───────────────────────────────────────────

@Composable
private fun CyclingInputs(uiState: CardioUiState, viewModel: CardioViewModel) {
    GlassCard(tier = GlassTier.STANDARD, cornerRadius = 16.dp, padding = 16.dp) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "CYCLING SETTINGS",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                letterSpacing = 1.5.sp,
                color = IronTextTertiary
            )

            // Duration
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Duration", fontSize = 12.sp, color = IronTextSecondary, fontFamily = InterFontFamily, modifier = Modifier.width(72.dp))
                CardioInput(
                    value = uiState.cyclingDuration,
                    onValueChange = { viewModel.updateCyclingDuration(it) },
                    suffix = "min"
                )
            }

            // Intensity selector
            Text("Intensity", fontSize = 12.sp, color = IronTextSecondary, fontFamily = InterFontFamily)
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                CyclingIntensity.entries.forEach { intensity ->
                    IntensityChip(
                        label = intensity.label,
                        isSelected = uiState.cyclingIntensity == intensity,
                        onClick = { viewModel.updateCyclingIntensity(intensity) }
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Shared UI components
// ══════════════════════════════════════════════════════════════════

@Composable
private fun CardioInput(
    value: String,
    onValueChange: (String) -> Unit,
    suffix: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Color.White.copy(alpha = 0.05f))
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            textStyle = TextStyle(
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp,
                color = IronTextPrimary
            ),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            cursorBrush = SolidColor(IronRed),
            modifier = Modifier.weight(1f)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = suffix,
            fontFamily = InterFontFamily,
            fontSize = 12.sp,
            color = IronTextTertiary
        )
    }
}

@Composable
private fun IntensityChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val bgColor = if (isSelected) IronRed.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.04f)
    val borderColor = if (isSelected) IronRed.copy(alpha = 0.4f) else Color.White.copy(alpha = 0.08f)
    val textColor = if (isSelected) IronTextPrimary else IronTextSecondary

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(10.dp))
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            // Radio indicator
            Box(
                modifier = Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .border(
                        1.5.dp,
                        if (isSelected) IronRed else IronTextTertiary.copy(alpha = 0.4f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isSelected) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(IronRed)
                    )
                }
            }
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = label,
                fontFamily = InterFontFamily,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
                color = textColor
            )
        }
    }
}

// ── Live session card ────────────────────────────────────────

@Composable
private fun LiveSessionCard(
    uiState: CardioUiState,
    viewModel: CardioViewModel
) {
    val infiniteTransition = rememberInfiniteTransition(label = "live_pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    GlassCard(tier = GlassTier.LIQUID, cornerRadius = 20.dp, padding = 20.dp) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Live indicator
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(IronGreen)
                        .alpha(pulseAlpha)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "LIVE SESSION",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    letterSpacing = 2.sp,
                    color = IronGreen
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Timer display
            Text(
                text = formatCardioElapsed(uiState.elapsed),
                fontFamily = JetBrainsMonoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 48.sp,
                color = IronTextPrimary
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Stop button
            Button(
                onClick = { viewModel.stopSession() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = IronRed)
            ) {
                Icon(
                    Icons.Filled.Stop,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "STOP SESSION",
                    fontFamily = OswaldFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

// ── Calorie result card ──────────────────────────────────────

@Composable
private fun CalorieResultCard(
    calories: Int,
    onSave: () -> Unit,
    isSaving: Boolean
) {
    GlassCard(
        tier = GlassTier.LIQUID,
        highlight = true,
        cornerRadius = 20.dp,
        padding = 24.dp
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "ESTIMATED BURN",
                fontFamily = OswaldFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                letterSpacing = 2.sp,
                color = IronTextTertiary
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Big calorie number
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "$calories",
                    fontFamily = JetBrainsMonoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 48.sp,
                    color = IronRed
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "kcal",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Medium,
                    fontSize = 16.sp,
                    color = IronTextTertiary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Save button
            Button(
                onClick = onSave,
                enabled = !isSaving,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = IronGreen,
                    disabledContainerColor = IronGreen.copy(alpha = 0.5f)
                )
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        color = IronTextPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp)
                    )
                } else {
                    Icon(Icons.Filled.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "SAVE CARDIO SESSION",
                        fontFamily = OswaldFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        letterSpacing = 1.sp,
                        color = IronTextPrimary
                    )
                }
            }
        }
    }
}

// ── Utility ──────────────────────────────────────────────────

private fun formatCardioElapsed(totalSeconds: Int): String {
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%02d:%02d".format(minutes, seconds)
    }
}
