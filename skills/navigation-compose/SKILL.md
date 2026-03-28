---
name: navigation-compose
description: Jetpack Compose Navigation patterns - type-safe routes, NavHost setup, argument passing, deep links, nested navigation graphs, and bottom navigation.
---

# Jetpack Compose Navigation Patterns

## Dependencies

```kotlin
dependencies {
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
}
```

## Type-Safe Routes with Sealed Interface

```kotlin
@Serializable
sealed interface Route {
    @Serializable
    data object Home : Route

    @Serializable
    data object Settings : Route

    @Serializable
    data class UserProfile(val userId: String) : Route

    @Serializable
    data class PostDetail(val postId: Long, val showComments: Boolean = false) : Route
}

// For nested graphs
@Serializable
sealed interface AuthGraph {
    @Serializable
    data object Login : AuthGraph

    @Serializable
    data object Register : AuthGraph

    @Serializable
    data object ForgotPassword : AuthGraph
}
```

## NavHost Configuration

```kotlin
@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController(),
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Route.Home,
        modifier = modifier
    ) {
        composable<Route.Home> {
            HomeScreen(
                onNavigateToProfile = { userId ->
                    navController.navigate(Route.UserProfile(userId))
                },
                onNavigateToSettings = {
                    navController.navigate(Route.Settings)
                }
            )
        }

        composable<Route.Settings> {
            SettingsScreen(onBack = { navController.popBackStack() })
        }

        composable<Route.UserProfile> { backStackEntry ->
            val route = backStackEntry.toRoute<Route.UserProfile>()
            UserProfileScreen(userId = route.userId)
        }

        composable<Route.PostDetail> { backStackEntry ->
            val route = backStackEntry.toRoute<Route.PostDetail>()
            PostDetailScreen(
                postId = route.postId,
                showComments = route.showComments
            )
        }
    }
}
```

## Argument Passing with Legacy navArgument

For non-serializable routes, use the classic approach:

```kotlin
composable(
    route = "post/{postId}?showComments={showComments}",
    arguments = listOf(
        navArgument("postId") { type = NavType.LongType },
        navArgument("showComments") {
            type = NavType.BoolType
            defaultValue = false
        }
    )
) { backStackEntry ->
    val postId = backStackEntry.arguments?.getLong("postId") ?: return@composable
    val showComments = backStackEntry.arguments?.getBoolean("showComments") ?: false
    PostDetailScreen(postId = postId, showComments = showComments)
}

// Navigate
navController.navigate("post/$postId?showComments=true")
```

## Navigation with Results (SavedStateHandle)

```kotlin
// Screen A: Navigate and listen for result
@Composable
fun ScreenA(navController: NavHostController) {
    val result = navController.currentBackStackEntry
        ?.savedStateHandle
        ?.getStateFlow<String?>("selected_item", null)
        ?.collectAsState()

    LaunchedEffect(result?.value) {
        result?.value?.let { item ->
            // Handle the result
        }
    }

    Button(onClick = { navController.navigate(Route.ItemPicker) }) {
        Text("Pick Item")
    }
}

// Screen B: Set result and go back
@Composable
fun ItemPickerScreen(navController: NavHostController) {
    Button(onClick = {
        navController.previousBackStackEntry
            ?.savedStateHandle
            ?.set("selected_item", "chosen_value")
        navController.popBackStack()
    }) {
        Text("Select This")
    }
}
```

## Deep Link Registration

```kotlin
composable<Route.PostDetail>(
    deepLinks = listOf(
        navDeepLink {
            uriPattern = "https://example.com/posts/{postId}"
        },
        navDeepLink {
            uriPattern = "myapp://posts/{postId}"
        }
    )
) { backStackEntry ->
    val route = backStackEntry.toRoute<Route.PostDetail>()
    PostDetailScreen(postId = route.postId)
}
```

AndroidManifest.xml intent filter:

