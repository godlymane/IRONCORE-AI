import Foundation
import FirebaseFirestore
import FirebaseAuth

// MARK: - Models

/// Category for workout templates — each has an SF Symbol icon
enum TemplateCategory: String, Codable, CaseIterable, Identifiable {
    case push
    case pull
    case legs
    case upper
    case lower
    case fullBody
    case hiit
    case core
    case custom

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .push:     return "Push"
        case .pull:     return "Pull"
        case .legs:     return "Legs"
        case .upper:    return "Upper Body"
        case .lower:    return "Lower Body"
        case .fullBody: return "Full Body"
        case .hiit:     return "HIIT"
        case .core:     return "Core"
        case .custom:   return "Custom"
        }
    }

    var iconName: String {
        switch self {
        case .push:     return "arrow.up"
        case .pull:     return "arrow.down"
        case .legs:     return "figure.walk"
        case .upper:    return "figure.arms.open"
        case .lower:    return "figure.step.training"
        case .fullBody: return "figure.strengthtraining.traditional"
        case .hiit:     return "bolt.fill"
        case .core:     return "circle.grid.cross.fill"
        case .custom:   return "wrench.and.screwdriver.fill"
        }
    }
}

/// A single exercise within a template
struct TemplateExercise: Identifiable, Codable, Hashable {
    var id: String = UUID().uuidString
    var name: String
    var sets: Int
    /// Reps string — supports numeric ("8") or descriptors ("AMRAP", "20s", "60s")
    var reps: String
    var restSeconds: Int
    var notes: String?

    /// Convenience initializer for numeric reps
    init(name: String, sets: Int, reps: Int, restSeconds: Int, notes: String? = nil) {
        self.id = UUID().uuidString
        self.name = name
        self.sets = sets
        self.reps = "\(reps)"
        self.restSeconds = restSeconds
        self.notes = notes
    }

    /// Initializer for string-based reps (AMRAP, timed)
    init(name: String, sets: Int, repsString: String, restSeconds: Int, notes: String? = nil) {
        self.id = UUID().uuidString
        self.name = name
        self.sets = sets
        self.reps = repsString
        self.restSeconds = restSeconds
        self.notes = notes
    }

    /// Dictionary representation for Firestore
    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "id": id,
            "name": name,
            "sets": sets,
            "reps": reps,
            "restSeconds": restSeconds
        ]
        if let notes = notes { dict["notes"] = notes }
        return dict
    }

    /// Initialize from Firestore dictionary
    init(from dict: [String: Any]) {
        self.id = dict["id"] as? String ?? UUID().uuidString
        self.name = dict["name"] as? String ?? "Unknown"
        self.sets = dict["sets"] as? Int ?? 3
        self.reps = dict["reps"] as? String ?? "10"
        self.restSeconds = dict["restSeconds"] as? Int ?? 60
        self.notes = dict["notes"] as? String
    }
}

/// A complete workout template
struct WorkoutTemplate: Identifiable, Codable {
    var id: String
    var name: String
    var description: String
    var category: TemplateCategory
    var exercises: [TemplateExercise]
    var isDefault: Bool
    var createdBy: String?
    var createdAt: Date?
    var updatedAt: Date?
    var estimatedDuration: Int // minutes

    /// Computed: total set count
    var totalSets: Int {
        exercises.reduce(0) { $0 + $1.sets }
    }

    /// Computed: exercise count
    var exerciseCount: Int {
        exercises.count
    }

    /// Dictionary representation for Firestore
    var dictionary: [String: Any] {
        var dict: [String: Any] = [
            "name": name,
            "description": description,
            "category": category.rawValue,
            "exercises": exercises.map { $0.dictionary },
            "isDefault": isDefault,
            "estimatedDuration": estimatedDuration
        ]
        if let createdBy = createdBy { dict["createdBy"] = createdBy }
        return dict
    }

    /// Initialize from Firestore document
    init(id: String, data: [String: Any]) {
        self.id = id
        self.name = data["name"] as? String ?? "Untitled"
        self.description = data["description"] as? String ?? ""
        self.category = TemplateCategory(rawValue: data["category"] as? String ?? "custom") ?? .custom
        self.isDefault = data["isDefault"] as? Bool ?? false
        self.createdBy = data["createdBy"] as? String
        self.estimatedDuration = data["estimatedDuration"] as? Int ?? 30

        if let ts = data["createdAt"] as? Timestamp {
            self.createdAt = ts.dateValue()
        }
        if let ts = data["updatedAt"] as? Timestamp {
            self.updatedAt = ts.dateValue()
        }

        if let exerciseDicts = data["exercises"] as? [[String: Any]] {
            self.exercises = exerciseDicts.map { TemplateExercise(from: $0) }
        } else {
            self.exercises = []
        }
    }

