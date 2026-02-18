import SwiftUI

// MARK: - 1. SHAPE DEFINITIONS
// All shapes use a 0-1 coordinate space relative to the rect provided

/// 1. Water Droplet - Sleek single drop
struct WaterDropShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let width = rect.width
        let height = rect.height
        
        path.move(to: CGPoint(x: width * 0.5, y: 0))
        
        // Curve down to right belly
        path.addCurve(to: CGPoint(x: width, y: height * 0.65),
                      control1: CGPoint(x: width * 0.5, y: height * 0.3),
                      control2: CGPoint(x: width, y: height * 0.45))
        
        // Bottom arc
        path.addArc(center: CGPoint(x: width * 0.5, y: height * 0.65),
                    radius: width * 0.5,
                    startAngle: Angle(degrees: 0),
                    endAngle: Angle(degrees: 180),
                    clockwise: false)
        
        // Curve back up to top
        path.addCurve(to: CGPoint(x: width * 0.5, y: 0),
                      control1: CGPoint(x: 0, y: height * 0.45),
                      control2: CGPoint(x: width * 0.5, y: height * 0.3))
        
        path.closeSubpath()
        return path
    }
}

/// 2. Protein Bolt - Sharp angular lightning
struct BoltShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Start top right-ish
        path.move(to: CGPoint(x: w * 0.65, y: 0))
        path.addLine(to: CGPoint(x: w * 0.35, y: h * 0.4))
        path.addLine(to: CGPoint(x: w * 0.55, y: h * 0.4))
        path.addLine(to: CGPoint(x: w * 0.25, y: h)) // Tip
        path.addLine(to: CGPoint(x: w * 0.65, y: h * 0.55))
        path.addLine(to: CGPoint(x: w * 0.45, y: h * 0.55))
        path.addLine(to: CGPoint(x: w * 0.85, y: 0.1)) // Near top
        
        path.closeSubpath()
        return path
    }
}

/// 3. Egg - Smooth organic oval
struct EggShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        path.move(to: CGPoint(x: w * 0.5, y: 0))
        
        // Right side curve (slightly flatter at top, rounder at bottom)
        path.addCurve(to: CGPoint(x: w * 0.5, y: h),
                      control1: CGPoint(x: w * 1.05, y: h * 0.3),
                      control2: CGPoint(x: w * 0.95, y: h * 0.8))
        
        // Left side curve
        path.addCurve(to: CGPoint(x: w * 0.5, y: 0),
                      control1: CGPoint(x: w * 0.05, y: h * 0.8),
                      control2: CGPoint(x: -0.05, y: h * 0.3))
        
        path.closeSubpath()
        return path
    }
}

/// 4. Chicken Drumstick - Minimal meat & bone
struct DrumstickShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Meat part (oval tilted)
        path.move(to: CGPoint(x: w * 0.3, y: h * 0.4))
        path.addCurve(to: CGPoint(x: w * 0.8, y: h * 0.1),
                      control1: CGPoint(x: w * 0.3, y: h * 0.1),
                      control2: CGPoint(x: w * 0.6, y: -0.1))
        
        path.addCurve(to: CGPoint(x: w * 0.9, y: h * 0.6),
                      control1: CGPoint(x: w, y: h * 0.3),
                      control2: CGPoint(x: w * 1.0, y: h * 0.5))
        
        // Bone handle
        path.addLine(to: CGPoint(x: w * 0.45, y: h * 0.9))
        
        // Bone knob
        path.addArc(center: CGPoint(x: w * 0.35, y: h * 0.95),
                    radius: w * 0.1,
                    startAngle: Angle(degrees: 0),
                    endAngle: Angle(degrees: 360),
                    clockwise: false)
        
        path.move(to: CGPoint(x: w * 0.38, y: h * 0.86))
        
        // Close meat loop
        path.addCurve(to: CGPoint(x: w * 0.3, y: h * 0.4),
                      control1: CGPoint(x: w * 0.4, y: h * 0.7),
                      control2: CGPoint(x: w * 0.2, y: h * 0.6))
        
        path.closeSubpath()
        return path
    }
}

