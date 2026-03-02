package com.ironcore.fit.util

import java.security.MessageDigest
import java.security.SecureRandom

/**
 * IronCore Player Identity — Wordlist, Phrase Generation, Hashing.
 *
 * Exact port of src/utils/playerIdentity.js from the React app.
 * All hashing is SHA-256 so PINs and recovery phrases are
 * cross-platform compatible between React and Android.
 */
object PlayerIdentity {

    // ── 280 themed words for 12-word recovery phrase ──────────────

    val IRONCORE_WORDLIST = listOf(
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
    )

    private val secureRandom = SecureRandom()

    // ── Phrase generation ─────────────────────────────────────────

    /**
     * Generate a 12-word recovery phrase using crypto-secure randomness.
     * Matches React generatePhrase() exactly.
     */
    fun generatePhrase(): String {
        val size = IRONCORE_WORDLIST.size
        return (1..12)
            .map { secureRandom.nextInt(size) }
            .map { IRONCORE_WORDLIST[it] }
            .joinToString(" ")
    }

    // ── Hashing ───────────────────────────────────────────────────

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * SHA-256 hash of a recovery phrase (normalized).
     * Matches React hashPhrase() — lowercase, trimmed, single spaces.
     */
    fun hashPhrase(phrase: String): String {
        val normalized = phrase.lowercase().trim().replace(Regex("\\s+"), " ")
        return sha256(normalized)
    }

    /**
     * SHA-256 hash of a 6-digit PIN string.
     * Matches React hashPin() exactly.
     */
    fun hashPin(pin: String): String = sha256(pin)

    /**
     * Verify a plain-text PIN against a stored SHA-256 hash.
     */
    fun verifyPin(input: String, storedHash: String): Boolean = hashPin(input) == storedHash

    // ── Username validation ───────────────────────────────────────

    data class UsernameValidation(
        val valid: Boolean,
        val error: String? = null,
        val clean: String? = null
    )

    /**
     * Validate username: 3-20 chars, lowercase alphanumeric + underscore,
     * must start with a letter. Matches React validateUsername() exactly.
     */
    fun validateUsername(username: String?): UsernameValidation {
        if (username.isNullOrBlank()) {
            return UsernameValidation(valid = false, error = "Username is required")
        }
        val clean = username.removePrefix("@").lowercase()
        if (clean.length < 3) {
            return UsernameValidation(valid = false, error = "At least 3 characters")
        }
        if (clean.length > 20) {
            return UsernameValidation(valid = false, error = "Max 20 characters")
        }
        if (!Regex("^[a-z][a-z0-9_]*$").matches(clean)) {
            return UsernameValidation(
                valid = false,
                error = "Letters, numbers, underscores only. Must start with a letter."
            )
        }
        return UsernameValidation(valid = true, clean = clean)
    }

    /**
     * Generate a short uppercase fingerprint from a user's UID.
     * Used for display purposes on the Player Card.
     */
    fun generateFingerprint(uid: String): String {
        val hash = hashPin(uid)
        return hash.take(16).uppercase()
    }
}
