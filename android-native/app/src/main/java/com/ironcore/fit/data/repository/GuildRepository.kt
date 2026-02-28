package com.ironcore.fit.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.ironcore.fit.data.model.Guild
import com.ironcore.fit.data.remote.CloudFunctions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for guild (team) features.
 *
 * Firestore path: guilds/{guildId}
 *
 * Guild create/join/leave operations are handled server-side via
 * Cloud Functions to maintain data integrity (member counts, XP, etc).
 * Read operations use direct Firestore listeners for real-time updates.
 */
@Singleton
class GuildRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
    private val cloudFunctions: CloudFunctions
) {

    /**
     * Real-time stream of a single guild by ID.
     * Returns null if the guild doesn't exist.
     */
    fun guildFlow(guildId: String): Flow<Guild?> = callbackFlow {
        val listener = db.collection("guilds").document(guildId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.toObject(Guild::class.java)?.copy(id = snapshot.id))
            }
        awaitClose { listener.remove() }
    }

    /**
     * Real-time stream of top guilds ranked by total XP.
     * Used for the guild leaderboard / discovery screen.
     */
    fun topGuildsFlow(limit: Int = 20): Flow<List<Guild>> = callbackFlow {
        val listener = db.collection("guilds")
            .orderBy("totalXP", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val guilds = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Guild::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(guilds)
            }
        awaitClose { listener.remove() }
    }

    /**
     * Create a new guild via Cloud Function.
     * The server handles setting the owner, initializing member list, etc.
     */
    suspend fun createGuild(name: String, description: String): Map<String, Any> =
        cloudFunctions.createGuild(name, description)

    /**
     * Join an existing guild via Cloud Function.
     * The server validates capacity and updates member counts atomically.
     */
    suspend fun joinGuild(guildId: String): Map<String, Any> =
        cloudFunctions.joinGuild(guildId)

    /**
     * Leave a guild via Cloud Function.
     * The server handles ownership transfer if the leaving user is the owner.
     */
    suspend fun leaveGuild(guildId: String): Map<String, Any> =
        cloudFunctions.leaveGuild(guildId)
}