/// 5. Chef Hat - Toque style
struct ChefHatShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Bottom band
        let bandHeight = h * 0.25
        let bandY = h - bandHeight
        let bandWidth = w * 0.7
        let bandX = (w - bandWidth) / 2
        
        path.addRoundedRect(in: CGRect(x: bandX, y: bandY, width: bandWidth, height: bandHeight), cornerSize: CGSize(width: 4, height: 4))
        
        // Puffy top
        path.move(to: CGPoint(x: bandX, y: bandY))
        
        // Left puff
        path.addCurve(to: CGPoint(x: bandX, y: h * 0.3),
                      control1: CGPoint(x: w * 0.0, y: h * 0.7),
                      control2: CGPoint(x: w * 0.0, y: h * 0.4))
        
        // Top puffs (3 bumps)
        path.addCurve(to: CGPoint(x: w * 0.5, y: 0),
                      control1: CGPoint(x: w * 0.2, y: h * 0.1),
                      control2: CGPoint(x: w * 0.4, y: 0))
        
        path.addCurve(to: CGPoint(x: bandX + bandWidth, y: h * 0.3),
                      control1: CGPoint(x: w * 0.6, y: 0),
                      control2: CGPoint(x: w * 0.8, y: h * 0.1))
        
        // Right puff
        path.addCurve(to: CGPoint(x: bandX + bandWidth, y: bandY),
                      control1: CGPoint(x: w * 1.0, y: h * 0.4),
                      control2: CGPoint(x: w * 1.0, y: h * 0.7))
        
        path.closeSubpath()
        return path
    }
}

/// 6. Crossed Utensils - Fork & Knife
struct CrossedUtensilsShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Knife (Right tilt)
        let knifeWidth = w * 0.15
        path.move(to: CGPoint(x: w * 0.2, y: h * 0.8))
        path.addLine(to: CGPoint(x: w * 0.7, y: h * 0.1))
        path.addArc(center: CGPoint(x: w * 0.75, y: h * 0.15), radius: knifeWidth/2, startAngle: Angle(degrees: 225), endAngle: Angle(degrees: 45), clockwise: false)
        path.addLine(to: CGPoint(x: w * 0.3, y: h * 0.9))
        path.addArc(center: CGPoint(x: w * 0.25, y: h * 0.85), radius: knifeWidth/2, startAngle: Angle(degrees: 45), endAngle: Angle(degrees: 225), clockwise: false)
        
        // Fork (Left tilt) - drawn as separate subpath
        path.closeSubpath()
        
        let forkWidth = w * 0.15
        path.move(to: CGPoint(x: w * 0.8, y: h * 0.8))
        path.addLine(to: CGPoint(x: w * 0.3, y: h * 0.1))
        
        // Fork tines
        path.addLine(to: CGPoint(x: w * 0.25, y: h * 0.15)) // Left tine tip
        path.addLine(to: CGPoint(x: w * 0.7, y: h * 0.9))   // Handle bottom
        path.addArc(center: CGPoint(x: w * 0.75, y: h * 0.85), radius: forkWidth/2, startAngle: Angle(degrees: 135), endAngle: Angle(degrees: 315), clockwise: false)
        
        return path
    }
}

