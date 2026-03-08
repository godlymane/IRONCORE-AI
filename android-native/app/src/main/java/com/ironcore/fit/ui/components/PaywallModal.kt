package com.ironcore.fit.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Paywall Modal — Premium upsell bottom sheet
// Matches React PaywallModal.jsx:
// - Bottom sheet with spring animation
// - 3-tier comparison: Free / Pro / Elite
// - Monthly/Yearly billing toggle (Save 50%)
// - 11-feature comparison grid
// - Success overlay on purchase
// ══════════════════════════════════════════════════════════════════

// Feature comparison data
data class FeatureRow(
    val label: String,
    val free: String,   // "true", "false", or a number/text
    val pro: String,
    val elite: String
)

private val FEATURES = listOf(
    FeatureRow("AI Coach Calls", "3/day", "Unlimited", "Unlimited"),
    FeatureRow("Progress Photos", "false", "true", "true"),
    FeatureRow("Workout History", "30 days", "Unlimited", "Unlimited"),
    FeatureRow("Arena Battles", "3/week", "Unlimited", "Unlimited"),
    FeatureRow("Advanced Stats", "false", "true", "true"),
    FeatureRow("Guild Creation", "false", "true", "true"),
    FeatureRow("Guild Wars", "false", "false", "true"),
    FeatureRow("Battle Pass Premium", "false", "true", "true"),
    FeatureRow("AI Form Correction", "Basic", "Full", "Full + History"),
    FeatureRow("Priority AI", "false", "false", "true"),
    FeatureRow("Custom Programs", "false", "true", "true"),
)

data class PlanInfo(
    val id: String,
    val tier: String,
    val name: String,
    val icon: ImageVector,
    val iconTint: Color,
    val monthlyPrice: String,
    val yearlyPrice: String,
    val borderColor: Color,
    val bgColor: Color,
)

