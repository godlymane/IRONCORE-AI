import SwiftUI
import PhotosUI
import FirebaseAuth

/// Progress Photos — mirrors ProgressPhotos.jsx from React prototype.
/// Gallery grid, category filters, photo upload, full-screen preview,
/// side-by-side comparison mode, and delete with confirmation.
struct ProgressPhotosView: View {
    let uid: String
    @StateObject private var vm = ProgressPhotosViewModel()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    header
                    filterTabs
                    modeToggle

                    if vm.isLoading {
                        loadingState
                    } else if vm.isCompareMode {
                        comparisonSection
                    } else if vm.filteredPhotos.isEmpty {
                        emptyState
                    } else {
                        photoGrid
                    }

                    Spacer(minLength: 100)
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
            }
        }
        .onAppear { vm.startListening(uid: uid) }
        .onDisappear { vm.stopListening() }
        .sheet(isPresented: $vm.showPhotoPicker) {
            UploadSheet(uid: uid, vm: vm)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .fullScreenCover(isPresented: $vm.showPhotoDetail) {
            if let photo = vm.selectedPhoto {
                PhotoDetailOverlay(photo: photo, vm: vm, uid: uid)
            }
        }
        .alert("Delete Photo?", isPresented: $vm.showDeleteConfirm) {
            Button("Cancel", role: .cancel) { vm.cancelDelete() }
            Button("Delete", role: .destructive) {
                Task { await vm.confirmDelete(uid: uid) }
            }
        } message: {
            Text("This photo will be permanently deleted. This action cannot be undone.")
        }
        .onChange(of: vm.selectedPhotoItem) { _, _ in
            Task { await vm.processSelectedPhoto() }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text("BODY CHRONICLE")
                    .font(.system(size: 24, weight: .black))
                    .italic()
                    .foregroundColor(.white)
                    .tracking(-1)
                Text("\(vm.photoCount) SNAPSHOTS STORED")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.ironRedLight)
                    .tracking(2)
            }

            Spacer()

            Button { vm.showPhotoPicker = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 12, weight: .bold))
                    Text("Add")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: Color.ironRed.opacity(0.3), radius: 10)
            }
        }
    }

    // MARK: - Category Filter Tabs

    private var filterTabs: some View {
        HStack(spacing: 4) {
            ForEach(PhotoFilter.allCases) { filter in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        vm.selectedFilter = filter
                    }
                } label: {
                    Text(filter.rawValue.uppercased())
                        .font(.system(size: 12, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(vm.selectedFilter == filter ? .white : Color.gray.opacity(0.5))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(vm.selectedFilter == filter
                                      ? Color.white.opacity(0.1)
                                      : Color.clear)
                        )
                }
            }
        }
        .padding(4)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.black.opacity(0.3))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    // MARK: - Mode Toggle (Gallery / Compare)

    private var modeToggle: some View {
        HStack {
            Spacer()
            Button {
                withAnimation(.easeInOut(duration: 0.25)) {
                    vm.toggleCompareMode()
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: vm.isCompareMode ? "square.grid.2x2" : "arrow.left.arrow.right")
                        .font(.system(size: 12, weight: .semibold))
                    Text(vm.isCompareMode ? "Gallery" : "Compare")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundColor(vm.isCompareMode ? .ironRedLight : Color.gray.opacity(0.6))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(vm.isCompareMode
                              ? Color.ironRed.opacity(0.15)
                              : Color.white.opacity(0.04))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(vm.isCompareMode
                                        ? Color.ironRed.opacity(0.3)
                                        : Color.white.opacity(0.06), lineWidth: 1)
                        )
                )
            }
        }
    }

    // MARK: - Photo Grid

    private var photoGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ]

        return LazyVGrid(columns: columns, spacing: 8) {
            ForEach(vm.filteredPhotos) { photo in
                PhotoGridCell(
                    photo: photo,
                    isCompareMode: vm.isCompareMode,
                    isSelectedForCompare: vm.isSelectedForCompare(photo)
                ) {
                    if vm.isCompareMode {
                        vm.selectForComparison(photo)
                    } else {
                        vm.selectedPhoto = photo
                        vm.showPhotoDetail = true
                    }
                }
            }
        }
    }

    // MARK: - Comparison Section

    private var comparisonSection: some View {
        VStack(spacing: 16) {
            // Instructions
            if vm.compareLeft == nil || vm.compareRight == nil {
                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 14))
                        .foregroundColor(.ironRedLight)
                    Text("Select two photos below to compare side by side")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color.gray.opacity(0.6))
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.ironRed.opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.ironRed.opacity(0.15), lineWidth: 1)
                        )
                )
            }

            // Side by side comparison
            if let left = vm.compareLeft, let right = vm.compareRight {
                ComparisonCard(left: left, right: right)
            }

            // Selection grid (smaller)
            let columns = [
                GridItem(.flexible(), spacing: 6),
                GridItem(.flexible(), spacing: 6),
                GridItem(.flexible(), spacing: 6),
                GridItem(.flexible(), spacing: 6)
            ]

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(vm.filteredPhotos) { photo in
                    PhotoGridCell(
                        photo: photo,
                        isCompareMode: true,
                        isSelectedForCompare: vm.isSelectedForCompare(photo),
                        compact: true
                    ) {
                        vm.selectForComparison(photo)
                    }
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 48))
                .foregroundColor(Color.gray.opacity(0.2))

            Text("No Progress Photos")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)

            Text("Track your transformation by adding\nphotos from different angles")
                .font(.system(size: 13))
                .foregroundColor(Color.gray.opacity(0.5))
                .multilineTextAlignment(.center)

            Button { vm.showPhotoPicker = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 14, weight: .semibold))
                    Text("ADD FIRST PHOTO")
                        .font(.system(size: 13, weight: .black))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(
                            LinearGradient(
                                colors: [Color.ironRed, Color.ironRedDark],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: Color.ironRed.opacity(0.3), radius: 12)
            }
        }
        .padding(.vertical, 48)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .strokeBorder(
                    Color.white.opacity(0.06),
                    style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                )
        )
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(.ironRed)
                .scaleEffect(1.2)
            Text("Loading archives...")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color.gray.opacity(0.5))
        }
        .padding(.vertical, 60)
    }
}

