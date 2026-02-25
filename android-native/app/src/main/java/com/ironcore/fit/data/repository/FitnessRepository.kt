package com.ironcore.fit.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import com.ironcore.fit.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FitnessRepository @Inject constructor(
    private val db: FirebaseFirestore,
    private val storage: FirebaseStorage
) {

    // ── Workouts ────────────────────────────────────────────────

    fun workoutsFlow(userId: String): Flow<List<Workout>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("workouts")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Workout::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun addWorkout(userId: String, workout: Workout): String {
        val ref = db.collection("users").document(userId)
            .collection("workouts").add(workout).await()
        return ref.id
    }

    suspend fun deleteWorkout(userId: String, workoutId: String) {
        db.collection("users").document(userId)
            .collection("workouts").document(workoutId).delete().await()
    }

    /** Total volume = sum(w * r) for all sets across all exercises. */
    fun calculateVolume(workout: Workout): Long {
        return workout.exercises.sumOf { exercise ->
            exercise.sets.sumOf { set -> (set.w * set.r).toLong() }
        }
    }

    // ── Meals ───────────────────────────────────────────────────

    fun mealsFlow(userId: String): Flow<List<Meal>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("meals")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Meal::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun addMeal(userId: String, meal: Meal): String {
        val ref = db.collection("users").document(userId)
            .collection("meals").add(meal).await()
        return ref.id
    }

    suspend fun deleteMeal(userId: String, mealId: String) {
        db.collection("users").document(userId)
            .collection("meals").document(mealId).delete().await()
    }

    // ── Burned Calories ─────────────────────────────────────────

    fun burnedFlow(userId: String): Flow<List<BurnedEntry>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("burned")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(BurnedEntry::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun addBurnedEntry(userId: String, entry: BurnedEntry): String {
        val ref = db.collection("users").document(userId)
            .collection("burned").add(entry).await()
        return ref.id
    }

    // ── Progress ────────────────────────────────────────────────

    fun progressFlow(userId: String): Flow<List<ProgressEntry>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("progress")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ProgressEntry::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun addProgress(userId: String, entry: ProgressEntry): String {
        val ref = db.collection("users").document(userId)
            .collection("progress").add(entry).await()
        return ref.id
    }

    // ── Photos ──────────────────────────────────────────────────

    fun photosFlow(userId: String): Flow<List<ProgressPhoto>> = callbackFlow {
        val listener = db.collection("users").document(userId)
            .collection("photos")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val items = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ProgressPhoto::class.java)?.copy(id = doc.id)
                } ?: emptyList()
                trySend(items)
            }
        awaitClose { listener.remove() }
    }

    suspend fun uploadPhoto(
        userId: String,
        imageBytes: ByteArray,
        note: String,
        type: String
    ): ProgressPhoto {
        val filename = "progress/${userId}/${System.currentTimeMillis()}.jpg"
        val ref = storage.reference.child(filename)
        ref.putBytes(imageBytes).await()
        val url = ref.downloadUrl.await().toString()

        val photo = ProgressPhoto(
            url = url,
            storagePath = filename,
            note = note,
            type = type,
            date = java.time.LocalDate.now().toString()
        )
        val docRef = db.collection("users").document(userId)
            .collection("photos").add(photo).await()

        return photo.copy(id = docRef.id)
    }

    suspend fun deletePhoto(userId: String, photoId: String, storagePath: String) {
        db.collection("users").document(userId)
            .collection("photos").document(photoId).delete().await()
        if (storagePath.isNotEmpty()) {
            storage.reference.child(storagePath).delete().await()
        }
    }

    // ── Templates ───────────────────────────────────────────────

    suspend fun getTemplates(userId: String): List<WorkoutTemplate> {
        val snapshot = db.collection("workoutTemplates")
            .whereEqualTo("userId", userId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get().await()
        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(WorkoutTemplate::class.java)?.copy(id = doc.id)
        }
    }

    suspend fun saveTemplate(template: WorkoutTemplate): String {
        val ref = db.collection("workoutTemplates").add(template).await()
        return ref.id
    }
}
