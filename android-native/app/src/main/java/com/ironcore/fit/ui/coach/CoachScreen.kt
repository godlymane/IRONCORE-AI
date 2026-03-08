package com.ironcore.fit.ui.coach

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.components.GlassTier
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// CoachScreen — AI Form Correction with dual-tab layout
//
// Tab 1: Camera — live pose detection with HUD, form feedback cards
// Tab 2: Chat — AI coach text interface for tips & advice
//
// Matches React AILabView.jsx + FormCoach.jsx pattern exactly.
// ══════════════════════════════════════════════════════════════════

@Composable
fun CoachScreen(
    navController: NavHostController? = null,
    viewModel: CoachViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        viewModel.onCameraPermissionResult(granted)
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        // ── Dual Tab Selector ──────────────────────────────────
        CoachTabBar(
            selectedTab = uiState.selectedTab,
            onTabSelected = { viewModel.selectTab(it) }
        )

        // ── Tab Content ────────────────────────────────────────
        AnimatedContent(
            targetState = uiState.selectedTab,
            transitionSpec = {
                val direction = if (targetState == CoachTab.CAMERA) -1 else 1
                slideInHorizontally { it * direction } + fadeIn() togetherWith
                    slideOutHorizontally { -it * direction } + fadeOut()
            },
            label = "tab_switch"
        ) { tab ->
            when (tab) {
                CoachTab.CAMERA -> CameraTabContent(uiState, viewModel, permissionLauncher)
                CoachTab.CHAT -> ChatTabContent(uiState, viewModel)
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Tab Bar — Segmented control matching React AILabView pattern
// ══════════════════════════════════════════════════════════════════

@Composable
private fun CoachTabBar(
    selectedTab: CoachTab,
    onTabSelected: (CoachTab) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(GlassWhite05)
            .border(1.dp, GlassBorderDefault, RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        TabButton(
            text = "Camera",
            icon = Icons.Default.CameraAlt,
            isSelected = selectedTab == CoachTab.CAMERA,
            activeColor = IronRed,
            onClick = { onTabSelected(CoachTab.CAMERA) },
            modifier = Modifier.weight(1f)
        )
        TabButton(
            text = "Coach Chat",
            icon = Icons.AutoMirrored.Filled.Chat,
            isSelected = selectedTab == CoachTab.CHAT,
            activeColor = IronPurple,
            onClick = { onTabSelected(CoachTab.CHAT) },
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun TabButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    activeColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bg = if (isSelected) activeColor.copy(alpha = 0.2f) else Color.Transparent
    val textColor = if (isSelected) Color.White else IronTextTertiary

    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (isSelected) activeColor else IronTextTertiary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text,
            color = textColor,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            fontFamily = OswaldFontFamily
        )
    }
}

// ══════════════════════════════════════════════════════════════════
// Camera Tab — Live pose detection with full HUD
// ══════════════════════════════════════════════════════════════════

@Composable
private fun CameraTabContent(
    uiState: CoachUiState,
    viewModel: CoachViewModel,
    permissionLauncher: androidx.activity.result.ActivityResultLauncher<String>
) {
    Box(modifier = Modifier.fillMaxSize()) {
        if (uiState.hasCameraPermission) {
            // Camera + Pose Detection pipeline
            val processor = remember {
                PoseDetectionProcessor(
                    onPoseDetected = { pose, w, h -> viewModel.onPoseDetected(pose, w, h) },
                    onError = { viewModel.onDetectionError(it) }
                )
            }

            DisposableEffect(Unit) {
                onDispose { processor.close() }
            }

            // Camera preview layer
            CameraPreview(
                modifier = Modifier.fillMaxSize(),
                useFrontCamera = uiState.useFrontCamera,
                analyzer = processor
            )

            // Skeleton overlay with quality coloring
            PoseOverlay(
                pose = uiState.currentPose,
                imageWidth = uiState.imageWidth,
                imageHeight = uiState.imageHeight,
                isFrontCamera = uiState.useFrontCamera,
                jointQualities = uiState.jointQualities,
                modifier = Modifier.fillMaxSize()
            )

            // ── HUD Overlay ────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top HUD
                TopHUD(uiState, viewModel)

                // Bottom section: form feedback + controls
                Column {
                    // Coaching tip banner
                    AnimatedVisibility(
                        visible = uiState.coachingTip != null,
                        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
                    ) {
                        CoachingTipBanner(uiState.coachingTip ?: "")
                    }

                    Spacer(Modifier.height(8.dp))

                    // Form feedback cards (3 columns)
                    if (uiState.checkpoints.isNotEmpty()) {
                        FormFeedbackCards(uiState.checkpoints)
                    }

                    Spacer(Modifier.height(12.dp))

                    // Bottom controls
                    BottomControls(viewModel, uiState)
                }
            }
        } else {
            // Permission request screen
            CameraPermissionRequest(permissionLauncher)
        }
    }
}

@Composable
private fun TopHUD(uiState: CoachUiState, viewModel: CoachViewModel) {
    val exercise = EXERCISES[uiState.selectedExerciseIndex]

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            // Left: Status badge + landmark count
            Column {
                // Detection status badge
                Surface(
                    color = if (uiState.isDetecting) IronGreen.copy(alpha = 0.2f)
                    else IronRed.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(
                                    if (uiState.isDetecting) IronGreen else IronRed,
                                    CircleShape
                                )
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = if (uiState.isDetecting) "TRACKING" else "NO POSE",
                            color = if (uiState.isDetecting) IronGreen else IronRed,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = JetBrainsMonoFontFamily
                        )
                    }
                }

                if (uiState.isDetecting) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "${uiState.landmarkCount} pts",
                        color = IronTextTertiary,
                        fontSize = 10.sp,
                        fontFamily = JetBrainsMonoFontFamily
                    )
                }
            }

            // Right: Form score + rep count
            Column(horizontalAlignment = Alignment.End) {
                // Form score
                if (uiState.formScore > 0) {
                    val scoreColor = when {
                        uiState.formScore >= 80 -> IronGreen
                        uiState.formScore >= 50 -> IronYellow
                        else -> IronRed
                    }
                    Surface(
                        color = scoreColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "${uiState.formScore}%",
                            color = scoreColor,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = JetBrainsMonoFontFamily,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                }

                // Rep count
                if (uiState.repCount > 0) {
                    Spacer(Modifier.height(4.dp))
                    Surface(
                        color = GlassWhite10,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "REPS",
                                color = IronTextTertiary,
                                fontSize = 9.sp,
                                fontFamily = JetBrainsMonoFontFamily
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = "${uiState.repCount}",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = JetBrainsMonoFontFamily
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Exercise picker
        ExercisePicker(
            selectedIndex = uiState.selectedExerciseIndex,
            onSelect = { viewModel.selectExercise(it) }
        )
    }
}

@Composable
private fun ExercisePicker(
    selectedIndex: Int,
    onSelect: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val exercise = EXERCISES[selectedIndex]

    Box {
        // Selected exercise chip
        Surface(
            color = IronRed.copy(alpha = 0.15f),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.clickable { expanded = true }
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.FitnessCenter,
                    contentDescription = null,
                    tint = IronRed,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    exercise.name,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = OswaldFontFamily
                )
                Spacer(Modifier.width(6.dp))
                Icon(
                    Icons.Default.ArrowDropDown,
                    contentDescription = null,
                    tint = IronTextTertiary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        // Dropdown
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(IronSurfaceElevated)
        ) {
            EXERCISES.forEachIndexed { index, ex ->
                DropdownMenuItem(
                    text = {
                        Text(
                            ex.name,
                            color = if (index == selectedIndex) IronRed else IronTextSecondary,
                            fontFamily = OswaldFontFamily,
                            fontWeight = if (index == selectedIndex) FontWeight.Bold else FontWeight.Normal
                        )
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.FitnessCenter,
                            contentDescription = null,
                            tint = if (index == selectedIndex) IronRed else IronTextTertiary,
                            modifier = Modifier.size(16.dp)
                        )
                    },
                    onClick = {
                        onSelect(index)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun CoachingTipBanner(tip: String) {
    Surface(
        color = IronYellow.copy(alpha = 0.12f),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Lightbulb,
                contentDescription = null,
                tint = IronYellow,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = tip,
                color = IronYellow,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                fontFamily = InterFontFamily
            )
        }
    }
}

@Composable
private fun FormFeedbackCards(checkpoints: List<CheckpointResult>) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        checkpoints.forEach { cp ->
            val (bgColor, textColor, iconTint) = when (cp.status) {
                CheckpointStatus.PASS -> Triple(
                    IronGreen.copy(alpha = 0.12f),
                    IronGreen,
                    IronGreen
                )
                CheckpointStatus.FAIL -> Triple(
                    IronRed.copy(alpha = 0.12f),
                    IronRed,
                    IronRed
                )
                CheckpointStatus.NULL -> Triple(
                    GlassWhite05,
                    IronTextTertiary,
                    IronTextTertiary
                )
            }

            Surface(
                color = bgColor,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = when (cp.status) {
                            CheckpointStatus.PASS -> Icons.Default.CheckCircle
                            CheckpointStatus.FAIL -> Icons.Default.Cancel
                            CheckpointStatus.NULL -> Icons.Default.RadioButtonUnchecked
                        },
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = cp.label,
                        color = textColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = JetBrainsMonoFontFamily,
                        textAlign = TextAlign.Center,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
private fun BottomControls(viewModel: CoachViewModel, uiState: CoachUiState) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Reset reps button
        if (uiState.repCount > 0) {
            IconButton(
                onClick = { viewModel.formEngine.resetState(); viewModel.selectExercise(uiState.selectedExerciseIndex) },
                modifier = Modifier
                    .size(44.dp)
                    .background(GlassWhite10, CircleShape)
            ) {
                Icon(
                    Icons.Default.Refresh,
                    contentDescription = "Reset",
                    tint = IronTextSecondary,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(Modifier.width(24.dp))
        }

        // Camera flip button
        IconButton(
            onClick = { viewModel.toggleCamera() },
            modifier = Modifier
                .size(56.dp)
                .background(GlassWhite10, CircleShape)
                .border(1.dp, GlassBorderDefault, CircleShape)
        ) {
            Icon(
                Icons.Default.Cameraswitch,
                contentDescription = "Switch Camera",
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

@Composable
private fun CameraPermissionRequest(
    permissionLauncher: androidx.activity.result.ActivityResultLauncher<String>
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.CameraAlt,
            contentDescription = null,
            tint = IronTextTertiary,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Camera access required for AI Form Correction",
            color = IronTextSecondary,
            style = MaterialTheme.typography.bodyLarge,
            fontFamily = InterFontFamily
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            colors = ButtonDefaults.buttonColors(containerColor = IronRed),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Grant Camera Access", fontFamily = OswaldFontFamily)
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Chat Tab — AI Coach text interface
// ══════════════════════════════════════════════════════════════════

@Composable
private fun ChatTabContent(
    uiState: CoachUiState,
    viewModel: CoachViewModel
) {
    val listState = rememberLazyListState()

    // Auto-scroll to bottom on new messages
    LaunchedEffect(uiState.chatMessages.size) {
        if (uiState.chatMessages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.chatMessages.lastIndex)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        // Exercise context header
        GlassCard(
            tier = GlassTier.STANDARD,
            cornerRadius = 16.dp,
            padding = 12.dp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.FitnessCenter,
                    contentDescription = null,
                    tint = IronRed,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(
                        "Active: ${EXERCISES[uiState.selectedExerciseIndex].name}",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = OswaldFontFamily
                    )
                    if (uiState.formScore > 0 || uiState.repCount > 0) {
                        Text(
                            "Score: ${uiState.formScore}% • Reps: ${uiState.repCount}",
                            color = IronTextTertiary,
                            fontSize = 11.sp,
                            fontFamily = JetBrainsMonoFontFamily
                        )
                    }
                }
            }
        }

        // Chat messages
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(uiState.chatMessages, key = { it.id }) { message ->
                ChatBubble(message)
            }
        }

        // Chat input
        ChatInputBar(
            value = uiState.chatInput,
            onValueChange = { viewModel.updateChatInput(it) },
            onSend = { viewModel.sendChatMessage() }
        )
    }
}

@Composable
private fun ChatBubble(message: ChatMessage) {
    val isUser = message.isUser

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            // AI avatar
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(
                        Brush.linearGradient(listOf(IronRed, IronRedDark)),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Psychology,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(Modifier.width(8.dp))
        }

        Surface(
            color = if (isUser) IronRed.copy(alpha = 0.15f) else GlassWhite05,
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 16.dp
            ),
            modifier = Modifier.widthIn(max = 280.dp),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                if (isUser) IronRed.copy(alpha = 0.2f) else GlassBorderDefault
            )
        ) {
            Text(
                text = message.text,
                color = if (isUser) Color.White else IronTextSecondary,
                fontSize = 13.sp,
                fontFamily = InterFontFamily,
                lineHeight = 18.sp,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
            )
        }

        if (isUser) {
            Spacer(Modifier.width(8.dp))
            // User avatar
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(GlassWhite15, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    tint = IronTextSecondary,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun ChatInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(
                    "Ask your AI coach...",
                    color = IronTextTertiary,
                    fontFamily = InterFontFamily,
                    fontSize = 13.sp
                )
            },
            modifier = Modifier.weight(1f),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = IronRed,
                unfocusedBorderColor = GlassBorderDefault,
                cursorColor = IronRed,
                focusedTextColor = Color.White,
                unfocusedTextColor = IronTextSecondary,
                focusedContainerColor = GlassWhite03,
                unfocusedContainerColor = GlassWhite03
            ),
            shape = RoundedCornerShape(16.dp),
            singleLine = true
        )

        Spacer(Modifier.width(8.dp))

        IconButton(
            onClick = onSend,
            modifier = Modifier
                .size(48.dp)
                .background(
                    if (value.isNotBlank()) IronRed else GlassWhite10,
                    CircleShape
                )
        ) {
            Icon(
                Icons.AutoMirrored.Filled.Send,
                contentDescription = "Send",
                tint = Color.White,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}
