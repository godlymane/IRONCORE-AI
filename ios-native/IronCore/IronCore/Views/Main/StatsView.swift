import SwiftUI
import Charts
import FirebaseAuth

/// Stats / Flex Analytics — mirrors StatsView.jsx from React prototype.
/// Sections: League Card, Lifter Archetype Radar, Discipline Grid,
/// Body Heatmap, Correlation Chart, Hall of Fame achievements.
struct StatsView: View {
    @StateObject private var viewModel = StatsViewModel()
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var premiumVM: PremiumViewModel

    private var xp: Int { authVM.profile?.xp ?? 0 }
    private var dailyTarget: Int { authVM.profile?.dailyCalories ?? 2500 }
    private var profileWeight: Double? { authVM.profile?.weight }

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                headerSection
                leagueCard
                archetypeRadarCard
                disciplineGridCard
                bodyHeatmapCard
                correlationChartCard
                hallOfFameSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 40)
        }
        .background(Color.black)
        .onAppear {
            if let uid = Auth.auth().currentUser?.uid {
                viewModel.startListening(uid: uid)
            }
        }
        .onDisappear {
            viewModel.stopListening()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .center) {
            Text("FLEX ANALYTICS")
                .font(.system(size: 24, weight: .black))
                .italic()
                .foregroundColor(.white)

            Spacer()

            Text("INTENSITY OS")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(.textTertiary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.04))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.08), lineWidth: 1))
                )
        }
        .padding(.top, 8)
    }

    // MARK: - 1. League Card

    private var leagueCard: some View {
        let league = viewModel.currentLeague(xp: xp)
        let next = viewModel.nextLeague(xp: xp)
        let prog = viewModel.leagueProgress(xp: xp)
        let leagueColor = Color(
            red: league.color.primary.r / 255,
            green: league.color.primary.g / 255,
            blue: league.color.primary.b / 255
        )

        return VStack(spacing: 12) {
            Image(systemName: "shield.fill")
                .font(.system(size: 48))
                .foregroundColor(leagueColor)
                .shadow(color: leagueColor.opacity(0.5), radius: 12)

            Text("CURRENT LEAGUE")
                .font(.system(size: 10, weight: .black))
                .tracking(3)
                .foregroundColor(.textTertiary)

            Text(league.name.uppercased())
                .font(.system(size: 36, weight: .black))
                .italic()
                .foregroundColor(leagueColor)
                .shadow(color: leagueColor.opacity(0.4), radius: 8)

            // XP progress bar
            VStack(spacing: 4) {
                HStack {
                    Text("\(xp) XP")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.textTertiary)
                    Spacer()
                    Text(next != nil ? "\(next!.minXP) XP" : "MAX")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.textTertiary)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.white.opacity(0.06))
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.white.opacity(0.1), lineWidth: 1))

                        RoundedRectangle(cornerRadius: 6)
                            .fill(leagueColor)
                            .frame(width: geo.size.width * CGFloat(prog / 100))
                            .shadow(color: leagueColor.opacity(0.6), radius: 6)
                            .animation(.easeOut(duration: 1.0), value: prog)
                    }
                }
                .frame(height: 12)
            }
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(leagueColor.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(leagueColor.opacity(0.3), lineWidth: 1)
        )
        .shadow(color: leagueColor.opacity(0.15), radius: 20, y: 10)
    }

    // MARK: - 2. Lifter Archetype Radar

    private var archetypeRadarCard: some View {
        let data = viewModel.archetypeData(xp: xp, dailyTarget: dailyTarget)
        let isPremium = premiumVM.isPremium

        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#06b6d4"))
                Text("LIFTER ARCHETYPE")
                    .font(.system(size: 11, weight: .black))
                    .tracking(1)
                    .foregroundColor(.textTertiary)

                if !isPremium {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "#eab308"))
                }
            }

            ZStack {
                RadarChartView(data: data)
                    .frame(height: 220)

                if !isPremium {
                    // Premium overlay
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.black.opacity(0.7))
                        .overlay(
                            VStack(spacing: 6) {
                                Image(systemName: "lock.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(Color(hex: "#eab308"))
                                Text("PRO FEATURE")
                                    .font(.system(size: 12, weight: .black))
                                    .foregroundColor(.white)
                                Text("Tap to unlock")
                                    .font(.system(size: 11))
                                    .foregroundColor(.textTertiary)
                            }
                        )
                        .onTapGesture {
                            _ = premiumVM.requirePremium("unlimitedHistory")
                        }
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - 3. Discipline Grid (90-day heatmap)

    private var disciplineGridCard: some View {
        let grid = viewModel.disciplineGrid(dailyTarget: dailyTarget)
        let columns = Array(repeating: GridItem(.flexible(), spacing: 3), count: 15)

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "square.grid.3x3.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#22c55e"))
                    Text("DISCIPLINE GRID")
                        .font(.system(size: 11, weight: .black))
                        .tracking(1)
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                // Legend
                HStack(spacing: 8) {
                    HStack(spacing: 3) {
                        Circle().fill(Color(hex: "#22c55e")).frame(width: 6, height: 6)
                        Text("Perfect")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.textTertiary)
                    }
                    HStack(spacing: 3) {
                        Circle().fill(Color.ironRed).frame(width: 6, height: 6)
                        Text("Dirty")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(.textTertiary)
                    }
                }
            }

            LazyVGrid(columns: columns, spacing: 3) {
                ForEach(Array(grid.enumerated()), id: \.offset) { _, day in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(disciplineColor(score: day.score))
                        .frame(height: 8)
                        .shadow(
                            color: day.score >= 2 ? disciplineColor(score: day.score).opacity(0.8) : .clear,
                            radius: day.score >= 2 ? 3 : 0
                        )
                }
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    private func disciplineColor(score: Int) -> Color {
        switch score {
        case 3: return Color.ironRed
        case 2: return Color(hex: "#22c55e")
        case 1: return Color(red: 55/255, green: 65/255, blue: 81/255) // gray-700
        default: return Color(red: 31/255, green: 41/255, blue: 55/255) // gray-800
        }
    }

    // MARK: - 4. Body Heatmap (Muscle Intensity)

    private var bodyHeatmapCard: some View {
        let intensity = viewModel.muscleIntensity

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.ironRed)
                    Text("BIO-SCAN")
                        .font(.system(size: 11, weight: .black))
                        .tracking(1)
                        .foregroundColor(.textTertiary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 0) {
                    Text("HARD SETS")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.textTertiary)
                    Text("\(Int(intensity.totalHardSets.rounded()))")
                        .font(.system(size: 20, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                }
            }

            BodyHeatmapView(intensity: intensity)
                .frame(height: 280)

            Text("Based on training intensity (RPE)")
                .font(.system(size: 11))
                .italic()
                .foregroundColor(.textTertiary)
                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - 5. Correlation Chart (Discipline Bars + Weight Line)

    private var correlationChartCard: some View {
        let trend = viewModel.trendData(dailyTarget: dailyTarget, profileWeight: profileWeight)

        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 14))
                    .foregroundColor(.ironRed)
                Text("CORRELATION")
                    .font(.system(size: 11, weight: .black))
                    .tracking(1)
                    .foregroundColor(.textTertiary)
            }

            if !trend.isEmpty {
                CorrelationChartView(data: trend)
                    .frame(height: 180)
            } else {
                Text("Log workouts and weigh-ins to see trends")
                    .font(.system(size: 12))
                    .foregroundColor(.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .frame(height: 100)
            }

            // Legend
            HStack(spacing: 16) {
                Spacer()
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 2).fill(Color(hex: "#22c55e")).frame(width: 8, height: 8)
                    Text("Discipline")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textTertiary)
                }
                HStack(spacing: 4) {
                    Circle().fill(Color(hex: "#eab308")).frame(width: 8, height: 8)
                    Text("Weight")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.textTertiary)
                }
                Spacer()
            }
        }
        .padding(16)
        .modifier(GlassCard())
    }

    // MARK: - 6. Hall of Fame (Achievements)

    private var hallOfFameSection: some View {
        let achievements = viewModel.achievements(xp: xp)
        let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#eab308"))
                Text("HALL OF FAME")
                    .font(.system(size: 11, weight: .black))
                    .tracking(1)
                    .foregroundColor(.textTertiary)
            }
            .padding(.horizontal, 4)

            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(achievements) { achievement in
                    AchievementCard(achievement: achievement)
                }
            }
        }
    }
}

