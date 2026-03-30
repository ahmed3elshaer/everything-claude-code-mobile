---
name: room-patterns
description: Room database patterns for Android - entity definitions, DAO interfaces, Database class, migrations, TypeConverters, and Flow integration.
---

# Room Database Patterns

## Dependencies (build.gradle.kts)

```kotlin
plugins {
    id("com.google.devtools.ksp") version "2.0.21-1.0.27"
}

dependencies {
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")
    testImplementation("androidx.room:room-testing:$roomVersion")
}
```

## Entity Definitions

```kotlin
@Entity(
    tableName = "users",
    indices = [
        Index(value = ["email"], unique = true),
        Index(value = ["created_at"])
    ]
)
data class UserEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "display_name")
    val displayName: String,

    @ColumnInfo(name = "email")
    val email: String,

    @ColumnInfo(name = "avatar_url")
    val avatarUrl: String? = null,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @Ignore
    val isOnline: Boolean = false
)
```

### Embedded Objects

```kotlin
data class Address(
    val street: String,
    val city: String,
    @ColumnInfo(name = "zip_code") val zipCode: String
)

@Entity(tableName = "profiles")
data class ProfileEntity(
    @PrimaryKey val userId: Long,
    @Embedded(prefix = "address_") val address: Address
)
```

### Relations

```kotlin
data class UserWithPosts(
    @Embedded val user: UserEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "author_id"
    )
    val posts: List<PostEntity>
)
```

## DAO Interfaces

```kotlin
@Dao
interface UserDao {

    @Query("SELECT * FROM users ORDER BY created_at DESC")
    fun observeAll(): Flow<List<UserEntity>>

    @Query("SELECT * FROM users WHERE id = :userId")
    fun observeById(userId: Long): Flow<UserEntity?>

    @Query("SELECT * FROM users WHERE email = :email LIMIT 1")
    suspend fun findByEmail(email: String): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(user: UserEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIfNotExists(users: List<UserEntity>): List<Long>

    @Update
    suspend fun update(user: UserEntity)

    @Delete
    suspend fun delete(user: UserEntity)

    @Query("DELETE FROM users WHERE id = :userId")
    suspend fun deleteById(userId: Long)

    @Transaction
    @Query("SELECT * FROM users WHERE id = :userId")
    fun observeUserWithPosts(userId: Long): Flow<UserWithPosts?>

    @Transaction
    suspend fun replaceAll(users: List<UserEntity>) {
        deleteAll()
        insertIfNotExists(users)
    }

    @Query("DELETE FROM users")
    suspend fun deleteAll()
}
```

## TypeConverters

```kotlin
class Converters {

    @TypeConverter
    fun fromDate(date: Date?): Long? = date?.time

    @TypeConverter
    fun toDate(timestamp: Long?): Date? = timestamp?.let { Date(it) }

    @TypeConverter
    fun fromStatus(status: UserStatus): String = status.name

    @TypeConverter
    fun toStatus(value: String): UserStatus = UserStatus.valueOf(value)

    @TypeConverter
    fun fromStringList(list: List<String>): String =
        Json.encodeToString(list)

    @TypeConverter
    fun toStringList(value: String): List<String> =
        Json.decodeFromString(value)
}
```

## Database Class

```kotlin
@Database(
    entities = [
        UserEntity::class,
        PostEntity::class,
        ProfileEntity::class
    ],
    version = 2,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun postDao(): PostDao
}
```

## Migration Strategy

```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE users ADD COLUMN avatar_url TEXT")
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS index_users_created_at ON users(created_at)"
        )
    }
}

// Destructive fallback for development
val database = Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
    .addMigrations(MIGRATION_1_2)
    .fallbackToDestructiveMigration() // only in debug builds
    .build()
```

## Room + Koin Injection

```kotlin
val databaseModule = module {
    single {
        Room.databaseBuilder(
            androidContext(),
            AppDatabase::class.java,
            "app.db"
        )
        .addMigrations(MIGRATION_1_2)
        .build()
    }
    single { get<AppDatabase>().userDao() }
    single { get<AppDatabase>().postDao() }
}
```

## Room + Kotlin Flow Integration

```kotlin
class UserRepository(private val userDao: UserDao) {

    val allUsers: Flow<List<UserEntity>> = userDao.observeAll()

    fun observeUser(id: Long): Flow<UserEntity?> = userDao.observeById(id)

    suspend fun addUser(user: UserEntity): Long = userDao.upsert(user)

    suspend fun removeUser(userId: Long) = userDao.deleteById(userId)
}

// In ViewModel
class UserListViewModel(
    private val repository: UserRepository
) : ViewModel() {

    val users: StateFlow<List<UserEntity>> = repository.allUsers
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}
```

## Testing with In-Memory Database

```kotlin
@RunWith(AndroidJUnit4::class)
class UserDaoTest {

    private lateinit var database: AppDatabase
    private lateinit var userDao: UserDao

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        )
        .allowMainThreadQueries()
        .build()
        userDao = database.userDao()
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun insertAndRetrieveUser() = runTest {
        val user = UserEntity(displayName = "Alice", email = "alice@test.com")
        val id = userDao.upsert(user)

        val result = userDao.findByEmail("alice@test.com")
        assertNotNull(result)
        assertEquals("Alice", result?.displayName)
    }

    @Test
    fun observeUsersEmitsUpdates() = runTest {
        val emissions = mutableListOf<List<UserEntity>>()
        val job = launch(UnconfinedTestDispatcher()) {
            userDao.observeAll().toList(emissions)
        }
        userDao.upsert(UserEntity(displayName = "Bob", email = "bob@test.com"))
        advanceUntilIdle()
        assertTrue(emissions.last().any { it.displayName == "Bob" })
        job.cancel()
    }
}
```

## Best Practices

- Always use `Flow` return types for reactive queries; use `suspend` for one-shot operations.
- Prefer `OnConflictStrategy.REPLACE` for upsert patterns, `IGNORE` for insert-if-absent.
- Export schemas (`exportSchema = true`) to track migration history in version control.
- Use `@Transaction` for queries returning relations or when performing multi-step writes.
- Keep entity classes as pure data holders; map to domain models in the repository layer.
- Use KSP instead of KAPT for Room annotation processing (faster build times).
- Test migrations with `MigrationTestHelper` from `room-testing`.
