import SwiftUI

/// Achievements — Trophy Room / Arsenal.
/// Grid of locked/unlocked badges with rarity tiers, categories, and unlock progress.
/// Mirrors AchievementsView.jsx from React prototype.
struct AchievementsView: View {
    let badgeData: UserBadgeData

    @State private var activeCategory: BadgeCategory? = nil  // nil = "All"
    @State private var selectedBadge: BadgeDefinition? = nil
    @State private var animateProgress = false

    private var unlockedIDs: Set<String> {
        BadgeRegistry.unlockedSet(data: badgeData)
    }

    private var progress: (unlocked: Int, total: Int, percent: Int) {
        BadgeRegistry.unlockProgress(data: badgeData)
    }

    private var filteredBadges: [BadgeDefinition] {
        if let cat = activeCategory {
            return BadgeRegistry.badges(for: cat)
        }
        return BadgeRegistry.all
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    headerSection
                    collectionProgressCard
                    categoryFilter
                    badgeGrid
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }

            // Badge detail overlay
            if let badge = selectedBadge {
                BadgeDetailOverlay(
                    badge: badge,
                    unlocked: unlockedIDs.contains(badge.id),
                    onClose: { withAnimation(.easeOut(duration: 0.2)) { selectedBadge = nil } }
                )
                .transition(.opacity)
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.easeOut(duration: 0.8)) { animateProgress = true }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .center) {
            HStack(spacing: 12) {
                // Trophy icon box
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: "#ca8a04"), Color(hex: "#ea580c")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 48, height: 48)

                    Image(systemName: "trophy.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("ARSENAL")
                        .font(.system(size: 24, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                        .tracking(-1)

                    Text("TROPHY ROOM")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .tracking(3)
                }
            }

            Spacer()

            // Unlock counter
            VStack(spacing: 2) {
                Text("\(progress.unlocked)/\(progress.total)")
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.white)

                Text("\(progress.percent)%")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.ironRedLight)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(
                        LinearGradient(
                            colors: [Color.ironRed.opacity(0.15), Color.ironRed.opacity(0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.ironRed.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .padding(.top, 8)
    }

    // MARK: - Collection Progress Card

    private var collectionProgressCard: some View {
        VStack(spacing: 12) {
            // Label + percent
            HStack {
                Text("COLLECTION PROGRESS")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(Color.white.opacity(0.4))
                    .tracking(2)

                Spacer()

                Text("\(progress.percent)%")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(.ironRedLight)
            }

            // Animated progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.05))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: "#dc2626"), Color(hex: "#ef4444"), Color(hex: "#fbbf24")],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(
                            width: animateProgress
                                ? geo.size.width * CGFloat(progress.percent) / 100
                                : 0,
                            height: 8
                        )
                        .shadow(color: Color.ironRed.opacity(0.5), radius: 4)
                }
            }
            .frame(height: 8)

            // Rarity breakdown
            HStack(spacing: 0) {
                ForEach(BadgeRegistry.rarityBreakdown(data: badgeData), id: \.rarity) { item in
                    VStack(spacing: 2) {
                        Text("\(item.unlocked)/\(item.total)")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(item.rarity.color)

                        Text(item.rarity.label.uppercased())
                            .font(.system(size: 7, weight: .bold))
                            .foregroundColor(Color.white.opacity(0.25))
                            .tracking(0.5)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - Category Filter

    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                // "All" chip
                FilterChip(
                    label: "All (\(BadgeRegistry.totalCount))",
                    icon: nil,
                    isActive: activeCategory == nil
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) { activeCategory = nil }
                }

                // Per-category chips
                ForEach(BadgeCategory.allCases) { cat in
                    let catBadges = BadgeRegistry.badges(for: cat)
                    let catUnlocked = catBadges.filter { unlockedIDs.contains($0.id) }.count

                    FilterChip(
                        label: "\(cat.label) (\(catUnlocked)/\(catBadges.count))",
                        icon: cat.icon,
                        isActive: activeCategory == cat
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) { activeCategory = cat }
                    }
                }
            }
            .padding(.horizontal, 1)
        }
    }

    // MARK: - Badge Grid

    private var badgeGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
        ]

        return LazyVGrid(columns: columns, spacing: 8) {
            ForEach(filteredBadges, id: \.id) { badge in
                let unlocked = unlockedIDs.contains(badge.id)

                BadgeCardView(badge: badge, unlocked: unlocked)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selectedBadge = badge
                        }
                    }
            }
        }
    }
}

// MARK: - Filter Chip

private struct FilterChip: View {
    let label: String
    let icon: String?
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Text(icon)
                        .font(.system(size: 10))
                }
                Text(label)
                    .font(.system(size: 10, weight: .black))
                    .tracking(0.5)
            }
            .foregroundColor(isActive ? .white : Color.gray.opacity(0.5))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        isActive
                            ? Color.ironRed.opacity(0.3)
                            : Color.white.opacity(0.03)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isActive
                                    ? Color.ironRedLight.opacity(0.4)
                                    : Color.white.opacity(0.05),
                                lineWidth: 1
                            )
                    )
            )
        }
    }
}

// MARK: - Badge Card