// MARK: - Achievement Card

private struct AchievementCard: View {
    let achievement: StatsViewModel.Achievement

    private var borderColor: Color {
        guard achievement.unlocked else { return Color(hex: "#374151") }
        switch achievement.rarity {
        case .legendary: return Color(hex: "#eab308")
        case .epic: return Color(hex: "#a855f7")
        case .rare: return Color.ironRed
        case .common: return Color(hex: "#374151")
        }
    }

    private var bgColor: Color {
        guard achievement.unlocked else { return Color(red: 17/255, green: 24/255, blue: 39/255) }
        switch achievement.rarity {
        case .legendary: return Color(hex: "#eab308").opacity(0.1)
        case .epic: return Color.ironRed.opacity(0.1)
        case .rare: return Color(hex: "#f59e0b").opacity(0.1)
        case .common: return Color(red: 31/255, green: 41/255, blue: 55/255)
        }
    }

    private var textColor: Color {
        guard achievement.unlocked else { return Color(hex: "#6b7280") }
        switch achievement.rarity {
        case .legendary: return Color(hex: "#eab308")
        case .epic: return Color.ironRed
        case .rare: return Color(hex: "#f59e0b")
        case .common: return Color(hex: "#9ca3af")
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(achievement.unlocked ? Color.black.opacity(0.2) : Color(hex: "#1f2937"))
                        .frame(width: 28, height: 28)

                    Image(systemName: achievement.unlocked ? achievement.icon : "lock.fill")
                        .font(.system(size: 14))
                        .foregroundColor(textColor)
                }

                Spacer()

                if achievement.unlocked {
                    Text(achievement.rarity.rawValue.uppercased())
                        .font(.system(size: 7, weight: .black))
                        .tracking(2)
                        .foregroundColor(textColor.opacity(0.7))
                }
            }

