package com.ironcore.fit.ui.nutrition

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NutritionScreen(
    navController: NavHostController? = null,
    viewModel: NutritionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddMealDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = IronBlack,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddMealDialog = true },
                containerColor = IronRed,
                contentColor = IronTextPrimary
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
            // ── Header ──────────────────────────────────────────
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (navController != null) {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(
                                Icons.Default.ArrowBack,
                                contentDescription = "Back",
                                tint = IronTextPrimary
                            )
                        }
                    }
                    Text(
                        text = "NUTRITION COMMAND",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = IronTextPrimary,
                        letterSpacing = 2.sp
                    )
                }
            }

            // ── Macro Pie Chart ─────────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "MACRO BREAKDOWN",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronRed,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        MacroPieChart(
                            protein = uiState.totalProtein,
                            carbs = uiState.totalCarbs,
                            fat = uiState.totalFat,
                            modifier = Modifier.size(160.dp)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            MacroLegendItem("Protein", uiState.totalProtein, IronRed)
                            MacroLegendItem("Carbs", uiState.totalCarbs, IronBlue)
                            MacroLegendItem("Fat", uiState.totalFat, IronYellow)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Calorie total
                        Text(
                            text = "${uiState.totalCals}",
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronTextPrimary
                        )
                        Text(
                            text = "/ ${uiState.calorieGoal} kcal",
                            style = MaterialTheme.typography.bodyMedium,
                            color = IronTextTertiary
                        )
                    }
                }
            }

            // ── Water Tracker ───────────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
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
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "WATER INTAKE",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = IronBlue,
                                    letterSpacing = 1.sp
                                )
                                Text(
                                    text = "${uiState.waterGlasses} glasses (${uiState.waterGlasses * 250}ml)",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = IronTextPrimary
                                )
                            }
                        }

                        FilledIconButton(
                            onClick = { viewModel.addWater() },
                            colors = IconButtonDefaults.filledIconButtonColors(
                                containerColor = IronBlue,
                                contentColor = IronTextPrimary
                            )
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Add water")
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Water progress bar
                    val waterProgress = (uiState.waterGlasses / 8f).coerceIn(0f, 1f)
                    LinearProgressIndicator(
                        progress = { waterProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp),
                        color = IronBlue,
                        trackColor = GlassWhite
                    )
                    Text(
                        text = "${uiState.waterGlasses}/8 glasses",
                        style = MaterialTheme.typography.bodySmall,
                        color = IronTextTertiary,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }

            // ── Calorie Burn Card ───────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocalFireDepartment,
                            contentDescription = null,
                            tint = IronOrange,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "CALORIES BURNED",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = IronOrange,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = "${uiState.totalBurned} kcal today",
                                style = MaterialTheme.typography.bodyLarge,
                                color = IronTextPrimary
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${uiState.totalBurned}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = IronOrange
                            )
                            Text(
                                text = "/ ${uiState.burnGoal} goal",
                                style = MaterialTheme.typography.bodySmall,
                                color = IronTextTertiary
                            )
                        }
                    }
                }
            }

            // ── Today's Meals Header ────────────────────────────
            item {
                Text(
                    text = "TODAY'S MEALS",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = IronTextSecondary,
                    letterSpacing = 1.sp
                )
            }

            // ── Meals List ──────────────────────────────────────
            if (uiState.todaysMeals.isEmpty()) {
                item {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "No meals logged today. Tap + to add one.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = IronTextTertiary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            } else {
                items(uiState.todaysMeals, key = { it.id }) { meal ->
                    MealRow(
                        meal = meal,
                        onDelete = { viewModel.deleteMeal(meal.id) }
                    )
                }
            }

            // Bottom spacer for FAB clearance
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    // ── Add Meal Dialog ─────────────────────────────────────────
    if (showAddMealDialog) {
        AddMealDialog(
            onDismiss = { showAddMealDialog = false },
            onAdd = { name, cals, p, c, f ->
                viewModel.addMeal(name, cals, p, c, f)
                showAddMealDialog = false
            }
        )
    }
}

