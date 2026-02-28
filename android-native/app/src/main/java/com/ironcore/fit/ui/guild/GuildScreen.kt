package com.ironcore.fit.ui.guild

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ironcore.fit.ui.components.GlassCard
import com.ironcore.fit.ui.theme.*

// ── Local state models (wired to Firestore later) ───────────────

private data class GuildUiState(
    val hasGuild: Boolean = false,
    val guildName: String = "",
    val memberCount: Int = 0,
    val guildXP: Long = 0,
    val members: List<GuildMember> = emptyList(),
    val bossName: String = "Iron Titan",
    val bossCurrentHP: Long = 45_000,
    val bossTotalHP: Long = 100_000,
    val bossStatus: String = "active"
)

private data class GuildMember(
    val name: String,
    val xp: Long,
    val role: String // "owner" | "member"
)

@Composable
fun GuildScreen(navController: NavHostController? = null) {
    // Sample state -- will be replaced by ViewModel + Firestore
    val uiState = remember {
        GuildUiState(
            hasGuild = true,
            guildName = "Iron Legion",
            memberCount = 12,
            guildXP = 28_500,
            members = listOf(
                GuildMember("Commander Rex", 8200, "owner"),
                GuildMember("SpartanFit", 5100, "member"),
                GuildMember("IronWolf", 4800, "member"),
                GuildMember("BlazeRunner", 3900, "member"),
                GuildMember("NovaPush", 3400, "member"),
                GuildMember("TitanGrip", 3100, "member")
            )
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ── Header ──────────────────────────────────────────
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "GUILD",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
        }

        if (uiState.hasGuild) {
            // ── Guild Info Card ──────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Shield,
                                contentDescription = null,
                                tint = IronPurple,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = uiState.guildName,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = IronTextPrimary
                                )
                                Text(
                                    text = "${uiState.memberCount} members",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = IronTextTertiary
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            GuildStatItem("Guild XP", "${uiState.guildXP}", IronPurple)
                            GuildStatItem("Members", "${uiState.memberCount}", IronBlue)
                            GuildStatItem("Rank", "#3", IronYellow)
                        }
                    }
                }
            }

            // ── Members List ────────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text(
                            text = "MEMBERS",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = IronPurple,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        uiState.members.forEachIndexed { index, member ->
                            MemberRow(rank = index + 1, member = member)
                            if (index < uiState.members.lastIndex) {
                                HorizontalDivider(
                                    color = GlassWhite,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // ── No Guild State ──────────────────────────────
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Groups,
                            contentDescription = null,
                            tint = IronTextTertiary,
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "You're not in a guild yet",
                            style = MaterialTheme.typography.bodyLarge,
                            color = IronTextSecondary,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Join a team to compete in guild wars and boss fights",
                            style = MaterialTheme.typography.bodyMedium,
                            color = IronTextTertiary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(
                                onClick = { /* TODO: create guild flow */ },
                                colors = ButtonDefaults.buttonColors(containerColor = IronRed)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("CREATE GUILD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            }
                            OutlinedButton(
                                onClick = { /* TODO: join guild flow */ },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = IronTextPrimary)
                            ) {
                                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("JOIN GUILD", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            }
                        }
                    }
                }
            }
        }

        // ── Community Boss Section ──────────────────────────
        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "COMMUNITY BOSS",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = IronRed,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Boss icon
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(IronRedDark),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("\uD83D\uDC79", fontSize = 24.sp) // ogre
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = uiState.bossName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = IronTextPrimary
                            )
                            Text(
                                text = uiState.bossStatus.uppercase(),
                                style = MaterialTheme.typography.bodySmall,
                                color = if (uiState.bossStatus == "active") IronGreen else IronTextTertiary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // HP Bar
                    val hpProgress = (uiState.bossCurrentHP.toFloat() / uiState.bossTotalHP.toFloat())
                        .coerceIn(0f, 1f)
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "HP",
                                style = MaterialTheme.typography.labelSmall,
                                color = IronTextTertiary
                            )
                            Text(
                                text = "${formatNumber(uiState.bossCurrentHP)} / ${formatNumber(uiState.bossTotalHP)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = IronTextSecondary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { hpProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(10.dp),
                            color = when {
                                hpProgress > 0.5f -> IronRed
                                hpProgress > 0.2f -> IronOrange
                                else -> IronYellow
                            },
                            trackColor = GlassWhite
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { /* TODO: deal damage via Cloud Function */ },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = IronRed)
                    ) {
                        Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "DEAL DAMAGE",
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun GuildStatItem(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = IronTextTertiary
        )
    }
}

@Composable
private fun MemberRow(rank: Int, member: GuildMember) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "#$rank",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = IronTextTertiary,
            modifier = Modifier.width(32.dp)
        )

        // Avatar placeholder
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(IronSurfaceElevated),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = member.name.first().toString(),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.width(10.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = member.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = IronTextPrimary
                )
                if (member.role == "owner") {
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        Icons.Default.Star,
                        contentDescription = "Owner",
                        tint = IronYellow,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
            Text(
                text = "${member.xp} XP",
                style = MaterialTheme.typography.bodySmall,
                color = IronTextTertiary
            )
        }
    }
}

private fun formatNumber(n: Long): String = when {
    n >= 1_000_000 -> "${n / 1_000_000}M"
    n >= 1_000 -> "${n / 1_000}K"
    else -> n.toString()
}