// MARK: - Photo Grid Cell

private struct PhotoGridCell: View {
    let photo: ProgressPhoto
    let isCompareMode: Bool
    let isSelectedForCompare: Bool
    var compact: Bool = false
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottom) {
                // Photo
                AsyncImage(url: URL(string: photo.url)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(3/4, contentMode: .fill)
                            .clipped()
                    case .failure:
                        Color.white.opacity(0.04)
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.system(size: compact ? 16 : 24))
                                    .foregroundColor(Color.gray.opacity(0.3))
                            )
                    case .empty:
                        Color.white.opacity(0.04)
                            .overlay(
                                ProgressView()
                                    .tint(Color.gray.opacity(0.5))
                            )
                    @unknown default:
                        Color.white.opacity(0.04)
                    }
                }
                .aspectRatio(3/4, contentMode: .fit)

                // Bottom gradient overlay with info
                if !compact {
                    LinearGradient(
                        colors: [Color.black.opacity(0.8), Color.clear],
                        startPoint: .bottom,
                        endPoint: .top
                    )
                    .frame(height: 60)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(photo.category.displayName)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.ironRedLight)
                            .tracking(0.5)

                        Text(ProgressPhotosViewModel.shortDateFormatter.string(from: photo.date))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                }

                // Compare selection indicator
                if isCompareMode && isSelectedForCompare {
                    Color.ironRed.opacity(0.2)

                    VStack {
                        HStack {
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.ironRed)
                                .shadow(color: .black, radius: 4)
                        }
                        Spacer()
                    }
                    .padding(6)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: compact ? 10 : 16))
            .overlay(
                RoundedRectangle(cornerRadius: compact ? 10 : 16)
                    .stroke(
                        isSelectedForCompare ? Color.ironRed : Color.white.opacity(0.08),
                        lineWidth: isSelectedForCompare ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Comparison Card

private struct ComparisonCard: View {
    let left: ProgressPhoto
    let right: ProgressPhoto

    var body: some View {
        VStack(spacing: 12) {
            // Labels
            HStack {
                Text("BEFORE")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(Color.gray.opacity(0.5))
                    .tracking(1)
                Spacer()
                Image(systemName: "arrow.left.arrow.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.ironRed)
                Spacer()
                Text("AFTER")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.ironRedLight)
                    .tracking(1)
            }

            // Side by side images
            HStack(spacing: 4) {
                // Left (Before / older)
                ZStack(alignment: .bottom) {
                    AsyncImage(url: URL(string: left.url)) { phase in
                        if case .success(let image) = phase {
                            image
                                .resizable()
                                .aspectRatio(3/4, contentMode: .fill)
                                .clipped()
                        } else {
                            Color.white.opacity(0.04)
                                .aspectRatio(3/4, contentMode: .fit)
                        }
                    }
                    .aspectRatio(3/4, contentMode: .fit)

                    // Date badge
                    Text(ProgressPhotosViewModel.dateFormatter.string(from: left.date))
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule()
                                .fill(Color.black.opacity(0.6))
                                .background(Capsule().fill(.ultraThinMaterial))
                        )
                        .padding(8)
                }
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )

                // Right (After / newer)
                ZStack(alignment: .bottom) {
                    AsyncImage(url: URL(string: right.url)) { phase in
                        if case .success(let image) = phase {
                            image
                                .resizable()
                                .aspectRatio(3/4, contentMode: .fill)
                                .clipped()
                        } else {
                            Color.white.opacity(0.04)
                                .aspectRatio(3/4, contentMode: .fit)
                        }
                    }
                    .aspectRatio(3/4, contentMode: .fit)

                    // Date badge
                    Text(ProgressPhotosViewModel.dateFormatter.string(from: right.date))
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule()
                                .fill(Color.ironRed.opacity(0.7))
                        )
                        .padding(8)
                }
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.ironRed.opacity(0.3), lineWidth: 1)
                )
            }

            // Time difference
            let daysBetween = Calendar.current.dateComponents([.day], from: left.date, to: right.date).day ?? 0
            if daysBetween > 0 {
                Text("\(daysBetween) DAYS APART")
                    .font(.system(size: 11, weight: .black))
                    .foregroundColor(.ironRedLight)
                    .tracking(2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.ironRed.opacity(0.08))
                    )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        )
    }
}

