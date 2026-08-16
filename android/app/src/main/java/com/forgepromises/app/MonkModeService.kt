package com.forgepromises.app

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import kotlin.random.Random

class MonkModeService : Service() {

    companion object {
        const val CHANNEL_ID = "forgepromises_monk"
        const val COMPLETION_CHANNEL_ID = "forgepromises_monk_complete"
        const val NOTIFICATION_ID = 1001
        const val COMPLETION_NOTIFICATION_ID = 1002

        const val ACTION_START = "com.forgepromises.app.MONK_START"
        const val ACTION_UPDATE = "com.forgepromises.app.MONK_UPDATE"
        const val ACTION_STOP = "com.forgepromises.app.MONK_STOP"
        const val ACTION_REFRESH = "com.forgepromises.app.MONK_REFRESH"
        const val ACTION_NEXT = "com.forgepromises.app.MONK_NEXT"
        const val ACTION_DISMISSED = "com.forgepromises.app.MONK_DISMISSED"
        const val ACTION_RESHOW = "com.forgepromises.app.MONK_RESHOW"

        const val EXTRA_REMAINING = "remaining"
        const val ACTION_MONK_MODE_UPDATE = "com.forgepromises.app.MONK_MODE_UPDATE"
        const val ACTION_MONK_MODE_COMPLETE = "com.forgepromises.app.MONK_MODE_COMPLETE"

        private const val REQUEST_CODE_COMPLETE_CURRENT = 100
        private const val REQUEST_CODE_NEXT = 101
        private const val REQUEST_CODE_OPEN_APP = 102
        private const val REQUEST_CODE_DISMISS = 103
        private const val REQUEST_CODE_RESHOW = 104

        private const val RESHOW_MIN_DELAY_MS = 30_000L
        private const val RESHOW_MAX_DELAY_MS = 60_000L

        fun buildStartIntent(context: Context, remaining: Int): Intent =
            Intent(context, MonkModeService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_REMAINING, remaining)
            }

