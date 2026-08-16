package com.forgepromises.app

import androidx.glance.appwidget.GlanceAppWidgetManager
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.forgepromises.app.glance.CombinedGlanceWidget
import com.forgepromises.app.glance.HeatmapGlanceWidget
import com.forgepromises.app.glance.ProgressGlanceWidget
import com.forgepromises.app.glance.TasksGlanceWidget
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File

class WidgetSnapshotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val moduleScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val writeMutex = Mutex()

    private fun logToFile(message: String) {
        try {
            val dir = reactApplicationContext.getExternalFilesDir(null)
                ?: reactApplicationContext.cacheDir
            val file = File(dir, "widget_debug.log")
            file.appendText("${System.currentTimeMillis()} $message\n")
        } catch (_: Exception) {}
    }

    override fun getName(): String = "WidgetSnapshotModule"

    @ReactMethod
    fun writeSnapshot(snapshotJson: String, promise: Promise) {
        moduleScope.launch {
            try {
                writeMutex.withLock {
                    val completedMatch = Regex("\"completed\":(\\d+)").find(snapshotJson)
                    val comp = completedMatch?.groupValues?.get(1) ?: "?"
                    logToFile("WRITE_START completed=$comp")
                    Log.d("ForgeWidget", "WRITE START completed=$comp")

                    WidgetSnapshotRepository.write(reactApplicationContext, snapshotJson)

                    logToFile("WRITE_DONE completed=$comp")
                    Log.d("ForgeWidget", "WRITE DONE completed=$comp")

                    Log.d("ForgeWidget", "UPDATE START")
                    val manager = GlanceAppWidgetManager(reactApplicationContext)

                    val progressIds = manager.getGlanceIds(
                        ProgressGlanceWidget::class.java
                    )

                    Log.d(
                        "ForgeWidget",
                        "PROGRESS GLANCE IDS count=${progressIds.size} ids=$progressIds"
                    )
                    val tasksIds = manager.getGlanceIds(
                        TasksGlanceWidget::class.java
                    )

                    val combinedIds = manager.getGlanceIds(
                        CombinedGlanceWidget::class.java
                    )

                    val heatmapIds = manager.getGlanceIds(
                        HeatmapGlanceWidget::class.java
                    )

                    Log.d("ForgeWidget", "TASKS IDS count=${tasksIds.size} ids=$tasksIds")
                    Log.d("ForgeWidget", "COMBINED IDS count=${combinedIds.size} ids=$combinedIds")
                    Log.d("ForgeWidget", "HEATMAP IDS count=${heatmapIds.size} ids=$heatmapIds")
                    progressIds.forEach { id ->
                        ProgressGlanceWidget().update(reactApplicationContext, id)
                    }

                    tasksIds.forEach { id ->
                        TasksGlanceWidget().update(reactApplicationContext, id)
                    }

                    combinedIds.forEach { id ->
                        CombinedGlanceWidget().update(reactApplicationContext, id)
                    }

                    heatmapIds.forEach { id ->
                        HeatmapGlanceWidget().update(reactApplicationContext, id)
                    }

                    logToFile("UPDATE_DONE completed=$comp")
                    Log.d("ForgeWidget", "UPDATE DONE completed=$comp")
                }
                promise.resolve(true)
            } catch (e: CancellationException) {
                // Superseded by a newer write - not an error, just drop it.
            } catch (e: Exception) {
                promise.reject("WIDGET_SNAPSHOT_WRITE_FAILED", e.message, e)
            }
        }
    }

    override fun invalidate() {
        super.invalidate()
        moduleScope.cancel()
    }
}
