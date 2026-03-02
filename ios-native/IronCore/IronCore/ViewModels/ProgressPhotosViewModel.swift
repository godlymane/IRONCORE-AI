import Foundation
import SwiftUI
import PhotosUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage

// MARK: - ProgressPhoto Model

struct ProgressPhoto: Identifiable {
    let id: String
    let url: String
    let storagePath: String
    let category: PhotoCategory
    let date: Date
    let notes: String
    let createdAt: Date?

    enum PhotoCategory: String, CaseIterable, Identifiable {
        case front
        case side
        case back

        var id: String { rawValue }

        var displayName: String {
            rawValue.uppercased()
        }

        var icon: String {
            switch self {
            case .front: return "person.fill"
            case .side: return "person.fill.turn.right"
            case .back: return "person.fill.turn.left"
            }
        }
    }

    /// Parse from Firestore document data
    static func from(id: String, data: [String: Any]) -> ProgressPhoto? {
        guard let url = data["url"] as? String else { return nil }

        let storagePath = data["storagePath"] as? String ?? ""
        let categoryRaw = data["type"] as? String ?? "front"
        let category = PhotoCategory(rawValue: categoryRaw) ?? .front
        let notes = data["note"] as? String ?? ""

        // Parse date — ISO string or Firestore Timestamp
        var date = Date()
        if let dateString = data["date"] as? String {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let parsed = iso.date(from: dateString) {
                date = parsed
            } else {
                // Try without fractional seconds
                iso.formatOptions = [.withInternetDateTime]
                if let parsed = iso.date(from: dateString) {
                    date = parsed
                }
            }
        } else if let timestamp = data["date"] as? Timestamp {
            date = timestamp.dateValue()
        }

        var createdAt: Date? = nil
        if let ts = data["createdAt"] as? Timestamp {
            createdAt = ts.dateValue()
        }

        return ProgressPhoto(
            id: id,
            url: url,
            storagePath: storagePath,
            category: category,
            date: date,
            notes: notes,
            createdAt: createdAt
        )
    }
}

// MARK: - Filter Enum

