import SwiftUI
import UIKit

// MARK: - Celebration Types

/// The kind of celebration to display — determines haptic pattern and confetti style
enum CelebrationType {
    case levelUp
    case workoutComplete
    case streakMilestone
    case achievement
    case victory
    case xpGain
    case defeat // no confetti, just haptic acknowledgement
}

// MARK: - Confetti Particle

/// A single confetti particle with position, velocity, color, and lifetime
struct ConfettiParticle: Identifiable {
    let id = UUID()
    var x: CGFloat
    var y: CGFloat
    var velocityX: CGFloat
    var velocityY: CGFloat
    var rotation: Double
    var rotationSpeed: Double
    var scale: CGFloat
    var color: Color
    var opacity: Double
    var shape: ConfettiShape

    enum ConfettiShape: CaseIterable {
        case circle
        case rectangle
        case triangle
    }
}

// MARK: - Celebration Service (Singleton)

/// Coordinates haptic feedback for gamification events
/// Mirrors celebrations.js from the React prototype using UIKit haptics
final class CelebrationService {
    static let shared = CelebrationService()

    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let successNotification = UINotificationFeedbackGenerator()

    private init() {
        // Pre-warm haptic engines for zero-latency response
        heavyImpact.prepare()
        mediumImpact.prepare()
        lightImpact.prepare()
        successNotification.prepare()
    }

    /// Prepare haptic engines before a known celebration
    func prepare() {
        heavyImpact.prepare()
        mediumImpact.prepare()
        lightImpact.prepare()
        successNotification.prepare()
    }

    // MARK: - Celebration Methods

    /// Level Up — heavy impact + success notification + delayed medium
    /// The big one. Double-burst haptic choreography.
    func celebrateLevelUp() {
        heavyImpact.impactOccurred(intensity: 1.0)
        successNotification.notificationOccurred(.success)

        // Second burst after 250ms (matches React side-cannon timing)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            self?.mediumImpact.impactOccurred(intensity: 0.8)
        }
    }

    /// Workout Complete — success notification, single satisfying pulse
    func celebrateWorkoutComplete() {
        successNotification.notificationOccurred(.success)
    }

    /// Streak Milestone — medium impact, fire-themed
    func celebrateStreakMilestone() {
        mediumImpact.impactOccurred(intensity: 0.9)
    }

    /// Achievement Unlocked — success notification, elegant
    func celebrateAchievement() {
        successNotification.notificationOccurred(.success)
    }

    /// Ghost Match Victory — sustained heavy impacts with timing
    /// Multiple heavy hits spaced 200ms apart for 1.5 seconds
    func celebrateVictory() {
        heavyImpact.impactOccurred(intensity: 1.0)

        let totalDuration = 1.5
        let interval = 0.2
        let pulseCount = Int(totalDuration / interval)

        for i in 1...pulseCount {
            DispatchQueue.main.asyncAfter(deadline: .now() + interval * Double(i)) { [weak self] in
                self?.heavyImpact.impactOccurred(intensity: CGFloat(1.0 - Double(i) * 0.1))
            }
        }
    }

    /// XP Gain — light impact, subtle micro-celebration
    func celebrateXPGain() {
        lightImpact.impactOccurred(intensity: 0.6)
    }

    /// Defeat — somber single medium pulse, no confetti
    func acknowledgeDefeat() {
        mediumImpact.impactOccurred(intensity: 0.5)
    }

    /// Fire the appropriate haptic for a celebration type
    func fire(_ type: CelebrationType) {
        switch type {
        case .levelUp:          celebrateLevelUp()
        case .workoutComplete:  celebrateWorkoutComplete()
        case .streakMilestone:  celebrateStreakMilestone()
        case .achievement:      celebrateAchievement()
        case .victory:          celebrateVictory()
        case .xpGain:           celebrateXPGain()
        case .defeat:           acknowledgeDefeat()
        }
    }
}

// MARK: - Confetti View Model

/// Manages the confetti particle system state
class ConfettiViewModel: ObservableObject {
    @Published var particles: [ConfettiParticle] = []
    @Published var isActive: Bool = false

