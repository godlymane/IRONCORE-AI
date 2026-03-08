package com.ironcore.fit.ui.nutrition

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NutritionScreen(
    navController: NavHostController? = null,
    viewModel: NutritionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddMealSheet by remember { mutableStateOf(false) }

    // Stagger entrance animation
    var itemsVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(100)
        itemsVisible = true
    }

    Scaffold(
        containerColor = IronBlack,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddMealSheet = true },
                containerColor = IronRed,
                contentColor = IronTextPrimary,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Log Meal")
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(IronBlack)
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Header ────────────────────────────────────────
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (navController != null) {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = IronTextPrimary
                            )
                        }
                    }
                    Column {
                        Text(
                            text = "NUTRITION COMMAND",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = IronTextPrimary,
                            letterSpacing = 2.sp
                        )
                        Text(
                            text = "Fuel your performance",
                            style = MaterialTheme.typography.bodySmall,
                            color = IronTextTertiary
                        )
                    }
                }
            }

            // ── Calorie Ring + Summary ────────────────────────
            item {
                StaggerItem(index = 0, visible = itemsVisible) {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "DAILY CALORIES",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = IronTextSecondary,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            CalorieRingChart(
                                consumed = uiState.totalCals,
                                goal = uiState.calorieGoal,
                                protein = uiState.totalProtein,
                                carbs = uiState.totalCarbs,
                                fat = uiState.totalFat,
                                modifier = Modifier.size(180.dp)
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                MacroLegendItem("Protein", uiState.totalProtein, IronGreen)
                                MacroLegendItem("Carbs", uiState.totalCarbs, IronRed)
                                MacroLegendItem("Fat", uiState.totalFat, IronYellow)
                            }
                        }
                    }
                }
            }

            // ── Macro Progress Bars ───────────────────────────
            item {
                StaggerItem(index = 1, visible = itemsVisible) {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Text(
                                text = "MACRO TARGETS",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = IronTextSecondary,
                                letterSpacing = 1.sp
                            )
                            Spacer(modifier = Modifier.height(14.dp))

                            MacroProgressBar(
                                label = "Protein",
                                current = uiState.totalProtein,
                                goal = uiState.proteinGoal,
                                color = IronGreen,
                                unit = "g"
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            MacroProgressBar(
                                label = "Carbs",
                                current = uiState.totalCarbs,
                                goal = uiState.carbsGoal,
                                color = IronRed,
                                unit = "g"
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            MacroProgressBar(
                                label = "Fat",
                                current = uiState.totalFat,
                                goal = uiState.fatGoal,
                                color = IronYellow,
                                unit = "g"
                            )
                        }
                    }
                }
            }

            // ── Water Tracker ─────────────────────────────────
            item {
                StaggerItem(index = 2, visible = itemsVisible) {
                    WaterTrackerCard(
                        glasses = uiState.waterGlasses,
                        goal = 8,
                        onAdd = { viewModel.addWater() },
                        onRemove = { viewModel.removeWater() }
                    )
                }
            }

            // ── Calorie Burn Card ─────────────────────────────
            item {
                StaggerItem(index = 3, visible = itemsVisible) {
                    CalorieBurnCard(
                        burned = uiState.totalBurned,
                        goal = uiState.burnGoal
                    )
                }
            }

            // ── Today's Meals Header ──────────────────────────
            item {
                Text(
                    text = "TODAY'S FUEL",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = IronTextSecondary,
                    letterSpacing = 1.sp
                )
            }

            // ── Meal List ─────────────────────────────────────
            if (uiState.todaysMeals.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(text = "\uD83C\uDF7D\uFE0F", fontSize = 32.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No meals logged yet today",
                                style = MaterialTheme.typography.bodyMedium,
                                color = IronTextTertiary,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                text = "Tap + to log your first meal",
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextTertiary
                            )
                        }
                    }
                }
            } else {
                itemsIndexed(
                    uiState.todaysMeals,
                    key = { _, meal -> meal.id }
                ) { index, meal ->
                    StaggerItem(index = index + 4, visible = itemsVisible) {
                        MealRow(
                            meal = meal,
                            onDelete = { viewModel.deleteMeal(meal.id) }
                        )
                    }
                }
            }

            // Bottom spacer for FAB clearance
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    // ── Add Meal Bottom Sheet ─────────────────────────────
    if (showAddMealSheet) {
        AddMealBottomSheet(
            onDismiss = { showAddMealSheet = false },
            onAdd = { name, cals, p, c, f ->
                viewModel.addMeal(name, cals, p, c, f)
                showAddMealSheet = false
            }
        )
    }
}

