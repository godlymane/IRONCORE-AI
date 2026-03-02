import Foundation
import FirebaseFirestore
import FirebaseAuth

// MARK: - Anti-Cheat Result Models

/// Result from a single validation layer
struct LayerResult {
    let layerName: String
    let isValid: Bool
    let flags: [String]
    let confidence: Double
}

/// Aggregate result from all anti-cheat checks
struct AntiCheatResult {
    let isValid: Bool
    let overallConfidence: Double
    let flags: [String]
    let layerResults: [LayerResult]
    let timestamp: Date

    /// Whether the workout should be marked suspicious
    var isSuspicious: Bool { overallConfidence < 0.5 }
}

/// Anomaly code for categorizing flags
enum AnomalyCode: String {
    case durationTooShort = "DURATION_TOO_SHORT"
    case durationTooLong = "DURATION_TOO_LONG"
    case highVolumeShortDuration = "HIGH_VOLUME_SHORT_DURATION"
    case impossibleLoad = "IMPOSSIBLE_LOAD"
    case volumeSpike = "VOLUME_SPIKE"
    case rapidLogging = "RAPID_LOGGING"
    case setTimingTooFast = "SET_TIMING_TOO_FAST"
    case gpsSpeedAnomaly = "GPS_SPEED_ANOMALY"
    case gpsLocationJump = "GPS_LOCATION_JUMP"
    case noMotionDetected = "NO_MOTION_DETECTED"
    case motionPatternAnomaly = "MOTION_PATTERN_ANOMALY"
}

// MARK: - Anti-Cheat Service

/// Multi-layer workout validation — mirrors antiCheat.js from React prototype
/// Called silently after every workout save to maintain competitive integrity
///
/// 5 Validation Layers:
///   1. Duration Check — workout time within realistic bounds
///   2. Strength/Load Check — per-exercise weight limits
///   3. Timing Check — minimum rest between sets
///   4. GPS Check (stub) — location verification
///   5. Accelerometer Check (stub) — motion verification
final class AntiCheatService {
    static let shared = AntiCheatService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Exercise Weight Limits (kg)

    /// Maximum realistic weights per exercise (world record territory)
    private let exerciseLimits: [String: Double] = [
        "bench press": 500,
        "squat": 600,
        "deadlift": 500,
        "overhead press": 200,
        "ohp": 200,
        "barbell row": 300,
        "bicep curl": 100,
        "curl": 100,
        "tricep pushdown": 150,
        "lateral raise": 60,
        "leg press": 1000,
        "leg curl": 200,
        "calf raise": 400,
        "incline db press": 100, // per dumbbell
        "romanian deadlift": 400,
        "pull-ups": 200, // body weight + added
        "face pulls": 100,
    ]

    // MARK: - Main Validation Entry Point

    /// Validate a completed workout through all 5 layers
    /// - Parameters:
    ///   - workout: The workout data dictionary
    ///   - userStats: Optional historical stats for the user (maxVolume, lastWorkoutTime, etc.)
    /// - Returns: AntiCheatResult with validation outcome
    func validateWorkout(_ workout: [String: Any], userStats: [String: Any]? = nil) -> AntiCheatResult {
        var allFlags: [String] = []
        var layerResults: [LayerResult] = []

        // Layer 1: Duration Check
        let durationResult = validateDuration(workout)
        layerResults.append(durationResult)
        allFlags.append(contentsOf: durationResult.flags)

        // Layer 2: Strength/Load Check
        let strengthResult = validateStrength(workout, userStats: userStats)
        layerResults.append(strengthResult)
        allFlags.append(contentsOf: strengthResult.flags)

        // Layer 3: Timing Check
        let timingResult = validateTiming(workout, userStats: userStats)
        layerResults.append(timingResult)
        allFlags.append(contentsOf: timingResult.flags)

        // Layer 4: GPS Check (stub)
        let gpsResult = validateGPS(workout)
        layerResults.append(gpsResult)
        allFlags.append(contentsOf: gpsResult.flags)

        // Layer 5: Accelerometer Check (stub)
        let accelResult = validateAccelerometer(workout)
        layerResults.append(accelResult)
        allFlags.append(contentsOf: accelResult.flags)

        // Calculate overall confidence
        // Start at 1.0, subtract 0.2 per flag, floor at 0
        let overallConfidence = max(0.0, 1.0 - (Double(allFlags.count) * 0.2))
        let isValid = allFlags.isEmpty

        let result = AntiCheatResult(
            isValid: isValid,
            overallConfidence: overallConfidence,
            flags: allFlags,
            layerResults: layerResults,
            timestamp: Date()
        )

        // Log suspicious workouts
        if result.isSuspicious {
            logSuspiciousWorkout(workout: workout, result: result)
        }

        return result
    }

    // MARK: - Layer 1: Duration Validation

