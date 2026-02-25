package com.ironcore.fit.util

/**
 * XP → Level calculation matching React arenaService.js exactly.
 * Level N requires cumulative XP = 100 + 200 + 300 + ... + (N*100) = N*(N+1)*50
 */
object XpCalculator {

    /** XP gains per activity — mirrors React useFitnessData.js */
    const val XP_MEAL = 10L
    const val XP_WORKOUT = 50L
    const val XP_PROGRESS = 20L
    const val XP_BURNED = 15L
    const val XP_BATTLE_WIN = 100L

    fun calculateLevel(xp: Long): Int {
        var level = 0
        var cumulative = 0L
        while (cumulative + (level + 1) * 100 <= xp) {
            level++
            cumulative += level * 100L
        }
        return maxOf(1, level)
    }

    fun getLevelProgress(xp: Long): LevelProgress {
        val level = calculateLevel(xp)
        val cumulativeForLevel = (1..level).sumOf { it * 100L }
        val xpForNextLevel = (level + 1) * 100L
        val xpInCurrentLevel = xp - cumulativeForLevel
        val progress = if (xpForNextLevel > 0) {
            (xpInCurrentLevel.toFloat() / xpForNextLevel).coerceIn(0f, 1f)
        } else 0f

        return LevelProgress(
            level = level,
            currentXpInLevel = xpInCurrentLevel,
            xpNeededForNext = xpForNextLevel,
            progress = progress
        )
    }

    /** Map XP to league name — matches React tier thresholds */
    fun getLeague(xp: Long): String = when {
        xp < 500 -> "Iron Novice"
        xp < 1500 -> "Iron"
        xp < 3000 -> "Bronze"
        xp < 6000 -> "Silver"
        xp < 10000 -> "Gold"
        xp < 20000 -> "Platinum"
        else -> "Diamond"
    }
}

data class LevelProgress(
    val level: Int,
    val currentXpInLevel: Long,
    val xpNeededForNext: Long,
    val progress: Float
)
