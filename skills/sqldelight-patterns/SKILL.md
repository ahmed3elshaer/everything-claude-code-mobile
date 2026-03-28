---
name: sqldelight-patterns
description: SQLDelight patterns for Kotlin Multiplatform - .sq file definitions, platform drivers, type adapters, migrations, and shared database access.
---

# SQLDelight Patterns for KMP

## Gradle Plugin Configuration

```kotlin
// build.gradle.kts (shared module)
plugins {
    id("app.cash.sqldelight") version "2.0.2"
}

sqldelight {
    databases {
        create("AppDatabase") {
            packageName.set("com.example.db")
            schemaOutputDirectory.set(file("src/commonMain/sqldelight/databases"))
            verifyMigrations.set(true)
        }
    }
}

// Dependencies
kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation("app.cash.sqldelight:coroutines-extensions:2.0.2")
            implementation("app.cash.sqldelight:primitive-adapters:2.0.2")
        }
        androidMain.dependencies {
            implementation("app.cash.sqldelight:android-driver:2.0.2")
        }
        iosMain.dependencies {
            implementation("app.cash.sqldelight:native-driver:2.0.2")
        }
    }
}
```

## .sq File Syntax

Place `.sq` files in `src/commonMain/sqldelight/com/example/db/`.

### Table Definitions

```sql
-- User.sq

CREATE TABLE User (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_created_at ON User(created_at);
```

### Named Queries

```sql
-- User.sq (continued)

selectAll:
SELECT * FROM User ORDER BY created_at DESC;

selectById:
SELECT * FROM User WHERE id = ?;

selectByEmail:
SELECT * FROM User WHERE email = ?;

selectByStatus:
SELECT * FROM User WHERE status = :status;

insert:
INSERT OR REPLACE INTO User(display_name, email, avatar_url, status, created_at)
VALUES (?, ?, ?, ?, ?);

updateDisplayName:
UPDATE User SET display_name = ? WHERE id = ?;

deleteById:
DELETE FROM User WHERE id = ?;

deleteAll:
DELETE FROM User;

countByStatus:
SELECT COUNT(*) FROM User WHERE status = ?;
```

### Parameterized Queries with Joins

```sql
-- Post.sq

CREATE TABLE Post (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES User(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    published_at INTEGER
);

selectWithAuthor:
SELECT Post.*, User.display_name AS author_name
FROM Post
INNER JOIN User ON Post.author_id = User.id
WHERE Post.id = ?;

selectByAuthorId:
SELECT * FROM Post WHERE author_id = ? ORDER BY published_at DESC;
```

## Platform Driver Setup

### Common Interface

```kotlin
// commonMain
expect class DriverFactory {
    fun createDriver(): SqlDriver
}

fun createDatabase(driverFactory: DriverFactory): AppDatabase {
    val driver = driverFactory.createDriver()
    return AppDatabase(
        driver = driver,
        UserAdapter = User.Adapter(
            statusAdapter = statusAdapter,
            created_atAdapter = instantAdapter
        )
    )
}
```

### Android Driver

```kotlin
// androidMain
actual class DriverFactory(private val context: Context) {
    actual fun createDriver(): SqlDriver {
        return AndroidSqliteDriver(
            schema = AppDatabase.Schema,
            context = context,
            name = "app.db"
        )
    }
}
```

### iOS Driver

```kotlin
// iosMain
actual class DriverFactory {
    actual fun createDriver(): SqlDriver {
        return NativeSqliteDriver(
            schema = AppDatabase.Schema,
            name = "app.db"
        )
    }
}
```

## Type Adapters

```kotlin
// Enum adapter
val statusAdapter = object : ColumnAdapter<UserStatus, String> {
    override fun decode(databaseValue: String): UserStatus =
        UserStatus.valueOf(databaseValue)

    override fun encode(value: UserStatus): String =
        value.name
}

// Instant adapter (kotlinx.datetime)
val instantAdapter = object : ColumnAdapter<Instant, Long> {
    override fun decode(databaseValue: Long): Instant =
        Instant.fromEpochMilliseconds(databaseValue)

    override fun encode(value: Instant): Long =
        value.toEpochMilliseconds()
}

// Usage in database creation
val database = AppDatabase(
    driver = driver,
    UserAdapter = User.Adapter(
        statusAdapter = statusAdapter,
        created_atAdapter = instantAdapter
    )
)
```