    /// Workout duration must be between 5 minutes and 4 hours
    private func validateDuration(_ workout: [String: Any]) -> LayerResult {
        var flags: [String] = []
        let durationSeconds = workout["duration"] as? Double
            ?? workout["durationSeconds"] as? Double
            ?? 0

        let durationMinutes = durationSeconds / 60.0

        // Too short (less than 5 minutes)
        if durationMinutes < 5 && durationMinutes > 0 {
            flags.append("[\(AnomalyCode.durationTooShort.rawValue)] Duration \(String(format: "%.1f", durationMinutes))min < 5min minimum")
        }

        // Too long (more than 4 hours = 240 minutes)
        if durationMinutes > 240 {
            flags.append("[\(AnomalyCode.durationTooLong.rawValue)] Duration \(String(format: "%.0f", durationMinutes))min > 4hr maximum")
        }

        // High volume in very short time
        let volume = workout["volume"] as? Double ?? workout["totalVolume"] as? Double ?? 0
        if durationMinutes < 5 && volume > 1000 {
            flags.append("[\(AnomalyCode.highVolumeShortDuration.rawValue)] \(Int(volume))kg volume in < 5min")
        }

        let confidence = flags.isEmpty ? 1.0 : max(0.0, 1.0 - Double(flags.count) * 0.3)
        return LayerResult(layerName: "Duration", isValid: flags.isEmpty, flags: flags, confidence: confidence)
    }

    // MARK: - Layer 2: Strength/Load Validation

    /// Check each exercise against per-exercise maximum weights
    private func validateStrength(_ workout: [String: Any], userStats: [String: Any]?) -> LayerResult {
        var flags: [String] = []

        if let exercises = workout["exercises"] as? [[String: Any]] {
            for exercise in exercises {
                let name = (exercise["name"] as? String ?? "").lowercased()
                let weight = exercise["weight"] as? Double ?? 0

                // Check against absolute maximums
                for (exerciseKey, maxWeight) in exerciseLimits {
                    if name.contains(exerciseKey) && weight > maxWeight {
                        flags.append("[\(AnomalyCode.impossibleLoad.rawValue)] \(exercise["name"] ?? "Exercise"): \(Int(weight))kg > \(Int(maxWeight))kg limit")
                    }
                }
            }
        }

        // Check for volume spike vs user history
        if let maxVolume = userStats?["maxVolume"] as? Double, maxVolume > 0 {
            let currentVolume = workout["volume"] as? Double ?? workout["totalVolume"] as? Double ?? 0
            let volumeRatio = currentVolume / maxVolume
            if volumeRatio > 2.0 {
                flags.append("[\(AnomalyCode.volumeSpike.rawValue)] Volume \(Int(currentVolume))kg is >\(Int(volumeRatio * 100))% of historical max")
            }
        }

        let confidence = flags.isEmpty ? 1.0 : max(0.0, 1.0 - Double(flags.count) * 0.25)
        return LayerResult(layerName: "Strength", isValid: flags.isEmpty, flags: flags, confidence: confidence)
    }

    // MARK: - Layer 3: Timing Validation

    /// Minimum 30s between sets, check for rapid-fire logging
    private func validateTiming(_ workout: [String: Any], userStats: [String: Any]?) -> LayerResult {
        var flags: [String] = []

        // Check set timestamps if available
        if let exercises = workout["exercises"] as? [[String: Any]] {
            for exercise in exercises {
                if let sets = exercise["completedSets"] as? [[String: Any]], sets.count >= 2 {
                    for i in 1..<sets.count {
                        let prevTime = sets[i - 1]["timestamp"] as? Double ?? 0
                        let currTime = sets[i]["timestamp"] as? Double ?? 0

                        if prevTime > 0 && currTime > 0 {
                            let diffSeconds = currTime - prevTime
                            if diffSeconds < 30 && diffSeconds > 0 {
                                flags.append("[\(AnomalyCode.setTimingTooFast.rawValue)] \(exercise["name"] ?? "Exercise") set \(i): \(Int(diffSeconds))s between sets (min 30s)")
                            }
                        }
                    }
                }
            }
        }

        // Check time since last workout
        if let lastWorkoutTimeStr = userStats?["lastWorkoutTime"] as? String,
           let lastWorkoutTime = ISO8601DateFormatter().date(from: lastWorkoutTimeStr) {
            let diffMinutes = Date().timeIntervalSince(lastWorkoutTime) / 60.0
            let volume = workout["volume"] as? Double ?? workout["totalVolume"] as? Double ?? 0
            if diffMinutes < 10 && volume > 5000 {
                flags.append("[\(AnomalyCode.rapidLogging.rawValue)] Heavy workout (\(Int(volume))kg) logged < 10min from previous")
            }
        }

        let confidence = flags.isEmpty ? 1.0 : max(0.0, 1.0 - Double(flags.count) * 0.2)
        return LayerResult(layerName: "Timing", isValid: flags.isEmpty, flags: flags, confidence: confidence)
    }

    // MARK: - Layer 4: GPS Validation (Stub)