// ── Stagger Animation Wrapper ────────────────────────────
@Composable
private fun StaggerItem(
    index: Int,
    visible: Boolean,
    content: @Composable () -> Unit
) {
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(
            animationSpec = tween(
                durationMillis = 400,
                delayMillis = index * 60
            )
        ) + slideInVertically(
            animationSpec = tween(
                durationMillis = 400,
                delayMillis = index * 60
            ),
            initialOffsetY = { 40 }
        )
    ) {
        content()
    }
}

// ── Calorie Ring Chart ───────────────────────────────────
@Composable
private fun CalorieRingChart(
    consumed: Int,
    goal: Int,
    protein: Double,
    carbs: Double,
    fat: Double,
    modifier: Modifier = Modifier
) {
    val progress = (consumed.toFloat() / goal.toFloat()).coerceIn(0f, 1.2f)
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "calorieProgress"
    )

    val total = protein + carbs + fat
    val proteinFrac = if (total > 0) (protein / total).toFloat() else 0f
    val carbsFrac = if (total > 0) (carbs / total).toFloat() else 0f
    val fatFrac = if (total > 0) (fat / total).toFloat() else 1f

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokeWidth = 16.dp.toPx()
            val diameter = size.minDimension - strokeWidth
            val topLeft = Offset(
                (size.width - diameter) / 2f,
                (size.height - diameter) / 2f
            )
            val arcSize = Size(diameter, diameter)

            // Background track
            drawArc(
                color = Color(0xFF1A1A1A),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )

            // Filled macro arcs
            val totalSweep = animatedProgress.coerceAtMost(1f) * 360f
            if (total > 0) {
                var startAngle = -90f

                // Protein arc (green)
                val proteinSweep = totalSweep * proteinFrac
                drawArc(
                    color = Color(0xFF22C55E),
                    startAngle = startAngle,
                    sweepAngle = proteinSweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Butt)
                )
                startAngle += proteinSweep

                // Carbs arc (red)
                val carbsSweep = totalSweep * carbsFrac
                drawArc(
                    color = Color(0xFFDC2626),
                    startAngle = startAngle,
                    sweepAngle = carbsSweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Butt)
                )
                startAngle += carbsSweep

                // Fat arc (yellow)
                val fatSweep = totalSweep * fatFrac
                drawArc(
                    color = Color(0xFFFBBF24),
                    startAngle = startAngle,
                    sweepAngle = fatSweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                )
            }
        }

        // Center text
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "$consumed",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Black,
                color = IronTextPrimary,
                fontSize = 32.sp
            )
            Text(
                text = "/ $goal kcal",
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary
            )
        }
    }
}

// ── Macro Progress Bar ───────────────────────────────────
@Composable
private fun MacroProgressBar(
    label: String,
    current: Double,
    goal: Double,
    color: Color,
    unit: String
) {
    val progress = (current / goal).toFloat().coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "${label}Progress"
    )

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = IronTextSecondary
            )
            Text(
                text = "${current.toInt()} / ${goal.toInt()}$unit",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = color,
            trackColor = GlassWhite
        )
    }
}

// ── Macro Legend Item ─────────────────────────────────────
@Composable
private fun MacroLegendItem(label: String, grams: Double, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(color, CircleShape)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Column {
            Text(
                text = "${grams.toInt()}g",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary
            )
        }
    }
}