@Composable
fun PaywallModal(
    visible: Boolean,
    featureLabel: String? = null,
    minTier: String = "pro", // "pro" or "elite"
    currentTier: String = "free",
    onPurchase: (planId: String) -> Unit = {},
    onDismiss: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var billingPeriod by remember { mutableStateOf("monthly") }
    var purchasing by remember { mutableStateOf(false) }
    var successPlan by remember { mutableStateOf<String?>(null) }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(200)),
        exit = fadeOut(tween(200))
    ) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.7f))
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() }
                ) { onDismiss() },
            contentAlignment = Alignment.BottomCenter
        ) {
            // Success overlay
            AnimatedVisibility(
                visible = successPlan != null,
                enter = scaleIn(spring(Spring.DampingRatioMediumBouncy)) + fadeIn(),
                exit = scaleOut() + fadeOut()
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        val rotationAnim by animateFloatAsState(
                            targetValue = if (successPlan != null) 360f else 0f,
                            animationSpec = tween(600),
                            label = "successRotation"
                        )
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .rotate(rotationAnim)
                                .background(
                                    Color(0xFF059669).copy(alpha = 0.2f),
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = Color(0xFF34D399),
                                modifier = Modifier.size(40.dp)
                            )
                        }
                        Text(
                            text = "Welcome to ${if (successPlan?.startsWith("elite") == true) "Elite" else "Pro"}!",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp
                        )
                    }
                }
            }

            // Bottom sheet
            AnimatedVisibility(
                visible = successPlan == null,
                enter = slideInVertically(
                    initialOffsetY = { it },
                    animationSpec = spring(dampingRatio = 0.8f, stiffness = 300f)
                ),
                exit = slideOutVertically(targetOffsetY = { it })
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.9f)
                        .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                        .background(Color(0xFF0A0A0A))
                        .border(
                            width = 1.dp,
                            color = GlassBorderSubtle,
                            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                        )
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() }
                        ) { /* Consume clicks */ }
                        .verticalScroll(rememberScrollState())
                ) {
                    // Drag handle
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp, bottom = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .width(40.dp)
                                .height(4.dp)
                                .background(
                                    GlassWhite20,
                                    RoundedCornerShape(2.dp)
                                )
                        )
                    }

                    // Close button
                    Box(modifier = Modifier.fillMaxWidth()) {
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(end = 8.dp)
                                .size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Close",
                                tint = IronTextTertiary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 0.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Header
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = IronRedLight,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "UNLOCK FULL POWER",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            letterSpacing = 2.sp
                        )
                        if (featureLabel != null) {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = buildString {
                                    append(featureLabel)
                                    append(" requires ")
                                    append(if (minTier == "elite") "Elite" else "Pro")
                                },
                                color = IronTextTertiary,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        // Billing toggle
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            BillingToggleButton(
                                label = "MONTHLY",
                                selected = billingPeriod == "monthly",
                                onClick = { billingPeriod = "monthly" }
                            )
                            Box {
                                BillingToggleButton(
                                    label = "YEARLY",
                                    selected = billingPeriod == "yearly",
                                    onClick = { billingPeriod = "yearly" }
                                )
                                // Save 50% badge
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .offset(x = 8.dp, y = (-8).dp)
                                        .background(
                                            Color(0xFF059669),
                                            RoundedCornerShape(4.dp)
                                        )
                                        .padding(horizontal = 4.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "SAVE 50%",
                                        color = Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 7.sp
                                    )
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        // Plan cards — 3 columns
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Free
                            PlanCard(
                                name = "Free",
                                icon = Icons.Default.Shield,
                                iconTint = IronTextTertiary,
                                priceLabel = "Free",
                                ctaLabel = "Current Plan",
                                enabled = false,
                                recommended = false,
                                borderColor = GlassBorderSubtle,
                                bgBrush = Brush.verticalGradient(
                                    listOf(GlassWhite03, Color.Transparent)
                                ),
                                onClick = {},
                                modifier = Modifier.weight(1f)
                            )
                            // Pro
                            PlanCard(
                                name = "Pro",
                                icon = Icons.Default.Bolt,
                                iconTint = IronRedLight,
                                priceLabel = if (billingPeriod == "yearly") "₹6,999/yr" else "₹999/mo",
                                ctaLabel = if (currentTier == "pro" || currentTier == "elite") "Current Plan" else "Upgrade to Pro",
                                enabled = currentTier != "pro" && currentTier != "elite" && !purchasing,
                                recommended = minTier == "pro",
                                borderColor = IronRed.copy(alpha = 0.3f),
                                bgBrush = Brush.verticalGradient(
                                    listOf(IronRed.copy(alpha = 0.04f), Color.Transparent)
                                ),
                                onClick = {
                                    purchasing = true
                                    val planId = if (billingPeriod == "yearly") "pro_yearly" else "pro_monthly"
                                    onPurchase(planId)
                                    successPlan = planId
                                },
                                modifier = Modifier.weight(1f)
                            )
                            // Elite
                            PlanCard(
                                name = "Elite",
                                icon = Icons.Default.WorkspacePremium,
                                iconTint = IronAmberGold,
                                priceLabel = if (billingPeriod == "yearly") "₹9,999/yr" else "₹1,499/mo",
                                ctaLabel = if (currentTier == "elite") "Current Plan" else "7-Day Free Trial",
                                enabled = currentTier != "elite" && !purchasing,
                                recommended = minTier == "elite",
                                borderColor = IronAmberGold.copy(alpha = 0.3f),
                                bgBrush = Brush.verticalGradient(
                                    listOf(IronAmberGold.copy(alpha = 0.04f), Color.Transparent)
                                ),
                                onClick = {
                                    purchasing = true
                                    val planId = if (billingPeriod == "yearly") "elite_yearly" else "elite_monthly"
                                    onPurchase(planId)
                                    successPlan = planId
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        // Feature comparison table
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, GlassBorderSubtle, RoundedCornerShape(12.dp))
                                .clip(RoundedCornerShape(12.dp))
                        ) {
                            // Header row
                            FeatureTableHeader()
                            // Feature rows
                            FEATURES.forEach { feature ->
                                FeatureTableRow(feature)
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        // Stay free button
                        TextButton(
                            onClick = onDismiss,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "Stay Free",
                                color = IronTextTertiary.copy(alpha = 0.5f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Spacer(Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun BillingToggleButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) IronRed else GlassWhite05)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 6.dp)
    ) {
        Text(
            text = label,
            color = if (selected) Color.White else IronTextTertiary,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            letterSpacing = 1.sp
        )
    }
}

@Composable
private fun PlanCard(
    name: String,
    icon: ImageVector,
    iconTint: Color,
    priceLabel: String,
    ctaLabel: String,
    enabled: Boolean,
    recommended: Boolean,
    borderColor: Color,
    bgBrush: Brush,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, borderColor, RoundedCornerShape(12.dp))
                .clip(RoundedCornerShape(12.dp))
                .background(bgBrush)
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(22.dp)
            )
            Text(
                text = name.uppercase(),
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 11.sp
            )
            Text(
                text = priceLabel,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        brush = if (!enabled) Brush.horizontalGradient(
                            listOf(GlassWhite05, GlassWhite05)
                        )
                        else if (name == "Elite") Brush.horizontalGradient(
                            listOf(Color(0xFFCA8A04), IronAmberGold)
                        )
                        else Brush.horizontalGradient(
                            listOf(IronRed, IronRedLight)
                        )
                    )
                    .clickable(enabled = enabled, onClick = onClick)
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = ctaLabel.uppercase(),
                    color = if (enabled) Color.White else IronTextTertiary.copy(alpha = 0.5f),
                    fontWeight = FontWeight.Bold,
                    fontSize = 8.sp,
                    letterSpacing = 0.5.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Recommended badge
        if (recommended) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .offset(y = (-10).dp)
                    .background(IronRed, RoundedCornerShape(4.dp))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "RECOMMENDED",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 7.sp,
                    letterSpacing = 0.5.sp
                )
            }
        }
    }
}