/// 7. Flame - Dynamic fire
struct FlameShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        path.move(to: CGPoint(x: w * 0.5, y: h))
        
        // Left curve up
        path.addCurve(to: CGPoint(x: w * 0.1, y: h * 0.4),
                      control1: CGPoint(x: w * 0.1, y: h * 0.9),
                      control2: CGPoint(x: 0, y: h * 0.6))
        
        // Tip curve
        path.addCurve(to: CGPoint(x: w * 0.6, y: 0),
                      control1: CGPoint(x: w * 0.2, y: h * 0.2),
                      control2: CGPoint(x: w * 0.4, y: 0))
        
        // Right curve down
        path.addCurve(to: CGPoint(x: w * 0.5, y: h),
                      control1: CGPoint(x: w * 0.8, y: h * 0.3),
                      control2: CGPoint(x: w * 0.9, y: h * 0.8))
        
        path.closeSubpath()
        
        // Inner flame cutout (subtractive if using even-odd fill, but here additive for shape)
        // For a simple unified shape, we'll just draw the main flame. 
        // If complex, we use separate shapes or subpaths.
        // Let's make it a single solid flame with a cutout look by adding a hole path reversed?
        // SwiftUI paths fill non-zero winding by default. 
        
        let innerRect = rect.insetBy(dx: w * 0.25, dy: h * 0.25).offsetBy(dx: 0, dy: h * 0.1)
        let innerW = innerRect.width
        let innerH = innerRect.height
        let innerX = innerRect.minX
        let innerY = innerRect.minY
        
        path.move(to: CGPoint(x: innerX + innerW * 0.5, y: innerY + innerH))
        path.addCurve(to: CGPoint(x: innerX, y: innerY + innerH * 0.5),
                      control1: CGPoint(x: innerX + innerW * 0.1, y: innerY + innerH * 0.9),
                      control2: CGPoint(x: innerX, y: innerY + innerH * 0.7))
        path.addCurve(to: CGPoint(x: innerX + innerW * 0.5, y: innerY),
                      control1: CGPoint(x: innerX, y: innerY + innerH * 0.2),
                      control2: CGPoint(x: innerX + innerW * 0.3, y: innerY))
        path.addCurve(to: CGPoint(x: innerX + innerW * 0.5, y: innerY + innerH),
                      control1: CGPoint(x: innerX + innerW * 1.0, y: innerY + innerH * 0.4),
                      control2: CGPoint(x: innerX + innerW * 0.9, y: innerY + innerH * 0.9))
        
        path.closeSubpath()
        
        return path
    }
}

/// 8. Water Drop Nutrition (Fuller)
struct WaterDropFullShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        path.move(to: CGPoint(x: w * 0.5, y: 0))
        
        // Fuller belly
        path.addCurve(to: CGPoint(x: w, y: h * 0.7),
                      control1: CGPoint(x: w * 0.7, y: h * 0.3),
                      control2: CGPoint(x: w, y: h * 0.5))
        
        path.addArc(center: CGPoint(x: w * 0.5, y: h * 0.7),
                    radius: w * 0.5,
                    startAngle: Angle(degrees: 0),
                    endAngle: Angle(degrees: 180),
                    clockwise: false)
        
        path.addCurve(to: CGPoint(x: w * 0.5, y: 0),
                      control1: CGPoint(x: 0, y: h * 0.5),
                      control2: CGPoint(x: w * 0.3, y: h * 0.3))
        
        path.closeSubpath()
        return path
    }
}

/// 9. Camera / Form Coach
struct CameraEyeShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let center = CGPoint(x: w/2, y: h/2)
        
        // Outer body
        path.addEllipse(in: rect)
        
        // Lens ring
        let lensRect = rect.insetBy(dx: w * 0.25, dy: h * 0.25)
        path.addEllipse(in: lensRect)
        
        // Iris/Pupil
        let pupilRect = rect.insetBy(dx: w * 0.42, dy: h * 0.42)
        path.addEllipse(in: pupilRect)
        
        // Detail: Shutter button area
        let buttonRect = CGRect(x: w * 0.75, y: h * 0.05, width: w * 0.15, height: h * 0.1)
        path.addRoundedRect(in: buttonRect, cornerSize: CGSize(width: 2, height: 2))
        
        return path
    }
}

