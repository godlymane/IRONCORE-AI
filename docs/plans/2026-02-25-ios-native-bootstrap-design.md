# iOS Native Bootstrap — Design Document

**Date**: 2026-02-25
**Status**: Approved
**Target**: iOS 17+, SwiftUI, MVVM, Combine + @Published

## Architecture: Monolithic FirestoreManager (Approach A)

Single `FirestoreManager` singleton owns all Firestore listeners and mutations.
ViewModels subscribe to its `@Published` properties via Combine.
Mirrors the React app's Zustand + useFitnessData pattern.

## Project Structure

```
ios-native/IronCore/
├── App/
│   ├── IronCoreApp.swift
│   └── AppDelegate.swift
├── Models/ (17 Codable structs — exact Firestore parity)
├── Services/
│   ├── FirestoreManager.swift (singleton: listeners + mutations)
│   ├── AuthManager.swift (Firebase Auth)
│   ├── StoreKitManager.swift (StoreKit 2)
│   └── CloudFunctionService.swift
├── ViewModels/ (one per major screen)
├── Views/
│   ├── Tabs/ (6 main tabs)
│   ├── Auth/
│   ├── Components/
│   └── Camera/
├── Camera/
│   ├── CameraManager.swift (AVCaptureSession 60fps)
│   └── PoseDetector.swift (VNDetectHumanBodyPoseRequest)
└── Utils/
    ├── Constants.swift
    └── Helpers.swift
```

## Data Flow

```
Firestore → FirestoreManager (@Published) → ViewModel (Combine) → SwiftUI View
User Action → ViewModel → FirestoreManager.updateData() → Firestore
```

## Scope (4 deliverables)

1. **Project Bootstrap**: Xcode project, Firebase SDK, MVVM skeleton, tab nav
2. **Data Parity**: 17 Codable models matching all Firestore collections
3. **Vision Prototype**: Camera → VNDetectHumanBodyPoseRequest → coordinates at 60fps
4. **StoreKit 2**: Product config for pro_monthly, pro_yearly, battle_pass_season

## Key Firestore Collections (must match exactly)

- `users/{uid}` — root stats
- `users/{uid}/data/profile` — extended profile
- `users/{uid}/workouts` — workout logs
- `users/{uid}/meals` — nutrition logs
- `users/{uid}/burned` — cardio logs
- `users/{uid}/progress` — milestones
- `users/{uid}/photos` — progress photos
- `users/{uid}/following/{targetId}` — social follows
- `users/{uid}/inbox` — private messages
- `users/{uid}/notifications` — notifications
- `leaderboard/{uid}` — global leaderboard
- `battles/{battleId}` — PvP battles
- `community_boss/current` — shared boss
- `guilds/{guildId}` — guilds + /chat subcollection
- `global/data/feed`, `global/data/chat`, `global/data/posts` — social
- `tournaments/{id}` + `/participants/{uid}` — tournaments
- `orders/{id}`, `subscriptions/{id}`, `rateLimits/{id}` — payments/limits

## Decisions

- iOS 17+ minimum deployment target
- Combine + @Published for reactive data (not @Observable)
- Firebase iOS SDK via SPM
- Apple Vision framework for pose detection (not CoreML custom model)
- StoreKit 2 (not original StoreKit)
- Cloud Functions called via Firebase Functions SDK
