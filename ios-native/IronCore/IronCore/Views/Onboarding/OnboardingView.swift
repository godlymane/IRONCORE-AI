import SwiftUI

/// Full onboarding flow — 7 steps matching OnboardingView.jsx exactly
/// Steps: Intro → Goal → Bio → Activity → Intensity → Analysis → Complete
struct OnboardingView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var vm = OnboardingViewModel()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            AnimatedBackground()

            VStack(spacing: 0) {
                // Header with progress dots
                headerBar

                // Content
                ScrollView(showsIndicators: false) {
                    VStack {
                        Spacer(minLength: 20)

                        switch vm.step {
                        case .intro:     introStep
                        case .goal:      goalStep
                        case .bio:       bioStep
                        case .activity:  activityStep
                        case .intensity: intensityStep
                        case .analysis:  analysisStep
                        case .complete:  completeStep
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, 24)
                }
            }
        }
        .onDisappear { vm.cleanup() }
    }

    // MARK: - Header (System_Init + progress dots)
    private var headerBar: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "touchid")
                    .foregroundColor(.ironRedLight)
                Text("SYSTEM_INIT")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .tracking(3)
                    .foregroundColor(.ironRedLight)
            }

            Spacer()

            // 6 progress dots
            HStack(spacing: 6) {
                ForEach(0..<6) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(
                            vm.step.progressIndex >= i
                                ? LinearGradient(colors: [.ironRed, .ironRedLight], startPoint: .leading, endPoint: .trailing)
                                : LinearGradient(colors: [Color.white.opacity(0.1)], startPoint: .leading, endPoint: .trailing)
                        )
                        .frame(width: 24, height: 6)
                        .shadow(
                            color: vm.step.progressIndex >= i ? .ironRedLight.opacity(0.6) : .clear,
                            radius: 6
                        )
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
    }

    // MARK: - Step 1: Intro
    private var introStep: some View {
        VStack(spacing: 32) {
            // User photo
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.ironRed.opacity(0.6), .clear],
                            center: .center, startRadius: 0, endRadius: 80
                        )
                    )
                    .frame(width: 160, height: 160)
                    .blur(radius: 20)

                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRed.opacity(0.3), Color.ironRedDark.opacity(0.3)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 128, height: 128)
                    .overlay(
                        Circle().stroke(Color.ironRedLight.opacity(0.5), lineWidth: 3)
                    )
                    .shadow(color: .ironRed.opacity(0.4), radius: 25)
                    .overlay(
                        Group {
                            if let photoURL = authVM.user?.photoURL {
                                AsyncImage(url: photoURL) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: {
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 48))
                                        .foregroundColor(.gray)
                                }
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 48))
                                    .foregroundColor(.gray)
                            }
                        }
                        .frame(width: 128, height: 128)
                    )
            }

            VStack(spacing: 12) {
                VStack(spacing: 4) {
                    Text("Welcome to")
                        .font(.system(size: 32, weight: .black))
                        .italic()
                    Text("IronCore AI")
                        .font(.system(size: 32, weight: .black))
                        .italic()
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.ironRed, .ironRedExtra, .pink],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                }

                Text("The IronCore Protocol is not just a log. It's a precision instrument for your biology. Let's calibrate your profile.")
                    .font(.system(size: 14))
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }

            // CTA Button
            Button { vm.nextStep() } label: {
                HStack(spacing: 8) {
                    Text("Initialize Profile")
                        .font(.system(size: 16, weight: .bold))
                    Image(systemName: "chevron.right")
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: .ironRed.opacity(0.4), radius: 15, y: 8)
            }
        }
    }

    // MARK: - Step 2: Goal Selection
    private var goalStep: some View {
        VStack(spacing: 24) {
            stepHeader(icon: "target", iconColor: .orange, title: "Primary Objective", subtitle: "Define your mission parameters.")

            VStack(spacing: 16) {
                GoalOptionCard(
                    goal: .lose,
                    selected: vm.data.goal == .lose,
                    onTap: { vm.data.goal = .lose }
                )
                GoalOptionCard(
                    goal: .maintain,
                    selected: vm.data.goal == .maintain,
                    onTap: { vm.data.goal = .maintain }
                )
                GoalOptionCard(
                    goal: .gain,
                    selected: vm.data.goal == .gain,
                    onTap: { vm.data.goal = .gain }
                )
            }

            primaryButton(title: "Next Phase") { vm.nextStep() }
        }
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Step 3: Bio-Metrics
    private var bioStep: some View {
        VStack(spacing: 24) {
            stepHeader(icon: "scalemass.fill", iconColor: .cyan, title: "Bio-Metrics", subtitle: "Input raw data for BMR calculation.")

            // 2x2 grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                GlassInputField(label: "Weight", value: $vm.weightText, placeholder: "70", unit: "kg")
                GlassInputField(label: "Height", value: $vm.heightText, placeholder: "175", unit: "cm")
                GlassInputField(label: "Age", value: $vm.ageText, placeholder: "25", unit: "yrs")

                // Gender picker
                VStack(alignment: .leading, spacing: 4) {
                    Text("GENDER")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textTertiary)

                    Picker("", selection: $vm.data.gender) {
                        Text("Male").tag(Gender.male)
                        Text("Female").tag(Gender.female)
                    }
                    .pickerStyle(.segmented)
                }
                .padding(16)
                .background(RoundedRectangle(cornerRadius: 16).fill(LinearGradient.glassGradient))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.glassBorder))
            }

            // Optional: Body fat
            GlassInputField(label: "Body Fat % (Optional)", value: $vm.bodyFatText, placeholder: "15", unit: "%")

            // Target weight (only if goal != maintain)
            if vm.data.goal != .maintain {
                GlassInputField(
                    label: "Target Weight",
                    value: $vm.targetWeightText,
                    placeholder: "Goal",
                    unit: "kg",
                    highlight: true
                )
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            // Nav buttons
            HStack(spacing: 16) {
                backButton { vm.previousStep() }

                Button { vm.nextStep() } label: {
                    Text("Continue")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(
                                    LinearGradient(
                                        colors: [.cyan.opacity(0.9), .blue.opacity(0.9)],
                                        startPoint: .leading, endPoint: .trailing
                                    )
                                )
                        )
                        .shadow(color: .cyan.opacity(0.3), radius: 10, y: 5)
                }
                .disabled(!vm.canProceedFromBio)
                .opacity(vm.canProceedFromBio ? 1 : 0.4)
            }
        }
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Step 4: Activity Level
    private var activityStep: some View {
        VStack(spacing: 20) {
            stepHeader(icon: "figure.run", iconColor: .green, title: "Activity Level", subtitle: "How active is your daily routine?")

            VStack(spacing: 8) {
                ForEach(ActivityLevel.allCases, id: \.rawValue) { level in
                    ActivityLevelRow(
                        level: level,
                        selected: vm.data.activityLevel == level,
                        onTap: { vm.data.activityLevel = level }
                    )
                }
            }

            HStack(spacing: 16) {
                backButton { vm.previousStep() }

                Button { vm.nextStep() } label: {
                    Text("Continue")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(
                                    LinearGradient(
                                        colors: [.green.opacity(0.9), Color(red: 22/255, green: 163/255, blue: 74/255).opacity(0.9)],
                                        startPoint: .leading, endPoint: .trailing
                                    )
                                )
                        )
                        .shadow(color: .green.opacity(0.3), radius: 10, y: 5)
                }
            }
        }
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Step 5: Intensity
    private var intensityStep: some View {
        VStack(spacing: 24) {
            stepHeader(
                icon: "bolt.fill",
                iconColor: .yellow,
                title: "Intensity Protocol",
                subtitle: vm.data.goal == .maintain ? "Your maintenance calories will be calculated." : "How aggressive is your timeline?"
            )

            if vm.data.goal != .maintain {
                VStack(spacing: 12) {
                    ForEach(IntensityLevel.allCases, id: \.rawValue) { level in
                        IntensityRow(
                            level: level,
                            selected: vm.data.intensity == level,
                            onTap: { vm.data.intensity = level }
                        )
                    }
                }
            } else {
                // Maintenance message
                Text("Your TDEE will be set as your daily target for recomposition.")
                    .font(.system(size: 14))
                    .foregroundColor(.textSecondary)
                    .padding(24)
                    .frame(maxWidth: .infinity)
                    .glassCard()
            }

            HStack(spacing: 16) {
                backButton { vm.previousStep() }

                Button { vm.nextStep() } label: {
                    Text("Generate Protocol")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(
                                    LinearGradient(
                                        colors: [.yellow.opacity(0.9), .orange.opacity(0.9)],
                                        startPoint: .leading, endPoint: .trailing
                                    )
                                )
                        )
                        .shadow(color: .yellow.opacity(0.3), radius: 10, y: 5)
                }
            }
        }
        .transition(.move(edge: .trailing).combined(with: .opacity))
    }

    // MARK: - Step 6: Analysis (loading animation)
    private var analysisStep: some View {
        VStack(spacing: 32) {
            // Circular progress
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 3)
                    .frame(width: 180, height: 180)

                Circle()
                    .trim(from: 0, to: vm.loadingProgress / 100)
                    .stroke(
                        LinearGradient(colors: [.ironRed, .ironRedExtra], startPoint: .leading, endPoint: .trailing),
                        style: StrokeStyle(lineWidth: 3, lineCap: .round)
                    )
                    .frame(width: 180, height: 180)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut(duration: 0.3), value: vm.loadingProgress)

                Text("\(Int(min(vm.loadingProgress, 100)))%")
                    .font(.system(size: 40, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
            }

            VStack(spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.ironRedLight)
                    Text("COMPUTING PROTOCOL...")
                        .font(.system(size: 20, weight: .black))
                        .italic()
                }

                let calc = vm.calculated
                VStack(spacing: 4) {
                    Text("BMR: \(calc.bmr) kcal")
                    Text("TDEE: \(calc.tdee) kcal")
                    Text("Target: \(calc.calories) kcal")
                }
                .font(.system(size: 14, design: .monospaced))
                .foregroundColor(.textTertiary)
            }
        }
    }

    // MARK: - Step 7: Complete
    private var completeStep: some View {
        VStack(spacing: 24) {
            // Trophy icon
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: [Color.green.opacity(0.2), Color.green.opacity(0.1)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: 112, height: 112)
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.green.opacity(0.3), lineWidth: 1)
                )
                .shadow(color: .green.opacity(0.3), radius: 30)
                .overlay(
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 56))
                        .foregroundColor(.green)
                )

            VStack(spacing: 8) {
                Text("SYSTEM READY")
                    .font(.system(size: 32, weight: .black))
                    .italic()
                Text("Your custom IronCore protocol has been generated.")
                    .font(.system(size: 14))
                    .foregroundColor(.textSecondary)
            }

            // Calorie & Macro card
            let calc = vm.calculated
            VStack(spacing: 16) {
                VStack(spacing: 4) {
                    Text("YOUR DAILY TARGET")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textSecondary)
                    Text("\(calc.calories)")
                        .font(.system(size: 48, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                    Text("CALORIES")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.ironRedLight)
                }

                HStack(spacing: 24) {
                    macroColumn(value: calc.protein, label: "Protein", color: .orange)
                    macroColumn(value: calc.carbs, label: "Carbs", color: .yellow)
                    macroColumn(value: calc.fat, label: "Fat", color: .pink)
                }
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRed.opacity(0.15), Color.ironRedDark.opacity(0.08)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
            )
            .shadow(color: .ironRed.opacity(0.15), radius: 20)

            // Summary card
            VStack(spacing: 12) {
                summaryRow(label: "GOAL", value: vm.data.goal.rawValue.uppercased())
                Divider().background(Color.white.opacity(0.05))
                summaryRow(label: "TDEE", value: "\(calc.tdee) kcal")
                Divider().background(Color.white.opacity(0.05))
                HStack {
                    Text("STATUS")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.textTertiary)
                    Spacer()
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text("ONLINE")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.green)
                    }
                }
            }
            .padding(16)
            .glassCard()

            // Enter Dashboard
            Button {
                Task { await authVM.completeOnboarding(data: vm.data) }
            } label: {
                Text("ENTER DASHBOARD")
                    .font(.system(size: 16, weight: .black))
                    .tracking(4)
                    .foregroundColor(Color(red: 17/255, green: 24/255, blue: 39/255))
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.95), Color.white.opacity(0.9)],
                                    startPoint: .leading, endPoint: .trailing
                                )
                            )
                    )
                    .shadow(color: .white.opacity(0.3), radius: 20, y: 10)
            }
        }
    }

    // MARK: - Shared Components

    private func stepHeader(icon: String, iconColor: Color, title: String, subtitle: String) -> some View {
        VStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [iconColor.opacity(0.2), iconColor.opacity(0.1)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: 64, height: 64)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(iconColor.opacity(0.3), lineWidth: 1)
                )
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 28))
                        .foregroundColor(iconColor)
                )

            Text(title.uppercased())
                .font(.system(size: 28, weight: .black))
                .italic()
            Text(subtitle)
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)
        }
        .multilineTextAlignment(.center)
    }

    private func primaryButton(title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: .ironRed.opacity(0.3), radius: 10, y: 5)
        }
    }

    private func backButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: "chevron.left")
                .foregroundColor(.textSecondary)
                .frame(width: 52, height: 52)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(LinearGradient.glassGradient)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.glassHighlight, lineWidth: 1)
                )
        }
    }

    private func macroColumn(value: Int, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(value)g")
                .font(.system(size: 20, weight: .black))
                .foregroundColor(color)
            Text(label.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.textTertiary)
        }
    }

    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.textTertiary)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Goal Option Card (matches React OptionCard)
