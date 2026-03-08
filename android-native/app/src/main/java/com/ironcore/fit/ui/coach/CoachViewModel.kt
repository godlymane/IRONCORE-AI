package com.ironcore.fit.ui.coach

import androidx.lifecycle.ViewModel
import com.google.mlkit.vision.pose.Pose
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

// ══════════════════════════════════════════════════════════════════
// CoachViewModel — Full state for AI Form Correction screen
//
// Manages: dual-tab selection, camera state, exercise selection,
// form analysis results, rep counting, coach chat messages,
// and all HUD display data.
// ══════════════════════════════════════════════════════════════════

/** Coach tab selection */
enum class CoachTab { CAMERA, CHAT }

/** Chat message model */
data class ChatMessage(
    val id: String = System.currentTimeMillis().toString(),
    val text: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)

data class CoachUiState(
    // Tab
    val selectedTab: CoachTab = CoachTab.CAMERA,

    // Camera
    val hasCameraPermission: Boolean = false,
    val useFrontCamera: Boolean = true,
    val currentPose: Pose? = null,
    val imageWidth: Int = 0,
    val imageHeight: Int = 0,
    val isDetecting: Boolean = false,
    val errorMessage: String? = null,
    val landmarkCount: Int = 0,

    // Exercise
    val selectedExerciseIndex: Int = 0,

    // Form Analysis
    val formScore: Int = 0,
    val repCount: Int = 0,
    val checkpoints: List<CheckpointResult> = emptyList(),
    val coachingTip: String? = null,
    val jointQualities: Map<Int, JointQuality> = emptyMap(),

    // Chat
    val chatMessages: List<ChatMessage> = listOf(
        ChatMessage(
            id = "welcome",
            text = "Welcome to IronCore AI Coach! Select an exercise and I'll analyze your form in real-time. Ask me anything about training.",
            isUser = false
        )
    ),
    val chatInput: String = ""
)

