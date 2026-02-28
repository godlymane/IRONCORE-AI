/**
 * Engagement Data Configuration
 * Contains all constants, rewards, and thresholds for engagement features
 */

// ============================================
// FORGE SYSTEM CONFIGURATION
// ============================================
export const FORGE_CONFIG = {
    // XP Multipliers at streak milestones
    multipliers: [
        { days: 3, multiplier: 1.1, label: '10% Bonus' },
        { days: 7, multiplier: 1.25, label: '25% Bonus' },
        { days: 14, multiplier: 1.5, label: '50% Bonus' },
        { days: 30, multiplier: 2.0, label: '2X XP!' },
        { days: 60, multiplier: 2.5, label: '2.5X XP!' },
        { days: 100, multiplier: 3.0, label: '3X XP!' },
    ],

    // Milestone celebrations (trigger confetti + bonus XP)
    milestones: [
        { days: 7, bonusXP: 100, title: 'Week Warrior!', emoji: '🔥' },
        { days: 14, bonusXP: 250, title: 'Fortnight Fighter!', emoji: '⚡' },
        { days: 30, bonusXP: 500, title: 'Iron Will!', emoji: '💪' },
        { days: 60, bonusXP: 1000, title: 'Unstoppable!', emoji: '🌟' },
        { days: 100, bonusXP: 2500, title: 'Century Legend!', emoji: '👑' },
        { days: 365, bonusXP: 10000, title: 'Year of Iron!', emoji: '🏆' },
    ],

    // Grace period hours before streak is lost
    gracePeriodHours: 36,

    // Free shield recharge (days)
    freeShieldDays: 7,
};

// ============================================
// DAILY REWARDS CONFIGURATION
// ============================================
export const DAILY_REWARDS = [
    // Week 1
    { day: 1, type: 'xp', amount: 25, label: '+25 XP', emoji: '⭐' },
    { day: 2, type: 'xp', amount: 50, label: '+50 XP', emoji: '⭐' },
    { day: 3, type: 'xp', amount: 75, label: '+75 XP', emoji: '✨' },
    { day: 4, type: 'xp', amount: 100, label: '+100 XP', emoji: '✨' },
    { day: 5, type: 'xp', amount: 125, label: '+125 XP', emoji: '💫' },
    { day: 6, type: 'xp', amount: 150, label: '+150 XP', emoji: '💫' },
    { day: 7, type: 'item', item: 'forge_shield', label: 'Forge Shield', emoji: '🛡️' },

    // Week 2
    { day: 8, type: 'xp', amount: 75, label: '+75 XP', emoji: '⭐' },
    { day: 9, type: 'xp', amount: 100, label: '+100 XP', emoji: '⭐' },
    { day: 10, type: 'xp', amount: 125, label: '+125 XP', emoji: '✨' },
    { day: 11, type: 'xp', amount: 150, label: '+150 XP', emoji: '✨' },
    { day: 12, type: 'xp', amount: 175, label: '+175 XP', emoji: '💫' },
    { day: 13, type: 'xp', amount: 200, label: '+200 XP', emoji: '💫' },
    { day: 14, type: 'mystery', label: 'Mystery Box', emoji: '🎁' },

    // Week 3
    { day: 15, type: 'xp', amount: 100, label: '+100 XP', emoji: '⭐' },
    { day: 16, type: 'xp', amount: 125, label: '+125 XP', emoji: '⭐' },
    { day: 17, type: 'xp', amount: 150, label: '+150 XP', emoji: '✨' },
    { day: 18, type: 'xp', amount: 175, label: '+175 XP', emoji: '✨' },
    { day: 19, type: 'xp', amount: 200, label: '+200 XP', emoji: '💫' },
    { day: 20, type: 'xp', amount: 225, label: '+225 XP', emoji: '💫' },
    { day: 21, type: 'item', item: 'double_xp', label: '2X XP Token', emoji: '⚡' },

    // Week 4
    { day: 22, type: 'xp', amount: 125, label: '+125 XP', emoji: '⭐' },
    { day: 23, type: 'xp', amount: 150, label: '+150 XP', emoji: '⭐' },
    { day: 24, type: 'xp', amount: 175, label: '+175 XP', emoji: '✨' },
    { day: 25, type: 'xp', amount: 200, label: '+200 XP', emoji: '✨' },
    { day: 26, type: 'xp', amount: 250, label: '+250 XP', emoji: '💫' },
    { day: 27, type: 'xp', amount: 300, label: '+300 XP', emoji: '💫' },
    { day: 28, type: 'premium', label: 'Premium Chest', emoji: '👑' },

    // Bonus days (if month has more than 28 days)
    { day: 29, type: 'xp', amount: 200, label: '+200 XP', emoji: '🌟' },
    { day: 30, type: 'xp', amount: 250, label: '+250 XP', emoji: '🌟' },
    { day: 31, type: 'xp', amount: 300, label: '+300 XP', emoji: '🌟' },
];

