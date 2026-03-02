import SwiftUI

/// Template Editor — create or edit a custom workout template
/// Fields: name, category picker, exercises list with drag reorder
/// Dark theme, red accents, validation on save
struct TemplateEditorView: View {
    let uid: String
    let existingTemplate: WorkoutTemplate?
    let onSave: () -> Void

    @Environment(\.dismiss) private var dismiss

    // Form state
    @State private var name: String = ""
    @State private var description: String = ""
    @State private var category: TemplateCategory = .custom
    @State private var exercises: [TemplateExercise] = []
    @State private var estimatedDuration: Int = 30

    // UI state
    @State private var isSaving = false
    @State private var showAddExercise = false
    @State private var showValidationError = false
    @State private var validationMessage = ""
    @State private var editingExercise: TemplateExercise?
    @State private var editingExerciseIndex: Int?

    private let accentColor = Color(red: 0.863, green: 0.149, blue: 0.149)

    private var isEditing: Bool { existingTemplate != nil }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Template Info Section
                        templateInfoSection

                        // Category Picker
                        categorySection

                        // Duration
                        durationSection

                        // Exercises List
                        exercisesSection

                        // Add Exercise Button
                        addExerciseButton

                        Spacer(minLength: 100)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                }

                // Save Button Pinned to Bottom
                VStack {
                    Spacer()
                    saveButton
                }
            }
            .navigationTitle(isEditing ? "Edit Template" : "New Template")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.gray)
                }
            }
            .sheet(isPresented: $showAddExercise) {
                ExerciseFormSheet(
                    existingExercise: editingExercise,
                    onSave: { exercise in
                        if let index = editingExerciseIndex {
                            exercises[index] = exercise
                        } else {
                            exercises.append(exercise)
                        }
                        editingExercise = nil
                        editingExerciseIndex = nil
                    }
                )
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
            .alert("Validation Error", isPresented: $showValidationError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(validationMessage)
            }
            .onAppear { loadExistingTemplate() }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Template Info Section

    private var templateInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("TEMPLATE INFO")

            // Name
            VStack(alignment: .leading, spacing: 6) {
                Text("NAME")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.gray)
                    .tracking(1.5)

                TextField("e.g. Upper Body Strength", text: $name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(14)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(name.isEmpty ? Color.white.opacity(0.08) : accentColor.opacity(0.3), lineWidth: 1)
                    )
            }

            // Description
            VStack(alignment: .leading, spacing: 6) {
                Text("DESCRIPTION")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.gray)
                    .tracking(1.5)

                TextField("Brief description (optional)", text: $description)
                    .font(.system(size: 14))
                    .foregroundColor(.white)
                    .padding(14)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            }
        }
    }

    // MARK: - Category Section

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("CATEGORY")

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                ForEach(TemplateCategory.allCases) { cat in
                    categoryChip(cat)
                }
            }
        }
    }

    private func categoryChip(_ cat: TemplateCategory) -> some View {
        let isSelected = category == cat
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                category = cat
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: cat.iconName)
                    .font(.system(size: 11))
                Text(cat.displayName.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(0.5)
                    .lineLimit(1)
            }
            .foregroundColor(isSelected ? .white : .gray)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isSelected ? accentColor.opacity(0.25) : Color.white.opacity(0.04))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? accentColor : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Duration Section

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionLabel("ESTIMATED DURATION")

            HStack(spacing: 16) {
                ForEach([15, 30, 45, 60, 90], id: \.self) { minutes in
                    let isSelected = estimatedDuration == minutes
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            estimatedDuration = minutes
                        }
                    } label: {
                        Text("\(minutes)m")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(isSelected ? .white : .gray)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(isSelected ? accentColor.opacity(0.25) : Color.white.opacity(0.04))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(isSelected ? accentColor : Color.clear, lineWidth: 1.5)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Exercises Section

    private var exercisesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                sectionLabel("EXERCISES (\(exercises.count))")
                Spacer()
                if exercises.count > 1 {
                    Text("Drag to reorder")
                        .font(.system(size: 10))
                        .foregroundColor(.gray.opacity(0.5))
                }
            }

            if exercises.isEmpty {
                emptyExercisesPlaceholder
            } else {
                exercisesList
            }
        }
    }

    private var emptyExercisesPlaceholder: some View {
        VStack(spacing: 12) {
            Image(systemName: "dumbbell")
                .font(.system(size: 28))
                .foregroundColor(.gray.opacity(0.3))
            Text("No exercises added yet")
                .font(.system(size: 13))
                .foregroundColor(.gray.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color.white.opacity(0.02))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var exercisesList: some View {
        VStack(spacing: 6) {
            ForEach(Array(exercises.enumerated()), id: \.element.id) { index, exercise in
                exerciseRow(exercise: exercise, index: index)
            }
            .onMove { source, destination in
                exercises.move(fromOffsets: source, toOffset: destination)
            }
        }
    }

    private func exerciseRow(exercise: TemplateExercise, index: Int) -> some View {
        HStack(spacing: 12) {
            // Drag handle
            Image(systemName: "line.3.horizontal")
                .font(.system(size: 14))
                .foregroundColor(.gray.opacity(0.4))

            // Exercise number
            Text("\(index + 1)")
                .font(.system(size: 12, weight: .black))
                .foregroundColor(accentColor)
                .frame(width: 22, height: 22)
                .background(accentColor.opacity(0.15))
                .clipShape(Circle())

            // Exercise info
            VStack(alignment: .leading, spacing: 2) {
                Text(exercise.name.uppercased())
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .tracking(0.5)

                Text("\(exercise.sets) sets x \(exercise.reps) reps \u{2022} \(exercise.restSeconds)s rest")
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }

            Spacer()

            // Edit button
            Button {
                editingExercise = exercise
                editingExerciseIndex = index
                showAddExercise = true
            } label: {
                Image(systemName: "pencil")
                    .font(.system(size: 12))
                    .foregroundColor(.gray)
                    .frame(width: 28, height: 28)
                    .background(Color.white.opacity(0.06))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            // Delete button
            Button {
                withAnimation(.easeOut(duration: 0.2)) {
                    exercises.remove(at: index)
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.red.opacity(0.7))
                    .frame(width: 28, height: 28)
                    .background(Color.red.opacity(0.1))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
    }

    // MARK: - Add Exercise Button

    private var addExerciseButton: some View {
        Button {
            editingExercise = nil
            editingExerciseIndex = nil
            showAddExercise = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 16))
                Text("ADD EXERCISE")
                    .font(.system(size: 13, weight: .bold))
                    .tracking(1)
            }
            .foregroundColor(accentColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(accentColor.opacity(0.3), lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Save Button

    private var saveButton: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [.black.opacity(0), .black],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 30)

            Button {
                saveTemplate()
            } label: {
                HStack(spacing: 8) {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                        Text(isEditing ? "SAVE CHANGES" : "CREATE TEMPLATE")
                            .font(.system(size: 15, weight: .black))
                            .tracking(1)
                    }
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(accentColor)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .disabled(isSaving)
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
            .background(Color.black)
        }
    }

    // MARK: - Section Label Helper

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .black))
            .foregroundColor(.gray)
            .tracking(2)
    }

    // MARK: - Load Existing

    private func loadExistingTemplate() {
        guard let template = existingTemplate else { return }
        name = template.name
        description = template.description
        category = template.category
        exercises = template.exercises
        estimatedDuration = template.estimatedDuration
    }

    // MARK: - Validation + Save

    private func saveTemplate() {
        // Validate
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            validationMessage = "Template name is required."
            showValidationError = true
            return
        }
        guard !exercises.isEmpty else {
            validationMessage = "Add at least one exercise."
            showValidationError = true
            return
        }

        isSaving = true

        Task {
            do {
                let template = WorkoutTemplate(
                    id: existingTemplate?.id ?? UUID().uuidString,
                    name: trimmedName,
                    description: description.trimmingCharacters(in: .whitespacesAndNewlines),
                    category: category,
                    exercises: exercises,
                    isDefault: false,
                    estimatedDuration: estimatedDuration,
                    createdBy: uid
                )

                if isEditing {
                    try await TemplateService.shared.updateTemplate(uid: uid, template: template)
                } else {
                    try await TemplateService.shared.saveTemplate(uid: uid, template: template)
                }

                await MainActor.run {
                    onSave()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    validationMessage = "Failed to save: \(error.localizedDescription)"
                    showValidationError = true
                }
            }
        }
    }
}

