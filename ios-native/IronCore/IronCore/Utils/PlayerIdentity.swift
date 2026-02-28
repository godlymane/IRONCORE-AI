import Foundation
import CryptoKit

/// IronCore Player Identity — Wordlist, Phrase Generation, Hashing
/// Port of src/utils/playerIdentity.js

enum PlayerIdentity {
    // ~280 themed words for 12-word recovery phrase generation
    static let wordlist: [String] = [
        // Power (40)
        "iron", "steel", "forge", "titan", "apex", "blade", "thunder", "storm",
        "fury", "rage", "wrath", "valor", "might", "force", "power", "strike",
        "crush", "smash", "break", "shatter", "conquer", "dominate", "reign",
        "surge", "charge", "blast", "impact", "havoc", "chaos", "rebel",
        "savage", "brutal", "fierce", "wild", "primal", "raw", "core",
        "prime", "ultra", "omega",
        // Fitness (40)
        "squat", "deadlift", "bench", "curl", "press", "flex", "pump",
        "grind", "rep", "set", "max", "lift", "pull", "push", "sprint",
        "endure", "recover", "gains", "bulk", "shred", "lean", "ripped",
        "beast", "warrior", "champion", "athlete", "legend", "muscle",
        "sweat", "hustle", "drive", "focus", "grit", "resolve", "peak",
        "summit", "climb", "rise", "ascend", "evolve",
        // Gaming (40)
        "arena", "shield", "quest", "raid", "guild", "loot", "boss",
        "level", "rank", "elite", "mythic", "epic", "rare", "master",
        "rogue", "knight", "mage", "scout", "hunter", "sniper", "tank",
        "healer", "spawn", "combo", "crit", "dodge", "parry", "block",
        "counter", "flank", "siege", "clash", "duel", "bounty", "trophy",
        "crown", "throne", "castle", "fortress", "bastion",
        // Elements (40)
        "ember", "frost", "shadow", "flame", "spark", "crystal", "void",
        "pulse", "bolt", "flash", "blaze", "inferno", "glacier", "torrent",
        "quake", "tremor", "vortex", "cyclone", "typhoon", "eclipse",
        "nova", "comet", "meteor", "solar", "lunar", "astral", "cosmic",
        "plasma", "photon", "neon", "chrome", "obsidian", "onyx", "cobalt",
        "titanium", "carbon", "granite", "magma", "vapor", "aether",
        // Military (40)
        "delta", "bravo", "alpha", "sigma", "viper", "falcon",
        "eagle", "hawk", "wolf", "cobra", "panther", "lion", "bear",
        "raptor", "phoenix", "dragon", "hydra", "kraken", "golem",
        "sentinel", "guardian", "warden", "marshal", "general", "captain",
        "major", "colonel", "legion", "brigade", "squad", "platoon",
        "recon", "stealth", "tactical", "ballistic", "kinetic", "vector",
        "cipher", "protocol", "outpost", "bunker",
        // Tech (40)
        "binary", "matrix", "nexus", "quantum", "neural", "synth", "cyber",
        "nano", "turbo", "nitro", "rocket", "missile", "orbital", "hyper",
        "sonic", "warp", "rift", "portal", "beacon", "signal", "relay",
        "anchor", "vertex", "prism", "zenith", "horizon", "genesis",
        "catalyst", "fusion", "reactor", "dynamo", "piston", "torque",
        "voltage", "circuit", "grid", "sector", "module", "system", "deploy",
        // Nature (40)
        "stone", "river", "mountain", "ocean", "desert", "jungle", "ridge",
        "canyon", "cliff", "timber", "cedar", "oak", "pine",
        "thorn", "fang", "claw", "talon", "horn", "tusk", "scale",
        "venom", "sting", "prowl", "stalk", "hunt", "prey", "pack",
        "herd", "swarm", "den", "lair", "nest", "burrow",
        "vale", "marsh", "dune", "crater", "trench", "gorge", "spire"
    ]

    /// Generate a 12-word recovery phrase using crypto-secure randomness.
    static func generatePhrase() -> String {
        var bytes = [UInt8](repeating: 0, count: 48) // 4 bytes per word * 12
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)

        var words: [String] = []
        for i in 0..<12 {
            let offset = i * 4
            let value = UInt32(bytes[offset]) |
                        (UInt32(bytes[offset + 1]) << 8) |
                        (UInt32(bytes[offset + 2]) << 16) |
                        (UInt32(bytes[offset + 3]) << 24)
            words.append(wordlist[Int(value) % wordlist.count])
        }
        return words.joined(separator: " ")
    }

    /// SHA-256 hash of a recovery phrase (normalized).
    static func hashPhrase(_ phrase: String) -> String {
        let normalized = phrase.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: .whitespaces).filter { !$0.isEmpty }.joined(separator: " ")
        let data = Data(normalized.utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// SHA-256 hash of a 6-digit PIN.
    static func hashPin(_ pin: String) -> String {
        let data = Data(pin.utf8)
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    /// Validate username: 3-20 chars, lowercase alphanumeric + underscore, starts with letter.
    static func validateUsername(_ username: String) -> (valid: Bool, clean: String, error: String?) {
        let clean = username.hasPrefix("@") ? String(username.dropFirst()).lowercased() : username.lowercased()

        if clean.count < 3 {
            return (false, clean, "At least 3 characters")
        }
        if clean.count > 20 {
            return (false, clean, "Max 20 characters")
        }

        let pattern = "^[a-z][a-z0-9_]*$"
        guard clean.range(of: pattern, options: .regularExpression) != nil else {
            return (false, clean, "Letters, numbers, underscores only. Must start with a letter.")
        }

        return (true, clean, nil)
    }
}