    /// Direct initializer for default templates
    init(
        id: String,
        name: String,
        description: String,
        category: TemplateCategory,
        exercises: [TemplateExercise],
        isDefault: Bool = false,
        estimatedDuration: Int = 30,
        createdBy: String? = nil
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.exercises = exercises
        self.isDefault = isDefault
        self.estimatedDuration = estimatedDuration
        self.createdBy = createdBy
        self.createdAt = nil
        self.updatedAt = nil
    }
}

// MARK: - Template Service

/// Manages workout templates — default + custom (Firestore)
/// Mirrors templateService.js from the React prototype
final class TemplateService {
    static let shared = TemplateService()
    private let db = Firestore.firestore()

    private init() {}

    // MARK: - Default Templates

    /// 5 built-in templates that every user gets
    static let defaultTemplates: [WorkoutTemplate] = [
        // Push Day
        WorkoutTemplate(
            id: "default_push",
            name: "Push Day",
            description: "Chest, shoulders, and triceps",
            category: .push,
            exercises: [
                TemplateExercise(name: "Bench Press", sets: 4, reps: 8, restSeconds: 90),
                TemplateExercise(name: "Overhead Press", sets: 3, reps: 10, restSeconds: 60),
                TemplateExercise(name: "Incline DB Press", sets: 3, reps: 12, restSeconds: 60),
                TemplateExercise(name: "Lateral Raise", sets: 3, reps: 15, restSeconds: 45),
                TemplateExercise(name: "Tricep Pushdown", sets: 3, reps: 12, restSeconds: 45),
            ],
            isDefault: true,
            estimatedDuration: 45
        ),
        // Pull Day
        WorkoutTemplate(
            id: "default_pull",
            name: "Pull Day",
            description: "Back and biceps",
            category: .pull,
            exercises: [
                TemplateExercise(name: "Deadlift", sets: 4, reps: 5, restSeconds: 120),
                TemplateExercise(name: "Barbell Row", sets: 4, reps: 8, restSeconds: 90),
                TemplateExercise(name: "Pull-ups", sets: 3, repsString: "AMRAP", restSeconds: 90),
                TemplateExercise(name: "Face Pulls", sets: 3, reps: 15, restSeconds: 45),
                TemplateExercise(name: "Bicep Curl", sets: 3, reps: 12, restSeconds: 45),
            ],
            isDefault: true,
            estimatedDuration: 45
        ),
        // Leg Day
        WorkoutTemplate(
            id: "default_legs",
            name: "Leg Day",
            description: "Quads, hamstrings, and calves",
            category: .legs,
            exercises: [
                TemplateExercise(name: "Squat", sets: 4, reps: 6, restSeconds: 120),
                TemplateExercise(name: "Romanian Deadlift", sets: 3, reps: 10, restSeconds: 90),
                TemplateExercise(name: "Leg Press", sets: 3, reps: 12, restSeconds: 60),
                TemplateExercise(name: "Leg Curl", sets: 3, reps: 12, restSeconds: 45),
                TemplateExercise(name: "Calf Raise", sets: 4, reps: 15, restSeconds: 30),
            ],
            isDefault: true,
            estimatedDuration: 50
        ),
        // HIIT Blast
        WorkoutTemplate(
            id: "default_hiit",
            name: "HIIT Blast",
            description: "High-intensity fat burner",
            category: .hiit,
            exercises: [
                TemplateExercise(name: "Burpees", sets: 4, repsString: "20s", restSeconds: 10),
                TemplateExercise(name: "Mountain Climbers", sets: 4, repsString: "30s", restSeconds: 10),
                TemplateExercise(name: "Jump Squats", sets: 4, reps: 15, restSeconds: 10),
                TemplateExercise(name: "Battle Ropes", sets: 4, repsString: "30s", restSeconds: 30),
            ],
            isDefault: true,
            estimatedDuration: 20
        ),
        // Core Crusher
        WorkoutTemplate(
            id: "default_core",
            name: "Core Crusher",
            description: "Abs and core stability",
            category: .core,
            exercises: [
                TemplateExercise(name: "Plank", sets: 3, repsString: "60s", restSeconds: 30),
                TemplateExercise(name: "Russian Twist", sets: 3, reps: 20, restSeconds: 30),
                TemplateExercise(name: "Leg Raises", sets: 3, reps: 15, restSeconds: 30),
                TemplateExercise(name: "Ab Wheel", sets: 3, reps: 10, restSeconds: 30),
            ],
            isDefault: true,
            estimatedDuration: 15
        ),
    ]

    // MARK: - Firestore Path: users/{uid}/templates

    private func templatesCollection(uid: String) -> CollectionReference {
        db.collection("users").document(uid).collection("templates")
    }

    // MARK: - CRUD Operations