/// 10. Brain / AI Insights
struct BrainShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Start bottom center (brain stem top)
        path.move(to: CGPoint(x: w * 0.5, y: h * 0.8))
        
        // Cerebellum (back/bottom right)
        path.addCurve(to: CGPoint(x: w * 0.9, y: h * 0.6),
                      control1: CGPoint(x: w * 0.7, y: h * 0.85),
                      control2: CGPoint(x: w * 0.95, y: h * 0.7))
        
        // Frontal Lobe (top curves)
        path.addCurve(to: CGPoint(x: w * 0.5, y: 0),
                      control1: CGPoint(x: w, y: h * 0.3),
                      control2: CGPoint(x: w * 0.8, y: 0))
        
        path.addCurve(to: CGPoint(x: w * 0.1, y: h * 0.6),
                      control1: CGPoint(x: w * 0.2, y: 0),
                      control2: CGPoint(x: 0, y: h * 0.3))
        
        // Temporal Lobe connection
        path.addCurve(to: CGPoint(x: w * 0.5, y: h * 0.8),
                      control1: CGPoint(x: w * 0.2, y: h * 0.9),
                      control2: CGPoint(x: w * 0.4, y: h * 0.85))
        
        // Neural lines
        path.move(to: CGPoint(x: w * 0.3, y: h * 0.4))
        path.addLine(to: CGPoint(x: w * 0.7, y: h * 0.4))
        
        path.move(to: CGPoint(x: w * 0.4, y: h * 0.6))
        path.addLine(to: CGPoint(x: w * 0.8, y: h * 0.25))
        
        return path
    }
}

/// 11. Timer / Smart Rest
struct TimerShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let center = CGPoint(x: w/2, y: h/2)
        let radius = w * 0.45
        
        // Knob top
        path.addRect(CGRect(x: w * 0.45, y: 0, width: w * 0.1, height: h * 0.1))
        
        // Main Ring Arc (70% full)
        path.addArc(center: center,
                    radius: radius,
                    startAngle: Angle(degrees: -90),
                    endAngle: Angle(degrees: 160),
                    clockwise: false)
        
        // Inner arc to create thickness
        path.addArc(center: center,
                    radius: radius * 0.8,
                    startAngle: Angle(degrees: 160),
                    endAngle: Angle(degrees: -90),
                    clockwise: true)
        
        path.closeSubpath()
        
        // Dot at leading edge
        // Calculate position for 160 degrees
        let angleRad = 160 * Double.pi / 180
        let dotX = center.x + radius * 0.9 * cos(angleRad)
        let dotY = center.y + radius * 0.9 * sin(angleRad)
        let dotRadius = w * 0.08
        
        let dotRect = CGRect(x: dotX - dotRadius/2, y: dotY - dotRadius/2, width: dotRadius, height: dotRadius)
        path.addEllipse(in: dotRect)
        
        return path
    }
}

/// 12. Crescent Moon / Recovery
struct CrescentMoonShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Outer Moon
        path.addArc(center: CGPoint(x: w * 0.5, y: h * 0.5),
                    radius: w * 0.4,
                    startAngle: Angle(degrees: 60),
                    endAngle: Angle(degrees: 300), // 300 is -60
                    clockwise: true) // Logic: this draws the back of the moon
        
        // Inner cut
        path.addCurve(to: CGPoint(x: w * 0.7, y: h * 0.846),
                      control1: CGPoint(x: w * 0.4, y: h * 0.3),
                      control2: CGPoint(x: w * 0.4, y: h * 0.7))
        
        // Need a simpler consistent moon shape
        // Let's draw two arcs
        var moonPath = Path()
        moonPath.move(to: CGPoint(x: w * 0.5, y: h * 0.1))
        moonPath.addCurve(to: CGPoint(x: w * 0.5, y: h * 0.9),
                          control1: CGPoint(x: w * 0.1, y: h * 0.3),
                          control2: CGPoint(x: w * 0.1, y: h * 0.7))
        moonPath.addCurve(to: CGPoint(x: w * 0.5, y: h * 0.1),
                          control1: CGPoint(x: w * 0.4, y: h * 0.3), // Inner curve less convex
                          control2: CGPoint(x: w * 0.4, y: h * 0.7))
        moonPath.closeSubpath()
        
        path.addPath(moonPath)
        
        // Stars
        let star1Ref = CGRect(x: w * 0.75, y: h * 0.2, width: w * 0.15, height: h * 0.15)
        path.addEllipse(in: star1Ref) // Simplified star as dot/diamond
        
        let star2Ref = CGRect(x: w * 0.65, y: h * 0.4, width: w * 0.10, height: h * 0.10)
        path.addEllipse(in: star2Ref)
        
        return path
    }
}

