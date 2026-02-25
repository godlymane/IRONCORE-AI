import SwiftUI

/// Workout tab — mirrors React WorkoutView.jsx
/// Handles: exercise selection, set logging, volume tracking, rest timer
struct WorkoutTab: View {
    @EnvironmentObject var firestoreManager: FirestoreManager
    @EnvironmentObject var authManager: AuthManager

    @State private var isSessionActive = false
    @State private var sessionExercises: [Exercise] = []
    @State private var selectedExercise: ExerciseInfo?
    @State private var currentSets: [ExerciseSet] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if isSessionActive {
                        ActiveSessionView(
                            exercises: $sessionExercises,
                            onFinish: saveWorkout
                        )
                    } else {
                        // Start workout button
                        Button {
                            isSessionActive = true
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Start Workout")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Workout history
                        WorkoutHistoryList(workouts: firestoreManager.workouts)
                    }
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("Workout")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func saveWorkout() {
        guard let uid = authManager.currentUser?.uid,
              !sessionExercises.isEmpty else { return }

        let workout = Workout(
            date: todayDateString(),
            userId: uid,
            exercises: sessionExercises
        )

        Task {
            try? await firestoreManager.saveWorkout(uid: uid, workout: workout)
            await MainActor.run {
                isSessionActive = false
                sessionExercises = []
            }
        }
    }
}

// MARK: - Active Session View

struct ActiveSessionView: View {
    @Binding var exercises: [Exercise]
    let onFinish: () -> Void

    @State private var showExercisePicker = false

    var body: some View {
        VStack(spacing: 16) {
            // Current exercises
            ForEach(Array(exercises.enumerated()), id: \.offset) { index, exercise in
                ExerciseCard(exercise: exercise)
            }

            // Add exercise button
            Button {
                showExercisePicker = true
            } label: {
                HStack {
                    Image(systemName: "plus")
                    Text("Add Exercise")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white.opacity(0.1))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Finish workout
            if !exercises.isEmpty {
                Button(action: onFinish) {
                    Text("Finish Workout")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .sheet(isPresented: $showExercisePicker) {
            ExercisePickerSheet(exercises: $exercises)
        }
    }
}

struct ExerciseCard: View {
    let exercise: Exercise

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(exercise.name)
                .font(.headline)
                .foregroundStyle(.white)

            ForEach(Array(exercise.sets.enumerated()), id: \.offset) { index, set in
                HStack {
                    Text("Set \(index + 1)")
                        .font(.caption)
                        .foregroundStyle(.gray)
                    Spacer()
                    Text("\(set.w, specifier: "%.1f") kg x \(set.r)")
                        .font(.subheadline.monospaced())
                        .foregroundStyle(.white)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ExercisePickerSheet: View {
    @Binding var exercises: [Exercise]
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List(EXERCISE_DB, id: \.name) { info in
                Button {
                    exercises.append(Exercise(
                        name: info.name,
                        sets: [ExerciseSet(w: 0, r: 0)]
                    ))
                    dismiss()
                } label: {
                    VStack(alignment: .leading) {
                        Text(info.name)
                            .foregroundStyle(.white)
                        Text(info.muscle)
                            .font(.caption)
                            .foregroundStyle(.gray)
                    }
                }
            }
            .navigationTitle("Select Exercise")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
    }
}

struct WorkoutHistoryList: View {
    let workouts: [Workout]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("History")
                .font(.headline)
                .foregroundStyle(.white)

            ForEach(workouts.prefix(10)) { workout in
                HStack {
                    VStack(alignment: .leading) {
                        Text(workout.exercises.map(\.name).joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text(workout.date)
                            .font(.caption)
                            .foregroundStyle(.gray)
                    }
                    Spacer()
                    let volume = workout.exercises.reduce(0.0) { $0 + $1.totalVolume }
                    Text("\(Int(volume)) vol")
                        .font(.caption.bold())
                        .foregroundStyle(.red)
                }
                .padding(.vertical, 4)
            }
        }
    }
}