enum PhotoFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case front = "Front"
    case back = "Back"
    case side = "Side"

    var id: String { rawValue }

    /// Returns nil for .all, or the matching ProgressPhoto.PhotoCategory
    var category: ProgressPhoto.PhotoCategory? {
        switch self {
        case .all: return nil
        case .front: return .front
        case .back: return .back
        case .side: return .side
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ProgressPhotosViewModel: ObservableObject {

    // MARK: - Published State

    @Published var photos: [ProgressPhoto] = []
    @Published var isLoading: Bool = true
    @Published var isUploading: Bool = false
    @Published var uploadProgress: Double = 0

    @Published var selectedFilter: PhotoFilter = .all
    @Published var selectedCategory: ProgressPhoto.PhotoCategory = .front

    // Photo picker
    @Published var showPhotoPicker: Bool = false
    @Published var selectedPhotoItem: PhotosPickerItem? = nil
    @Published var selectedImageData: Data? = nil
    @Published var photoNotes: String = ""

    // Full screen preview
    @Published var selectedPhoto: ProgressPhoto? = nil
    @Published var showPhotoDetail: Bool = false

    // Delete confirmation
    @Published var photoToDelete: ProgressPhoto? = nil
    @Published var showDeleteConfirm: Bool = false

    // Comparison mode
    @Published var isCompareMode: Bool = false
    @Published var compareLeft: ProgressPhoto? = nil
    @Published var compareRight: ProgressPhoto? = nil

    // Error handling
    @Published var errorMessage: String? = nil

    // MARK: - Private

    private let firestore = FirestoreService.shared
    private var listener: ListenerRegistration?

    // MARK: - Computed

    var filteredPhotos: [ProgressPhoto] {
        guard let cat = selectedFilter.category else { return photos }
        return photos.filter { $0.category == cat }
    }

    var photoCount: Int { photos.count }

    // MARK: - Lifecycle

    func startListening(uid: String) {
        isLoading = true
        listener = firestore.listenToProgressPhotos(uid: uid) { [weak self] docs in
            Task { @MainActor in
                guard let self = self else { return }
                self.photos = docs.compactMap { data -> ProgressPhoto? in
                    guard let id = data["id"] as? String else { return nil }
                    return ProgressPhoto.from(id: id, data: data)
                }
                .sorted { $0.date > $1.date }
                self.isLoading = false
            }
        }
    }

    func stopListening() {
        listener?.remove()
        listener = nil
    }

    // MARK: - Upload Photo

    /// Process selected PhotosPickerItem into compressed JPEG data
    func processSelectedPhoto() async {
        guard let item = selectedPhotoItem else { return }

        do {
            if let data = try await item.loadTransferable(type: Data.self) {
                // Compress to JPEG at 0.7 quality
                if let uiImage = UIImage(data: data) {
                    selectedImageData = compressImage(uiImage, quality: 0.7)
                } else {
                    selectedImageData = data
                }
            }
        } catch {
            print("[ProgressPhotos] Error loading photo: \(error)")
            errorMessage = "Failed to load photo"
        }
    }

    /// Upload the selected image to Firebase Storage + save metadata to Firestore
    func uploadPhoto(uid: String) async {
        guard let imageData = selectedImageData else {
            errorMessage = "No image selected"
            return
        }

        isUploading = true
        uploadProgress = 0
        errorMessage = nil

        do {
            let timestamp = Int(Date().timeIntervalSince1970 * 1000)
            let filename = "\(timestamp).jpg"
            let storagePath = "users/\(uid)/progress_photos/\(filename)"

            // 1. Upload to Firebase Storage
            let storageRef = Storage.storage().reference().child(storagePath)

            let metadata = StorageMetadata()
            metadata.contentType = "image/jpeg"

            // Upload with progress observation
            let uploadTask = storageRef.putData(imageData, metadata: metadata)

            // Observe progress
            uploadTask.observe(.progress) { [weak self] snapshot in
                Task { @MainActor in
                    if let progress = snapshot.progress {
                        self?.uploadProgress = Double(progress.completedUnitCount) / Double(max(1, progress.totalUnitCount))
                    }
                }
            }

            // Wait for completion
            let _ = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<StorageMetadata, Error>) in
                uploadTask.observe(.success) { snapshot in
                    continuation.resume(returning: snapshot.metadata ?? StorageMetadata())
                }
                uploadTask.observe(.failure) { snapshot in
                    continuation.resume(throwing: snapshot.error ?? NSError(domain: "StorageUpload", code: -1))
                }
            }

            // 2. Get download URL
            let downloadURL = try await storageRef.downloadURL()

            // 3. Save metadata to Firestore
            let photoData: [String: Any] = [
                "url": downloadURL.absoluteString,
                "storagePath": storagePath,
                "type": selectedCategory.rawValue,
                "note": photoNotes,
                "date": ISO8601DateFormatter().string(from: Date()),
                "createdAt": FieldValue.serverTimestamp()
            ]

            let _ = try await firestore.addProgressPhoto(uid: uid, data: photoData)

            // Reset upload state
            selectedPhotoItem = nil
            selectedImageData = nil
            photoNotes = ""
            selectedCategory = .front
            uploadProgress = 1.0
            isUploading = false
            showPhotoPicker = false

        } catch {
            print("[ProgressPhotos] Upload error: \(error)")
            errorMessage = "Upload failed: \(error.localizedDescription)"
            isUploading = false
        }
    }

    // MARK: - Delete Photo

    func requestDelete(_ photo: ProgressPhoto) {
        photoToDelete = photo
        showDeleteConfirm = true
    }

    func confirmDelete(uid: String) async {
        guard let photo = photoToDelete else { return }

        do {
            // 1. Delete from Storage
            if !photo.storagePath.isEmpty {
                let storageRef = Storage.storage().reference().child(photo.storagePath)
                try? await storageRef.delete()
            }

            // 2. Delete from Firestore
            try await firestore.deleteProgressPhoto(uid: uid, photoId: photo.id)

            // Clear state
            photoToDelete = nil
            showDeleteConfirm = false

            // If we were previewing this photo, dismiss
            if selectedPhoto?.id == photo.id {
                selectedPhoto = nil
                showPhotoDetail = false
            }

            // Clear from comparison if selected
            if compareLeft?.id == photo.id { compareLeft = nil }
            if compareRight?.id == photo.id { compareRight = nil }

        } catch {
            print("[ProgressPhotos] Delete error: \(error)")
            errorMessage = "Delete failed: \(error.localizedDescription)"
        }
    }

    func cancelDelete() {
        photoToDelete = nil
        showDeleteConfirm = false
    }

    // MARK: - Comparison Mode

    func toggleCompareMode() {
        isCompareMode.toggle()
        if !isCompareMode {
            compareLeft = nil
            compareRight = nil
        } else {
            // Auto-select oldest and newest if we have 2+ photos
            let sorted = filteredPhotos.sorted { $0.date < $1.date }
            if sorted.count >= 2 {
                compareLeft = sorted.first
                compareRight = sorted.last
            }
        }
    }

    func selectForComparison(_ photo: ProgressPhoto) {
        if compareLeft == nil {
            compareLeft = photo
        } else if compareRight == nil {
            compareRight = photo
        } else {
            // Replace the left one, shift right to left
            compareLeft = compareRight
            compareRight = photo
        }
    }

    func isSelectedForCompare(_ photo: ProgressPhoto) -> Bool {
        compareLeft?.id == photo.id || compareRight?.id == photo.id
    }

    // MARK: - Helpers

    private func compressImage(_ image: UIImage, quality: CGFloat) -> Data? {
        // Resize if too large (max 1920 on longest side)
        let maxDimension: CGFloat = 1920
        var targetImage = image

        if image.size.width > maxDimension || image.size.height > maxDimension {
            let scale = maxDimension / max(image.size.width, image.size.height)
            let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            if let resized = UIGraphicsGetImageFromCurrentImageContext() {
                targetImage = resized
            }
            UIGraphicsEndImageContext()
        }

        return targetImage.jpegData(compressionQuality: quality)
    }

    static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    static let shortDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()
}
