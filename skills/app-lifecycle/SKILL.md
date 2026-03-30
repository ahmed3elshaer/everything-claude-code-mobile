---
name: app-lifecycle
description: App lifecycle patterns - process death handling, SavedStateHandle, ViewModel restoration, lifecycle-aware components, and background task management.
---

# App Lifecycle Patterns

## Android

### SavedStateHandle in ViewModel

SavedStateHandle survives both configuration changes and process death:

```kotlin
class ProductDetailViewModel(
    private val savedStateHandle: SavedStateHandle,
    private val productRepository: ProductRepository
) : ViewModel() {

    // Survives process death
    val productId: String = savedStateHandle.get<String>("productId") ?: ""

    // StateFlow backed by SavedStateHandle
    val searchQuery = savedStateHandle.getStateFlow("searchQuery", "")
    val selectedTab = savedStateHandle.getStateFlow("selectedTab", 0)

    fun updateSearchQuery(query: String) {
        savedStateHandle["searchQuery"] = query
    }

    fun selectTab(index: Int) {
        savedStateHandle["selectedTab"] = index
    }

    // Transient state (lost on process death, OK for derived data)
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        loadProduct(productId)
    }

    private fun loadProduct(id: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            productRepository.getProduct(id)
                .onSuccess { _uiState.value = UiState.Success(it) }
                .onFailure { _uiState.value = UiState.Error(it.message ?: "Unknown error") }
        }
    }
}
```

### rememberSaveable in Compose

```kotlin
@Composable
fun SearchScreen() {
    // Survives configuration change AND process death
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var isFilterExpanded by rememberSaveable { mutableStateOf(false) }

    // For complex objects, use a custom Saver
    val selectedFilters = rememberSaveable(
        saver = listSaver(
            save = { it.toList() },
            restore = { it.toMutableStateList() }
        )
    ) { mutableStateListOf<String>() }

    // For Parcelable objects
    var selectedProduct by rememberSaveable(stateSaver = autoSaver()) {
        mutableStateOf<Product?>(null)
    }

    Column {
        TextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search...") }
        )
    }
}
```

### Lifecycle-Aware Data Collection

```kotlin
@Composable
fun ProductListScreen(viewModel: ProductListViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (val state = uiState) {
        is UiState.Loading -> LoadingIndicator()
        is UiState.Success -> ProductList(state.products)
        is UiState.Error -> ErrorMessage(state.message)
    }
}
```

For non-Compose contexts, use `repeatOnLifecycle`:

```kotlin
class ProductListActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    updateUI(state)
                }
            }
        }
    }
}
```

### LifecycleEventEffect in Compose

```kotlin
@Composable
fun AnalyticsScreen(screenName: String) {
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        analytics.logScreenView(screenName)
    }

    LifecycleEventEffect(Lifecycle.Event.ON_PAUSE) {
        analytics.logScreenExit(screenName)
    }

    // For start/stop pairs
    LifecycleStartEffect(Unit) {
        val connection = serviceConnection.bind()
        onStopOrDispose {
            connection.unbind()
        }
    }
}
```

### Process Death Testing

```bash
# Kill the app process (simulates process death)
adb shell am kill com.myapp.android

# Full flow: put app in background, kill, then restore
adb shell input keyevent KEYCODE_HOME
adb shell am kill com.myapp.android
# Now tap the app in recents to trigger restoration

# Enable "Don't keep activities" in Developer Options for aggressive testing
adb shell settings put global always_finish_activities 1
```

### WorkManager for Background Tasks

```kotlin
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val repository = EntryPoint.get(applicationContext).syncRepository()
            repository.syncPendingChanges()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}

// Schedule periodic sync
fun schedulePeriodicSync(context: Context) {
    val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build()

    val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
        repeatInterval = 1, TimeUnit.HOURS,
        flexInterval = 15, TimeUnit.MINUTES
    )
        .setConstraints(constraints)
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "periodic_sync",
        ExistingPeriodicWorkPolicy.KEEP,
        syncRequest
    )
}
```

### Foreground Service Pattern

```kotlin
class UploadService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, "upload_channel")
            .setContentTitle("Uploading...")
            .setSmallIcon(R.drawable.ic_upload)
            .setProgress(100, 0, true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        startUpload()
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val NOTIFICATION_ID = 1001
    }
}
```

