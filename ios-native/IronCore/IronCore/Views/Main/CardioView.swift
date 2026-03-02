import SwiftUI
import FirebaseAuth

/// Cardio (Pulse Lab) — energy expenditure calculator. Mirrors CardioView.jsx from React prototype.
/// Treadmill, Walking, Cycling modes with MET-based calorie formulas.
struct CardioView: View {
    let profile: UserProfile?
    let progress: [[String: Any]]
    var onNavigateToDashboard: (() -> Void)? = nil

    @StateObject private var vm = CardioViewModel()

    var body: some View {
        let weight = vm.userWeight(profile: profile, progress: progress)

        Group {
            if !vm.hasRequiredBiometrics(profile: profile, progress: progress) {
                lockedState
            } else {
                mainContent(weight: weight ?? 70)
            }
        }
        .background(Color.black)
    }

    // MARK: - Locked State

    private var lockedState: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 24) {
                // Lock icon
                ZStack {
                    RoundedRectangle(cornerRadius: 24)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRedLight.opacity(0.2), Color.ironRedLight.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 24)
                                .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                        )
                        .shadow(color: Color.ironRed.opacity(0.2), radius: 20)
                        .frame(width: 80, height: 80)

                    Image(systemName: "lock.fill")
                        .font(.system(size: 32))
                        .foregroundColor(Color.ironRedLight)
                }

                VStack(spacing: 8) {
                    Text("PULSE LOCKED")
                        .font(.system(size: 24, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                        .tracking(-1)
                    Text("We need your biometrics to calculate accurate energy expenditure.")
                        .font(.system(size: 14))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }

                // Status indicators
                HStack(spacing: 16) {
                    biometricStatusPill(
                        label: "Weight",
                        available: vm.hasWeight(profile: profile, progress: progress)
                    )
                    biometricStatusPill(
                        label: "Height",
                        available: vm.hasHeight(profile: profile)
                    )
                }

                // Navigate to dashboard
                Button {
                    onNavigateToDashboard?()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 16))
                        Text("Open Goal Architect")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                    )
                    .shadow(color: Color.ironRed.opacity(0.4), radius: 20, y: 8)
                }
                .padding(.horizontal, 20)
            }
            .padding(32)
            .modifier(GlassCard())
            .padding(.horizontal, 16)

            Spacer()
        }
    }

    private func biometricStatusPill(label: String, available: Bool) -> some View {
        HStack(spacing: 6) {
            Image(systemName: available ? "checkmark" : "lock.fill")
                .font(.system(size: 12))
            Text(label)
                .font(.system(size: 12, weight: .bold))
        }
        .foregroundColor(available ? Color(hex: "#4ade80") : Color.ironRedExtra)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(available ? Color(hex: "#22c55e").opacity(0.15) : Color.ironRed.opacity(0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            available ? Color(hex: "#22c55e").opacity(0.3) : Color.ironRed.opacity(0.3),
                            lineWidth: 1
                        )
                )
        )
    }

    // MARK: - Main Content

    private func mainContent(weight: Double) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                headerSection
                activitySelector
                activityForm(weight: weight)
                infoFooter(weight: weight)
                Spacer(minLength: 100)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRedLight.opacity(0.2), Color.orange.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                    )
                    .frame(width: 44, height: 44)

                Image(systemName: "heart.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Color.ironRedLight)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("PULSE LAB")
                    .font(.system(size: 20, weight: .black))
                    .italic()
                    .foregroundColor(.white)
                    .tracking(-0.5)
                Text("CARDIO ENERGY TRACKING")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)
            }

            Spacer()
        }
    }

    // MARK: - Activity Selector

    private var activitySelector: some View {
        HStack(spacing: 12) {
            ForEach(CardioViewModel.ActivityType.allCases) { type in
                let isActive = vm.activity == type

                Button {
                    withAnimation(.easeOut(duration: 0.2)) {
                        vm.switchActivity(type)
                    }
                } label: {
                    VStack(spacing: 8) {
                        Image(systemName: type.icon)
                            .font(.system(size: 28))
                            .foregroundColor(isActive ? Color.ironRedLight : Color.gray.opacity(0.5))
                        Text(type.displayName.uppercased())
                            .font(.system(size: 11, weight: .black))
                            .tracking(0.5)
                            .foregroundColor(isActive ? .white : Color.gray.opacity(0.5))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                isActive
                                    ? LinearGradient(
                                        colors: [Color.ironRed.opacity(0.25), Color.ironRedDark.opacity(0.15)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                    : LinearGradient.glassGradient
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(
                                        isActive ? Color.ironRedLight.opacity(0.4) : Color.white.opacity(0.08),
                                        lineWidth: 1
                                    )
                            )
                    )
                    .shadow(
                        color: isActive ? Color.ironRed.opacity(0.25) : .clear,
                        radius: 15, y: 5
                    )
                    .scaleEffect(isActive ? 1.05 : 1.0)
                    .opacity(isActive ? 1.0 : 0.6)
                }
            }
        }
    }

    // MARK: - Activity Form

    private func activityForm(weight: Double) -> some View {
        VStack(spacing: 16) {
            switch vm.activity {
            case .treadmill:
                treadmillForm
            case .walking:
                walkingForm
            case .cycling:
                cyclingForm
            }

            // Result / Calculate section
            resultSection(weight: weight)
        }
        .padding(20)
        .modifier(GlassCard())
    }

    // MARK: - Treadmill Form

    private var treadmillForm: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                cardioInputField(label: "SPEED", value: $vm.tmSpeed, placeholder: "8", unit: "km/h", icon: "gauge.medium")
                cardioInputField(label: "INCLINE", value: $vm.tmIncline, placeholder: "1", unit: "%", icon: "mountain.2.fill")
            }
            cardioInputField(label: "DURATION", value: $vm.tmDuration, placeholder: "30", unit: "mins", icon: "clock.fill")
        }
    }

    // MARK: - Walking Form

    private var walkingForm: some View {
        VStack(spacing: 12) {
            cardioInputField(label: "TOTAL STEPS", value: $vm.walkSteps, placeholder: "5000", unit: "", icon: "shoeprints.fill")

            VStack(alignment: .leading, spacing: 8) {
                Text("INTENSITY")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)

                HStack(spacing: 8) {
                    ForEach(CardioViewModel.WalkingIntensity.allCases) { intensity in
                        let isSelected = vm.walkIntensity == intensity

                        Button {
                            withAnimation(.easeOut(duration: 0.15)) {
                                vm.walkIntensity = intensity
                                vm.burn = nil
                            }
                        } label: {
                            Text(intensity.displayName.uppercased())
                                .font(.system(size: 11, weight: .black))
                                .foregroundColor(isSelected ? Color.ironRed : Color.gray.opacity(0.5))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(
                                            isSelected
                                                ? LinearGradient(
                                                    colors: [Color.ironRed.opacity(0.3), Color.ironRed.opacity(0.1)],
                                                    startPoint: .topLeading,
                                                    endPoint: .bottomTrailing
                                                )
                                                : LinearGradient.glassGradient
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 14)
                                                .stroke(
                                                    isSelected ? Color.ironRedLight.opacity(0.4) : Color.white.opacity(0.08),
                                                    lineWidth: 1
                                                )
                                        )
                                )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Cycling Form

    private var cyclingForm: some View {
        VStack(spacing: 12) {
            cardioInputField(label: "DURATION", value: $vm.cycDuration, placeholder: "45", unit: "mins", icon: "clock.fill")

            VStack(alignment: .leading, spacing: 8) {
                Text("INTENSITY")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)

                Menu {
                    ForEach(CardioViewModel.CyclingIntensity.allCases) { intensity in
                        Button {
                            vm.cycIntensity = intensity
                            vm.burn = nil
                        } label: {
                            HStack {
                                Text(intensity.displayName)
                                if vm.cycIntensity == intensity {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Text(vm.cycIntensity.displayName)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.gray.opacity(0.5))
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.black.opacity(0.4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    )
                }
            }
        }
    }

    // MARK: - Result Section

    private func resultSection(weight: Double) -> some View {
        Group {
            if let burnVal = vm.burn {
                // Show result
                VStack(spacing: 16) {
                    VStack(spacing: 4) {
                        Text("ENERGY OUTPUT")
                            .font(.system(size: 11, weight: .black))
                            .foregroundColor(Color.ironRedLight)
                            .tracking(1)

                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text("\(burnVal)")
                                .font(.system(size: 52, weight: .black))
                                .italic()
                                .foregroundColor(.white)
                            Text("kcal")
                                .font(.system(size: 18))
                                .foregroundColor(Color.gray.opacity(0.5))
                        }
                    }

                    // Log Session button
                    Button {
                        if let uid = Auth.auth().currentUser?.uid {
                            Task { await vm.logSession(uid: uid) }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            if vm.isLogging {
                                ProgressView()
                                    .tint(.white)
                                    .scaleEffect(0.8)
                            } else if vm.logSuccess {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 16))
                            }
                            Text(vm.logSuccess ? "Logged!" : "Log Session")
                                .font(.system(size: 14, weight: .black))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(
                                    vm.logSuccess
                                        ? LinearGradient(
                                            colors: [Color(hex: "#22c55e"), Color(hex: "#16a34a")],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                        : LinearGradient(
                                            colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                )
                        )
                        .shadow(
                            color: vm.logSuccess ? Color(hex: "#22c55e").opacity(0.3) : Color.ironRed.opacity(0.4),
                            radius: 15, y: 6
                        )
                    }
                    .disabled(vm.isLogging)

                    // Recalculate
                    Button {
                        withAnimation {
                            vm.recalculate()
                        }
                    } label: {
                        Text("Recalculate")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Color.gray.opacity(0.5))
                    }
                }
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed.opacity(0.15), Color.ironRedDark.opacity(0.08)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Color.ironRedLight.opacity(0.3), lineWidth: 1)
                        )
                )
                .shadow(color: Color.ironRed.opacity(0.2), radius: 20)
                .transition(.scale.combined(with: .opacity))
            } else {
                // Calculate button
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        vm.calculate(weight: weight)
                    }
                } label: {
                    Text("Calculate Burn")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.white.opacity(0.1), Color.white.opacity(0.05)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                )
                        )
                }
            }
        }
    }

    // MARK: - Info Footer

    private func infoFooter(weight: Double) -> some View {
        VStack(spacing: 4) {
            Text("Calculations use Metabolic Equivalent (MET) formulas based on your weight of ")
                .foregroundColor(Color.gray.opacity(0.5))
            + Text("\(String(format: "%.0f", weight))kg")
                .foregroundColor(.white)
                .font(.system(size: 11, weight: .bold))
            + Text(".")
                .foregroundColor(Color.gray.opacity(0.5))

            Text("Treadmill logic accounts for gravity on incline.")
                .foregroundColor(Color.gray.opacity(0.5))
        }
        .font(.system(size: 11))
        .multilineTextAlignment(.center)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.05), lineWidth: 1)
                )
        )
    }

    // MARK: - Glass Input Field

    private func cardioInputField(label: String, value: Binding<String>, placeholder: String, unit: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundColor(Color.gray.opacity(0.5))
                Text(label)
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(0.5)
            }

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                TextField(placeholder, text: value)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(.white)
                    .onChange(of: value.wrappedValue) { _, _ in
                        vm.burn = nil
                    }

                if !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.gray.opacity(0.5))
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(LinearGradient.glassGradient)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }
}
