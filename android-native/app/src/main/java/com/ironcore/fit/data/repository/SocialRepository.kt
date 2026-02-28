package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
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
class SocialRepository @Inject constructor(
    private val db: FirebaseFirestore
) {

    // ── Global Chat ─────────────────────────────────────────────

    fun chatFlow(limit: Int = 50): Flow<List<ChatMessage>> = callbackFlow {
        val listener = db.collection("global").document("data")
            .collection("chat")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .limitToLast(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ChatMessage::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun sendChatMessage(message: ChatMessage) {
        db.collection("global").document("data")
            .collection("chat").add(message).await()
    }

    // ── Posts ────────────────────────────────────────────────────

    fun postsFlow(limit: Int = 20): Flow<List<Post>> = callbackFlow {
        val listener = db.collection("global").document("data")
            .collection("posts")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Post::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun createPost(post: Post) {
        db.collection("global").document("data")
            .collection("posts").add(post).await()
    }

    // ── Activity Feed ───────────────────────────────────────────

    fun feedFlow(limit: Int = 30): Flow<List<FeedEvent>> = callbackFlow {
        val listener = db.collection("global").document("data")
            .collection("feed")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(FeedEvent::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun broadcastEvent(event: FeedEvent) {
        db.collection("global").document("data")
            .collection("feed").add(event).await()
    }

    // ── Guilds ──────────────────────────────────────────────────

    fun guildFlow(guildId: String): Flow<Guild?> = callbackFlow {
        val listener = db.collection("guilds").document(guildId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.toObject(Guild::class.java)?.copy(id = snapshot.id))
            }
        awaitClose { listener.remove() }
    }

    suspend fun getGuilds(limit: Int = 20): List<Guild> {
        val snapshot = db.collection("guilds")
            .orderBy("totalXP", Query.Direction.DESCENDING)
            .limit(limit.toLong())
            .get().await()
        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(Guild::class.java)?.copy(id = doc.id)
        }
    }

    suspend fun createGuild(guild: Guild): String {
        val ref = db.collection("guilds").add(guild).await()
        return ref.id
    }

    suspend fun joinGuild(guildId: String, memberId: String) {
        val guildRef = db.collection("guilds").document(guildId)
        db.runTransaction { transaction ->
            val guild = transaction.get(guildRef).toObject(Guild::class.java) ?: return@runTransaction
            if (guild.memberCount >= guild.maxMembers) return@runTransaction
            transaction.update(guildRef, mapOf(
                "members" to guild.members + memberId,
                "memberCount" to guild.memberCount + 1
            ))
        }.await()
    }

    suspend fun leaveGuild(guildId: String, userId: String) {
        val guildRef = db.collection("guilds").document(guildId)
        db.runTransaction { transaction ->
            val guild = transaction.get(guildRef).toObject(Guild::class.java) ?: return@runTransaction
            transaction.update(guildRef, mapOf(
                "members" to guild.members.filter { it != userId },
                "memberCount" to maxOf(0, guild.memberCount - 1)
            ))
        }.await()
    }

    fun guildChatFlow(guildId: String, limit: Int = 50): Flow<List<ChatMessage>> = callbackFlow {
        val listener = db.collection("guilds").document(guildId)
            .collection("chat")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .limitToLast(limit.toLong())
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ChatMessage::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun sendGuildMessage(guildId: String, message: ChatMessage) {
        db.collection("guilds").document(guildId)
            .collection("chat").add(message).await()
    }

    // ── Inbox / DMs ─────────────────────────────────────────────

    fun inboxFlow(userId: String): Flow<List<InboxMessage>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("inbox")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(InboxMessage::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun sendPrivateMessage(targetUserId: String, message: InboxMessage) {
        db.collection("users").document(targetUserId)
            .collection("inbox").add(message).await()
    }

    suspend fun markMessageRead(userId: String, messageId: String) {
        db.collection("users").document(userId)
            .collection("inbox").document(messageId)
            .update("read", true).await()
    }

    // ── Following ───────────────────────────────────────────────

    fun followingFlow(userId: String): Flow<List<Following>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("following")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Following::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun toggleFollow(userId: String, targetUserId: String) {
        val ref = db.collection("users").document(userId)
            .collection("following").document(targetUserId)
        val exists = ref.get().await().exists()
        if (exists) {
            ref.delete().await()
        } else {
            ref.set(Following(id = targetUserId, followedAt = Timestamp.now())).await()
        }
    }

    // ── Notifications ───────────────────────────────────────────

    fun notificationsFlow(userId: String): Flow<List<Notification>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("notifications")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Notification::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun markNotificationRead(userId: String, notificationId: String) {
        db.collection("users").document(userId)
            .collection("notifications").document(notificationId)
            .update("read", true).await()
    }
}
