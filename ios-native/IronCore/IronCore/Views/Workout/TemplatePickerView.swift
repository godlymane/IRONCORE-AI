import SwiftUI

/// Template Picker — browse and select workout templates to start a session
/// Groups templates by category with default and custom sections
/// Dark theme, red accents, SF Symbols
struct TemplatePickerView: View {
    let uid: String
    let onStartWorkout: (WorkoutTemplate) -> Void

    @State private var templates: [WorkoutTemplate] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""
    @State private var showEditor = false
    @State private var editingTemplate: WorkoutTemplate?
    @State private var templateToDelete: WorkoutTemplate?
    @State private var showDeleteConfirm = false
    @State private var showConfetti = false

    @Environment(\.dismiss) private var dismiss

    // Separate defaults from custom
    private var defaultTemplates: [WorkoutTemplate] {
        filteredTemplates.filter { $0.isDefault }
    }

    private var customTemplates: [WorkoutTemplate] {
        filteredTemplates.filter { !$0.isDefault }
    }

    private var filteredTemplates: [WorkoutTemplate] {
        guard !searchText.isEmpty else { return templates }
        let term = searchText.lowercased()
        return templates.filter {
            $0.name.lowercased().contains(term) ||
            $0.description.lowercased().contains(term) ||
            $0.category.displayName.lowercased().contains(term)
        }
    }

    /// Group custom templates by category
    private var groupedCustom: [(TemplateCategory, [WorkoutTemplate])] {
        let grouped = Dictionary(grouping: customTemplates) { $0.category }
        return grouped.sorted { $0.key.displayName < $1.key.displayName }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if isLoading {
                    loadingView
                } else if templates.isEmpty {
                    emptyView
                } else {
                    templateList
                }
            }
            .navigationTitle("Templates")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.gray)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editingTemplate = nil
                        showEditor = true
                    } label: {
                        Image(systemName: "plus")
                            .foregroundColor(Color(red: 0.863, green: 0.149, blue: 0.149))
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search templates...")
            .sheet(isPresented: $showEditor) {
                TemplateEditorView(
                    uid: uid,
                    existingTemplate: editingTemplate,
                    onSave: { handleTemplateSaved() }
                )
            }
            .alert("Delete Template", isPresented: $showDeleteConfirm) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    if let t = templateToDelete {
                        deleteTemplate(t)
                    }
                }
            } message: {
                Text("Are you sure you want to delete \"\(templateToDelete?.name ?? "")\"? This cannot be undone.")
            }
            .confettiOverlay(isShowing: $showConfetti, type: .workoutComplete)
        }
        .preferredColorScheme(.dark)
        .task { await loadTemplates() }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(Color(red: 0.863, green: 0.149, blue: 0.149))
            Text("Loading templates...")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.gray)
        }
    }

    // MARK: - Empty State

    private var emptyView: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.gray.opacity(0.5))

            Text("NO TEMPLATES YET")
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
                .tracking(2)

            Text("Create your first custom template\nor start with a default workout.")
                .font(.system(size: 14))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            Button {
                editingTemplate = nil
                showEditor = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                    Text("CREATE TEMPLATE")
                        .font(.system(size: 14, weight: .bold))
                        .tracking(1)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 28)
                .padding(.vertical, 14)
                .background(Color(red: 0.863, green: 0.149, blue: 0.149))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    // MARK: - Template List

    private var templateList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 0, pinnedViews: .sectionHeaders) {
                // Default Templates Section
                if !defaultTemplates.isEmpty {
                    Section {
                        ForEach(defaultTemplates) { template in
                            TemplateCard(
                                template: template,
                                onTap: { startWorkout(template) },
                                onDuplicate: { duplicateTemplate(template) },
                                onEdit: nil,
                                onDelete: nil
                            )
                        }
                    } header: {
                        sectionHeader(title: "DEFAULT TEMPLATES", icon: "star.fill")
                    }
                }

                // Custom Templates Section (grouped by category)
                if !customTemplates.isEmpty {
                    Section {
                        ForEach(groupedCustom, id: \.0) { category, templates in
                            VStack(alignment: .leading, spacing: 8) {
                                // Category sub-header
                                HStack(spacing: 6) {
                                    Image(systemName: category.iconName)
                                        .font(.system(size: 11))
                                        .foregroundColor(Color(red: 0.863, green: 0.149, blue: 0.149))
                                    Text(category.displayName.uppercased())
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.gray)
                                        .tracking(1.5)
                                }
                                .padding(.horizontal, 16)
                                .padding(.top, 12)

                                ForEach(templates) { template in
                                    TemplateCard(
                                        template: template,
                                        onTap: { startWorkout(template) },
                                        onDuplicate: { duplicateTemplate(template) },
                                        onEdit: {
                                            editingTemplate = template
                                            showEditor = true
                                        },
                                        onDelete: {
                                            templateToDelete = template
                                            showDeleteConfirm = true
                                        }
                                    )
                                }
                            }
                        }
                    } header: {
                        sectionHeader(title: "MY TEMPLATES", icon: "person.fill")
                    }
                }

                // Create template CTA at bottom
                createTemplateCTA
                    .padding(.top, 16)
                    .padding(.bottom, 40)
            }
        }
    }

    // MARK: - Section Header

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundColor(Color(red: 0.863, green: 0.149, blue: 0.149))
            Text(title)
                .font(.system(size: 12, weight: .black))
                .foregroundColor(.white)
                .tracking(2)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.black)
    }

    // MARK: - Create Template CTA

    private var createTemplateCTA: some View {
        Button {
            editingTemplate = nil
            showEditor = true
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 20))
                Text("CREATE CUSTOM TEMPLATE")
                    .font(.system(size: 13, weight: .bold))
                    .tracking(1)
            }
            .foregroundColor(.gray)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                    .foregroundColor(Color.white.opacity(0.1))
            )
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Actions

    private func loadTemplates() async {
        isLoading = true
        defer { isLoading = false }
        do {
            templates = try await TemplateService.shared.getAllTemplates(uid: uid)
        } catch {
            errorMessage = error.localizedDescription
            print("[TemplatePicker] Load error: \(error)")
            // Fall back to defaults
            templates = TemplateService.defaultTemplates
        }
    }

    private func startWorkout(_ template: WorkoutTemplate) {
        showConfetti = true
        onStartWorkout(template)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            dismiss()
        }
    }

    private func duplicateTemplate(_ template: WorkoutTemplate) {
        Task {
            do {
                try await TemplateService.shared.duplicateTemplate(uid: uid, source: template)
                await loadTemplates()
            } catch {
                print("[TemplatePicker] Duplicate error: \(error)")
            }
        }
    }

    private func deleteTemplate(_ template: WorkoutTemplate) {
        Task {
            do {
                try await TemplateService.shared.deleteTemplate(uid: uid, templateId: template.id)
                await loadTemplates()
            } catch {
                print("[TemplatePicker] Delete error: \(error)")
            }
        }
    }

    private func handleTemplateSaved() {
        Task { await loadTemplates() }
    }
}

