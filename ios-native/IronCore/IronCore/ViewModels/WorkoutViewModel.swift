import Foundation
import FirebaseFirestore
import UIKit

/// Workout session data — mirrors WorkoutView.jsx state + logic
@MainActor
final class WorkoutViewModel: ObservableObject {

    // MARK: - Session State

    @Published var isSessionActive = false
    @Published var sessionName = ""
    @Published var sessionExercises: [SessionExercise] = []
    @Published var elapsed: Int = 0

    // Rest Timer
    @Published var restTimer: Int = 0
    @Published var isResting = false
    @Published var defaultRest: Int = 90

    // History
    @Published var workouts: [[String: Any]] = []
    @Published var dataLoaded = false

    // Post-workout
    @Published var showUpsell = false

    // Iron Tools modal
    @Published var showTools = false

    private let firestore = FirestoreService.shared
    private var workoutsListener: ListenerRegistration?
    private var sessionTimer: Timer?
    private var restCountdown: Timer?

    // MARK: - Data Models

    struct SetData: Identifiable {
        let id = UUID()
        var weight: String = ""
        var reps: String = ""
        var rpe: String = ""
        var completed: Bool = false
    }

    struct SessionExercise: Identifiable {
        let id: Int // Date.now() equivalent
        var name: String
        var isCustom: Bool = false
        var sets: [SetData]
        var pr: Double = 0
    }

    // MARK: - Start Listening (workout history)

    func startListening(uid: String) {
        workoutsListener = firestore.listenToWorkouts(uid: uid) { [weak self] docs in
            Task { @MainActor in
                self?.workouts = docs
                self?.dataLoaded = true
            }
        }
    }

    func stopListening() {
        workoutsListener?.remove()
        stopSessionTimer()
        stopRestTimer()
    }

    // MARK: - Ghost Sets (previous workout data as placeholders)

    func ghostSet(for exerciseName: String, setIndex: Int) -> (w: String, r: String)? {
        for w in workouts {
            guard let exercises = w["exercises"] as? [[String: Any]] else { continue }
            for ex in exercises {
                guard let name = ex["name"] as? String, name == exerciseName,
                      let sets = ex["sets"] as? [[String: Any]],
                      setIndex < sets.count else { continue }
                let s = sets[setIndex]
                let w = "\(s["w"] ?? "")"
                let r = "\(s["r"] ?? "")"
                if !w.isEmpty || !r.isEmpty { return (w, r) }
            }
        }
        return nil
    }

    // MARK: - PR Detection (max weight ever lifted for exercise)

    func getPR(for exerciseName: String) -> Double {
        var maxWeight: Double = 0
        for w in workouts {
            guard let exercises = w["exercises"] as? [[String: Any]] else { continue }
            for ex in exercises where (ex["name"] as? String) == exerciseName {
                guard let sets = ex["sets"] as? [[String: Any]] else { continue }
                for s in sets {
                    let weight: Double
                    if let d = s["w"] as? Double { weight = d }
                    else if let i = s["w"] as? Int { weight = Double(i) }
                    else if let str = s["w"] as? String { weight = Double(str) ?? 0 }
                    else { weight = 0 }
                    if weight > maxWeight { maxWeight = weight }
                }
            }
        }
        return maxWeight
    }

    // MARK: - Session Actions

