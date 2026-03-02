# IRONCORE FIT — ANDROID NATIVE BUILD PROMPT

You are building the IronCore Fit Android app from scratch using Kotlin and Jetpack Compose. This is a native rebuild — NOT Capacitor, NOT a WebView. The Firebase backend, Firestore data models, and Cloud Functions are already built and shared between platforms.

## PROJECT CONTEXT
- New Android project directory: `C:\Users\devda\iron-ai\android-native\` (create Android Studio project here)
- Reference React app: `C:\Users\devda\iron-ai\src\` (use as blueprint for all features)
- Cloud Functions: `C:\Users\devda\iron-ai\functions\index.js` (shared, do NOT modify)
- Firestore rules: `C:\Users\devda\iron-ai\firestore.rules` (shared, do NOT modify)
- Firebase project ID: `ironcore-f68c2`
- Package name: `com.ironcore.fit`
- Minimum SDK: 26 (Android 8.0)
- Target SDK: 35 (Android 15)
- Design: dark theme, pure black backgrounds, red (#dc2626) accent, glass-morphism cards, HUD-style elements

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| UI Framework | Jetpack Compose (Material 3) |
| Architecture | MVVM with Kotlin Coroutines + Flow |
| Navigation | Compose Navigation (NavHost) |
| DI | Hilt (Dagger) |
| Auth | Firebase Auth (Email, Google Sign-In) |
| Database | Cloud Firestore |
| Cloud Functions | Firebase Functions (callable) |
| Storage | Firebase Storage |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| AI Form Correction | ML Kit Pose Detection |
| Payments | Google Play Billing Library 7+ |
| Charts | Vico (Compose charts library) |
| Camera | CameraX (Jetpack) |
| Animations | Compose animations + shared element transitions |
| Haptics | Android VibrationEffect API |
| Image Loading | Coil (Compose) |
| Serialization | Kotlinx Serialization |

---

## GRADLE SETUP

### project-level build.gradle.kts
```kotlin
plugins {
    id("com.android.application") version "8.7.0" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.0" apply false
    id("com.google.gms.google-services") version "4.4.2" apply false
    id("com.google.dagger.hilt.android") version "2.51.1" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.0" apply false
}
```

### app-level build.gradle.kts
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
    id("com.google.dagger.hilt.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    kotlin("kapt")
}

android {
    namespace = "com.ironcore.fit"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ironcore.fit"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    // Only ship ARM architectures
    defaultConfig {
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }
    }
}

dependencies {
    // Compose BOM
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.5")

    // Firebase BOM
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-functions-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")

    // Google Sign-In
    implementation("com.google.android.gms:play-services-auth:21.3.0")
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // Hilt DI
    implementation("com.google.dagger:hilt-android:2.51.1")
    kapt("com.google.dagger:hilt-android-compiler:2.51.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // ML Kit Pose Detection
    implementation("com.google.mlkit:pose-detection:18.0.0-beta5")
    implementation("com.google.mlkit:pose-detection-accurate:18.0.0-beta5")

    // CameraX
    val cameraxVersion = "1.4.1"
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")

    // Google Play Billing
    implementation("com.android.billingclient:billing-ktx:7.1.1")

    // Charts
    implementation("com.patrykandpatrick.vico:compose-m3:2.0.0-beta.2")

    // Image loading
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Kotlinx Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // DataStore (for local preferences)
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Splash Screen
    implementation("androidx.core:core-splashscreen:1.0.1")
}
```

### AndroidManifest.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="com.android.vending.BILLING" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application
        android:name=".IronCoreApp"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="IronCore Fit"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/Theme.IronCoreFit"
        android:supportsRtl="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.IronCoreFit.Splash">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.IronCoreFCMService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>
