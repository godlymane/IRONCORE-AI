import SwiftUI

/// Workout tracking — mirrors WorkoutView.jsx
/// Two modes: Active Session (logging) and History (past workouts)
struct WorkoutView: View {
    let uid: String
    @StateObject private var vm = WorkoutViewModel()

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.ignoresSafeArea()

            if vm.isSessionActive {
                ActiveSessionView(uid: uid, vm: vm)
            } else {
                WorkoutHistoryView(uid: uid, vm: vm)
            }

            // Rest Timer Overlay
            if vm.isResting {
                RestTimerOverlay(vm: vm)
            }
        }
        .onAppear { vm.startListening(uid: uid) }
        .onDisappear { vm.stopListening() }
        .sheet(isPresented: $vm.showTools) {
            IronToolsSheet()
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }
}

// MARK: - Active Session View

private struct ActiveSessionView: View {
    let uid: String
    @ObservedObject var vm: WorkoutViewModel

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                // Sticky-ish header
                sessionHeader
                    .padding(.bottom, 8)

                // Exercise Cards
                ForEach(Array(vm.sessionExercises.enumerated()), id: \.element.id) { index, exercise in
                    ExerciseCard(vm: vm, exercise: exercise)
                }

                // Add Exercise Button
                Button { vm.addExercise() } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Add Exercise")
                    }
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                            .foregroundColor(Color.white.opacity(0.1))
                    )
                }

                Spacer(minLength: 120)
            }
            .padding(.horizontal, 16)
        }

        // Bottom Action Buttons
        VStack {
            Spacer()
            HStack(spacing: 12) {
                // Discard
                Button {
                    vm.discardSession()
                } label: {
                    Text("Discard")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.ironRedLight)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.ironRed.opacity(0.15))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                        )
                }

                // Finish Workout
                Button {
                    Task { await vm.finishSession(uid: uid) }
                } label: {
                    Text("Finish Workout")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.green.opacity(0.9), Color.green.opacity(0.7)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
    }

    private var sessionHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("LIVE SESSION")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(.green)
                        .tracking(2)
                }

                TextField("Workout Name", text: $vm.sessionName)
                    .font(.system(size: 20, weight: .black))
                    .foregroundColor(.white)
            }

            Spacer()

            HStack(spacing: 12) {
                Button { vm.showTools = true } label: {
                    Image(systemName: "function")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.ironRedLight)
                        .padding(10)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.06))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                }

                Text(vm.formatTime(vm.elapsed))
                    .font(.system(size: 20, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.06))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    )
            }
        }
    }
}

// MARK: - Exercise Card

private struct ExerciseCard: View {
    @ObservedObject var vm: WorkoutViewModel
    let exercise: WorkoutViewModel.SessionExercise

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        if exercise.isCustom {
                            TextField("Exercise Name...", text: Binding(
                                get: { exercise.name },
                                set: { vm.updateExerciseName(exercise.id, name: $0) }
                            ))
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .padding(8)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.black.opacity(0.4))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                                    )
                            )
                        } else {
                            Menu {
                                ForEach(ExerciseDB.names, id: \.self) { name in
                                    Button(name) {
                                        vm.updateExerciseName(exercise.id, name: name)
                                    }
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Text(exercise.name)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                }
                            }
                        }

                        Button { vm.toggleCustomMode(exercise.id) } label: {
                            Image(systemName: exercise.isCustom ? "list.bullet" : "pencil")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                                .padding(8)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.white.opacity(0.06))
                                )
                        }
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.yellow)
                        Text("PR: \(exercise.pr > 0 ? "\(Int(exercise.pr))kg" : "None")")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(Color.gray.opacity(0.5))
                            .tracking(1)
                    }
                }

                Spacer()

                Button { vm.removeExercise(exercise.id) } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .padding(8)
                }
            }

            // Sets Table Header
            HStack(spacing: 0) {
                Text("#").frame(width: 28)
                Text("KG").frame(maxWidth: .infinity)
                Text("REPS").frame(maxWidth: .infinity)
                Text("RPE").frame(width: 48)
                Text("").frame(width: 44) // checkmark column
            }
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(Color.gray.opacity(0.5))

            // Sets
            ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { sIdx, set in
                SetRow(vm: vm, exercise: exercise, set: set, index: sIdx)
            }

            // Add Set
            Button { vm.addSet(to: exercise.id) } label: {
                Text("+ Add Set")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(style: StrokeStyle(lineWidth: 1, dash: [6]))
                            .foregroundColor(Color.white.opacity(0.1))
                    )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }
}