## Migration Strategy

Place migration files in `src/commonMain/sqldelight/databases/migrations/`.

```sql
-- 1.sqm (migration from version 1 to 2)
ALTER TABLE User ADD COLUMN avatar_url TEXT;

-- 2.sqm (migration from version 2 to 3)
CREATE INDEX idx_user_created_at ON User(created_at);
ALTER TABLE User ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
```

Enable migration verification in Gradle:

```kotlin
sqldelight {
    databases {
        create("AppDatabase") {
            verifyMigrations.set(true)
        }
    }
}
```

## Coroutines Flow Extension

```kotlin
import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import app.cash.sqldelight.coroutines.mapToOne
import app.cash.sqldelight.coroutines.mapToOneOrNull

class UserRepository(private val database: AppDatabase) {

    fun observeAll(): Flow<List<User>> =
        database.userQueries.selectAll()
            .asFlow()
            .mapToList(Dispatchers.IO)

    fun observeById(id: Long): Flow<User?> =
        database.userQueries.selectById(id)
            .asFlow()
            .mapToOneOrNull(Dispatchers.IO)

    suspend fun insert(user: User) = withContext(Dispatchers.IO) {
        database.userQueries.insert(
            display_name = user.displayName,
            email = user.email,
            avatar_url = user.avatarUrl,
            status = user.status,
            created_at = user.createdAt
        )
    }

    suspend fun deleteById(id: Long) = withContext(Dispatchers.IO) {
        database.userQueries.deleteById(id)
    }

    suspend fun replaceAll(users: List<User>) = withContext(Dispatchers.IO) {
        database.transaction {
            database.userQueries.deleteAll()
            users.forEach { user ->
                database.userQueries.insert(
                    display_name = user.displayName,
                    email = user.email,
                    avatar_url = user.avatarUrl,
                    status = user.status,
                    created_at = user.createdAt
                )
            }
        }
    }
}
```

## KMP Module Structure

```
shared/
  src/
    commonMain/
      kotlin/com/example/db/
        DriverFactory.kt          (expect class)
        DatabaseModule.kt         (Koin module)
        UserRepository.kt
      sqldelight/com/example/db/
        User.sq
        Post.sq
      sqldelight/databases/
        1.sqm
    androidMain/
      kotlin/com/example/db/
        DriverFactory.android.kt  (actual class)
    iosMain/
      kotlin/com/example/db/
        DriverFactory.ios.kt      (actual class)
```

## Testing with In-Memory Driver

```kotlin
class UserRepositoryTest {

    private lateinit var database: AppDatabase
    private lateinit var repository: UserRepository

    @BeforeTest
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        AppDatabase.Schema.create(driver)
        database = AppDatabase(
            driver = driver,
            UserAdapter = User.Adapter(
                statusAdapter = statusAdapter,
                created_atAdapter = instantAdapter
            )
        )
        repository = UserRepository(database)
    }

    @Test
    fun insertAndRetrieve() = runTest {
        repository.insert(testUser)
        val users = repository.observeAll().first()
        assertEquals(1, users.size)
        assertEquals("alice@test.com", users.first().email)
    }
}
```

## Best Practices

- Let SQLDelight generate type-safe Kotlin code from `.sq` files; do not write manual SQL wrappers.
- Use `database.transaction { }` for multi-statement atomic operations.
- Place type adapters in `commonMain` so they are shared across platforms.
- Use `.asFlow().mapToList()` for reactive UI; use direct query calls for one-shot reads.
- Keep `.sq` files organized by table name, one file per table.
- Enable `verifyMigrations` to catch schema drift at build time.
- Prefer `INSERT OR REPLACE` for upsert semantics in .sq files.