// ── Macro Pie Chart ─────────────────────────────────────────────
@Composable
private fun MacroPieChart(
    protein: Double,
    carbs: Double,
    fat: Double,
    modifier: Modifier = Modifier
) {
    val total = protein + carbs + fat
    val proteinAngle = if (total > 0) (protein / total * 360f).toFloat() else 0f
    val carbsAngle = if (total > 0) (carbs / total * 360f).toFloat() else 0f
    val fatAngle = if (total > 0) (fat / total * 360f).toFloat() else 360f

    Canvas(modifier = modifier) {
        val strokeWidth = 24.dp.toPx()
        val diameter = size.minDimension - strokeWidth
        val topLeft = Offset(
            (size.width - diameter) / 2f,
            (size.height - diameter) / 2f
        )
        val arcSize = Size(diameter, diameter)

        if (total <= 0) {
            // Empty state ring
            drawArc(
                color = Color(0xFF333333),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        } else {
            var startAngle = -90f

            // Protein arc
            drawArc(
                color = Color(0xFFDC2626),
                startAngle = startAngle,
                sweepAngle = proteinAngle,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Butt)
            )
            startAngle += proteinAngle

            // Carbs arc
            drawArc(
                color = Color(0xFF3B82F6),
                startAngle = startAngle,
                sweepAngle = carbsAngle,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Butt)
            )
            startAngle += carbsAngle

            // Fat arc
            drawArc(
                color = Color(0xFFFBBF24),
                startAngle = startAngle,
                sweepAngle = fatAngle,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Butt)
            )
        }
    }
}

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

// ── Meal Row ────────────────────────────────────────────────────
@Composable
private fun MealRow(
    meal: MealUiItem,
    onDelete: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Emoji icon
            Text(
                text = meal.emoji,
                fontSize = 28.sp
            )
            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = meal.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = IronTextPrimary
                )
                Text(
                    text = "${meal.calories} kcal  |  P:${meal.protein}g  C:${meal.carbs}g  F:${meal.fat}g",
                    style = MaterialTheme.typography.bodySmall,
                    color = IronTextTertiary
                )
                if (meal.time.isNotEmpty()) {
                    Text(
                        text = meal.time,
                        style = MaterialTheme.typography.bodySmall,
                        color = IronTextTertiary
                    )
                }
            }

            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete meal",
                    tint = IronRedLight,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

// ── Add Meal Dialog ─────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddMealDialog(
    onDismiss: () -> Unit,
    onAdd: (name: String, cals: Int, protein: Double, carbs: Double, fat: Double) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var calories by remember { mutableStateOf("") }
    var protein by remember { mutableStateOf("") }
    var carbs by remember { mutableStateOf("") }
    var fat by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = IronCard,
        titleContentColor = IronTextPrimary,
        textContentColor = IronTextSecondary,
        title = {
            Text(
                "LOG MEAL",
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                NutritionTextField(value = name, onValueChange = { name = it }, label = "Meal name")
                NutritionTextField(value = calories, onValueChange = { calories = it }, label = "Calories", isNumber = true)
                NutritionTextField(value = protein, onValueChange = { protein = it }, label = "Protein (g)", isNumber = true)
                NutritionTextField(value = carbs, onValueChange = { carbs = it }, label = "Carbs (g)", isNumber = true)
                NutritionTextField(value = fat, onValueChange = { fat = it }, label = "Fat (g)", isNumber = true)
            }
        },
        confirmButton = {
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
                colors = ButtonDefaults.buttonColors(containerColor = IronRed)
            ) {
                Text("ADD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
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
private fun NutritionTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    isNumber: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = IronTextTertiary) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        keyboardOptions = if (isNumber) KeyboardOptions(keyboardType = KeyboardType.Number)
        else KeyboardOptions.Default,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = IronTextPrimary,
            unfocusedTextColor = IronTextPrimary,
            cursorColor = IronRed,
            focusedBorderColor = IronRed,
            unfocusedBorderColor = IronCardBorder
        )
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