// MARK: - Set Row

private struct SetRow: View {
    @ObservedObject var vm: WorkoutViewModel
    let exercise: WorkoutViewModel.SessionExercise
    let set: WorkoutViewModel.SetData
    let index: Int

    private var isPR: Bool {
        guard let w = Double(set.weight), exercise.pr > 0 else { return false }
        return w > exercise.pr
    }

    private var ghost: (w: String, r: String)? {
        vm.ghostSet(for: exercise.name, setIndex: index)
    }

    var body: some View {
        HStack(spacing: 6) {
            // Set number
            Text("\(index + 1)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.gray)
                .frame(width: 28)

            // Weight
            TextField(ghost?.w ?? "-", text: Binding(
                get: { set.weight },
                set: { vm.updateSet(exerciseId: exercise.id, setIndex: index, field: .weight, value: $0) }
            ))
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.center)
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(.white)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.4))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isPR ? Color.yellow.opacity(0.5) : Color.white.opacity(0.08),
                                lineWidth: 1
                            )
                    )
            )
            .shadow(color: isPR ? Color.yellow.opacity(0.2) : .clear, radius: 10)

            // Reps
            TextField(ghost?.r ?? "-", text: Binding(
                get: { set.reps },
                set: { vm.updateSet(exerciseId: exercise.id, setIndex: index, field: .reps, value: $0) }
            ))
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(.white)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.4))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )

            // RPE
            TextField("RPE", text: Binding(
                get: { set.rpe },
                set: { vm.updateSet(exerciseId: exercise.id, setIndex: index, field: .rpe, value: $0) }
            ))
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(.white)
            .padding(.vertical, 12)
            .frame(width: 48)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.4))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                (Int(set.rpe) ?? 0) >= 9 ? Color.ironRed.opacity(0.5) : Color.white.opacity(0.08),
                                lineWidth: 1
                            )
                    )
            )

            // Complete checkbox
            Button { vm.toggleSetComplete(exerciseId: exercise.id, setIndex: index) } label: {
                Image(systemName: set.completed ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundColor(set.completed ? .green : Color.gray.opacity(0.4))
            }
            .frame(width: 44)
        }
        .opacity(set.completed ? 0.5 : 1)
        .overlay(alignment: .topTrailing) {
            if isPR {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.yellow)
                    .offset(x: -4, y: -4)
            }
        }
    }
}

// MARK: - Rest Timer Overlay

private struct RestTimerOverlay: View {
    @ObservedObject var vm: WorkoutViewModel

    var body: some View {
        VStack {
            HStack(spacing: 16) {
                HStack(spacing: 8) {
                    Image(systemName: "timer")
                        .font(.system(size: 14))
                        .foregroundColor(.ironRedLight)

                    Text(vm.formatTime(vm.restTimer))
                        .font(.system(size: 20, weight: .black, design: .monospaced))
                        .foregroundColor(.white)

                    Text("REST")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.gray)
                        .tracking(1)
                }

                Divider()
                    .frame(height: 16)
                    .background(Color.gray.opacity(0.3))

                HStack(spacing: 8) {
                    Button { vm.extendRest() } label: {
                        Text("+30s")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.white.opacity(0.1))
                            )
                    }

                    Button { vm.cancelRest() } label: {
                        Image(systemName: "stop.circle")
                            .font(.system(size: 18))
                            .foregroundColor(.ironRedLight)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRed.opacity(0.2), Color.ironRed.opacity(0.1)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .overlay(
                        Capsule()
                            .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                    )
            )
            .shadow(color: Color.ironRed.opacity(0.3), radius: 20)

            Spacer()
        }
        .padding(.top, 8)
        .transition(.move(edge: .top).combined(with: .opacity))
        .animation(.spring(response: 0.4), value: true)
    }
}