    private var displayLink: CADisplayLink?
    private var startTime: Date?

    // Brand colors matching BRAND_COLORS from React
    private let brandColors: [Color] = [
        Color(red: 0.863, green: 0.149, blue: 0.149), // #dc2626
        Color(red: 0.937, green: 0.267, blue: 0.267), // #ef4444
        Color(red: 0.973, green: 0.443, blue: 0.443), // #f87171
        .white
    ]

    // Fire colors matching FIRE_COLORS from React
    private let fireColors: [Color] = [
        Color(red: 0.863, green: 0.149, blue: 0.149), // #dc2626
        Color(red: 1.0, green: 0.42, blue: 0.0),      // #ff6b00
        Color(red: 1.0, green: 0.584, blue: 0.0),      // #ff9500
        Color(red: 1.0, green: 0.8, blue: 0.0),        // #ffcc00
    ]

    func emit(type: CelebrationType, in size: CGSize) {
        guard !isActive else { return }
        isActive = true
        startTime = Date()

        let colors: [Color]
        let count: Int
        let spread: CGFloat
        let originY: CGFloat
        let initialVelocityY: CGFloat

        switch type {
        case .levelUp:
            colors = brandColors
            count = 100
            spread = size.width * 0.8
            originY = size.height * 0.6
            initialVelocityY = -600
        case .workoutComplete:
            colors = brandColors
            count = 60
            spread = size.width * 0.55
            originY = size.height * 0.7
            initialVelocityY = -500
        case .streakMilestone:
            colors = fireColors
            count = 45
            spread = size.width * 0.45
            originY = size.height * 0.5
            initialVelocityY = -450
        case .achievement:
            colors = brandColors + [Color(red: 0.984, green: 0.749, blue: 0.145)] // + gold
            count = 35
            spread = size.width * 0.7
            originY = size.height * 0.8
            initialVelocityY = -550
        case .victory:
            colors = brandColors
            count = 80
            spread = size.width
            originY = size.height * 0.6
            initialVelocityY = -500
        case .xpGain:
            colors = [brandColors[0], brandColors[1]]
            count = 8
            spread = size.width * 0.3
            originY = size.height * 0.3
            initialVelocityY = -200
        case .defeat:
            // No confetti for defeat
            isActive = false
            return
        }

        let centerX = size.width / 2

        particles = (0..<count).map { _ in
            let angle = CGFloat.random(in: -0.8...0.8)
            let speed = CGFloat.random(in: 0.5...1.0)
            return ConfettiParticle(
                x: centerX + CGFloat.random(in: -20...20),
                y: originY,
                velocityX: sin(angle) * spread * speed,
                velocityY: initialVelocityY * CGFloat.random(in: 0.6...1.0),
                rotation: Double.random(in: 0...360),
                rotationSpeed: Double.random(in: -720...720),
                scale: CGFloat.random(in: 0.4...1.0),
                color: colors.randomElement() ?? .red,
                opacity: 1.0,
                shape: ConfettiParticle.ConfettiShape.allCases.randomElement() ?? .circle
            )
        }

        // Side cannons for levelUp and victory (matches React implementation)
        if type == .levelUp || type == .victory {
            let sideCount = type == .levelUp ? 50 : 40
            let leftParticles = (0..<sideCount).map { _ -> ConfettiParticle in
                ConfettiParticle(
                    x: 0,
                    y: size.height * 0.65,
                    velocityX: CGFloat.random(in: 200...500),
                    velocityY: CGFloat.random(in: -400 ... -200),
                    rotation: Double.random(in: 0...360),
                    rotationSpeed: Double.random(in: -500...500),
                    scale: CGFloat.random(in: 0.3...0.8),
                    color: colors.randomElement() ?? .red,
                    opacity: 1.0,
                    shape: ConfettiParticle.ConfettiShape.allCases.randomElement() ?? .circle
                )
            }
            let rightParticles = (0..<sideCount).map { _ -> ConfettiParticle in
                ConfettiParticle(
                    x: size.width,
                    y: size.height * 0.65,
                    velocityX: CGFloat.random(in: -500 ... -200),
                    velocityY: CGFloat.random(in: -400 ... -200),
                    rotation: Double.random(in: 0...360),
                    rotationSpeed: Double.random(in: -500...500),
                    scale: CGFloat.random(in: 0.3...0.8),
                    color: colors.randomElement() ?? .red,
                    opacity: 1.0,
                    shape: ConfettiParticle.ConfettiShape.allCases.randomElement() ?? .circle
                )
            }

            // Delay side cannons by 250ms (matches React)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                self?.particles.append(contentsOf: leftParticles + rightParticles)
            }
        }