// MARK: - Photo Detail Overlay (Full Screen)

private struct PhotoDetailOverlay: View {
    let photo: ProgressPhoto
    @ObservedObject var vm: ProgressPhotosViewModel
    let uid: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Top bar
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Circle().fill(Color.white.opacity(0.1)))
                    }

                    Spacer()

                    VStack(spacing: 2) {
                        Text(photo.category.displayName)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.ironRedLight)
                            .tracking(1)
                        Text(ProgressPhotosViewModel.dateFormatter.string(from: photo.date))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Spacer()

                    Button {
                        vm.requestDelete(photo)
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.ironRedLight)
                            .padding(12)
                            .background(Circle().fill(Color.ironRed.opacity(0.15)))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                Spacer()

                // Full photo
                AsyncImage(url: URL(string: photo.url)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    case .failure:
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 32))
                                .foregroundColor(Color.gray.opacity(0.4))
                            Text("Failed to load image")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Color.gray.opacity(0.5))
                        }
                    case .empty:
                        ProgressView()
                            .tint(.ironRed)
                            .scaleEffect(1.5)
                    @unknown default:
                        EmptyView()
                    }
                }
                .padding(.horizontal, 8)

                Spacer()

                // Notes if any
                if !photo.notes.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "note.text")
                            .font(.system(size: 12))
                            .foregroundColor(.ironRedLight)
                        Text(photo.notes)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color.gray.opacity(0.7))
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.white.opacity(0.04))
                    )
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
            }
        }
    }
}

// MARK: - Upload Sheet

