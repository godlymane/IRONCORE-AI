package com.ironcore.fit.ui.workout

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.data.model.Workout
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*
import com.ironcore.fit.util.DateFormatters

// ══════════════════════════════════════════════════════════════════
// Root composable — switches between list and active session
// ══════════════════════════════════════════════════════════════════

@Composable
fun WorkoutScreen(
    navController: NavHostController? = null,
    viewModel: WorkoutViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        if (uiState.isSessionActive) {
            ActiveSessionView(
                uiState = uiState,
                viewModel = viewModel
            )
        } else {
            WorkoutListView(
                uiState = uiState,
                viewModel = viewModel
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// LIST MODE — workout history + "Start Session" button
// ══════════════════════════════════════════════════════════════════

@Composable
private fun WorkoutListView(
    uiState: WorkoutUiState,
    viewModel: WorkoutViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        // Header
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "My Lifts",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = IronTextPrimary,
                    letterSpacing = (-0.5).sp
                )
                Text(
                    text = "TRAINING LOG",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextTertiary,
                    letterSpacing = 2.sp
                )
            }

            Button(
                onClick = { viewModel.startSession() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = IronRed
                ),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Icon(
                    Icons.Filled.PlayArrow,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "Start Session",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Content
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = IronRed, strokeWidth = 2.dp)
            }
        } else if (uiState.workoutHistory.isEmpty()) {
            // Empty state
            EmptyWorkoutState()
        } else {
            // Workout history list
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 100.dp)
            ) {
                itemsIndexed(
                    items = uiState.workoutHistory,
                    key = { _, w -> w.id }
                ) { _, workout ->
                    WorkoutHistoryCard(
                        workout = workout,
                        onDelete = { viewModel.deleteWorkout(workout.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyWorkoutState() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 48.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .border(
                    width = 2.dp,
                    color = Color.White.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(24.dp)
                )
                .padding(vertical = 48.dp, horizontal = 24.dp)
        ) {
            Icon(
                Icons.Outlined.FitnessCenter,
                contentDescription = null,
                tint = IronTextTertiary.copy(alpha = 0.5f),
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "No workouts logged yet",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = IronTextSecondary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Start a session to track your lifts",
                fontSize = 12.sp,
                color = IronTextTertiary
            )
        }
    }
}

@Composable
private fun WorkoutHistoryCard(
    workout: Workout,
    onDelete: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Top row: name + delete
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = workout.name.ifEmpty { "Workout" },
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = IronTextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.Schedule,
                            contentDescription = null,
                            tint = IronTextTertiary,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = buildString {
                                append(
                                    if (workout.date.isNotEmpty()) {
                                        try {
                                            DateFormatters.formatRelative(workout.date)
                                        } catch (_: Exception) {
                                            workout.date
                                        }
                                    } else "Unknown date"
                                )
                                if (workout.duration > 0) {
                                    append(" \u2022 ")
                                    append(DateFormatters.formatDuration(workout.duration))
                                }
                            },
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = IronTextTertiary
                        )
                    }
                }

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Outlined.Delete,
                        contentDescription = "Delete",
                        tint = IronTextTertiary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            if (workout.exercises.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(0.5.dp)
                        .background(Color.White.copy(alpha = 0.06f))
                )
                Spacer(modifier = Modifier.height(10.dp))

                // Exercise summary rows
                workout.exercises.take(5).forEachIndexed { index, ex ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 12.dp, top = if (index > 0) 6.dp else 0.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(2.dp)
                                    .height(16.dp)
                                    .background(
                                        IronRedExtraLight.copy(alpha = 0.3f),
                                        RoundedCornerShape(1.dp)
                                    )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${ex.sets.size} \u00D7 ${ex.name}",
                                fontSize = 12.sp,
                                color = IronTextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        val maxWeight = ex.sets.maxOfOrNull { it.weight } ?: 0.0
                        if (maxWeight > 0) {
                            Text(
                                text = "${maxWeight.toInt()}kg max",
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                color = IronTextTertiary
                            )
                        }
                    }
                }

                if (workout.exercises.size > 5) {
                    Text(
                        text = "+${workout.exercises.size - 5} more exercises",
                        fontSize = 11.sp,
                        color = IronTextTertiary.copy(alpha = 0.6f),
                        modifier = Modifier.padding(start = 22.dp, top = 6.dp),
                        fontWeight = FontWeight.Normal
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// ACTIVE SESSION MODE
// ══════════════════════════════════════════════════════════════════

@Composable
private fun ActiveSessionView(
    uiState: WorkoutUiState,
    viewModel: WorkoutViewModel
) {
    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 120.dp)
        ) {
            // Sticky header
            item {
                SessionHeader(
                    sessionName = uiState.sessionName,
                    elapsed = uiState.elapsed,
                    onNameChange = { viewModel.updateSessionName(it) }
                )
            }

            // Exercise cards
            itemsIndexed(
                items = uiState.exercises,
                key = { _, ex -> ex.id }
            ) { _, exercise ->
                ExerciseCard(
                    exercise = exercise,
                    viewModel = viewModel,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                )
            }

            // Add Exercise button
            item {
                AddExerciseButton(
                    onClick = { viewModel.addExercise() },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }

        // Rest timer overlay
        AnimatedVisibility(
            visible = uiState.isResting,
            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 100.dp)
                .zIndex(10f)
        ) {
            RestTimerOverlay(
                restTimer = uiState.restTimer,
                onAddTime = { viewModel.addRestTime(30) },
                onCancel = { viewModel.cancelRest() }
            )
        }

        // Bottom action bar
        SessionBottomBar(
            isSaving = uiState.isSaving,
            onDiscard = { viewModel.discardSession() },
            onFinish = { viewModel.finishSession() },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

// ── Session header ────────────────────────────────────────────

@Composable
private fun SessionHeader(
    sessionName: String,
    elapsed: Int,
    onNameChange: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Black.copy(alpha = 0.95f),
                        Color.Black.copy(alpha = 0.8f),
                        Color.Transparent
                    )
                )
            )
            .padding(horizontal = 16.dp, vertical = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                // Live indicator
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                    val pulseAlpha by infiniteTransition.animateFloat(
                        initialValue = 1f,
                        targetValue = 0.3f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(800, easing = EaseInOut),
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "pulse_alpha"
                    )
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .alpha(pulseAlpha)
                            .background(IronGreen)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "LIVE SESSION",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = IronGreen,
                        letterSpacing = 2.sp
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Editable session name
                BasicTextField(
                    value = sessionName,
                    onValueChange = onNameChange,
                    textStyle = TextStyle(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = IronTextPrimary
                    ),
                    cursorBrush = SolidColor(IronRed),
                    singleLine = true,
                    modifier = Modifier.widthIn(max = 200.dp)
                )
            }

            // Timer display
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.06f))
                    .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                Text(
                    text = formatElapsed(elapsed),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = IronTextPrimary
                )
            }
        }
    }
}

