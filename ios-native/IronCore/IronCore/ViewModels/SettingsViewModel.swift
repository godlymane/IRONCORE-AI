import Foundation
import UIKit
import UserNotifications
import FirebaseAuth
import FirebaseFirestore

/// Settings data layer — notifications, reminders, export state.
/// Mirrors SettingsPanel.jsx logic from React prototype.
@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var notificationStatus: UNAuthorizationStatus = .notDetermined
    @Published var reminders: [WorkoutReminder] = []
    @Published var showReminderPicker = false
    @Published var selectedHour: Int = 9
    @Published var selectedMinute: Int = 0
    @Published var exportLoading: String?

    private let firestore = FirestoreService.shared

    struct WorkoutReminder: Identifiable, Codable {
        let id: String
        let hour: Int
        let minute: Int

        var displayTime: String {
            let period = hour >= 12 ? "PM" : "AM"
            let displayHour = hour % 12 == 0 ? 12 : hour % 12
            return "\(displayHour):\(String(format: "%02d", minute)) \(period)"
        }
    }

    // MARK: - Init

    func load() {
        checkNotificationStatus()
        loadReminders()
    }

    // MARK: - Notifications

    func checkNotificationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            Task { @MainActor in
                self.notificationStatus = settings.authorizationStatus
            }
        }
    }

    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            Task { @MainActor in
                self.notificationStatus = granted ? .authorized : .denied
            }
        }
    }

    // MARK: - Reminders (local notifications)

    func addReminder() {
        let id = UUID().uuidString
        let reminder = WorkoutReminder(id: id, hour: selectedHour, minute: selectedMinute)

        // Schedule local notification
        let content = UNMutableNotificationContent()
        content.title = "IronCore Fit"
        content.body = "Time to get your workout in!"
        content.sound = .default

        var components = DateComponents()
        components.hour = selectedHour
        components.minute = selectedMinute
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)

        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)

        reminders.append(reminder)
        saveReminders()
        showReminderPicker = false
    }

    func removeReminder(_ reminder: WorkoutReminder) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [reminder.id])
        reminders.removeAll { $0.id == reminder.id }
        saveReminders()
    }

    private func saveReminders() {
        if let data = try? JSONEncoder().encode(reminders) {
            UserDefaults.standard.set(data, forKey: "workout_reminders")
        }
    }

    private func loadReminders() {
        guard let data = UserDefaults.standard.data(forKey: "workout_reminders"),
              let saved = try? JSONDecoder().decode([WorkoutReminder].self, from: data) else { return }
        reminders = saved
    }

    // MARK: - Export (premium-gated, handled by caller)

    @Published var exportedFileURL: URL?

    private let db = Firestore.firestore()

    func exportWorkouts(uid: String) async -> String? {
        exportLoading = "workouts"
        defer { exportLoading = nil }

        do {
            let snapshot = try await db.collection("users").document(uid)
                .collection("workouts").order(by: "createdAt", descending: true).getDocuments()

            let header = "Date,Type,Name,Duration (min),Calories Burned,Sets,Reps,Weight,Notes"
            let rows = snapshot.documents.map { doc -> String in
                let d = doc.data()
                return [
                    csvEscape(d["date"] as? String ?? ""),
                    csvEscape(d["type"] as? String ?? ""),
                    csvEscape(d["name"] as? String ?? ""),
                    "\(d["duration"] as? Int ?? 0)",
                    "\(d["caloriesBurned"] as? Int ?? 0)",
                    "\(d["sets"] as? Int ?? 0)",
                    "\(d["reps"] as? Int ?? 0)",
                    "\(d["weight"] as? Double ?? 0)",
                    csvEscape(d["notes"] as? String ?? ""),
                ].joined(separator: ",")
            }

            let csv = ([header] + rows).joined(separator: "\n")
            let url = try writeToTempFile(csv, filename: "ironcore-workouts-\(Self.todayString()).csv")
            exportedFileURL = url
            presentShareSheet(url: url)
            return url.path
        } catch {
            print("[Settings] Export workouts error: \(error)")
            return nil
        }
    }

    func exportMeals(uid: String) async -> String? {
        exportLoading = "meals"
        defer { exportLoading = nil }

        do {
            let snapshot = try await db.collection("users").document(uid)
                .collection("meals").order(by: "createdAt", descending: true).getDocuments()

            let header = "Date,Food Name,Meal Type,Calories,Protein (g),Carbs (g),Fat (g),Servings"
            let rows = snapshot.documents.map { doc -> String in
                let d = doc.data()
                return [
                    csvEscape(d["date"] as? String ?? ""),
                    csvEscape(d["name"] as? String ?? ""),
                    csvEscape(d["mealType"] as? String ?? ""),
                    "\(d["calories"] as? Int ?? 0)",
                    "\(d["protein"] as? Double ?? 0)",
                    "\(d["carbs"] as? Double ?? 0)",
                    "\(d["fat"] as? Double ?? 0)",
                    "\(d["servings"] as? Double ?? 1)",
                ].joined(separator: ",")
            }

            let csv = ([header] + rows).joined(separator: "\n")
            let url = try writeToTempFile(csv, filename: "ironcore-meals-\(Self.todayString()).csv")
            exportedFileURL = url
            presentShareSheet(url: url)
            return url.path
        } catch {
            print("[Settings] Export meals error: \(error)")
            return nil
        }
    }

    func exportAll(uid: String) async -> String? {
        exportLoading = "all"
        defer { exportLoading = nil }

        do {
            let workouts = try await db.collection("users").document(uid)
                .collection("workouts").getDocuments().documents.map { $0.data() }
            let meals = try await db.collection("users").document(uid)
                .collection("meals").getDocuments().documents.map { $0.data() }
            let profile = try await db.collection("users").document(uid).getDocument().data() ?? [:]

            let exportData: [String: Any] = [
                "exportedAt": ISO8601DateFormatter().string(from: Date()),
                "version": "1.0",
                "profile": sanitizeForJSON(profile),
                "workouts": workouts.map { sanitizeForJSON($0) },
                "meals": meals.map { sanitizeForJSON($0) },
            ]

            let jsonData = try JSONSerialization.data(withJSONObject: exportData, options: [.prettyPrinted, .sortedKeys])
            let url = try writeToTempFile(String(data: jsonData, encoding: .utf8) ?? "{}", filename: "ironcore-backup-\(Self.todayString()).json")
            exportedFileURL = url
            presentShareSheet(url: url)
            return url.path
        } catch {
            print("[Settings] Export all error: \(error)")
            return nil
        }
    }

    // MARK: - Export Helpers

    private func csvEscape(_ value: String) -> String {
        if value.contains(",") || value.contains("\"") || value.contains("\n") {
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return value
    }

    private func writeToTempFile(_ content: String, filename: String) throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// Strip Firestore Timestamp objects for JSON serialization
    private func sanitizeForJSON(_ dict: [String: Any]) -> [String: Any] {
        var result: [String: Any] = [:]
        for (key, value) in dict {
            if let ts = value as? Timestamp {
                result[key] = ISO8601DateFormatter().string(from: ts.dateValue())
            } else if let nested = value as? [String: Any] {
                result[key] = sanitizeForJSON(nested)
            } else if let array = value as? [[String: Any]] {
                result[key] = array.map { sanitizeForJSON($0) }
            } else if JSONSerialization.isValidJSONObject([key: value]) {
                result[key] = value
            } else {
                result[key] = "\(value)"
            }
        }
        return result
    }

    private func presentShareSheet(url: URL) {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first,
              let rootVC = window.rootViewController else { return }

        let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        // iPad requires popover source
        if let popover = activityVC.popoverPresentationController {
            popover.sourceView = window
            popover.sourceRect = CGRect(x: window.bounds.midX, y: window.bounds.midY, width: 0, height: 0)
        }
        rootVC.present(activityVC, animated: true)
    }

    private static func todayString() -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: Date())
    }

    // MARK: - App Info

    var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}
