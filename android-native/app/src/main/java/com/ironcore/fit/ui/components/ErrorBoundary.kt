package com.ironcore.fit.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Error Boundaries — Graceful error screens per section
// Matches React StatusComponents.jsx: ErrorCard, EmptyState
// ══════════════════════════════════════════════════════════════════

/**
 * ErrorCard — reusable error display with retry button
 * Matches React ErrorCard: red-900/20 bg, AlertTriangle, "Hit a wall"
 */
@Composable
fun ErrorCard(
    message: String? = null,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    GlassCard(tier = GlassTier.STANDARD, modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = IronRedLight,
                modifier = Modifier.size(32.dp)
            )
            Text(
                text = "Hit a wall",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
            Text(
                text = message ?: "Something didn't load right. Give it another shot.",
                color = IronRedExtraLight.copy(alpha = 0.7f),
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                lineHeight = 18.sp
            )
            if (onRetry != null) {
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = IronRed,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Try Again",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

/**
 * EmptyState — friendly empty state with optional action
 * Matches React EmptyState component
 */
@Composable
fun EmptyState(
    icon: ImageVector? = null,
    title: String,
    description: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = IronTextTertiary,
                modifier = Modifier.size(48.dp)
            )
        }
        Text(
            text = title,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = description,
            color = IronTextTertiary,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp,
            modifier = Modifier.widthIn(max = 280.dp)
        )
        if (onAction != null && actionLabel != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(
                    containerColor = IronRed,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Text(
                    text = actionLabel,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
        }
    }
}

/**
 * Section error wrapper — wraps a section with error/loading/empty states
 */
@Composable
fun <T> SectionContent(
    data: T?,
    isLoading: Boolean,
    error: String? = null,
    onRetry: (() -> Unit)? = null,
    emptyCheck: ((T) -> Boolean)? = null,
    emptyTitle: String = "Nothing here yet",
    emptyDescription: String = "Check back later",
    emptyIcon: ImageVector? = null,
    skeleton: @Composable () -> Unit = {},
    content: @Composable (T) -> Unit
) {
    when {
        isLoading -> skeleton()
        error != null -> ErrorCard(message = error, onRetry = onRetry)
        data == null -> ErrorCard(onRetry = onRetry)
        emptyCheck?.invoke(data) == true -> EmptyState(
            icon = emptyIcon,
            title = emptyTitle,
            description = emptyDescription
        )
        else -> content(data)
    }
}
