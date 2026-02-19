# CLAUDE.md — IronCore Fit AI

## THE VISION — BILLION DOLLAR APP
IronCore Fit is going to be the #1 fitness app globally. The moat is real: NO mainstream competitor has real-time AI form correction via phone camera at scale. The $12.44B fitness app market is ours to take. We are building the app that makes Future ($199/mo human coaching) obsolete.

## PROJECT STATUS: NATIVE REBUILD
We have a working React/Vite/Capacitor prototype with all features built. Now we're rebuilding as FULL NATIVE — Swift (iOS) + Kotlin (Android). The React app is our reference implementation. All Firebase backend, data models, and Cloud Functions stay the same.

## WHAT IS IRONCORE FIT
- AI-powered fitness app — "Your Phone. Your Trainer."
- Real-time form correction via phone camera (pose detection)
- Gamified: leagues (Iron to Diamond), arena battles, guilds, battle pass
- Firebase project: ironcore-f68c2

## NATIVE REBUILD PLAN

### Phase 1: iOS (Swift) — BUILD FIRST
- New Xcode project at C:\Users\devda\iron-ai\ios-native\
- SwiftUI for all UI
- Firebase iOS SDK (Auth, Firestore, Cloud Functions, Storage, Messaging)
- Apple Vision framework + CoreML for pose detection (replaces TensorFlow.js)
- StoreKit 2 for subscriptions (replaces Razorpay)
- Same Firestore data models — users can switch platforms seamlessly

### Phase 2: Android (Kotlin) — AFTER iOS SHIPS
- New Android Studio project at C:\Users\devda\iron-ai\android-native\
- Jetpack Compose for all UI
- Firebase Android SDK
- ML Kit Pose Detection (replaces TensorFlow.js)
- Google Play Billing for subscriptions
- Same Firestore data models

### REFERENCE: React App Structure to Replicate
The existing React app at src/ has all features working. Use it as the blueprint:
- src/views/ — all screens (translate to SwiftUI views)
- src/services/ — business logic (translate to Swift services)
- src/context/PremiumContext.jsx — premium gating logic
- src/hooks/ — data fetching patterns (translate to Swift Combine/async-await)
- src/components/ — UI components
- functions/ — Cloud Functions (KEEP AS-IS, both platforms call them)

### KEY FEATURES TO BUILD (in order)
1. Auth flow (Firebase Auth — email, Google, Apple Sign-In)
2. Onboarding (5-screen flow: welcome, goal, AI intro, first workout, premium upsell)
3. Main tab navigation (Home, Workouts, AI Coach, Progress, Profile)
4. Workout tracking + logging
5. AI Form Correction (Apple Vision/CoreML for iOS, ML Kit for Android)
6. League system (Iron to Diamond progression)
7. Arena battles (PvP matchmaking)
8. Guilds (team features)
9. Nutrition tracking
10. Progress dashboard (charts, streaks, heatmap)
11. Premium subscription (StoreKit 2 / Google Play Billing)
12. Push notifications
13. Battle Pass system

### FIRESTORE DATA MODELS (DO NOT CHANGE — shared across platforms)
All Firestore collections and document structures stay exactly the same. The React app and native apps must be able to read/write the same data. Reference the existing React services for exact field names and types.

### CLOUD FUNCTIONS (DO NOT CHANGE)
All Cloud Functions at functions/ stay as-is. Both native apps call the same endpoints. This includes:
- Payment verification
- AI Coach rate limiting
- Matchmaking
- League calculations

## PRICING
- Free: Basic tracking + 3 AI coach calls/day
- Premium: $12.99/mo ($79.99/yr) — unlimited form correction, AI coaching, full leagues
- Battle Pass: $4.99-9.99/season — seasonal challenges, cosmetics

## COMPETITIVE MOAT
- NO mainstream fitness app has real-time AI form correction via phone camera at scale
- Native = better camera performance = better form detection = bigger moat
- 12-18 month window before major competitors enter
- Data compounds the moat — more users = better AI

## DESIGN SPEC
- Dark theme: black/dark grey backgrounds, high contrast text
- Technical feel: data overlays, HUD-style elements, precision lines
- Premium: clean typography, generous spacing, no clutter
- Think: if Peloton and a gaming HUD had a baby

## GIT WORKFLOW
- ios-native/ and android-native/ are new directories in the iron-ai repo
- Commit to dev branch
- Build must compile before commit
- Cloud Functions stay in functions/ (shared)