// ── Exercise card ─────────────────────────────────────────────

@Composable
private fun ExerciseCard(
    exercise: ExerciseState,
    viewModel: WorkoutViewModel,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            // Exercise header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (exercise.isCustom) {
                            // Custom text input
                            BasicTextField(
                                value = exercise.name,
                                onValueChange = {
                                    viewModel.updateExerciseName(exercise.id, it)
                                },
                                textStyle = TextStyle(
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = IronTextPrimary
                                ),
                                cursorBrush = SolidColor(IronRed),
                                singleLine = true,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color.Black.copy(alpha = 0.3f))
                                    .border(
                                        1.dp,
                                        IronRedExtraLight.copy(alpha = 0.3f),
                                        RoundedCornerShape(12.dp)
                                    )
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                decorationBox = { innerTextField ->
                                    Box {
                                        if (exercise.name.isEmpty()) {
                                            Text(
                                                "Exercise Name...",
                                                color = IronTextTertiary,
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        innerTextField()
                                    }
                                }
                            )
                        } else {
                            // Dropdown selector
                            ExerciseDropdown(
                                selectedName = exercise.name,
                                onSelect = {
                                    viewModel.updateExerciseName(exercise.id, it)
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        // Toggle custom/dropdown
                        IconButton(
                            onClick = { viewModel.toggleCustomMode(exercise.id) },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.White.copy(alpha = 0.06f))
                        ) {
                            Icon(
                                if (exercise.isCustom) Icons.Outlined.List else Icons.Outlined.Edit,
                                contentDescription = "Toggle input mode",
                                tint = IronTextTertiary,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }

                    // PR badge
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Filled.EmojiEvents,
                            contentDescription = null,
                            tint = IronYellow,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "PR: ${if (exercise.pr > 0) "${exercise.pr.toInt()}kg" else "None"}",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = IronTextTertiary,
                            letterSpacing = 1.sp
                        )
                    }
                }

                // Remove exercise button
                IconButton(
                    onClick = { viewModel.removeExercise(exercise.id) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Outlined.Delete,
                        contentDescription = "Remove",
                        tint = IronTextTertiary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Sets table header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TableHeader("#", Modifier.width(32.dp))
                TableHeader("Kg", Modifier.weight(1f))
                TableHeader("Reps", Modifier.weight(1f))
                TableHeader("RPE", Modifier.width(52.dp))
                TableHeader("Done", Modifier.width(48.dp))
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Sets rows
            exercise.sets.forEachIndexed { setIndex, set ->
                val ghostSet = viewModel.getGhostSet(exercise.name, setIndex)
                val isPR = viewModel.isNewPR(exercise.name, set.weight)

                SetRow(
                    setNumber = setIndex + 1,
                    set = set,
                    ghostWeight = ghostSet?.weight?.let {
                        if (it > 0) it.toInt().toString() else null
                    },
                    ghostReps = ghostSet?.reps?.let {
                        if (it > 0) it.toString() else null
                    },
                    isPR = isPR,
                    onWeightChange = {
                        viewModel.updateSet(exercise.id, setIndex, "weight", it)
                    },
                    onRepsChange = {
                        viewModel.updateSet(exercise.id, setIndex, "reps", it)
                    },
                    onRpeChange = {
                        viewModel.updateSet(exercise.id, setIndex, "rpe", it)
                    },
                    onToggleComplete = {
                        viewModel.toggleSetComplete(exercise.id, setIndex)
                    }
                )

                if (setIndex < exercise.sets.size - 1) {
                    Spacer(modifier = Modifier.height(6.dp))
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Add Set button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .border(
                        width = 1.dp,
                        color = Color.White.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    .clickable { viewModel.addSet(exercise.id) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "+ Add Set",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = IronTextTertiary
                )
            }
        }
    }
}

@Composable
private fun TableHeader(text: String, modifier: Modifier) {
    Text(
        text = text,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = IronTextTertiary,
        letterSpacing = 1.sp,
        textAlign = TextAlign.Center,
        modifier = modifier
    )
}

@Composable
private fun SetRow(
    setNumber: Int,
    set: SetState,
    ghostWeight: String?,
    ghostReps: String?,
    isPR: Boolean,
    onWeightChange: (String) -> Unit,
    onRepsChange: (String) -> Unit,
    onRpeChange: (String) -> Unit,
    onToggleComplete: () -> Unit
) {
    val rowAlpha = if (set.completed) 0.5f else 1f
    val rpeInt = set.rpe.toIntOrNull() ?: 0
    val highRpe = rpeInt >= 9

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(rowAlpha)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Set number
        Text(
            text = "$setNumber",
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
            color = IronTextTertiary,
            textAlign = TextAlign.Center,
            modifier = Modifier.width(32.dp)
        )

        // Weight input
        SetInput(
            value = set.weight,
            placeholder = ghostWeight ?: "-",
            onValueChange = onWeightChange,
            modifier = Modifier.weight(1f),
            highlightBorder = if (isPR) IronYellow.copy(alpha = 0.5f) else null
        )

        Spacer(modifier = Modifier.width(6.dp))

        // Reps input
        SetInput(
            value = set.reps,
            placeholder = ghostReps ?: "-",
            onValueChange = onRepsChange,
            modifier = Modifier.weight(1f)
        )

        Spacer(modifier = Modifier.width(6.dp))

        // RPE input
        SetInput(
            value = set.rpe,
            placeholder = "RPE",
            onValueChange = { raw ->
                val parsed = raw.toIntOrNull()
                if (parsed != null) {
                    val clamped = parsed.coerceIn(1, 10)
                    onRpeChange(clamped.toString())
                } else if (raw.isEmpty()) {
                    onRpeChange("")
                }
            },
            modifier = Modifier.width(52.dp),
            highlightBorder = if (highRpe) IronRed.copy(alpha = 0.5f) else null
        )

        Spacer(modifier = Modifier.width(4.dp))

        // Done checkbox
        IconButton(
            onClick = onToggleComplete,
            modifier = Modifier.size(48.dp)
        ) {
            if (set.completed) {
                Icon(
                    Icons.Filled.CheckCircle,
                    contentDescription = "Completed",
                    tint = IronGreen,
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Icon(
                    Icons.Outlined.Circle,
                    contentDescription = "Mark complete",
                    tint = IronTextTertiary.copy(alpha = 0.5f),
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        // PR badge (positioned inline)
        if (isPR) {
            Icon(
                Icons.Filled.EmojiEvents,
                contentDescription = "New PR!",
                tint = IronYellow,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

@Composable
private fun SetInput(
    value: String,
    placeholder: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    highlightBorder: Color? = null
) {
    val borderColor = highlightBorder ?: Color.White.copy(alpha = 0.06f)

    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        textStyle = TextStyle(
            fontSize = 14.sp,
            color = IronTextPrimary,
            textAlign = TextAlign.Center
        ),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        cursorBrush = SolidColor(IronRed),
        singleLine = true,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Color.Black.copy(alpha = 0.3f))
            .border(1.dp, borderColor, RoundedCornerShape(10.dp))
            .padding(horizontal = 8.dp, vertical = 10.dp),
        decorationBox = { innerTextField ->
            Box(contentAlignment = Alignment.Center) {
                if (value.isEmpty()) {
                    Text(
                        placeholder,
                        color = IronTextTertiary.copy(alpha = 0.4f),
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                innerTextField()
            }
        }
    )
}

// ── Exercise dropdown ─────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExerciseDropdown(
    selectedName: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor()
                .clickable { expanded = true },
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = selectedName,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Filled.ArrowDropDown,
                contentDescription = null,
                tint = IronTextTertiary,
                modifier = Modifier.size(20.dp)
            )
        }

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(IronCard)
        ) {
            EXERCISE_DB.forEach { name ->
                DropdownMenuItem(
                    text = {
                        Text(
                            name,
                            color = if (name == selectedName) IronRed else IronTextPrimary,
                            fontWeight = if (name == selectedName) FontWeight.Bold else FontWeight.Normal,
                            fontSize = 14.sp
                        )
                    },
                    onClick = {
                        onSelect(name)
                        expanded = false
                    },
                    modifier = Modifier.background(
                        if (name == selectedName) IronRed.copy(alpha = 0.1f)
                        else Color.Transparent
                    )
                )
            }
        }
    }
}

// ── Add exercise button ───────────────────────────────────────

@Composable
private fun AddExerciseButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .border(
                width = 2.dp,
                color = Color.White.copy(alpha = 0.08f),
                shape = RoundedCornerShape(24.dp)
            )
            .clickable { onClick() }
            .padding(vertical = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.Add,
                contentDescription = null,
                tint = IronTextTertiary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Add Exercise",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextTertiary
            )
        }
    }
}

// ── Rest timer overlay ────────────────────────────────────────

@Composable
private fun RestTimerOverlay(
    restTimer: Int,
    onAddTime: () -> Unit,
    onCancel: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "timer_pulse")
    val timerPulse by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "timer_pulse_alpha"
    )

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(
                Brush.horizontalGradient(
                    colors = listOf(
                        IronRed.copy(alpha = 0.2f),
                        IronRed.copy(alpha = 0.1f)
                    )
                )
            )
            .border(1.dp, IronRedExtraLight.copy(alpha = 0.3f), RoundedCornerShape(50))
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Timer icon + time
        Icon(
            Icons.Filled.Timer,
            contentDescription = null,
            tint = IronRedLight,
            modifier = Modifier
                .size(16.dp)
                .alpha(timerPulse)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = formatElapsed(restTimer),
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            fontFamily = FontFamily.Monospace,
            color = IronTextPrimary
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = "REST",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = IronTextTertiary,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.width(12.dp))

        // Divider
        Box(
            modifier = Modifier
                .width(1.dp)
                .height(16.dp)
                .background(IronTextTertiary.copy(alpha = 0.3f))
        )

        Spacer(modifier = Modifier.width(12.dp))

        // +30s button
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White.copy(alpha = 0.08f))
                .clickable { onAddTime() }
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Text(
                "+30s",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Stop button
        IconButton(
            onClick = onCancel,
            modifier = Modifier.size(28.dp)
        ) {
            Icon(
                Icons.Filled.StopCircle,
                contentDescription = "Stop rest",
                tint = IronRedLight,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// ── Bottom action bar ─────────────────────────────────────────

@Composable
private fun SessionBottomBar(
    isSaving: Boolean,
    onDiscard: () -> Unit,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        Color.Black.copy(alpha = 0.9f),
                        Color.Black
                    )
                )
            )
            .padding(horizontal = 16.dp, vertical = 16.dp)
            .padding(bottom = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Discard button
            OutlinedButton(
                onClick = onDiscard,
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, IronRed.copy(alpha = 0.5f)),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = IronRed
                )
            ) {
                Text(
                    "Discard",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }

            // Finish button
            Button(
                onClick = onFinish,
                enabled = !isSaving,
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
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
                    Text(
                        "Finish Workout",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = IronTextPrimary
                    )
                }
            }
        }
    }
}

// ── Utility ───────────────────────────────────────────────────

/**
 * Format seconds into "MM:SS" or "H:MM:SS" display.
 */
private fun formatElapsed(totalSeconds: Int): String {
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }
}
