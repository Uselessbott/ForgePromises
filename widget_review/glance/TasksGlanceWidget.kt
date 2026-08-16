package com.forgepromises.app.glance

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.forgepromises.app.MainActivity
import com.forgepromises.app.WidgetSnapshotRepository

class TasksGlanceWidget : GlanceAppWidget() {

    override val sizeMode = SizeMode.Single

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetSnapshotRepository.read(context)

        val colors = GlanceColors(
            theme = snapshot?.theme ?: "super_amoled",
            accentKey = snapshot?.accentColor ?: "orange"
        )

        provideContent {
            GlanceTheme {
                PromiseContent(
                    colors = colors,
                    hasPromise = snapshot?.hasDailyPromise ?: false,
                    promiseName = snapshot?.selectedPromiseName ?: "",
                    completed = snapshot?.selectedPromiseCompleted ?: false
                )
            }
        }
    }
}

@Composable
private fun PromiseContent(
    colors: GlanceColors,
    hasPromise: Boolean,
    promiseName: String,
    completed: Boolean
) {
    val context = LocalContext.current
    val intent = Intent(context, MainActivity::class.java)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(colors.BG)
            .padding(12.dp)
            .clickable(actionStartActivity(intent))
    ) {

        Text(
            text = "❤️ TODAY'S PROMISE",
            style = TextStyle(
                color = colors.TEXT,
                fontWeight = FontWeight.Bold
            )
        )

        Spacer(GlanceModifier.height(10.dp))

        if (!hasPromise) {

            Text(
                text = "Choose today's promise in Forge.",
                style = TextStyle(color = colors.SUBTEXT)
            )

        } else {

            Text(
                text = promiseName,
                style = TextStyle(
                    color = colors.TEXT,
                    fontWeight = FontWeight.Medium
                )
            )

            Spacer(GlanceModifier.height(8.dp))

            Text(
                text = if (completed)
                    "✅ Promise Kept"
                else
                    "Today's commitment",
                style = TextStyle(
                    color = if (completed) colors.ACCENT else colors.SUBTEXT
                )
            )
        }
    }
}
