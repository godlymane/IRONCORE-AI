import Foundation
import UserNotifications
import FirebaseAuth

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

    func exportWorkouts(uid: String) async -> String? {
        exportLoading = "workouts"
        defer { exportLoading = nil }

        // Fetch workouts from Firestore and build CSV
        // Returns the file URL as a string for share sheet
        // Actual export logic will be wired when share sheet is integrated
        return nil
    }

    func exportMeals(uid: String) async -> String? {
        exportLoading = "meals"
        defer { exportLoading = nil }
        return nil
    }

    func exportAll(uid: String) async -> String? {
        exportLoading = "all"
        defer { exportLoading = nil }
        return nil
    }

    // MARK: - App Info

    var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}
