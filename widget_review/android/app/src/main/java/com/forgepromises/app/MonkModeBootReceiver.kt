package com.forgepromises.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.*

/**
 * Restarts Monk Mode after device reboot only if:
 * - A valid session exists for today
 * - There are unfinished habits
 */
class MonkModeBootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val pendingResult = goAsync()
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        scope.launch {
            try {
                val session = MonkModeSessionManager.getInstance(context)
                
                if (session.hasUnfinishedHabits()) {
                    val startIntent = Intent(context, MonkModeService::class.java).apply {
                        action = MonkModeService.ACTION_START
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(startIntent)
                    } else {
                        context.startService(startIntent)
                    }
                }
            } finally {
                pendingResult.finish()
                scope.cancel()
            }
        }
    }
}
