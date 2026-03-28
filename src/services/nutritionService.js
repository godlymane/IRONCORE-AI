/**
 * Nutrition Service - daily target computation and nutrition utilities
 */
import { NUTRITION_DEFAULTS, getNutritionGoals } from '../utils/constants';

/**
 * Compute daily nutrition targets based on user profile data.
 * Falls back to NUTRITION_DEFAULTS when profile fields are missing.
 *
 * @param {Object} profile - User profile object from Firestore.
 * @param {number} [profile.weight] - Body weight in kg.
 * @param {number} [profile.height] - Height in cm.
 * @param {number} [profile.age] - Age in years.
 * @param {string} [profile.gender] - 'male' or 'female'.
 * @param {string} [profile.goal] - 'lose', 'maintain', or 'gain'.
 * @param {number} [profile.activityLevel] - 1.2 (sedentary) to 1.9 (very active).
 * @param {number} [profile.dailyCalories] - User-set override.
 * @param {number} [profile.dailyProtein] - User-set override.
 * @param {number} [profile.dailyCarbs] - User-set override.
 * @param {number} [profile.dailyFats] - User-set override.
 * @returns {Object} { calories, protein, carbs, fats, water, burnGoal }
 */
export const computeDailyTargets = (profile = {}) => {
    // If the user has explicit overrides, use getNutritionGoals (respects overrides)
    if (profile.dailyCalories || profile.dailyProtein || profile.dailyCarbs || profile.dailyFats) {
        return getNutritionGoals(profile);
    }

    // If we have enough biometric data, compute using Mifflin-St Jeor
    const { weight, height, age, gender, goal, activityLevel } = profile;

    if (weight && height && age) {
        // Mifflin-St Jeor BMR equation
        let bmr;
        if (gender === 'female') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        }

        // Apply activity multiplier (default: lightly active 1.375)
        const multiplier = activityLevel || 1.375;
        let tdee = Math.round(bmr * multiplier);

        // Adjust for goal
        if (goal === 'lose') {
            tdee = Math.round(tdee * 0.8); // 20% deficit
        } else if (goal === 'gain') {
            tdee = Math.round(tdee * 1.15); // 15% surplus
        }

        // Macro split: protein 30%, carbs 40%, fats 30%
        const protein = Math.round((tdee * 0.30) / 4); // 4 cal/g
        const carbs = Math.round((tdee * 0.40) / 4);   // 4 cal/g
        const fats = Math.round((tdee * 0.30) / 9);    // 9 cal/g

        return {
            calories: tdee,
            protein,
            carbs,
            fats,
            water: profile.waterGoal || NUTRITION_DEFAULTS.water,
            burnGoal: profile.burnGoal || NUTRITION_DEFAULTS.burnGoal,
        };
    }

    // Fallback to hardcoded defaults
    return getNutritionGoals(profile);
};

export default { computeDailyTargets };
