/**
 * Achievement Badge System - 50+ Unlockable Badges
 * Categories: Consistency, Strength, Social, Milestones, Special
 */

export const ACHIEVEMENTS = [
    // === CONSISTENCY BADGES ===
    { id: 'first_workout', name: 'Iron Initiate', icon: '🏋️', description: 'Complete your first workout', xp: 50, category: 'milestone', rarity: 'common', criteria: { workoutsCompleted: 1 } },
    { id: 'streak_3', name: 'Momentum Builder', icon: '🔥', description: '3-day Forge', xp: 75, category: 'consistency', rarity: 'common', criteria: { forgeDays: 3 } },
    { id: 'streak_7', name: 'Week Warrior', icon: '⚡', description: '7-day Forge', xp: 150, category: 'consistency', rarity: 'uncommon', criteria: { forgeDays: 7 } },
    { id: 'streak_14', name: 'Fortnight Fighter', icon: '💪', description: '14-day Forge', xp: 300, category: 'consistency', rarity: 'rare', criteria: { forgeDays: 14 } },
    { id: 'streak_30', name: 'Iron Will', icon: '🌟', description: '30-day Forge', xp: 500, category: 'consistency', rarity: 'epic', criteria: { forgeDays: 30 } },
    { id: 'streak_100', name: 'Century Legend', icon: '👑', description: '100-day Forge', xp: 2000, category: 'consistency', rarity: 'legendary', criteria: { forgeDays: 100 } },
    { id: 'early_bird', name: 'Early Iron', icon: '🌅', description: 'Complete 10 workouts before 7am', xp: 200, category: 'consistency', rarity: 'rare', criteria: { earlyWorkouts: 10 } },
    { id: 'night_owl', name: 'Midnight Grinder', icon: '🦉', description: 'Complete 10 workouts after 9pm', xp: 200, category: 'consistency', rarity: 'rare', criteria: { lateWorkouts: 10 } },

    // === STRENGTH BADGES ===
    { id: 'first_pr', name: 'Personal Best', icon: '🏆', description: 'Set your first personal record', xp: 100, category: 'strength', rarity: 'common', criteria: { personalRecords: 1 } },
    { id: 'pr_hunter', name: 'PR Hunter', icon: '🎯', description: 'Set 10 personal records', xp: 300, category: 'strength', rarity: 'uncommon', criteria: { personalRecords: 10 } },
    { id: 'pr_master', name: 'PR Master', icon: '💎', description: 'Set 50 personal records', xp: 750, category: 'strength', rarity: 'epic', criteria: { personalRecords: 50 } },
    { id: 'volume_1k', name: 'Kilo Crusher', icon: '📊', description: 'Lift 1,000 lbs total volume in one workout', xp: 150, category: 'strength', rarity: 'uncommon', criteria: { singleWorkoutVolume: 1000 } },
    { id: 'volume_10k', name: 'Volume King', icon: '⚔️', description: 'Lift 10,000 lbs total volume in one workout', xp: 400, category: 'strength', rarity: 'rare', criteria: { singleWorkoutVolume: 10000 } },
    { id: 'plate_club_1', name: '1 Plate Club', icon: '🥉', description: 'Bench/Squat 135 lbs', xp: 200, category: 'strength', rarity: 'uncommon', criteria: { liftWeight: 135 } },
    { id: 'plate_club_2', name: '2 Plate Club', icon: '🥈', description: 'Bench/Squat 225 lbs', xp: 400, category: 'strength', rarity: 'rare', criteria: { liftWeight: 225 } },
    { id: 'plate_club_3', name: '3 Plate Club', icon: '🥇', description: 'Bench/Squat 315 lbs', xp: 750, category: 'strength', rarity: 'epic', criteria: { liftWeight: 315 } },
    { id: 'plate_club_4', name: '4 Plate Club', icon: '🏅', description: 'Bench/Squat 405 lbs', xp: 1500, category: 'strength', rarity: 'legendary', criteria: { liftWeight: 405 } },

    // === SOCIAL BADGES ===
    { id: 'social_first', name: 'Team Player', icon: '🤝', description: 'Follow your first athlete', xp: 25, category: 'social', rarity: 'common', criteria: { following: 1 } },
    { id: 'social_squad', name: 'Iron Squad', icon: '👥', description: 'Follow 10 athletes', xp: 100, category: 'social', rarity: 'uncommon', criteria: { following: 10 } },
    { id: 'social_influencer', name: 'Iron Influencer', icon: '📣', description: 'Get 50 followers', xp: 300, category: 'social', rarity: 'rare', criteria: { followers: 50 } },
    { id: 'arena_first', name: 'Arena Debut', icon: '⚔️', description: 'Complete your first battle', xp: 75, category: 'social', rarity: 'common', criteria: { battlesCompleted: 1 } },
    { id: 'arena_champion', name: 'Arena Champion', icon: '🏆', description: 'Win 10 battles', xp: 400, category: 'social', rarity: 'rare', criteria: { battlesWon: 10 } },
    { id: 'arena_legend', name: 'Arena Legend', icon: '⭐', description: 'Win 50 battles', xp: 1000, category: 'social', rarity: 'epic', criteria: { battlesWon: 50 } },
    { id: 'chat_first', name: 'Voice of Iron', icon: '💬', description: 'Send your first message', xp: 25, category: 'social', rarity: 'common', criteria: { messagesSent: 1 } },
    { id: 'post_first', name: 'Content Creator', icon: '📸', description: 'Share your first progress photo', xp: 75, category: 'social', rarity: 'common', criteria: { postsCreated: 1 } },

    // === NUTRITION BADGES ===
    { id: 'meal_first', name: 'Nutrition Tracker', icon: '🍽️', description: 'Log your first meal', xp: 25, category: 'nutrition', rarity: 'common', criteria: { mealsLogged: 1 } },
    { id: 'meal_week', name: 'Meal Prep Pro', icon: '🥗', description: 'Log meals for 7 consecutive days', xp: 150, category: 'nutrition', rarity: 'uncommon', criteria: { mealStreakDays: 7 } },
    { id: 'protein_goal', name: 'Protein King', icon: '🥩', description: 'Hit protein goal 30 times', xp: 300, category: 'nutrition', rarity: 'rare', criteria: { proteinGoalHits: 30 } },
    { id: 'macro_master', name: 'Macro Master', icon: '📊', description: 'Hit all macros within 10% for 14 days', xp: 500, category: 'nutrition', rarity: 'epic', criteria: { perfectMacroDays: 14 } },
    { id: 'hydration', name: 'Hydration Hero', icon: '💧', description: 'Log 8 glasses of water 30 days', xp: 200, category: 'nutrition', rarity: 'rare', criteria: { hydrationDays: 30 } },

    // === MILESTONE BADGES ===
    { id: 'workouts_10', name: 'Dedicated', icon: '💪', description: 'Complete 10 workouts', xp: 100, category: 'milestone', rarity: 'common', criteria: { workoutsCompleted: 10 } },
    { id: 'workouts_50', name: 'Committed', icon: '🔥', description: 'Complete 50 workouts', xp: 350, category: 'milestone', rarity: 'uncommon', criteria: { workoutsCompleted: 50 } },
    { id: 'workouts_100', name: 'Iron Centurion', icon: '⚔️', description: 'Complete 100 workouts', xp: 750, category: 'milestone', rarity: 'rare', criteria: { workoutsCompleted: 100 } },
    { id: 'workouts_500', name: 'Living Legend', icon: '👑', description: 'Complete 500 workouts', xp: 2500, category: 'milestone', rarity: 'legendary', criteria: { workoutsCompleted: 500 } },
    { id: 'xp_1000', name: 'XP Hunter', icon: '⭐', description: 'Earn 1,000 XP', xp: 50, category: 'milestone', rarity: 'common', criteria: { totalXp: 1000 } },
    { id: 'xp_10000', name: 'XP Master', icon: '🌟', description: 'Earn 10,000 XP', xp: 250, category: 'milestone', rarity: 'rare', criteria: { totalXp: 10000 } },
    { id: 'xp_100000', name: 'XP Legend', icon: '💫', description: 'Earn 100,000 XP', xp: 1000, category: 'milestone', rarity: 'legendary', criteria: { totalXp: 100000 } },

    // === SPECIAL BADGES ===
    { id: 'new_year', name: 'New Year Iron', icon: '🎆', description: 'Work out on January 1st', xp: 200, category: 'special', rarity: 'rare', criteria: { special: 'new_year_workout' } },
    { id: 'birthday', name: 'Birthday Gains', icon: '🎂', description: 'Work out on your birthday', xp: 150, category: 'special', rarity: 'rare', criteria: { special: 'birthday_workout' } },
    { id: 'perfectionist', name: 'Perfectionist', icon: '✨', description: 'Complete a workout with perfect form score', xp: 300, category: 'special', rarity: 'epic', criteria: { perfectFormWorkout: 1 } },
    { id: 'comeback', name: 'The Comeback', icon: '🦅', description: 'Return after 30+ days away', xp: 100, category: 'special', rarity: 'uncommon', criteria: { special: 'comeback' } },
    { id: 'night_shift', name: 'Night Shift', icon: '🌙', description: 'Complete a workout between 2-5am', xp: 150, category: 'special', rarity: 'rare', criteria: { special: 'night_workout' } },
    { id: 'double_day', name: 'Double Trouble', icon: '⚡', description: 'Complete 2 workouts in one day', xp: 200, category: 'special', rarity: 'rare', criteria: { workoutsPerDay: 2 } },
    { id: 'ai_coach', name: 'AI Apprentice', icon: '🤖', description: 'Complete 10 AI-generated workouts', xp: 250, category: 'special', rarity: 'uncommon', criteria: { aiWorkouts: 10 } },
    { id: 'form_master', name: 'Form Master', icon: '🎯', description: 'Use Form Coach 20 times', xp: 300, category: 'special', rarity: 'rare', criteria: { formCoachSessions: 20 } },
];