// MARK: - Exercise Form Sheet

/// Bottom sheet for adding/editing a single exercise in the template
private struct ExerciseFormSheet: View {
    let existingExercise: TemplateExercise?
    let onSave: (TemplateExercise) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var sets: String = "3"
    @State private var reps: String = "10"
    @State private var restSeconds: String = "60"
    @State private var notes: String = ""

    private let accentColor = Color(red: 0.863, green: 0.149, blue: 0.149)

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 20) {
                    // Exercise Name
                    formField(label: "EXERCISE NAME", placeholder: "e.g. Bench Press", text: $name, keyboard: .default)

                    // Sets / Reps / Rest in a row
                    HStack(spacing: 12) {
                        formField(label: "SETS", placeholder: "3", text: $sets, keyboard: .numberPad)
                        formField(label: "REPS", placeholder: "10", text: $reps, keyboard: .default) // default for "AMRAP", "30s"
                        formField(label: "REST (s)", placeholder: "60", text: $restSeconds, keyboard: .numberPad)
                    }

                    // Notes
                    formField(label: "NOTES (OPTIONAL)", placeholder: "e.g. Slow eccentric", text: $notes, keyboard: .default)

                    Spacer()

                    // Save Button
                    Button {
                        save()
                    } label: {
                        Text(existingExercise != nil ? "UPDATE EXERCISE" : "ADD EXERCISE")
                            .font(.system(size: 14, weight: .black))
                            .tracking(1)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(name.isEmpty ? Color.gray.opacity(0.3) : accentColor)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(20)
            }
            .navigationTitle(existingExercise != nil ? "Edit Exercise" : "Add Exercise")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.gray)
                }
            }
            .onAppear { loadExisting() }
        }
        .preferredColorScheme(.dark)
    }

    private func formField(label: String, placeholder: String, text: Binding<String>, keyboard: UIKeyboardType) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.gray)
                .tracking(1.5)

            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.white)
                .padding(12)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        }
    }

    private func loadExisting() {
        guard let exercise = existingExercise else { return }
        name = exercise.name
        sets = "\(exercise.sets)"
        reps = exercise.reps
        restSeconds = "\(exercise.restSeconds)"
        notes = exercise.notes ?? ""
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let exercise = TemplateExercise(
            name: trimmedName,
            sets: Int(sets) ?? 3,
            repsString: reps.isEmpty ? "10" : reps,
            restSeconds: Int(restSeconds) ?? 60,
            notes: notes.isEmpty ? nil : notes
        )

        onSave(exercise)
        dismiss()
    }
}