// ── Water Tracker Card ───────────────────────────────────
@Composable
private fun WaterTrackerCard(
    glasses: Int,
    goal: Int,
    onAdd: () -> Unit,
    onRemove: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.WaterDrop,
                        contentDescription = null,
                        tint = IronBlue,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "HYDRATION",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronBlue,
                        letterSpacing = 1.sp
                    )
                }
                Text(
                    text = "$glasses/$goal",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black,
                    color = IronBlue
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Glass fill indicators
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                repeat(goal) { i ->
                    val filled = i < glasses
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(32.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                if (filled) IronBlue.copy(alpha = 0.7f)
                                else GlassWhite
                            )
                            .clickable { if (filled) onRemove() else onAdd() }
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Add/Remove buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onRemove,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = IronTextTertiary
                    ),
                    enabled = glasses > 0
                ) {
                    Icon(
                        Icons.Default.Remove,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Remove", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onAdd,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = IronBlue,
                        contentColor = IronTextPrimary
                    )
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Glass", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ── Calorie Burn Card ────────────────────────────────────
@Composable
private fun CalorieBurnCard(burned: Int, goal: Int) {
    val progress = (burned.toFloat() / goal.toFloat()).coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "burnProgress"
    )

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = IronOrange,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "CALORIES BURNED",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronOrange,
                        letterSpacing = 1.sp
                    )
                }
                Text(
                    text = "$burned",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    color = IronOrange
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            LinearProgressIndicator(
                progress = { animatedProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = IronOrange,
                trackColor = GlassWhite
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "0",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary
                )
                Text(
                    text = "Goal: $goal kcal",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary
                )
            }
        }
    }
}

// ── Meal Row ─────────────────────────────────────────────
@Composable
private fun MealRow(meal: MealUiItem, onDelete: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Emoji icon
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(GlassWhite),
                contentAlignment = Alignment.Center
            ) {
                Text(text = meal.emoji, fontSize = 22.sp)
            }
            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = meal.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = IronTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${meal.calories} kcal  \u2022  ${meal.protein}P  ${meal.carbs}C  ${meal.fat}F",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                if (meal.time.isNotEmpty()) {
                    Text(
                        text = meal.time,
                        style = MaterialTheme.typography.labelSmall,
                        color = IronTextTertiary,
                        fontWeight = FontWeight.Bold
                    )
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Delete meal",
                        tint = IronRedLight,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

// ── Add Meal Bottom Sheet ────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddMealBottomSheet(
    onDismiss: () -> Unit,
    onAdd: (name: String, cals: Int, protein: Double, carbs: Double, fat: Double) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var calories by remember { mutableStateOf("") }
    var protein by remember { mutableStateOf("") }
    var carbs by remember { mutableStateOf("") }
    var fat by remember { mutableStateOf("") }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = IronCard,
        contentColor = IronTextPrimary,
        dragHandle = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(IronTextTertiary)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Title
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(IronRed.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        tint = IronRed,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "LOG MEAL",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    color = IronTextPrimary,
                    letterSpacing = 2.sp
                )
            }

            // Name field
            NutritionTextField(
                value = name,
                onValueChange = { name = it },
                label = "Meal Name (e.g., Chicken & Rice)"
            )

            // Macro fields in 2x2 grid
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NutritionTextField(
                    value = calories,
                    onValueChange = { calories = it },
                    label = "Calories",
                    isNumber = true,
                    modifier = Modifier.weight(1f)
                )
                NutritionTextField(
                    value = protein,
                    onValueChange = { protein = it },
                    label = "Protein (g)",
                    isNumber = true,
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NutritionTextField(
                    value = carbs,
                    onValueChange = { carbs = it },
                    label = "Carbs (g)",
                    isNumber = true,
                    modifier = Modifier.weight(1f)
                )
                NutritionTextField(
                    value = fat,
                    onValueChange = { fat = it },
                    label = "Fat (g)",
                    isNumber = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Submit button
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onAdd(
                            name,
                            calories.toIntOrNull() ?: 0,
                            protein.toDoubleOrNull() ?: 0.0,
                            carbs.toDoubleOrNull() ?: 0.0,
                            fat.toDoubleOrNull() ?: 0.0
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = IronRed)
            ) {
                Text(
                    text = "LOG MEAL",
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp
                )
            }
        }
    }
}

@Composable
private fun NutritionTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    isNumber: Boolean = false,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = IronTextTertiary, fontSize = 11.sp) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        keyboardOptions = if (isNumber) KeyboardOptions(keyboardType = KeyboardType.Number)
        else KeyboardOptions.Default,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = IronTextPrimary,
            unfocusedTextColor = IronTextPrimary,
            cursorColor = IronRed,
            focusedBorderColor = IronRed,
            unfocusedBorderColor = IronCardBorder
        ),
        shape = RoundedCornerShape(12.dp)
    )
}

/** UI model for a meal row, mapped from Firestore Meal data. */
data class MealUiItem(
    val id: String,
    val name: String,
    val emoji: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val time: String
)
