package com.ironcore.fit.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.ironcore.fit.MainActivity

/**
 * Firebase Cloud Messaging service for push notifications.
 *
 * Handles:
 * - Arena challenge invitations
 * - Guild activity alerts
 * - Battle Pass milestone notifications
 * - Streak reminders
 * - Community boss events
 *
 * The FCM token is saved to Firestore under users/{uid}/fcmToken
 * so Cloud Functions can target individual devices.
 */
class IronCoreFCMService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "ironcore_general"
        const val CHANNEL_NAME = "IronCore Notifications"
        const val CHANNEL_ARENA = "ironcore_arena"
        const val CHANNEL_ARENA_NAME = "Arena Challenges"
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        createNotificationChannels()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            // Pass deep link data so the app can navigate to the right screen
            message.data["screen"]?.let { putExtra("navigate_to", it) }
            message.data["matchId"]?.let { putExtra("match_id", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Determine which channel to use based on message data
        val channelId = when (message.data["type"]) {
            "arena_challenge", "arena_result" -> CHANNEL_ARENA
            else -> CHANNEL_ID
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(message.notification?.title ?: "IronCore Fit")
            .setContentText(message.notification?.body ?: "")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    /**
     * Called when the FCM registration token is refreshed.
     * Saves the new token to Firestore so Cloud Functions can
     * send targeted push notifications to this device.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .update("fcmToken", token)
    }

    /**
     * Create notification channels for Android O+.
     * Separate channels for general and arena notifications
     * so users can configure importance independently.
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val generalChannel = NotificationChannel(
                CHANNEL_ID, CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "General IronCore Fit notifications"
            }

            val arenaChannel = NotificationChannel(
                CHANNEL_ARENA, CHANNEL_ARENA_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Arena challenge and battle notifications"
            }

            manager.createNotificationChannel(generalChannel)
            manager.createNotificationChannel(arenaChannel)
        }
    }
}
