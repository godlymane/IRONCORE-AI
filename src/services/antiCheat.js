/**
 * Anti-Cheat Validation Service (Client-Side Pre-Filter)
 *
 * Quick sanity checks before data hits the server.
 * The server-side validateWorkoutData Cloud Function is authoritative —
 * this is a fast pre-filter to catch obvious issues without a network round-trip.
 *
 * BLOCKING: If anomalies have severity 'block', the workout submission is rejected.
 * Advisory anomalies (severity 'warn') are logged but still allow submission.
 */

export const validateWorkout = (workoutData, userStats) => {
    const anomalies = [];

    // 1. Duration: block > 4hrs, warn high volume in < 2mins
    if (workoutData.duration > 14400) {
        anomalies.push({ code: 'LONG_DURATION', msg: 'Duration > 4hrs', severity: 'block' });
    } else if (workoutData.duration < 120 && workoutData.volume > 1000) {
        anomalies.push({ code: 'SHORT_DURATION', msg: 'High volume in < 2mins', severity: 'block' });
    }

    // 2. Volume spike: > 200% of user's historical max
    if (userStats?.maxVolume) {
        const volumeIncrease = workoutData.volume / userStats.maxVolume;
        if (volumeIncrease > 3.0) {
            anomalies.push({ code: 'IMPOSSIBLE_STRENGTH', msg: '>300% volume increase', severity: 'block' });
        } else if (volumeIncrease > 2.0) {
            anomalies.push({ code: 'VOLUME_SPIKE', msg: '>200% volume increase', severity: 'warn' });
        }
    }

    // 3. Rapid-fire logging — block heavy workouts logged back-to-back
    const lastWorkoutTime = userStats?.lastWorkoutTime ? new Date(userStats.lastWorkoutTime) : null;
    if (lastWorkoutTime) {
        const diffMinutes = (Date.now() - lastWorkoutTime.getTime()) / 60000;
        if (diffMinutes < 10 && workoutData.volume > 5000) {
            anomalies.push({ code: 'RAPID_LOGGING', msg: 'Heavy workout <10m from previous', severity: 'block' });
        }
    }

    // 4. Negative or zero values — always block
    if (workoutData.duration <= 0 || workoutData.volume < 0) {
        anomalies.push({ code: 'INVALID_VALUES', msg: 'Duration/volume must be positive', severity: 'block' });
    }

    // 5. Reps per set sanity — block > 500 reps in a single set
    if (workoutData.exercises) {
        for (const ex of workoutData.exercises) {
            for (const set of (ex.sets || [])) {
                if (set.reps > 500) {
                    anomalies.push({ code: 'IMPOSSIBLE_REPS', msg: `${ex.name}: ${set.reps} reps in one set`, severity: 'block' });
                }
            }
        }
    }

    const blocked = anomalies.some(a => a.severity === 'block');

    return {
        isValid: !blocked,
        anomalies,
        blocked,
    };
};

export default { validateWorkout };
