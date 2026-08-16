package com.forgepromises.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import kotlinx.coroutines.*

/**
 * Handles COMPLETE button from notification.
 * Validates both habitId and sessionDate from the Intent.
 */
class MonkModeActionReceiver : BroadcastReceiver() {

    companion object {
        private var lastCompleteTime: Long = 0
        private const val DEBOUNCE_MS = 2000L
    }

    override fun onReceive(context: Context, intent: Intent) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastCompleteTime < DEBOUNCE_MS) {
            return
        }
        lastCompleteTime = now

        val habitId = intent.getStringExtra("habitId") ?: return
        val sessionDate = intent.getStringExtra("sessionDate") ?: return

        val pendingResult = goAsync()
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        scope.launch {
            try {
                val session = MonkModeSessionManager.getInstance(context)
                val changed = session.completeHabitById(habitId, sessionDate, context)

                if (changed) {
                    val refreshIntent = Intent(context, MonkModeService::class.java).apply {
                        action = MonkModeService.ACTION_REFRESH
                    }
                    context.startService(refreshIntent)

                    val widgetIntent = Intent(MonkModeService.ACTION_MONK_MODE_UPDATE)
                    widgetIntent.setPackage(context.packageName)
                    context.sendBroadcast(widgetIntent)
                }
            } finally {
                pendingResult.finish()
                scope.cancel()
            }
        }
    }
}
