package com.ironcore.fit.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
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
import com.ironcore.fit.ui.workout.TrainScreen
import com.ironcore.fit.ui.coach.CoachScreen
import com.ironcore.fit.ui.arena.ArenaScreen
import com.ironcore.fit.ui.progress.ProgressScreen
import com.ironcore.fit.ui.profile.ProfileScreen
import com.ironcore.fit.ui.onboarding.OnboardingScreen
import com.ironcore.fit.ui.nutrition.NutritionScreen
import com.ironcore.fit.ui.league.LeagueScreen
import com.ironcore.fit.ui.battlepass.BattlePassScreen
import com.ironcore.fit.ui.guild.GuildScreen
import com.ironcore.fit.ui.chronicle.ChronicleScreen
import com.ironcore.fit.ui.messages.MessagesScreen
import com.ironcore.fit.ui.playercard.PlayerCardScreen
import com.ironcore.fit.ui.achievements.AchievementsScreen
import com.ironcore.fit.ui.theme.*

// ══════════════════════════════════════════════════════════════════
// Bottom tab definitions
// ══════════════════════════════════════════════════════════════════

sealed class Screen(
    val route: String,
    val label: String,
    val iconKey: String,       // EliteIcons key (flame, swords, dumbbell, brain, crown)
    val tabOrder: Int,         // TAB_ORDER for direction-aware transitions
    val icon: ImageVector,     // Material fallback (kept for sub-screens)
    val iconOutlined: ImageVector
) {
    data object Home : Screen("home", "Home", "home", 0, Icons.Filled.Home, Icons.Outlined.Home)
    data object Arena : Screen("arena", "Arena", "arena", 1, Icons.Filled.EmojiEvents, Icons.Outlined.EmojiEvents)
    data object Workout : Screen("workout", "Train", "train", 2, Icons.Filled.FitnessCenter, Icons.Outlined.FitnessCenter)
    data object AILab : Screen("ai_lab", "AI", "ailab", 3, Icons.Filled.SmartToy, Icons.Outlined.SmartToy)
    data object Profile : Screen("profile", "Me", "profile", 4, Icons.Filled.Person, Icons.Outlined.Person)
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
    const val MESSAGES = "messages"
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
        AuthState.CHECKING -> IronCoreSplashScreen(onComplete = {})

        AuthState.LOGGED_OUT -> {
            AnimatedContent(
                targetState = uiState.step,
                transitionSpec = {
                    (fadeIn(tween(300)) + slideInHorizontally { it / 4 }) togetherWith
                            (fadeOut(tween(200)) + slideOutHorizontally { -it / 4 })
                },
                label = "authStep"
            ) { step ->
                when (step) {
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
        }

        AuthState.AUTHENTICATED -> MainApp()
    }
}

// ══════════════════════════════════════════════════════════════════
// Creating account screen
// ══════════════════════════════════════════════════════════════════

@Composable
private fun CreatingAccountScreen() {
    val pulseAlpha = rememberInfiniteTransition(label = "pulse")
    val alpha by pulseAlpha.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

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
                fontFamily = OswaldFontFamily,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = IronTextPrimary,
                letterSpacing = 2.sp,
                modifier = Modifier.graphicsLayer { this.alpha = alpha }
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Setting up your IronCore identity...",
                fontFamily = InterFontFamily,
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
    val wordCount = remember(recoveryInput) {
        if (recoveryInput.isBlank()) 0
        else recoveryInput.trim().split("\\s+".toRegex()).size
    }

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
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = IronTextPrimary
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "IRONCORE",
                fontFamily = OswaldFontFamily,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = IronRed,
                letterSpacing = 4.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Account Recovery",
                fontFamily = OswaldFontFamily,
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = IronTextPrimary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Enter your 12-word recovery phrase to restore access",
                fontFamily = InterFontFamily,
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

            // Word counter
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "$wordCount / 12 words",
                fontFamily = InterFontFamily,
                fontSize = 12.sp,
                color = if (wordCount >= 12) IronGreen else IronTextTertiary,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.End
            )

            if (error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = error,
                    fontFamily = InterFontFamily,
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
                enabled = !isLoading && wordCount >= 12,
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
                        fontFamily = InterFontFamily,
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

    // Track previous tab for direction-aware transitions
    var previousTabOrder by remember { mutableStateOf(0) }
    val currentTabOrder = bottomTabs.find { it.route == currentRoute }?.tabOrder ?: 0
    val transitionDirection = if (currentTabOrder >= previousTabOrder) 1 else -1

    // Update previous tab when current changes
    LaunchedEffect(currentRoute) {
        bottomTabs.find { it.route == currentRoute }?.let {
            previousTabOrder = it.tabOrder
        }
    }

    // ── Nav bar auto-hide on scroll ───────────────────────────────
    var isNavBarVisible by remember { mutableStateOf(true) }
    val density = LocalDensity.current
    val nestedScrollConnection = remember {
        object : androidx.compose.ui.input.nestedscroll.NestedScrollConnection {
            override fun onPreScroll(
                available: Offset,
                source: androidx.compose.ui.input.nestedscroll.NestedScrollSource
            ): Offset {
                val dy = available.y
                if (dy < -8f) {
                    // Scrolling down → hide nav bar
                    isNavBarVisible = false
                } else if (dy > 8f) {
                    // Scrolling up → show nav bar
                    isNavBarVisible = true
                }
                return Offset.Zero
            }
        }
    }

    // Always show nav bar when switching tabs
    LaunchedEffect(currentRoute) {
        isNavBarVisible = true
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = IronBlack,
        contentColor = IronTextPrimary,
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomBar && isNavBarVisible,
                enter = slideInVertically(
                    initialOffsetY = { it },
                    animationSpec = tween(250, easing = FastOutSlowInEasing)
                ) + fadeIn(animationSpec = tween(200)),
                exit = slideOutVertically(
                    targetOffsetY = { it },
                    animationSpec = tween(200, easing = FastOutSlowInEasing)
                ) + fadeOut(animationSpec = tween(150))
            ) {
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
                    modifier = Modifier
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .then(
                    if (showBottomBar)
                        Modifier.nestedScroll(nestedScrollConnection)
                    else Modifier
                )
        ) {
            // ── Offline indicator overlay ──────────────────────────
            OfflineIndicator()

            NavHost(
                navController = navController,
                startDestination = Screen.Home.route,
                modifier = Modifier.fillMaxSize(),
                // Direction-aware transitions: slide based on tab order
                enterTransition = {
                    slideInHorizontally(
                        initialOffsetX = { (it * 0.25f * transitionDirection).toInt() },
                        animationSpec = tween(300, easing = IronEaseOut)
                    ) + fadeIn(animationSpec = tween(300, easing = IronEaseOut))
                },
                exitTransition = {
                    slideOutHorizontally(
                        targetOffsetX = { (-it * 0.25f * transitionDirection).toInt() },
                        animationSpec = tween(200, easing = IronEaseOut)
                    ) + fadeOut(animationSpec = tween(200))
                },
                popEnterTransition = {
                    slideInHorizontally(
                        initialOffsetX = { (-it * 0.25f).toInt() },
                        animationSpec = tween(300, easing = IronEaseOut)
                    ) + fadeIn(animationSpec = tween(300))
                },
                popExitTransition = {
                    slideOutHorizontally(
                        targetOffsetX = { (it * 0.25f).toInt() },
                        animationSpec = tween(200, easing = IronEaseOut)
                    ) + fadeOut(animationSpec = tween(200))
                }
            ) {
                // ── Main tabs ────────────────────────────────────────
                composable(Screen.Home.route) {
                    HomeScreen(navController = navController)
                }
                composable(Screen.Arena.route) {
                    ArenaScreen(navController = navController)
                }
                composable(Screen.Workout.route) {
                    TrainScreen(navController = navController)
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
                    ChronicleScreen(navController = navController)
                }
                composable(SubScreen.MESSAGES) {
                    MessagesScreen(navController = navController)
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
}

// ══════════════════════════════════════════════════════════════════
// Floating Pill Bottom Bar — exact match to React glass-nav-pill
//
// Uses GlassCard NAV_PILL tier → blur(40dp), shimmer, inner shine
// EliteIcons with active glow, spring-animated sliding indicator
// NavBtn: whileTap 0.92x, active 1.1x scale + -2dp y offset
// ══════════════════════════════════════════════════════════════════

@Composable
private fun IronCoreBottomBar(
    currentRoute: String?,
    onTabSelected: (Screen) -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedIndex = bottomTabs.indexOfFirst { it.route == currentRoute }.coerceAtLeast(0)

    // Spring-animated indicator position (matches React: stiffness 500, damping 35)
    val indicatorOffset by animateFloatAsState(
        targetValue = selectedIndex.toFloat(),
        animationSpec = spring(
            dampingRatio = 0.4375f,  // ~35/80
            stiffness = 500f
        ),
        label = "indicatorOffset"
    )

    GlassCard(
        tier = GlassTier.NAV_PILL,
        cornerRadius = 28.dp,
        padding = 0.dp,  // We handle internal padding ourselves
        modifier = modifier
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .fillMaxWidth()
            .navigationBarsPadding()  // Safe area for gesture nav
    ) {
        Box {
            // ── Sliding Active Indicator (behind tabs) ────────────
            // Red glow beneath active tab, spring-animated position
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                val tabWidth = maxWidth / bottomTabs.size
                val indicatorWidth = 40.dp
                val indicatorOffsetX = tabWidth * indicatorOffset + (tabWidth - indicatorWidth) / 2

                Box(
                    modifier = Modifier
                        .offset(x = indicatorOffsetX, y = 4.dp)
                        .width(indicatorWidth)
                        .height(3.dp)
                        .clip(RoundedCornerShape(1.5.dp))
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    IronRed.copy(alpha = 0.5f),
                                    IronRedDark.copy(alpha = 0.3f),
                                    IronRed.copy(alpha = 0.5f)
                                )
                            )
                        )
                        .drawBehind {
                            // Red glow effect beneath indicator
                            drawRoundRect(
                                brush = Brush.radialGradient(
                                    colors = listOf(
                                        IronRed.copy(alpha = 0.25f),
                                        Color.Transparent
                                    ),
                                    center = Offset(size.width / 2, size.height / 2),
                                    radius = 50f
                                ),
                                cornerRadius = CornerRadius(25f),
                                size = Size(size.width + 20f, size.height + 40f),
                                topLeft = Offset(-10f, -20f)
                            )
                        }
                )
            }

            // ── Tab Row ───────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                bottomTabs.forEachIndexed { index, screen ->
                    NavBtn(
                        screen = screen,
                        selected = index == selectedIndex,
                        onClick = { onTabSelected(screen) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
// NavBtn — matches React NavBtn from UIComponents.jsx exactly
//
// Active: scale 1.1, y -2dp, red glow drop-shadow, bold label glow
// Inactive: scale 1.0, white 0.6α icons, medium label
// Touch: scale 0.92 spring feedback
// ══════════════════════════════════════════════════════════════════

@Composable
private fun NavBtn(
    screen: Screen,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Press state for whileTap: scale 0.92
    var isPressed by remember { mutableStateOf(false) }

    // Scale animation: pressed → 0.92, active → 1.1, inactive → 1.0
    val targetScale = when {
        isPressed -> 0.92f
        selected -> 1.1f
        else -> 1f
    }
    val scale by animateFloatAsState(
        targetValue = targetScale,
        animationSpec = spring(
            dampingRatio = 0.625f,  // ~25/40 — matches IronSpringNav
            stiffness = 500f
        ),
        label = "navBtnScale"
    )

    // Y offset: active tabs float up 2dp
    val yOffset by animateFloatAsState(
        targetValue = if (selected) -2f else 0f,
        animationSpec = spring(dampingRatio = 0.625f, stiffness = 500f),
        label = "navBtnY"
    )

    // Icon alpha: active = full, inactive = 0.6
    val iconAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0.6f,
        animationSpec = tween(200),
        label = "navBtnAlpha"
    )

    // Label color with glow effect
    val labelColor by animateColorAsState(
        targetValue = if (selected) IronRed else Color.White.copy(alpha = 0.6f),
        animationSpec = tween(200),
        label = "navBtnLabel"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                translationY = yOffset * density
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        try { awaitRelease() } finally { isPressed = false }
                    },
                    onTap = { onClick() }
                )
            }
            .padding(vertical = 6.dp)
    ) {
        // ── Icon with glow ────────────────────────────────────
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(28.dp)
                .then(
                    if (selected) {
                        // Red glow behind active icon (drop-shadow 0 0 8px rgba(220,38,38,0.7))
                        Modifier.drawBehind {
                            drawCircle(
                                brush = Brush.radialGradient(
                                    colors = listOf(
                                        IronRed.copy(alpha = 0.7f),
                                        IronRed.copy(alpha = 0.2f),
                                        Color.Transparent
                                    ),
                                    radius = 32f
                                ),
                                radius = 32f
                            )
                        }
                    } else Modifier
                )
        ) {
            // Use EliteIcons based on iconKey
            val iconComposable = NavIcons[screen.iconKey]
            if (iconComposable != null) {
                Box(modifier = Modifier.graphicsLayer { alpha = iconAlpha }) {
                    iconComposable(
                        selected,           // active: Boolean
                        Modifier.size(24.dp), // modifier: Modifier
                        24.dp                // size: Dp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(3.dp))

        // ── Label ─────────────────────────────────────────────
        // React: 10px bold uppercase, text-shadow glow on active
        Text(
            text = screen.label.uppercase(),
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = labelColor,
            letterSpacing = 0.5.sp,
            maxLines = 1
        )
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
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
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
