package com.forgepromises.app.glance

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.forgepromises.app.MainActivity
import com.forgepromises.app.WidgetHabit
import com.forgepromises.app.WidgetSnapshotRepository

class CombinedGlanceWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Single

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = WidgetSnapshotRepository.read(context)
        val colors = GlanceColors(
            theme = snapshot?.theme ?: "super_amoled",
            accentKey = snapshot?.accentColor ?: "orange"
        )
        provideContent {
            GlanceTheme {
                CombinedContent(colors = colors, 
                    completed = snapshot?.completed ?: 0,
                    total = snapshot?.total ?: 0,
                    streak = snapshot?.streak ?: 0,
                    habits = snapshot?.habits ?: emptyList()
                )
            }
        }
    }
}

@Composable
private fun CombinedContent(colors: GlanceColors, completed: Int, total: Int, streak: Int, habits: List<WidgetHabit>) {
    val context = LocalContext.current
    val openAppIntent = Intent(context, MainActivity::class.java)
    val pct = if (total > 0) completed.toFloat() / total.toFloat() else 0f
    val size = LocalSize.current
    val ringSizeDp = (size.height.value * 0.35f).coerceIn(36f, 72f)
    val ringSizePx = (ringSizeDp * context.resources.displayMetrics.density).toInt().coerceAtLeast(1)
    val ringBitmap = remember(pct, ringSizePx) {
        ProgressRingRenderer.render(ringSizePx, pct, colors.ACCENT_ARGB, colors.TRACK_ARGB)
    }

    val remainingHabits = habits.filter { !it.completed }
    val visibleHabits = remainingHabits.take(4)
    val hiddenHabitCount = (remainingHabits.size - visibleHabits.size).coerceAtLeast(0)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(colors.BG)
            .padding(GlanceDimensions.WidgetPadding)
    ) {
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .clickable(actionStartActivity(openAppIntent)),
            verticalAlignment = Alignment.Vertical.CenterVertically
        ) {
            Box(modifier = GlanceModifier.size(ringSizeDp.dp), contentAlignment = Alignment.Center) {
                Image(
                    provider = ImageProvider(ringBitmap),
                    contentDescription = null,
                    modifier = GlanceModifier.size(ringSizeDp.dp)
                )
                Text(
                    text = "${(pct * 100).toInt()}%",
                    style = TextStyle(color = colors.TEXT, fontWeight = FontWeight.Bold)
                )
            }
            Spacer(GlanceModifier.width(10.dp))
            Column {
                Text(text = "$completed of $total", style = TextStyle(color = colors.SUBTEXT))
                Text(text = "🔥 $streak day streak", style = TextStyle(color = colors.ACCENT, fontWeight = FontWeight.Bold))
            }
        }
        Spacer(GlanceModifier.height(GlanceDimensions.SectionSpacing))
        if (remainingHabits.isEmpty()) {
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "✓ All habits completed",
                    style = TextStyle(color = colors.ACCENT, fontWeight = FontWeight.Bold)
                )
            }
        } else {
            LazyColumn(modifier = GlanceModifier.fillMaxWidth()) {
                items(visibleHabits, itemId = { it.id.hashCode().toLong() }) { habit ->
                    Row(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .clickable(actionStartActivity(openAppIntent)),
                        verticalAlignment = Alignment.Vertical.CenterVertically
                    ) {
                        Box(
                            modifier = GlanceModifier
                                .size(GlanceDimensions.CheckboxSize)
                                .background(colors.TRACK)
                                .cornerRadius(GlanceDimensions.CornerRadius)
                        ) {}
                        Spacer(GlanceModifier.width(6.dp))
                        Text(
                            text = habit.name,
                            style = TextStyle(color = colors.TEXT)
                        )
                    }
                }
                if (hiddenHabitCount > 0) {
                    item {
                        Text(
                            text = "+$hiddenHabitCount more",
                            style = TextStyle(color = colors.SUBTEXT)
                        )
                    }
                }
            }
        }
    }
}
