package com.ironcore.fit.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ironcore.fit.ui.auth.AuthViewModel
import com.ironcore.fit.ui.auth.LoginScreen
import com.ironcore.fit.ui.home.HomeScreen
import com.ironcore.fit.ui.workout.WorkoutScreen
import com.ironcore.fit.ui.coach.CoachScreen
import com.ironcore.fit.ui.arena.ArenaScreen
import com.ironcore.fit.ui.progress.ProgressScreen
import com.ironcore.fit.ui.profile.ProfileScreen
import com.ironcore.fit.ui.theme.IronRed
import com.ironcore.fit.ui.theme.IronTextTertiary

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    data object Home : Screen("home", "Home", Icons.Default.Home)
    data object Workout : Screen("workout", "Workout", Icons.Default.FitnessCenter)
    data object Coach : Screen("coach", "AI Coach", Icons.Default.CameraAlt)
    data object Arena : Screen("arena", "Arena", Icons.Default.EmojiEvents)
    data object Progress : Screen("progress", "Progress", Icons.Default.Timeline)
    data object Profile : Screen("profile", "Profile", Icons.Default.Person)
}

private val bottomTabs = listOf(
    Screen.Home,
    Screen.Workout,
    Screen.Coach,
    Screen.Arena,
    Screen.Progress
)

@Composable
fun AppNavigation(authViewModel: AuthViewModel = hiltViewModel()) {
    val user by authViewModel.currentUser.collectAsState()

    if (user == null) {
        LoginScreen(authViewModel = authViewModel)
        return
    }

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                bottomTabs.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = screen.label) },
                        label = { Text(screen.label, style = MaterialTheme.typography.labelMedium) },
                        selected = currentRoute == screen.route,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = IronRed,
                            selectedTextColor = IronRed,
                            unselectedIconColor = IronTextTertiary,
                            unselectedTextColor = IronTextTertiary,
                            indicatorColor = IronRed.copy(alpha = 0.1f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) { HomeScreen() }
            composable(Screen.Workout.route) { WorkoutScreen() }
            composable(Screen.Coach.route) { CoachScreen() }
            composable(Screen.Arena.route) { ArenaScreen() }
            composable(Screen.Progress.route) { ProgressScreen() }
            composable(Screen.Profile.route) { ProfileScreen() }
        }
    }
}
