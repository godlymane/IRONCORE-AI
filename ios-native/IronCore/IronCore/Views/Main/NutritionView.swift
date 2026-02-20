import SwiftUI

/// Nutrition tracking — mirrors NutritionView.jsx + NutritionEnhancements.jsx
/// Macro breakdown, water tracker, calorie burn, meal list, add meal form.
struct NutritionView: View {
    let uid: String
    let profile: UserProfile?
    @StateObject private var vm = NutritionViewModel()

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                header
                macroBreakdownCard
                waterTrackerCard
                calorieBurnCard
                todaysFuelSection
                Spacer(minLength: 100)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .background(Color.black)
        .onAppear { vm.startListening(uid: uid) }
        .onDisappear { vm.stopListening() }
        .sheet(isPresented: $vm.showAddMeal) {
            AddMealSheet(uid: uid, vm: vm)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("NUTRITION")
                    .font(.system(size: 24, weight: .black))
                    .italic()
                    .foregroundColor(.white)
                    .tracking(-1)
                Text("COMMAND CENTER")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(2)
            }

            Spacer()

            Button { vm.showAddMeal = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                    Text("Log")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: Color.ironRed.opacity(0.3), radius: 10)
            }
        }
    }

    // MARK: - Macro Breakdown Card

    private var macroBreakdownCard: some View {
        VStack(spacing: 16) {
            HStack {
                Text("MACRO BREAKDOWN")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)
                Spacer()
                Text("\(vm.caloriesIn) / \(vm.calorieTarget(profile)) kcal")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
            }

            // Calorie progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 12)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed, Color.ironRedLight],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(
                            width: geo.size.width * min(1.0, Double(vm.caloriesIn) / Double(max(1, vm.calorieTarget(profile)))),
                            height: 12
                        )
                        .animation(.easeOut(duration: 0.8), value: vm.caloriesIn)
                }
            }
            .frame(height: 12)

            // Macro bars
            HStack(spacing: 16) {
                MacroProgressColumn(
                    label: "Protein",
                    value: vm.protein,
                    target: vm.proteinTarget(profile),
                    color: Color(hex: "#22c55e"),
                    unit: "g"
                )
                MacroProgressColumn(
                    label: "Carbs",
                    value: vm.carbs,
                    target: vm.carbsTarget(profile),
                    color: Color.ironRed,
                    unit: "g"
                )
                MacroProgressColumn(
                    label: "Fat",
                    value: vm.fat,
                    target: vm.fatTarget(profile),
                    color: Color(hex: "#f59e0b"),
                    unit: "g"
                )
            }

            // Remaining
            HStack {
                Text("\(vm.caloriesLeft(profile)) kcal remaining")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.ironRedLight)
                Spacer()
                Text("Net: \(vm.caloriesIn - vm.caloriesBurned) kcal")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.gray.opacity(0.5))
            }
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

    // MARK: - Water Tracker Card

    private var waterTrackerCard: some View {
        VStack(spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#06b6d4"))
                    Text("HYDRATION")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .tracking(1)
                }
                Spacer()
                Text("\(vm.waterCount) / 8 glasses")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
            }

            // Water glasses grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 8), spacing: 8) {
                ForEach(0..<8, id: \.self) { i in
                    let filled = i < vm.waterCount
                    Button {
                        if !filled { Task { await vm.addWater(uid: uid) } }
                    } label: {
                        Image(systemName: filled ? "drop.fill" : "drop")
                            .font(.system(size: 20))
                            .foregroundColor(filled ? Color(hex: "#06b6d4") : Color.gray.opacity(0.3))
                            .frame(height: 36)
                    }
                }
            }

            // Quick add
            Button {
                Task { await vm.addWater(uid: uid) }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 14))
                    Text("Add Glass")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundColor(Color(hex: "#06b6d4"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color(hex: "#06b6d4").opacity(0.1))
                )
            }
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

    // MARK: - Calorie Burn Card

    private var calorieBurnCard: some View {
        HStack(spacing: 16) {
            Image(systemName: "flame.fill")
                .font(.system(size: 28))
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 4) {
                Text("CALORIES BURNED")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)
                Text("\(vm.caloriesBurned) kcal")
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(.white)
            }

            Spacer()

            // Burn progress ring
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.08), lineWidth: 4)
                    .frame(width: 48, height: 48)
                Circle()
                    .trim(from: 0, to: min(1.0, Double(vm.caloriesBurned) / 500.0))
                    .stroke(
                        LinearGradient(colors: [.orange, .red], startPoint: .topLeading, endPoint: .bottomTrailing),
                        style: StrokeStyle(lineWidth: 4, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .frame(width: 48, height: 48)
                    .animation(.easeOut(duration: 1.0), value: vm.caloriesBurned)
            }
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

    // MARK: - Today's Fuel (Meal List)

    private var todaysFuelSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("TODAY'S FUEL")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)
                Spacer()
                Text("\(vm.todaysMeals.count) entries")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.gray.opacity(0.4))
            }

            if vm.todaysMeals.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "fork.knife")
                        .font(.system(size: 32))
                        .foregroundColor(Color.gray.opacity(0.3))
                    Text("No meals logged today")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            } else {
                ForEach(vm.todaysMeals) { meal in
                    MealRow(uid: uid, vm: vm, meal: meal)
                }
            }
        }
    }
}