</manifest>
```

### network_security_config.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

---

## FIREBASE SETUP

### 1. Add Android App to Firebase Console
- Go to Firebase Console > ironcore-f68c2 > Project Settings > Add App > Android
- Package name: `com.ironcore.fit`
- Download `google-services.json` to `android-native/app/`
- Add SHA-1 and SHA-256 fingerprints for Google Sign-In

### 2. Initialize Firebase
```kotlin
// IronCoreApp.kt
@HiltAndroidApp
class IronCoreApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Firebase auto-initializes via google-services.json
    }
}
```

---

## APP ARCHITECTURE (MVVM + Hilt)

### Project Structure
```
android-native/
├── app/
│   ├── src/main/
│   │   ├── java/com/ironcore/fit/
│   │   │   ├── IronCoreApp.kt                    // Application class
│   │   │   ├── MainActivity.kt                    // Single activity
│   │   │   ├── di/
│   │   │   │   ├── AppModule.kt                   // Hilt module: Firebase, services
│   │   │   │   └── RepositoryModule.kt            // Hilt module: repositories
│   │   │   ├── data/
│   │   │   │   ├── model/
│   │   │   │   │   ├── User.kt                    // Firestore user model
│   │   │   │   │   ├── Workout.kt                 // Workout + Exercise + Set
│   │   │   │   │   ├── NutritionDay.kt            // Nutrition model
│   │   │   │   │   ├── ArenaMatch.kt              // PvP match model
│   │   │   │   │   ├── Guild.kt                   // Guild model
│   │   │   │   │   ├── BattlePass.kt              // Battle pass model
│   │   │   │   │   ├── League.kt                  // League enum
│   │   │   │   │   └── Achievement.kt             // Achievement model
│   │   │   │   ├── repository/
│   │   │   │   │   ├── AuthRepository.kt           // Firebase Auth
│   │   │   │   │   ├── UserRepository.kt           // User Firestore ops
│   │   │   │   │   ├── WorkoutRepository.kt        // Workout CRUD
│   │   │   │   │   ├── ArenaRepository.kt          // Arena + matchmaking
│   │   │   │   │   ├── GuildRepository.kt          // Guild ops
│   │   │   │   │   ├── NutritionRepository.kt      // Nutrition CRUD
│   │   │   │   │   ├── LeagueRepository.kt         // League data
│   │   │   │   │   ├── BattlePassRepository.kt     // Battle pass data
│   │   │   │   │   └── AchievementRepository.kt    // Achievements
│   │   │   │   └── service/
│   │   │   │       ├── CloudFunctionService.kt     // Firebase callable functions
│   │   │   │       ├── BillingService.kt           // Google Play Billing
│   │   │   │       ├── PoseDetectionService.kt     // ML Kit pose detection
│   │   │   │       ├── PushNotificationService.kt  // FCM service
│   │   │   │       └── IronCoreFCMService.kt       // FCM message handler
│   │   │   ├── ui/
│   │   │   │   ├── theme/
│   │   │   │   │   ├── Color.kt                    // IronCore color palette
│   │   │   │   │   ├── Theme.kt                    // Dark-only Material 3 theme
│   │   │   │   │   ├── Type.kt                     // Typography
│   │   │   │   │   └── Shape.kt                    // Card shapes
│   │   │   │   ├── navigation/
│   │   │   │   │   ├── IronCoreNavHost.kt          // NavHost with all routes
│   │   │   │   │   ├── Screen.kt                   // Sealed class of routes
│   │   │   │   │   └── IronCoreTabBar.kt           // Bottom navigation bar
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   ├── LoginViewModel.kt
│   │   │   │   │   ├── PinEntryScreen.kt
│   │   │   │   │   ├── PinEntryViewModel.kt
│   │   │   │   │   ├── OnboardingScreen.kt
│   │   │   │   │   └── OnboardingViewModel.kt
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── DashboardScreen.kt
│   │   │   │   │   ├── DashboardViewModel.kt
│   │   │   │   │   ├── StatsScreen.kt
│   │   │   │   │   └── ProgressChartsScreen.kt
│   │   │   │   ├── workout/
│   │   │   │   │   ├── WorkoutScreen.kt
│   │   │   │   │   ├── WorkoutViewModel.kt
│   │   │   │   │   ├── ExerciseDetailScreen.kt
│   │   │   │   │   ├── WorkoutLogScreen.kt
│   │   │   │   │   └── CardioScreen.kt
│   │   │   │   ├── ailab/
│   │   │   │   │   ├── AILabScreen.kt
│   │   │   │   │   ├── AILabViewModel.kt
│   │   │   │   │   ├── CameraPreview.kt
│   │   │   │   │   ├── PoseOverlay.kt
│   │   │   │   │   └── FormCorrectionScreen.kt
│   │   │   │   ├── coach/
│   │   │   │   │   ├── CoachScreen.kt
│   │   │   │   │   └── CoachViewModel.kt
│   │   │   │   ├── arena/
│   │   │   │   │   ├── ArenaScreen.kt
│   │   │   │   │   ├── ArenaViewModel.kt
│   │   │   │   │   ├── GhostMatchScreen.kt
│   │   │   │   │   ├── GuildScreen.kt
│   │   │   │   │   ├── GuildDashboardScreen.kt
│   │   │   │   │   └── CommunityBossScreen.kt
│   │   │   │   ├── nutrition/
│   │   │   │   │   ├── NutritionScreen.kt
│   │   │   │   │   └── NutritionViewModel.kt
│   │   │   │   ├── profile/
│   │   │   │   │   ├── ProfileHubScreen.kt
│   │   │   │   │   ├── ProfileViewModel.kt
│   │   │   │   │   ├── PlayerCardScreen.kt
│   │   │   │   │   ├── AchievementsScreen.kt
│   │   │   │   │   └── SettingsScreen.kt
│   │   │   │   ├── gamification/
│   │   │   │   │   ├── LeagueScreen.kt
│   │   │   │   │   ├── BattlePassScreen.kt
│   │   │   │   │   ├── DailyChallengesScreen.kt
│   │   │   │   │   └── ChronicleScreen.kt
│   │   │   │   └── components/
│   │   │   │       ├── GlassCard.kt
│   │   │   │       ├── LoadingIndicator.kt
│   │   │   │       ├── PremiumGate.kt
│   │   │   │       ├── PullToRefresh.kt
│   │   │   │       ├── AnimatedButton.kt
│   │   │   │       ├── StatBadge.kt
│   │   │   │       ├── ToastHost.kt
│   │   │   │       ├── EliteIcons.kt              // Custom angular icons
│   │   │   │       ├── IronCoreIcons.kt            // Large 100x100 icons
│   │   │   │       └── StreakHeatmap.kt
│   │   │   └── util/
│   │   │       ├── PlayerIdentity.kt               // SHA-256 fingerprint
│   │   │       ├── HapticFeedback.kt               // Vibration wrapper
│   │   │       ├── DateFormatters.kt
│   │   │       └── Extensions.kt                   // Kotlin extensions
│   │   ├── res/
│   │   │   ├── xml/
│   │   │   │   └── network_security_config.xml
│   │   │   ├── values/
│   │   │   │   ├── strings.xml
│   │   │   │   ├── themes.xml
│   │   │   │   └── colors.xml
│   │   │   └── mipmap-*/                            // App icons
│   │   └── google-services.json
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