            Text(achievement.title.uppercased())
                .font(.system(size: 12, weight: .black))
                .foregroundColor(textColor)

            Text(achievement.desc)
                .font(.system(size: 11))
                .foregroundColor(textColor.opacity(0.8))
                .lineLimit(2)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(bgColor)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(borderColor.opacity(achievement.unlocked ? 1.0 : 0.4), lineWidth: 1)
        )
        .opacity(achievement.unlocked ? 1.0 : 0.6)
    }
}

// MARK: - Radar Chart (Custom SwiftUI Shape — pentagon grid + filled polygon)

private struct RadarChartView: View {
    let data: [StatsViewModel.ArchetypeAxis]

    private let gridLevels = [33.0, 66.0, 100.0]
    private let center = CGPoint(x: 0.5, y: 0.5)
    private let radius: CGFloat = 0.38

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let centerPt = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let r = size * radius

            ZStack {
                // Grid rings (concentric pentagons)
                ForEach(gridLevels, id: \.self) { level in
                    PolygonShape(sides: data.count, scale: level / 100.0)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        .frame(width: r * 2, height: r * 2)
                        .position(centerPt)
                }

                // Axis lines from center to each vertex
                ForEach(0..<data.count, id: \.self) { i in
                    let angle = angleForIndex(i, total: data.count)
                    let endX = centerPt.x + r * cos(angle)
                    let endY = centerPt.y + r * sin(angle)
                    Path { path in
                        path.move(to: centerPt)
                        path.addLine(to: CGPoint(x: endX, y: endY))
                    }
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
                }

                // Filled data polygon
                RadarDataShape(data: data.map { $0.value / 100.0 })
                    .fill(Color.ironRed.opacity(0.35))
                    .frame(width: r * 2, height: r * 2)
                    .position(centerPt)

                RadarDataShape(data: data.map { $0.value / 100.0 })
                    .stroke(Color.ironRed, lineWidth: 2)
                    .frame(width: r * 2, height: r * 2)
                    .position(centerPt)

                // Data point dots
                ForEach(0..<data.count, id: \.self) { i in
                    let scale = data[i].value / 100.0
                    let angle = angleForIndex(i, total: data.count)
                    let x = centerPt.x + r * CGFloat(scale) * cos(angle)
                    let y = centerPt.y + r * CGFloat(scale) * sin(angle)

                    Circle()
                        .fill(Color.ironRed)
                        .frame(width: 6, height: 6)
                        .shadow(color: Color.ironRed.opacity(0.6), radius: 4)
                        .position(x: x, y: y)
                }

                // Axis labels
                ForEach(0..<data.count, id: \.self) { i in
                    let angle = angleForIndex(i, total: data.count)
                    let labelR = r + 28
                    let x = centerPt.x + labelR * cos(angle)
                    let y = centerPt.y + labelR * sin(angle)

                    VStack(spacing: 1) {
                        Text(data[i].label.uppercased())
                            .font(.system(size: 9, weight: .black))
                            .foregroundColor(.textSecondary)
                        Text("\(Int(data[i].value))")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .position(x: x, y: y)
                }
            }
        }
    }

    private func angleForIndex(_ index: Int, total: Int) -> CGFloat {
        let sliceAngle = 2 * .pi / CGFloat(total)
        return sliceAngle * CGFloat(index) - .pi / 2  // start from top
    }
}