// Mystery box possible rewards
export const MYSTERY_REWARDS = [
    { type: 'xp', amount: 500, label: '+500 XP', emoji: '⭐', weight: 40 },
    { type: 'xp', amount: 1000, label: '+1000 XP', emoji: '✨', weight: 20 },
    { type: 'item', item: 'forge_shield', label: 'Forge Shield', emoji: '🛡️', weight: 25 },
    { type: 'item', item: 'double_xp', label: '2X XP Token', emoji: '⚡', weight: 10 },
    { type: 'item', item: 'spotlight', label: 'Spotlight 24h', emoji: '✨', weight: 5 },
];

// Premium chest possible rewards
export const PREMIUM_REWARDS = [
    { type: 'xp', amount: 1500, label: '+1500 XP', emoji: '💎', weight: 30 },
    { type: 'xp', amount: 2500, label: '+2500 XP', emoji: '💎', weight: 15 },
    { type: 'item', item: 'forge_shield', label: '3x Forge Shield', quantity: 3, emoji: '🛡️', weight: 20 },
    { type: 'item', item: 'double_xp_24h', label: '24h 2X XP', emoji: '⚡', weight: 15 },
    { type: 'badge', badge: 'premium_collector', label: 'Premium Badge', emoji: '👑', weight: 10 },
    { type: 'item', item: 'forge_restore', label: 'Forge Restore', emoji: '🔄', weight: 10 },
];

// ============================================
// GUILD SYSTEM CONFIGURATION
// ============================================
export const GUILD_CONFIG = {
    // Guild level thresholds (total guild XP)
    levels: [
        { level: 1, xpRequired: 0, maxMembers: 10, perks: [] },
        { level: 2, xpRequired: 5000, maxMembers: 15, perks: ['guild_chat'] },
        { level: 3, xpRequired: 15000, maxMembers: 20, perks: ['guild_chat', 'custom_emblem'] },
        { level: 4, xpRequired: 35000, maxMembers: 30, perks: ['guild_chat', 'custom_emblem', 'guild_challenges'] },
        { level: 5, xpRequired: 75000, maxMembers: 50, perks: ['guild_chat', 'custom_emblem', 'guild_challenges', 'xp_boost_5'] },
        { level: 6, xpRequired: 150000, maxMembers: 75, perks: ['guild_chat', 'custom_emblem', 'guild_challenges', 'xp_boost_10'] },
        { level: 7, xpRequired: 300000, maxMembers: 100, perks: ['all'] },
    ],

    // Guild creation cost
    creationCost: 500,

    // Weekly guild goals templates
    weeklyGoals: [
        { id: 'workouts_50', name: '50 Workouts', description: 'Complete 50 workouts as a guild', target: 50, xpReward: 500 },
        { id: 'workouts_100', name: '100 Workouts', description: 'Complete 100 workouts as a guild', target: 100, xpReward: 1200 },
        { id: 'volume_100k', name: '100K Volume', description: 'Lift 100,000 lbs combined', target: 100000, xpReward: 800 },
        { id: 'forge_7', name: 'Forge Squad', description: 'All members maintain 7+ day Forges', target: 100, xpReward: 1500 },
    ],

    // Guild emblems (unlocked by level)
    emblems: [
        { id: 'default', name: 'Iron Fist', icon: '✊', unlockLevel: 1 },
        { id: 'flame', name: 'Sacred Flame', icon: '🔥', unlockLevel: 1 },
        { id: 'lightning', name: 'Thunder', icon: '⚡', unlockLevel: 2 },
        { id: 'sword', name: 'Blade', icon: '⚔️', unlockLevel: 2 },
        { id: 'crown', name: 'Royal', icon: '👑', unlockLevel: 3 },
        { id: 'dragon', name: 'Dragon', icon: '🐉', unlockLevel: 4 },
        { id: 'phoenix', name: 'Phoenix', icon: '🦅', unlockLevel: 5 },
        { id: 'diamond', name: 'Diamond', icon: '💎', unlockLevel: 6 },
        { id: 'star', name: 'Legendary', icon: '🌟', unlockLevel: 7 },
    ],
};