/// 13. Trophy / Achievements
struct TrophyShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Base
        path.addRect(CGRect(x: w * 0.3, y: h * 0.9, width: w * 0.4, height: h * 0.1))
        
        // Stem
        path.move(to: CGPoint(x: w * 0.45, y: h * 0.9))
        path.addLine(to: CGPoint(x: w * 0.45, y: h * 0.7))
        path.addLine(to: CGPoint(x: w * 0.55, y: h * 0.7))
        path.addLine(to: CGPoint(x: w * 0.55, y: h * 0.9))
        
        // Cup Body
        path.move(to: CGPoint(x: w * 0.2, y: h * 0.2))
        path.addLine(to: CGPoint(x: w * 0.8, y: h * 0.2)) // Rim
        path.addCurve(to: CGPoint(x: w * 0.5, y: h * 0.7),
                      control1: CGPoint(x: w * 0.8, y: h * 0.5),
                      control2: CGPoint(x: w * 0.6, y: h * 0.7))
        path.addCurve(to: CGPoint(x: w * 0.2, y: h * 0.2),
                      control1: CGPoint(x: w * 0.4, y: h * 0.7),
                      control2: CGPoint(x: w * 0.2, y: h * 0.5))
        
        // Handles
        path.move(to: CGPoint(x: w * 0.2, y: h * 0.25))
        path.addCurve(to: CGPoint(x: w * 0.25, y: h * 0.5),
                      control1: CGPoint(x: w * 0.05, y: h * 0.25),
                      control2: CGPoint(x: w * 0.05, y: h * 0.5))
        
        path.move(to: CGPoint(x: w * 0.8, y: h * 0.25))
        path.addCurve(to: CGPoint(x: w * 0.75, y: h * 0.5),
                      control1: CGPoint(x: w * 0.95, y: h * 0.25),
                      control2: CGPoint(x: w * 0.95, y: h * 0.5))
        
        return path
    }
}

/// 14. Nutrition Droplet with Leaf
struct NutritionDropletShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Base droplet (similar to #1 but positioned lower)
        path.move(to: CGPoint(x: w * 0.4, y: h * 0.2))
        path.addCurve(to: CGPoint(x: w * 0.8, y: h * 0.8),
                      control1: CGPoint(x: w * 0.4, y: h * 0.5),
                      control2: CGPoint(x: w * 0.9, y: h * 0.6))
        path.addArc(center: CGPoint(x: w * 0.4, y: h * 0.8),
                    radius: w * 0.4,
                    startAngle: Angle(degrees: 0),
                    endAngle: Angle(degrees: 180),
                    clockwise: false)
        path.addCurve(to: CGPoint(x: w * 0.4, y: h * 0.2),
                      control1: CGPoint(x: 0, y: h * 0.6),
                      control2: CGPoint(x: w * 0.3, y: h * 0.4))
        
        // Leaf
        path.move(to: CGPoint(x: w * 0.4, y: h * 0.2))
        path.addCurve(to: CGPoint(x: w * 0.9, y: 0),
                      control1: CGPoint(x: w * 0.4, y: 0),
                      control2: CGPoint(x: w * 0.7, y: 0))
        path.addCurve(to: CGPoint(x: w * 0.4, y: h * 0.2),
                      control1: CGPoint(x: w * 0.9, y: h * 0.2),
                      control2: CGPoint(x: w * 0.6, y: h * 0.3))
        
        // Leaf vein
        path.move(to: CGPoint(x: w * 0.45, y: h * 0.15))
        path.addLine(to: CGPoint(x: w * 0.75, y: h * 0.05))
        
        return path
    }
}

