package com.forgepromises.app

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

interface DateProvider {
    fun now(): Instant

    fun zone(): ZoneId

    fun today(): String {
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
        return LocalDate.ofInstant(now(), zone()).format(formatter)
    }
}

class SystemDateProvider(
    private val systemZone: ZoneId = ZoneId.systemDefault()
) : DateProvider {
    override fun now(): Instant = Instant.now()

    override fun zone(): ZoneId = systemZone
}
