package com.ironcore.fit.ui.coach

import androidx.lifecycle.ViewModel
import com.google.mlkit.vision.pose.Pose
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class CoachUiState(
    val hasCameraPermission: Boolean = false,
    val useFrontCamera: Boolean = true,
    val currentPose: Pose? = null,
    val imageWidth: Int = 0,
    val imageHeight: Int = 0,
    val isDetecting: Boolean = false,
    val errorMessage: String? = null,
    val landmarkCount: Int = 0
)

@HiltViewModel
class CoachViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(CoachUiState())
    val uiState: StateFlow<CoachUiState> = _uiState.asStateFlow()

    fun onCameraPermissionResult(granted: Boolean) {
        _uiState.value = _uiState.value.copy(hasCameraPermission = granted)
    }

    fun toggleCamera() {
        _uiState.value = _uiState.value.copy(
            useFrontCamera = !_uiState.value.useFrontCamera
        )
    }

    fun onPoseDetected(pose: Pose, imageWidth: Int, imageHeight: Int) {
        _uiState.value = _uiState.value.copy(
            currentPose = pose,
            imageWidth = imageWidth,
            imageHeight = imageHeight,
            isDetecting = true,
            landmarkCount = pose.allPoseLandmarks.size,
            errorMessage = null
        )
    }

    fun onDetectionError(error: Exception) {
        _uiState.value = _uiState.value.copy(
            errorMessage = error.localizedMessage,
            isDetecting = false
        )
    }
}
