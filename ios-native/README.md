# IronCore Fit — iOS Native

## Setup

1. **Firebase**: Download `GoogleService-Info.plist` from the Firebase console (project: `ironcore-f68c2`) and place it in `IronCore/Resources/`
2. **Open in Xcode**: Open `ios-native/` as an Xcode project, or use `Package.swift` with SPM
3. **StoreKit Testing**: The `Products.storekit` file is pre-configured for Xcode StoreKit testing (no App Store Connect needed for dev)
4. **Run**: Build and run on a physical device (camera required for pose detection)

## Architecture

- **Pattern**: MVVM with Combine + @Published
- **Min Target**: iOS 17
- **Firebase SDK**: via Swift Package Manager
- **Data Layer**: `FirestoreManager` singleton (mirrors React Zustand store)
- **Auth**: `AuthManager` (email, Google, Apple Sign-In)
- **Payments**: `StoreKitManager` (StoreKit 2)
- **Pose Detection**: Apple Vision framework (`VNDetectHumanBodyPoseRequest`)

## Project Structure

```
IronCore/
├── App/          — Entry point, AppDelegate, RootView
├── Models/       — 17 Codable structs (exact Firestore parity)
├── Services/     — FirestoreManager, AuthManager, StoreKitManager, CloudFunctions
├── ViewModels/   — Per-screen view models (TODO)
├── Views/
│   ├── Tabs/     — 6 main tabs
│   ├── Auth/     — Login, Onboarding
│   ├── Camera/   — PoseDetectionView
│   └── Components/
├── Camera/       — CameraManager (60fps), PoseDetector (Vision)
├── Utils/        — Constants, Helpers
└── Resources/    — Products.storekit, Info.plist
```
