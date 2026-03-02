package com.ironcore.fit.ui.navigation

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ironcore.fit.ui.auth.*
import com.ironcore.fit.ui.home.HomeScreen
import com.ironcore.fit.ui.workout.WorkoutScreen
import com.ironcore.fit.ui.coach.CoachScreen
import com.ironcore.fit.ui.arena.ArenaScreen
import com.ironcore.fit.ui.progress.ProgressScreen
import com.ironcore.fit.ui.profile.ProfileScreen
import com.ironcore.fit.ui.onboarding.OnboardingScreen
import com.ironcore.fit.ui.nutrition.NutritionScreen
import com.ironcore.fit.ui.league.LeagueScreen
import com.ironcore.fit.ui.battlepass.BattlePassScreen
import com.ironcore.fit.ui.guild.GuildScreen
import com.ironcore.fit.ui.playercard.PlayerCardScreen
import com.ironcore.fit.ui.achievements.AchievementsScreen
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Bottom tab definitions
// ══════════════════════════════════════════════════════════════════

/**
 * Sealed class representing the five main bottom-navigation tabs.
 * Each carries a route, display label, and filled / outlined icon pair
 * for the active vs. inactive state.
 */
sealed class Screen(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val iconOutlined: ImageVector
) {
    data object Home : Screen("home", "Home", Icons.Filled.Home, Icons.Outlined.Home)
    data object Arena : Screen("arena", "Arena", Icons.Filled.EmojiEvents, Icons.Outlined.EmojiEvents)
    data object Workout : Screen("workout", "Lift", Icons.Filled.FitnessCenter, Icons.Outlined.FitnessCenter)
    data object AILab : Screen("ai_lab", "AI", Icons.Filled.SmartToy, Icons.Outlined.SmartToy)
    data object Profile : Screen("profile", "Me", Icons.Filled.Person, Icons.Outlined.Person)
}

/**
 * Sub-screen route constants. These screens are pushed onto the navigation
 * stack from within a tab and do NOT show the bottom bar.
 */
object SubScreen {
    const val COACH = "coach"
    const val NUTRITION = "nutrition"
    const val STATS = "stats"
    const val PLAYER_CARD = "player_card"
    const val ACHIEVEMENTS = "achievements"
    const val SETTINGS = "settings"
    const val LEAGUE = "league"
    const val BATTLE_PASS = "battle_pass"
    const val GHOST_MATCH = "ghost_match"
    const val GUILD = "guild_dashboard"
    const val COMMUNITY_BOSS = "community_boss"
    const val DAILY_CHALLENGES = "daily_challenges"
    const val CHRONICLE = "chronicle"
    const val CARDIO = "cardio"
    const val FORM_CORRECTION = "form_correction"
    const val ONBOARDING = "onboarding"
    const val PROGRESS = "progress"
    const val PIN_SETUP = "pin_setup"
    const val PIN_VERIFY = "pin_verify"
}

private val bottomTabs = listOf(
    Screen.Home,
    Screen.Arena,
    Screen.Workout,
    Screen.AILab,
    Screen.Profile
)

// ══════════════════════════════════════════════════════════════════
// Auth state machine — mirrors the React App.jsx flow
// ══════════════════════════════════════════════════════════════════

/**
 * Top-level authentication states.
 *
 * CHECKING      – initial load, determining auth status.
 * LOGGED_OUT    – no Firebase user, show auth flow.
 * AUTHENTICATED – user signed in, show main app shell.
 */
enum class AuthState { CHECKING, LOGGED_OUT, AUTHENTICATED }

// ══════════════════════════════════════════════════════════════════
// Root composable
// ══════════════════════════════════════════════════════════════════

/**
 * Entry-point composable wired into `MainActivity`.
 *
 * Observes Firebase auth state via [AuthViewModel] and renders
 * either the multi-step auth flow or the main tabbed application.
 *
 * Auth flow steps are driven by AuthStep enum in AuthViewModel:
 *   LANDING   → LandingScreen (Create Account / Log In)
 *   USERNAME  → UsernameScreen (enter username, check availability)
 *   PIN_SETUP → PinEntryScreen (create 6-digit PIN)
 *   CREATING  → Loading spinner (account being created)
 *   REVEAL    → CardRevealScreen (recovery phrase + QR code)
 *   LOGIN     → LoginScreen (username + PIN login)
 *   RECOVERY  → RecoveryScreen (enter 12-word phrase)
 */
