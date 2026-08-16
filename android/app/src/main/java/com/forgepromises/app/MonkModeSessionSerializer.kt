package com.forgepromises.app

import androidx.datastore.core.Serializer
import java.io.InputStream
import java.io.OutputStream

object MonkModeSessionSerializer : Serializer<MonkModeState> {

    override val defaultValue: MonkModeState
        get() = MonkModeState.getDefaultInstance()

    override suspend fun readFrom(input: InputStream): MonkModeState =
        MonkModeState.parseFrom(input)

    override suspend fun writeTo(
        t: MonkModeState,
        output: OutputStream
    ) = t.writeTo(output)
}
