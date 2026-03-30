---
name: feature-flags
description: Feature flag patterns - LaunchDarkly, Firebase Remote Config, local feature flags, A/B testing, gradual rollouts, and KMP shared flag evaluation.
---

# Feature Flag Patterns

## Architecture

### FeatureFlagProvider Interface (Kotlin)

```kotlin
interface FeatureFlagProvider {
    fun getBooleanFlag(key: String, default: Boolean = false): Boolean
    fun getStringFlag(key: String, default: String = ""): String
    fun getIntFlag(key: String, default: Int = 0): Int
    fun getDoubleFlag(key: String, default: Double = 0.0): Double
    suspend fun refresh()
}
```

### Type-Safe Flag Definitions

```kotlin
sealed class FeatureFlag<T>(
    val key: String,
    val defaultValue: T
) {
    // Boolean flags
    object NewOnboarding : FeatureFlag<Boolean>("new_onboarding_v2", false)
    object DarkModeEnabled : FeatureFlag<Boolean>("dark_mode_enabled", true)
    object ChatFeature : FeatureFlag<Boolean>("chat_feature", false)

    // String flags
    object CheckoutButtonText : FeatureFlag<String>("checkout_button_text", "Buy Now")
    object HomeLayoutVariant : FeatureFlag<String>("home_layout_variant", "control")

    // Numeric flags
    object MaxCartItems : FeatureFlag<Int>("max_cart_items", 50)
    object SearchDebounceMs : FeatureFlag<Long>("search_debounce_ms", 300L)
}

// Type-safe evaluation
class FeatureFlagManager(private val provider: FeatureFlagProvider) {
    fun isEnabled(flag: FeatureFlag<Boolean>): Boolean {
        return provider.getBooleanFlag(flag.key, flag.defaultValue)
    }

    fun getString(flag: FeatureFlag<String>): String {
        return provider.getStringFlag(flag.key, flag.defaultValue)
    }

    fun getInt(flag: FeatureFlag<Int>): Int {
        return provider.getIntFlag(flag.key, flag.defaultValue)
    }
}
```

---

## Firebase Remote Config

### Setup and Initialization

```kotlin
class FirebaseFeatureFlagProvider(context: Context) : FeatureFlagProvider {
    private val remoteConfig = Firebase.remoteConfig.apply {
        val configSettings = remoteConfigSettings {
            minimumFetchIntervalInSeconds = if (BuildConfig.DEBUG) 0 else 3600
        }
        setConfigSettingsAsync(configSettings)
        setDefaultsAsync(R.xml.remote_config_defaults)
    }

    override fun getBooleanFlag(key: String, default: Boolean): Boolean {
        return remoteConfig.getBoolean(key)
    }

    override fun getStringFlag(key: String, default: String): String {
        return remoteConfig.getString(key).ifEmpty { default }
    }

    override fun getIntFlag(key: String, default: Int): Int {
        return remoteConfig.getLong(key).toInt()
    }

    override fun getDoubleFlag(key: String, default: Double): Double {
        return remoteConfig.getDouble(key)
    }

    override suspend fun refresh() {
        remoteConfig.fetchAndActivate().await()
    }
}
```

### Default Values (res/xml/remote_config_defaults.xml)

```xml
<?xml version="1.0" encoding="utf-8"?>
<defaultsMap>
    <entry>
        <key>new_onboarding_v2</key>
        <value>false</value>
    </entry>
    <entry>
        <key>dark_mode_enabled</key>
        <value>true</value>
    </entry>
    <entry>
        <key>checkout_button_text</key>
        <value>Buy Now</value>
    </entry>
</defaultsMap>
```

### iOS Firebase Remote Config

```swift
final class FirebaseFeatureFlagProvider: FeatureFlagProvider {
    private let remoteConfig = RemoteConfig.remoteConfig()

    init() {
        let settings = RemoteConfigSettings()
        #if DEBUG
        settings.minimumFetchInterval = 0
        #else
        settings.minimumFetchInterval = 3600
        #endif
        remoteConfig.configSettings = settings
        remoteConfig.setDefaults(fromPlist: "RemoteConfigDefaults")
    }

    func getBooleanFlag(key: String, defaultValue: Bool) -> Bool {
        remoteConfig.configValue(forKey: key).boolValue
    }

    func getStringFlag(key: String, defaultValue: String) -> String {
        let value = remoteConfig.configValue(forKey: key).stringValue
        return value?.isEmpty == false ? value! : defaultValue
    }

    func refresh() async throws {
        let status = try await remoteConfig.fetchAndActivate()
        print("Remote config fetch status: \(status)")
    }
}
```

