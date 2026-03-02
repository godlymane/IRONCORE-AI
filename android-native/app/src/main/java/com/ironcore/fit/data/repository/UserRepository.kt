package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.ironcore.fit.data.model.LeaderboardEntry
import com.ironcore.fit.data.model.UserProfile
import com.ironcore.fit.util.XpCalculator
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore
) {

    // ── Auth state ──────────────────────────────────────────────

    val currentUser: FirebaseUser? get() = auth.currentUser

    fun authStateFlow(): Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    // ── PIN-based auth (matches React PlayerCardView.jsx) ──────

    /**
     * Sign in anonymously — used during account creation flow.
     * The anonymous user is promoted to a full user once they
     * claim a username and set a PIN.
     */
    suspend fun signInAnonymously(): FirebaseUser {
        val result = auth.signInAnonymously().await()
        return result.user!!
    }

    /**
     * Sign in with a Firebase custom token returned by Cloud Functions
     * (loginWithPin or recoverAccount). This is the primary auth method.
     */
    suspend fun signInWithCustomToken(token: String): FirebaseUser {
        val result = auth.signInWithCustomToken(token).await()
        return result.user!!
    }

    // ── Username operations ────────────────────────────────────

    /**
     * Check if a username is available in the `usernames` collection.
     */
    suspend fun isUsernameAvailable(username: String): Boolean {
        val doc = db.collection("usernames").document(username).get().await()
        return !doc.exists()
    }

    /**
     * Claim a username — write to the `usernames/{username}` document.
     * Must be called after signInAnonymously() during account creation.
     */
    suspend fun claimUsername(username: String, uid: String) {
        db.collection("usernames").document(username).set(
            mapOf(
                "uid" to uid,
                "createdAt" to Timestamp.now()
            )
        ).await()
    }

    /**
     * Initialize a new PIN-based user profile.
     * Called during account creation after username is claimed.
     * Matches React: setDoc(doc(db, 'users', uid, 'data', 'profile'), {...}, {merge: true})
     */
    suspend fun initializePinUser(
        uid: String,
        username: String,
        pinHash: String,
        phraseHash: String
    ) {
        val profileData = mapOf(
            "userId" to uid,
            "username" to username,
            "pinHash" to pinHash,
            "phraseHash" to phraseHash,
            "createdAt" to Timestamp.now(),
            "xp" to 0L,
            "level" to 1,
            "currentStreak" to 0,
            "longestStreak" to 0,
            "streakFreezeCount" to 1,
            "isPremium" to false,
            "schemaVersion" to 1,
            "photoURL" to ""
        )

        db.collection("users").document(uid)
            .collection("data").document("profile")
            .set(profileData, SetOptions.merge()).await()

        // Create leaderboard entry
        val leaderboardEntry = mapOf(
            "username" to username,
            "xp" to 0L,
            "level" to 1,
            "league" to "Iron Novice",
            "avatarUrl" to "",
            "photo" to ""
        )
        db.collection("leaderboard").document(uid)
            .set(leaderboardEntry, SetOptions.merge()).await()
    }

    // ── Legacy email/password auth (kept for compatibility) ────

    suspend fun signUpWithEmail(email: String, password: String, displayName: String): FirebaseUser {
        val result = auth.createUserWithEmailAndPassword(email, password).await()
        val user = result.user!!
        val profileUpdates = com.google.firebase.auth.userProfileChangeRequest {
            this.displayName = displayName
        }
        user.updateProfile(profileUpdates).await()
        initializeNewUser(user)
        return user
    }

    suspend fun loginWithEmail(email: String, password: String): FirebaseUser {
        val result = auth.signInWithEmailAndPassword(email, password).await()
        return result.user!!
    }

    suspend fun loginWithGoogleCredential(idToken: String): FirebaseUser {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        val result = auth.signInWithCredential(credential).await()
        val user = result.user!!
        // Initialize profile if first login
        val profileDoc = db.collection("users").document(user.uid)
            .collection("data").document("profile").get().await()
        if (!profileDoc.exists()) {
            initializeNewUser(user)
        }
        return user
    }

    fun logout() = auth.signOut()

    // ── Profile ─────────────────────────────────────────────────

    fun profileFlow(userId: String): Flow<UserProfile?> = callbackFlow {
        val ref = db.collection("users").document(userId)
            .collection("data").document("profile")
        val listener = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            trySend(snapshot?.toObject(UserProfile::class.java))
        }
        awaitClose { listener.remove() }
    }

    suspend fun getProfile(userId: String): UserProfile? {
        val doc = db.collection("users").document(userId)
            .collection("data").document("profile").get().await()
        return doc.toObject(UserProfile::class.java)
    }

    suspend fun updateProfile(userId: String, updates: Map<String, Any>) {
        db.collection("users").document(userId)
            .collection("data").document("profile")
            .update(updates).await()
    }

    // ── XP & Leaderboard ────────────────────────────────────────

    suspend fun awardXP(userId: String, amount: Long, reason: String) {
        val profile = getProfile(userId) ?: return
        val newXp = profile.xp + amount
        val newLevel = XpCalculator.calculateLevel(newXp)

        val profileUpdates = mapOf(
            "xp" to newXp,
            "level" to newLevel
        )
        updateProfile(userId, profileUpdates)

        // Update denormalized leaderboard entry
        db.collection("leaderboard").document(userId)
            .update(
                mapOf(
                    "xp" to newXp,
                    "level" to newLevel,
                    "lastUpdated" to Timestamp.now()
                )
            ).await()
    }

    fun leaderboardFlow(limit: Int = 100): Flow<List<LeaderboardEntry>> = callbackFlow {
        val listener = db.collection("leaderboard")
            .orderBy("xp", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val entries = snapshot?.documents?.mapIndexed { index, doc ->
                    doc.toObject(LeaderboardEntry::class.java)?.copy(
                        id = doc.id,
                        rank = index + 1
                    )
                }?.filterNotNull() ?: emptyList()
                trySend(entries)
            }
        awaitClose { listener.remove() }
    }

    // ── Streak ──────────────────────────────────────────────────

    suspend fun checkAndUpdateStreak(userId: String, workoutDates: List<String>) {
        val profile = getProfile(userId) ?: return
        val today = java.time.LocalDate.now().toString()

        val hasToday = workoutDates.contains(today)
        if (!hasToday) return

        val yesterday = java.time.LocalDate.now().minusDays(1).toString()
        val hadYesterday = workoutDates.contains(yesterday)

        val newStreak = if (hadYesterday) profile.currentStreak + 1 else 1
        val longestStreak = maxOf(profile.longestStreak, newStreak)

        updateProfile(userId, mapOf(
            "currentStreak" to newStreak,
            "longestStreak" to longestStreak,
            "lastStreakUpdateAt" to Timestamp.now()
        ))
    }

    // ── Private ─────────────────────────────────────────────────

    private suspend fun initializeNewUser(user: FirebaseUser) {
        val profile = UserProfile(
            userId = user.uid,
            photoURL = user.photoUrl?.toString() ?: "",
            xp = 0,
            level = 1,
            currentStreak = 0,
            longestStreak = 0,
            streakFreezeCount = 1,
            isPremium = false
        )

        db.collection("users").document(user.uid)
            .collection("data").document("profile")
            .set(profile, SetOptions.merge()).await()

        // Create leaderboard entry
        val leaderboardEntry = LeaderboardEntry(
            id = user.uid,
            username = user.displayName ?: "Recruit",
            xp = 0,
            level = 1,
            league = "Iron Novice",
            avatarUrl = user.photoUrl?.toString() ?: "",
            photo = user.photoUrl?.toString() ?: ""
        )
        db.collection("leaderboard").document(user.uid)
            .set(leaderboardEntry, SetOptions.merge()).await()
    }
}
