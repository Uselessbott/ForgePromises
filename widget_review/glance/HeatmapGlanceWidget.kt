package com.forgepromises.app.glance

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.Spacer
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.forgepromises.app.MainActivity
import com.forgepromises.app.WidgetHeatmapDay
import com.forgepromises.app.WidgetSnapshotRepository

class HeatmapGlanceWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetSnapshotRepository.read(context)
        val colors = GlanceColors(
            theme = snapshot?.theme ?: "super_amoled",
            accentKey = snapshot?.accentColor ?: "orange"
        )
        provideContent {
            GlanceTheme {
                HeatmapContent(colors = colors, 
                    streak = snapshot?.streak ?: 0,
                    heatmap = snapshot?.heatmap ?: emptyList(),
                    updatedAt = snapshot?.updatedAt ?: "none"
                )
            }
        }
    }
}

@Composable
private fun HeatmapContent(colors: GlanceColors, streak: Int, heatmap: List<WidgetHeatmapDay>, updatedAt: String) {
    val context = LocalContext.current
    val size = LocalSize.current
    val openAppIntent = Intent(context, MainActivity::class.java)

    val rows = 5
    val recent = heatmap.takeLast(50)
    val weeks = recent.chunked(rows)


    val paddingPx = 12f
    val headerHeight = 24f
    val gap = 2f
    val availableWidth = (size.width.value - paddingPx * 2).coerceAtLeast(40f)
    val availableHeight = (size.height.value - paddingPx * 2 - headerHeight).coerceAtLeast(30f)
    val cols = weeks.size.coerceAtLeast(1)
    val cellFromWidth = (availableWidth - gap * (cols - 1)) / cols
    val cellFromHeight = (availableHeight - gap * (rows - 1)) / rows
    val cellSize = minOf(cellFromWidth, cellFromHeight).coerceIn(4f, 16f)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(colors.BG)
            .padding(paddingPx.dp)
            .clickable(actionStartActivity(openAppIntent))
    ) {
        Text(
            text = "$streak day streak",
            style = TextStyle(color = colors.TEXT, fontWeight = FontWeight.Bold)
        )
        Box(modifier = GlanceModifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Row {
                weeks.forEachIndexed { wi, week ->
                    Column(
                        modifier = if (wi < weeks.size - 1)
                            GlanceModifier.padding(end = gap.dp)
                        else
                            GlanceModifier
                    ) {
                        week.forEachIndexed { index, day ->
                            val cellColor = if (!day.hasData || day.pct <= 0.0) {
                                colors.TRACK
                            } else {
                                interpolateAccentColor(day.pct.toFloat().coerceIn(0f, 1f), colors.ACCENT_ARGB)
                            }
                            Box(
                                modifier = GlanceModifier
                                    .size(cellSize.dp)
                                    .background(cellColor)
                                    .cornerRadius((cellSize * 0.2f).dp)
                            ) {}
                            if (index != week.lastIndex) {
                                Spacer(modifier = GlanceModifier.size(gap.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
