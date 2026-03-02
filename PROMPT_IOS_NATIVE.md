# IRONCORE FIT — iOS NATIVE BUILD PROMPT

You are building the IronCore Fit iOS app from scratch using Swift and SwiftUI. This is a native rebuild of an existing React/Capacitor app. The Firebase backend, Firestore data models, and Cloud Functions are already built and shared between platforms.

## PROJECT CONTEXT
- New iOS project directory: `C:\Users\devda\iron-ai\ios-native\` (create Xcode project here)
- Reference React app: `C:\Users\devda\iron-ai\src\` (use as blueprint for all features)
- Cloud Functions: `C:\Users\devda\iron-ai\functions\index.js` (shared, do NOT modify)
- Firestore rules: `C:\Users\devda\iron-ai\firestore.rules` (shared, do NOT modify)
- Firebase project ID: `ironcore-f68c2`
- Bundle ID: `com.ironcore.fit` (or user's preference)
- Minimum deployment target: iOS 16.0
- Design: dark theme, black backgrounds, red (#dc2626) accent, glass-morphism cards, HUD-style elements

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| UI Framework | SwiftUI |
| Architecture | MVVM with Combine/async-await |
| Auth | Firebase Auth (Email, Google Sign-In, Apple Sign-In) |
| Database | Cloud Firestore |
| Cloud Functions | Firebase Functions (callable) |
| Storage | Firebase Storage |
| Push Notifications | Firebase Cloud Messaging (FCM) + APNs |
| AI Form Correction | Apple Vision Framework + CoreML |
| Payments | StoreKit 2 (In-App Purchases + Subscriptions) |
| Charts | Swift Charts (iOS 16+) |
| Animations | SwiftUI animations + matched geometry |
| Camera | AVFoundation |
| Haptics | CoreHaptics |

---

## FIREBASE SETUP

### 1. Add iOS App to Firebase Console
- Go to Firebase Console > ironcore-f68c2 > Project Settings > Add App > iOS
- Bundle ID: `com.ironcore.fit`
- Download `GoogleService-Info.plist` and add to Xcode project

### 2. Firebase SDK via Swift Package Manager
Add these packages:
- `firebase-ios-sdk` (FirebaseAuth, FirebaseFirestore, FirebaseFunctions, FirebaseStorage, FirebaseMessaging, FirebaseAnalytics)
- `GoogleSignIn-iOS`

### 3. Initialize Firebase in App
```swift
// IronCoreFitApp.swift
import SwiftUI
import FirebaseCore

