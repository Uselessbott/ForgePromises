package com.forgepromises.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

// Same manual-registration pattern as MonkModePackage - this module lives
// in the app package, so it isn't autolinked and must be added explicitly
// in MainApplication.kt.
class WidgetSnapshotPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(WidgetSnapshotModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
