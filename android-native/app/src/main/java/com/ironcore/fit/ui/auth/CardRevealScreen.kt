package com.ironcore.fit.ui.auth

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.components.*
import com.ironcore.fit.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Card reveal screen shown after account creation.
 *
 * Matches React PlayerCardView.jsx:
 * - Card flip animation (rotateY 90→0, 0.6s easeOut)
 * - Holographic shimmer overlay (LiquidShimmer, 4s)
 * - Staggered word cell entrance (delay 0.6s + index*80ms)
 * - Warning box with glass styling
 * - Proper Oswald/Inter/JetBrainsMono typography
 */
@Composable
fun CardRevealScreen(
    username: String,
    recoveryPhrase: String,
    hasSavedPhrase: Boolean,
    onSavedPhraseChanged: (Boolean) -> Unit,
    onContinue: () -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    val words = recoveryPhrase.split(" ")

    val qrBitmap = remember(recoveryPhrase) {
        generateQrBitmap(recoveryPhrase, 512)
    }

    // ── Card flip: rotateY 90→0 (0.6s easeOut) ────────────────────
    val cardRotation = remember { Animatable(90f) }
    LaunchedEffect(Unit) {
        cardRotation.animateTo(
            targetValue = 0f,
            animationSpec = tween(600, easing = FastOutSlowInEasing)
        )
    }

    // ── Header fade-in ─────────────────────────────────────────────
    val headerAlpha = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        headerAlpha.animateTo(1f, animationSpec = tween(400, easing = FastOutSlowInEasing))
    }

    // ── Staggered word cells: progress 0→words.size after flip ─────
    val staggerProgress = remember { Animatable(0f) }
    LaunchedEffect(words.size) {
        delay(650) // Start after card flip completes
        staggerProgress.animateTo(
            targetValue = words.size.toFloat(),
            animationSpec = tween(words.size * 80, easing = LinearEasing)
        )
    }

    // ── Bottom section fade-in (after words finish) ────────────────
    val bottomAlpha = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(650L + words.size * 80L + 200L)
        bottomAlpha.animateTo(1f, animationSpec = tween(400))
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // ── Header ─────────────────────────────────────────────────
        Text(
            text = "ACCOUNT CREATED",
            fontFamily = OswaldFontFamily,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = IronRed,
            letterSpacing = 3.sp,
            modifier = Modifier.graphicsLayer { alpha = headerAlpha.value }
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "@$username",
            fontFamily = InterFontFamily,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = IronTextPrimary,
            modifier = Modifier.graphicsLayer { alpha = headerAlpha.value }
        )

        Spacer(modifier = Modifier.height(24.dp))

        // ── QR Code Card — flip + holographic shimmer ──────────────
        if (qrBitmap != null) {
            Box(
                modifier = Modifier.graphicsLayer {
                    rotationY = cardRotation.value
                    cameraDistance = 12f * density
                }
            ) {
                GlassCard(
                    cornerRadius = 16.dp,
                    padding = 12.dp
                ) {
                    Box {
                        Box(
                            modifier = Modifier
                                .size(200.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(androidx.compose.ui.graphics.Color.White)
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Image(
                                bitmap = qrBitmap.asImageBitmap(),
                                contentDescription = "Recovery QR Code",
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                        // Holographic shimmer overlay
                        LiquidShimmer(
                            modifier = Modifier
                                .matchParentSize()
                                .clip(RoundedCornerShape(8.dp)),
                            durationMillis = 4000,
                            shimmerColor = IronRed.copy(alpha = 0.12f),
                            edgeColor = IronRed.copy(alpha = 0.04f)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Scan this QR code to recover your account",
            fontFamily = InterFontFamily,
            fontSize = 12.sp,
            color = IronTextTertiary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "RECOVERY PHRASE",
            fontFamily = OswaldFontFamily,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = IronYellow,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(12.dp))

        // ── 12-word grid — staggered entrance ──────────────────────
        GlassCard(
            cornerRadius = 12.dp,
            padding = 12.dp,
            highlight = true,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                words.chunked(3).forEachIndexed { rowIndex, rowWords ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        rowWords.forEachIndexed { colIndex, word ->
                            val globalIndex = rowIndex * 3 + colIndex
                            val wordAlpha = (staggerProgress.value - globalIndex)
                                .coerceIn(0f, 1f)

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .graphicsLayer {
                                        alpha = wordAlpha
                                        translationY = (1f - wordAlpha) * 16f
                                    }
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(IronSurfaceElevated)
                                    .border(
                                        1.dp,
                                        GlassBorderSubtle,
                                        RoundedCornerShape(8.dp)
                                    )
                                    .padding(horizontal = 8.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${globalIndex + 1}. $word",
                                    fontFamily = JetBrainsMonoFontFamily,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = IronTextPrimary,
                                    textAlign = TextAlign.Center,
                                    maxLines = 1
                                )
                            }
                        }
                        // Fill empty slots in last row
                        repeat(3 - rowWords.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Copy button ────────────────────────────────────────────
        Box(modifier = Modifier.graphicsLayer { alpha = bottomAlpha.value }) {
            GlassButton(
                text = if (copied) "COPIED!" else "COPY RECOVERY PHRASE",
                onClick = {
                    clipboardManager.setText(AnnotatedString(recoveryPhrase))
                    copied = true
                },
                variant = ButtonVariant.SECONDARY,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.ContentCopy,
                    contentDescription = null,
                    tint = if (copied) IronGreen else IronTextSecondary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (copied) "COPIED!" else "COPY RECOVERY PHRASE",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    fontSize = 13.sp,
                    color = if (copied) IronGreen else IronTextSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ── Warning box ────────────────────────────────────────────
        Box(modifier = Modifier.graphicsLayer { alpha = bottomAlpha.value }) {
            GlassCard(
                cornerRadius = 12.dp,
                padding = 12.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        tint = IronYellow,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "SAVE THIS PHRASE",
                            fontFamily = OswaldFontFamily,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = IronYellow,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "This is the only way to recover your account. " +
                                    "Save it somewhere safe and never share it with anyone.",
                            fontFamily = InterFontFamily,
                            fontSize = 12.sp,
                            color = IronTextSecondary,
                            lineHeight = 18.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // ── Confirmation checkbox ──────────────────────────────────
        Box(modifier = Modifier.graphicsLayer { alpha = bottomAlpha.value }) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = hasSavedPhrase,
                    onCheckedChange = onSavedPhraseChanged,
                    colors = CheckboxDefaults.colors(
                        checkedColor = IronRed,
                        uncheckedColor = IronCardBorder,
                        checkmarkColor = IronTextPrimary
                    )
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "I've saved my recovery phrase",
                    fontFamily = InterFontFamily,
                    fontSize = 14.sp,
                    color = IronTextPrimary
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Box(modifier = Modifier.graphicsLayer { alpha = bottomAlpha.value }) {
            GlassButton(
                text = "CONTINUE",
                onClick = onContinue,
                variant = ButtonVariant.PRIMARY,
                enabled = hasSavedPhrase,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * Generate a QR-code bitmap from text using ZXing.
 */
private fun generateQrBitmap(text: String, size: Int): Bitmap? {
    return try {
        val writer = com.google.zxing.qrcode.QRCodeWriter()
        val bitMatrix = writer.encode(
            text, com.google.zxing.BarcodeFormat.QR_CODE, size, size
        )
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(
                    x, y,
                    if (bitMatrix[x, y]) AndroidColor.BLACK else AndroidColor.WHITE
                )
            }
        }
        bitmap
    } catch (_: Exception) {
        null
    }
}