// MARK: - Meal Row

private struct MealRow: View {
    let uid: String
    @ObservedObject var vm: NutritionViewModel
    let meal: NutritionViewModel.MealEntry

    var body: some View {
        HStack(spacing: 12) {
            Text(meal.emoji)
                .font(.system(size: 24))
                .frame(width: 40, height: 40)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white.opacity(0.06))
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(meal.mealName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                if !meal.time.isEmpty {
                    Text(meal.time)
                        .font(.system(size: 11))
                        .foregroundColor(Color.gray.opacity(0.5))
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("\(meal.calories) kcal")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Text("P\(meal.protein) C\(meal.carbs) F\(meal.fat)")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundColor(Color.gray.opacity(0.5))
            }

            Button {
                Task { await vm.deleteMeal(uid: uid, mealId: meal.id) }
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 12))
                    .foregroundColor(Color.gray.opacity(0.3))
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }
}

// MARK: - Macro Progress Column

private struct MacroProgressColumn: View {
    let label: String
    let value: Int
    let target: Int
    let color: Color
    let unit: String

    var progress: Double {
        guard target > 0 else { return 0 }
        return min(1.0, Double(value) / Double(target))
    }

    var body: some View {
        VStack(spacing: 6) {
            Text("\(value)\(unit)")
                .font(.system(size: 16, weight: .black))
                .foregroundColor(.white)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.08))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: geo.size.width * progress, height: 6)
                        .animation(.easeOut(duration: 0.8), value: value)
                }
            }
            .frame(height: 6)

            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color.gray.opacity(0.5))

            Text("/ \(target)\(unit)")
                .font(.system(size: 10))
                .foregroundColor(Color.gray.opacity(0.3))
        }
    }
}

// MARK: - Add Meal Sheet

private struct AddMealSheet: View {
    let uid: String
    @ObservedObject var vm: NutritionViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 20) {
                // Header
                HStack {
                    Text("LOG MEAL")
                        .font(.system(size: 20, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                }

                // Meal name
                VStack(alignment: .leading, spacing: 6) {
                    Text("MEAL NAME")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.gray.opacity(0.5))
                        .tracking(1)
                    TextField("e.g., Chicken & Rice", text: $vm.newMealName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.black.opacity(0.4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                )
                        )
                }

                // Macros grid
                HStack(spacing: 12) {
                    macroField("CALORIES", text: $vm.newMealCalories)
                    macroField("PROTEIN (g)", text: $vm.newMealProtein)
                }

                HStack(spacing: 12) {
                    macroField("CARBS (g)", text: $vm.newMealCarbs)
                    macroField("FAT (g)", text: $vm.newMealFat)
                }

                Spacer()

                // Submit
                Button {
                    Task {
                        await vm.addMeal(uid: uid)
                        dismiss()
                    }
                } label: {
                    Text("LOG MEAL")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        )
                        .shadow(color: Color.ironRed.opacity(0.3), radius: 10)
                }
                .disabled(vm.newMealName.isEmpty)
                .opacity(vm.newMealName.isEmpty ? 0.5 : 1)
            }
            .padding(20)
        }
    }

    private func macroField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color.gray.opacity(0.5))
                .tracking(1)
            TextField("0", text: text)
                .keyboardType(.numberPad)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.black.opacity(0.4))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
        }
    }
}
