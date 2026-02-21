import AVFoundation
import UIKit

/// Camera session manager for AI Form Correction.
/// Handles AVCaptureSession lifecycle, camera switching (front/rear),
/// and delivers CMSampleBuffer frames for Vision pose detection.
/// Runs capture session on a dedicated background queue.
final class CameraManager: NSObject, ObservableObject {

    // MARK: - Published State

    @Published var isRunning = false
    @Published var permissionGranted = false
    @Published var permissionDenied = false
    @Published var usingFrontCamera = false
    @Published var error: String?

    // MARK: - Session

    let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "com.ironcore.camera.session")
    private var currentInput: AVCaptureDeviceInput?
    private let videoOutput = AVCaptureVideoDataOutput()
    private let outputQueue = DispatchQueue(label: "com.ironcore.camera.output", qos: .userInitiated)

    /// Callback for each video frame — called on outputQueue
    var onFrame: ((CMSampleBuffer) -> Void)?

    // MARK: - Permission

    func checkPermission() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            DispatchQueue.main.async { self.permissionGranted = true }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    self?.permissionGranted = granted
                    self?.permissionDenied = !granted
                }
            }
        case .denied, .restricted:
            DispatchQueue.main.async {
                self.permissionDenied = true
                self.permissionGranted = false
            }
        @unknown default:
            break
        }
    }

    // MARK: - Configure & Start

    func start() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.configureSession()
            self.session.startRunning()
            DispatchQueue.main.async { self.isRunning = true }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.session.stopRunning()
            DispatchQueue.main.async { self.isRunning = false }
        }
    }

    private func configureSession() {
        session.beginConfiguration()
        session.sessionPreset = .high

        // Remove existing inputs
        session.inputs.forEach { session.removeInput($0) }

        // Camera selection: rear by default (environment), user can flip
        let position: AVCaptureDevice.Position = usingFrontCamera ? .front : .back
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position) else {
            DispatchQueue.main.async { self.error = "Camera not available" }
            session.commitConfiguration()
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: device)
            if session.canAddInput(input) {
                session.addInput(input)
                currentInput = input
            }
        } catch {
            DispatchQueue.main.async { self.error = "Failed to access camera: \(error.localizedDescription)" }
            session.commitConfiguration()
            return
        }

        // Video output for frame delivery
        if session.outputs.isEmpty {
            videoOutput.alwaysDiscardsLateVideoFrames = true
            videoOutput.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            videoOutput.setSampleBufferDelegate(self, queue: outputQueue)

            if session.canAddOutput(videoOutput) {
                session.addOutput(videoOutput)
            }
        }

        // Set video orientation to portrait
        if let connection = videoOutput.connection(with: .video) {
            if connection.isVideoRotationAngleSupported(90) {
                connection.videoRotationAngle = 90
            }
            connection.isVideoMirrored = usingFrontCamera
        }

        session.commitConfiguration()
    }

    // MARK: - Flip Camera

    func flipCamera() {
        usingFrontCamera.toggle()
        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.configureSession()
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        onFrame?(sampleBuffer)
    }
}
