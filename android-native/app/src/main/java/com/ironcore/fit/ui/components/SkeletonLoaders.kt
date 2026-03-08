package com.ironcore.fit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Skeleton Loaders — Per-screen shimmer placeholders
// Matches React ViewSkeletons.jsx: Dashboard, Workout, Chronicle,
// Cardio, Arena, Profile, Coach
// ══════════════════════════════════════════════════════════════════

/** Reusable skeleton bar with shimmer */
@Composable
fun SkeletonBar(
    modifier: Modifier = Modifier,
    widthFraction: Float = 1f,
    height: Int = 16
) {
    Box(
        modifier = modifier
            .fillMaxWidth(widthFraction)
            .height(height.dp)
            .clip(RoundedCornerShape(8.dp))
    ) {
        SkeletonShimmer(modifier = Modifier.fillMaxSize())
    }
}

/** Reusable skeleton circle (avatars, rings) */
@Composable
fun SkeletonCircle(
    modifier: Modifier = Modifier,
    size: Int = 48
) {
    Box(
        modifier = modifier
            .size(size.dp)
            .clip(CircleShape)
    ) {
        SkeletonShimmer(modifier = Modifier.fillMaxSize())
    }
}

/** Reusable skeleton box (cards, images) */
@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    height: Int = 100,
    cornerRadius: Int = 16
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height.dp)
            .clip(RoundedCornerShape(cornerRadius.dp))
    ) {
        SkeletonShimmer(modifier = Modifier.fillMaxSize())
    }
}

// ── Dashboard Skeleton ─────────────────────────────────────────

@Composable
fun DashboardSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                SkeletonBar(widthFraction = 0.4f, height = 14)
                SkeletonBar(widthFraction = 0.25f, height = 20)
            }
            SkeletonCircle(size = 44)
        }

        // Stats ring placeholder
        GlassCard(tier = GlassTier.STANDARD) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                SkeletonCircle(size = 140)
            }
        }

        // Quick action buttons row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            repeat(3) {
                GlassCard(
                    tier = GlassTier.STANDARD,
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        SkeletonCircle(size = 36)
                        SkeletonBar(widthFraction = 0.8f, height = 10)
                    }
                }
            }
        }

        // AI input placeholder
        GlassCard(tier = GlassTier.STANDARD) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SkeletonCircle(size = 32)
                SkeletonBar(widthFraction = 0.7f, height = 14)
            }
        }

        // Recent activity cards
        repeat(2) {
            GlassCard(tier = GlassTier.STANDARD) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    SkeletonBar(widthFraction = 0.5f, height = 14)
                    SkeletonBar(widthFraction = 0.9f, height = 10)
                    SkeletonBar(widthFraction = 0.7f, height = 10)
                }
            }
        }
    }
}

// ── Workout Skeleton ───────────────────────────────────────────

@Composable
fun WorkoutSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Header
        SkeletonBar(widthFraction = 0.35f, height = 22)
        SkeletonBar(widthFraction = 0.55f, height = 12)

        Spacer(modifier = Modifier.height(8.dp))

        // Exercise cards
        repeat(4) {
            GlassCard(tier = GlassTier.STANDARD) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonBox(
                        modifier = Modifier.size(56.dp),
                        height = 56,
                        cornerRadius = 12
                    )
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonBar(widthFraction = 0.6f, height = 14)
                        SkeletonBar(widthFraction = 0.4f, height = 10)
                    }
                    SkeletonCircle(size = 28)
                }
            }
        }
    }
}

// ── Chronicle (Nutrition) Skeleton ─────────────────────────────

@Composable
fun ChronicleSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Date scroll row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(7) {
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    SkeletonBar(widthFraction = 0.8f, height = 10)
                    SkeletonCircle(size = 36)
                }
            }
        }

        // Macro chart
        GlassCard(tier = GlassTier.STANDARD) {
            SkeletonBox(
                modifier = Modifier.padding(16.dp),
                height = 120,
                cornerRadius = 12
            )
        }

        // Meal list
        repeat(3) {
            GlassCard(tier = GlassTier.STANDARD) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonCircle(size = 40)
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonBar(widthFraction = 0.5f, height = 14)
                        SkeletonBar(widthFraction = 0.35f, height = 10)
                    }
                    SkeletonBar(
                        modifier = Modifier.width(50.dp),
                        widthFraction = 1f,
                        height = 12
                    )
                }
            }
        }
    }
}