// Rarity colors for display
export const RARITY_CONFIG = {
    common: { color: 'gray', gradient: 'from-gray-400 to-gray-600', glow: 'rgba(156, 163, 175, 0.4)' },
    uncommon: { color: 'green', gradient: 'from-green-400 to-emerald-600', glow: 'rgba(34, 197, 94, 0.4)' },
    rare: { color: 'red', gradient: 'from-red-400 to-red-600', glow: 'rgba(220, 38, 38, 0.4)' },
    epic: { color: 'purple', gradient: 'from-purple-400 to-violet-600', glow: 'rgba(185, 28, 28, 0.4)' },
    legendary: { color: 'yellow', gradient: 'from-yellow-400 to-orange-600', glow: 'rgba(234, 179, 8, 0.5)' },
};

// Power-ups system
export const POWER_UPS = [
    { id: 'xp_boost_2x', name: '2X XP Booster', icon: '⚡', description: 'Double XP for next workout', duration: 'single_use', cost: 500, effect: { xpMultiplier: 2 } },
    { id: 'xp_boost_24h', name: '24hr XP Rush', icon: '🚀', description: 'Double XP for 24 hours', duration: 86400, cost: 1500, effect: { xpMultiplier: 2 } },
    { id: 'forge_shield', name: 'Forge Shield', icon: '🛡️', description: 'Protect your Forge for one day', duration: 86400, cost: 750, effect: { forgeProtection: true } },
    { id: 'forge_restore', name: 'Forge Restore', icon: '🔄', description: 'Restore a broken Forge (up to 3 days)', duration: 'single_use', cost: 2000, effect: { forgeRestore: 3 } },
    { id: 'pr_reveal', name: 'PR Predictor', icon: '🔮', description: 'AI predicts your next PR attempt', duration: 'single_use', cost: 300, effect: { prPrediction: true } },
    { id: 'rest_skip', name: 'Skip Rest Day', icon: '⏭️', description: 'No recovery penalty for one day', duration: 86400, cost: 400, effect: { noRecoveryPenalty: true } },
    { id: 'coach_boost', name: 'Coach Insight', icon: '🧠', description: 'Extra detailed AI feedback', duration: 'single_use', cost: 200, effect: { detailedFeedback: true } },
    { id: 'leaderboard_boost', name: 'Spotlight', icon: '✨', description: 'Highlight on leaderboard for 24hrs', duration: 86400, cost: 1000, effect: { highlighted: true } },
];

