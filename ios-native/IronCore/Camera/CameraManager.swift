import AVFoundation
import Combine
import UIKit

/// Manages AVCaptureSession for 60fps camera feed
/// Delivers CMSampleBuffers to PoseDetector for Vision processing
final class CameraManager: NSObject, ObservableObject {
    @Published var isRunning = false
    @Published var error: String?

    let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "com.ironcore.camera.session")
    private let videoOutput = AVCaptureVideoDataOutput()
    private let videoOutputQueue = DispatchQueue(label: "com.ironcore.camera.output", qos: .userInteractive)

    /// Callback for each frame — PoseDetector hooks into this
    var onFrameReceived: ((CMSampleBuffer) -> Void)?

    override init() {
        super.init()
        checkPermissionAndSetup()
    }

    // MARK: - Setup

    private func checkPermissionAndSetup() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted { self?.setupSession() }
                else {
                    DispatchQueue.main.async { self?.error = "Camera access denied" }
                }
            }
        default:
            DispatchQueue.main.async { self.error = "Camera access denied" }
        }
    }

    private func setupSession() {
        sessionQueue.async { [weak self] in
            guard let self else { return }

            self.session.beginConfiguration()
            self.session.sessionPreset = .high

            // Add front camera input (user faces camera for form correction)
            guard let camera = AVCaptureDevice.default(
                .builtInWideAngleCamera,
                for: .video,
                position: .front
            ) else {
                DispatchQueue.main.async { self.error = "No front camera available" }
                return
            }

            // Configure for 60fps
            do {
                try camera.lockForConfiguration()
                let desiredFormat = camera.formats.filter { format in
                    let desc = format.formatDescription
                    let dimensions = CMVideoFormatDescriptionGetDimensions(desc)
                    let ranges = format.videoSupportedFrameRateRanges
                    return dimensions.width >= 1280 &&
                           ranges.contains(where: { $0.maxFrameRate >= 60 })
                }.first

                if let format = desiredFormat {
                    camera.activeFormat = format
                    camera.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 60)
                    camera.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 60)
                }
                camera.unlockForConfiguration()
            } catch {
                print("Failed to configure camera for 60fps: \(error)")
            }

            guard let input = try? AVCaptureDeviceInput(device: camera) else { return }
            if self.session.canAddInput(input) {
                self.session.addInput(input)
            }

            // Add video output
            self.videoOutput.alwaysDiscardsLateVideoFrames = true
            self.videoOutput.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            self.videoOutput.setSampleBufferDelegate(self, queue: self.videoOutputQueue)

            if self.session.canAddOutput(self.videoOutput) {
                self.session.addOutput(self.videoOutput)
            }

            // Set video orientation
            if let connection = self.videoOutput.connection(with: .video) {
                if connection.isVideoRotationAngleSupported(0) {
                    connection.videoRotationAngle = 0
                }
                connection.isVideoMirrored = true  // Mirror front camera
            }

            self.session.commitConfiguration()
        }
    }

    // MARK: - Start / Stop

    func start() {
        sessionQueue.async { [weak self] in
            guard let self, !self.session.isRunning else { return }
            self.session.startRunning()
            DispatchQueue.main.async { self.isRunning = true }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
            DispatchQueue.main.async { self.isRunning = false }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        onFrameReceived?(sampleBuffer)
    }

    func captureOutput(
        _ output: AVCaptureOutput,
        didDrop sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        // Frame dropped — expected under heavy load, no action needed
    }
}
