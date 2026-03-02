import SwiftUI
import Charts
import FirebaseAuth

/// Chronicle — daily diary view. Mirrors ChronicleView.jsx from React prototype.
/// Date picker, daily summary grid, macro bar chart, and timeline of meals/workouts/cardio.
struct ChronicleView: View {
    let profile: UserProfile?
    let isPremium: Bool
    let accountCreationDate: Date?
    var onNavigateToDashboard: (() -> Void)? = nil

    @StateObject private var vm = ChronicleViewModel()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    headerSection
                    datePickerSection
                    dailySummaryGrid
                    macroChartSection
                    timelineSection
                    Spacer(minLength: 100)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
            }

            // Delete confirmation overlay
            if vm.showDeleteConfirm {
                deleteConfirmOverlay
            }
        }
        .onAppear {
            if let uid = Auth.auth().currentUser?.uid {
                vm.startListening(uid: uid)
            }
        }
        .onDisappear {
            vm.stopListening()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("CHRONICLE")
                    .font(.system(size: 24, weight: .black))
                    .italic()
                    .foregroundColor(.white)
                    .tracking(-1)
                Text("DAILY DIARY")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(2)
            }
            Spacer()
        }
    }

    // MARK: - Date Picker (Horizontal Scroll)

    private var datePickerSection: some View {
        let allDates = vm.allAvailableDates(creationTimestamp: accountCreationDate)
        let dates = vm.visibleDates(allDates: allDates, isPremium: isPremium)
        let showLock = vm.hasLockedHistory(allDates: allDates, isPremium: isPremium)

        return ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    // Locked history indicator
                    if showLock {
                        Button {
                            // Premium gate — could trigger paywall
                        } label: {
                            VStack(spacing: 4) {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 14))
                                Text("PRO")
                                    .font(.system(size: 9, weight: .black))
                            }
                            .foregroundColor(Color(hex: "#eab308"))
                            .frame(width: 56, height: 80)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color(hex: "#eab308").opacity(0.1))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color(hex: "#eab308").opacity(0.3), lineWidth: 1)
                                    )
                            )
                        }
                    }

                    ForEach(dates, id: \.self) { dateStr in
                        let label = vm.dayLabel(for: dateStr)
                        let isSelected = vm.selectedDate == dateStr

                        Button {
                            withAnimation(.easeOut(duration: 0.2)) {
                                vm.selectedDate = dateStr
                            }
                        } label: {
                            VStack(spacing: 4) {
                                Text(label.weekday)
                                    .font(.system(size: 11, weight: .bold))
                                Text("\(label.day)")
                                    .font(.system(size: 20, weight: .black))
                            }
                            .foregroundColor(isSelected ? .white : Color.gray.opacity(0.5))
                            .frame(width: 56, height: 80)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(
                                        isSelected
                                            ? Color.ironRed
                                            : Color(hex: "#111111")
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(
                                                isSelected ? Color.ironRedLight.opacity(0.5) : Color.white.opacity(0.06),
                                                lineWidth: 1
                                            )
                                    )
                            )
                            .shadow(
                                color: isSelected ? Color.ironRed.opacity(0.4) : .clear,
                                radius: 10, y: 4
                            )
                            .scaleEffect(isSelected ? 1.05 : 1.0)
                        }
                        .id(dateStr)
                    }
                }
                .padding(.vertical, 4)
            }
            .onAppear {
                // Auto-scroll to today
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    if let last = dates.last {
                        withAnimation {
                            proxy.scrollTo(last, anchor: .trailing)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Daily Summary Grid

    private var dailySummaryGrid: some View {
        let calTarget = vm.dailyCalorieTarget(profile)
        let protTarget = vm.dailyProteinTarget(profile)

        return VStack(spacing: 12) {
            // Top row: 2 cards
            HStack(spacing: 12) {
                // Cals / Target
                summaryCard(
                    label: "CALS / TARGET",
                    mainText: "\(vm.totalCalories)",
                    subText: "/ \(calTarget)",
                    mainColor: .white
                )

                // Protein / Target
                summaryCard(
                    label: "PROT / TARGET",
                    mainText: "\(vm.totalProtein)",
                    subText: "/ \(protTarget)",
                    mainColor: Color.ironRedLight
                )
            }

            // Net Balance (full width)
            netBalanceCard

            // Bottom row: 2 cards
            HStack(spacing: 12) {
                // Water
                VStack(spacing: 4) {
                    Text("WATER")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(Color.gray.opacity(0.5))
                    Text("\(vm.waterIntake)")
                        .font(.system(size: 28, weight: .black))
                        .italic()
                        .foregroundColor(Color(hex: "#f59e0b"))
                    Text("ML")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(Color.gray.opacity(0.4))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hex: "#111111"))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.white.opacity(0.06), lineWidth: 1)
                        )
                )

                // Weigh-In
                VStack(spacing: 4) {
                    Text("WEIGH-IN")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(Color.gray.opacity(0.5))
                    Text(vm.dayWeight)
                        .font(.system(size: 28, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                    Text("KG")
                        .font(.system(size: 8, weight: .black))
                        .foregroundColor(Color.gray.opacity(0.4))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hex: "#111111"))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.white.opacity(0.06), lineWidth: 1)
                        )
                )
            }
        }
    }

    private func summaryCard(label: String, mainText: String, subText: String, mainColor: Color) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .black))
                .foregroundColor(Color.gray.opacity(0.5))
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(mainText)
                    .font(.system(size: 22, weight: .black))
                    .italic()
                    .foregroundColor(mainColor)
                Text(subText)
                    .font(.system(size: 12))
                    .foregroundColor(Color.gray.opacity(0.4))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(hex: "#111111"))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    private var netBalanceCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "scalemass.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color.gray.opacity(0.5))
                    Text("NET BALANCE")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(Color.gray.opacity(0.5))
                }
                Text("\(vm.netCalories)")
                    .font(.system(size: 40, weight: .black))
                    .italic()
                    .foregroundColor(.white)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("Calculation")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.gray.opacity(0.5))
                Text("\(vm.totalCalories) - \(vm.totalBurned)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.7))
            }
        }
        .padding(20)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#111111"), Color(hex: "#0a0a0a")],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                // Accent skew shape
                HStack {
                    Spacer()
                    Rectangle()
                        .fill(Color.ironRed.opacity(0.08))
                        .frame(width: 120)
                        .rotationEffect(.degrees(-8))
                        .offset(x: 20)
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))

                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            }
        )
    }

    // MARK: - Macro Bar Chart

    private var macroChartSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("MACRO ANALYSIS")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(Color.gray.opacity(0.5))
                .tracking(1)

            Chart(vm.macroChartData) { bar in
                BarMark(
                    x: .value("Macro", bar.name),
                    y: .value("Grams", bar.value)
                )
                .foregroundStyle(Color(hex: bar.color))
                .cornerRadius(6)
            }
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel()
                        .foregroundStyle(Color.gray.opacity(0.5))
                        .font(.system(size: 10))
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(Color.white.opacity(0.05))
                    AxisValueLabel()
                        .foregroundStyle(Color.gray.opacity(0.3))
                        .font(.system(size: 9))
                }
            }
            .frame(height: 180)
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

    // MARK: - Timeline

    private var timelineSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("TIMELINE")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(Color.gray.opacity(0.5))
                .tracking(2)
                .padding(.leading, 4)

            if vm.timeline.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "clock")
                        .font(.system(size: 28))
                        .foregroundColor(Color.gray.opacity(0.3))
                    Text("No records found for this date.")
                        .font(.system(size: 13, weight: .medium))
                        .italic()
                        .foregroundColor(Color.gray.opacity(0.4))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            } else {
                ForEach(vm.timeline) { entry in
                    timelineRow(entry)
                }
            }
        }
    }

    private func timelineRow(_ entry: ChronicleViewModel.TimelineEntry) -> some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: entry.icon)
                .font(.system(size: 16))
                .foregroundColor(Color(hex: entry.iconColor.foreground))
                .frame(width: 40, height: 40)
                .background(
                    Circle()
                        .fill(Color(hex: entry.iconColor.background).opacity(0.15))
                )

            // Content
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.name)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text(entry.detail)
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .lineLimit(1)
            }

            Spacer()

            // Time & Delete
            VStack(alignment: .trailing, spacing: 4) {
                if !entry.formattedTime.isEmpty {
                    Text(entry.formattedTime)
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundColor(Color.gray.opacity(0.4))
                }

                Button {
                    vm.requestDelete(entry)
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 12))
                        .foregroundColor(Color.gray.opacity(0.3))
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(hex: "#111111"))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Delete Confirmation Overlay

    private var deleteConfirmOverlay: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture {
                    vm.cancelDelete()
                }

            VStack(spacing: 16) {
                Text("Delete this entry?")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Text("This can't be undone.")
                    .font(.system(size: 12))
                    .foregroundColor(Color.gray.opacity(0.5))

                HStack(spacing: 12) {
                    Button {
                        vm.cancelDelete()
                    } label: {
                        Text("Cancel")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color.gray.opacity(0.6))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.white.opacity(0.05))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            )
                    }

                    Button {
                        if let uid = Auth.auth().currentUser?.uid {
                            Task { await vm.confirmDelete(uid: uid) }
                        }
                    } label: {
                        Text("Delete")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.ironRed, Color.ironRedDark],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                            )
                    }
                }
            }
            .padding(24)
            .frame(maxWidth: 300)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [Color.white.opacity(0.08), Color.white.opacity(0.02)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
            .shadow(color: Color.black.opacity(0.5), radius: 30)
        }
        .transition(.opacity)
        .animation(.easeOut(duration: 0.2), value: vm.showDeleteConfirm)
    }
}