// Daily/Weekly Challenges
export const generateDailyChallenge = (seed = Date.now()) => {
    const challenges = [
        { id: 'quick_pump', name: 'Quick Pump', description: 'Complete a workout in under 30 minutes', xp: 100, type: 'daily' },
        { id: 'volume_day', name: 'Volume Day', description: 'Hit 5,000 lbs total volume today', xp: 150, type: 'daily' },
        { id: 'pr_attempt', name: 'PR Attempt', description: 'Attempt a new personal record', xp: 125, type: 'daily' },
        { id: 'hydrate', name: 'Stay Hydrated', description: 'Log 8 glasses of water', xp: 75, type: 'daily' },
        { id: 'protein_push', name: 'Protein Push', description: 'Hit your protein goal today', xp: 100, type: 'daily' },
        { id: 'compound_focus', name: 'Compound Focus', description: 'Perform 3+ compound exercises', xp: 125, type: 'daily' },
        { id: 'core_crusher', name: 'Core Crusher', description: 'Complete 100 total ab reps', xp: 100, type: 'daily' },
        { id: 'cardio_king', name: 'Cardio King', description: 'Log 20+ minutes of cardio', xp: 100, type: 'daily' },
    ];

    // Use seed to consistently select challenge for the day
    const index = Math.floor((seed / 86400000) % challenges.length);
    return { ...challenges[index], expiresAt: new Date(new Date().setHours(23, 59, 59, 999)) };
};

