import Foundation

// MARK: - XP & Level Calculations (must match React helpers.js + arenaService.js)

/// Calculate user level from total XP
/// Formula: Level N needs 100*N XP to advance
/// Level 1→2: 100 XP, Level 2→3: 300 total, Level 3→4: 600 total, etc.
func calculateLevel(xp: Int) -> Int {
    var level = 1
    var threshold = 0
    while true {
        threshold += 100 * level
        if xp < threshold { break }
        level += 1
    }
    return level
}

/// Get progress toward next level
func getLevelProgress(xp: Int) -> (currentLevelXP: Int, xpForNextLevel: Int, progress: Double) {
    let level = calculateLevel(xp: xp)
    var xpAtLevelStart = 0
    for i in 1..<level {
        xpAtLevelStart += 100 * i
    }
    let xpNeeded = 100 * level
    let currentLevelXP = xp - xpAtLevelStart
    let progress = Double(currentLevelXP) / Double(xpNeeded) * 100.0
    return (currentLevelXP, xpNeeded, min(progress, 100))
}

/// Get league name from XP (must match React LEVELS array)
func getLeague(xp: Int) -> String {
    var league = LEVELS[0].name
    for tier in LEVELS {
        if xp >= tier.minXP {
            league = tier.name
        }
    }
    return league
}

// MARK: - BMI Calculation

func calculateBMI(weightKg: Double, heightCm: Double) -> Double {
    guard heightCm > 0 else { return 0 }
    let heightM = heightCm / 100.0
    return weightKg / (heightM * heightM)
}

// MARK: - Input Sanitization (must match React validation)

func sanitizeText(_ text: String, maxLength: Int) -> String {
    String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(maxLength))
}

// MARK: - Date Helpers

func todayDateString() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: Date())
}

func iso8601String(from date: Date = Date()) -> String {
    ISO8601DateFormatter().string(from: date)
}

func dateFromISO8601(_ string: String) -> Date? {
    ISO8601DateFormatter().date(from: string)
}

// MARK: - DiceBear Avatar URL

func defaultAvatarURL(seed: String) -> String {
    "https://api.dicebear.com/7.x/avataaars/svg?seed=\(seed)"
}