@main
struct IronCoreFitApp: App {
    init() {
        FirebaseApp.configure()
    }
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
```

---

## APP ARCHITECTURE

### Project Structure
```
ios-native/
├── IronCoreFit/
│   ├── App/
│   │   ├── IronCoreFitApp.swift          // Entry point
│   │   └── RootView.swift                // Auth gate + tab navigation
│   ├── Models/
│   │   ├── User.swift                     // Firestore user model
│   │   ├── Workout.swift                  // Workout data model
│   │   ├── Exercise.swift                 // Exercise model
│   │   ├── League.swift                   // League enum + progression
│   │   ├── ArenaMatch.swift               // PvP match model
│   │   ├── Guild.swift                    // Guild model
│   │   ├── BattlePass.swift               // Battle pass model
│   │   ├── NutritionEntry.swift           // Nutrition model
│   │   └── Achievement.swift              // Achievement model
│   ├── Services/
│   │   ├── AuthService.swift              // Firebase Auth wrapper
│   │   ├── FirestoreService.swift         // Firestore CRUD operations
│   │   ├── WorkoutService.swift           // Workout logging
│   │   ├── ArenaService.swift             // PvP matchmaking + battles
│   │   ├── GuildService.swift             // Guild operations
│   │   ├── LeagueService.swift            // League calculations
│   │   ├── NutritionService.swift         // Food logging + AI analysis
│   │   ├── PaymentService.swift           // StoreKit 2 subscriptions
│   │   ├── PushNotificationService.swift  // FCM + APNs
│   │   ├── CloudFunctionService.swift     // Firebase callable functions
│   │   └── PoseDetectionService.swift     // Vision + CoreML
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift
│   │   ├── DashboardViewModel.swift
│   │   ├── WorkoutViewModel.swift
│   │   ├── AILabViewModel.swift
│   │   ├── ArenaViewModel.swift
│   │   ├── NutritionViewModel.swift
│   │   ├── ProfileViewModel.swift
│   │   └── LeagueViewModel.swift
│   ├── Views/
│   │   ├── Auth/
│   │   │   ├── LoginView.swift
│   │   │   ├── PinEntryView.swift
│   │   │   └── OnboardingView.swift
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift
│   │   │   ├── StatsView.swift
│   │   │   └── ProgressChartsView.swift
│   │   ├── Workout/
│   │   │   ├── WorkoutView.swift
│   │   │   ├── ExerciseDetailView.swift
│   │   │   ├── WorkoutLogView.swift
│   │   │   └── CardioView.swift
│   │   ├── AILab/
│   │   │   ├── AILabView.swift
│   │   │   ├── CameraOverlayView.swift
│   │   │   └── FormCorrectionView.swift
│   │   ├── Coach/
│   │   │   └── CoachView.swift
│   │   ├── Arena/
│   │   │   ├── ArenaView.swift
│   │   │   ├── GhostMatchView.swift
│   │   │   ├── GuildView.swift
│   │   │   ├── GuildDashboardView.swift
│   │   │   └── CommunityBossView.swift
│   │   ├── Nutrition/
│   │   │   └── NutritionView.swift
│   │   ├── Profile/
│   │   │   ├── ProfileHubView.swift
│   │   │   ├── PlayerCardView.swift
│   │   │   ├── AchievementsView.swift
│   │   │   └── SettingsView.swift
│   │   ├── Gamification/
│   │   │   ├── LeagueView.swift
│   │   │   ├── BattlePassView.swift
│   │   │   ├── DailyChallengesView.swift
│   │   │   └── ChronicleView.swift
│   │   └── Shared/
│   │       ├── GlassCard.swift
│   │       ├── IronCoreTabBar.swift
│   │       ├── LoadingView.swift
│   │       ├── PremiumGateView.swift
│   │       └── PullToRefresh.swift
│   ├── Components/
│   │   ├── Icons/
│   │   │   ├── EliteIcons.swift           // Custom SVG icons (angular, no curves)
│   │   │   └── IronCoreIcons.swift        // Large 100x100 icons
│   │   ├── Charts/
│   │   │   ├── WorkoutChart.swift
│   │   │   ├── StreakHeatmap.swift
│   │   │   └── ProgressRing.swift
│   │   └── Common/
│   │       ├── AnimatedButton.swift
│   │       ├── StatBadge.swift
│   │       └── ToastView.swift
│   ├── Context/
│   │   ├── PremiumManager.swift           // Premium state (ObservableObject)
│   │   └── UserSession.swift              // Current user state
│   ├── Utils/
│   │   ├── PlayerIdentity.swift           // SHA-256 device fingerprint
│   │   ├── HapticEngine.swift             // CoreHaptics wrapper
│   │   └── DateFormatters.swift
│   └── Resources/
│       ├── Assets.xcassets
│       ├── GoogleService-Info.plist
│       └── IronCoreFit.entitlements
└── IronCoreFit.xcodeproj
```

---

## FIRESTORE DATA MODELS (MUST MATCH EXACTLY)

These are the exact Firestore collections and fields used by the React app. The iOS app MUST read/write the same structure so users can switch platforms.

### users/{uid}
```swift
struct IronCoreUser: Codable, Identifiable {
    var id: String                    // Firebase UID
    var displayName: String
    var email: String
    var photoURL: String?
    var pin: String?                  // SHA-256 hashed PIN
    var premium: Bool
    var premiumExpiry: Date?
    var premiumPlan: String?          // "monthly" | "yearly"
    var league: String                // "iron" | "bronze" | "silver" | "gold" | "platinum" | "diamond"
    var leaguePoints: Int
    var xp: Int
    var level: Int
    var streak: Int
    var longestStreak: Int
    var totalWorkouts: Int
    var joinedAt: Date
    var lastWorkout: Date?
    var guildId: String?
    var battlePassSeason: Int?
    var battlePassTier: Int?
    var battlePassXP: Int?
    var achievements: [String]        // achievement IDs
    var settings: UserSettings?
}
```

### users/{uid}/workouts/{workoutId}
```swift
struct Workout: Codable, Identifiable {
    var id: String
    var type: String                  // "strength" | "cardio" | "flexibility"
    var name: String
    var exercises: [Exercise]
    var duration: Int                 // seconds
    var caloriesBurned: Int
    var startedAt: Date
    var completedAt: Date
    var xpEarned: Int
}

struct Exercise: Codable {
    var name: String
    var sets: [ExerciseSet]
    var muscleGroup: String
}

struct ExerciseSet: Codable {
    var reps: Int
    var weight: Double
    var completed: Bool
}
```

### users/{uid}/nutrition/{date}
```swift
struct NutritionDay: Codable {
    var date: String                  // "YYYY-MM-DD"
    var meals: [Meal]
    var totalCalories: Int
    var totalProtein: Double
    var totalCarbs: Double
    var totalFat: Double
}

struct Meal: Codable {
    var name: String
    var calories: Int
    var protein: Double
    var carbs: Double
    var fat: Double
    var time: Date
    var aiAnalyzed: Bool?
}
```

### arenaMatches/{matchId}
```swift
struct ArenaMatch: Codable, Identifiable {
    var id: String
    var player1Id: String
    var player2Id: String
    var player1Score: Int
    var player2Score: Int
    var status: String                // "pending" | "active" | "completed"
    var winnerId: String?
    var exercise: String
    var createdAt: Date
    var completedAt: Date?
}
```

### guilds/{guildId}
```swift
struct Guild: Codable, Identifiable {
    var id: String
    var name: String
    var ownerId: String
    var members: [String]             // array of UIDs
    var memberCount: Int
    var totalXP: Int
    var league: String
    var createdAt: Date
    var description: String?
    var iconURL: String?
}
```

---

## FEATURE BUILD ORDER

### Phase 1: Core (Week 1-2)
1. **Auth Flow** — Firebase Auth with Email, Google Sign-In, Apple Sign-In
   - Reference: `src/views/LoginScreen.jsx`, `src/views/PinEntryView.jsx`
   - PIN entry with SHA-256 hashing (stored in Firestore, NOT local)
   - Auth state persistence
   - Auto-login on app relaunch

2. **Onboarding** — 5-screen flow
   - Reference: `src/views/OnboardingView.jsx`
   - Welcome > Goal Selection > AI Intro > First Workout Preview > Premium Upsell
   - Write onboarding completion to Firestore

3. **Tab Navigation** — 5 tabs
   - Reference: `src/App.jsx` (tab routing logic)
   - Home (Dashboard), Workouts, AI Coach, Progress, Profile
   - Custom tab bar with IronCore icons
   - Direction-aware page transitions

### Phase 2: Workout Core (Week 2-3)
4. **Dashboard** — Home screen with stats overview
   - Reference: `src/views/DashboardView.jsx`
   - Weekly workout chart (Swift Charts)
   - Streak display + heatmap
   - Quick-action cards
   - Pull-to-refresh

5. **Workout Tracking** — Log workouts
   - Reference: `src/views/WorkoutView.jsx`
   - Exercise library with muscle group filters
   - Set tracking (reps, weight)
   - Timer for rest periods
   - Auto-calculate XP earned
   - Write to `users/{uid}/workouts/`

6. **Cardio Tracking**
   - Reference: `src/views/CardioView.jsx`
   - Timer-based cardio sessions
   - Calorie estimation

### Phase 3: AI Features (Week 3-4)
7. **AI Form Correction** — THE KEY DIFFERENTIATOR
   - Reference: `src/views/AILabView.jsx`
   - Use AVFoundation for camera feed
   - Apple Vision framework for pose detection (VNDetectHumanBodyPoseRequest)
   - CoreML model for form analysis
   - Real-time overlay showing joint angles, corrections
   - Rep counting from pose data
   - This is the MOAT — make it excellent

8. **AI Coach Chat**
   - Reference: `src/views/CoachView.jsx`
   - Call the `callGemini` Cloud Function (NOT client-side API key)
   - Chat UI with message history
   - Context-aware (knows user's workout history)
   - Rate limited: 3 calls/day free, unlimited for premium

### Phase 4: Gamification (Week 4-5)
9. **League System**
   - Reference: `src/services/leagueService.js`
   - Iron > Bronze > Silver > Gold > Platinum > Diamond
   - Points from workouts, streaks, challenges
   - Weekly leaderboards per league

10. **Arena Battles (PvP)**
    - Reference: `src/views/ArenaView.jsx`, `src/services/arenaService.js`
    - Matchmaking via Cloud Function
    - Real-time battle updates via Firestore listeners
    - Ghost matches (async PvP)

11. **Guilds**
    - Reference: `src/services/guildService.js`, `src/components/Arena/Guilds.jsx`
    - Create/join guilds
    - Guild leaderboard
    - Collective XP tracking

12. **Battle Pass**
    - Reference: `src/views/BattlePassView.jsx`
    - Seasonal tiers with rewards
    - Free + Premium tracks
    - XP progression
    - Read from Firestore `battlePass/{seasonId}`

13. **Daily Challenges**
    - Reference: `src/components/Gamification/DailyChallenges.jsx`
    - Daily rotating challenges
    - Claim rewards (persist to Firestore)

### Phase 5: Nutrition & Progress (Week 5-6)
14. **Nutrition Tracking**
    - Reference: `src/views/NutritionView.jsx`
    - Manual food logging
    - AI food analysis (photo > Cloud Function > Gemini)
    - Daily macro tracking
    - Calorie goals

15. **Progress Dashboard**
    - Reference: `src/views/StatsView.jsx`
    - Charts: weight over time, workout frequency, strength progression
    - Streak heatmap (GitHub-style)
    - Achievement badges
    - Progress photos

16. **Player Card**
    - Reference: `src/views/PlayerCardView.jsx`
    - Shareable profile card with stats
    - League badge, level, achievements

### Phase 6: Monetization & Polish (Week 6-7)
17. **StoreKit 2 Subscriptions**
    - Products: Monthly ($12.99), Yearly ($79.99), Battle Pass ($4.99-$9.99)
    - Transaction verification via Cloud Function
    - Premium gating throughout app
    - Restore purchases support

18. **Push Notifications**
    - FCM integration via Firebase Messaging
    - APNs configuration
    - Notification categories: workout reminders, streak warnings, arena updates, guild activity

19. **Achievements System**
    - Reference: `src/views/AchievementsView.jsx`
    - Achievement definitions + progress tracking
    - Unlock animations
    - Share achievements

---

## DESIGN SYSTEM

### Colors
```swift
extension Color {
    static let ironRed = Color(hex: "#dc2626")
    static let ironRedLight = Color(hex: "#ef4444")
    static let ironRedExtraLight = Color(hex: "#f87171")
    static let ironRedDark = Color(hex: "#b91c1c")
    static let ironRedDeep = Color(hex: "#991b1b")
    static let ironBlack = Color(hex: "#000000")
    static let ironDarkGray = Color(hex: "#111111")
    static let ironMediumGray = Color(hex: "#1a1a1a")
    static let ironLightGray = Color(hex: "#262626")
    static let ironTextPrimary = Color.white
    static let ironTextSecondary = Color(hex: "#a3a3a3")
}
```

### GlassCard Component
```swift
struct GlassCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
    }
}
```

### Typography
- Use system font (SF Pro) with these weights:
  - Headers: `.bold` or `.heavy`
  - Body: `.regular`
  - Captions: `.medium` with `.secondary` foreground
- Generous spacing, no clutter

### Icons
- Replicate the custom angular SVG icons from `src/components/EliteIcons.jsx`
- Use SwiftUI `Path` for custom shapes (M and L commands only, no curves)
- System SF Symbols as fallback

---

## CLOUD FUNCTION CALLS

The iOS app calls the same Cloud Functions as the React app. Use Firebase Functions SDK:

```swift
import FirebaseFunctions