    /// Fetch all user templates from Firestore, merge with defaults
    func getAllTemplates(uid: String) async throws -> [WorkoutTemplate] {
        let snapshot = try await templatesCollection(uid: uid)
            .order(by: "createdAt", descending: true)
            .getDocuments()

        let userTemplates = snapshot.documents.map { doc in
            WorkoutTemplate(id: doc.documentID, data: doc.data())
        }

        return userTemplates + Self.defaultTemplates
    }

    /// Save a new custom template
    @discardableResult
    func saveTemplate(uid: String, template: WorkoutTemplate) async throws -> String {
        var data = template.dictionary
        data["createdBy"] = uid
        data["isDefault"] = false
        data["createdAt"] = FieldValue.serverTimestamp()
        data["updatedAt"] = FieldValue.serverTimestamp()

        let ref = try await templatesCollection(uid: uid).addDocument(data: data)
        print("[TemplateService] Saved template: \(template.name) -> \(ref.documentID)")
        return ref.documentID
    }

    /// Update an existing custom template
    func updateTemplate(uid: String, templateId: String, updates: [String: Any]) async throws {
        var data = updates
        data["updatedAt"] = FieldValue.serverTimestamp()

        try await templatesCollection(uid: uid).document(templateId).setData(data, merge: true)
        print("[TemplateService] Updated template: \(templateId)")
    }

    /// Update a full template object
    func updateTemplate(uid: String, template: WorkoutTemplate) async throws {
        guard !template.isDefault else {
            print("[TemplateService] Cannot update default templates")
            return
        }
        var data = template.dictionary
        data["updatedAt"] = FieldValue.serverTimestamp()

        try await templatesCollection(uid: uid).document(template.id).setData(data, merge: true)
        print("[TemplateService] Updated template: \(template.name)")
    }

    /// Delete a custom template
    func deleteTemplate(uid: String, templateId: String) async throws {
        try await templatesCollection(uid: uid).document(templateId).delete()
        print("[TemplateService] Deleted template: \(templateId)")
    }

    /// Duplicate a template (works on both default and custom)
    @discardableResult
    func duplicateTemplate(uid: String, source: WorkoutTemplate, newName: String? = nil) async throws -> String {
        var copy = source
        copy.id = UUID().uuidString // will be replaced by Firestore
        copy.name = newName ?? "\(source.name) (Copy)"
        copy.isDefault = false
        copy.createdBy = uid

        return try await saveTemplate(uid: uid, template: copy)
    }

    /// Create a template from a completed workout log
    @discardableResult
    func createTemplateFromWorkout(uid: String, workout: [String: Any], name: String? = nil) async throws -> String {
        let workoutName = name ?? "Workout on \(Self.dateString(from: Date()))"
        let category = TemplateCategory(rawValue: workout["type"] as? String ?? "custom") ?? .custom
        let duration = workout["duration"] as? Int ?? 30

        var exercises: [TemplateExercise] = []
        if let exerciseDicts = workout["exercises"] as? [[String: Any]] {
            exercises = exerciseDicts.map { TemplateExercise(from: $0) }
        }

        let template = WorkoutTemplate(
            id: UUID().uuidString,
            name: workoutName,
            description: workout["notes"] as? String ?? "",
            category: category,
            exercises: exercises,
            isDefault: false,
            estimatedDuration: duration,
            createdBy: uid
        )

        return try await saveTemplate(uid: uid, template: template)
    }

    // MARK: - Filtering

    /// Get templates filtered by category
    func getTemplatesByCategory(uid: String, category: TemplateCategory) async throws -> [WorkoutTemplate] {
        let all = try await getAllTemplates(uid: uid)
        return all.filter { $0.category == category }
    }

    /// Search templates by name or description
    func searchTemplates(uid: String, query: String) async throws -> [WorkoutTemplate] {
        let all = try await getAllTemplates(uid: uid)
        let term = query.lowercased()
        return all.filter {
            $0.name.lowercased().contains(term) ||
            $0.description.lowercased().contains(term)
        }
    }

    // MARK: - Start Workout from Template

    /// Creates a workout log entry from a template and returns the workout data
    func startWorkoutFromTemplate(uid: String, template: WorkoutTemplate) async throws -> [String: Any] {
        let workoutData: [String: Any] = [
            "templateId": template.id,
            "templateName": template.name,
            "type": template.category.rawValue,
            "exercises": template.exercises.map { exercise -> [String: Any] in
                var dict = exercise.dictionary
                // Initialize empty set logs for active tracking
                dict["completedSets"] = [[String: Any]]()
                return dict
            },
            "status": "active",
            "startedAt": FieldValue.serverTimestamp(),
            "date": FirestoreService.todayString(),
            "createdAt": FieldValue.serverTimestamp(),
            "userId": uid
        ]

        try await db.collection("users").document(uid)
            .collection("workouts").addDocument(data: workoutData)

        print("[TemplateService] Started workout from template: \(template.name)")
        return workoutData
    }

    // MARK: - Helpers

    private static func dateString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}
