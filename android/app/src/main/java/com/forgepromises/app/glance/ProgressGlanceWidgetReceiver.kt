package com.forgepromises.app.glance

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

// The Receiver is what the Android system actually talks to (widget added/
// removed/updated broadcasts) - it has zero RN/React dependency. This is
// the structural fix for "widget only renders after reopening the app":
// there is no JS runtime anywhere in this chain.
class ProgressGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ProgressGlanceWidget()
}