export const generateWeeklyChallenge = () => {
    const challenges = [
        { id: 'week_warrior', name: 'Week Warrior', description: 'Complete 5 workouts this week', xp: 400, type: 'weekly' },
        { id: 'volume_week', name: 'Volume Week', description: 'Hit 25,000 lbs total volume this week', xp: 500, type: 'weekly' },
        { id: 'meal_prep', name: 'Meal Prep Master', description: 'Log all meals for 7 days', xp: 350, type: 'weekly' },
        { id: 'social_week', name: 'Community Week', description: 'Win 3 arena battles', xp: 450, type: 'weekly' },
        { id: 'forge_week', name: 'Forge Week', description: 'Maintain a 7-day Forge', xp: 500, type: 'weekly' },
        { id: 'variety_week', name: 'Variety Pack', description: 'Train all major muscle groups', xp: 400, type: 'weekly' },
    ];

    const weekNumber = Math.floor(Date.now() / (7 * 86400000));
    const index = weekNumber % challenges.length;

    // Calculate end of week
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    return { ...challenges[index], expiresAt: endOfWeek };
};

// Helper to check if achievement is unlocked
export const checkAchievement = (achievement, stats) => {
    const { criteria } = achievement;

    for (const [key, value] of Object.entries(criteria)) {
        if (key === 'special') continue; // Special achievements checked separately
        // forgeDays falls back to streakDays for backwards-compat
        const statValue = key === 'forgeDays'
            ? (stats.forgeDays ?? stats.streakDays ?? 0)
            : (stats[key] || 0);
        if (statValue < value) return false;
    }

    return true;
};

// Get unlocked achievements
export const getUnlockedAchievements = (stats, currentUnlocked = []) => {
    const newly = [];

    ACHIEVEMENTS.forEach(achievement => {
        if (currentUnlocked.includes(achievement.id)) return;
        if (checkAchievement(achievement, stats)) {
            newly.push(achievement);
        }
    });

    return newly;
};

export default { ACHIEVEMENTS, POWER_UPS, RARITY_CONFIG, generateDailyChallenge, generateWeeklyChallenge };



