/**
 * Anti-Cheat Validation Service
 * Implements multi-layer validation for workout integrity
 */

// Simple local storage mock for demo purposes if backend isn't connected
const ANOMALY_LOG = 'ironcore_anomalies';

export const validateWorkout = async (workoutData, userStats) => {
    const anomalies = [];
    const checks = {
        duration: true,
        strength: true,
        timing: true,
        location: true,
        motion: true
    };

    // 1. Duration Validation
    // Flag entries longer than 4 hours (14400 seconds) or less than 2 minutes
    if (workoutData.duration > 14400) {
        checks.duration = false;
        anomalies.push({ code: 'LONG_DURATION', msg: 'Duration > 4hrs' });
    } else if (workoutData.duration < 120 && workoutData.volume > 1000) {
        checks.duration = false;
        anomalies.push({ code: 'SHORT_DURATION', msg: 'High volume in < 2mins' });
    }

    // 2. Strength/Load Validation
    // Check against user's max stats (if available)
    // For demo, we'll assume a theoretical max based on weight class or history
    if (userStats?.maxVolume) {
        const volumeIncrease = workoutData.volume / userStats.maxVolume;
        if (volumeIncrease > 2.0) { // >200% increase in one session is suspicious
            checks.strength = false;
            anomalies.push({ code: 'IMPOSSIBLE_STRENGTH', msg: '>200% volume increase' });
        }
    }

    // 3. Timing Patterns
    // Check for rapid-fire logging (e.g., multiple heavy workouts in 1 hour)
    const lastWorkoutTime = userStats?.lastWorkoutTime ? new Date(userStats.lastWorkoutTime) : null;
    if (lastWorkoutTime) {
        const diffMinutes = (Date.now() - lastWorkoutTime.getTime()) / 60000;
        if (diffMinutes < 10 && workoutData.volume > 5000) {
            checks.timing = false;
            anomalies.push({ code: 'RAPID_LOGGING', msg: 'Heavy workout <10m from previous' });
        }
    }

    // 4. GPS/Location (Mock)
    // Real implementation would verify coordinates aren't jumping impossibly
    if (workoutData.gps && workoutData.gps.speed > 50) { // Moving > 50km/h
        checks.location = false;
        anomalies.push({ code: 'GPS_SPEED', msg: 'Moving too fast for workout' });
    }

    // 5. Accelerometer/Motion (Mock)
    // Real implementation would analyze gravity sensor data patterns
    if (workoutData.motionData && workoutData.motionData.variance < 0.1) {
        checks.motion = false;
        anomalies.push({ code: 'NO_MOTION', msg: 'Device was stationary' });
    }

    // Determine Result
    const isValid = anomalies.length === 0;

    if (!isValid) {
        logAnomaly(workoutData.userId, anomalies);
    }

    return {
        isValid,
        anomalies,
        timestamp: new Date().toISOString()
    };
};

const logAnomaly = (userId, problems) => {
    const log = JSON.parse(localStorage.getItem(ANOMALY_LOG) || '[]');
    log.push({
        userId,
        problems,
        date: new Date().toISOString()
    });
    localStorage.setItem(ANOMALY_LOG, JSON.stringify(log));
    console.warn('⚠️ Anti-Cheat Anomaly Detected:', problems);
};

export const getCheatRiskScore = (userId) => {
    const log = JSON.parse(localStorage.getItem(ANOMALY_LOG) || '[]');
    const userEntries = log.filter(l => l.userId === userId);

    // Simple risk calculation
    // 0-10: Low, 11-40: Medium, 41+: High
    let riskScore = 0;
    userEntries.forEach(entry => {
        riskScore += entry.problems.length * 10;
    });

    return Math.min(100, riskScore);
};

export default {
    validateWorkout,
    getCheatRiskScore
};


