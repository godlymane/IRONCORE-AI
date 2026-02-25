package com.ironcore.fit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.GlassBorder
import com.ironcore.fit.ui.theme.GlassWhite

/**
 * Glass-morphism card matching the React GlassCard component.
 * Semi-transparent white background with subtle border.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier
            .clip(shape)
            .background(GlassWhite)
            .border(1.dp, GlassBorder, shape)
            .padding(16.dp)
    ) {
        content()
    }
}
