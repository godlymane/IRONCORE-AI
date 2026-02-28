import Foundation
import UIKit
import UserNotifications
import FirebaseMessaging
import FirebaseFirestore
import FirebaseAuth

/// Push notification service — FCM + local notifications + in-app notification center.
/// Matches pushNotificationService.js + NotificationService.js from React prototype.
final class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()

    @Published var unreadCount: Int = 0
    @Published var notifications: [AppNotification] = []

    private let db = Firestore.firestore()
    private var notificationListener: ListenerRegistration?

    // MARK: - Notification Categories

    /// Actionable notification categories — matches React notification types
    static let workoutReminderCategory = "WORKOUT_REMINDER"
    static let achievementCategory = "ACHIEVEMENT"
    static let socialCategory = "SOCIAL"
    static let arenaCategory = "ARENA"
    static let dailyDropCategory = "DAILY_DROP"
    static let streakCategory = "STREAK"

    private override init() {
        super.init()
    }

    // MARK: - Setup (call from AppDelegate)

    func configure() {
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
        registerCategories()
    }

    // MARK: - Permission Request

    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .badge, .sound, .provisional]
            )
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            return granted
        } catch {
            print("[Notifications] Permission request failed: \(error)")
            return false
        }
    }

    // MARK: - Register Notification Categories (actionable notifications)

    private func registerCategories() {
        // Workout Reminder — "Start Workout" + "Snooze"
        let startAction = UNNotificationAction(
            identifier: "START_WORKOUT",
            title: "Start Workout",
            options: [.foreground]
        )
        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE_REMINDER",
            title: "Snooze 30 min",
            options: []
        )
        let workoutCategory = UNNotificationCategory(
            identifier: Self.workoutReminderCategory,
            actions: [startAction, snoozeAction],
            intentIdentifiers: [],
            options: []
        )

        // Achievement — "View"
        let viewAction = UNNotificationAction(
            identifier: "VIEW_ACHIEVEMENT",
            title: "View",
            options: [.foreground]
        )
        let achievementCategory = UNNotificationCategory(
            identifier: Self.achievementCategory,
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        // Arena — "Enter Arena"
        let enterArena = UNNotificationAction(
            identifier: "ENTER_ARENA",
            title: "Enter Arena",
            options: [.foreground]
        )
        let arenaCategory = UNNotificationCategory(
            identifier: Self.arenaCategory,
            actions: [enterArena],
            intentIdentifiers: [],
            options: []
        )

        // Daily Drop — "Accept Challenge"
        let acceptChallenge = UNNotificationAction(
            identifier: "ACCEPT_CHALLENGE",
            title: "Accept Challenge",
            options: [.foreground]
        )
        let dailyDropCategory = UNNotificationCategory(
            identifier: Self.dailyDropCategory,
            actions: [acceptChallenge],
            intentIdentifiers: [],
            options: []
        )

        // Streak — "Log Now"
        let logNow = UNNotificationAction(
            identifier: "LOG_NOW",
            title: "Log Now",
            options: [.foreground]
        )
        let streakCategory = UNNotificationCategory(
            identifier: Self.streakCategory,
            actions: [logNow],
            intentIdentifiers: [],
            options: []
        )

        // Social — "View"
        let socialCategory = UNNotificationCategory(
            identifier: Self.socialCategory,
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            workoutCategory,
            achievementCategory,
            arenaCategory,
            dailyDropCategory,
            streakCategory,
            socialCategory
        ])
    }

    // MARK: - FCM Token Management

    func saveFCMToken(_ token: String, uid: String) {
        Task {
            try? await db.collection("users").document(uid)
                .collection("data").document("profile")
                .setData(["fcmToken": token, "platform": "ios"], merge: true)
        }
    }

    func removeFCMToken(uid: String) {
        Task {
            try? await db.collection("users").document(uid)
                .collection("data").document("profile")
                .updateData(["fcmToken": FieldValue.delete()])
        }
    }

    // MARK: - Local Notification Scheduling

    /// Schedule a workout reminder at a specific time
    func scheduleWorkoutReminder(hour: Int, minute: Int, message: String? = nil, identifier: String? = nil) {
        let content = UNMutableNotificationContent()
        content.title = "Workout Reminder"
        content.body = message ?? "Time to crush your workout!"
        content.sound = .default
        content.categoryIdentifier = Self.workoutReminderCategory

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let id = identifier ?? "workout_reminder_\(hour)_\(minute)"
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[Notifications] Failed to schedule reminder: \(error)")
            }
        }
    }

    /// Schedule streak protection reminder (evening — "Don't lose your streak!")
    func scheduleStreakReminder() {
        let content = UNMutableNotificationContent()
        content.title = "Streak Alert"
        content.body = "You haven't logged today. Don't lose your streak!"
        content.sound = .default
        content.categoryIdentifier = Self.streakCategory

        var dateComponents = DateComponents()
        dateComponents.hour = 20 // 8 PM
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "streak_reminder", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request)
    }

    /// Schedule daily drop reminder
    func scheduleDailyDropReminder() {
        let content = UNMutableNotificationContent()
        content.title = "Daily Drop Available"
        content.body = "New challenge ready. Earn bonus XP today!"
        content.sound = .default
        content.categoryIdentifier = Self.dailyDropCategory

        var dateComponents = DateComponents()
        dateComponents.hour = 9 // 9 AM
        dateComponents.minute = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "daily_drop", content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request)
    }

    /// Remove a scheduled notification
    func removeReminder(identifier: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
    }

    /// Remove all pending notifications
    func removeAllReminders() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    // MARK: - Firestore In-App Notifications (matches NotificationService.js)

    func startListening(uid: String) {
        stopListening()

        let query = db.collection("users").document(uid)
            .collection("notifications")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)

        notificationListener = query.addSnapshotListener { [weak self] snapshot, error in
            guard let self = self, let docs = snapshot?.documents else { return }
            Task { @MainActor in
                self.notifications = docs.compactMap { doc in
                    let data = doc.data()
                    return AppNotification(
                        id: doc.documentID,
                        title: data["title"] as? String ?? "",
                        message: data["message"] as? String ?? "",
                        type: data["type"] as? String ?? "info",
                        read: data["read"] as? Bool ?? false,
                        actionLink: data["actionLink"] as? String,
                        createdAt: (data["createdAt"] as? Timestamp)?.dateValue()
                    )
                }
                self.unreadCount = self.notifications.filter { !$0.read }.count

                // Update app badge
                await MainActor.run {
                    UIApplication.shared.applicationIconBadgeNumber = self.unreadCount
                }
            }
        }
    }

    func stopListening() {
        notificationListener?.remove()
        notificationListener = nil
    }

    /// Mark a single notification as read
    func markAsRead(uid: String, notificationId: String) async {
        try? await db.collection("users").document(uid)
            .collection("notifications").document(notificationId)
            .updateData(["read": true])
    }

    /// Mark all notifications as read
    func markAllAsRead(uid: String) async {
        let query = db.collection("users").document(uid)
            .collection("notifications")
            .whereField("read", isEqualTo: false)

        do {
            let snapshot = try await query.getDocuments()
            for doc in snapshot.documents {
                try? await doc.reference.updateData(["read": true])
            }
        } catch {
            print("[Notifications] Failed to mark all as read: \(error)")
        }
    }

    /// Send a notification to a user (from client — e.g., social interactions)
    func sendNotification(
        toUid: String,
        title: String,
        message: String,
        type: String = "info",
        actionLink: String? = nil
    ) async {
        try? await db.collection("users").document(toUid)
            .collection("notifications").addDocument(data: [
                "title": title,
                "message": message,
                "type": type,
                "read": false,
                "actionLink": actionLink as Any,
                "createdAt": FieldValue.serverTimestamp()
            ])
    }

    // MARK: - Handle Notification Action

    func handleAction(actionIdentifier: String, categoryIdentifier: String) {
        switch actionIdentifier {
        case "START_WORKOUT":
            NotificationCenter.default.post(name: .navigateToWorkout, object: nil)
        case "ENTER_ARENA":
            NotificationCenter.default.post(name: .navigateToArena, object: nil)
        case "ACCEPT_CHALLENGE":
            NotificationCenter.default.post(name: .navigateToDashboard, object: nil)
        case "LOG_NOW":
            NotificationCenter.default.post(name: .navigateToDashboard, object: nil)
        case "VIEW_ACHIEVEMENT":
            NotificationCenter.default.post(name: .navigateToProfile, object: nil)
        case "SNOOZE_REMINDER":
            // Reschedule 30 min from now
            let content = UNMutableNotificationContent()
            content.title = "Workout Reminder"
            content.body = "Snoozed reminder — time to go!"
            content.sound = .default
            content.categoryIdentifier = Self.workoutReminderCategory
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1800, repeats: false)
            let request = UNNotificationRequest(identifier: "snooze_\(Date().timeIntervalSince1970)", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request)
        default:
            break
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationService: UNUserNotificationCenterDelegate {
    /// Show notification banner even when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    /// Handle notification tap + action buttons
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let actionId = response.actionIdentifier
        let categoryId = response.notification.request.content.categoryIdentifier

        if actionId != UNNotificationDefaultActionIdentifier {
            handleAction(actionIdentifier: actionId, categoryIdentifier: categoryId)
        } else {
            // Default tap — navigate based on category
            switch categoryId {
            case Self.workoutReminderCategory:
                NotificationCenter.default.post(name: .navigateToWorkout, object: nil)
            case Self.arenaCategory:
                NotificationCenter.default.post(name: .navigateToArena, object: nil)
            case Self.dailyDropCategory, Self.streakCategory:
                NotificationCenter.default.post(name: .navigateToDashboard, object: nil)
            case Self.achievementCategory:
                NotificationCenter.default.post(name: .navigateToProfile, object: nil)
            default:
                break
            }
        }

        completionHandler()
    }
}