@Composable
fun AppNavigation(authViewModel: AuthViewModel = hiltViewModel()) {
    val user by authViewModel.currentUser.collectAsState()
    val uiState by authViewModel.uiState.collectAsState()

    val authState = when {
        user == null -> AuthState.LOGGED_OUT
        else -> AuthState.AUTHENTICATED
    }

    when (authState) {
        AuthState.CHECKING -> LoadingScreen()

        AuthState.LOGGED_OUT -> {
            // Multi-step auth flow driven by AuthStep
            when (uiState.step) {
                AuthStep.LANDING -> LandingScreen(
                    onCreateAccount = { authViewModel.goToCreateAccount() },
                    onLogin = { authViewModel.goToLogin() }
                )

                AuthStep.USERNAME -> UsernameScreen(
                    username = uiState.username,
                    usernameError = uiState.usernameError,
                    isUsernameAvailable = uiState.isUsernameAvailable,
                    isCheckingUsername = uiState.isCheckingUsername,
                    error = uiState.error,
                    onUsernameChanged = { authViewModel.onUsernameChanged(it) },
                    onConfirm = { authViewModel.confirmUsername() },
                    onBack = { authViewModel.goToLanding() }
                )

                AuthStep.PIN_SETUP -> PinEntryScreen(
                    mode = PinMode.SETUP,
                    onComplete = { pinHash -> authViewModel.onPinSetComplete(pinHash) }
                )

                AuthStep.CREATING -> CreatingAccountScreen()

                AuthStep.REVEAL -> CardRevealScreen(
                    username = uiState.username,
                    recoveryPhrase = uiState.recoveryPhrase,
                    hasSavedPhrase = uiState.hasSavedPhrase,
                    onSavedPhraseChanged = { authViewModel.setPhraseSaved(it) },
                    onContinue = { authViewModel.completeOnboarding() }
                )

                AuthStep.LOGIN -> LoginScreen(
                    loginUsername = uiState.loginUsername,
                    loginAttempts = uiState.loginAttempts,
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    onUsernameChanged = { authViewModel.onLoginUsernameChanged(it) },
                    onPinComplete = { pinHash -> authViewModel.loginWithPin(pinHash) },
                    onBack = { authViewModel.goToLanding() },
                    onRecovery = { authViewModel.goToRecovery() }
                )

                AuthStep.RECOVERY -> RecoveryScreen(
                    recoveryInput = uiState.recoveryInput,
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    onInputChanged = { authViewModel.onRecoveryInputChanged(it) },
                    onSubmit = { authViewModel.submitRecoveryPhrase() },
                    onBack = { authViewModel.goToLogin() }
                )
            }
        }

        AuthState.AUTHENTICATED -> MainApp()
    }
}

// ══════════════════════════════════════════════════════════════════
// Creating account screen — shown during AuthStep.CREATING
// ══════════════════════════════════════════════════════════════════

@Composable
private fun CreatingAccountScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = IronRed)
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "CREATING YOUR PROFILE",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Setting up your IronCore identity...",
                fontSize = 14.sp,
                color = IronTextTertiary
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Recovery screen — 12-word phrase entry
// ══════════════════════════════════════════════════════════════════