---

## LaunchDarkly

### Android SDK Initialization

```kotlin
class LaunchDarklyProvider(context: Context) : FeatureFlagProvider {
    private val client: LDClient

    init {
        val ldConfig = LDConfig.Builder(LDConfig.Builder.AutoEnvAttributes.Enabled)
            .mobileKey("mob-your-mobile-key")
            .build()
        val ldContext = LDContext.builder(ContextKind.DEFAULT, "user-id-123")
            .set("email", "user@example.com")
            .set("plan", "premium")
            .build()
        client = LDClient.init(context.applicationContext, ldConfig, ldContext, 5)
    }

    override fun getBooleanFlag(key: String, default: Boolean): Boolean {
        return client.boolVariation(key, default)
    }

    override fun getStringFlag(key: String, default: String): String {
        return client.stringVariation(key, default)
    }

    override fun getIntFlag(key: String, default: Int): Int {
        return client.intVariation(key, default)
    }

    override fun getDoubleFlag(key: String, default: Double): Double {
        return client.doubleVariation(key, default)
    }

    override suspend fun refresh() {
        // LaunchDarkly uses streaming by default, manual refresh not needed
    }

    fun registerFlagChangeListener(key: String, listener: (Boolean) -> Unit) {
        client.registerFeatureFlagListener(key) { flagKey ->
            listener(client.boolVariation(flagKey, false))
        }
    }
}
```

---

## Local Feature Flags

### BuildConfig-Based Flags

```kotlin
// build.gradle.kts
android {
    buildTypes {
        debug {
            buildConfigField("boolean", "ENABLE_DEV_TOOLS", "true")
            buildConfigField("boolean", "MOCK_API", "true")
        }
        release {
            buildConfigField("boolean", "ENABLE_DEV_TOOLS", "false")
            buildConfigField("boolean", "MOCK_API", "false")
        }
    }
}

// Usage
if (BuildConfig.ENABLE_DEV_TOOLS) {
    showDevMenu()
}
```

### Debug Menu Toggle

```kotlin
class LocalFeatureFlagProvider(
    private val prefs: SharedPreferences
) : FeatureFlagProvider {
    override fun getBooleanFlag(key: String, default: Boolean): Boolean {
        return prefs.getBoolean("flag_$key", default)
    }

    fun overrideFlag(key: String, value: Boolean) {
        prefs.edit().putBoolean("flag_$key", value).apply()
    }

    fun clearOverrides() {
        prefs.edit().clear().apply()
    }
}
```

---

## KMP Shared Flags

```kotlin
// commonMain
interface SharedFeatureFlags {
    fun isEnabled(key: String, default: Boolean = false): Boolean
    fun getString(key: String, default: String = ""): String
}

// androidMain
class AndroidFeatureFlags(context: Context) : SharedFeatureFlags {
    private val remoteConfig = Firebase.remoteConfig
    override fun isEnabled(key: String, default: Boolean) = remoteConfig.getBoolean(key)
    override fun getString(key: String, default: String) = remoteConfig.getString(key)
}

// iosMain
class IosFeatureFlags : SharedFeatureFlags {
    private val remoteConfig = RemoteConfig.remoteConfig()
    override fun isEnabled(key: String, default: Boolean) =
        remoteConfig.configValue(forKey: key).boolValue
    override fun getString(key: String, default: String) =
        remoteConfig.configValue(forKey: key).stringValue ?: default
}
```

---

## Gradual Rollout Pattern

```kotlin
class GradualRollout(private val userId: String) {
    fun isInRollout(flagKey: String, percentage: Int): Boolean {
        val hash = "$flagKey-$userId".hashCode().absoluteValue
        return (hash % 100) < percentage
    }
}

// Server-side targeting in Firebase Remote Config:
// Condition: "10% of users" -> random percentile <= 10
// Condition: "Premium users" -> user property "tier" == "premium"
```

## A/B Testing: Variant Assignment

```kotlin
data class Experiment(
    val name: String,
    val variant: String // "control", "variant_a", "variant_b"
)

fun getExperimentVariant(flagManager: FeatureFlagManager): Experiment {
    val variant = flagManager.getString(FeatureFlag.HomeLayoutVariant)
    analytics.logEvent("experiment_assigned", mapOf(
        "experiment_name" to "home_layout",
        "variant" to variant
    ))
    return Experiment("home_layout", variant)
}
```
