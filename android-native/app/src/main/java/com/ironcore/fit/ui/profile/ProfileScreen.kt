package com.ironcore.fit.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp)
    ) {
        Text(
            "Profile",
            style = MaterialTheme.typography.headlineLarge,
            color = IronTextPrimary
        )
        Spacer(modifier = Modifier.height(24.dp))

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text("Account", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Manage your profile, subscription, and settings.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = IronTextTertiary
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Logout
        OutlinedButton(
            onClick = { viewModel.logout() },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = IronRed)
        ) {
            Icon(Icons.Default.Logout, null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign Out")
        }
    }
}
