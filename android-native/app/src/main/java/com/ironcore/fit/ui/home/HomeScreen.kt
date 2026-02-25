package com.ironcore.fit.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

@Composable
fun HomeScreen(viewModel: HomeViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp)
    ) {
        Text(
            text = "Welcome back",
            style = MaterialTheme.typography.bodyLarge,
            color = IronTextSecondary
        )
        Text(
            text = uiState.displayName.ifEmpty { "Recruit" },
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = IronTextPrimary
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Today's stats card
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text("Today's Progress", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    StatItem("XP", "${uiState.xp}")
                    StatItem("Level", "${uiState.level}")
                    StatItem("Streak", "${uiState.streak}d")
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text("Quick Actions", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Log workout, track meals, check arena...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = IronTextTertiary
                )
            }
        }
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    Column {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = IronRed
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = IronTextTertiary
        )
    }
}
