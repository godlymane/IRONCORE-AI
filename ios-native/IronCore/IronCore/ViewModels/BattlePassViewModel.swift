import Foundation

/// Battle Pass System — seasonal progression with free + premium reward tiers.
/// Mirrors BattlePass.jsx + BattlePassView.jsx from React prototype.
/// 30-tier system, 1000 XP per tier, resets each season.
@MainActor
final class BattlePassViewModel: ObservableObject {

    // MARK: - Published State

    @Published var currentTier: Int = 1
    @Published var currentXP: Int = 0
    @Published var claimedFreeRewards: Set<Int> = []
    @Published var claimedPremiumRewards: Set<Int> = []
    @Published var seasonEndDate: Date

    static let xpPerTier = 1000
    static let maxTier = 30

    // MARK: - Init

    init() {
        // Season ends 30 days from now (placeholder — real seasons would be server-driven)
        seasonEndDate = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
        loadProgress()
    }

    // MARK: - Computed

    var xpInTier: Int { currentXP % Self.xpPerTier }
    var xpProgress: Double { Double(xpInTier) / Double(Self.xpPerTier) }
    var totalXPEarned: Int { ((currentTier - 1) * Self.xpPerTier) + xpInTier }

    var seasonTimeRemaining: String {
        let interval = seasonEndDate.timeIntervalSince(Date())
        guard interval > 0 else { return "Season Ended" }
        let days = Int(interval) / 86400
        let hours = (Int(interval) % 86400) / 3600
        return "\(days)d \(hours)h"
    }

    // MARK: - Reward Definitions (matches React BattlePassView.jsx)

    struct BattlePassReward: Identifiable {
        let id: Int // tier number
        let freeReward: Reward
        let premiumReward: Reward
    }

    struct Reward {
        let name: String
        let type: RewardType
        let icon: String
        let value: String // e.g. "50" for XP, "2x" for boost

        enum RewardType: String {
            case xp, xpBoost, template, badge, theme, border, voicePack, effect
        }
    }

