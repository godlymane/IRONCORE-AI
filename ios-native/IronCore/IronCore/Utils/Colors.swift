import SwiftUI

extension Color {
    // IronCore brand colors — canonical palette
    static let ironRed = Color(red: 220/255, green: 38/255, blue: 38/255)       // #dc2626
    static let ironRedLight = Color(red: 239/255, green: 68/255, blue: 68/255)  // #ef4444
    static let ironRedExtra = Color(red: 248/255, green: 113/255, blue: 113/255) // #f87171
    static let ironRedDark = Color(red: 185/255, green: 28/255, blue: 28/255)   // #b91c1c
    static let ironRedDeep = Color(red: 153/255, green: 27/255, blue: 27/255)   // #991b1b

    // Glass UI colors
    static let glassWhite = Color.white.opacity(0.05)
    static let glassBorder = Color.white.opacity(0.08)
    static let glassHighlight = Color.white.opacity(0.1)

    // Text
    static let textSecondary = Color(red: 156/255, green: 163/255, blue: 175/255) // gray-400
    static let textTertiary = Color(red: 107/255, green: 114/255, blue: 128/255)  // gray-500
}

extension LinearGradient {
    static let ironGradient = LinearGradient(
        colors: [.ironRed, .ironRedLight],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let glassGradient = LinearGradient(
        colors: [Color.white.opacity(0.06), Color.white.opacity(0.02)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
