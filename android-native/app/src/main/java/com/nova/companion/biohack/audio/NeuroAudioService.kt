package com.nova.companion.biohack.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlin.math.sin

/**
 * NeuroAudioService — Generates real-time binaural beats as a foreground service.
 *
 * Binaural beats work by playing two slightly different frequencies in each ear.
 * The brain perceives the difference as a rhythmic pulse that entrains brainwaves:
 *
 *   Fearless  → 18 Hz beta beat  (alertness, confidence)
 *   God Mode  → 40 Hz gamma beat (peak cognition, hyper-focus)
 *   Flow State→ 10 Hz alpha beat (relaxed focus, creativity)
 *   Recovery  → 2 Hz delta beat  (deep recovery, sleep)
 */
class NeuroAudioService : Service() {

    companion object {
        const val ACTION_START_FEARLESS    = "START_FEARLESS"
        const val ACTION_START_GOD_MODE    = "START_GOD_MODE"
        const val ACTION_START_INTELLIGENT = "START_INTELLIGENT"
        const val ACTION_START_RECOVERY    = "START_RECOVERY"
        const val ACTION_STOP              = "STOP"

        private const val CHANNEL_ID = "neuro_audio_channel"
        private const val NOTIFICATION_ID = 9001
        private const val SAMPLE_RATE = 44100
        private const val BASE_FREQ = 200.0 // Hz — carrier tone
    }

    private var audioThread: Thread? = null
    @Volatile private var isPlaying = false
    private var audioTrack: AudioTrack? = null

    // ── Preset definitions ──────────────────────────────────────────
    data class Preset(val label: String, val beatHz: Double)

    private val presets = mapOf(
        ACTION_START_FEARLESS    to Preset("Fearless — 18 Hz Beta",   18.0),
        ACTION_START_GOD_MODE    to Preset("God Mode — 40 Hz Gamma",  40.0),
        ACTION_START_INTELLIGENT to Preset("Flow State — 10 Hz Alpha", 10.0),
        ACTION_START_RECOVERY    to Preset("Recovery — 2 Hz Delta",    2.0)
    )

    // ── Service lifecycle ───────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        if (action == ACTION_STOP) {
            stopPlayback()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val preset = presets[action] ?: return START_NOT_STICKY

        // Stop any current playback before starting a new preset
        stopPlayback()

        startForeground(NOTIFICATION_ID, buildNotification(preset.label))
        startBinauralBeat(preset.beatHz)

        return START_STICKY
    }

    override fun onDestroy() {
        stopPlayback()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Audio engine ────────────────────────────────────────────────

    private fun startBinauralBeat(beatHz: Double) {
        isPlaying = true

        val leftFreq = BASE_FREQ
        val rightFreq = BASE_FREQ + beatHz

        val bufferSize = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_STEREO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        audioTrack = track
        track.play()

        audioThread = Thread {
            val buffer = ShortArray(bufferSize)
            var sampleIndex = 0L
            val amplitude: Short = 8000 // ~25% volume — comfortable for headphones

            while (isPlaying) {
                for (i in buffer.indices step 2) {
                    val t = sampleIndex.toDouble() / SAMPLE_RATE

                    // Left channel — base frequency
                    val left = (amplitude * sin(2.0 * Math.PI * leftFreq * t)).toInt().toShort()
                    // Right channel — base + beat offset
                    val right = (amplitude * sin(2.0 * Math.PI * rightFreq * t)).toInt().toShort()

                    buffer[i] = left
                    if (i + 1 < buffer.size) buffer[i + 1] = right

                    sampleIndex++
                }
                track.write(buffer, 0, buffer.size)
            }
        }.apply {
            name = "NeuroAudio-Generator"
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    private fun stopPlayback() {
        isPlaying = false
        audioThread?.join(500)
        audioThread = null
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null
    }

    // ── Notification ────────────────────────────────────────────────

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Neuro Audio",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Binaural beat playback"
            setShowBadge(false)
        }
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        mgr.createNotificationChannel(channel)
    }

    private fun buildNotification(presetLabel: String): Notification {
        // Stop action for the notification
        val stopIntent = Intent(this, NeuroAudioService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Neuro-Hack Active")
            .setContentText(presetLabel)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setSilent(true)
            .addAction(
                android.R.drawable.ic_media_pause,
                "Stop",
                stopPending
            )
            .build()
    }
}