/// Regular polygon shape (pentagon for 5 axes)
private struct PolygonShape: Shape {
    let sides: Int
    let scale: Double

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let r = min(rect.width, rect.height) / 2 * scale
        var path = Path()

        for i in 0..<sides {
            let angle = 2 * .pi / Double(sides) * Double(i) - .pi / 2
            let pt = CGPoint(x: center.x + r * cos(angle), y: center.y + r * sin(angle))
            if i == 0 { path.move(to: pt) }
            else { path.addLine(to: pt) }
        }
        path.closeSubpath()
        return path
    }
}

/// Radar data polygon (scaled per-axis)
private struct RadarDataShape: Shape {
    let data: [Double]  // 0.0 - 1.0 per axis

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let r = min(rect.width, rect.height) / 2
        var path = Path()
        let sides = data.count

        for i in 0..<sides {
            let angle = 2 * .pi / Double(sides) * Double(i) - .pi / 2
            let scale = data[i]
            let pt = CGPoint(
                x: center.x + r * scale * cos(angle),
                y: center.y + r * scale * sin(angle)
            )
            if i == 0 { path.move(to: pt) }
            else { path.addLine(to: pt) }
        }
        path.closeSubpath()
        return path
    }
}

// MARK: - Body Heatmap (Front/Back toggle with Path-drawn muscles)

private struct BodyHeatmapView: View {
    let intensity: StatsViewModel.MuscleIntensity
    @State private var showFront: Bool = true

