package com.ironcore.fit.data.model

import com.google.firebase.Timestamp

/**
 * User achievement / badge.
 *
 * Achievements are defined in a global collection and unlocked
 * per-user. [unlockedAt] is null until the user earns it.
 *
 * Categories: "workout" | "streak" | "social" | "nutrition" | "milestone"
 */
data class Achievement(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val iconName: String = "",
    val category: String = "",            // "workout"|"streak"|"social"|"nutrition"|"milestone"
    val requirement: Int = 0,
    val xpReward: Int = 0,
    val unlockedAt: Timestamp? = null
)
