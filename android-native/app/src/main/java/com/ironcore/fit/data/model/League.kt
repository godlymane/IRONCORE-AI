package com.ironcore.fit.data.model

/**
 * League tiers for the gamification system.
 *
 * Users progress from Iron to Diamond based on accumulated
 * league points. Colors are ARGB hex values for direct use
 * in Jetpack Compose (e.g. Color(league.color)).
 */
enum class League(val displayName: String, val minPoints: Int, val color: Long) {
    IRON("Iron", 0, 0xFF737373),
    BRONZE("Bronze", 500, 0xFFCD7F32),
    SILVER("Silver", 1500, 0xFFC0C0C0),
    GOLD("Gold", 3000, 0xFFFFD700),
    PLATINUM("Platinum", 5000, 0xFFE5E4E2),
    DIAMOND("Diamond", 10000, 0xFFB9F2FF);

    companion object {
        fun fromString(value: String): League {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: IRON
        }

        fun fromPoints(points: Int): League {
            return entries.sortedByDescending { it.minPoints }
                .find { points >= it.minPoints } ?: IRON
        }
    }
}
