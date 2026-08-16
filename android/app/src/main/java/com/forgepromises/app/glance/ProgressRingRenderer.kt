package com.forgepromises.app.glance

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF

// Glance has no canvas/arc-drawing composable and CircularProgressIndicator
// is indeterminate-only, so a determinate ring is drawn manually onto a
// plain Android Bitmap using standard Canvas/Paint APIs (no Glance/Compose
// dependency here at all), then displayed via Glance's Image composable.
// This restores the same arc-ring visual the old SVG-based widget had.
object ProgressRingRenderer {
    fun render(sizePx: Int, pct: Float, accentColor: Int, trackColor: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val stroke = sizePx * 0.12f
        val inset = stroke / 2f
        val rect = RectF(inset, inset, sizePx - inset, sizePx - inset)

        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = stroke
            strokeCap = Paint.Cap.ROUND
            color = trackColor
        }
        canvas.drawArc(rect, 0f, 360f, false, trackPaint)

        val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = stroke
            strokeCap = Paint.Cap.ROUND
            color = accentColor
        }
        val sweep = 360f * pct.coerceIn(0f, 1f)
        canvas.drawArc(rect, -90f, sweep, false, progressPaint)

        return bitmap
    }
}
