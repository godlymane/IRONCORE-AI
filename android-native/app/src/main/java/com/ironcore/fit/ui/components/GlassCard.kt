package com.ironcore.fit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*

/**
 * Glass-morphism card matching the React GlassCard component.
 * Mobile-optimized: rgba(18,18,18,0.95) background with subtle red-tinted border.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    highlight: Boolean = false,
    cornerRadius: Dp = 24.dp,
    padding: Dp = 20.dp,
    content: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)

    val bgColor = if (highlight) Color(0xF2280A0A) // rgba(40,10,10,0.95)
    else Color(0xF2121212)                          // rgba(18,18,18,0.95)

    val borderColor = if (highlight) IronRed.copy(alpha = 0.4f)
    else IronRed.copy(alpha = 0.1f)

    Box(
        modifier = modifier
            .shadow(
                elevation = if (highlight) 20.dp else 12.dp,
                shape = shape,
                ambientColor = Color.Black.copy(alpha = 0.5f),
                spotColor = if (highlight) IronRed.copy(alpha = 0.12f) else Color.Black.copy(alpha = 0.5f)
            )
            .clip(shape)
            .background(bgColor)
            .border(1.dp, borderColor, shape)
            .padding(padding)
    ) {
        content()
    }
}
