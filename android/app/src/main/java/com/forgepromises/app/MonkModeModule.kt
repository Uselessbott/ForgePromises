package com.forgepromises.app

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class MonkModeModule(
    private val reactApplicationContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactApplicationContext) {

    override fun getName() = "MonkModeModule"

    private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        moduleScope.cancel()
    }

    @ReactMethod
    fun startMonkModeSession(habitsArray: ReadableArray, promise: Promise) {
        moduleScope.launch {
            try {
                val session = MonkModeSessionManager.getInstance(reactApplicationContext)
                val habits = MonkModeSessionManager.habitsFromReadableArray(habitsArray)
                session.startSession(habits, reactApplicationContext)

                val intent = Intent(
                    reactApplicationContext,
                    MonkModeService::class.java
                ).apply {
                    action = MonkModeService.ACTION_START
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactApplicationContext.startForegroundService(intent)
                } else {
                    reactApplicationContext.startService(intent)
                }

                val map = Arguments.createMap()
                map.putBoolean("isActive", false)
                map.putArray("habits", Arguments.createArray())
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject(
                    "MONK_MODE_ERROR",
                    "Failed to start session: ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun syncMonkModeSession(habitsArray: ReadableArray, promise: Promise) {
        moduleScope.launch {
            try {
                val session = MonkModeSessionManager.getInstance(reactApplicationContext)
                val habits = MonkModeSessionManager.habitsFromReadableArray(habitsArray)
                session.syncFromRN(habits, reactApplicationContext)

                if (session.getValidState() != null) {
                    val intent = Intent(
                        reactApplicationContext,
                        MonkModeService::class.java
                    ).apply {
                        action = MonkModeService.ACTION_UPDATE
                    }
                    reactApplicationContext.startService(intent)
                }

                val map = Arguments.createMap()
                map.putBoolean("isActive", false)
                map.putArray("habits", Arguments.createArray())
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject(
                    "MONK_MODE_ERROR",
                    "Failed to sync session: ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun stopMonkModeSession(promise: Promise) {
        moduleScope.launch {
            try {
                MonkModeSessionManager.getInstance(reactApplicationContext)
                    .stopSession(reactApplicationContext)

                val intent = Intent(
                    reactApplicationContext,
                    MonkModeService::class.java
                ).apply {
                    action = MonkModeService.ACTION_STOP
                }

                reactApplicationContext.startService(intent)

                val map = Arguments.createMap()
                map.putBoolean("isActive", false)
                map.putArray("habits", Arguments.createArray())
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject(
                    "MONK_MODE_ERROR",
                    "Failed to stop session: ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getMonkModeSessionState(promise: Promise) {
        moduleScope.launch {
            try {
                val session = MonkModeSessionManager.getInstance(reactApplicationContext)
                val state = session.getValidState()

                if (state != null) {
                    promise.resolve(
                        MonkModeSessionManager.stateToWritableMap(
                            state,
                            SystemDateProvider()
                        )
                    )
                } else {
                    val map = Arguments.createMap()
                    map.putBoolean("isActive", false)
                    map.putArray("habits", Arguments.createArray())
                    promise.resolve(map)
                }
            } catch (e: Exception) {
                promise.reject(
                    "MONK_MODE_ERROR",
                    "Failed to get session state: ${e.message}",
                    e
                )
            }
        }
    }

    // Legacy API
    @ReactMethod
    fun startMonkMode(remaining: Int) {
        // Deprecated
    }

    @ReactMethod
    fun updateMonkMode(remaining: Int) {
        // Deprecated
    }

    @ReactMethod
    fun stopMonkMode() {
        moduleScope.launch {
            try {
                MonkModeSessionManager.getInstance(reactApplicationContext)
                    .stopSession(reactApplicationContext)

                val intent = Intent(
                    reactApplicationContext,
                    MonkModeService::class.java
                ).apply {
                    action = MonkModeService.ACTION_STOP
                }

                reactApplicationContext.startService(intent)
            } catch (_: Exception) {
            }
        }
    }
}
