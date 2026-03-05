package com.ironcore.fit.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import com.ironcore.fit.ui.components.*
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
// Auth state machine
// ══════════════════════════════════════════════════════════════════

enum class AuthState { CHECKING, LOGGED_OUT, AUTHENTICATED }

// ══════════════════════════════════════════════════════════════════
// Root composable
// ══════════════════════════════════════════════════════════════════

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
// Creating account screen
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
// Recovery screen — glass morphism styled
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

            // Glass recovery input
            GlassInput(
                value = recoveryInput,
                onValueChange = onInputChanged,
                placeholder = "iron wolf thunder spark ...",
                singleLine = false,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 100.dp)
            )

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

            GlassButton(
                text = if (isLoading) "" else "RECOVER ACCOUNT",
                onClick = onSubmit,
                variant = ButtonVariant.PRIMARY,
                enabled = !isLoading && recoveryInput.trim().split("\\s+".toRegex()).size >= 12,
                isLoading = isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "RECOVER ACCOUNT",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        letterSpacing = 2.sp,
                        color = Color.White
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

    val showBottomBar = currentRoute in bottomTabs.map { it.route }

    Box(modifier = Modifier.fillMaxSize().background(IronBlack)) {
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (showBottomBar) Modifier.padding(bottom = 80.dp) else Modifier
                ),
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

            composable(SubScreen.PIN_SETUP) {
                PinEntryScreen(
                    mode = PinMode.SETUP,
                    onComplete = { _ -> navController.popBackStack() }
                )
            }
            composable(SubScreen.PIN_VERIFY) {
                PinEntryScreen(
                    mode = PinMode.VERIFY,
                    onComplete = { _ -> navController.popBackStack() },
                    onForgot = { navController.popBackStack() }
                )
            }

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

            // ── Placeholder sub-screens ──────────────────────────
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

        // ── Floating pill bottom bar ─────────────────────────────
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
                },
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// Floating Pill Bottom Bar — matches React floating nav exactly
// ══════════════════════════════════════════════════════════════════

@Composable
private fun IronCoreBottomBar(
    currentRoute: String?,
    onTabSelected: (Screen) -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedIndex = bottomTabs.indexOfFirst { it.route == currentRoute }.coerceAtLeast(0)
    val pillShape = RoundedCornerShape(28.dp)

    Box(
        modifier = modifier
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .shadow(
                elevation = 24.dp,
                shape = pillShape,
                ambientColor = Color.Black.copy(alpha = 0.6f),
                spotColor = IronRed.copy(alpha = 0.15f)
            )
            .clip(pillShape)
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xF2121212),  // rgba(18,18,18,0.95)
                        Color(0xF20A0A0A)   // rgba(10,10,10,0.95)
                    )
                )
            )
            .border(1.dp, IronRed.copy(alpha = 0.1f), pillShape)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            bottomTabs.forEachIndexed { index, screen ->
                val selected = index == selectedIndex

                // Animated indicator background
                val bgAlpha by animateFloatAsState(
                    targetValue = if (selected) 0.15f else 0f,
                    animationSpec = tween(200),
                    label = "tabBg$index"
                )

                val iconColor by animateColorAsState(
                    targetValue = if (selected) IronRed else IronTextTertiary,
                    animationSpec = tween(200),
                    label = "tabIcon$index"
                )

                val scale by animateFloatAsState(
                    targetValue = if (selected) 1.05f else 1f,
                    animationSpec = spring(stiffness = Spring.StiffnessMedium),
                    label = "tabScale$index"
                )

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(IronRed.copy(alpha = bgAlpha))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onTabSelected(screen) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = if (selected) screen.icon else screen.iconOutlined,
                        contentDescription = screen.label,
                        tint = iconColor,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = screen.label.uppercase(),
                        fontSize = 9.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        color = iconColor,
                        letterSpacing = 0.5.sp
                    )
                    // Red indicator dot
                    if (selected) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp))
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