// ============================================
// TOURNAMENT CONFIGURATION
// ============================================
export const TOURNAMENT_CONFIG = {
    // Tournament types
    types: [
        { id: 'volume', name: 'Volume King', description: 'Most total weight lifted', metric: 'weeklyVolume', icon: '🏋️' },
        { id: 'workouts', name: 'Workout Warrior', description: 'Most workouts completed', metric: 'weeklyWorkouts', icon: '💪' },
        { id: 'forge', name: 'Forge Master', description: 'Longest active Forge', metric: 'currentForge', icon: '🔥' },
        { id: 'xp', name: 'XP Champion', description: 'Most XP earned this week', metric: 'weeklyXP', icon: '⚡' },
    ],

    // Prize tiers (percentage of participants)
    prizeTiers: [
        { tier: 'champion', topPercent: 1, xpReward: 2000, badge: 'tournament_champion', label: '🥇 Champion' },
        { tier: 'elite', topPercent: 5, xpReward: 1000, badge: 'tournament_elite', label: '🥈 Elite' },
        { tier: 'gold', topPercent: 10, xpReward: 500, badge: null, label: '🥉 Gold' },
        { tier: 'silver', topPercent: 25, xpReward: 250, badge: null, label: '🏅 Silver' },
        { tier: 'bronze', topPercent: 50, xpReward: 100, badge: null, label: '📜 Bronze' },
    ],

    // Tournament duration (resets every Monday 00:00 UTC)
    resetDay: 1, // Monday
    resetHourUTC: 0,
};

// ============================================
// NOTIFICATION CONFIGURATION
// ============================================
export const NOTIFICATION_TYPES = {
    streak_warning: {
        title: "Don't break your Forge! 🔥",
        priority: 'high',
        icon: '🔥',
    },
    streak_milestone: {
        title: 'Forge Milestone!',
        priority: 'medium',
        icon: '🎉',
    },
    daily_reward: {
        title: 'Daily Reward Available!',
        priority: 'medium',
        icon: '🎁',
    },
    tournament_start: {
        title: 'New Tournament Started!',
        priority: 'medium',
        icon: '🏆',
    },
    tournament_ending: {
        title: 'Tournament Ending Soon!',
        priority: 'high',
        icon: '⏰',
    },
    guild_goal: {
        title: 'Guild Goal Progress',
        priority: 'low',
        icon: '🏰',
    },
    social: {
        title: 'Someone challenged you!',
        priority: 'high',
        icon: '⚔️',
    },
    achievement: {
        title: 'Achievement Unlocked!',
        priority: 'medium',
        icon: '🏅',
    },
    motivational: {
        title: 'Time to Train!',
        priority: 'low',
        icon: '💪',
    },
};

// Motivational messages for notifications
export const MOTIVATIONAL_MESSAGES = [
    "Your future self will thank you. Let's go! 💪",
    "Champions are made when no one is watching. 🏆",
    "One more workout, one step closer to greatness. ⚡",
    "The only bad workout is the one you didn't do. 🔥",
    "Discipline beats motivation every time. 👑",
    "Your Forge is counting on you. Don't let it break! 🔥",
    "PRs don't happen on the couch. Time to move! 🏋️",
    "Remember why you started. Now finish strong! 💪",
    "Every rep is a vote for who you want to become. ✨",
    "Iron sharpens iron. Time to get sharp! ⚔️",
];

// Backwards-compat alias
export const STREAK_CONFIG = FORGE_CONFIG;

// Helper functions
export const getForgeMultiplier = (forgeDays) => {
    const applicable = FORGE_CONFIG.multipliers
        .filter(m => forgeDays >= m.days)
        .sort((a, b) => b.days - a.days);
    return applicable[0]?.multiplier || 1.0;
};

export const getForgeMilestone = (forgeDays) => {
    return FORGE_CONFIG.milestones.find(m => m.days === forgeDays);
};

// Backwards-compat aliases
export const getStreakMultiplier = getForgeMultiplier;
export const getStreakMilestone = getForgeMilestone;

export const getDailyReward = (dayOfMonth) => {
    return DAILY_REWARDS.find(r => r.day === dayOfMonth) || DAILY_REWARDS[DAILY_REWARDS.length - 1];
};

export const getRandomMysteryReward = () => {
    const totalWeight = MYSTERY_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    for (const reward of MYSTERY_REWARDS) {
        random -= reward.weight;
        if (random <= 0) return reward;
    }
    return MYSTERY_REWARDS[0];
};

export const getRandomPremiumReward = () => {
    const totalWeight = PREMIUM_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    for (const reward of PREMIUM_REWARDS) {
        random -= reward.weight;
        if (random <= 0) return reward;
    }
    return PREMIUM_REWARDS[0];
};

export const getGuildLevel = (totalXP) => {
    const applicable = GUILD_CONFIG.levels
        .filter(l => totalXP >= l.xpRequired)
        .sort((a, b) => b.level - a.level);
    return applicable[0] || GUILD_CONFIG.levels[0];
};

export const getCurrentTournamentType = () => {
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return TOURNAMENT_CONFIG.types[weekNumber % TOURNAMENT_CONFIG.types.length];
};

export const getTournamentEndTime = () => {
    const now = new Date();
    const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(TOURNAMENT_CONFIG.resetHourUTC, 0, 0, 0);
    return nextMonday;
};

export const getRandomMotivation = () => {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
};



