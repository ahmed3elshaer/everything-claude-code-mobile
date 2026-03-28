---
name: offline-first
description: Offline-first architecture patterns - NetworkBoundResource, sync strategies, conflict resolution, cache invalidation, and connectivity monitoring.
---

# Offline-First Architecture Patterns

## NetworkBoundResource Pattern

The core abstraction that coordinates cache and network data sources.

```kotlin
inline fun <ResultType, RequestType> networkBoundResource(
    crossinline query: () -> Flow<ResultType>,
    crossinline fetch: suspend () -> RequestType,
    crossinline saveFetchResult: suspend (RequestType) -> Unit,
    crossinline shouldFetch: (ResultType) -> Boolean = { true },
    crossinline onFetchFailed: (Throwable) -> Unit = { }
): Flow<Resource<ResultType>> = flow {
    emit(Resource.Loading())

    val cachedData = query().first()

    if (shouldFetch(cachedData)) {
        emit(Resource.Loading(cachedData))
        try {
            val fetchedData = fetch()
            saveFetchResult(fetchedData)
        } catch (e: Exception) {
            onFetchFailed(e)
        }
    }

    emitAll(query().map { Resource.Success(it) })
}
```

### Resource Wrapper

```kotlin
sealed class Resource<out T> {
    data class Success<T>(val data: T) : Resource<T>()
    data class Loading<T>(val data: T? = null) : Resource<T>()
    data class Error<T>(val message: String, val data: T? = null) : Resource<T>()
}
```

### Usage in Repository

```kotlin
class ArticleRepository(
    private val api: ArticleApi,
    private val dao: ArticleDao,
    private val cachePolicy: CachePolicy
) {
    fun getArticles(): Flow<Resource<List<Article>>> = networkBoundResource(
        query = { dao.observeAll() },
        fetch = { api.getArticles() },
        saveFetchResult = { articles ->
            dao.transaction {
                dao.deleteAll()
                dao.insertAll(articles.map { it.toEntity() })
            }
        },
        shouldFetch = { cachedArticles ->
            cachedArticles.isEmpty() || cachePolicy.isExpired("articles")
        }
    )
}
```

## Cache-First vs Network-First Strategies

### Cache-First (Default for Offline-First)

```kotlin
fun getCacheFirst(): Flow<Resource<List<Item>>> = flow {
    emit(Resource.Loading())
    val cached = dao.getAll().first()
    if (cached.isNotEmpty()) {
        emit(Resource.Success(cached))
    }
    try {
        val fresh = api.fetchAll()
        dao.replaceAll(fresh.map { it.toEntity() })
    } catch (e: Exception) {
        if (cached.isEmpty()) emit(Resource.Error(e.message ?: "Network error"))
    }
    emitAll(dao.getAll().map { Resource.Success(it) })
}
```

### Network-First (For Time-Sensitive Data)

```kotlin
fun getNetworkFirst(): Flow<Resource<List<Item>>> = flow {
    emit(Resource.Loading())
    try {
        val fresh = api.fetchAll()
        dao.replaceAll(fresh.map { it.toEntity() })
        emitAll(dao.getAll().map { Resource.Success(it) })
    } catch (e: Exception) {
        val cached = dao.getAll().first()
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached))
        } else {
            emit(Resource.Error(e.message ?: "No data available"))
        }
    }
}
```

## TTL-Based Cache Invalidation

```kotlin
class CachePolicy(private val prefs: SharedPreferences) {

    fun isExpired(key: String, ttlMillis: Long = DEFAULT_TTL): Boolean {
        val lastFetch = prefs.getLong("cache_ts_$key", 0L)
        return System.currentTimeMillis() - lastFetch > ttlMillis
    }

    fun markFresh(key: String) {
        prefs.edit().putLong("cache_ts_$key", System.currentTimeMillis()).apply()
    }

    fun invalidate(key: String) {
        prefs.edit().remove("cache_ts_$key").apply()
    }

    companion object {
        const val DEFAULT_TTL = 15 * 60 * 1000L  // 15 minutes
        const val SHORT_TTL = 2 * 60 * 1000L     // 2 minutes
        const val LONG_TTL = 24 * 60 * 60 * 1000L // 24 hours
    }
}
```

## Connectivity Monitoring

### Android (ConnectivityManager)

```kotlin
class AndroidConnectivityMonitor(context: Context) : ConnectivityMonitor {

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    override val isConnected: Flow<Boolean> = callbackFlow {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { trySend(true) }
            override fun onLost(network: Network) { trySend(false) }
            override fun onUnavailable() { trySend(false) }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, callback)
        // Emit initial state
        trySend(connectivityManager.activeNetwork != null)
        awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
    }.distinctUntilChanged()
}
```

