/**
 * Workout Service - calorie estimation and workout utilities
 */
import { DEFAULT_MET } from '../utils/constants';

/**
 * MET values by exercise type.
 * Source: Compendium of Physical Activities.
 */
const MET_TABLE = {
    treadmill: 7.0,
    running: 8.0,
    walking: 3.5,
    cycling: 6.0,
    swimming: 6.0,
    rowing: 7.0,
    elliptical: 5.0,
    jump_rope: 10.0,
    hiit: 8.0,
    yoga: 2.5,
    stretching: 2.3,
    pilates: 3.0,
    weight_training: 5.0,
    calisthenics: 4.0,
    boxing: 7.5,
    martial_arts: 7.0,
    dance: 5.0,
    stair_climbing: 9.0,
    hiking: 5.5,
};

/**
 * Calculate calories burned for a given exercise.
 *
 * @param {string} exerciseType - Type of exercise (e.g. 'running', 'cycling').
 * @param {number} durationMin - Duration in minutes.
 * @param {number} bodyWeightKg - User's body weight in kilograms.
 * @returns {number} Estimated calories burned (always a valid number, never NaN).
 */
export const calcCalories = (exerciseType, durationMin, bodyWeightKg) => {
    const met = MET_TABLE[(exerciseType || '').toLowerCase()] || DEFAULT_MET;
    const duration = Number(durationMin) || 0;
    const weight = Number(bodyWeightKg) || 70; // fallback to 70kg — calorie estimate may be inaccurate
    if (!bodyWeightKg) console.debug('[calcCalories] bodyWeightKg missing, using 70kg fallback');

    // Standard MET calorie formula: (MET * 3.5 * bodyWeightKg / 200) * durationMin
    const calories = (met * 3.5 * weight / 200) * duration;

    return Math.round(calories) || 0;
};

/**
 * Look up the MET value for an exercise type, with DEFAULT_MET fallback.
 */
export const getMET = (exerciseType) => {
    return MET_TABLE[(exerciseType || '').toLowerCase()] || DEFAULT_MET;
};

export default { calcCalories, getMET };