// MARK: - Workout History View

private struct WorkoutHistoryView: View {
    let uid: String
    @ObservedObject var vm: WorkoutViewModel

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("MY LIFTS")
                            .font(.system(size: 24, weight: .black))
                            .italic()
                            .foregroundColor(.white)
                            .tracking(-1)
                        Text("TRAINING LOG")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color.gray.opacity(0.5))
                            .tracking(2)
                    }

                    Spacer()

                    HStack(spacing: 8) {
                        Button { vm.showTools = true } label: {
                            Image(systemName: "function")
                                .font(.system(size: 18))
                                .foregroundColor(.ironRedLight)
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.06))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                        )
                                )
                        }

                        Button { vm.startSession() } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 12))
                                Text("Start Session")
                                    .font(.system(size: 14, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                            .shadow(color: Color.ironRed.opacity(0.3), radius: 15)
                        }
                    }
                }
                .padding(.bottom, 8)

                // Workout List
                if vm.workouts.isEmpty {
                    emptyState
                } else {
                    ForEach(vm.workouts.indices, id: \.self) { idx in
                        WorkoutHistoryCard(uid: uid, vm: vm, workout: vm.workouts[idx])
                    }
                }

                Spacer(minLength: 100)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 48))
                .foregroundColor(Color.gray.opacity(0.3))
            Text("No workouts logged yet")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.gray)
            Text("Start a session to track your lifts")
                .font(.system(size: 12))
                .foregroundColor(Color.gray.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                .foregroundColor(Color.white.opacity(0.1))
        )
    }
}

// MARK: - Workout History Card

private struct WorkoutHistoryCard: View {
    let uid: String
    @ObservedObject var vm: WorkoutViewModel
    let workout: [String: Any]

    private var name: String { workout["name"] as? String ?? "Workout" }
    private var dateStr: String { workout["date"] as? String ?? "" }
    private var duration: Int { workout["duration"] as? Int ?? 0 }
    private var exercises: [[String: Any]] { workout["exercises"] as? [[String: Any]] ?? [] }
    private var workoutId: String { workout["id"] as? String ?? "" }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    HStack(spacing: 8) {
                        Image(systemName: "clock")
                            .font(.system(size: 10))
                        Text("\(dateStr) • \(vm.formatTime(duration))")
                    }
                    .font(.system(size: 11))
                    .foregroundColor(Color.gray.opacity(0.5))
                }

                Spacer()

                if !workoutId.isEmpty {
                    Button {
                        Task { await vm.deleteWorkout(uid: uid, workoutId: workoutId) }
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                            .foregroundColor(Color.gray.opacity(0.4))
                    }
                }
            }
            .padding(.bottom, 4)

            // Divider
            Rectangle()
                .fill(Color.gray.opacity(0.15))
                .frame(height: 1)

            // Exercise Summary
            ForEach(exercises.prefix(5).indices, id: \.self) { i in
                let ex = exercises[i]
                let exName = ex["name"] as? String ?? "—"
                let sets = ex["sets"] as? [[String: Any]] ?? []
                let maxW = sets.compactMap { s -> Double? in
                    if let d = s["w"] as? Double { return d }
                    if let str = s["w"] as? String { return Double(str) }
                    return nil
                }.max() ?? 0

                HStack {
                    Text("\(sets.count) × \(exName)")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                    Spacer()
                    Text("\(Int(maxW))kg max")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(Color.gray.opacity(0.5))
                }
                .padding(.leading, 12)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Color.ironRedLight.opacity(0.3))
                        .frame(width: 2)
                }
            }

            if exercises.count > 5 {
                Text("+\(exercises.count - 5) more exercises")
                    .font(.system(size: 11))
                    .italic()
                    .foregroundColor(Color.gray.opacity(0.4))
                    .padding(.leading, 12)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }
}

