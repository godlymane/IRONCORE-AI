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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ironcore.fit.ui.auth.AuthViewModel
import com.ironcore.fit.ui.auth.LoginScreen
import com.ironcore.fit.ui.auth.PinEntryScreen
import com.ironcore.fit.ui.auth.PinMode
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
 * LOGGED_OUT    – no Firebase user, show login screen.
 * AUTHENTICATED – user signed in, show main app shell.
 *
 * NOTE: NeedsOnboarding and NeedsPin are handled as sub-routes
 * inside the authenticated NavHost rather than as top-level states,
 * keeping the navigation stack unified and back-pressable.
 */
enum class AuthState { CHECKING, LOGGED_OUT, AUTHENTICATED }

// ══════════════════════════════════════════════════════════════════
// Root composable
// ══════════════════════════════════════════════════════════════════

/**
 * Entry-point composable wired into `MainActivity`.
 *
 * Observes Firebase auth state via [AuthViewModel] and renders
 * either the login flow or the main tabbed application.
 */
@Composable
fun AppNavigation(authViewModel: AuthViewModel = hiltViewModel()) {
    val user by authViewModel.currentUser.collectAsState()

    val authState = when {
        user == null -> AuthState.LOGGED_OUT
        else -> AuthState.AUTHENTICATED
    }

    when (authState) {
        AuthState.CHECKING -> LoadingScreen()
        AuthState.LOGGED_OUT -> LoginScreen(authViewModel = authViewModel)
        AuthState.AUTHENTICATED -> MainApp()
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

            // PIN screens
            composable(SubScreen.PIN_SETUP) {
                PinEntryScreen(
                    mode = PinMode.SETUP,
                    onComplete = { pinHash ->
                        // PIN created — navigate back
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
                        // Navigate to recovery flow
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