private struct UploadSheet: View {
    let uid: String
    @ObservedObject var vm: ProgressPhotosViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 20) {
                // Header
                HStack {
                    Text("ADD PHOTO")
                        .font(.system(size: 20, weight: .black))
                        .italic()
                        .foregroundColor(.white)
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.gray)
                            .padding(8)
                            .background(Circle().fill(Color.white.opacity(0.06)))
                    }
                }

                if let imageData = vm.selectedImageData,
                   let uiImage = UIImage(data: imageData) {
                    // Preview + options
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 16) {
                            // Image preview
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .aspectRatio(3/4, contentMode: .fit)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .frame(maxHeight: 350)

                                Button {
                                    vm.selectedPhotoItem = nil
                                    vm.selectedImageData = nil
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                        .padding(8)
                                        .background(Circle().fill(Color.black.opacity(0.6)))
                                }
                                .padding(8)
                            }

                            // Category picker
                            VStack(alignment: .leading, spacing: 8) {
                                Text("ANGLE")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(Color.gray.opacity(0.5))
                                    .tracking(1)

                                HStack(spacing: 8) {
                                    ForEach(ProgressPhoto.PhotoCategory.allCases) { cat in
                                        Button {
                                            vm.selectedCategory = cat
                                        } label: {
                                            VStack(spacing: 4) {
                                                Image(systemName: cat.icon)
                                                    .font(.system(size: 16, weight: .semibold))
                                                Text(cat.displayName)
                                                    .font(.system(size: 11, weight: .bold))
                                            }
                                            .foregroundColor(vm.selectedCategory == cat ? .white : Color.gray.opacity(0.5))
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 14)
                                            .background(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .fill(vm.selectedCategory == cat
                                                          ? Color.ironRed
                                                          : Color.white.opacity(0.05))
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: 12)
                                                            .stroke(vm.selectedCategory == cat
                                                                    ? Color.ironRed
                                                                    : Color.white.opacity(0.1), lineWidth: 1)
                                                    )
                                            )
                                        }
                                    }
                                }
                            }

                            // Notes
                            VStack(alignment: .leading, spacing: 6) {
                                Text("NOTE (OPTIONAL)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(Color.gray.opacity(0.5))
                                    .tracking(1)

                                TextField("e.g., Morning check-in, 185lbs", text: $vm.photoNotes)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white)
                                    .padding(12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color.black.opacity(0.4))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                            )
                                    )
                            }

                            // Upload button
                            Button {
                                Task { await vm.uploadPhoto(uid: uid) }
                            } label: {
                                HStack(spacing: 8) {
                                    if vm.isUploading {
                                        ProgressView()
                                            .tint(.white)
                                            .scaleEffect(0.9)
                                    } else {
                                        Image(systemName: "arrow.up.circle.fill")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                    Text(vm.isUploading ? "UPLOADING..." : "SAVE TO GALLERY")
                                        .font(.system(size: 14, weight: .black))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.ironRed.opacity(0.9), Color.ironRedDark.opacity(0.9)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                )
                                .shadow(color: Color.ironRed.opacity(0.3), radius: 10)
                            }
                            .disabled(vm.isUploading)
                            .opacity(vm.isUploading ? 0.7 : 1)

                            // Upload progress bar
                            if vm.isUploading {
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        RoundedRectangle(cornerRadius: 4)
                                            .fill(Color.white.opacity(0.08))
                                            .frame(height: 4)
                                        RoundedRectangle(cornerRadius: 4)
                                            .fill(Color.ironRed)
                                            .frame(width: geo.size.width * vm.uploadProgress, height: 4)
                                            .animation(.easeOut(duration: 0.3), value: vm.uploadProgress)
                                    }
                                }
                                .frame(height: 4)
                            }

                            // Error message
                            if let error = vm.errorMessage {
                                HStack(spacing: 6) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 12))
                                        .foregroundColor(.orange)
                                    Text(error)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.orange)
                                }
                                .padding(10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.orange.opacity(0.1))
                                )
                            }
                        }
                    }
                } else {
                    // Photo picker prompt
                    Spacer()

                    PhotosPicker(
                        selection: $vm.selectedPhotoItem,
                        matching: .images,
                        photoLibrary: .shared()
                    ) {
                        VStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(Color.ironRed.opacity(0.1))
                                    .frame(width: 80, height: 80)
                                Image(systemName: "photo.badge.plus")
                                    .font(.system(size: 32, weight: .semibold))
                                    .foregroundColor(.ironRed)
                            }

                            Text("Choose from Library")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)

                            Text("Select a progress photo\nfrom your photo library")
                                .font(.system(size: 13))
                                .foregroundColor(Color.gray.opacity(0.5))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 48)
                        .background(
                            RoundedRectangle(cornerRadius: 24)
                                .strokeBorder(
                                    Color.white.opacity(0.1),
                                    style: StrokeStyle(lineWidth: 2, dash: [10, 8])
                                )
                        )
                    }

                    Spacer()
                }
            }
            .padding(20)
        }
    }
}
