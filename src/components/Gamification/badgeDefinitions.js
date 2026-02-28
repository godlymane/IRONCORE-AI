/**
 * Badge Definitions — Hardcoded achievement system.
 * Each badge checks unlock status against user data client-side.
 * No Firestore writes needed.
 */

export const BADGE_CATEGORIES = {
  CONSISTENCY: { label: 'Consistency', icon: '🔥', color: 'text-orange-400' },
  STRENGTH: { label: 'Strength', icon: '💪', color: 'text-red-400' },
  SOCIAL: { label: 'Social', icon: '⚔️', color: 'text-blue-400' },
  MASTERY: { label: 'Mastery', icon: '🧠', color: 'text-purple-400' },
  MILESTONES: { label: 'Milestones', icon: '💎', color: 'text-cyan-400' },
};

export const BADGES = [
  // ─── CONSISTENCY ───
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Log your first workout',
    icon: '🩸',
    category: 'CONSISTENCY',
    rarity: 'common',
    check: (d) => (d.workoutCount || d.workouts?.length || 0) >= 1,
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Maintain a 7-day Forge',
    icon: '🔥',
    category: 'CONSISTENCY',
    rarity: 'uncommon',
    check: (d) => (d.currentForge ?? d.currentStreak ?? 0) >= 7 || (d.longestForge ?? d.longestStreak ?? 0) >= 7,
  },
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: 'Maintain a 30-day Forge',
    icon: '⛓️',
    category: 'CONSISTENCY',
    rarity: 'rare',
    check: (d) => (d.longestForge ?? d.longestStreak ?? 0) >= 30,
  },
  {
    id: 'eternal_flame',
    name: 'Eternal Flame',
    description: 'Maintain a 100-day Forge',
    icon: '🌋',
    category: 'CONSISTENCY',
    rarity: 'legendary',
    check: (d) => (d.longestForge ?? d.longestStreak ?? 0) >= 100,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 workouts',
    icon: '🏛️',
    category: 'CONSISTENCY',
    rarity: 'epic',
    check: (d) => (d.workoutCount || d.workouts?.length || 0) >= 100,
  },

  // ─── STRENGTH ───
  {
    id: 'iron_starter',
    name: 'Iron Starter',
    description: 'Reach Level 5',
    icon: '⚡',
    category: 'STRENGTH',
    rarity: 'common',
    check: (d) => (d.level || 1) >= 5,
  },
  {
    id: 'forged',
    name: 'Forged in Fire',
    description: 'Reach Level 10',
    icon: '🔨',
    category: 'STRENGTH',
    rarity: 'uncommon',
    check: (d) => (d.level || 1) >= 10,
  },
  {
    id: 'titan',
    name: 'Titan',
    description: 'Reach Level 25',
    icon: '🗿',
    category: 'STRENGTH',
    rarity: 'epic',
    check: (d) => (d.level || 1) >= 25,
  },
  {
    id: 'volume_king',
    name: 'Volume King',
    description: 'Lift 100,000 kg total volume',
    icon: '👑',
    category: 'STRENGTH',
    rarity: 'legendary',
    check: (d) => (d.totalVolume || 0) >= 100000,
  },
  {
    id: 'perfect_form',
    name: 'Perfect Form',
    description: 'Score 95%+ in AI form correction',
    icon: '🎯',
    category: 'STRENGTH',
    rarity: 'rare',
    check: (d) => (d.bestFormScore || 0) >= 95,
  },

  // ─── SOCIAL ───
  {
    id: 'gladiator',
    name: 'Gladiator',
    description: 'Win your first PvP battle',
    icon: '⚔️',
    category: 'SOCIAL',
    rarity: 'common',
    check: (d) => (d.battlesWon || d.wins || 0) >= 1,
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 10 PvP battles',
    icon: '🏆',
    category: 'SOCIAL',
    rarity: 'rare',
    check: (d) => (d.battlesWon || d.wins || 0) >= 10,
  },
  {
    id: 'warlord',
    name: 'Warlord',
    description: 'Win 50 PvP battles',
    icon: '🛡️',
    category: 'SOCIAL',
    rarity: 'epic',
    check: (d) => (d.battlesWon || d.wins || 0) >= 50,
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Deal damage to a Community Boss',
    icon: '🐉',
    category: 'SOCIAL',
    rarity: 'uncommon',
    check: (d) => (d.bossesContributed || 0) >= 1,
  },
  {
    id: 'recruiter',
    name: 'Recruiter',
    description: 'Have 5 followers',
    icon: '📢',
    category: 'SOCIAL',
    rarity: 'uncommon',
    check: (d) => (d.followersCount || d.following?.length || 0) >= 5,
  },

  // ─── MASTERY ───
  {
    id: 'nutritionist',
    name: 'Nutritionist',
    description: 'Log 100 meals',
    icon: '🥗',
    category: 'MASTERY',
    rarity: 'rare',
    check: (d) => (d.mealCount || d.meals?.length || 0) >= 100,
  },
  {
    id: 'photographer',
    name: 'Photographer',
    description: 'Take 10 progress photos',
    icon: '📸',
    category: 'MASTERY',
    rarity: 'uncommon',
    check: (d) => (d.photoCount || d.photos?.length || 0) >= 10,
  },
  {
    id: 'data_driven',
    name: 'Data Driven',
    description: 'Log weight 30 times',
    icon: '📊',
    category: 'MASTERY',
    rarity: 'rare',
    check: (d) => (d.progressCount || d.progress?.length || 0) >= 30,
  },

  // ─── MILESTONES ───
  {
    id: 'diamond_league',
    name: 'Diamond League',
    description: 'Reach Diamond league tier',
    icon: '💎',
    category: 'MILESTONES',
    rarity: 'legendary',
    check: (d) => (d.league || '').toLowerCase().includes('diamond'),
  },
  {
    id: 'xp_hoarder',
    name: 'XP Hoarder',
    description: 'Earn 50,000 total XP',
    icon: '💰',
    category: 'MILESTONES',
    rarity: 'epic',
    check: (d) => (d.xp || 0) >= 50000,
  },
  {
    id: 'ten_k',
    name: '10K Club',
    description: 'Earn 10,000 XP',
    icon: '🎖️',
    category: 'MILESTONES',
    rarity: 'rare',
    check: (d) => (d.xp || 0) >= 10000,
  },
];

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'text-gray-400', border: 'border-gray-600', bg: 'bg-gray-800/50', glow: '' },
  uncommon: { label: 'Uncommon', color: 'text-green-400', border: 'border-green-600/40', bg: 'bg-green-900/20', glow: '' },
  rare: { label: 'Rare', color: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-900/20', glow: 'shadow-blue-500/10' },
  epic: { label: 'Epic', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-900/20', glow: 'shadow-purple-500/20' },
  legendary: { label: 'Legendary', color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-900/20', glow: 'shadow-yellow-500/20 shadow-lg' },
};

export const getRarityConfig = (rarity) => RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
export const getBadgeById = (id) => BADGES.find(b => b.id === id);
export const getBadgesByCategory = (category) => BADGES.filter(b => b.category === category);
export const getUnlockedBadges = (userData) => BADGES.filter(b => b.check(userData));
export const getLockedBadges = (userData) => BADGES.filter(b => !b.check(userData));
export const getUnlockProgress = (userData) => {
  const unlocked = getUnlockedBadges(userData).length;
  return { unlocked, total: BADGES.length, percent: Math.round((unlocked / BADGES.length) * 100) };
};