private struct BadgeCardView: View {
    let badge: BadgeDefinition
    let unlocked: Bool

    var body: some View {
        VStack(spacing: 6) {
            // Icon
            Text(unlocked ? badge.icon : "\u{1F512}")  // lock emoji when locked
                .font(.system(size: 28))
                .opacity(unlocked ? 1.0 : 0.3)
                .saturation(unlocked ? 1.0 : 0.0)
                .shadow(
                    color: unlocked ? badge.rarity.color.opacity(0.6) : .clear,
                    radius: badge.rarity.glowRadius
                )

            // Name
            Text(badge.name.uppercased())
                .font(.system(size: 9, weight: .black))
                .tracking(0.5)
                .foregroundColor(unlocked ? .white : Color(hex: "#4b5563"))
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            // Rarity label (unlocked only)
            if unlocked {
                Text(badge.rarity.label.uppercased())
                    .font(.system(size: 7, weight: .bold))
                    .tracking(1)
                    .foregroundColor(badge.rarity.color)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 100)
        .padding(.vertical, 10)
        .padding(.horizontal, 6)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    unlocked
                        ? badge.rarity.bgColor
                        : Color.white.opacity(0.02)
                )
        )
        .overlay(
            ZStack {
                // Border
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        unlocked
                            ? badge.rarity.borderColor
                            : Color.white.opacity(0.05),
                        lineWidth: 1
                    )

                // Rarity dot (top-right)
                if unlocked {
                    VStack {
                        HStack {
                            Spacer()
                            Circle()
                                .fill(badge.rarity.color)
                                .frame(width: 6, height: 6)
                                .shadow(color: badge.rarity.color.opacity(0.8), radius: 3)
                                .padding(8)
                        }
                        Spacer()
                    }
                }
            }
        )
        .shadow(
            color: unlocked ? badge.rarity.color.opacity(0.15) : .clear,
            radius: badge.rarity.glowRadius,
            y: 4
        )
    }
}

// MARK: - Badge Detail Overlay

private struct BadgeDetailOverlay: View {
    let badge: BadgeDefinition
    let unlocked: Bool
    let onClose: () -> Void

    var body: some View {
        ZStack {
            // Backdrop
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture { onClose() }

            // Card
            VStack(spacing: 20) {
                // Close button
                HStack {
                    Spacer()
                    Button(action: onClose) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color.gray.opacity(0.5))
                            .padding(8)
                    }
                }

                // Large icon
                Text(unlocked ? badge.icon : "\u{1F512}")
                    .font(.system(size: 56))
                    .opacity(unlocked ? 1.0 : 0.4)
                    .saturation(unlocked ? 1.0 : 0.0)
                    .shadow(
                        color: unlocked ? badge.rarity.color.opacity(0.6) : .clear,
                        radius: 20
                    )

                // Name
                Text(badge.name.uppercased())
                    .font(.system(size: 20, weight: .black))
                    .tracking(-0.5)
                    .foregroundColor(unlocked ? .white : Color(hex: "#6b7280"))

                // Rarity + Category
                HStack(spacing: 6) {
                    Text(badge.rarity.label.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .tracking(2)
                        .foregroundColor(unlocked ? badge.rarity.color : Color(hex: "#4b5563"))

                    Text(badge.category.icon)
                        .font(.system(size: 12))
                }

                // Description
                Text(badge.description)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#9ca3af"))
                    .multilineTextAlignment(.center)

                // Status badge
                Text(unlocked ? "UNLOCKED" : "LOCKED")
                    .font(.system(size: 11, weight: .black))
                    .tracking(2)
                    .foregroundColor(
                        unlocked
                            ? Color(hex: "#4ade80")
                            : Color(hex: "#6b7280")
                    )
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(
                                unlocked
                                    ? Color(hex: "#22c55e").opacity(0.1)
                                    : Color.white.opacity(0.03)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(
                                        unlocked
                                            ? Color(hex: "#22c55e").opacity(0.3)
                                            : Color.white.opacity(0.05),
                                        lineWidth: 1
                                    )
                            )
                    )
            }
            .padding(24)
            .frame(maxWidth: 300)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 30/255, green: 30/255, blue: 30/255, opacity: 0.98),
                                Color(red: 15/255, green: 15/255, blue: 15/255, opacity: 0.98),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(
                        unlocked
                            ? (badge.rarity == .legendary
                                ? Color(hex: "#fbbf24").opacity(0.3)
                                : Color.ironRed.opacity(0.3))
                            : Color.white.opacity(0.05),
                        lineWidth: 1
                    )
            )
            .shadow(
                color: unlocked ? badge.rarity.color.opacity(0.2) : .clear,
                radius: 30
            )
        }
    }
}

// MARK: - Preview

#Preview {
    AchievementsView(
        badgeData: UserBadgeData(
            workoutCount: 12,
            currentStreak: 8,
            longestStreak: 14,
            level: 7,
            totalVolume: 45000,
            bestFormScore: 88,
            battlesWon: 3,
            bossesContributed: 1,
            followersCount: 2,
            mealCount: 45,
            photoCount: 5,
            progressCount: 10,
            league: "silver",
            xp: 4200
        )
    )
}
