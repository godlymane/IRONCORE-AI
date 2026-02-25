package com.ironcore.fit.ui.workout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

@Composable
fun WorkoutScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp)
    ) {
        Text(
            "Workouts",
            style = MaterialTheme.typography.headlineLarge,
            color = IronTextPrimary
        )
        Spacer(modifier = Modifier.height(24.dp))

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.FitnessCenter,
                    contentDescription = null,
                    tint = IronRed,
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text("Start a New Workout", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { /* TODO: Navigate to workout logger */ },
                    colors = ButtonDefaults.buttonColors(containerColor = IronRed)
                ) {
                    Text("BEGIN")
                }
            }
        }
    }
}
