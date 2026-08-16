package com.forgepromises.app.glance

import androidx.compose.ui.graphics.Color
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.toArgb

// Shared palette across all 4 Glance widgets - matches the ember-orange/
// dark theme used in the widget preview thumbnails.
class GlanceColors(private val theme: String, private val accentKey: String) {
    private val accentHex: String
        get() = when (accentKey) {
            "orange" -> "#E05A1A"
            "red" -> "#EF4444"
            "maroon" -> "#800000"
            "blue" -> "#3B82F6"
            "green" -> "#22C55E"
            "purple" -> "#8B5CF6"
            "pink" -> "#EC4899"
            "cyan" -> "#06B6D4"
            "yellow" -> "#F59E0B"
            else -> "#E05A1A"
        }

    val accentColor: Color
        get() = Color(android.graphics.Color.parseColor(accentHex))

    val BG: ColorProvider
        get() = if (theme == "light") ColorProvider(Color.White) else ColorProvider(Color(0xFF000000))

    val TEXT: ColorProvider
        get() = if (theme == "light") ColorProvider(Color(0xFF0A0A0A)) else ColorProvider(Color(0xFFF2F2F2))

    val SUBTEXT: ColorProvider
        get() = if (theme == "light") ColorProvider(Color(0xFF737373)) else ColorProvider(Color(0xFF969696))

    val TRACK: ColorProvider
        get() = if (theme == "light") ColorProvider(Color(0xFFE5E5E5)) else ColorProvider(Color(0xFF1C1C1C))

    val ACCENT: ColorProvider
        get() = ColorProvider(accentColor)

    val ACCENT_STRONG: ColorProvider
        get() = ACCENT

    val ACCENT_DIM: ColorProvider
        get() = ColorProvider(accentColor.copy(alpha = 0.25f))

    val ACCENT_MID: ColorProvider
        get() = ColorProvider(accentColor.copy(alpha = 0.6f))

    val ACCENT_ARGB: Int
        get() = accentColor.toArgb()

    val TRACK_ARGB: Int
        get() =
            if (theme == "light")
                android.graphics.Color.parseColor("#E5E5E5")
            else
                android.graphics.Color.parseColor("#1C1C1C")
}

// Linear interpolation from dark track-adjacent orange to full #DF5B1B,
// driven directly by completion ratio (0.0-1.0) - continuous, not stepped.
fun interpolateAccentColor(pct: Float, accentArgb: Int): androidx.glance.unit.ColorProvider {
    val end = androidx.compose.ui.graphics.Color(accentArgb)
    val start = androidx.compose.ui.graphics.Color(
        android.graphics.Color.argb(
            0xFF,
            ((end.red * 0.2f) * 255).toInt().coerceIn(0, 255),
            ((end.green * 0.2f) * 255).toInt().coerceIn(0, 255),
            ((end.blue * 0.2f) * 255).toInt().coerceIn(0, 255)
        )
    )
    val r = start.red + (end.red - start.red) * pct
    val g = start.green + (end.green - start.green) * pct
    val b = start.blue + (end.blue - start.blue) * pct
    return androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(r, g, b))
}