```xml
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="example.com" />
        <data android:scheme="myapp" />
    </intent-filter>
</activity>
```

## Nested Navigation Graphs

```kotlin
fun NavGraphBuilder.authNavGraph(navController: NavHostController) {
    navigation<AuthGraph.Login>(startDestination = AuthGraph.Login) {
        composable<AuthGraph.Login> {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Route.Home) {
                        popUpTo(AuthGraph.Login) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(AuthGraph.Register)
                }
            )
        }
        composable<AuthGraph.Register> {
            RegisterScreen(onBack = { navController.popBackStack() })
        }
        composable<AuthGraph.ForgotPassword> {
            ForgotPasswordScreen(onBack = { navController.popBackStack() })
        }
    }
}

// In the main NavHost
NavHost(navController = navController, startDestination = AuthGraph.Login) {
    authNavGraph(navController)
    composable<Route.Home> { HomeScreen() }
}
```

## Bottom Navigation

```kotlin
@Serializable
sealed interface BottomTab {
    @Serializable data object Feed : BottomTab
    @Serializable data object Search : BottomTab
    @Serializable data object Profile : BottomTab
}

data class BottomNavItem(
    val route: BottomTab,
    val label: String,
    val icon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(BottomTab.Feed, "Feed", Icons.Default.Home),
    BottomNavItem(BottomTab.Search, "Search", Icons.Default.Search),
    BottomNavItem(BottomTab.Profile, "Profile", Icons.Default.Person)
)

@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()

    Scaffold(
        bottomBar = {
            NavigationBar {
                bottomNavItems.forEach { item ->
                    val isSelected = navBackStackEntry?.destination?.hasRoute(
                        item.route::class
                    ) == true

                    NavigationBarItem(
                        selected = isSelected,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) }
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = BottomTab.Feed,
            modifier = Modifier.padding(padding)
        ) {
            composable<BottomTab.Feed> { FeedScreen() }
            composable<BottomTab.Search> { SearchScreen() }
            composable<BottomTab.Profile> { ProfileScreen() }
        }
    }
}
```

## Animated Transitions

```kotlin
composable<Route.PostDetail>(
    enterTransition = {
        slideIntoContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Left,
            animationSpec = tween(300)
        )
    },
    exitTransition = {
        slideOutOfContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Left,
            animationSpec = tween(300)
        )
    },
    popEnterTransition = {
        slideIntoContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Right,
            animationSpec = tween(300)
        )
    },
    popExitTransition = {
        slideOutOfContainer(
            towards = AnimatedContentTransitionScope.SlideDirection.Right,
            animationSpec = tween(300)
        )
    }
) { backStackEntry ->
    val route = backStackEntry.toRoute<Route.PostDetail>()
    PostDetailScreen(postId = route.postId)
}
```

## Navigation Testing

```kotlin
@Test
fun navigateToProfile_displaysUserProfile() {
    val navController = TestNavHostController(ApplicationProvider.getApplicationContext())

    composeTestRule.setContent {
        navController.navigatorProvider.addNavigator(ComposeNavigator())
        AppNavHost(navController = navController)
    }

    composeTestRule.onNodeWithText("View Profile").performClick()

    val currentRoute = navController.currentBackStackEntry?.destination?.route
    assertTrue(currentRoute?.contains("UserProfile") == true)
}
```

## Best Practices

- Use type-safe routes with `@Serializable` data classes/objects over raw string routes.
- Keep navigation logic out of composables; pass lambda callbacks (`onNavigateTo`) instead.
- Use `popUpTo` with `inclusive = true` when navigating after login to clear the auth stack.
- Use `launchSingleTop = true` for bottom tabs to prevent duplicate destinations.
- Save and restore tab state with `saveState = true` and `restoreState = true`.
- Scope ViewModels to navigation entries with `hiltViewModel()` or `koinViewModel()`.
- Test navigation by asserting on `navController.currentBackStackEntry`.
