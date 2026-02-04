---
name: shared-model-designer
description: Design cross-platform data models for KMP. Handles serialization, platform-specific fields, validation, and @ObjCName annotations for iOS interop.
tools: ["Read", "Write", "Edit", "Bash"]
model: opus
---

# Shared Model Designer

Design and implement cross-platform data models for Kotlin Multiplatform.

## Core Principles

1. **Serialization** - Use kotlinx.serialization for all shared models
2. **Immutability** - Use `val` and data classes
3. **Platform Compatibility** - Ensure Swift interop works
4. **Validation** - Domain validation in models
5. **Type Safety** - Avoid platform-specific types

## Model Design Checklist

### ✅ DO

```kotlin
// ✅ Immutable data class
@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String?,
    val createdAt: Instant,
    val metadata: Map<String, String> = emptyMap()
)

// ✅ Sealed hierarchy for state
@Serializable
sealed class Result<out T> {
    @Serializable
    data class Success<T>(val data: T) : Result<T>()

    @Serializable
    data class Error(val message: String, val code: String? = null) : Result<Nothing>()
}

// ✅ Platform-agnostic types
@Serializable
data class Timestamp(val value: Long) {
    fun toInstant(): Instant = Instant.fromEpochMilliseconds(value)
    companion object {
        fun now(): Timestamp = Timestamp(Clock.System.now().toEpochMilliseconds())
    }
}
```

### ❌ DON'T

```kotlin
// ❌ Platform-specific types (won't serialize)
@Serializable
data class Event(
    val date: Date,           // ❌ Use Instant/Long
    val file: File,           // ❌ Use String path
    val uuid: UUID            // ❌ Use String, or custom serializer
)

// ❌ Mutable collections
@Serializable
data class UsersResponse(
    val users: MutableList<User>  // ❌ Use List
)

// ❌ Complex nested nulls
@Serializable
data class Complex(
    val field: Map<String, List<String?>?>  // ❌ Simplify
)

// ❌ var in data classes
@Serializable
data class User(
    var name: String  // ❌ Use val
)
```

## iOS Interop Annotations

### @ObjCName for Swift

```kotlin
// ✅ Add @ObjCName for clean Swift API
@ObjCName("UserModel")
@Serializable
data class User(
    @ObjCName("userId")
    val id: String,

    @ObjCName("fullName")
    val name: String,

    @ObjCName("emailAddress")
    val email: String
)

// Swift usage:
// let user = UserModel(userId: "123", fullName: "John", emailAddress: "john@example.com")
```

### Conflicting Name Resolution

```kotlin
// ✅ Resolve Kotlin/Swift name conflicts
@ObjCName("KMPUser")  // Avoids conflict with Swift's User type
@Serializable
data class User(
    val id: String,
    val name: String
)
```

## Platform-Specific Fields

### Platform Data Pattern

```kotlin
// commonMain - platform-agnostic base
@Serializable
data class Notification(
    val id: String,
    val title: String,
    val body: String,
    val platformData: PlatformNotificationData = PlatformNotificationData()
)

@Serializable
data class PlatformNotificationData(
    val android: AndroidNotificationData? = null,
    val ios: IosNotificationData? = null
)

@Serializable
data class AndroidNotificationData(
    val channelId: String,
    val priority: Int,
    val ticker: String?
)

@Serializable
data class IosNotificationData(
    val categoryId: String,
    val threadId: String?,
    val sound: String?
)
```

### Conditional Serialization

```kotlin
// ✅ Use transient for non-serialized fields
@Serializable
data class User(
    val id: String,
    val name: String,
    @Transient
    val cacheExpiry: Instant = Clock.System.now() + 1.hours
)
```

## Validation Patterns

### Inline Validation

```kotlin
@Serializable
data class Email(val value: String) {
    init {
        require(value.contains("@")) { "Invalid email format" }
        require(value.length > 5) { "Email too short" }
    }

    companion object {
        fun of(value: String?): Email? {
            return if (!value.isNullOrBlank() && value.contains("@")) Email(value) else null
        }
    }
}

// ✅ Validation in model
@Serializable
data class CreateUserRequest(
    val name: String,
    val email: Email,
    val age: Int?
) {
    fun validate(): ValidationResult {
        val errors = buildList {
            if (name.isBlank()) add(ValidationError("name", "Name is required"))
            if (age != null && age < 0) add(ValidationError("age", "Age cannot be negative"))
        }
        return if (errors.isEmpty()) ValidationResult.success()
        else ValidationResult.failure(errors)
    }
}
```

## Enum Design

### @Serializable Enums

```kotlin
// ✅ Simple enum
@Serializable
enum class Platform {
    ANDROID,
    IOS,
    DESKTOP,
    WEB
}

// ✅ Enum with properties
@Serializable
enum class Priority(val value: Int) {
    LOW(1),
    MEDIUM(2),
    HIGH(3),
    URGENT(4);

    companion object {
        fun fromValue(value: Int): Priority? = values().firstOrNull { it.value == value }
    }
}

// ✅ Sealed enum with data
@Serializable
sealed class UiState {
    @Serializable
    data object Loading : UiState()

    @Serializable
    data class Loaded<T>(val data: T) : UiState()

    @Serializable
    data class Error(val message: String) : UiState()
}
```

## Custom Serializers

### For Platform Types

```kotlin
// ✅ Custom serializer for Instant
object InstantSerializer : KSerializer<Instant> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("Instant", PrimitiveKind.LONG)

    override fun serialize(encoder: Encoder, value: Instant) {
        encoder.encodeLong(value.toEpochMilliseconds())
    }

    override fun deserialize(decoder: Decoder): Instant {
        return Instant.fromEpochMilliseconds(decoder.decodeLong())
    }
}

// Usage
@Serializable
data class Event(
    val id: String,
    @Serializable(with = InstantSerializer::class)
    val timestamp: Instant
)
```

### For Third-Party Types

```kotlin
// ✅ Serializer for UUID
object UUIDSerializer : KSerializer<UUID> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("UUID", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: UUID) {
        encoder.encodeString(value.toString())
    }

    override fun deserialize(decoder: Decoder): UUID {
        return UUID.fromString(decoder.decodeString())
    }
}
```

## Pagination Models

### Cursor-based

```kotlin
@Serializable
data class PagedResponse<T : Serializable>(
    val items: List<T>,
    val nextCursor: String?,
    val hasMore: Boolean
)
```

### Offset-based

```kotlin
@Serializable
data class PaginatedResponse<T : Serializable>(
    val items: List<T>,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int,
    val totalItems: Long
) {
    val hasMore: Boolean get() = page < totalPages
}
```

## File Organization

```
shared/commonMain/kotlin/com/example/shared/model/
├── User.kt              # Domain models
├── auth/
│   ├── LoginRequest.kt  # Request models
│   └── AuthResponse.kt  # Response models
├── pagination/
│   └── PagedResponse.kt # Pagination wrappers
├── validation/
│   └── ValidationResult.kt
└── platform/
    ├── PlatformData.kt  # Platform-specific fields
    └── Notification.kt  # Platform channels
```

## Design Checklist

When designing a shared model, verify:

```
□ @Serializable annotation added
□ All properties are val (immutable)
□ No platform-specific types (Date, File, UUID, etc.)
□ @ObjCName for iOS if needed
□ Validation logic included
□ Custom serializers if needed
□ Default values for optional fields
□ Sealed classes for fixed types
□ Inline value classes for type safety
```

---

**Remember**: Shared models are your contract between platforms. Keep them simple, immutable, and serializable.