@Composable
private fun FeatureTableHeader() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(GlassWhite03)
            .border(width = 0.dp, color = Color.Transparent)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = "FEATURE",
            color = IronTextTertiary.copy(alpha = 0.5f),
            fontWeight = FontWeight.Bold,
            fontSize = 9.sp,
            modifier = Modifier.weight(1.3f)
        )
        Text(
            text = "FREE",
            color = IronTextTertiary,
            fontWeight = FontWeight.Bold,
            fontSize = 9.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(0.9f)
        )
        Text(
            text = "PRO",
            color = IronRedLight,
            fontWeight = FontWeight.Bold,
            fontSize = 9.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(0.9f)
        )
        Text(
            text = "ELITE",
            color = IronAmberGold,
            fontWeight = FontWeight.Bold,
            fontSize = 9.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(0.9f)
        )
    }
}

@Composable
private fun FeatureTableRow(feature: FeatureRow) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = feature.label,
            color = IronTextSecondary,
            fontSize = 10.sp,
            modifier = Modifier.weight(1.3f)
        )
        FeatureCell(feature.free, Modifier.weight(0.9f))
        FeatureCell(feature.pro, Modifier.weight(0.9f))
        FeatureCell(feature.elite, Modifier.weight(0.9f))
    }
}

@Composable
private fun FeatureCell(value: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        when (value) {
            "true" -> Icon(
                Icons.Default.Check,
                contentDescription = "Yes",
                tint = Color(0xFF34D399),
                modifier = Modifier.size(12.dp)
            )
            "false" -> Icon(
                Icons.Default.Close,
                contentDescription = "No",
                tint = IronTextTertiary.copy(alpha = 0.3f),
                modifier = Modifier.size(12.dp)
            )
            else -> Text(
                text = value,
                color = IronTextSecondary,
                fontSize = 9.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
        }
    }
}