    /// Placeholder for location verification
    /// Future: verify user isn't moving at car/plane speed during workout
    private func validateGPS(_ workout: [String: Any]) -> LayerResult {
        var flags: [String] = []

        if let gps = workout["gps"] as? [String: Any] {
            // Check for impossible speed (> 50 km/h while "working out")
            if let speed = gps["speed"] as? Double, speed > 50 {
                flags.append("[\(AnomalyCode.gpsSpeedAnomaly.rawValue)] Moving at \(Int(speed))km/h during workout")
            }

            // Check for location jumps (teleporting)
            if let startLat = gps["startLat"] as? Double,
               let startLng = gps["startLng"] as? Double,
               let endLat = gps["endLat"] as? Double,
               let endLng = gps["endLng"] as? Double {
                let distance = haversineDistance(lat1: startLat, lng1: startLng, lat2: endLat, lng2: endLng)
                let duration = workout["duration"] as? Double ?? workout["durationSeconds"] as? Double ?? 3600
                let speedKmH = (distance / 1000) / (duration / 3600)

                if speedKmH > 100 {
                    flags.append("[\(AnomalyCode.gpsLocationJump.rawValue)] Location moved \(Int(distance))m in \(Int(duration))s")
                }
            }
        }

        // GPS is optional — always valid if no GPS data
        let confidence = flags.isEmpty ? 1.0 : 0.5
        return LayerResult(layerName: "GPS", isValid: flags.isEmpty, flags: flags, confidence: confidence)
    }

    // MARK: - Layer 5: Accelerometer Validation (Stub)

    /// Placeholder for motion pattern analysis
    /// Future: use CoreMotion to detect if the phone was actually moving during exercises
    private func validateAccelerometer(_ workout: [String: Any]) -> LayerResult {
        var flags: [String] = []

        if let motionData = workout["motionData"] as? [String: Any] {
            // Check for no motion (phone sitting still the entire workout)
            if let variance = motionData["variance"] as? Double, variance < 0.1 {
                flags.append("[\(AnomalyCode.noMotionDetected.rawValue)] Device was stationary during workout")
            }

            // Check for unnatural motion patterns
            if let peakAcceleration = motionData["peakAcceleration"] as? Double,
               peakAcceleration > 50 { // 50g is car-crash territory
                flags.append("[\(AnomalyCode.motionPatternAnomaly.rawValue)] Unnatural acceleration: \(Int(peakAcceleration))g detected")
            }
        }

        // Accelerometer is optional — always valid if no motion data
        let confidence = flags.isEmpty ? 1.0 : 0.6
        return LayerResult(layerName: "Accelerometer", isValid: flags.isEmpty, flags: flags, confidence: confidence)
    }

    // MARK: - Logging

    /// Log suspicious workout to Firestore for admin review
    private func logSuspiciousWorkout(workout: [String: Any], result: AntiCheatResult) {
        guard let uid = workout["userId"] as? String ?? Auth.auth().currentUser?.uid else {
            print("[AntiCheat] Cannot log — no userId")
            return
        }

        let logData: [String: Any] = [
            "userId": uid,
            "confidence": result.overallConfidence,
            "flags": result.flags,
            "layerSummary": result.layerResults.map { [
                "layer": $0.layerName,
                "valid": $0.isValid,
                "confidence": $0.confidence,
                "flagCount": $0.flags.count
            ]},
            "workoutDate": workout["date"] as? String ?? FirestoreService.todayString(),
            "workoutDuration": workout["duration"] ?? workout["durationSeconds"] ?? 0,
            "workoutVolume": workout["volume"] ?? workout["totalVolume"] ?? 0,
            "timestamp": FieldValue.serverTimestamp()
        ]

        db.collection("antiCheatLogs").document(uid).collection("logs")
            .addDocument(data: logData) { error in
                if let error = error {
                    print("[AntiCheat] Failed to log anomaly: \(error.localizedDescription)")
                } else {
                    print("[AntiCheat] Suspicious workout logged for user: \(uid)")
                }
            }
    }

    // MARK: - Risk Score

    /// Get cumulative cheat risk score for a user (0-100)
    /// 0 = clean, 100 = extremely suspicious
    func getCheatRiskScore(uid: String) async throws -> Int {
        let snapshot = try await db.collection("antiCheatLogs").document(uid)
            .collection("logs")
            .order(by: "timestamp", descending: true)
            .limit(to: 50)
            .getDocuments()

        var riskScore = 0
        for doc in snapshot.documents {
            let flagCount = (doc.data()["flags"] as? [String])?.count ?? 0
            riskScore += flagCount * 10
        }

        return min(100, riskScore)
    }

    // MARK: - Helpers

    /// Haversine formula for distance between two GPS coordinates (meters)
    private func haversineDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
        let R = 6371000.0 // Earth radius in meters
        let dLat = (lat2 - lat1) * .pi / 180
        let dLng = (lng2 - lng1) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLng / 2) * sin(dLng / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c
    }
}
