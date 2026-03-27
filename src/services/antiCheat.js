/**
 * Anti-Cheat Validation Service (Client-Side Pre-Filter)
 *
 * Quick sanity checks before data hits the server.
 * The server-side validateWorkoutData Cloud Function is authoritative —
 * this is a fast pre-filter to catch obvious issues without a network round-trip.
 */

export const validateWorkout = (workoutData, userStats) => {
    const anomalies = [];

    // 1. Duration: flag > 4hrs or high volume in < 2mins
    if (workoutData.duration > 14400) {
        anomalies.push({ code: 'LONG_DURATION', msg: 'Duration > 4hrs' });
    } else if (workoutData.duration < 120 && workoutData.volume > 1000) {
        anomalies.push({ code: 'SHORT_DURATION', msg: 'High volume in < 2mins' });
    }

    // 2. Volume spike: > 200% of user's historical max
    if (userStats?.maxVolume) {
        const volumeIncrease = workoutData.volume / userStats.maxVolume;
        if (volumeIncrease > 2.0) {
            anomalies.push({ code: 'IMPOSSIBLE_STRENGTH', msg: '>200% volume increase' });
        }
    }

    // 3. Rapid-fire logging
    const lastWorkoutTime = userStats?.lastWorkoutTime ? new Date(userStats.lastWorkoutTime) : null;
    if (lastWorkoutTime) {
        const diffMinutes = (Date.now() - lastWorkoutTime.getTime()) / 60000;
        if (diffMinutes < 10 && workoutData.volume > 5000) {
            anomalies.push({ code: 'RAPID_LOGGING', msg: 'Heavy workout <10m from previous' });
        }
    }

    return {
        isValid: anomalies.length === 0,
        anomalies,
    };
};

export default { validateWorkout };
