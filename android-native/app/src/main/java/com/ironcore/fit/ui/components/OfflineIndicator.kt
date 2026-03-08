package com.ironcore.fit.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.ironcore.fit.ui.theme.*
import kotlinx.coroutines.delay

// ══════════════════════════════════════════════════════════════════
// Offline Indicator — Banner when no network
// Matches React StatusComponents.jsx:
// - Amber banner: "You're offline — workouts will sync when connected"
// - Green banner on reconnect: "Back online — syncing your workouts..."
// ══════════════════════════════════════════════════════════════════

@Composable
fun OfflineIndicator(
    modifier: Modifier = Modifier
) {
    val networkStatus = rememberNetworkStatus()
    var showSyncBanner by remember { mutableStateOf(false) }
    var wasOffline by remember { mutableStateOf(false) }

    LaunchedEffect(networkStatus) {
        if (networkStatus is NetworkStatus.Offline) {
            wasOffline = true
            showSyncBanner = false
        } else if (wasOffline && networkStatus is NetworkStatus.Online) {
            showSyncBanner = true
            delay(3000) // Show sync banner for 3 seconds
            showSyncBanner = false
            wasOffline = false
        }
    }

    Column(modifier = modifier.zIndex(999f)) {
        // Offline banner
        AnimatedVisibility(
            visible = networkStatus is NetworkStatus.Offline,
            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFD97706)) // amber-600
                    .statusBarsPadding()
                    .padding(vertical = 6.dp, horizontal = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "You're offline \u2014 workouts will sync when connected",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Sync banner (on reconnect)
        AnimatedVisibility(
            visible = showSyncBanner,
            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF059669)) // emerald-600
                    .statusBarsPadding()
                    .padding(vertical = 6.dp, horizontal = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Sync,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Back online \u2014 syncing your workouts...",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