class CloudFunctionService {
    private let functions = Functions.functions()

    func callFunction<T: Decodable>(_ name: String, data: [String: Any]) async throws -> T {
        let result = try await functions.httpsCallable(name).call(data)
        let jsonData = try JSONSerialization.data(withJSONObject: result.data as Any)
        return try JSONDecoder().decode(T.self, from: jsonData)
    }
}
```

Available Cloud Functions:
- `createRazorpayOrder` — Create payment order (INDIA ONLY, iOS uses StoreKit 2 instead)
- `verifyPayment` — Verify payment (use for Apple receipt verification)
- `getAICoachResponse` — AI coach chat
- `analyzeFood` — AI food analysis from photo
- `matchmake` — Arena PvP matchmaking
- `dealBossDamage` — Community boss damage
- `calculateLeagues` — League promotion/demotion (scheduled)
- `checkExpiredSubscriptions` — Sub expiry (scheduled)

---

## STOREKIT 2 IMPLEMENTATION

```swift
import StoreKit

class PaymentService: ObservableObject {
    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []

    let productIDs = [
        "com.ironcore.fit.premium.monthly",   // $12.99/mo
        "com.ironcore.fit.premium.yearly",     // $79.99/yr
        "com.ironcore.fit.battlepass.s1"       // $4.99-9.99
    ]

