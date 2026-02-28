package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.ironcore.fit.data.model.*
import com.ironcore.fit.data.remote.CloudFunctions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for arena PvP matches, battles, community boss, and tournaments.
 *
 * The new ArenaMatch model (used by Cloud Functions matchmaking) lives
 * alongside the legacy Battle model for backwards compatibility.
 * New features should use ArenaMatch + Cloud Functions; legacy battle
 * methods are kept for existing data.
 */
@Singleton
class ArenaRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
    private val cloudFunctions: CloudFunctions
) {
    private val uid get() = auth.currentUser?.uid
        ?: throw IllegalStateException("Not authenticated")

    // ── Arena Matches (new Cloud Functions-based PvP) ─────────────

    /**
     * Real-time stream of active arena matches the current user is in.
     * Queries both player1Id and player2Id since Firestore does not
     * support OR queries on different fields in a single listener.
     */
    fun activeMatchesFlow(): Flow<List<ArenaMatch>> = callbackFlow {
        val listener1 = db.collection("arenaMatches")
            .whereEqualTo("status", "active")
            .whereEqualTo("player1Id", uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val matches1 = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ArenaMatch::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                // Merge with player2 matches via second query
                val listener2Ref = db.collection("arenaMatches")
                    .whereEqualTo("status", "active")
                    .whereEqualTo("player2Id", uid)
                    .addSnapshotListener { snapshot2, error2 ->
                        if (error2 != null) return@addSnapshotListener
                        val matches2 = snapshot2?.documents?.mapNotNull { doc ->
                            doc.toObject(ArenaMatch::class.java)?.copy(id = doc.id)
                        } ?: emptyList()
                        val combined = (matches1 + matches2).distinctBy { it.id }
                        trySend(combined)
                    }
            }
        awaitClose { listener1.remove() }
    }

    /**
     * Real-time stream of recently completed matches for the user.
     */
    fun matchHistoryFlow(limit: Int = 20): Flow<List<ArenaMatch>> = callbackFlow {
        val listener = db.collection("arenaMatches")
            .whereEqualTo("status", "completed")
            .orderBy("completedAt", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val matches = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ArenaMatch::class.java)?.copy(id = doc.id)
                }?.filter { it.player1Id == uid || it.player2Id == uid }
                    ?: emptyList()
                trySend(matches)
            }
        awaitClose { listener.remove() }
    }

    /** Request matchmaking via Cloud Function. */
    suspend fun findMatch(): Map<String, Any> = cloudFunctions.matchmake()

    /** Submit score for an active arena match. */
    suspend fun submitScore(matchId: String, score: Int): Map<String, Any> =
        cloudFunctions.submitArenaScore(matchId, score)

    // ── Legacy Battles ───────────────────────────────────────────

    fun pendingBattlesFlow(userId: String): Flow<List<Battle>> = callbackFlow {
        val listener = db.collection("battles")
            .whereEqualTo("opponent.userId", userId)
            .whereEqualTo("status", "pending")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Battle::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun getUserBattles(userId: String, status: String? = null): List<Battle> {
        val challengerQuery = db.collection("battles")
            .whereEqualTo("challenger.userId", userId)
        val opponentQuery = db.collection("battles")
            .whereEqualTo("opponent.userId", userId)

        val challengerDocs = if (status != null) {
            challengerQuery.whereEqualTo("status", status).get().await()
        } else {
            challengerQuery.get().await()
        }

        val opponentDocs = if (status != null) {
            opponentQuery.whereEqualTo("status", status).get().await()
        } else {
            opponentQuery.get().await()
        }

        val all = (challengerDocs.documents + opponentDocs.documents).mapNotNull { doc ->
            doc.toObject(Battle::class.java)?.copy(id = doc.id)
        }
        return all.sortedByDescending { it.createdAt }
    }

    suspend fun createBattle(
        challenger: BattlePlayer,
        opponent: BattlePlayer,
        battleType: String = "ranked"
    ): String {
        val battle = Battle(
            challenger = challenger,
            opponent = opponent,
            status = "pending",
            battleType = battleType,
            expiresAt = Timestamp(
                java.util.Date(System.currentTimeMillis() + 24 * 60 * 60 * 1000)
            )
        )
        val ref = db.collection("battles").add(battle).await()
        return ref.id
    }

    suspend fun acceptBattle(battleId: String) {
        db.collection("battles").document(battleId).update(
            mapOf(
                "status" to "active",
                "acceptedAt" to Timestamp.now()
            )
        ).await()
    }

    suspend fun declineBattle(battleId: String) {
        db.collection("battles").document(battleId).update(
            mapOf(
                "status" to "declined",
                "declinedAt" to Timestamp.now()
            )
        ).await()
    }

    suspend fun completeBattle(battleId: String, winnerId: String) {
        db.collection("battles").document(battleId).update(
            mapOf(
                "status" to "completed",
                "winnerId" to winnerId,
                "completedAt" to Timestamp.now()
            )
        ).await()
    }

    // ── Community Boss ────────────────────────────────────────────

    fun bossFlow(): Flow<CommunityBoss?> = callbackFlow {
        val listener = db.collection("community_boss").document("current")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.toObject(CommunityBoss::class.java))
            }
        awaitClose { listener.remove() }
    }

    /** Deal damage to the community boss via Cloud Function. */
    suspend fun dealBossDamage(bossId: String, damage: Int): Map<String, Any> =
        cloudFunctions.dealBossDamage(bossId, damage)

    // ── Tournaments ──────────────────────────────────────────────

    fun activeTournamentFlow(): Flow<Tournament?> = callbackFlow {
        val listener = db.collection("tournaments")
            .whereEqualTo("status", "active")
            .limit(1)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val tournament = snapshot?.documents?.firstOrNull()
                    ?.toObject(Tournament::class.java)
                    ?.let { it.copy(id = snapshot.documents.first().id) }
                trySend(tournament)
            }
        awaitClose { listener.remove() }
    }

    suspend fun joinTournament(tournamentId: String, participant: TournamentParticipant) {
        db.collection("tournaments").document(tournamentId)
            .collection("participants").document(participant.userId)
            .set(participant).await()
        db.collection("tournaments").document(tournamentId)
            .update("participantCount", FieldValue.increment(1)).await()
    }

    fun tournamentLeaderboardFlow(
        tournamentId: String,
        limit: Int = 50
    ): Flow<List<TournamentParticipant>> = callbackFlow {
        val listener = db.collection("tournaments").document(tournamentId)
            .collection("participants")
            .orderBy("score", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(TournamentParticipant::class.java)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }
}