---

## FIRESTORE DATA MODELS (MUST MATCH EXACTLY)

These are the exact Firestore collections and fields used by the React app and iOS native app. All three platforms share the same data.

### users/{uid}
```kotlin
@Serializable
data class IronCoreUser(
    val uid: String = "",
    val displayName: String = "",
    val email: String = "",
    val photoURL: String? = null,
    val pin: String? = null,                  // SHA-256 hashed PIN
    val premium: Boolean = false,
    val premiumExpiry: Long? = null,           // Firestore timestamp millis
    val premiumPlan: String? = null,           // "monthly" | "yearly"
    val league: String = "iron",              // "iron"|"bronze"|"silver"|"gold"|"platinum"|"diamond"
    val leaguePoints: Int = 0,
    val xp: Int = 0,
    val level: Int = 1,
    val streak: Int = 0,
    val longestStreak: Int = 0,
    val totalWorkouts: Int = 0,
    val joinedAt: Long = 0,
    val lastWorkout: Long? = null,
    val guildId: String? = null,
    val battlePassSeason: Int? = null,
    val battlePassTier: Int? = null,
    val battlePassXP: Int? = null,
    val achievements: List<String> = emptyList(),
    val settings: UserSettings? = null
)

@Serializable
data class UserSettings(
    val notifications: Boolean = true,
    val haptics: Boolean = true,
    val units: String = "metric"              // "metric" | "imperial"
)
```