    static let rewards: [BattlePassReward] = [
        BattlePassReward(id: 1,
            freeReward: Reward(name: "50 Bonus XP", type: .xp, icon: "star.fill", value: "50"),
            premiumReward: Reward(name: "Crimson Night Theme", type: .theme, icon: "paintbrush.fill", value: "crimson_night")),
        BattlePassReward(id: 2,
            freeReward: Reward(name: "Push Template", type: .template, icon: "doc.fill", value: "push"),
            premiumReward: Reward(name: "Steel Border", type: .border, icon: "square.dashed", value: "steel")),
        BattlePassReward(id: 3,
            freeReward: Reward(name: "100 Bonus XP", type: .xp, icon: "star.fill", value: "100"),
            premiumReward: Reward(name: "Ember Glow Effect", type: .effect, icon: "sparkles", value: "ember_glow")),
        BattlePassReward(id: 4,
            freeReward: Reward(name: "2x XP Boost (1h)", type: .xpBoost, icon: "bolt.fill", value: "2x"),
            premiumReward: Reward(name: "Drill Sergeant Voice", type: .voicePack, icon: "speaker.wave.3.fill", value: "drill_sergeant")),
        BattlePassReward(id: 5,
            freeReward: Reward(name: "Shield Badge", type: .badge, icon: "shield.fill", value: "shield"),
            premiumReward: Reward(name: "Pulse Red Theme", type: .theme, icon: "paintbrush.fill", value: "pulse_red")),
        BattlePassReward(id: 6,
            freeReward: Reward(name: "Pull Template", type: .template, icon: "doc.fill", value: "pull"),
            premiumReward: Reward(name: "Flame Border", type: .border, icon: "flame.fill", value: "flame")),
        BattlePassReward(id: 7,
            freeReward: Reward(name: "150 Bonus XP", type: .xp, icon: "star.fill", value: "150"),
            premiumReward: Reward(name: "Lightning Pulse Effect", type: .effect, icon: "bolt.fill", value: "lightning_pulse")),
        BattlePassReward(id: 8,
            freeReward: Reward(name: "Warrior Badge", type: .badge, icon: "shield.lefthalf.filled", value: "warrior"),
            premiumReward: Reward(name: "Zen Master Voice", type: .voicePack, icon: "speaker.wave.3.fill", value: "zen_master")),
        BattlePassReward(id: 9,
            freeReward: Reward(name: "Leg Template", type: .template, icon: "doc.fill", value: "legs"),
            premiumReward: Reward(name: "Midnight Blue Theme", type: .theme, icon: "paintbrush.fill", value: "midnight_blue")),
        BattlePassReward(id: 10,
            freeReward: Reward(name: "3x XP Boost (1h)", type: .xpBoost, icon: "bolt.fill", value: "3x"),
            premiumReward: Reward(name: "Circuit Border", type: .border, icon: "cpu", value: "circuit")),
        BattlePassReward(id: 11,
            freeReward: Reward(name: "200 Bonus XP", type: .xp, icon: "star.fill", value: "200"),
            premiumReward: Reward(name: "Aurora Borealis Effect", type: .effect, icon: "sparkles", value: "aurora")),
        BattlePassReward(id: 12,
            freeReward: Reward(name: "Full Body Template", type: .template, icon: "doc.fill", value: "full_body"),
            premiumReward: Reward(name: "Battle Commander Voice", type: .voicePack, icon: "speaker.wave.3.fill", value: "battle_commander")),
        BattlePassReward(id: 13,
            freeReward: Reward(name: "Crown Badge", type: .badge, icon: "crown.fill", value: "crown"),
            premiumReward: Reward(name: "Gold Rush Theme", type: .theme, icon: "paintbrush.fill", value: "gold_rush")),
        BattlePassReward(id: 14,
            freeReward: Reward(name: "250 Bonus XP", type: .xp, icon: "star.fill", value: "250"),
            premiumReward: Reward(name: "Holographic Border", type: .border, icon: "square.dashed", value: "holographic")),
        BattlePassReward(id: 15,
            freeReward: Reward(name: "4x XP Boost (2h)", type: .xpBoost, icon: "bolt.fill", value: "4x"),
            premiumReward: Reward(name: "Cosmic Void Effect", type: .effect, icon: "sparkles", value: "cosmic_void")),
        BattlePassReward(id: 16,
            freeReward: Reward(name: "Upper-Lower Template", type: .template, icon: "doc.fill", value: "upper_lower"),
            premiumReward: Reward(name: "Neon Surge Theme", type: .theme, icon: "paintbrush.fill", value: "neon_surge")),
        BattlePassReward(id: 17,
            freeReward: Reward(name: "300 Bonus XP", type: .xp, icon: "star.fill", value: "300"),
            premiumReward: Reward(name: "Lightning Border", type: .border, icon: "bolt.fill", value: "lightning")),
        BattlePassReward(id: 18,
            freeReward: Reward(name: "War Machine Badge", type: .badge, icon: "shield.checkered", value: "war_machine"),
            premiumReward: Reward(name: "Spartan General Voice", type: .voicePack, icon: "speaker.wave.3.fill", value: "spartan_general")),
        BattlePassReward(id: 19,
            freeReward: Reward(name: "PPL Template", type: .template, icon: "doc.fill", value: "ppl"),
            premiumReward: Reward(name: "Inferno Theme", type: .theme, icon: "paintbrush.fill", value: "inferno")),
        BattlePassReward(id: 20,
            freeReward: Reward(name: "5x XP Boost (2h)", type: .xpBoost, icon: "bolt.fill", value: "5x"),
            premiumReward: Reward(name: "Dragon Border", type: .border, icon: "flame.fill", value: "dragon")),
        BattlePassReward(id: 21,
            freeReward: Reward(name: "400 Bonus XP", type: .xp, icon: "star.fill", value: "400"),
            premiumReward: Reward(name: "Cyber Wave Effect", type: .effect, icon: "sparkles", value: "cyber_wave")),
        BattlePassReward(id: 22,
            freeReward: Reward(name: "HIIT Template", type: .template, icon: "doc.fill", value: "hiit"),
            premiumReward: Reward(name: "Obsidian Theme", type: .theme, icon: "paintbrush.fill", value: "obsidian")),
        BattlePassReward(id: 23,
            freeReward: Reward(name: "Legendary Badge", type: .badge, icon: "star.circle.fill", value: "legendary"),
            premiumReward: Reward(name: "Plasma Border", type: .border, icon: "square.dashed", value: "plasma")),
        BattlePassReward(id: 24,
            freeReward: Reward(name: "500 Bonus XP", type: .xp, icon: "star.fill", value: "500"),
            premiumReward: Reward(name: "Phoenix Effect", type: .effect, icon: "sparkles", value: "phoenix")),
        BattlePassReward(id: 25,
            freeReward: Reward(name: "Custom Split Template", type: .template, icon: "doc.fill", value: "custom_split"),
            premiumReward: Reward(name: "Void Walker Theme", type: .theme, icon: "paintbrush.fill", value: "void_walker")),
        BattlePassReward(id: 26,
            freeReward: Reward(name: "600 Bonus XP", type: .xp, icon: "star.fill", value: "600"),
            premiumReward: Reward(name: "Titan Voice", type: .voicePack, icon: "speaker.wave.3.fill", value: "titan")),
        BattlePassReward(id: 27,
            freeReward: Reward(name: "Diamond Badge", type: .badge, icon: "diamond.fill", value: "diamond"),
            premiumReward: Reward(name: "Supernova Border", type: .border, icon: "sparkle", value: "supernova")),
        BattlePassReward(id: 28,
            freeReward: Reward(name: "750 Bonus XP", type: .xp, icon: "star.fill", value: "750"),
            premiumReward: Reward(name: "Dark Matter Effect", type: .effect, icon: "sparkles", value: "dark_matter")),
        BattlePassReward(id: 29,
            freeReward: Reward(name: "Powerlifting Template", type: .template, icon: "doc.fill", value: "powerlifting"),
            premiumReward: Reward(name: "Legendary Aura", type: .effect, icon: "sparkles", value: "legendary_aura")),
        BattlePassReward(id: 30,
            freeReward: Reward(name: "1000 Bonus XP", type: .xp, icon: "star.fill", value: "1000"),
            premiumReward: Reward(name: "IRONCORE ELITE Title", type: .badge, icon: "crown.fill", value: "elite_title")),
    ]

