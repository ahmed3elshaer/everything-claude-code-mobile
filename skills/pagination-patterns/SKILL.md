---
name: pagination-patterns
description: Pagination patterns for mobile - Paging 3 for Android (PagingSource, RemoteMediator, LazyPagingItems), cursor-based and offset-based strategies.
---

# Pagination Patterns for Mobile

## Dependencies (Android)

```kotlin
dependencies {
    val pagingVersion = "3.3.5"
    implementation("androidx.paging:paging-runtime-ktx:$pagingVersion")
    implementation("androidx.paging:paging-compose:$pagingVersion")
    testImplementation("androidx.paging:paging-testing:$pagingVersion")
}
```

## PagingSource Implementation

```kotlin
class ArticlePagingSource(
    private val api: ArticleApi,
    private val query: String
) : PagingSource<Int, Article>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Article> {
        val page = params.key ?: 1
        return try {
            val response = api.searchArticles(
                query = query,
                page = page,
                pageSize = params.loadSize
            )
            LoadResult.Page(
                data = response.articles,
                prevKey = if (page == 1) null else page - 1,
                nextKey = if (response.articles.isEmpty()) null else page + 1
            )
        } catch (e: IOException) {
            LoadResult.Error(e)
        } catch (e: HttpException) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Article>): Int? {
        return state.anchorPosition?.let { anchor ->
            state.closestPageToPosition(anchor)?.prevKey?.plus(1)
                ?: state.closestPageToPosition(anchor)?.nextKey?.minus(1)
        }
    }
}
```

## Cursor-Based PagingSource

```kotlin
class CursorArticlePagingSource(
    private val api: ArticleApi
) : PagingSource<String, Article>() {

    override suspend fun load(params: LoadParams<String>): LoadResult<String, Article> {
        return try {
            val response = api.getArticles(
                cursor = params.key,
                limit = params.loadSize
            )
            LoadResult.Page(
                data = response.articles,
                prevKey = null, // cursor-based usually does not support backward
                nextKey = response.nextCursor
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<String, Article>): String? = null
}
```

## Pager Configuration

```kotlin
class ArticleRepository(private val api: ArticleApi) {

    fun getArticlesPager(query: String): Flow<PagingData<Article>> {
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                prefetchDistance = 5,
                enablePlaceholders = false,
                initialLoadSize = 40,  // first load is usually 2x pageSize
                maxSize = 200          // cap cached pages
            ),
            pagingSourceFactory = { ArticlePagingSource(api, query) }
        ).flow
    }
}
```

## ViewModel Integration

```kotlin
class ArticleListViewModel(
    private val repository: ArticleRepository
) : ViewModel() {

    private val _query = MutableStateFlow("")

    val articles: Flow<PagingData<Article>> = _query
        .debounce(300)
        .distinctUntilChanged()
        .flatMapLatest { query ->
            repository.getArticlesPager(query)
        }
        .cachedIn(viewModelScope)

    fun search(query: String) {
        _query.value = query
    }
}
```

## Collecting as LazyPagingItems in Compose

```kotlin
@Composable
fun ArticleListScreen(viewModel: ArticleListViewModel = koinViewModel()) {
    val articles = viewModel.articles.collectAsLazyPagingItems()

    LazyColumn {
        items(
            count = articles.itemCount,
            key = articles.itemKey { it.id }
        ) { index ->
            val article = articles[index]
            if (article != null) {
                ArticleCard(article = article)
            } else {
                ArticlePlaceholder()
            }
        }

        // Append loading indicator
        when (articles.loadState.append) {
            is LoadState.Loading -> {
                item { LoadingIndicator() }
            }
            is LoadState.Error -> {
                item {
                    RetryButton(onClick = { articles.retry() })
                }
            }
            else -> {}
        }
    }
}
```

## Load State Handling

```kotlin
@Composable
fun PaginatedList(articles: LazyPagingItems<Article>) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Initial loading state
        when (articles.loadState.refresh) {
            is LoadState.Loading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }
            is LoadState.Error -> {
                val error = (articles.loadState.refresh as LoadState.Error).error
                ErrorScreen(
                    message = error.localizedMessage ?: "Unknown error",
                    onRetry = { articles.refresh() }
                )
            }
            is LoadState.NotLoading -> {
                if (articles.itemCount == 0) {
                    EmptyState(message = "No articles found")
                } else {
                    ArticleLazyColumn(articles = articles)
                }
            }
        }

        // Pull to refresh
        PullToRefreshBox(
            isRefreshing = articles.loadState.refresh is LoadState.Loading,
            onRefresh = { articles.refresh() }
        ) {
            ArticleLazyColumn(articles = articles)
        }
    }
}
```

## RemoteMediator (Network + Database)