/// 15. Rising Chart / Analytics
struct RisingChartShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        
        // Bars
        let barWidth = w * 0.15
        let gap = w * 0.1
        
        // Bar 1 (Short)
        path.addRoundedRect(in: CGRect(x: 0, y: h * 0.7, width: barWidth, height: h * 0.3), cornerSize: CGSize(width: 2, height: 2))
        
        // Bar 2
        path.addRoundedRect(in: CGRect(x: barWidth + gap, y: h * 0.5, width: barWidth, height: h * 0.5), cornerSize: CGSize(width: 2, height: 2))
        
        // Bar 3
        path.addRoundedRect(in: CGRect(x: (barWidth + gap) * 2, y: h * 0.3, width: barWidth, height: h * 0.7), cornerSize: CGSize(width: 2, height: 2))
        
        // Bar 4 (Tall)
        path.addRoundedRect(in: CGRect(x: (barWidth + gap) * 3, y: h * 0.15, width: barWidth, height: h * 0.85), cornerSize: CGSize(width: 2, height: 2))
        
        // Trend Line
        path.move(to: CGPoint(x: barWidth/2, y: h * 0.65))
        path.addLine(to: CGPoint(x: w * 0.9, y: h * 0.1))
        
        // Peak Dot
        let dotR = w * 0.05
        path.addEllipse(in: CGRect(x: w * 0.9 - dotR, y: h * 0.1 - dotR, width: dotR*2, height: dotR*2))
        
        return path
    }
}

// MARK: - 2. ICON ENUM

enum IronCoreIcon: String, CaseIterable {
    case water, protein, eggs, chicken
    case chefHat, utensils, flame, waterFull
    case formCoach, brain, timer, moon
    case trophy, nutritionLeaf, analytics
    
    var displayName: String {
        switch self {
        case .water: return "Hydration"
        case .protein: return "Protein"
        case .eggs: return "Breakfast"
        case .chicken: return "Lunch"
        case .chefHat: return "Cooking"
        case .utensils: return "Dining"
        case .flame: return "Calories"
        case .waterFull: return "Intake"
        case .formCoach: return "Form Coach"
        case .brain: return "AI Insights"
        case .timer: return "Smart Rest"
        case .moon: return "Recovery"
        case .trophy: return "Awards"
        case .nutritionLeaf: return "Nutrition"
        case .analytics: return "Analytics"
        }
    }
    
    var gradientCheck: LinearGradient {
        switch self {
        case .water, .waterFull:
            return LinearGradient(colors: [.cyan, .blue], startPoint: .top, endPoint: .bottom)
        case .protein:
            return LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .eggs, .chefHat, .utensils:
            return LinearGradient(colors: [.white, Color(white: 0.9)], startPoint: .top, endPoint: .bottom)
        case .chicken:
            return LinearGradient(colors: [.orange, .brown], startPoint: .top, endPoint: .bottom)
        case .flame:
            return LinearGradient(colors: [.yellow, .orange, .red], startPoint: .top, endPoint: .bottom)
        case .formCoach:
            return LinearGradient(colors: [.red, .orange], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .brain:
            return LinearGradient(colors: [Color(red: 0.6, green: 0, blue: 1), .indigo], startPoint: .top, endPoint: .bottom)
        case .timer, .trophy:
            return LinearGradient(colors: [.orange, .yellow], startPoint: .top, endPoint: .bottom)
        case .moon:
            return LinearGradient(colors: [.cyan, Color(red: 0.8, green: 0.9, blue: 1)], startPoint: .top, endPoint: .bottom)
        case .nutritionLeaf:
            return LinearGradient(colors: [.green, .teal], startPoint: .top, endPoint: .bottom)
        case .analytics:
            return LinearGradient(colors: [Color.pink, .red], startPoint: .bottom, endPoint: .top)
        }
    }
    
    var glowColor: Color {
        switch self {
        case .water, .waterFull: return .cyan
        case .protein: return .blue
        case .eggs, .chefHat, .utensils: return .white
        case .chicken, .flame, .formCoach: return .orange
        case .brain: return .purple
        case .timer, .trophy: return .orange
        case .moon: return .cyan
        case .nutritionLeaf: return .green
        case .analytics: return .pink
        }
    }
    
    @ViewBuilder
    func view(size: CGFloat) -> some View {
        switch self {
        case .water: WaterDropShape().frame(width: size, height: size)
        case .protein: BoltShape().frame(width: size, height: size)
        case .eggs: EggShape().frame(width: size, height: size)
        case .chicken: DrumstickShape().frame(width: size, height: size)
        case .chefHat: ChefHatShape().frame(width: size, height: size)
        case .utensils: CrossedUtensilsShape().frame(width: size, height: size)
        case .flame: FlameShape().frame(width: size, height: size)
        case .waterFull: WaterDropFullShape().frame(width: size, height: size)
        case .formCoach: CameraEyeShape().frame(width: size, height: size)
        case .brain: BrainShape().frame(width: size, height: size)
        case .timer: TimerShape().frame(width: size, height: size)
        case .moon: CrescentMoonShape().frame(width: size, height: size)
        case .trophy: TrophyShape().frame(width: size, height: size)
        case .nutritionLeaf: NutritionDropletShape().frame(width: size, height: size)
        case .analytics: RisingChartShape().frame(width: size, height: size)
        }
    }
}

// MARK: - 3. REUSABLE AURA COMPONENT

struct AuraIconView: View {
    let icon: IronCoreIcon
    var size: CGFloat = 60
    