### users/{uid}/workouts/{workoutId}
```kotlin
@Serializable
data class Workout(
    val id: String = "",
    val type: String = "",                    // "strength"|"cardio"|"flexibility"
    val name: String = "",
    val exercises: List<Exercise> = emptyList(),
    val duration: Int = 0,                    // seconds
    val caloriesBurned: Int = 0,
    val startedAt: Long = 0,
    val completedAt: Long = 0,
    val xpEarned: Int = 0
)

@Serializable
data class Exercise(
    val name: String = "",
    val sets: List<ExerciseSet> = emptyList(),
    val muscleGroup: String = ""
)

@Serializable
data class ExerciseSet(
    val reps: Int = 0,
    val weight: Double = 0.0,
    val completed: Boolean = false
)
```

### users/{uid}/nutrition/{date}
```kotlin
@Serializable
data class NutritionDay(
    val date: String = "",                    // "YYYY-MM-DD"
    val meals: List<Meal> = emptyList(),
    val totalCalories: Int = 0,
    val totalProtein: Double = 0.0,
    val totalCarbs: Double = 0.0,
    val totalFat: Double = 0.0
)

@Serializable
data class Meal(
    val name: String = "",
    val calories: Int = 0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    val time: Long = 0,
    val aiAnalyzed: Boolean? = null
)
```

### arenaMatches/{matchId}
```kotlin
@Serializable
data class ArenaMatch(
    val id: String = "",
    val player1Id: String = "",
    val player2Id: String = "",
    val player1Score: Int = 0,
    val player2Score: Int = 0,
    val status: String = "pending",           // "pending"|"active"|"completed"
    val winnerId: String? = null,
    val exercise: String = "",
    val createdAt: Long = 0,
    val completedAt: Long? = null
)
```

### guilds/{guildId}
```kotlin
@Serializable
data class Guild(
    val id: String = "",
    val name: String = "",
    val ownerId: String = "",
    val members: List<String> = emptyList(),
    val memberCount: Int = 0,
    val totalXP: Int = 0,
    val league: String = "iron",
    val createdAt: Long = 0,
    val description: String? = null,
    val iconURL: String? = null
)
```

### battlePass/{seasonId}
```kotlin
@Serializable
data class BattlePassSeason(
    val id: String = "",
    val seasonNumber: Int = 0,
    val startDate: Long = 0,
    val endDate: Long = 0,
    val tiers: List<BattlePassTier> = emptyList()
)

@Serializable
data class BattlePassTier(
    val tier: Int = 0,
    val xpRequired: Int = 0,
    val freeReward: String? = null,
    val premiumReward: String? = null
)
```

---

## HILT DEPENDENCY INJECTION

### AppModule.kt
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides
    @Singleton
    fun provideFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseFunctions(): FirebaseFunctions = FirebaseFunctions.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseStorage(): FirebaseStorage = FirebaseStorage.getInstance()

    @Provides
    @Singleton
    fun providePoseDetector(): PoseDetector {
        val options = AccuratePoseDetectorOptions.Builder()
            .setDetectorMode(AccuratePoseDetectorOptions.STREAM_MODE)
            .build()
        return PoseDetection.getClient(options)
    }
}
```

---

## NAVIGATION

### Screen.kt
```kotlin
sealed class Screen(val route: String) {
    // Auth
    data object Login : Screen("login")
    data object PinEntry : Screen("pin_entry")
    data object Onboarding : Screen("onboarding")

    // Main tabs
    data object Dashboard : Screen("dashboard")
    data object Workouts : Screen("workouts")
    data object AILab : Screen("ai_lab")
    data object Arena : Screen("arena")
    data object Profile : Screen("profile")

