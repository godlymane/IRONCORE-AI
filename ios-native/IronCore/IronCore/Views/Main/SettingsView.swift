import SwiftUI

/// Full settings screen — mirrors SettingsPanel.jsx from React prototype.
/// Sections: Notifications, Data & Export, Account, Danger Zone.
struct SettingsView: View {
    @StateObject private var vm = SettingsViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel
    let profile: UserProfile?
    let uid: String
    let totalWorkouts: Int
    let totalMeals: Int

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    header
                    notificationsSection
                    dataExportSection
                    accountSection
                    dangerZoneSection
                    footer
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }
        }
        .onAppear { vm.load() }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .bold))
                    Text("BACK")
                        .font(.system(size: 12, weight: .black))
                        .tracking(1)
                }
                .foregroundColor(.textSecondary)
            }
            Spacer()
            Text("SETTINGS")
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
                .tracking(1)
            Spacer()
            // Balance spacer
            HStack(spacing: 6) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .bold))
                Text("BACK")
                    .font(.system(size: 12, weight: .black))
            }
            .foregroundColor(.clear)
        }
        .padding(.top, 8)
    }

    // MARK: - Notifications

    private var notificationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("NOTIFICATIONS")

            if vm.notificationStatus != .authorized {
                // Enable notifications CTA
                Button { vm.requestNotificationPermission() } label: {
                    HStack(spacing: 12) {
                        iconBox("bell.slash.fill", color: Color(hex: "#fbbf24"))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Enable Notifications")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Text("Get workout reminders and achievements")
                                .font(.system(size: 12))
                                .foregroundColor(.textTertiary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundColor(.textTertiary)
                    }
                    .padding(14)
                    .modifier(GlassCard())
                }
            } else {
                // Enabled badge
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#34d399"))
                    Text("Notifications enabled")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(Color(hex: "#34d399"))
                    Spacer()
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(hex: "#34d399").opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(hex: "#34d399").opacity(0.2), lineWidth: 1)
                        )
                )

                // Existing reminders
                ForEach(vm.reminders) { reminder in
                    HStack(spacing: 10) {
                        Image(systemName: "clock.fill")
                            .font(.system(size: 13))
                            .foregroundColor(.ironRedLight)
                        Text("Daily at \(reminder.displayTime)")
                            .font(.system(size: 13))
                            .foregroundColor(.white)
                        Spacer()
                        Button { vm.removeReminder(reminder) } label: {
                            Image(systemName: "trash.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.ironRedLight)
                                .padding(6)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .modifier(GlassCard())
                }

                // Add reminder
                if !vm.showReminderPicker {
                    Button { vm.showReminderPicker = true } label: {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.textTertiary)
                            Text("Add Workout Reminder")
                                .font(.system(size: 13))
                                .foregroundColor(.textSecondary)
                            Spacer()
                        }
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.white.opacity(0.1), style: StrokeStyle(lineWidth: 1, dash: [6]))
                        )
                    }
                } else {
                    reminderPicker
                }
            }
        }
    }

    private var reminderPicker: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                // Hour picker
                Picker("Hour", selection: $vm.selectedHour) {
                    ForEach(0..<24, id: \.self) { h in
                        let period = h >= 12 ? "PM" : "AM"
                        let display = h % 12 == 0 ? 12 : h % 12
                        Text("\(display) \(period)")
                            .tag(h)
                    }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)
                .frame(height: 100)
                .clipped()

                // Minute picker
                Picker("Minute", selection: $vm.selectedMinute) {
                    ForEach([0, 15, 30, 45], id: \.self) { m in
                        Text(String(format: ":%02d", m))
                            .tag(m)
                    }
                }
                .pickerStyle(.wheel)
                .frame(maxWidth: .infinity)
                .frame(height: 100)
                .clipped()
            }

            HStack(spacing: 10) {
                Button {
                    vm.addReminder()
                } label: {
                    Text("SAVE")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.white)
                        .tracking(1)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(LinearGradient.ironGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    vm.showReminderPicker = false
                } label: {
                    Text("CANCEL")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.textSecondary)
                        .tracking(1)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .padding(14)
        .modifier(GlassCard())
    }

    // MARK: - Data & Export

    private var dataExportSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("DATA & EXPORT")

            settingsRow(
                icon: "arrow.down.doc.fill",
                title: "Export Workouts",
                subtitle: "\(totalWorkouts) workouts as CSV",
                isPro: !premiumVM.isPremium
            ) {
                if premiumVM.requirePremium("export") {
                    Task { await vm.exportWorkouts(uid: uid) }
                }
            }

            settingsRow(
                icon: "doc.text.fill",
                title: "Export Meals",
                subtitle: "\(totalMeals) meals as CSV",
                isPro: !premiumVM.isPremium
            ) {
                if premiumVM.requirePremium("export") {
                    Task { await vm.exportMeals(uid: uid) }
                }
            }

            settingsRow(
                icon: "externaldrive.fill",
                title: "Full Backup",
                subtitle: "Export all data as JSON",
                isPro: !premiumVM.isPremium
            ) {
                if premiumVM.requirePremium("export") {
                    Task { await vm.exportAll(uid: uid) }
                }
            }
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("ACCOUNT")

            // Email
            if let email = authVM.user?.email {
                HStack(spacing: 12) {
                    iconBox("envelope.fill", color: .textTertiary)
                    Text(email)
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(14)
                .modifier(GlassCard())
            }

            // Premium status
            Button {
                if profile?.isPremium != true {
                    premiumVM.showPaywall = true
                }
            } label: {
                HStack(spacing: 12) {
                    iconBox(
                        profile?.isPremium == true ? "checkmark.seal.fill" : "lock.fill",
                        color: profile?.isPremium == true ? Color(hex: "#34d399") : .textTertiary
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profile?.isPremium == true ? "Premium Active" : "Free Plan")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(profile?.isPremium == true ? Color(hex: "#34d399") : .white)
                        if let expiry = premiumVM.expiryDate {
                            Text("Renews \(expiry, style: .date)")
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)
                        }
                    }
                    Spacer()
                    if profile?.isPremium != true {
                        Text("UPGRADE")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(.ironRedLight)
                            .tracking(1)
                    }
                }
                .padding(14)
                .modifier(GlassCard())
            }

            // Privacy & Security
            settingsRow(
                icon: "shield.fill",
                title: "Privacy & Security",
                subtitle: "Manage your data and privacy",
                isPro: false
            ) { }

            // Restore Purchases
            settingsRow(
                icon: "arrow.triangle.2.circlepath",
                title: "Restore Purchases",
                subtitle: "Sync with App Store",
                isPro: false
            ) {
                Task { await premiumVM.restorePurchases() }
            }
        }
    }

    // MARK: - Danger Zone

    private var dangerZoneSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeader("DANGER ZONE")

            Button {
                authVM.signOut()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 14))
                        .foregroundColor(.ironRedLight)
                        .frame(width: 32, height: 32)
                        .background(Color.ironRed.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Sign Out")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.ironRedLight)
                        if let email = authVM.user?.email {
                            Text(email)
                                .font(.system(size: 11))
                                .foregroundColor(.textTertiary)
                        }
                    }
                    Spacer()
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.ironRed.opacity(0.06))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.ironRedLight.opacity(0.15), lineWidth: 1)
                )
            }
        }
    }

    // MARK: - Footer

    private var footer: some View {
        VStack(spacing: 4) {
            Text("IronCore Fit v\(vm.appVersion)")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
            Text("Your Phone. Your Trainer.")
                .font(.system(size: 11))
                .foregroundColor(Color.white.opacity(0.2))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }

    // MARK: - Reusable Components

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 11, weight: .black))
            .foregroundColor(.textTertiary)
            .tracking(2)
    }

    private func iconBox(_ systemName: String, color: Color) -> some View {
        Image(systemName: systemName)
            .font(.system(size: 14))
            .foregroundColor(color)
            .frame(width: 32, height: 32)
            .background(color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func settingsRow(
        icon: String,
        title: String,
        subtitle: String,
        isPro: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                iconBox(icon, color: .textTertiary)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        if isPro {
                            Text("PRO")
                                .font(.system(size: 9, weight: .black))
                                .foregroundColor(.ironRedLight)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Capsule().fill(Color.ironRed.opacity(0.15)))
                        }
                    }
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
            }
            .padding(14)
            .modifier(GlassCard())
        }
    }
}
