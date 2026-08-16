package com.forgepromises.app

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

// Single DataStore<Preferences> instance for widget snapshot data, scoped to
// its own file ("widget_snapshot") separate from any other app preferences.
// Using the `by preferencesDataStore(...)` delegate on Context guarantees a
// single DataStore instance per file across the whole process, which is
// required for DataStore's atomicity/thread-safety guarantees to hold -
// creating multiple DataStore instances pointing at the same file is a
// well-known source of corruption and IllegalStateException crashes.
val Context.widgetSnapshotDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "widget_snapshot"
)

object WidgetSnapshotKeys {
    // The entire snapshot is stored as a single JSON blob under one key,
    // rather than exploding every field into separate Preferences keys.
    // This keeps each write a single atomic operation (DataStore's edit{}
    // transaction already serializes and atomically persists via a temp
    // file + rename internally) and keeps the schema simple to version.
    val SNAPSHOT_JSON = stringPreferencesKey("snapshot_json")
}
