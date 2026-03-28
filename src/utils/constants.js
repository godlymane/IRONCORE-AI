export const BREAKPOINTS = { mobile: 768, tablet: 1024 };

export const STORAGE_KEYS = {
    PROFILE_PREFIX: 'ironai_profile_',
    THEME: 'ironai_theme',
};

export const GAME_BALANCE = {
    BASE_XP_PER_LEVEL: 100,
    BOSS_REWARD_XP: 500,
    DEFAULT_LEADERBOARD_LIMIT: 100,
    DEFAULT_BATTLE_XP_REWARD: 100,
    DEFAULT_CALORIE_BURN_GOAL: 500,
};

export const EXERCISE_DB = [
    // LEGS
    { name: "Barbell Squat", muscle: "quads", secondary: ["glutes", "lower_back"] },
    { name: "Leg Press", muscle: "quads", secondary: ["glutes"] },
    { name: "Bulgarian Split Squat", muscle: "glutes", secondary: ["quads", "hamstrings"] },
    { name: "Romanian Deadlift", muscle: "hamstrings", secondary: ["glutes", "lower_back"] },
    { name: "Leg Extension", muscle: "quads", secondary: [] },
    { name: "Hamstring Curl", muscle: "hamstrings", secondary: [] },
    { name: "Calf Raise", muscle: "calves", secondary: [] },

    // PUSH (Chest/Shoulders/Tri)
    { name: "Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"] },
    { name: "Incline Bench Press", muscle: "chest", secondary: ["front_delts", "triceps"] },
    { name: "Overhead Press", muscle: "front_delts", secondary: ["triceps", "upper_chest"] },
    { name: "Lateral Raise", muscle: "side_delts", secondary: ["traps"] },
    { name: "Tricep Extension", muscle: "triceps", secondary: [] },
    { name: "Push Up", muscle: "chest", secondary: ["core", "triceps"] },
    { name: "Dips", muscle: "triceps", secondary: ["chest", "front_delts"] },

    // PULL (Back/Bi)
    { name: "Deadlift", muscle: "lower_back", secondary: ["hamstrings", "glutes", "traps"] },
    { name: "Pull Up", muscle: "lats", secondary: ["biceps", "rear_delts"] },
    { name: "Lat Pulldown", muscle: "lats", secondary: ["biceps"] },
    { name: "Barbell Row", muscle: "lats", secondary: ["lower_back", "biceps", "rear_delts"] },
    { name: "Face Pull", muscle: "rear_delts", secondary: ["traps", "rotator_cuff"] },
    { name: "Dumbbell Curl", muscle: "biceps", secondary: ["forearms"] },
    { name: "Hammer Curl", muscle: "biceps", secondary: ["forearms"] },
    
    // CORE
    { name: "Plank", muscle: "abs", secondary: ["core"] },
    { name: "Crunches", muscle: "abs", secondary: [] }
];

// ── League / XP thresholds — single source of truth ──
// Cloud Functions mirrors these values (search "LEAGUES" in functions/index.js)
export const LEAGUE_THRESHOLDS = [
    { name: 'Iron',     min: 0 },
    { name: 'Bronze',   min: 1000 },
    { name: 'Silver',   min: 2500 },
    { name: 'Gold',     min: 5000 },
    { name: 'Platinum', min: 10000 },
    { name: 'Diamond',  min: 25000 },
];

export const LEVELS = LEAGUE_THRESHOLDS.map(l => ({
    ...l,
    name: l.name === 'Iron' ? 'Iron Novice' : l.name,
    color: { Iron: 'text-gray-400', Bronze: 'text-orange-700', Silver: 'text-slate-300', Gold: 'text-yellow-400', Platinum: 'text-cyan-400', Diamond: 'text-red-400' }[l.name],
    border: { Iron: 'border-gray-500', Bronze: 'border-orange-700', Silver: 'border-slate-300', Gold: 'border-yellow-400', Platinum: 'border-cyan-400', Diamond: 'border-red-400' }[l.name],
    bg: { Iron: 'bg-gray-500/10', Bronze: 'bg-orange-700/10', Silver: 'bg-slate-300/10', Gold: 'bg-yellow-400/10', Platinum: 'bg-cyan-400/10', Diamond: 'bg-red-400/10' }[l.name],
}));

export const getLeagueForXp = (xp = 0) =>
    [...LEAGUE_THRESHOLDS].reverse().find(l => xp >= l.min) || LEAGUE_THRESHOLDS[0];

/**
 * Default daily nutrition targets — used as fallback when user profile
 * does not have custom values set. To customize, set dailyCalories,
 * dailyProtein, dailyCarbs, dailyFats on the user's Firestore profile.
 *
 * Units: calories/burnGoal = kcal, protein/carbs/fats = grams, water = glasses (250ml each)
 */
export const NUTRITION_DEFAULTS = {
    calories: 2000,  // kcal
    protein: 150,    // grams
    carbs: 200,      // grams
    fats: 60,        // grams
    water: 8,        // glasses (250ml each)
    burnGoal: 500,   // kcal burned target
};

/**
 * Build nutrition goals from a user profile, falling back to defaults.
 */
export const getNutritionGoals = (profile = {}) => ({
    calories: profile.dailyCalories || NUTRITION_DEFAULTS.calories,
    protein: profile.dailyProtein || NUTRITION_DEFAULTS.protein,
    carbs: profile.dailyCarbs || NUTRITION_DEFAULTS.carbs,
    fats: profile.dailyFats || NUTRITION_DEFAULTS.fats,
    water: profile.waterGoal || NUTRITION_DEFAULTS.water,
    burnGoal: profile.burnGoal || NUTRITION_DEFAULTS.burnGoal,
});

/**
 * Default MET value for unknown/general exercise activity.
 * Used when an exercise type is not found in a MET lookup table.
 */
export const DEFAULT_MET = 3.5;

/**
 * Content length limits for user-generated text fields.
 */
export const CONTENT_LIMITS = {
    MAX_MESSAGE_LENGTH: 500,
    MAX_CAPTION_LENGTH: 300,
};
