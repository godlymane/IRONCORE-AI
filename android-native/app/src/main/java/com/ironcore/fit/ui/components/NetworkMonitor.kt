package com.ironcore.fit.ui.components

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

// ══════════════════════════════════════════════════════════════════
// Network Monitor — ConnectivityManager callback for online/offline
// Matches React useNetworkStatus hook + StatusComponents.jsx
// ══════════════════════════════════════════════════════════════════

sealed class NetworkStatus {
    data object Online : NetworkStatus()
    data object Offline : NetworkStatus()
}

/** Flow-based network monitoring via ConnectivityManager */
fun Context.observeNetworkStatus(): Flow<NetworkStatus> = callbackFlow {
    val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            trySend(NetworkStatus.Online)
        }

        override fun onLost(network: Network) {
            trySend(NetworkStatus.Offline)
        }

        override fun onUnavailable() {
            trySend(NetworkStatus.Offline)
        }
    }

    val request = NetworkRequest.Builder()
        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .build()

    connectivityManager.registerNetworkCallback(request, callback)

    // Check initial state
    val currentNetwork = connectivityManager.activeNetwork
    val caps = connectivityManager.getNetworkCapabilities(currentNetwork)
    val isOnline = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    trySend(if (isOnline) NetworkStatus.Online else NetworkStatus.Offline)

    awaitClose {
        connectivityManager.unregisterNetworkCallback(callback)
    }
}.distinctUntilChanged()

/** Composable state for network status */
@Composable
fun rememberNetworkStatus(): NetworkStatus {
    val context = LocalContext.current
    var status by remember { mutableStateOf<NetworkStatus>(NetworkStatus.Online) }

    LaunchedEffect(Unit) {
        context.observeNetworkStatus().collect { status = it }
    }

    return status
}
