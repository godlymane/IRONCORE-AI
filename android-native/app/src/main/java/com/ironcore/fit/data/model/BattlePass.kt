package com.ironcore.fit.data.model

import com.google.firebase.Timestamp

/**
 * Battle Pass season definition.
 *
 * Seasons are configured server-side. The native app reads
 * the current season and displays tier progression.
 *
 * Free rewards are available to all users; premium rewards
 * require a battle pass purchase ($4.99-$9.99/season).
 */
data class BattlePassSeason(
    val id: String = "",
    val seasonNumber: Int = 0,
    val startDate: Timestamp? = null,
    val endDate: Timestamp? = null,
    val tiers: List<BattlePassTier> = emptyList()
)

data class BattlePassTier(
    val tier: Int = 0,
    val xpRequired: Int = 0,
    val freeReward: String? = null,
    val premiumReward: String? = null
)