---

## iOS

### @SceneStorage for State Restoration

```swift
struct ContentView: View {
    // Automatically saved and restored per scene
    @SceneStorage("selectedTab") private var selectedTab = 0
    @SceneStorage("searchQuery") private var searchQuery = ""
    @SceneStorage("scrollPosition") private var scrollPosition: Double = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeTab()
                .tag(0)
            SearchTab(query: $searchQuery)
                .tag(1)
            ProfileTab()
                .tag(2)
        }
    }
}
```

### ScenePhase in SwiftUI

```swift
@main
struct MyApp: App {
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            switch newPhase {
            case .active:
                // App is in the foreground and interactive
                refreshDataIfNeeded()
            case .inactive:
                // App is visible but not interactive (e.g., multitasking)
                saveInProgressWork()
            case .background:
                // App has moved to the background
                scheduleBackgroundTasks()
                savePersistentState()
            @unknown default:
                break
            }
        }
    }

    private func refreshDataIfNeeded() {
        let lastRefresh = UserDefaults.standard.object(forKey: "lastRefresh") as? Date ?? .distantPast
        if Date().timeIntervalSince(lastRefresh) > 300 { // 5 minutes
            Task { await DataManager.shared.refresh() }
        }
    }

    private func savePersistentState() {
        UserDefaults.standard.set(Date(), forKey: "lastBackgroundTime")
    }
}
```

### Background Tasks (BGTaskScheduler)

```swift
// Register in AppDelegate or App init
func registerBackgroundTasks() {
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: "com.myapp.refresh",
        using: nil
    ) { task in
        handleAppRefresh(task: task as! BGAppRefreshTask)
    }

    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: "com.myapp.sync",
        using: nil
    ) { task in
        handleSync(task: task as! BGProcessingTask)
    }
}

func scheduleAppRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.myapp.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 min
    try? BGTaskScheduler.shared.submit(request)
}

func handleAppRefresh(task: BGAppRefreshTask) {
    scheduleAppRefresh() // Reschedule for next time

    let refreshTask = Task {
        do {
            try await DataManager.shared.refresh()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }
    }

    task.expirationHandler = {
        refreshTask.cancel()
    }
}
```

Test background tasks in the debugger:
```
e -l objc -- (void)[[BGTaskScheduler sharedScheduler]
    _simulateLaunchForTaskWithIdentifier:@"com.myapp.refresh"]
```

---

## Cross-Platform Patterns

### State Preservation Strategy

| State Type | Android | iOS | Survives Process Death |
|-----------|---------|-----|----------------------|
| UI state (scroll, tab) | `SavedStateHandle` | `@SceneStorage` | Yes |
| Form input | `rememberSaveable` | `@SceneStorage` | Yes |
| ViewModel data | Re-fetch on restore | Re-fetch on restore | No (re-load) |
| User session | EncryptedPrefs | Keychain | Yes |
| Cache | Room/DataStore | CoreData/UserDefaults | Yes |

### Memory Pressure Handling

```kotlin
// Android
class MyApplication : Application() {
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        when (level) {
            TRIM_MEMORY_RUNNING_LOW -> ImageCache.trimToSize(50)
            TRIM_MEMORY_RUNNING_CRITICAL -> ImageCache.evictAll()
            TRIM_MEMORY_UI_HIDDEN -> releaseUIResources()
        }
    }
}
```

```swift
// iOS
NotificationCenter.default.addObserver(
    forName: UIApplication.didReceiveMemoryWarningNotification,
    object: nil,
    queue: .main
) { _ in
    ImageCache.shared.removeAll()
    URLCache.shared.removeAllCachedResponses()
}
```

### Background/Foreground Transition Checklist

When entering background:
1. Save unsaved user input
2. Cancel non-essential network requests
3. Persist critical state to disk
4. Schedule background tasks if needed
5. Release large in-memory resources

When returning to foreground:
1. Check if session is still valid (token expiry)
2. Refresh stale data (compare timestamps)
3. Re-establish WebSocket connections
4. Sync any offline changes
5. Update UI with fresh data
