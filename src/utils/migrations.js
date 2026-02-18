/**
 * Data Migration / Schema Versioning System
 *
 * Each migration has a version number and an `up` function that receives
 * the current profile data and returns a patch object to merge.
 * Migrations run once per user, tracked by `schemaVersion` in their profile doc.
 */

export const CURRENT_SCHEMA_VERSION = 2;

const migrations = [
    {
        version: 1,
        description: 'Normalize profile fields — ensure dailyCalories and macros exist',
        up: (profile) => {
            const patch = {};
            if (!profile.dailyCalories && profile.weight) {
                // Estimate TDEE from weight using Mifflin-St Jeor baseline
                const weight = parseFloat(profile.weight) || 70;
                const height = parseFloat(profile.height || profile.heightCm) || 170;
                const age = parseInt(profile.age) || 25;
                const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
                patch.dailyCalories = Math.round(bmr * 1.55);
            }
            if (!profile.proteinGoal) patch.proteinGoal = Math.round((parseFloat(profile.weight) || 70) * 2);
            if (!profile.carbGoal) patch.carbGoal = 200;
            if (!profile.fatGoal) patch.fatGoal = 60;
            return patch;
        },
    },
    {
        version: 2,
        description: 'Add startingWeight field from first progress entry or current weight',
        up: (profile, { progress = [] } = {}) => {
            if (profile.startingWeight) return {};
            const earliest = [...progress]
                .filter(p => p.weight)
                .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
            return { startingWeight: earliest?.weight || profile.weight || null };
        },
    },
];

/**
 * Run pending migrations for a user.
 * @param {object} profile - Current profile data
 * @param {object} collections - { progress, meals, workouts } for migrations that need them
 * @param {function} updateProfile - async (patch) => void  — merges patch into profile doc
 * @returns {object} { migrated: boolean, fromVersion: number, toVersion: number }
 */
export async function runMigrations(profile, collections, updateProfile) {
    const currentVersion = profile.schemaVersion || 0;

    if (currentVersion >= CURRENT_SCHEMA_VERSION) {
        return { migrated: false, fromVersion: currentVersion, toVersion: currentVersion };
    }

    const pending = migrations.filter(m => m.version > currentVersion);
    let combinedPatch = {};

    for (const migration of pending) {
        console.log(`Running migration v${migration.version}: ${migration.description}`);
        const patch = migration.up(
            { ...profile, ...combinedPatch },
            collections
        );
        combinedPatch = { ...combinedPatch, ...patch };
    }

    combinedPatch.schemaVersion = CURRENT_SCHEMA_VERSION;

    await updateProfile(combinedPatch);

    return {
        migrated: true,
        fromVersion: currentVersion,
        toVersion: CURRENT_SCHEMA_VERSION,
    };
}