    func loadProducts() async {
        products = try await Product.products(for: Set(productIDs))
    }

    func purchase(_ product: Product) async throws -> Transaction? {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            // Verify server-side via Cloud Function
            await verifyWithServer(transaction)
            await transaction.finish()
            return transaction
        case .pending, .userCancelled:
            return nil
        @unknown default:
            return nil
        }
    }

    private func verifyWithServer(_ transaction: Transaction) async {
        // Call verifyPayment Cloud Function with Apple receipt
        // Update Firestore premium status server-side
    }
}
```

---

## POSE DETECTION (AI FORM CORRECTION)

```swift
import Vision
import AVFoundation

class PoseDetectionService: ObservableObject {
    @Published var bodyPose: VNHumanBodyPoseObservation?
    @Published var formFeedback: [String] = []

    private let poseRequest = VNDetectHumanBodyPoseRequest()

    func processFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
        try? handler.perform([poseRequest])

        if let observation = poseRequest.results?.first {
            DispatchQueue.main.async {
                self.bodyPose = observation
                self.analyzeForm(observation)
            }
        }
    }

    private func analyzeForm(_ pose: VNHumanBodyPoseObservation) {
        // Extract joint positions
        guard let leftShoulder = try? pose.recognizedPoint(.leftShoulder),
              let leftElbow = try? pose.recognizedPoint(.leftElbow),
              let leftWrist = try? pose.recognizedPoint(.leftWrist) else { return }

        // Calculate joint angles
        let elbowAngle = calculateAngle(
            point1: leftShoulder.location,
            vertex: leftElbow.location,
            point2: leftWrist.location
        )

        // Provide form feedback based on exercise
        // This is where the AI magic happens
        var feedback: [String] = []
        if elbowAngle < 80 {
            feedback.append("Extend your arm more at the bottom of the curl")
        }
        formFeedback = feedback
    }

    private func calculateAngle(point1: CGPoint, vertex: CGPoint, point2: CGPoint) -> Double {
        let v1 = CGVector(dx: point1.x - vertex.x, dy: point1.y - vertex.y)
        let v2 = CGVector(dx: point2.x - vertex.x, dy: point2.y - vertex.y)
        let angle = atan2(v2.dy, v2.dx) - atan2(v1.dy, v1.dx)
        return abs(angle * 180 / .pi)
    }
}
```

---

## PREMIUM GATING

```swift
class PremiumManager: ObservableObject {
    @Published var isPremium: Bool = false
    @Published var premiumExpiry: Date?

