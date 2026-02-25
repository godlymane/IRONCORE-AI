package com.ironcore.fit.ui.coach

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ironcore.fit.ui.theme.*

@Composable
fun CoachScreen(viewModel: CoachViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        viewModel.onCameraPermissionResult(granted)
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
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

            // Skeleton overlay layer
            PoseOverlay(
                pose = uiState.currentPose,
                imageWidth = uiState.imageWidth,
                imageHeight = uiState.imageHeight,
                isFrontCamera = uiState.useFrontCamera,
                modifier = Modifier.fillMaxSize()
            )

            // HUD overlay — landmark count + controls
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top HUD — detection status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Status badge
                    Surface(
                        color = if (uiState.isDetecting) IronGreen.copy(alpha = 0.2f)
                        else IronRed.copy(alpha = 0.2f),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            text = if (uiState.isDetecting) "TRACKING" else "NO POSE",
                            color = if (uiState.isDetecting) IronGreen else IronRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }

                    // Landmark count
                    if (uiState.isDetecting) {
                        Text(
                            text = "${uiState.landmarkCount} landmarks",
                            color = IronTextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }

                // Bottom controls
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    // Camera flip button
                    IconButton(
                        onClick = { viewModel.toggleCamera() },
                        modifier = Modifier
                            .size(56.dp)
                            .background(GlassWhite, CircleShape)
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
        } else {
            // Permission not granted — show request
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
                    style = MaterialTheme.typography.bodyLarge
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                    colors = ButtonDefaults.buttonColors(containerColor = IronRed)
                ) {
                    Text("Grant Camera Access")
                }
            }
        }
    }
}