```kotlin
@OptIn(ExperimentalPagingApi::class)
class ArticleRemoteMediator(
    private val api: ArticleApi,
    private val database: AppDatabase
) : RemoteMediator<Int, ArticleEntity>() {

    private val articleDao = database.articleDao()
    private val remoteKeyDao = database.remoteKeyDao()

    override suspend fun load(
        loadType: LoadType,
        state: PagingState<Int, ArticleEntity>
    ): MediatorResult {
        val page = when (loadType) {
            LoadType.REFRESH -> 1
            LoadType.PREPEND -> return MediatorResult.Success(endOfPaginationReached = true)
            LoadType.APPEND -> {
                val remoteKey = remoteKeyDao.getRemoteKey("articles")
                remoteKey?.nextPage ?: return MediatorResult.Success(
                    endOfPaginationReached = true
                )
            }
        }

        return try {
            val response = api.getArticles(page = page, pageSize = state.config.pageSize)

            database.withTransaction {
                if (loadType == LoadType.REFRESH) {
                    articleDao.deleteAll()
                    remoteKeyDao.deleteByKey("articles")
                }
                articleDao.insertAll(response.articles.map { it.toEntity() })
                remoteKeyDao.insert(
                    RemoteKey(
                        key = "articles",
                        nextPage = if (response.articles.isEmpty()) null else page + 1
                    )
                )
            }

            MediatorResult.Success(endOfPaginationReached = response.articles.isEmpty())
        } catch (e: Exception) {
            MediatorResult.Error(e)
        }
    }
}

// Usage in repository
@OptIn(ExperimentalPagingApi::class)
fun getOfflineArticles(): Flow<PagingData<ArticleEntity>> {
    return Pager(
        config = PagingConfig(pageSize = 20),
        remoteMediator = ArticleRemoteMediator(api, database),
        pagingSourceFactory = { database.articleDao().pagingSource() }
    ).flow
}
```

## RemoteKey Entity

```kotlin
@Entity(tableName = "remote_keys")
data class RemoteKey(
    @PrimaryKey val key: String,
    val nextPage: Int?
)

@Dao
interface RemoteKeyDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(key: RemoteKey)

    @Query("SELECT * FROM remote_keys WHERE `key` = :key")
    suspend fun getRemoteKey(key: String): RemoteKey?

    @Query("DELETE FROM remote_keys WHERE `key` = :key")
    suspend fun deleteByKey(key: String)
}
```

## iOS Pagination Pattern

### AsyncSequence-Based Pagination

```swift
@Observable
class ArticleListViewModel {
    var articles: [Article] = []
    var isLoading = false
    var hasMore = true
    private var currentPage = 1

    func loadNextPage() async {
        guard !isLoading, hasMore else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await api.getArticles(page: currentPage, pageSize: 20)
            articles.append(contentsOf: response.articles)
            hasMore = !response.articles.isEmpty
            currentPage += 1
        } catch {
            // handle error
        }
    }
}
```

### SwiftUI List with Pagination Trigger

```swift
struct ArticleListView: View {
    @State private var viewModel = ArticleListViewModel()

    var body: some View {
        List(viewModel.articles) { article in
            ArticleRow(article: article)
                .onAppear {
                    if article == viewModel.articles.last {
                        Task { await viewModel.loadNextPage() }
                    }
                }
        }
        .overlay {
            if viewModel.isLoading && viewModel.articles.isEmpty {
                ProgressView()
            }
        }
        .task {
            await viewModel.loadNextPage()
        }
    }
}
```

## API Patterns

### Cursor-Based Response

```json
{
    "data": [...],
    "pagination": {
        "next_cursor": "eyJpZCI6MTAwfQ==",
        "has_more": true
    }
}
```

### Offset-Based Response

```json
{
    "data": [...],
    "pagination": {
        "page": 2,
        "page_size": 20,
        "total_count": 156,
        "total_pages": 8
    }
}
```

### Kotlin API Models

```kotlin
@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val pagination: Pagination
)

@Serializable
data class Pagination(
    val nextCursor: String? = null,
    val hasMore: Boolean = false,
    val page: Int? = null,
    val totalCount: Int? = null
)
```

## Best Practices

- Prefer cursor-based pagination for real-time feeds (no skipped/duplicate items on insert).
- Use offset-based pagination when total count or page jumping is required.
- Set `prefetchDistance` to 3-5 items so loading starts before the user reaches the end.
- Use `RemoteMediator` for offline-capable paginated lists backed by a local database.
- Always handle all three load states: `refresh`, `append`, and `prepend`.
- Cache `PagingData` in `viewModelScope` with `.cachedIn()` to survive configuration changes.
- Show shimmer placeholders during initial load; show a footer spinner for append loads.
- Implement pull-to-refresh by calling `articles.refresh()` on `LazyPagingItems`.