    var body: some View {
        ZStack(alignment: .topTrailing) {
            ZStack {
                if showFront {
                    BodyFrontView(intensity: intensity)
                        .transition(.opacity)
                } else {
                    BodyBackView(intensity: intensity)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: showFront)

            Button {
                showFront.toggle()
            } label: {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(
                        Circle()
                            .fill(Color(hex: "#1f2937"))
                            .overlay(Circle().stroke(Color.white.opacity(0.1), lineWidth: 1))
                    )
            }
            .padding(8)

            // View label at bottom
            VStack {
                Spacer()
                Text(showFront ? "ANTERIOR VIEW" : "POSTERIOR VIEW")
                    .font(.system(size: 9, weight: .black))
                    .tracking(3)
                    .foregroundColor(.textTertiary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .background(
                        Capsule()
                            .fill(Color.black.opacity(0.5))
                            .overlay(Capsule().stroke(Color.white.opacity(0.08), lineWidth: 1))
                    )
                    .padding(.bottom, 4)
            }
            .frame(maxWidth: .infinity)
        }
    }

    static func muscleColor(tier: Int) -> Color {
        switch tier {
        case 0: return Color(red: 31/255, green: 41/255, blue: 55/255)
        case 1: return Color(red: 55/255, green: 65/255, blue: 81/255)
        case 2: return Color(hex: "#0ea5e9")
        case 3: return Color(hex: "#eab308")
        case 4: return Color(hex: "#f97316")
        default: return Color(hex: "#ef4444")
        }
    }
}

/// SVG-style muscle paths — front view
private struct BodyFrontView: View {
    let intensity: StatsViewModel.MuscleIntensity

    private let viewBox = CGSize(width: 200, height: 420)

    var body: some View {
        GeometryReader { geo in
            let scale = min(geo.size.width / viewBox.width, geo.size.height / viewBox.height)
            let offsetX = (geo.size.width - viewBox.width * scale) / 2
            let offsetY = (geo.size.height - viewBox.height * scale) / 2

            ZStack {
                Canvas { context, _ in
                    let transform = CGAffineTransform(translationX: offsetX, y: offsetY)
                        .scaledBy(x: scale, y: scale)

                    // Head
                    let headRect = CGRect(x: 88, y: 13, width: 24, height: 24)
                    let headPath = Circle().path(in: headRect)
                    context.fill(headPath.applying(transform), with: .color(Color(hex: "#111827")))
                    context.stroke(headPath.applying(transform), with: .color(Color(hex: "#374151")), lineWidth: 0.5)

                    // Traps
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "traps"),
                               points: [(85,35), (70,45), (130,45), (115,35)])
                    // Left shoulder
                    drawMuscleQuad(context: context, transform: transform, tier: intensity.tier(for: "front_delts"),
                                   p1: (70,45), cp1: (55,55), cp2: (50,75), p2: (65,70))
                    // Right shoulder
                    drawMuscleQuad(context: context, transform: transform, tier: intensity.tier(for: "front_delts"),
                                   p1: (130,45), cp1: (145,55), cp2: (150,75), p2: (135,70))
                    // Chest L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "chest"),
                               points: [(100,45), (70,45), (65,85), (100,90)])
                    // Chest R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "chest"),
                               points: [(100,45), (130,45), (135,85), (100,90)])
                    // Biceps L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "biceps"),
                               points: [(50,75), (45,110), (60,105), (65,70)])
                    // Biceps R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "biceps"),
                               points: [(150,75), (155,110), (140,105), (135,70)])
                    // Forearms L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "forearms"),
                               points: [(45,110), (40,150), (55,150), (60,105)])
                    // Forearms R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "forearms"),
                               points: [(155,110), (160,150), (145,150), (140,105)])
                    // Abs upper
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "abs"),
                               points: [(85,90), (115,90), (110,110), (90,110)])
                    // Abs mid
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "abs"),
                               points: [(88,112), (112,112), (110,130), (90,130)])
                    // Abs lower
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "abs"),
                               points: [(90,132), (110,132), (108,150), (92,150)])
                    // Quads L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "quads"),
                               points: [(60,150), (95,155), (90,230), (65,220)])
                    // Quads R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "quads"),
                               points: [(140,150), (105,155), (110,230), (135,220)])
                    // Calves L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "calves"),
                               points: [(68,230), (90,230), (85,290), (70,280)])
                    // Calves R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "calves"),
                               points: [(132,230), (110,230), (115,290), (130,280)])
                }
            }
        }
    }

    private func drawMuscle(context: GraphicsContext, transform: CGAffineTransform, tier: Int,
                            points: [(Double, Double)]) {
        var path = Path()
        for (i, pt) in points.enumerated() {
            let p = CGPoint(x: pt.0, y: pt.1)
            if i == 0 { path.move(to: p) }
            else { path.addLine(to: p) }
        }
        path.closeSubpath()
        let transformed = path.applying(transform)
        let color = BodyHeatmapView.muscleColor(tier: tier)
        context.fill(transformed, with: .color(color))
        context.stroke(transformed, with: .color(Color(hex: "#111827")), lineWidth: 0.5)
    }

    private func drawMuscleQuad(context: GraphicsContext, transform: CGAffineTransform, tier: Int,
                                p1: (Double, Double), cp1: (Double, Double), cp2: (Double, Double), p2: (Double, Double)) {
        var path = Path()
        path.move(to: CGPoint(x: p1.0, y: p1.1))
        path.addQuadCurve(to: CGPoint(x: cp2.0, y: cp2.1),
                          control: CGPoint(x: cp1.0, y: cp1.1))
        path.addLine(to: CGPoint(x: p2.0, y: p2.1))
        path.closeSubpath()
        let transformed = path.applying(transform)
        let color = BodyHeatmapView.muscleColor(tier: tier)
        context.fill(transformed, with: .color(color))
        context.stroke(transformed, with: .color(Color(hex: "#111827")), lineWidth: 0.5)
    }
}

/// SVG-style muscle paths — back view
private struct BodyBackView: View {
    let intensity: StatsViewModel.MuscleIntensity

    private let viewBox = CGSize(width: 200, height: 420)