    // Sub-screens
    data object WorkoutDetail : Screen("workout/{workoutId}") {
        fun createRoute(workoutId: String) = "workout/$workoutId"
    }
    data object ExerciseDetail : Screen("exercise/{exerciseId}")
    data object Coach : Screen("coach")
    data object Nutrition : Screen("nutrition")
    data object Stats : Screen("stats")
    data object PlayerCard : Screen("player_card")
    data object Achievements : Screen("achievements")
    data object Settings : Screen("settings")
    data object League : Screen("league")
    data object BattlePass : Screen("battle_pass")
    data object GhostMatch : Screen("ghost_match")
    data object GuildDashboard : Screen("guild_dashboard")
    data object CommunityBoss : Screen("community_boss")
    data object DailyChallenges : Screen("daily_challenges")
    data object Chronicle : Screen("chronicle")
    data object Cardio : Screen("cardio")
    data object FormCorrection : Screen("form_correction")
}
```

### IronCoreNavHost.kt
```kotlin
@Composable
fun IronCoreNavHost(
    navController: NavHostController,
    authState: AuthState,
    modifier: Modifier = Modifier
) {
    val startDestination = when (authState) {
        AuthState.LoggedOut -> Screen.Login.route
        AuthState.NeedsPin -> Screen.PinEntry.route
        AuthState.NeedsOnboarding -> Screen.Onboarding.route
        AuthState.Authenticated -> Screen.Dashboard.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
        enterTransition = { slideInHorizontally(initialOffsetX = { it }) },
        exitTransition = { slideOutHorizontally(targetOffsetX = { -it }) }
    ) {
        composable(Screen.Login.route) { LoginScreen(navController) }
        composable(Screen.PinEntry.route) { PinEntryScreen(navController) }
        composable(Screen.Onboarding.route) { OnboardingScreen(navController) }
        composable(Screen.Dashboard.route) { DashboardScreen(navController) }
        composable(Screen.Workouts.route) { WorkoutScreen(navController) }
        composable(Screen.AILab.route) { AILabScreen(navController) }
        composable(Screen.Arena.route) { ArenaScreen(navController) }
        composable(Screen.Profile.route) { ProfileHubScreen(navController) }
        composable(Screen.Coach.route) { CoachScreen(navController) }
        composable(Screen.Nutrition.route) { NutritionScreen(navController) }
        composable(Screen.Stats.route) { StatsScreen(navController) }
        composable(Screen.PlayerCard.route) { PlayerCardScreen(navController) }
        composable(Screen.Achievements.route) { AchievementsScreen(navController) }
        composable(Screen.Settings.route) { SettingsScreen(navController) }
        composable(Screen.League.route) { LeagueScreen(navController) }
        composable(Screen.BattlePass.route) { BattlePassScreen(navController) }
        composable(Screen.GhostMatch.route) { GhostMatchScreen(navController) }
        composable(Screen.GuildDashboard.route) { GuildDashboardScreen(navController) }
        composable(Screen.CommunityBoss.route) { CommunityBossScreen(navController) }
        composable(Screen.DailyChallenges.route) { DailyChallengesScreen(navController) }
        composable(Screen.Chronicle.route) { ChronicleScreen(navController) }
        composable(Screen.Cardio.route) { CardioScreen(navController) }
        composable(Screen.FormCorrection.route) { FormCorrectionScreen(navController) }
    }
}
```

---

## DESIGN SYSTEM

### Color.kt
```kotlin
object IronCoreColors {
    val Red = Color(0xFFDC2626)
    val RedLight = Color(0xFFEF4444)
    val RedExtraLight = Color(0xFFF87171)
    val RedDark = Color(0xFFB91C1C)
    val RedDeep = Color(0xFF991B1B)

    val Black = Color(0xFF000000)
    val DarkGray = Color(0xFF111111)
    val MediumGray = Color(0xFF1A1A1A)
    val LightGray = Color(0xFF262626)
    val CardBorder = Color(0x1AFFFFFF)       // white 10% opacity

    val TextPrimary = Color.White
    val TextSecondary = Color(0xFFA3A3A3)
    val TextTertiary = Color(0xFF737373)
}
```

### Theme.kt
```kotlin
private val IronCoreDarkColorScheme = darkColorScheme(
    primary = IronCoreColors.Red,
    onPrimary = Color.White,
    primaryContainer = IronCoreColors.RedDark,
    background = IronCoreColors.Black,
    surface = IronCoreColors.DarkGray,
    surfaceVariant = IronCoreColors.MediumGray,
    onBackground = IronCoreColors.TextPrimary,
    onSurface = IronCoreColors.TextPrimary,
    onSurfaceVariant = IronCoreColors.TextSecondary,
    error = Color(0xFFCF6679)
)

