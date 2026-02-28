import SwiftUI

/// In-app notification center — matches NotificationCenter.jsx from React prototype.
/// Shows bell badge in DashboardView header, opens sheet with notification list.
struct NotificationCenterView: View {
    let uid: String
    @ObservedObject var notificationService = NotificationService.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if notificationService.notifications.isEmpty {
                    emptyState
                } else {
                    notificationList
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                        .foregroundColor(.ironRedLight)
                }

                if !notificationService.notifications.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Read All") {
                            Task {
                                await notificationService.markAllAsRead(uid: uid)
                            }
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.ironRedLight)
                    }
                }
            }
            .onAppear {
                notificationService.startListening(uid: uid)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "bell.slash")
                .font(.system(size: 48))
                .foregroundColor(.textTertiary)

            Text("No Notifications")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)

            Text("You're all caught up!")
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)
            Spacer()
        }
    }

    // MARK: - Notification List

    private var notificationList: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(notificationService.notifications) { notification in
                    NotificationRow(notification: notification) {
                        Task {
                            await notificationService.markAsRead(
                                uid: uid,
                                notificationId: notification.id
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 100)
        }
    }
}

// MARK: - Notification Row

private struct NotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Type icon
                ZStack {
                    Circle()
                        .fill(Color(hex: notification.iconColor).opacity(0.15))
                        .frame(width: 40, height: 40)

                    Image(systemName: notification.icon)
                        .font(.system(size: 16))
                        .foregroundColor(Color(hex: notification.iconColor))
                }

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(notification.title)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)

                        Spacer()

                        if !notification.read {
                            Circle()
                                .fill(Color.ironRedLight)
                                .frame(width: 8, height: 8)
                        }
                    }

                    Text(notification.message)
                        .font(.system(size: 13))
                        .foregroundColor(.textSecondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let date = notification.createdAt {
                        Text(timeAgo(date))
                            .font(.system(size: 11))
                            .foregroundColor(.textTertiary)
                    }
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(notification.read
                          ? Color.white.opacity(0.03)
                          : Color.white.opacity(0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                notification.read
                                ? Color.white.opacity(0.04)
                                : Color(hex: notification.iconColor).opacity(0.15),
                                lineWidth: 1
                            )
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private func timeAgo(_ date: Date) -> String {
        let seconds = Int(-date.timeIntervalSinceNow)
        if seconds < 60 { return "Just now" }
        if seconds < 3600 { return "\(seconds / 60)m ago" }
        if seconds < 86400 { return "\(seconds / 3600)h ago" }
        if seconds < 604800 { return "\(seconds / 86400)d ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Bell Badge Button (use in DashboardView header)

struct NotificationBellButton: View {
    let uid: String
    @ObservedObject var notificationService = NotificationService.shared
    @State private var showNotifications = false

    var body: some View {
        Button {
            showNotifications = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.white.opacity(0.8))

                if notificationService.unreadCount > 0 {
                    Text("\(min(notificationService.unreadCount, 99))")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(Capsule().fill(Color.ironRed))
                        .offset(x: 6, y: -6)
                }
            }
        }
        .sheet(isPresented: $showNotifications) {
            NotificationCenterView(uid: uid)
        }
    }
}
