package com.ironcore.fit.util

import java.security.MessageDigest

/**
 * SHA-256 based PIN hashing and identity utilities.
 *
 * Used by the Player Card feature — users set a 4-digit PIN
 * that is hashed before storage in Firestore. The same hashing
 * logic exists in the React app so PINs are cross-platform.
 */
object PlayerIdentity {

    /**
     * Hash a PIN string using SHA-256 and return the hex digest.
     */
    fun hashPin(pin: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(pin.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Verify a plain-text PIN against a stored SHA-256 hash.
     */
    fun verifyPin(input: String, storedHash: String): Boolean {
        return hashPin(input) == storedHash
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
