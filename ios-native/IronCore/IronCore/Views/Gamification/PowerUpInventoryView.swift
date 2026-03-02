import SwiftUI

/// Power-Up Inventory view — grid of owned power-ups with activation and countdown timers.
/// Mirrors PowerUpInventory.jsx from React prototype.
/// Dark theme, rarity-based card colors, glass card style.
struct PowerUpInventoryView: View {
    @ObservedObject var vm: EngagementViewModel

    @State private var confirmActivationType: PowerUpType? = nil
    @State private var showConfirmation: Bool = false

    var body: some View {
        VStack(spacing: 16) {
            // MARK: - Header
            header

            // MARK: - Active Power-Ups
            if !vm.activePowerUps.isEmpty {
                activePowerUpsSection
            }

            // MARK: - Inventory Grid
            inventoryGrid

            // MARK: - Error Message
            if let error = vm.errorMessage {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 11))
                    Text(error)
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundColor(.orange)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.orange.opacity(0.1))
                )
            }
        }
        .padding(20)
        .modifier(GlassCard())
        .alert("Activate Power-Up", isPresented: $showConfirmation) {
            Button("Cancel", role: .cancel) { confirmActivationType = nil }
            Button("Activate") {
                if let type = confirmActivationType {
                    Task { await vm.activatePowerUp(type: type) }
                }
                confirmActivationType = nil
            }
        } message: {
            if let type = confirmActivationType {
                Text("Activate \(type.displayName)?\n\(type.description)")
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#eab308"))

                Text("POWER-UPS")
                    .font(.system(size: 12, weight: .black))
                    .foregroundColor(.white)
                    .tracking(2)
            }

            Spacer()

            // Current multiplier badge
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 9, weight: .bold))
                Text(String(format: "%.1fx", vm.effectiveMultiplier))
                    .font(.system(size: 12, weight: .black, design: .monospaced))
            }
            .foregroundColor(vm.effectiveMultiplier > 1.0 ? Color(hex: "#eab308") : .textTertiary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(vm.effectiveMultiplier > 1.0
                          ? Color(hex: "#eab308").opacity(0.15)
                          : Color.white.opacity(0.05))
            )
        }
    }

    // MARK: - Active Power-Ups Section

    private var activePowerUpsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("ACTIVE")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.green)
                .tracking(1)

            ForEach(vm.activePowerUps) { powerUp in
                activePowerUpRow(powerUp)
            }
        }
    }

    private func activePowerUpRow(_ powerUp: PowerUpItem) -> some View {
        let puType = powerUp.powerUpType
        let remaining = powerUp.remainingSeconds
        let totalDuration = puType?.duration ?? 3600
        let progress = max(0, min(1, remaining / totalDuration))

        return HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(rarityGradient(for: puType?.rarity ?? .common))
                    .frame(width: 36, height: 36)
                Image(systemName: puType?.sfSymbol ?? "questionmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
            }

            // Name + Description
            VStack(alignment: .leading, spacing: 2) {
                Text(puType?.displayName ?? powerUp.type)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)

                Text(puType?.description ?? "")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.textTertiary)
            }

            Spacer()

            // Countdown timer
            VStack(alignment: .trailing, spacing: 2) {
                Text(vm.remainingTimeString(for: powerUp))
                    .font(.system(size: 13, weight: .black, design: .monospaced))
                    .foregroundColor(.green)

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 3)

                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.green)
                            .frame(width: geo.size.width * progress, height: 3)
                    }
                }
                .frame(width: 60, height: 3)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.green.opacity(0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.green.opacity(0.15), lineWidth: 1)
        )
    }

    // MARK: - Inventory Grid

    private var inventoryGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !vm.activePowerUps.isEmpty {
                Text("INVENTORY")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.textTertiary)
                    .tracking(1)
            }

            let ownedTypes = PowerUpType.allCases.filter { type in
                (vm.powerUpInventory[type] ?? 0) > 0
            }

            if ownedTypes.isEmpty && vm.activePowerUps.isEmpty {
                // Empty state
                emptyState
            } else {
                // Power-up cards in a horizontal scroll
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(PowerUpType.allCases, id: \.rawValue) { type in
                            let count = vm.powerUpInventory[type] ?? 0
                            powerUpCard(type: type, count: count)
                        }

                        // "Get More" placeholder slot
                        getMoreSlot
                    }
                    .padding(.horizontal, 2)
                }
            }
        }
    }

    private func powerUpCard(type: PowerUpType, count: Int) -> some View {
        let isActive = vm.activePowerUps.contains { $0.powerUpType == type }

        return Button {
            if count > 0 && !isActive {
                confirmActivationType = type
                showConfirmation = true
            }
        } label: {
            VStack(spacing: 8) {
                // Icon with rarity background
                ZStack {
                    Circle()
                        .fill(rarityGradient(for: type.rarity))
                        .frame(width: 44, height: 44)
                        .shadow(color: rarityGlowColor(for: type.rarity).opacity(0.3), radius: 6)

                    Image(systemName: type.sfSymbol)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)

                    // Active indicator
                    if isActive {
                        Circle()
                            .stroke(Color.green, lineWidth: 2)
                            .frame(width: 48, height: 48)
                    }
                }

                // Name
                Text(type.displayName)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                // Effect description
                Text(type.description)
                    .font(.system(size: 8, weight: .medium))
                    .foregroundColor(.textTertiary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(height: 22)

                // Count badge
                HStack(spacing: 2) {
                    if isActive {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.green)
                        Text("ACTIVE")
                            .font(.system(size: 8, weight: .black))
                            .foregroundColor(.green)
                    } else {
                        Text("x\(count)")
                            .font(.system(size: 11, weight: .black, design: .monospaced))
                            .foregroundColor(count > 0 ? .white : .textTertiary)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(
                    Capsule()
                        .fill(isActive ? Color.green.opacity(0.15)
                              : count > 0 ? Color.black.opacity(0.4) : Color.white.opacity(0.04))
                )
            }
            .frame(width: 100)
            .padding(.vertical, 14)
            .padding(.horizontal, 8)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(rarityBackgroundGradient(for: type.rarity))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(
                        isActive ? Color.green.opacity(0.3)
                        : count > 0 ? rarityBorderColor(for: type.rarity) : Color.white.opacity(0.06),
                        lineWidth: 1
                    )
            )
            .opacity(count > 0 || isActive ? 1.0 : 0.5)
        }
        .buttonStyle(.plain)
        .disabled(count <= 0 || isActive)
    }

    private var getMoreSlot: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), style: StrokeStyle(lineWidth: 1, dash: [4]))
                    .frame(width: 44, height: 44)

                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.2))
            }

            Text("Get More")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.textTertiary)
        }
        .frame(width: 100, height: 130)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.white.opacity(0.08), style: StrokeStyle(lineWidth: 1, dash: [6]))
        )
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bolt.slash.fill")
                .font(.system(size: 28))
                .foregroundColor(Color.white.opacity(0.15))

            Text("No power-ups yet")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.textTertiary)

            Text("Complete quests and claim daily rewards to earn power-ups!")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color.white.opacity(0.3))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }

    // MARK: - Rarity Color Helpers

    private func rarityGradient(for rarity: PowerUpRarity) -> LinearGradient {
        switch rarity {
        case .common:
            return LinearGradient(colors: [Color(hex: "#4b5563"), Color(hex: "#374151")],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .rare:
            return LinearGradient(colors: [Color(hex: "#dc2626"), Color(hex: "#b91c1c")],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .epic:
            return LinearGradient(colors: [Color(hex: "#9333ea"), Color(hex: "#7e22ce")],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .legendary:
            return LinearGradient(colors: [Color(hex: "#f59e0b"), Color(hex: "#d97706")],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private func rarityBackgroundGradient(for rarity: PowerUpRarity) -> LinearGradient {
        switch rarity {
        case .common:
            return LinearGradient(colors: [Color(hex: "#4b5563").opacity(0.15), Color(hex: "#374151").opacity(0.08)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .rare:
            return LinearGradient(colors: [Color(hex: "#dc2626").opacity(0.12), Color(hex: "#b91c1c").opacity(0.06)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .epic:
            return LinearGradient(colors: [Color(hex: "#9333ea").opacity(0.12), Color(hex: "#7e22ce").opacity(0.06)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        case .legendary:
            return LinearGradient(colors: [Color(hex: "#f59e0b").opacity(0.12), Color(hex: "#d97706").opacity(0.06)],
                                  startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private func rarityBorderColor(for rarity: PowerUpRarity) -> Color {
        switch rarity {
        case .common: return Color(hex: "#6b7280").opacity(0.2)
        case .rare: return Color.ironRed.opacity(0.2)
        case .epic: return Color(hex: "#a855f7").opacity(0.2)
        case .legendary: return Color(hex: "#f59e0b").opacity(0.2)
        }
    }

    private func rarityGlowColor(for rarity: PowerUpRarity) -> Color {
        switch rarity {
        case .common: return Color(hex: "#6b7280")
        case .rare: return .ironRed
        case .epic: return Color(hex: "#a855f7")
        case .legendary: return Color(hex: "#f59e0b")
        }
    }
}

// MARK: - Preview

#if DEBUG
struct PowerUpInventoryView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            PowerUpInventoryView(vm: EngagementViewModel())
                .padding()
        }
        .background(Color.black)
        .preferredColorScheme(.dark)
    }
}
#endif