    // NEVER use a dev override flag in production
    // Premium status comes ONLY from Firestore

    func checkPremiumStatus(uid: String) async {
        let doc = try? await Firestore.firestore()
            .collection("users").document(uid).getDocument()
        isPremium = doc?.data()?["premium"] as? Bool ?? false
        // Also verify via StoreKit 2 entitlements as backup
    }
}

// Usage in views:
struct PremiumGateView<Content: View>: View {
    @EnvironmentObject var premium: PremiumManager
    let content: Content

    var body: some View {
        if premium.isPremium {
            content
        } else {
            UpgradePromptView()
        }
    }
}
```

---

## PRICING (In-App Purchase)
- Free tier: Basic tracking + 3 AI coach calls/day
- Premium Monthly: $12.99/mo — unlimited form correction, AI coaching, full leagues
- Premium Yearly: $79.99/yr — same as monthly, better value
- Battle Pass: $4.99-$9.99/season — seasonal challenges + cosmetics

---

## IMPORTANT RULES
1. ALL Firestore data models must match the React app exactly — users share data across platforms
2. Cloud Functions are shared — call the same endpoints, do NOT duplicate logic client-side
3. Premium status comes from Firestore ONLY — never hardcode or bypass
4. The AI form correction (Vision + CoreML) is the #1 differentiator — invest the most time here
5. Dark theme ONLY — pure black background, red accent, glass cards
6. No cleartext network traffic — use App Transport Security (default on iOS)
7. Store sensitive data in Keychain, not UserDefaults
8. PIN hashes go to Firestore, not local storage
9. Test on real device for camera/pose detection features
10. Build must compile before every commit
