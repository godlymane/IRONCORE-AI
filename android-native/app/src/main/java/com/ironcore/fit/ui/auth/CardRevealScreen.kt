package com.ironcore.fit.ui.auth

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.components.*
import com.ironcore.fit.ui.theme.*

/**
 * Card reveal screen shown after account creation.
 * Glass morphism styling matching React Capacitor app.
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "ACCOUNT CREATED",
            fontSize = 24.sp,
            fontWeight = FontWeight.Black,
            color = IronRed,
            letterSpacing = 3.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "@$username",
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = IronTextPrimary
        )

        Spacer(modifier = Modifier.height(24.dp))

        // ── QR Code in glass card ──────────────────────────────
        if (qrBitmap != null) {
            GlassCard(
                cornerRadius = 16.dp,
                padding = 12.dp
            ) {
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
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Scan this QR code to recover your account",
            fontSize = 12.sp,
            color = IronTextTertiary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "RECOVERY PHRASE",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = IronYellow,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(12.dp))

        // ── 12-word grid in glass card ────────────────────────
        GlassCard(
            cornerRadius = 12.dp,
            padding = 12.dp,
            highlight = true,
            modifier = Modifier.fillMaxWidth()
        ) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.height(160.dp),
                userScrollEnabled = false
            ) {
                itemsIndexed(words) { index, word ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(IronSurfaceElevated)
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${index + 1}. $word",
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            color = IronTextPrimary,
                            textAlign = TextAlign.Center,
                            maxLines = 1
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // ── Copy button ──────────────────────────────────────
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
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                fontSize = 13.sp,
                color = if (copied) IronGreen else IronTextSecondary
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Save this phrase to recover your account.\nDo not share it with anyone.",
            fontSize = 12.sp,
            color = IronTextTertiary,
            textAlign = TextAlign.Center,
            lineHeight = 18.sp
        )

        Spacer(modifier = Modifier.height(24.dp))

        // ── Confirmation checkbox ────────────────────────────
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
                fontSize = 14.sp,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        GlassButton(
            text = "CONTINUE",
            onClick = onContinue,
            variant = ButtonVariant.PRIMARY,
            enabled = hasSavedPhrase,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}

/**
 * Generate a QR-code bitmap from text using ZXing.
 */
private fun generateQrBitmap(text: String, size: Int): Bitmap? {
    return try {
        val writer = com.google.zxing.qrcode.QRCodeWriter()
        val bitMatrix = writer.encode(text, com.google.zxing.BarcodeFormat.QR_CODE, size, size)
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) AndroidColor.BLACK else AndroidColor.WHITE)
            }
        }
        bitmap
    } catch (_: Exception) {
        null
    }
}