// MARK: - MessagingDelegate (FCM token)

extension NotificationService: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[FCM] Token: \(token.prefix(20))...")

        // Save token to Firestore for the current user
        if let uid = Auth.auth().currentUser?.uid {
            saveFCMToken(token, uid: uid)
        }
    }
}

// MARK: - In-App Notification Model

struct AppNotification: Identifiable {
    let id: String
    let title: String
    let message: String
    let type: String          // "info", "warning", "success", "achievement", "social", "arena"
    let read: Bool
    let actionLink: String?
    let createdAt: Date?

    var icon: String {
        switch type {
        case "achievement": return "trophy.fill"
        case "warning": return "exclamationmark.triangle.fill"
        case "success": return "bolt.fill"
        case "social": return "person.2.fill"
        case "arena": return "shield.fill"
        default: return "info.circle.fill"
        }
    }

    var iconColor: String {
        switch type {
        case "achievement": return "#eab308"
        case "warning": return "#ef4444"
        case "success": return "#22c55e"
        case "social": return "#3b82f6"
        case "arena": return "#a855f7"
        default: return "#f59e0b"
        }
    }
}

// MARK: - Navigation Notification Names

extension Notification.Name {
    static let navigateToWorkout = Notification.Name("navigateToWorkout")
    static let navigateToArena = Notification.Name("navigateToArena")
    static let navigateToDashboard = Notification.Name("navigateToDashboard")
    static let navigateToProfile = Notification.Name("navigateToProfile")
}