@Composable
fun IronCoreTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = IronCoreDarkColorScheme,
        typography = IronCoreTypography,
        shapes = IronCoreShapes,
        content = content
    )
}
```

### GlassCard.kt
```kotlin
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.08f),
                        Color.White.copy(alpha = 0.04f)
                    )
                )
            )
            .border(
                width = 1.dp,
                color = IronCoreColors.CardBorder,
                shape = RoundedCornerShape(16.dp)
            )
            .padding(16.dp)
    ) {
        content()
    }
}
```

---

## ML KIT POSE DETECTION (AI FORM CORRECTION)

```kotlin
class PoseDetectionService @Inject constructor(
    private val poseDetector: PoseDetector
) {
    private val _currentPose = MutableStateFlow<Pose?>(null)
    val currentPose: StateFlow<Pose?> = _currentPose.asStateFlow()

    private val _formFeedback = MutableStateFlow<List<String>>(emptyList())
    val formFeedback: StateFlow<List<String>> = _formFeedback.asStateFlow()

    @OptIn(ExperimentalGetImage::class)
    fun processImageProxy(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image ?: run {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(
            mediaImage,
            imageProxy.imageInfo.rotationDegrees
        )

        poseDetector.process(inputImage)
            .addOnSuccessListener { pose ->
                _currentPose.value = pose
                analyzeForm(pose)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    private fun analyzeForm(pose: Pose) {
        val leftShoulder = pose.getPoseLandmark(PoseLandmark.LEFT_SHOULDER) ?: return
        val leftElbow = pose.getPoseLandmark(PoseLandmark.LEFT_ELBOW) ?: return
        val leftWrist = pose.getPoseLandmark(PoseLandmark.LEFT_WRIST) ?: return

        val elbowAngle = calculateAngle(
            leftShoulder.position,
            leftElbow.position,
            leftWrist.position
        )

        val feedback = mutableListOf<String>()

        // Example: bicep curl form check
        if (elbowAngle < 80) {
            feedback.add("Extend your arm more at the bottom of the curl")
        }
        if (leftShoulder.position.y > leftElbow.position.y - 20) {
            feedback.add("Keep your elbow pinned to your side")
        }

        _formFeedback.value = feedback
    }

    private fun calculateAngle(p1: PointF, vertex: PointF, p2: PointF): Double {
        val v1x = p1.x - vertex.x
        val v1y = p1.y - vertex.y
        val v2x = p2.x - vertex.x
        val v2y = p2.y - vertex.y
        val angle = atan2(v2y.toDouble(), v2x.toDouble()) -
                    atan2(v1y.toDouble(), v1x.toDouble())
        return abs(Math.toDegrees(angle))
    }
}
```

### CameraX Integration
```kotlin
@Composable
fun CameraPreview(
    poseDetectionService: PoseDetectionService,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    AndroidView(
        factory = { ctx ->
            PreviewView(ctx).apply {
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = surfaceProvider
                    }

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setTargetResolution(Size(1280, 720))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { analysis ->
                            analysis.setAnalyzer(
                                ContextCompat.getMainExecutor(ctx)
                            ) { imageProxy ->
                                poseDetectionService.processImageProxy(imageProxy)
                            }
                        }

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview, imageAnalysis
                    )
                }, ContextCompat.getMainExecutor(ctx))
            }
        },
        modifier = modifier
    )
}
```

### Pose Overlay (draws skeleton on camera feed)
```kotlin
@Composable
fun PoseOverlay(
    pose: Pose?,
    imageWidth: Int,
    imageHeight: Int,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val pose = pose ?: return@Canvas

        val scaleX = size.width / imageWidth
        val scaleY = size.height / imageHeight

        // Draw skeleton connections
        val connections = listOf(
            PoseLandmark.LEFT_SHOULDER to PoseLandmark.LEFT_ELBOW,
            PoseLandmark.LEFT_ELBOW to PoseLandmark.LEFT_WRIST,
            PoseLandmark.RIGHT_SHOULDER to PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.RIGHT_ELBOW to PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_SHOULDER to PoseLandmark.LEFT_HIP,
            PoseLandmark.RIGHT_SHOULDER to PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_HIP to PoseLandmark.LEFT_KNEE,
            PoseLandmark.LEFT_KNEE to PoseLandmark.LEFT_ANKLE,
            PoseLandmark.RIGHT_HIP to PoseLandmark.RIGHT_KNEE,
            PoseLandmark.RIGHT_KNEE to PoseLandmark.RIGHT_ANKLE,
            PoseLandmark.LEFT_SHOULDER to PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_HIP to PoseLandmark.RIGHT_HIP,
        )

        connections.forEach { (startType, endType) ->
            val start = pose.getPoseLandmark(startType)
            val end = pose.getPoseLandmark(endType)
            if (start != null && end != null) {
                drawLine(
                    color = IronCoreColors.Red,
                    start = Offset(start.position.x * scaleX, start.position.y * scaleY),
                    end = Offset(end.position.x * scaleX, end.position.y * scaleY),
                    strokeWidth = 4f,
                    cap = StrokeCap.Round
                )
            }
        }

        // Draw joint dots
        pose.allPoseLandmarks.forEach { landmark ->
            drawCircle(
                color = IronCoreColors.RedLight,
                radius = 8f,
                center = Offset(landmark.position.x * scaleX, landmark.position.y * scaleY)
            )
        }
    }
}
```

---

## GOOGLE PLAY BILLING

```kotlin
class BillingService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cloudFunctionService: CloudFunctionService
) {
    private val billingClient = BillingClient.newBuilder(context)
        .setListener { billingResult, purchases ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                purchases?.forEach { purchase ->
                    handlePurchase(purchase)
                }
            }
        }
        .enablePendingPurchases()
        .build()

    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    val products: StateFlow<List<ProductDetails>> = _products.asStateFlow()

    private val _isPremium = MutableStateFlow(false)
    val isPremium: StateFlow<Boolean> = _isPremium.asStateFlow()

    val productIds = listOf(
        "com.ironcore.fit.premium.monthly",   // $12.99/mo
        "com.ironcore.fit.premium.yearly",     // $79.99/yr
        "com.ironcore.fit.battlepass.s1"        // $4.99-9.99
    )

    fun startConnection() {
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProducts()
                    queryPurchases()
                }
            }
            override fun onBillingServiceDisconnected() {
                // Retry connection
            }
        })
    }

    private fun queryProducts() {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                productIds.map { productId ->
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                }
            ).build()

        billingClient.queryProductDetailsAsync(params) { result, productDetailsList ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                _products.value = productDetailsList
            }
        }
    }

    fun launchPurchaseFlow(activity: Activity, productDetails: ProductDetails) {
        val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: return
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .setOfferToken(offerToken)
                        .build()
                )
            ).build()

        billingClient.launchBillingFlow(activity, params)
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Verify server-side via Cloud Function
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    cloudFunctionService.verifyGooglePlayPurchase(
                        purchaseToken = purchase.purchaseToken,
                        productId = purchase.products.first()
                    )
                    // Acknowledge the purchase
                    val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build()
                    billingClient.acknowledgePurchase(acknowledgePurchaseParams) {}
                    _isPremium.value = true
                } catch (e: Exception) {
                    // Handle verification failure
                }
            }
        }
    }

    private fun queryPurchases() {
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        ) { result, purchases ->
            _isPremium.value = purchases.any {
                it.purchaseState == Purchase.PurchaseState.PURCHASED
            }
        }
    }
}
```

---

## CLOUD FUNCTION CALLS

```kotlin
class CloudFunctionService @Inject constructor(
    private val functions: FirebaseFunctions
) {
    suspend fun <T> callFunction(name: String, data: Map<String, Any>): T {
        return suspendCoroutine { cont ->
            functions.getHttpsCallable(name)
                .call(data)
                .addOnSuccessListener { result ->
                    @Suppress("UNCHECKED_CAST")
                    cont.resume(result.data as T)
                }
                .addOnFailureListener { e ->
                    cont.resumeWithException(e)
                }
        }
    }

    // Specific functions
    suspend fun getAICoachResponse(message: String, context: String): Map<String, Any> {
        return callFunction("getAICoachResponse", mapOf("message" to message, "context" to context))
    }

    suspend fun analyzeFood(mealText: String?, imageBase64: String?): Map<String, Any> {
        val data = mutableMapOf<String, Any>()
        mealText?.let { data["mealText"] = it }
        imageBase64?.let { data["imageBase64"] = it }
        return callFunction("analyzeFood", data)
    }

    suspend fun matchmake(): Map<String, Any> {
        return callFunction("matchmake", emptyMap())
    }

    suspend fun dealBossDamage(bossId: String, damage: Int): Map<String, Any> {
        return callFunction("dealBossDamage", mapOf("bossId" to bossId, "damage" to damage))
    }

    suspend fun verifyGooglePlayPurchase(purchaseToken: String, productId: String): Map<String, Any> {
        return callFunction("verifyPayment", mapOf(
            "platform" to "android",
            "purchaseToken" to purchaseToken,
            "productId" to productId
        ))
    }
}
```

---

## PREMIUM GATING

```kotlin
class PremiumManager @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _isPremium = MutableStateFlow(false)
    val isPremium: StateFlow<Boolean> = _isPremium.asStateFlow()

    // NEVER use a dev override flag — premium comes ONLY from Firestore

    fun observePremiumStatus() {
        val uid = auth.currentUser?.uid ?: return
        firestore.collection("users").document(uid)
            .addSnapshotListener { snapshot, _ ->
                _isPremium.value = snapshot?.getBoolean("premium") ?: false
            }
    }
}