        // Auto-dismiss after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            withAnimation(.easeOut(duration: 0.3)) {
                self?.particles.removeAll()
                self?.isActive = false
            }
        }
    }
}

// MARK: - Confetti View

/// Full-screen confetti particle overlay
/// Uses TimelineView for smooth 60fps animation with gravity physics
struct ConfettiView: View {
    @StateObject private var vm = ConfettiViewModel()
    let type: CelebrationType
    @Binding var isShowing: Bool

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let elapsed = vm.startTime.map { timeline.date.timeIntervalSince($0) } ?? 0

                    for particle in vm.particles {
                        let gravity: CGFloat = 800
                        let drag: CGFloat = 0.97

                        let t = CGFloat(elapsed)
                        let x = particle.x + particle.velocityX * t * drag
                        let y = particle.y + particle.velocityY * t + 0.5 * gravity * t * t
                        let rotation = Angle.degrees(particle.rotation + particle.rotationSpeed * elapsed)
                        let fadeStart: CGFloat = 1.5
                        let opacity = t < fadeStart ? particle.opacity : max(0, particle.opacity - Double((t - fadeStart) * 3))

                        guard opacity > 0 && y < size.height + 50 else { continue }

                        let particleSize = 8 * particle.scale
                        let rect = CGRect(
                            x: x - particleSize / 2,
                            y: y - particleSize / 2,
                            width: particleSize,
                            height: particleSize * (particle.shape == .rectangle ? 2 : 1)
                        )

                        context.opacity = opacity
                        context.translateBy(x: x, y: y)
                        context.rotate(by: rotation)
                        context.translateBy(x: -x, y: -y)

                        switch particle.shape {
                        case .circle:
                            context.fill(
                                Circle().path(in: rect),
                                with: .color(particle.color)
                            )
                        case .rectangle:
                            context.fill(
                                RoundedRectangle(cornerRadius: 1).path(in: rect),
                                with: .color(particle.color)
                            )
                        case .triangle:
                            var path = Path()
                            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
                            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
                            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
                            path.closeSubpath()
                            context.fill(path, with: .color(particle.color))
                        }

                        // Reset transform
                        context.translateBy(x: x, y: y)
                        context.rotate(by: -rotation)
                        context.translateBy(x: -x, y: -y)
                    }
                }
            }
            .onChange(of: isShowing) { _, newValue in
                if newValue {
                    vm.emit(type: type, in: geo.size)
                    CelebrationService.shared.fire(type)
                }
            }
            .onChange(of: vm.isActive) { _, active in
                if !active && isShowing {
                    isShowing = false
                }
            }
            .onAppear {
                if isShowing {
                    vm.emit(type: type, in: geo.size)
                    CelebrationService.shared.fire(type)
                }
            }
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
    }
}

// MARK: - Confetti Overlay View Modifier

/// Attach confetti to any view:
///   .confettiOverlay(isShowing: $showConfetti, type: .levelUp)
struct ConfettiOverlayModifier: ViewModifier {
    @Binding var isShowing: Bool
    let type: CelebrationType

    func body(content: Content) -> some View {
        content
            .overlay {
                if isShowing {
                    ConfettiView(type: type, isShowing: $isShowing)
                }
            }
    }
}

extension View {
    /// Add a confetti celebration overlay to any view
    /// - Parameters:
    ///   - isShowing: Binding that triggers the celebration when set to true
    ///   - type: The celebration type (determines colors, intensity, haptics)
    func confettiOverlay(isShowing: Binding<Bool>, type: CelebrationType) -> some View {
        modifier(ConfettiOverlayModifier(isShowing: isShowing, type: type))
    }
}