    // MARK: - Add XP

    func addXP(_ amount: Int) {
        currentXP += amount
        while currentXP >= Self.xpPerTier && currentTier < Self.maxTier {
            currentXP -= Self.xpPerTier
            currentTier += 1
        }
        if currentTier >= Self.maxTier {
            currentXP = min(currentXP, Self.xpPerTier)
        }
        saveProgress()
    }

    // MARK: - Claim Rewards

    func claimFreeReward(tier: Int) {
        guard tier <= currentTier, !claimedFreeRewards.contains(tier) else { return }
        claimedFreeRewards.insert(tier)

        // Apply XP rewards
        if let reward = Self.rewards.first(where: { $0.id == tier }) {
            if reward.freeReward.type == .xp, let xp = Int(reward.freeReward.value) {
                addXP(xp)
            }
        }
        saveProgress()
    }

    func claimPremiumReward(tier: Int, isPremium: Bool) {
        guard isPremium, tier <= currentTier, !claimedPremiumRewards.contains(tier) else { return }
        claimedPremiumRewards.insert(tier)
        saveProgress()
    }

    // MARK: - Reward State

    func tierState(_ tier: Int) -> TierState {
        if tier <= currentTier { return .unlocked }
        if tier == currentTier + 1 { return .current }
        return .locked
    }

    enum TierState {
        case unlocked, current, locked
    }

    // MARK: - Persistence (UserDefaults for now — Firestore in production)

    private func saveProgress() {
        UserDefaults.standard.set(currentTier, forKey: "bp_tier")
        UserDefaults.standard.set(currentXP, forKey: "bp_xp")
        UserDefaults.standard.set(Array(claimedFreeRewards), forKey: "bp_free_claimed")
        UserDefaults.standard.set(Array(claimedPremiumRewards), forKey: "bp_premium_claimed")
    }

    private func loadProgress() {
        currentTier = max(1, UserDefaults.standard.integer(forKey: "bp_tier"))
        currentXP = UserDefaults.standard.integer(forKey: "bp_xp")
        if let free = UserDefaults.standard.array(forKey: "bp_free_claimed") as? [Int] {
            claimedFreeRewards = Set(free)
        }
        if let premium = UserDefaults.standard.array(forKey: "bp_premium_claimed") as? [Int] {
            claimedPremiumRewards = Set(premium)
        }
    }
}