    var body: some View {
        ZStack {
            // Background Glow
            Circle()
                .fill(icon.glowColor.opacity(0.15))
                .frame(width: size * 1.5, height: size * 1.5)
                .blur(radius: 10)
            
            // The Icon
            icon.view(size: size)
                .fill(icon.gradientCheck)
                .shadow(color: icon.glowColor.opacity(0.6), radius: 8, x: 0, y: 0)
                .shadow(color: icon.glowColor.opacity(0.4), radius: 15, x: 0, y: 0)
        }
    }
}

// MARK: - 4. QUICK LOG COMPONENT

struct QuickLogButton: View {
    let icon: IronCoreIcon
    let label: String
    let value: String
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color(white: 0.15))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Circle().stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                
                AuraIconView(icon: icon, size: 36)
            }
            .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 4)
            
            VStack(spacing: 2) {
                Text(label)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.gray)
                
                Text(value)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
        }
        .scaleEffect(1.0)
        .onTapGesture {
            // Haptic would go here using UIImpactFeedbackGenerator
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
        }
    }
}

// MARK: - 5. FEATURE CARD COMPONENT

struct FeatureCard: View {
    let icon: IronCoreIcon
    let title: String
    let subtitle: String
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon Box
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(white: 0.12))
                    .frame(width: 60, height: 60)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.05), lineWidth: 1)
                    )
                
                AuraIconView(icon: icon, size: 30)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
                
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding(16)
        .background(Color(white: 0.08)) // Dark card bg
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.05), lineWidth: 1)
        )
    }
}

// MARK: - 6. PREVIEWS

struct IconGridPreview: View {
    let columns = [
        GridItem(.adaptive(minimum: 80))
    ]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 30) {
                ForEach(IronCoreIcon.allCases, id: \.self) { icon in
                    VStack {
                        AuraIconView(icon: icon, size: 50)
                        Text(icon.displayName)
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
        }
        .background(Color.black.edgesIgnoringSafeArea(.all))
    }
}

struct DashboardPreview: View {
    var body: some View {
        VStack(spacing: 24) {
            // Quick Log Row
            HStack(spacing: 12) {
                QuickLogButton(icon: .water, label: "Water", value: "+250ml")
                QuickLogButton(icon: .protein, label: "Protein", value: "+30g")
                QuickLogButton(icon: .eggs, label: "Food", value: "Log")
                QuickLogButton(icon: .chicken, label: "Lunch", value: "Quick")
            }
            .padding(.horizontal)
            
            // Feature Cards
            VStack(spacing: 12) {
                FeatureCard(icon: .formCoach, title: "Form Coach", subtitle: "Analyze your squat technique")
                FeatureCard(icon: .brain, title: "AI Insights", subtitle: "Weekly progress summary")
                FeatureCard(icon: .timer, title: "Smart Rest", subtitle: "Optimized for recovery")
            }
            .padding(.horizontal)
            
            Spacer()
        }
        .padding(.top)
        .background(Color(red: 0.05, green: 0.05, blue: 0.05).edgesIgnoringSafeArea(.all))
    }
}

#Preview("All Icons Grid") {
    IconGridPreview()
        .preferredColorScheme(.dark)
}

#Preview("Dashboard Components") {
    DashboardPreview()
        .preferredColorScheme(.dark)
}