    var body: some View {
        GeometryReader { geo in
            let scale = min(geo.size.width / viewBox.width, geo.size.height / viewBox.height)
            let offsetX = (geo.size.width - viewBox.width * scale) / 2
            let offsetY = (geo.size.height - viewBox.height * scale) / 2

            ZStack {
                Canvas { context, _ in
                    let transform = CGAffineTransform(translationX: offsetX, y: offsetY)
                        .scaledBy(x: scale, y: scale)

                    // Head
                    let headRect = CGRect(x: 88, y: 13, width: 24, height: 24)
                    let headPath = Circle().path(in: headRect)
                    context.fill(headPath.applying(transform), with: .color(Color(hex: "#111827")))
                    context.stroke(headPath.applying(transform), with: .color(Color(hex: "#374151")), lineWidth: 0.5)

                    // Traps back (triangle)
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "traps"),
                               points: [(85,35), (115,35), (100,60)])
                    // Rear delts L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "rear_delts"),
                               points: [(70,45), (50,55), (55,75), (75,65)])
                    // Rear delts R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "rear_delts"),
                               points: [(130,45), (150,55), (145,75), (125,65)])
                    // Triceps L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "triceps"),
                               points: [(50,55), (40,100), (55,95), (60,65)])
                    // Triceps R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "triceps"),
                               points: [(150,55), (160,100), (145,95), (140,65)])
                    // Lats L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "lats"),
                               points: [(75,65), (60,110), (95,140), (100,60)])
                    // Lats R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "lats"),
                               points: [(125,65), (140,110), (105,140), (100,60)])
                    // Lower back
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "lower_back"),
                               points: [(90,140), (110,140), (105,160), (95,160)])
                    // Glutes L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "glutes"),
                               points: [(60,160), (95,160), (90,210), (55,190)])
                    // Glutes R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "glutes"),
                               points: [(140,160), (105,160), (110,210), (145,190)])
                    // Hamstrings L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "hamstrings"),
                               points: [(60,210), (90,220), (85,280), (65,270)])
                    // Hamstrings R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "hamstrings"),
                               points: [(140,210), (110,220), (115,280), (135,270)])
                    // Calves back L
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "calves"),
                               points: [(65,280), (85,280), (80,340), (70,330)])
                    // Calves back R
                    drawMuscle(context: context, transform: transform, tier: intensity.tier(for: "calves"),
                               points: [(135,280), (115,280), (120,340), (130,330)])
                }
            }
        }
    }

    private func drawMuscle(context: GraphicsContext, transform: CGAffineTransform, tier: Int,
                            points: [(Double, Double)]) {
        var path = Path()
        for (i, pt) in points.enumerated() {
            let p = CGPoint(x: pt.0, y: pt.1)
            if i == 0 { path.move(to: p) }
            else { path.addLine(to: p) }
        }
        path.closeSubpath()
        let transformed = path.applying(transform)
        let color = BodyHeatmapView.muscleColor(tier: tier)
        context.fill(transformed, with: .color(color))
        context.stroke(transformed, with: .color(Color(hex: "#111827")), lineWidth: 0.5)
    }
}

// MARK: - Correlation Chart (Swift Charts — Bar + Line combo)

private struct CorrelationChartView: View {
    let data: [StatsViewModel.TrendPoint]

    /// Normalize weight to 0-100 range for dual-axis effect
    private var weightRange: (min: Double, max: Double) {
        let weights = data.compactMap { $0.weight }
        guard let lo = weights.min(), let hi = weights.max(), hi > lo else {
            let w = weights.first ?? 70
            return (w - 2, w + 2)
        }
        return (lo - 2, hi + 2)
    }

    var body: some View {
        Chart {
            ForEach(data) { point in
                // Discipline bar
                BarMark(
                    x: .value("Date", point.dateLabel),
                    y: .value("Score", point.score)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(hex: "#22c55e").opacity(0.6), Color(hex: "#22c55e").opacity(0.1)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .cornerRadius(3)
            }

            ForEach(data) { point in
                if let weight = point.weight {
                    let wRange = weightRange
                    let normalizedWeight = wRange.max > wRange.min
                        ? (weight - wRange.min) / (wRange.max - wRange.min) * 100
                        : 50

                    LineMark(
                        x: .value("Date", point.dateLabel),
                        y: .value("Weight", normalizedWeight)
                    )
                    .foregroundStyle(Color(hex: "#eab308"))
                    .lineStyle(StrokeStyle(lineWidth: 2))
                    .interpolationMethod(.catmullRom)
                }
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisValueLabel()
                    .font(.system(size: 9))
                    .foregroundStyle(Color(hex: "#6b7280"))
            }
        }
        .chartYAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 3]))
                    .foregroundStyle(Color(hex: "#1f2937"))
            }
        }
        .chartYScale(domain: 0...110)
    }
}