    func startSession() {
        sessionName = "Workout #\(workouts.count + 1)"
        sessionExercises = []
        elapsed = 0
        isSessionActive = true
        startSessionTimer()
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    func addExercise() {
        let defaultName = ExerciseDB.names.first ?? "Barbell Squat"
        let exercise = SessionExercise(
            id: Int(Date().timeIntervalSince1970 * 1000),
            name: defaultName,
            sets: [SetData()],
            pr: getPR(for: defaultName)
        )
        sessionExercises.append(exercise)
    }

    func removeExercise(_ id: Int) {
        sessionExercises.removeAll { $0.id == id }
    }

    func updateExerciseName(_ id: Int, name: String) {
        guard let idx = sessionExercises.firstIndex(where: { $0.id == id }) else { return }
        sessionExercises[idx].name = name
        sessionExercises[idx].pr = getPR(for: name)
    }

    func toggleCustomMode(_ id: Int) {
        guard let idx = sessionExercises.firstIndex(where: { $0.id == id }) else { return }
        sessionExercises[idx].isCustom.toggle()
        if !sessionExercises[idx].isCustom {
            sessionExercises[idx].name = ExerciseDB.names.first ?? ""
        } else {
            sessionExercises[idx].name = ""
        }
    }

    func updateSet(exerciseId: Int, setIndex: Int, field: SetField, value: String) {
        guard let exIdx = sessionExercises.firstIndex(where: { $0.id == exerciseId }),
              setIndex < sessionExercises[exIdx].sets.count else { return }
        switch field {
        case .weight: sessionExercises[exIdx].sets[setIndex].weight = value
        case .reps: sessionExercises[exIdx].sets[setIndex].reps = value
        case .rpe:
            let clamped = min(10, max(1, Int(value) ?? 0))
            sessionExercises[exIdx].sets[setIndex].rpe = value.isEmpty ? "" : "\(clamped)"
        }
    }

    enum SetField { case weight, reps, rpe }

    func toggleSetComplete(exerciseId: Int, setIndex: Int) {
        guard let exIdx = sessionExercises.firstIndex(where: { $0.id == exerciseId }),
              setIndex < sessionExercises[exIdx].sets.count else { return }
        let isNowComplete = !sessionExercises[exIdx].sets[setIndex].completed
        sessionExercises[exIdx].sets[setIndex].completed = isNowComplete

        if isNowComplete {
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            startRestTimer()
        }
    }

    func addSet(to exerciseId: Int) {
        guard let idx = sessionExercises.firstIndex(where: { $0.id == exerciseId }) else { return }
        sessionExercises[idx].sets.append(SetData())
    }

    // MARK: - Finish Session (save to Firestore)

    func finishSession(uid: String) async {
        guard !sessionExercises.isEmpty else {
            isSessionActive = false
            stopSessionTimer()
            return
        }

        // Build exercises payload
        let exercisesPayload: [[String: Any]] = sessionExercises.map { ex in
            let setsPayload: [[String: Any]] = ex.sets.map { s in
                [
                    "w": clampWeight(s.weight),
                    "r": clampReps(s.reps),
                    "rpe": s.rpe,
                    "completed": s.completed
                ]
            }
            return [
                "id": ex.id,
                "name": ex.name,
                "isCustom": ex.isCustom,
                "sets": setsPayload,
                "pr": ex.pr
            ]
        }

        // Save workout
        try? await firestore.addWorkout(uid: uid, workout: [
            "name": sessionName,
            "exercises": exercisesPayload,
            "duration": elapsed
        ])

        // Calculate and save 1RM records
        var oneRMUpdates: [String: Any] = [:]
        for ex in sessionExercises {
            var best1RM = 0
            for s in ex.sets {
                let weight = Double(s.weight) ?? 0
                let reps = Double(s.reps) ?? 0
                guard weight > 0, reps > 0, reps <= 30 else { continue }
                let estimated = Int(round(weight * (1 + reps / 30)))
                if estimated > best1RM { best1RM = estimated }
            }
            if best1RM > 0 {
                oneRMUpdates["oneRMRecords.\(ex.name)"] = best1RM
            }
        }
        if !oneRMUpdates.isEmpty {
            try? await firestore.saveProfile(uid: uid, data: oneRMUpdates)
        }

        // Award XP (+50 for workout)
        try? await firestore.saveProfile(uid: uid, data: [
            "xp": FieldValue.increment(Int64(50))
        ])

        isSessionActive = false
        stopSessionTimer()
        UINotificationFeedbackGenerator().notificationOccurred(.success)

        showUpsell = true

        // Track for App Store review prompt (triggers after 3+ workouts)
        ReviewManager.shared.recordCompletedWorkout()
    }

    func discardSession() {
        isSessionActive = false
        stopSessionTimer()
        stopRestTimer()
    }

    // MARK: - Delete Workout

    func deleteWorkout(uid: String, workoutId: String) async {
        try? await firestore.deleteWorkout(uid: uid, workoutId: workoutId)
    }

    // MARK: - Rest Timer

    func startRestTimer() {
        restTimer = defaultRest
        isResting = true
        restCountdown?.invalidate()
        restCountdown = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if self.restTimer > 0 {
                    self.restTimer -= 1
                } else {
                    self.isResting = false
                    self.restCountdown?.invalidate()
                    UINotificationFeedbackGenerator().notificationOccurred(.warning)
                }
            }
        }
    }

    func extendRest() {
        restTimer += 30
    }

    func cancelRest() {
        isResting = false
        restTimer = 0
        restCountdown?.invalidate()
    }

    private func stopRestTimer() {
        restCountdown?.invalidate()
        isResting = false
        restTimer = 0
    }

    // MARK: - Session Timer

    private func startSessionTimer() {
        sessionTimer?.invalidate()
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.elapsed += 1
            }
        }
    }

    private func stopSessionTimer() {
        sessionTimer?.invalidate()
    }

    // MARK: - Iron Tools

    static func calculate1RM(weight: Double, reps: Double) -> Int {
        guard weight > 0, reps > 0 else { return 0 }
        return Int(round(weight * (1 + reps / 30)))
    }

    struct PlateInfo: Identifiable {
        let id = UUID()
        let weight: Double
        let colorName: String // mapped to SwiftUI colors in the view
    }

    static func calculatePlates(targetWeight: Double) -> [PlateInfo] {
        guard targetWeight >= 20 else { return [] }
        var remaining = (targetWeight - 20) / 2 // per side, minus bar
        var plates: [PlateInfo] = []
        let types: [(w: Double, c: String)] = [
            (25, "red"), (20, "orange"), (15, "yellow"),
            (10, "green"), (5, "white"), (2.5, "gray"), (1.25, "darkGray")
        ]
        for plate in types {
            while remaining >= plate.w {
                plates.append(PlateInfo(weight: plate.w, colorName: plate.c))
                remaining -= plate.w
            }
        }
        return plates
    }

    // MARK: - Helpers

    func formatTime(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return "\(m):\(String(format: "%02d", s))"
    }

    /// Bounds-check weight: 0-2000 kg (matches React validation)
    private func clampWeight(_ val: String) -> Double {
        let v = Double(val) ?? 0
        return max(0, min(2000, v))
    }

    /// Bounds-check reps: 0-1000 (matches React validation)
    private func clampReps(_ val: String) -> Double {
        let v = Double(val) ?? 0
        return max(0, min(1000, v))
    }
}
