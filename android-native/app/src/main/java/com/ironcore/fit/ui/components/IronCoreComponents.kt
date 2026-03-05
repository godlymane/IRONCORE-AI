package com.ironcore.fit.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// GlassButton — gradient button matching React Button component
// ══════════════════════════════════════════════════════════════════

enum class ButtonVariant { PRIMARY, SECONDARY, GHOST, DANGER }

@Composable
fun GlassButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.PRIMARY,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    content: @Composable (RowScope.() -> Unit)? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = when {
            !enabled -> 1f
            isPressed -> 0.97f
            else -> 1f
        },
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "btnScale"
    )

    val shape = RoundedCornerShape(16.dp)

    val bgBrush = when (variant) {
        ButtonVariant.PRIMARY -> Brush.linearGradient(
            colors = listOf(
                IronRed.copy(alpha = 0.95f),
                IronRedDark.copy(alpha = 0.9f)
            )
        )
        ButtonVariant.SECONDARY -> Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.05f),
                Color.White.copy(alpha = 0.02f)
            )
        )
        ButtonVariant.GHOST -> Brush.linearGradient(
            colors = listOf(Color.Transparent, Color.Transparent)
        )
        ButtonVariant.DANGER -> Brush.linearGradient(
            colors = listOf(
                IronRedLight.copy(alpha = 0.15f),
                IronRedLight.copy(alpha = 0.08f)
            )
        )
    }

    val borderColor = when (variant) {
        ButtonVariant.PRIMARY -> Color.White.copy(alpha = 0.15f)
        ButtonVariant.SECONDARY -> IronRed.copy(alpha = 0.15f)
        ButtonVariant.GHOST -> Color.Transparent
        ButtonVariant.DANGER -> IronRedLight.copy(alpha = 0.3f)
    }

    val textColor = when (variant) {
        ButtonVariant.PRIMARY -> Color.White
        ButtonVariant.SECONDARY -> Color(0xFFE5E5E5)
        ButtonVariant.GHOST -> IronTextSecondary
        ButtonVariant.DANGER -> IronRedLight
    }

    Box(
        modifier = modifier
            .scale(scale)
            .then(
                if (variant == ButtonVariant.PRIMARY) {
                    Modifier.shadow(
                        elevation = 16.dp,
                        shape = shape,
                        ambientColor = IronRed.copy(alpha = 0.4f),
                        spotColor = IronRed.copy(alpha = 0.4f)
                    )
                } else Modifier
            )
            .clip(shape)
            .background(bgBrush)
            .then(
                if (variant != ButtonVariant.GHOST)
                    Modifier.border(1.dp, borderColor, shape)
                else Modifier
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled && !isLoading,
                onClick = onClick
            )
            .padding(horizontal = 20.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center
    ) {
        if (content != null) {
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                content()
            }
        } else {
            Text(
                text = text,
                color = if (enabled) textColor else textColor.copy(alpha = 0.5f),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                letterSpacing = 1.5.sp
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// GlassInput — gradient glass text input matching React GlassInput
// ══════════════════════════════════════════════════════════════════

@Composable
fun GlassInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    prefix: @Composable (() -> Unit)? = null,
    suffix: @Composable (() -> Unit)? = null,
    singleLine: Boolean = true,
    enabled: Boolean = true,
    isFocused: Boolean = false,
    textStyle: TextStyle = TextStyle(
        color = IronTextPrimary,
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium
    )
) {
    val shape = RoundedCornerShape(16.dp)

    val borderColor by animateColorAsState(
        targetValue = if (isFocused) IronRed.copy(alpha = 0.5f)
        else Color.White.copy(alpha = 0.1f),
        label = "inputBorder"
    )

    val bgBrush = Brush.linearGradient(
        colors = if (isFocused) listOf(
            Color.White.copy(alpha = 0.1f),
            Color.White.copy(alpha = 0.05f)
        ) else listOf(
            Color.White.copy(alpha = 0.05f),
            Color.White.copy(alpha = 0.02f)
        )
    )

    Box(
        modifier = modifier
            .clip(shape)
            .background(bgBrush)
            .border(1.dp, borderColor, shape)
            .padding(horizontal = 16.dp, vertical = 14.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (prefix != null) {
                prefix()
                Spacer(modifier = Modifier.width(8.dp))
            }

            Box(modifier = Modifier.weight(1f)) {
                if (value.isEmpty()) {
                    Text(
                        text = placeholder,
                        color = IronTextTertiary.copy(alpha = 0.5f),
                        style = textStyle
                    )
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    textStyle = textStyle,
                    singleLine = singleLine,
                    enabled = enabled,
                    cursorBrush = SolidColor(IronRed),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            if (suffix != null) {
                Spacer(modifier = Modifier.width(8.dp))
                suffix()
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// AnimatedPinDots — scale-animated PIN dots matching React
// ══════════════════════════════════════════════════════════════════

@Composable
fun AnimatedPinDots(
    pinLength: Int,
    filledCount: Int,
    modifier: Modifier = Modifier,
    dotSize: Dp = 14.dp,
    spacing: Dp = 16.dp
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(spacing),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(pinLength) { index ->
            val isFilled = index < filledCount

            val animScale by animateFloatAsState(
                targetValue = if (isFilled) 1f else 0.85f,
                animationSpec = if (isFilled) {
                    spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessMediumLow
                    )
                } else {
                    spring(stiffness = Spring.StiffnessMedium)
                },
                label = "dotScale$index"
            )

            val bgColor by animateColorAsState(
                targetValue = if (isFilled) IronRed else Color.Transparent,
                animationSpec = tween(150),
                label = "dotColor$index"
            )

            val borderColor by animateColorAsState(
                targetValue = if (isFilled) IronRed else Color(0xFF374151),
                animationSpec = tween(150),
                label = "dotBorder$index"
            )

            Box(
                modifier = Modifier
                    .size(dotSize)
                    .scale(animScale)
                    .clip(CircleShape)
                    .background(bgColor)
                    .border(2.dp, borderColor, CircleShape)
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// GlassNumberPad — glass-effect numeric keypad matching React
// ══════════════════════════════════════════════════════════════════

@Composable
fun GlassNumberPad(
    onDigit: (Int) -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val keys = listOf(
        listOf(1, 2, 3),
        listOf(4, 5, 6),
        listOf(7, 8, 9),
        listOf(-1, 0, -2) // -1 = empty, -2 = delete
    )

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        keys.forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                row.forEach { key ->
                    when (key) {
                        -1 -> Spacer(modifier = Modifier.size(72.dp))
                        -2 -> NumberPadKey(
                            modifier = Modifier.size(72.dp),
                            onClick = onDelete,
                            content = {
                                Icon(
                                    imageVector = Icons.Default.Backspace,
                                    contentDescription = "Delete",
                                    tint = IronTextPrimary,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        )
                        else -> NumberPadKey(
                            modifier = Modifier.size(72.dp),
                            onClick = { onDigit(key) },
                            content = {
                                Text(
                                    text = key.toString(),
                                    color = IronTextPrimary,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NumberPadKey(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val bgAlpha by animateFloatAsState(
        targetValue = if (isPressed) 0.1f else 0.05f,
        animationSpec = tween(100),
        label = "keyBg"
    )

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessHigh),
        label = "keyScale"
    )

    Box(
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = bgAlpha))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        content()
    }
}

// ══════════════════════════════════════════════════════════════════
// IconBox — matching React header icon box with gradient border
// ══════════════════════════════════════════════════════════════════

@Composable
fun GlassIconBox(
    modifier: Modifier = Modifier,
    size: Dp = 56.dp,
    content: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        IronRed.copy(alpha = 0.1f),
                        IronRed.copy(alpha = 0.05f)
                    )
                )
            )
            .border(1.dp, IronRed.copy(alpha = 0.3f), shape),
        contentAlignment = Alignment.Center
    ) {
        content()
    }
}
