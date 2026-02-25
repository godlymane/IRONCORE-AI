package com.ironcore.fit.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object DateUtils {
    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    fun today(): String = LocalDate.now().format(dateFormatter)

    fun yesterday(): String = LocalDate.now().minusDays(1).format(dateFormatter)

    fun formatDate(date: String): String {
        return try {
            val parsed = LocalDate.parse(date, dateFormatter)
            parsed.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
        } catch (e: Exception) {
            date
        }
    }
}
