package com.ironcore.fit.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * Date formatting utilities used throughout the app.
 *
 * All Firestore date strings use ISO-8601 "YYYY-MM-DD" format.
 * This matches the React app's date handling so data is portable.
 */
object DateFormatters {

    /** ISO-8601 local date formatter: "YYYY-MM-DD" */
    val isoDate: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    /** Returns today's date as "YYYY-MM-DD". */
    fun today(): String = LocalDate.now().format(isoDate)

    /**
     * Format a date string relative to today.
     *
     * - Same day -> "Today"
     * - Previous day -> "Yesterday"
     * - Within 7 days -> "3d ago"
     * - Older -> "Jan 15"
     */
    fun formatRelative(dateStr: String): String {
        val date = LocalDate.parse(dateStr, isoDate)
        val today = LocalDate.now()
        return when {
            date == today -> "Today"
            date == today.minusDays(1) -> "Yesterday"
            date.isAfter(today.minusDays(7)) -> "${ChronoUnit.DAYS.between(date, today)}d ago"
            else -> date.format(DateTimeFormatter.ofPattern("MMM d"))
        }
    }

    /**
     * Format a duration in seconds to a human-readable string.
     *
     * - >= 1 hour -> "1:05:30"
     * - < 1 hour  -> "5:30"
     */
    fun formatDuration(seconds: Long): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return when {
            hours > 0 -> "%d:%02d:%02d".format(hours, minutes, secs)
            else -> "%d:%02d".format(minutes, secs)
        }
    }
}