// MARK: - Iron Tools Sheet (1RM Calculator + Plate Loader)

private struct IronToolsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var activeTab = 0
    @State private var weight = ""
    @State private var reps = ""
    @State private var targetWeight = ""

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 20) {
                // Header
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "function")
                            .foregroundColor(.ironRedLight)
                        Text("IRON TOOLS")
                            .font(.system(size: 20, weight: .black))
                            .italic()
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                }

                // Tab Picker
                HStack(spacing: 0) {
                    tabButton("Plate Loader", tag: 0)
                    tabButton("1RM Calc", tag: 1)
                }
                .padding(4)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.04))
                )

                if activeTab == 1 {
                    oneRMContent
                } else {
                    plateLoaderContent
                }

                Spacer()
            }
            .padding(20)
        }
    }

    private func tabButton(_ title: String, tag: Int) -> some View {
        Button { withAnimation(.easeInOut(duration: 0.2)) { activeTab = tag } } label: {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(activeTab == tag ? .white : .gray)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    Group {
                        if activeTab == tag {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.ironRed.opacity(0.8), Color.ironRedDark.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        }
                    }
                )
        }
    }

    // MARK: - 1RM Calculator

    private var oneRMContent: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("WEIGHT (KG)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .tracking(1)
                    TextField("0", text: $weight)
                        .keyboardType(.decimalPad)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.black.opacity(0.4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("REPS")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .tracking(1)
                    TextField("0", text: $reps)
                        .keyboardType(.numberPad)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.black.opacity(0.4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                }
            }

            // Result
            VStack(spacing: 4) {
                Text("ESTIMATED MAX")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.ironRedLight)
                    .tracking(1)
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("\(WorkoutViewModel.calculate1RM(weight: Double(weight) ?? 0, reps: Double(reps) ?? 0))")
                        .font(.system(size: 48, weight: .black))
                        .foregroundColor(.white)
                    Text("kg")
                        .font(.system(size: 18))
                        .foregroundColor(.gray)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.ironRed.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.ironRedLight.opacity(0.2), lineWidth: 1)
                    )
            )
        }
    }

    // MARK: - Plate Loader

    private var plateLoaderContent: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("TARGET WEIGHT (KG)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)
                TextField("e.g. 100", text: $targetWeight)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.center)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.black.opacity(0.4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    )
            }

            let plates = WorkoutViewModel.calculatePlates(targetWeight: Double(targetWeight) ?? 0)

            // Visual barbell
            HStack(spacing: 2) {
                // Collar
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.gray.opacity(0.6))
                    .frame(width: 12, height: 48)

                // Plates
                ForEach(plates) { plate in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(plateColor(plate.colorName))
                        .frame(width: 10, height: CGFloat(40 + plate.weight * 1.5))
                        .overlay(
                            RoundedRectangle(cornerRadius: 2)
                                .stroke(Color.black.opacity(0.2), lineWidth: 1)
                        )
                }

                // Bar
                if plates.isEmpty {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.4))
                        .frame(width: 120, height: 12)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )

            // Plate list
            if plates.isEmpty {
                Text("Enter weight ≥20kg")
                    .font(.system(size: 12))
                    .foregroundColor(Color.gray.opacity(0.4))
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 8) {
                    ForEach(plates) { plate in
                        Text("\(plate.weight, specifier: plate.weight.truncatingRemainder(dividingBy: 1) == 0 ? "%.0f" : "%.1f")")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.gray)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color.white.opacity(0.08))
                            )
                    }
                }
            }
        }
    }

    private func plateColor(_ name: String) -> Color {
        switch name {
        case "red": return .red
        case "orange": return .orange
        case "yellow": return .yellow
        case "green": return .green
        case "white": return .white.opacity(0.8)
        case "gray": return .gray
        case "darkGray": return Color.gray.opacity(0.5)
        default: return .gray
        }
    }
}