        fun buildStopIntent(context: Context): Intent =
            Intent(context, MonkModeService::class.java).apply {
                action = ACTION_STOP
            }
    }

    private lateinit var notificationManager: NotificationManager
    private lateinit var alarmManager: AlarmManager
    private lateinit var session: MonkModeSessionManager
    private val dateProvider = SystemDateProvider()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // In-memory only: habits temporarily skipped via the "Next" button for
    // this session. Not persisted — resets naturally on a fresh MONK_START.
    private val skippedHabitIds = mutableSetOf<String>()

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        session = MonkModeSessionManager.getInstance(this)
        createChannels()

        startForeground(NOTIFICATION_ID, buildTemporaryNotification())

        serviceScope.launch {
            val state = session.getValidState()
            if (state != null) {
                updateNotification(state)
                broadcastUpdate()
            } else {
                updateWaitingNotification()
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                skippedHabitIds.clear()
                cancelReshowAlarm()
                refreshFromState()
            }
            ACTION_UPDATE -> {
                cancelReshowAlarm()
                refreshFromState()
            }
            ACTION_REFRESH -> {
                cancelReshowAlarm()
                refreshFromState()
            }
            ACTION_RESHOW -> {
                // Fired by the delayed alarm after a dismissal.
                refreshFromState()
            }
            ACTION_NEXT -> {
                val skipId = intent.getStringExtra("habitId")
                if (skipId != null) skippedHabitIds.add(skipId)
                cancelReshowAlarm()
                refreshFromState()
            }
            ACTION_DISMISSED -> {
                scheduleReshow()
            }
            ACTION_STOP -> {
                cancelReshowAlarm()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }

        return START_STICKY
    }

    private fun refreshFromState() {
        serviceScope.launch {
            val state = session.getValidState()
            if (state == null) {
                updateWaitingNotification()
                return@launch
            }

            val allCompleted = state.habitsList.isNotEmpty() && state.habitsList.all { it.completed }
            if (allCompleted) {
                showCompletionAndStop()
                return@launch
            }

            updateNotification(state)
            broadcastUpdate()
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Notification channels ───────────────────────────────────────────

    private fun createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val monkChannel = NotificationChannel(
                CHANNEL_ID,
                "Monk Mode",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Monk Mode active reminder"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(monkChannel)

            val completeChannel = NotificationChannel(
                COMPLETION_CHANNEL_ID,
                "Monk Mode Completion",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Monk Mode completion celebration"
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(completeChannel)
        }
    }

    // ── Reshow scheduling (dismiss detection) ───────────────────────────

    private fun buildReshowPendingIntent(): PendingIntent {
        val intent = Intent(this, MonkModeService::class.java).apply {
            action = ACTION_RESHOW
        }
        return PendingIntent.getService(
            this, REQUEST_CODE_RESHOW, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun cancelReshowAlarm() {
        alarmManager.cancel(buildReshowPendingIntent())
    }

    private fun scheduleReshow() {
        // Only bother if there's actually still something incomplete.
        serviceScope.launch {
            val state = session.getValidState()
            if (state == null) return@launch
            val hasIncomplete = state.habitsList.any { !it.completed }
            if (!hasIncomplete) return@launch

            // Ensure only one pending reshow alarm exists at a time.
            cancelReshowAlarm()

            val delayMs = Random.nextLong(RESHOW_MIN_DELAY_MS, RESHOW_MAX_DELAY_MS + 1)
            val triggerAt = System.currentTimeMillis() + delayMs
            val pendingIntent = buildReshowPendingIntent()

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                    // No exact-alarm permission — fall back to an inexact
                    // alarm that still respects Doze/battery restrictions.
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                }
            } catch (_: SecurityException) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
            }
        }
    }

    // ── Notifications ───────────────────────────────────────────────────

    private fun buildTemporaryNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🔥 Monk Mode")
            .setContentText("Starting...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    private fun updateWaitingNotification() {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏳ Monk Mode")
            .setContentText("Waiting for habits...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setDeleteIntent(buildDismissPendingIntent())
            .build()
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private suspend fun updateNotification(state: MonkModeState) {
        withContext(Dispatchers.Main) {
            notificationManager.notify(NOTIFICATION_ID, buildNotification(state))
        }
    }

    private fun broadcastUpdate() {
        val intent = Intent(ACTION_MONK_MODE_UPDATE)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }

    private fun buildDismissPendingIntent(): PendingIntent {
        val intent = Intent(this, MonkModeService::class.java).apply {
            action = ACTION_DISMISSED
        }
        return PendingIntent.getService(
            this, REQUEST_CODE_DISMISS, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun buildNotification(state: MonkModeState): Notification {
        val habits = state.habitsList
        val completedCount = habits.count { it.completed }
        val totalCount = habits.size

        val currentHabit = habits.firstOrNull { !it.completed && it.id !in skippedHabitIds }
            ?: habits.firstOrNull { !it.completed }

        // COMPLETE button
        val completeIntent = Intent(this, MonkModeActionReceiver::class.java).apply {
            putExtra("habitId", currentHabit?.id ?: "")
            putExtra("sessionDate", state.sessionDate)
        }
        val completePendingIntent = PendingIntent.getBroadcast(
            this, REQUEST_CODE_COMPLETE_CURRENT, completeIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // NEXT button — skip current habit for this session, show the next one
        val nextIntent = Intent(this, MonkModeService::class.java).apply {
            action = ACTION_NEXT
            putExtra("habitId", currentHabit?.id ?: "")
        }
        val nextPendingIntent = PendingIntent.getService(
            this, REQUEST_CODE_NEXT, nextIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Tap notification → open app
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val launchPendingIntent = PendingIntent.getActivity(
            this, REQUEST_CODE_OPEN_APP, launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🔥 Monk Mode")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(launchPendingIntent)
            .setDeleteIntent(buildDismissPendingIntent())
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)

        if (currentHabit != null) {
            builder.setContentText("📖 ${currentHabit.name}")
            builder.setSubText("✅ $completedCount / $totalCount done — you've got this")
            builder.addAction(android.R.drawable.ic_input_add, "✅ Complete", completePendingIntent)
            builder.addAction(android.R.drawable.ic_media_next, "⏭ Next", nextPendingIntent)
        } else {
            builder.setContentText("⏳ Waiting for habits...")
            builder.setSubText("No active habits")
        }

        return builder.build()
    }

    private suspend fun showCompletionAndStop() {
        withContext(Dispatchers.Main) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            val launchPendingIntent = PendingIntent.getActivity(
                this@MonkModeService, REQUEST_CODE_OPEN_APP, launchIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val completionNotification = NotificationCompat.Builder(this@MonkModeService, COMPLETION_CHANNEL_ID)
                .setContentTitle("🎉 You did it!")
                .setContentText("Great job — every habit complete today. See you tomorrow 💪")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(launchPendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build()

            notificationManager.notify(COMPLETION_NOTIFICATION_ID, completionNotification)
        }

        cancelReshowAlarm()
        session.stopSession(this)
        broadcastCompletion()

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun broadcastCompletion() {
        val intent = Intent(ACTION_MONK_MODE_COMPLETE)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }
}
