package com.ironcore.fit.ui.progress

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

/**
 * Line chart for weight over time.
 * Red accent line with dots at each data point, subtle grid.
 */
@Composable
fun WeightChart(
    entries: List<WeightPoint>,
    modifier: Modifier = Modifier
) {
    if (entries.size < 2) {
        Box(modifier = modifier.height(180.dp)) {
            Text(
                "Log at least 2 weigh-ins to see your trend",
                style = MaterialTheme.typography.bodyMedium,
                color = IronTextTertiary,
                modifier = Modifier.padding(16.dp)
            )
        }
        return
    }

    val textMeasurer = rememberTextMeasurer()
    val last = entries.takeLast(14) // Show last 14 entries max

    val minWeight = last.minOf { it.weight } - 1.0
    val maxWeight = last.maxOf { it.weight } + 1.0
    val range = (maxWeight - minWeight).coerceAtLeast(1.0)

    Canvas(modifier = modifier.height(180.dp).fillMaxWidth()) {
        val padLeft = 48f
        val padRight = 16f
        val padTop = 16f
        val padBottom = 36f
        val chartW = size.width - padLeft - padRight
        val chartH = size.height - padTop - padBottom

        // Grid lines (horizontal)
        val gridCount = 4
        val gridColor = Color.White.copy(alpha = 0.06f)
        val labelStyle = TextStyle(color = IronTextTertiary, fontSize = 10.sp)

        for (i in 0..gridCount) {
            val y = padTop + chartH * (1f - i.toFloat() / gridCount)
            drawLine(
                color = gridColor,
                start = Offset(padLeft, y),
                end = Offset(padLeft + chartW, y),
                strokeWidth = 1f
            )
            val weight = minWeight + range * i / gridCount
            val label = "%.0f".format(weight)
            val result = textMeasurer.measure(label, labelStyle)
            drawText(
                textLayoutResult = result,
                topLeft = Offset(padLeft - result.size.width - 6f, y - result.size.height / 2f)
            )
        }

        // Build line path
        val points = last.mapIndexed { index, entry ->
            val x = padLeft + chartW * index / (last.size - 1).coerceAtLeast(1)
            val y = padTop + chartH * (1f - ((entry.weight - minWeight) / range).toFloat())
            Offset(x, y)
        }

        // Gradient fill under line
        val fillPath = Path().apply {
            moveTo(points.first().x, padTop + chartH)
            points.forEach { lineTo(it.x, it.y) }
            lineTo(points.last().x, padTop + chartH)
            close()
        }
        drawPath(
            path = fillPath,
            color = IronRed.copy(alpha = 0.08f)
        )

        // Line
        val linePath = Path().apply {
            points.forEachIndexed { i, p ->
                if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y)
            }
        }
        drawPath(
            path = linePath,
            color = IronRed,
            style = Stroke(width = 2.5f, cap = StrokeCap.Round)
        )

        // Dots
        points.forEach { p ->
            drawCircle(color = IronBlack, radius = 5f, center = p)
            drawCircle(color = IronRed, radius = 3.5f, center = p)
        }

        // Date labels (first and last)
        if (last.isNotEmpty()) {
            val firstLabel = shortDate(last.first().date)
            val lastLabel = shortDate(last.last().date)
            val firstResult = textMeasurer.measure(firstLabel, labelStyle)
            val lastResult = textMeasurer.measure(lastLabel, labelStyle)

            drawText(
                textLayoutResult = firstResult,
                topLeft = Offset(padLeft, padTop + chartH + 8f)
            )
            drawText(
                textLayoutResult = lastResult,
                topLeft = Offset(
                    padLeft + chartW - lastResult.size.width,
                    padTop + chartH + 8f
                )
            )
        }
    }
}

/** "2025-03-06" → "Mar 6" */
private fun shortDate(iso: String): String {
    return try {
        val parts = iso.split("-")
        val month = when (parts[1].toInt()) {
            1 -> "Jan"; 2 -> "Feb"; 3 -> "Mar"; 4 -> "Apr"; 5 -> "May"; 6 -> "Jun"
            7 -> "Jul"; 8 -> "Aug"; 9 -> "Sep"; 10 -> "Oct"; 11 -> "Nov"; 12 -> "Dec"
            else -> "?"
        }
        "$month ${parts[2].toInt()}"
    } catch (_: Exception) { iso }
}