// ── Arena Skeleton ─────────────────────────────────────────────

@Composable
fun ArenaSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header
        SkeletonBar(widthFraction = 0.3f, height = 22)

        // Battle card
        GlassCard(tier = GlassTier.LIQUID) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonCircle(size = 56)
                        SkeletonBar(widthFraction = 0.3f, height = 10)
                    }
                    SkeletonBar(
                        modifier = Modifier.width(40.dp),
                        widthFraction = 1f,
                        height = 24
                    )
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonCircle(size = 56)
                        SkeletonBar(widthFraction = 0.3f, height = 10)
                    }
                }
                SkeletonBox(height = 44, cornerRadius = 22)
            }
        }

        // Leaderboard list
        repeat(5) {
            GlassCard(tier = GlassTier.STANDARD) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SkeletonBar(
                        modifier = Modifier.width(24.dp),
                        widthFraction = 1f,
                        height = 14
                    )
                    SkeletonCircle(size = 36)
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        SkeletonBar(widthFraction = 0.5f, height = 12)
                        SkeletonBar(widthFraction = 0.3f, height = 10)
                    }
                    SkeletonBar(
                        modifier = Modifier.width(48.dp),
                        widthFraction = 1f,
                        height = 14
                    )
                }
            }
        }
    }
}

// ── Profile Skeleton ───────────────────────────────────────────

@Composable
fun ProfileSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Level card
        GlassCard(tier = GlassTier.LIQUID) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SkeletonCircle(size = 80)
                SkeletonBar(widthFraction = 0.4f, height = 18)
                SkeletonBar(widthFraction = 0.25f, height = 12)
                SkeletonBox(height = 8, cornerRadius = 4)
            }
        }

        // Stats grid (2x2)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            repeat(2) {
                GlassCard(
                    tier = GlassTier.STANDARD,
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonBar(widthFraction = 0.6f, height = 10)
                        SkeletonBar(widthFraction = 0.4f, height = 20)
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            repeat(2) {
                GlassCard(
                    tier = GlassTier.STANDARD,
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonBar(widthFraction = 0.6f, height = 10)
                        SkeletonBar(widthFraction = 0.4f, height = 20)
                    }
                }
            }
        }

        // Tab row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(3) {
                SkeletonBar(
                    modifier = Modifier.weight(1f),
                    widthFraction = 1f,
                    height = 36
                )
            }
        }
    }
}

// ── Coach / AI Lab Skeleton ────────────────────────────────────

@Composable
fun CoachSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header
        SkeletonBar(widthFraction = 0.3f, height = 22)

        // Tool cards (2-column grid)
        repeat(3) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                repeat(2) {
                    GlassCard(
                        tier = GlassTier.STANDARD,
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            SkeletonCircle(size = 36)
                            SkeletonBar(widthFraction = 0.7f, height = 14)
                            SkeletonBar(widthFraction = 0.9f, height = 10)
                            SkeletonBar(widthFraction = 0.5f, height = 10)
                        }
                    }
                }
            }
        }
    }
}

// ── Progress Skeleton ──────────────────────────────────────────

@Composable
fun ProgressSkeleton(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        SkeletonBar(widthFraction = 0.35f, height = 22)

        // Week summary
        GlassCard(tier = GlassTier.STANDARD) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                repeat(4) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        SkeletonBar(
                            modifier = Modifier.width(40.dp),
                            widthFraction = 1f,
                            height = 20
                        )
                        SkeletonBar(
                            modifier = Modifier.width(32.dp),
                            widthFraction = 1f,
                            height = 10
                        )
                    }
                }
            }
        }

        // Chart placeholder
        GlassCard(tier = GlassTier.STANDARD) {
            SkeletonBox(
                modifier = Modifier.padding(16.dp),
                height = 160,
                cornerRadius = 12
            )
        }

        // Streak calendar
        GlassCard(tier = GlassTier.STANDARD) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SkeletonBar(widthFraction = 0.3f, height = 14)
                SkeletonBox(height = 80, cornerRadius = 8)
            }
        }
    }
}