@HiltViewModel
class CoachViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(CoachUiState())
    val uiState: StateFlow<CoachUiState> = _uiState.asStateFlow()

    val formEngine = FormAnalysisEngine()

    // ── Tab ─────────────────────────────────────────────────────

    fun selectTab(tab: CoachTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
    }

    // ── Camera ──────────────────────────────────────────────────

    fun onCameraPermissionResult(granted: Boolean) {
        _uiState.value = _uiState.value.copy(hasCameraPermission = granted)
    }

    fun toggleCamera() {
        _uiState.value = _uiState.value.copy(
            useFrontCamera = !_uiState.value.useFrontCamera
        )
    }

    // ── Pose Detection + Form Analysis ──────────────────────────

    fun onPoseDetected(pose: Pose, imageWidth: Int, imageHeight: Int) {
        // Run form analysis
        val result = formEngine.analyze(pose)

        _uiState.value = _uiState.value.copy(
            currentPose = pose,
            imageWidth = imageWidth,
            imageHeight = imageHeight,
            isDetecting = true,
            landmarkCount = pose.allPoseLandmarks.size,
            errorMessage = null,
            formScore = result.formScore,
            repCount = formEngine.repCount,
            checkpoints = result.checkpoints,
            coachingTip = result.coachingTip,
            jointQualities = result.jointQualities
        )
    }

    fun onDetectionError(error: Exception) {
        _uiState.value = _uiState.value.copy(
            errorMessage = error.localizedMessage,
            isDetecting = false
        )
    }

    // ── Exercise Selection ──────────────────────────────────────

    fun selectExercise(index: Int) {
        formEngine.selectExercise(index)
        _uiState.value = _uiState.value.copy(
            selectedExerciseIndex = index,
            formScore = 0,
            repCount = 0,
            checkpoints = emptyList(),
            coachingTip = null,
            jointQualities = emptyMap()
        )
    }

    // ── Chat ────────────────────────────────────────────────────

    fun updateChatInput(text: String) {
        _uiState.value = _uiState.value.copy(chatInput = text)
    }

    fun sendChatMessage() {
        val text = _uiState.value.chatInput.trim()
        if (text.isEmpty()) return

        val userMsg = ChatMessage(text = text, isUser = true)
        val currentMessages = _uiState.value.chatMessages + userMsg

        _uiState.value = _uiState.value.copy(
            chatMessages = currentMessages,
            chatInput = ""
        )

        // Generate AI response based on context
        val exercise = EXERCISES[_uiState.value.selectedExerciseIndex]
        val score = _uiState.value.formScore
        val reps = _uiState.value.repCount
        val response = generateCoachResponse(text, exercise, score, reps)

        val aiMsg = ChatMessage(text = response, isUser = false)
        _uiState.value = _uiState.value.copy(
            chatMessages = _uiState.value.chatMessages + aiMsg
        )
    }

    private fun generateCoachResponse(
        query: String,
        exercise: ExerciseDefinition,
        score: Int,
        reps: Int
    ): String {
        val lowerQuery = query.lowercase()

        return when {
            lowerQuery.contains("form") || lowerQuery.contains("score") -> {
                if (score > 0) {
                    "Your ${exercise.name} form score is $score%. " + when {
                        score >= 80 -> "Great work! Keep maintaining that form."
                        score >= 50 -> "Good progress. Focus on the failing checkpoints shown on the camera view."
                        else -> "Let's work on your form. Watch the red indicators and follow the coaching tips."
                    }
                } else {
                    "Start performing ${exercise.name}s in front of the camera and I'll analyze your form in real-time."
                }
            }
            lowerQuery.contains("rep") || lowerQuery.contains("count") -> {
                "You've completed $reps reps of ${exercise.name}. " +
                    if (reps > 0) "Keep it up!" else "Start your set and I'll count automatically."
            }
            lowerQuery.contains("tip") || lowerQuery.contains("help") || lowerQuery.contains("how") -> {
                getExerciseTips(exercise.id)
            }
            lowerQuery.contains("switch") || lowerQuery.contains("change") || lowerQuery.contains("exercise") -> {
                "Available exercises: ${EXERCISES.joinToString(", ") { it.name }}. " +
                    "Use the exercise picker on the Camera tab to switch."
            }
            lowerQuery.contains("warm") -> {
                "Before ${exercise.name}s, try: 1) 5 min light cardio, 2) Dynamic stretches for the target muscles, 3) 1-2 warm-up sets at lighter weight."
            }
            else -> {
                "I'm your AI form coach. I can help with:\n" +
                    "• Real-time form analysis (switch to Camera tab)\n" +
                    "• Exercise tips and cues\n" +
                    "• Rep counting and progress\n" +
                    "• Warm-up recommendations\n\n" +
                    "Currently tracking: ${exercise.name}"
            }
        }
    }

    private fun getExerciseTips(exerciseId: String): String = when (exerciseId) {
        "squat" -> "Squat tips:\n• Feet shoulder-width apart, toes slightly out\n• Break at the hips first, then knees\n• Keep chest up and core braced\n• Drive through your heels\n• Aim for thighs parallel or below"
        "pushup" -> "Push-up tips:\n• Hands slightly wider than shoulders\n• Keep elbows at 45° from body\n• Maintain a straight body line\n• Lower until chest nearly touches\n• Full lockout at the top"
        "deadlift" -> "Deadlift tips:\n• Feet hip-width apart, bar over mid-foot\n• Hinge at hips, push them back\n• Keep the bar close to your body\n• Drive through your feet\n• Squeeze glutes at lockout"
        "lunge" -> "Lunge tips:\n• Take a controlled step forward\n• Front knee at 90°, don't pass toes\n• Back knee toward the ground\n• Keep torso upright\n• Push through front heel to return"
        "shoulder_press" -> "Shoulder press tips:\n• Start with bar at shoulder height\n• Press straight up, slightly back\n• Full lockout overhead\n• Keep core tight, no back arch\n• Control the descent"
        "plank" -> "Plank tips:\n• Forearms on ground, shoulders over elbows\n• Straight line from head to heels\n• Engage core and squeeze glutes\n• Don't let hips sag or pike\n• Breathe steadily, hold position"
        else -> "Focus on controlled movement and proper alignment."
    }
}
