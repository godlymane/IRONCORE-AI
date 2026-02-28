package com.ironcore.fit.ui.arena

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

@Composable
fun ArenaScreen(navController: NavHostController? = null) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp)
    ) {
        Text(
            "Arena",
            style = MaterialTheme.typography.headlineLarge,
            color = IronTextPrimary
        )
        Spacer(modifier = Modifier.height(24.dp))

        // Leaderboard preview
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.EmojiEvents, null, tint = IronYellow)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Leaderboard", style = MaterialTheme.typography.titleMedium)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Compete for the top spot. Earn XP through workouts.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = IronTextTertiary
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Community Boss preview
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    "COMMUNITY BOSS",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = IronRed
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Team up to defeat the boss. Deal damage with workout volume.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = IronTextTertiary
                )
            }
        }
    }
}