### iOS (NWPathMonitor)

```swift
import Network

class ConnectivityMonitor: ObservableObject {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "ConnectivityMonitor")

    @Published var isConnected = true

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        monitor.start(queue: queue)
    }

    deinit { monitor.cancel() }
}
```

## Sync Queue for Offline Writes

```kotlin
@Entity(tableName = "pending_operations")
data class PendingOperation(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val operationType: String,       // "CREATE", "UPDATE", "DELETE"
    val entityType: String,          // "article", "comment"
    val entityId: String,
    val payload: String,             // JSON-serialized body
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0
)

class SyncQueue(
    private val pendingOpsDao: PendingOperationDao,
    private val connectivityMonitor: ConnectivityMonitor
) {
    suspend fun enqueue(operation: PendingOperation) {
        pendingOpsDao.insert(operation)
        if (connectivityMonitor.isCurrentlyConnected()) {
            processQueue()
        }
    }

    suspend fun processQueue() {
        val pending = pendingOpsDao.getAllPending()
        for (op in pending) {
            try {
                executeSyncOperation(op)
                pendingOpsDao.delete(op)
            } catch (e: Exception) {
                if (op.retryCount >= MAX_RETRIES) {
                    pendingOpsDao.delete(op)
                } else {
                    pendingOpsDao.update(op.copy(retryCount = op.retryCount + 1))
                }
            }
        }
    }
}
```

## Conflict Resolution Strategies

### Last-Write-Wins

```kotlin
suspend fun resolveConflictLastWriteWins(
    local: SyncEntity,
    remote: SyncEntity
): SyncEntity {
    return if (local.updatedAt >= remote.updatedAt) local else remote
}
```

### Field-Level Merge

```kotlin
suspend fun resolveConflictMerge(
    base: Article,
    local: Article,
    remote: Article
): Article {
    return Article(
        id = base.id,
        title = if (local.title != base.title) local.title else remote.title,
        body = if (local.body != base.body) local.body else remote.body,
        updatedAt = maxOf(local.updatedAt, remote.updatedAt)
    )
}
```

## Retry with Exponential Backoff

```kotlin
suspend fun <T> retryWithBackoff(
    maxRetries: Int = 3,
    initialDelay: Long = 1000L,
    maxDelay: Long = 30_000L,
    factor: Double = 2.0,
    block: suspend () -> T
): T {
    var currentDelay = initialDelay
    repeat(maxRetries - 1) { attempt ->
        try {
            return block()
        } catch (e: Exception) {
            delay(currentDelay)
            currentDelay = (currentDelay * factor).toLong().coerceAtMost(maxDelay)
        }
    }
    return block() // final attempt, let exception propagate
}
```

## Android WorkManager for Background Sync

```kotlin
class SyncWorker(
    context: Context,
    params: WorkerParameters,
    private val syncQueue: SyncQueue
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            syncQueue.processQueue()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}

// Schedule periodic sync
fun scheduleSyncWork(workManager: WorkManager) {
    val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
        .setConstraints(constraints)
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        .build()

    workManager.enqueueUniquePeriodicWork(
        "sync_work",
        ExistingPeriodicWorkPolicy.KEEP,
        syncRequest
    )
}
```

## iOS BGTaskScheduler Equivalent

```swift
import BackgroundTasks

func registerBackgroundSync() {
    BGTaskScheduler.shared.register(
        forTaskWithIdentifier: "com.example.sync",
        using: nil
    ) { task in
        handleSync(task: task as! BGProcessingTask)
    }
}

func scheduleSync() {
    let request = BGProcessingTaskRequest(identifier: "com.example.sync")
    request.requiresNetworkConnectivity = true
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(request)
}

func handleSync(task: BGProcessingTask) {
    let syncTask = Task {
        do {
            try await SyncService.shared.processQueue()
            task.setTaskCompleted(success: true)
        } catch {
            task.setTaskCompleted(success: false)
        }
    }
    task.expirationHandler = { syncTask.cancel() }
}
```

## Best Practices

- Default to cache-first; use network-first only for data where staleness causes real harm.
- Always show cached data immediately, then update when the network responds.
- Persist pending writes in a local table so they survive app restarts.
- Use structured concurrency to cancel in-flight network requests when the user navigates away.
- Set reasonable TTLs per data type: user profiles (long), feeds (short), real-time data (none).
- Log sync failures and expose retry controls in the UI for transparency.
- Test offline scenarios by toggling airplane mode and verifying queue processing.
