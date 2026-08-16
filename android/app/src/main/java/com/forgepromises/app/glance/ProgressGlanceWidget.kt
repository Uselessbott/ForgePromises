package com.forgepromises.app.glance

import android.content.Context
import android.content.Intent
import android.util.Log

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent

import androidx.glance.background

import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size

import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

import com.forgepromises.app.MainActivity
import com.forgepromises.app.WidgetSnapshotRepository

class ProgressGlanceWidget : GlanceAppWidget() {

    override suspend fun provideGlance(
        context: Context,
        id: GlanceId
    ) {
        Log.d(
            "ForgeGlance",
            "PROVIDE START id=$id"
        )

        provideContent {

            val snapshot by WidgetSnapshotRepository
                .snapshotFlow(context)
                .collectAsState(initial = null)

            Log.d(
                "ForgeGlance",
                "CONTENT SNAPSHOT completed=${snapshot?.completed} " +
                        "total=${snapshot?.total} " +
                        "streak=${snapshot?.streak}"
            )

            val colors = GlanceColors(
                theme = snapshot?.theme ?: "super_amoled",
                accentKey = snapshot?.accentColor ?: "orange"
            )

            GlanceTheme {

                ProgressContent(
                    colors = colors,
                    completed = snapshot?.completed ?: 0,
                    total = snapshot?.total ?: 0,
                    streak = snapshot?.streak ?: 0
                )
            }
        }
    }
}

@Composable
private fun ProgressContent(
    colors: GlanceColors,
    completed: Int,
    total: Int,
    streak: Int
) {
    val size = LocalSize.current
    val context = LocalContext.current

    val shortestSide =
        if (size.width < size.height) {
            size.width
        } else {
            size.height
        }

    val ringSizeDp =
        (shortestSide.value * 0.5f)
            .coerceIn(36f, 96f)

    val pct =
        if (total > 0) {
            completed.toFloat() / total.toFloat()
        } else {
            0f
        }

    val ringSizePx =
        (
                ringSizeDp *
                        context.resources.displayMetrics.density
                )
            .toInt()
            .coerceAtLeast(1)

    val ringBitmap = remember(
        pct,
        ringSizePx
    ) {
        ProgressRingRenderer.render(
            ringSizePx,
            pct,
            colors.ACCENT_ARGB,
            colors.TRACK_ARGB
        )
    }

    val openAppIntent =
        Intent(context, MainActivity::class.java)

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(colors.BG)
            .padding(GlanceDimensions.WidgetPadding)
            .clickable(
                actionStartActivity(openAppIntent)
            ),
        contentAlignment = Alignment.Center
    ) {

        Column(
            horizontalAlignment =
                Alignment.Horizontal.CenterHorizontally
        ) {

            Box(
                modifier = GlanceModifier
                    .size(ringSizeDp.dp),
                contentAlignment = Alignment.Center
            ) {

                Image(
                    provider = ImageProvider(ringBitmap),
                    contentDescription = null,
                    modifier = GlanceModifier
                        .size(ringSizeDp.dp)
                )

                Text(
                    text = "${(pct * 100).toInt()}%",
                    style = TextStyle(
                        color = colors.TEXT,
                        fontWeight = FontWeight.Bold
                    )
                )
            }

            Text(
                text = "$completed of $total",
                style = TextStyle(
                    color = colors.SUBTEXT
                )
            )

            if (streak > 0) {
                Text(
                    text = "🔥 $streak day streak",
                    style = TextStyle(
                        color = colors.ACCENT,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
        }
    }
}