// Usage: gate premium content
@Composable
fun PremiumGate(
    isPremium: Boolean,
    content: @Composable () -> Unit
) {
    if (isPremium) {
        content()
    } else {
        UpgradePromptScreen()
    }
}
```

---

## FEATURE BUILD ORDER

### Phase 1: Core (Week 1-2)
1. **Auth Flow** — Firebase Auth with Email + Google Sign-In
   - Reference: `src/views/LoginScreen.jsx`, `src/views/PinEntryView.jsx`
   - PIN hashed with SHA-256, stored in Firestore (NOT SharedPreferences)
   - Credential Manager API for Google Sign-In
   - Auth state persistence

2. **Onboarding** — 5-screen HorizontalPager flow
   - Reference: `src/views/OnboardingView.jsx`
   - Welcome > Goal > AI Intro > First Workout > Premium Upsell
   - Write onboarding completion flag to Firestore

3. **Tab Navigation** — 5 bottom tabs
   - Reference: `src/App.jsx`
   - Home, Workouts, AI Coach, Progress, Profile
   - Custom tab bar with IronCore icons
   - Direction-aware slide transitions

### Phase 2: Workout Core (Week 2-3)
4. **Dashboard** — Stats overview with charts
5. **Workout Tracking** — Exercise logging with sets/reps/weight
6. **Cardio Tracking** — Timer-based sessions

### Phase 3: AI Features (Week 3-4)
7. **AI Form Correction** — CameraX + ML Kit Pose Detection (THE MOAT)
8. **AI Coach Chat** — Cloud Function calls to Gemini

### Phase 4: Gamification (Week 4-5)
9. **League System** — Iron through Diamond progression
10. **Arena Battles** — PvP matchmaking via Cloud Functions
11. **Guilds** — Create/join/leave with Firestore
12. **Battle Pass** — Seasonal tiers from Firestore (NOT hardcoded)
13. **Daily Challenges** — Persisted to Firestore (NOT local state only)

### Phase 5: Nutrition & Progress (Week 5-6)
14. **Nutrition Tracking** — Manual + AI photo analysis
15. **Progress Dashboard** — Vico charts, streak heatmap
16. **Player Card** — Shareable profile

### Phase 6: Monetization & Polish (Week 6-7)
17. **Google Play Billing** — Subscriptions + Battle Pass IAP
18. **Push Notifications** — FCM integration
19. **Achievements** — Unlock tracking + animations

---

## PROGUARD RULES (proguard-rules.pro)
```
# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# ML Kit
-keep class com.google.mlkit.** { *; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.ironcore.fit.**$$serializer { *; }
-keepclassmembers class com.ironcore.fit.** {
    *** Companion;
}
-keepclasseswithmembers class com.ironcore.fit.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Data models — keep for Firestore
-keep class com.ironcore.fit.data.model.** { *; }
```

---

## IMPORTANT RULES
1. ALL Firestore data models must match the React and iOS apps exactly — users share data
2. Cloud Functions are shared — call the same endpoints, do NOT duplicate logic
3. Premium status comes from Firestore ONLY — NEVER hardcode `isPremium = true`
4. ML Kit Pose Detection is the #1 differentiator — invest the most time here
5. Dark theme ONLY — pure black background, red accent, glass cards
6. `android:allowBackup="false"` — always
7. Network security config blocks cleartext — always
8. PIN hashes stored in Firestore, NEVER in SharedPreferences/DataStore
9. Use EncryptedSharedPreferences for any local secrets
10. R8/ProGuard enabled for release builds — test thoroughly
11. Test on real device for camera/pose detection
12. Build must compile before every commit
13. No dev buttons or force-premium flags in production code — EVER
