import SwiftUI

/// Home tab — mirrors React DashboardView.jsx
/// Shows: daily macros, quick log buttons, XP/level, motivational cards
struct DashboardTab: View {
    @EnvironmentObject var firestoreManager: FirestoreManager
    @EnvironmentObject var storeKitManager: StoreKitManager

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // XP & Level header
                    if let profile = firestoreManager.profile {
                        LevelHeader(
                            xp: profile.xp,
                            league: getLeague(xp: profile.xp),
                            streak: profile.currentStreak
                        )
                    }

                    // Today's macros summary
                    MacroSummaryCard(meals: firestoreManager.meals)

                    // Quick log buttons
                    QuickLogSection()

                    // Recent workouts
                    RecentWorkoutsCard(workouts: Array(firestoreManager.workouts.prefix(3)))
                }
                .padding()
            }
            .background(Color.black)
            .navigationTitle("IronCore")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}

// MARK: - Dashboard Components

struct LevelHeader: View {
    let xp: Int
    let league: String
    let streak: Int

    var body: some View {
        let progress = getLevelProgress(xp: xp)
        let level = calculateLevel(xp: xp)

        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Level \(level)")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text(league)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(.orange)
                    Text("\(streak)")
                        .font(.title3.bold())
                        .foregroundStyle(.white)
                }
            }

            // XP progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.red)
                        .frame(width: geometry.size.width * progress.progress / 100, height: 8)
                }
            }
            .frame(height: 8)

            Text("\(progress.currentLevelXP) / \(progress.xpForNextLevel) XP")
                .font(.caption2)
                .foregroundStyle(.gray)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct MacroSummaryCard: View {
    let meals: [Meal]

    private var todayMeals: [Meal] {
        let today = todayDateString()
        return meals.filter { $0.date == today }
    }

    var body: some View {
        let totalCal = todayMeals.reduce(0.0) { $0 + $1.calories }
        let totalProtein = todayMeals.reduce(0.0) { $0 + $1.protein }
        let totalCarbs = todayMeals.reduce(0.0) { $0 + $1.carbs }
        let totalFat = todayMeals.reduce(0.0) { $0 + $1.fat }

        VStack(spacing: 12) {
            Text("Today's Nutrition")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 16) {
                MacroItem(label: "Cal", value: Int(totalCal), color: .orange)
                MacroItem(label: "Protein", value: Int(totalProtein), color: .red)
                MacroItem(label: "Carbs", value: Int(totalCarbs), color: .blue)
                MacroItem(label: "Fat", value: Int(totalFat), color: .yellow)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct MacroItem: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.gray)
        }
        .frame(maxWidth: .infinity)
    }
}

struct QuickLogSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Log")
                .font(.headline)
                .foregroundStyle(.white)

            HStack(spacing: 12) {
                QuickLogButton(icon: "fork.knife", label: "Meal", color: .green)
                QuickLogButton(icon: "dumbbell", label: "Workout", color: .red)
                QuickLogButton(icon: "figure.run", label: "Cardio", color: .orange)
                QuickLogButton(icon: "scalemass", label: "Weight", color: .blue)
            }
        }
    }
}

struct QuickLogButton: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct RecentWorkoutsCard: View {
    let workouts: [Workout]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Workouts")
                .font(.headline)
                .foregroundStyle(.white)

            if workouts.isEmpty {
                Text("No workouts yet. Start your first session!")
                    .font(.subheadline)
                    .foregroundStyle(.gray)
                    .padding(.vertical, 20)
            } else {
                ForEach(workouts) { workout in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(workout.exercises.map(\.name).joined(separator: ", "))
                                .font(.subheadline)
                                .foregroundStyle(.white)
                                .lineLimit(1)
                            Text(workout.date)
                                .font(.caption)
                                .foregroundStyle(.gray)
                        }
                        Spacer()
                        Text("+\(XPReward.workout) XP")
                            .font(.caption.bold())
                            .foregroundStyle(.red)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