@Composable
private fun RecoveryScreen(
    recoveryInput: String,
    isLoading: Boolean,
    error: String?,
    onInputChanged: (String) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Back button
            IconButton(onClick = onBack) {
                Icon(
                    Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextPrimary
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "IRONCORE",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = IronRed,
                letterSpacing = 4.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Account Recovery",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextPrimary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Enter your 12-word recovery phrase to restore access",
                fontSize = 14.sp,
                color = IronTextTertiary
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Recovery phrase input
            OutlinedTextField(
                value = recoveryInput,
                onValueChange = onInputChanged,
                label = { Text("Recovery phrase") },
                placeholder = { Text("iron wolf thunder spark ...", color = IronTextTertiary.copy(alpha = 0.5f)) },
                minLines = 3,
                maxLines = 4,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = IronYellow,
                    unfocusedBorderColor = IronCardBorder,
                    focusedLabelColor = IronYellow,
                    unfocusedLabelColor = IronTextTertiary,
                    cursorColor = IronYellow,
                    focusedTextColor = IronTextPrimary,
                    unfocusedTextColor = IronTextPrimary
                ),
                shape = RoundedCornerShape(12.dp)
            )

            // Error message
            if (error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = error,
                    color = IronRed,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // Submit button
            Button(
                onClick = onSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = IronYellow),
                shape = RoundedCornerShape(14.dp),
                enabled = !isLoading && recoveryInput.trim().split("\\s+".toRegex()).size >= 12
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = IronBlack,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "RECOVER ACCOUNT",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        letterSpacing = 2.sp,
                        color = IronBlack
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Main app shell — tabs + NavHost
// ══════════════════════════════════════════════════════════════════

@Composable
private fun MainApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Hide the bottom bar on sub-screens (anything not in the five tabs).
    val showBottomBar = currentRoute in bottomTabs.map { it.route }

    Scaffold(
        containerColor = IronBlack,
        bottomBar = {
            if (showBottomBar) {
                IronCoreBottomBar(
                    currentRoute = currentRoute,
                    onTabSelected = { screen ->
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = { slideInHorizontally(initialOffsetX = { it }) + fadeIn() },
            exitTransition = { slideOutHorizontally(targetOffsetX = { -it }) + fadeOut() },
            popEnterTransition = { slideInHorizontally(initialOffsetX = { -it }) + fadeIn() },
            popExitTransition = { slideOutHorizontally(targetOffsetX = { it }) + fadeOut() }
        ) {
            // ── Main tabs ────────────────────────────────────────
            composable(Screen.Home.route) {
                HomeScreen(navController = navController)
            }
            composable(Screen.Arena.route) {
                ArenaScreen(navController = navController)
            }
            composable(Screen.Workout.route) {
                WorkoutScreen(navController = navController)
            }
            composable(Screen.AILab.route) {
                CoachScreen(navController = navController)
            }
            composable(Screen.Profile.route) {
                ProfileScreen(navController = navController)
            }

            // ── Sub-screens ──────────────────────────────────────
            composable(SubScreen.PROGRESS) {
                ProgressScreen(navController = navController)
            }
            composable(SubScreen.COACH) {
                CoachScreen(navController = navController)
            }

            // PIN screens (in-app PIN verify/change, separate from auth flow)
            composable(SubScreen.PIN_SETUP) {
                PinEntryScreen(
                    mode = PinMode.SETUP,
                    onComplete = { _ ->
                        navController.popBackStack()
                    }
                )
            }
            composable(SubScreen.PIN_VERIFY) {
                PinEntryScreen(
                    mode = PinMode.VERIFY,
                    onComplete = { _ ->
                        navController.popBackStack()
                    },
                    onForgot = {
                        navController.popBackStack()
                    }
                )
            }

            // ── Implemented sub-screens ──────────────────────────────
            composable(SubScreen.NUTRITION) {
                NutritionScreen(navController = navController)
            }
            composable(SubScreen.LEAGUE) {
                LeagueScreen(navController = navController)
            }
            composable(SubScreen.BATTLE_PASS) {
                BattlePassScreen(navController = navController)
            }
            composable(SubScreen.GUILD) {
                GuildScreen(navController = navController)
            }
            composable(SubScreen.PLAYER_CARD) {
                PlayerCardScreen(navController = navController)
            }
            composable(SubScreen.ACHIEVEMENTS) {
                AchievementsScreen(navController = navController)
            }
            composable(SubScreen.ONBOARDING) {
                OnboardingScreen(
                    onComplete = {
                        navController.popBackStack()
                        navController.navigate(Screen.Home.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                inclusive = true
                            }
                            launchSingleTop = true
                        }
                    }
                )
            }

            // ── Placeholder sub-screens (future phases) ──────────────
            composable(SubScreen.SETTINGS) {
                PlaceholderScreen(title = "Settings", navController = navController)
            }
            composable(SubScreen.STATS) {
                PlaceholderScreen(title = "Stats", navController = navController)
            }
            composable(SubScreen.GHOST_MATCH) {
                PlaceholderScreen(title = "Ghost Match", navController = navController)
            }
            composable(SubScreen.COMMUNITY_BOSS) {
                PlaceholderScreen(title = "Community Boss", navController = navController)
            }
            composable(SubScreen.DAILY_CHALLENGES) {
                PlaceholderScreen(title = "Daily Challenges", navController = navController)
            }
            composable(SubScreen.CHRONICLE) {
                PlaceholderScreen(title = "Chronicle", navController = navController)
            }
            composable(SubScreen.CARDIO) {
                PlaceholderScreen(title = "Cardio", navController = navController)
            }
            composable(SubScreen.FORM_CORRECTION) {
                PlaceholderScreen(title = "Form Correction", navController = navController)
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Custom bottom navigation bar — IronCore HUD styling
// ══════════════════════════════════════════════════════════════════

/**
 * Custom bottom bar with glass-morphism surface, filled/outlined icon
 * toggle, red accent indicator line, and compact labels.
 */
@Composable
private fun IronCoreBottomBar(
    currentRoute: String?,
    onTabSelected: (Screen) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(IronSurface)
    ) {
        // Top separator line
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(0.5.dp)
                .background(IronCardBorder)
                .align(Alignment.TopCenter)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            bottomTabs.forEach { screen ->
                val selected = currentRoute == screen.route

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onTabSelected(screen) }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = if (selected) screen.icon else screen.iconOutlined,
                        contentDescription = screen.label,
                        tint = if (selected) IronRed else IronTextTertiary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = screen.label,
                        fontSize = 10.sp,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (selected) IronRed else IronTextTertiary
                    )
                    // Active indicator bar
                    if (selected) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Box(
                            modifier = Modifier
                                .width(16.dp)
                                .height(2.dp)
                                .clip(RoundedCornerShape(1.dp))
                                .background(IronRed)
                        )
                    }
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Utility screens
// ══════════════════════════════════════════════════════════════════

/** Full-screen loading spinner shown during auth state resolution. */
@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = IronRed)
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "IRONCORE",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = IronRed,
                letterSpacing = 4.sp
            )
        }
    }
}

/**
 * Generic stub screen for sub-routes that are not yet implemented.
 * Shows the screen title and a back button.
 */
@Composable
private fun PlaceholderScreen(
    title: String,
    navController: NavHostController
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(IronBlack)
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextPrimary
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary
            )
        }

        Spacer(modifier = Modifier.height(48.dp))

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Coming Soon",
                color = IronTextTertiary,
                fontSize = 16.sp
            )
        }
    }
}