private struct GoalOptionCard: View {
    let goal: FitnessGoal
    let selected: Bool
    let onTap: () -> Void

    private var iconColor: Color {
        switch goal {
        case .lose: return .orange
        case .maintain: return .yellow
        case .gain: return .green
        }
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 20) {
                // Icon
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        selected
                            ? LinearGradient(colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)], startPoint: .topLeading, endPoint: .bottomTrailing)
                            : LinearGradient(colors: [Color.white.opacity(0.08), Color.white.opacity(0.04)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .frame(width: 56, height: 56)
                    .shadow(color: selected ? .ironRed.opacity(0.4) : .clear, radius: 12)
                    .overlay(
                        Image(systemName: goal.iconName)
                            .font(.system(size: 24))
                            .foregroundColor(selected ? .white : iconColor)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.displayName.uppercased())
                        .font(.system(size: 16, weight: .black))
                        .italic()
                        .foregroundColor(selected ? .white : .gray)
                    Text(goal.description)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.ironRedLight)
                }
            }
            .padding(24)
            .glassCard(selected: selected)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Activity Level Row
private struct ActivityLevelRow: View {
    let level: ActivityLevel
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: level.icon)
                    .font(.system(size: 16))
                    .foregroundColor(selected ? .ironRedLight : .textTertiary)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text(level.label)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(selected ? .white : .textSecondary)
                    Text(level.description)
                        .font(.system(size: 11))
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.ironRedLight)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        selected
                            ? LinearGradient(colors: [Color.ironRed.opacity(0.25), Color.ironRed.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing)
                            : LinearGradient.glassGradient
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(selected ? Color.ironRedLight.opacity(0.4) : Color.glassBorder, lineWidth: 1)
            )
            .shadow(color: selected ? .ironRed.opacity(0.2) : .clear, radius: 10)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Intensity Row
private struct IntensityRow: View {
    let level: IntensityLevel
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(level.label.uppercased())
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(selected ? .white : .textSecondary)
                    Text(level.description)
                        .font(.system(size: 12))
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                // Radio button
                Circle()
                    .stroke(selected ? Color.ironRed : Color.white.opacity(0.2), lineWidth: 2)
                    .frame(width: 24, height: 24)
                    .overlay(
                        Group {
                            if selected {
                                Circle()
                                    .fill(Color.ironRed)
                                    .frame(width: 24, height: 24)
                                    .overlay(
                                        Circle()
                                            .fill(Color.white)
                                            .frame(width: 8, height: 8)
                                    )
                            }
                        }
                    )
            }
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        selected
                            ? LinearGradient(colors: [Color.ironRed.opacity(0.2), Color.ironRedDark.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing)
                            : LinearGradient.glassGradient
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(selected ? Color.ironRedLight.opacity(0.4) : Color.glassBorder, lineWidth: 1)
            )
            .shadow(color: selected ? .ironRed.opacity(0.2) : .clear, radius: 12)
        }
        .buttonStyle(.plain)
    }
}
