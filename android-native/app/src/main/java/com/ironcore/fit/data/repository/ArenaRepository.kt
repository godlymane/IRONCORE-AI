package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.ironcore.fit.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ArenaRepository @Inject constructor(
    private val db: FirebaseFirestore
) {

    // ── Battles ─────────────────────────────────────────────────

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
        // Get battles where user is challenger
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

    // ── Community Boss ──────────────────────────────────────────

    fun bossFlow(): Flow<CommunityBoss?> = callbackFlow {
        val listener = db.collection("community_boss").document("current")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.toObject(CommunityBoss::class.java))
            }
        awaitClose { listener.remove() }
    }

    suspend fun dealBossDamage(userId: String, username: String, damage: Long) {
        val bossRef = db.collection("community_boss").document("current")
        db.runTransaction { transaction ->
            val boss = transaction.get(bossRef).toObject(CommunityBoss::class.java)
                ?: return@runTransaction

            val newHP = maxOf(0, boss.currentHP - damage)
            val existingContributor = boss.contributors.find { it.userId == userId }

            val updatedContributors = if (existingContributor != null) {
                boss.contributors.map {
                    if (it.userId == userId) it.copy(damageDealt = it.damageDealt + damage)
                    else it
                }
            } else {
                boss.contributors + BossContributor(
                    userId = userId,
                    username = username,
                    damageDealt = damage,
                    joinedAt = java.time.Instant.now().toString()
                )
            }

            val updates = mutableMapOf<String, Any>(
                "currentHP" to newHP,
                "contributors" to updatedContributors,
                "lastDamageAt" to Timestamp.now()
            )
            if (newHP <= 0) {
                updates["status"] = "defeated"
                updates["defeatedAt"] = Timestamp.now()
            }
            transaction.update(bossRef, updates)
        }.await()
    }

    // ── Tournaments ─────────────────────────────────────────────

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