// MARK: - Template Card

/// Individual template card with name, exercises, duration, category badge
private struct TemplateCard: View {
    let template: WorkoutTemplate
    let onTap: () -> Void
    let onDuplicate: () -> Void
    let onEdit: (() -> Void)?
    let onDelete: (() -> Void)?

    @State private var isPressed = false

    private let accentColor = Color(red: 0.863, green: 0.149, blue: 0.149)

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                // Top row: name + category badge
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(template.name.uppercased())
                            .font(.system(size: 16, weight: .black))
                            .foregroundColor(.white)
                            .tracking(1)

                        Text(template.description)
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Category badge
                    categoryBadge
                }

                // Exercise preview
                HStack(spacing: 16) {
                    statPill(icon: "dumbbell.fill", value: "\(template.exerciseCount)", label: "exercises")
                    statPill(icon: "chart.bar.fill", value: "\(template.totalSets)", label: "sets")
                    statPill(icon: "clock.fill", value: "~\(template.estimatedDuration)m", label: "est.")
                }

                // Exercise names preview
                Text(template.exercises.prefix(4).map { $0.name }.joined(separator: " \u{2022} "))
                    .font(.system(size: 11))
                    .foregroundColor(.gray.opacity(0.7))
                    .lineLimit(1)

                // Action buttons for custom templates
                if !template.isDefault {
                    Divider()
                        .background(Color.white.opacity(0.05))

                    HStack(spacing: 16) {
                        if let onEdit = onEdit {
                            actionButton(icon: "pencil", label: "Edit", action: onEdit)
                        }
                        actionButton(icon: "doc.on.doc", label: "Duplicate", action: onDuplicate)
                        Spacer()
                        if let onDelete = onDelete {
                            actionButton(icon: "trash", label: "Delete", color: .red.opacity(0.7), action: onDelete)
                        }
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(isPressed ? 0.08 : 0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.06), lineWidth: 1)
                    )
            )
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
        }
        .buttonStyle(PressableCardStyle())
    }

    private var categoryBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: template.category.iconName)
                .font(.system(size: 10))
            Text(template.category.displayName.uppercased())
                .font(.system(size: 9, weight: .bold))
                .tracking(0.5)
        }
        .foregroundColor(accentColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(accentColor.opacity(0.15))
        .clipShape(Capsule())
    }

    private func statPill(icon: String, value: String, label: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9))
                .foregroundColor(accentColor)
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.gray)
        }
    }

    private func actionButton(icon: String, label: String, color: Color = .gray, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(label)
                    .font(.system(size: 11, weight: .medium))
            }
            .foregroundColor(color)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Pressable Card Button Style

private struct PressableCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
