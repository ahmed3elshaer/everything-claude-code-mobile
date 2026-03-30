---
name: analytics-patterns
description: Analytics integration patterns - event tracking, screen tracking, user properties, Firebase Analytics, custom analytics providers, and privacy compliance.
---

# Analytics Integration Patterns

## Architecture

### AnalyticsProvider Interface (Kotlin)

```kotlin
interface AnalyticsProvider {
    fun logEvent(name: String, params: Map<String, Any> = emptyMap())
    fun setUserProperty(name: String, value: String)
    fun setUserId(userId: String?)
    fun logScreenView(screenName: String, screenClass: String? = null)
}
```

### AnalyticsProvider Protocol (Swift)

```swift
protocol AnalyticsProvider {
    func logEvent(_ name: String, parameters: [String: Any])
    func setUserProperty(_ value: String?, forName name: String)
    func setUserId(_ userId: String?)
    func logScreenView(screenName: String, screenClass: String?)
}
```

### Multi-Provider Analytics Manager

```kotlin
class AnalyticsManager(
    private val providers: List<AnalyticsProvider>,
    private val consentManager: ConsentManager
) {
    fun logEvent(name: String, params: Map<String, Any> = emptyMap()) {
        if (!consentManager.hasAnalyticsConsent()) return
        providers.forEach { it.logEvent(name, params) }
    }

    fun setUserProperty(name: String, value: String) {
        if (!consentManager.hasAnalyticsConsent()) return
        providers.forEach { it.setUserProperty(name, value) }
    }

    fun setUserId(userId: String?) {
        providers.forEach { it.setUserId(userId) }
    }

    fun logScreenView(screenName: String, screenClass: String? = null) {
        if (!consentManager.hasAnalyticsConsent()) return
        providers.forEach { it.logScreenView(screenName, screenClass) }
    }
}
```

### Event Data Classes

```kotlin
sealed class AnalyticsEvent(
    val name: String,
    val params: Map<String, Any> = emptyMap()
) {
    // E-commerce
    class ViewProduct(productId: String, category: String) : AnalyticsEvent(
        name = "view_product",
        params = mapOf("product_id" to productId, "category" to category)
    )

    class AddToCart(productId: String, price: Double, quantity: Int) : AnalyticsEvent(
        name = "add_to_cart",
        params = mapOf("product_id" to productId, "price" to price, "quantity" to quantity)
    )

    class Purchase(orderId: String, total: Double, currency: String) : AnalyticsEvent(
        name = "purchase",
        params = mapOf("order_id" to orderId, "total" to total, "currency" to currency)
    )

    // Engagement
    class Search(query: String, resultCount: Int) : AnalyticsEvent(
        name = "search",
        params = mapOf("query" to query, "result_count" to resultCount)
    )

    class ShareContent(contentType: String, itemId: String) : AnalyticsEvent(
        name = "share_content",
        params = mapOf("content_type" to contentType, "item_id" to itemId)
    )
}

// Usage
analytics.logEvent(AnalyticsEvent.ViewProduct("sku-123", "electronics"))
```

---

## Android / Firebase Analytics

### Setup and Initialization

```kotlin
class FirebaseAnalyticsProvider(context: Context) : AnalyticsProvider {
    private val firebaseAnalytics = FirebaseAnalytics.getInstance(context)

    override fun logEvent(name: String, params: Map<String, Any>) {
        val bundle = Bundle().apply {
            params.forEach { (key, value) ->
                when (value) {
                    is String -> putString(key, value)
                    is Int -> putInt(key, value)
                    is Long -> putLong(key, value)
                    is Double -> putDouble(key, value)
                    is Boolean -> putBoolean(key, value)
                }
            }
        }
        firebaseAnalytics.logEvent(name, bundle)
    }

    override fun setUserProperty(name: String, value: String) {
        firebaseAnalytics.setUserProperty(name, value)
    }

    override fun setUserId(userId: String?) {
        firebaseAnalytics.setUserId(userId)
    }

    override fun logScreenView(screenName: String, screenClass: String?) {
        val bundle = Bundle().apply {
            putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName)
            screenClass?.let { putString(FirebaseAnalytics.Param.SCREEN_CLASS, it) }
        }
        firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, bundle)
    }
}
```

### Screen Tracking with Lifecycle Observer

```kotlin
@Composable
fun TrackScreen(screenName: String, analytics: AnalyticsManager) {
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                analytics.logScreenView(screenName)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
}

// Usage in a screen composable
@Composable
fun ProductListScreen(analytics: AnalyticsManager) {
    TrackScreen("product_list", analytics)
    // Screen content...
}
```

---

## iOS Analytics

### Firebase Analytics Provider

```swift
final class FirebaseAnalyticsProvider: AnalyticsProvider {
    func logEvent(_ name: String, parameters: [String: Any]) {
        Analytics.logEvent(name, parameters: parameters)
    }

    func setUserProperty(_ value: String?, forName name: String) {
        Analytics.setUserProperty(value, forName: name)
    }

    func setUserId(_ userId: String?) {
        Analytics.setUserID(userId)
    }

    func logScreenView(screenName: String, screenClass: String?) {
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName,
            AnalyticsParameterScreenClass: screenClass ?? ""
        ])
    }
}
```

### Screen Tracking with SwiftUI

```swift
struct AnalyticsScreenModifier: ViewModifier {
    let screenName: String
    @EnvironmentObject var analytics: AnalyticsManager

    func body(content: Content) -> some View {
        content.onAppear {
            analytics.logScreenView(screenName: screenName)
        }
    }
}

extension View {
    func trackScreen(_ name: String) -> some View {
        modifier(AnalyticsScreenModifier(screenName: name))
    }
}

// Usage
struct ProductListView: View {
    var body: some View {
        List { /* ... */ }
            .trackScreen("product_list")
    }
}
```

### App Tracking Transparency (ATT)

```swift
import AppTrackingTransparency

func requestTrackingPermission() async -> ATTrackingManager.AuthorizationStatus {
    await ATTrackingManager.requestTrackingAuthorization()
}

// Call after app launch delay (Apple requirement)
func onAppBecomeActive() {
    Task {
        let status = await requestTrackingPermission()
        switch status {
        case .authorized:
            analytics.enableFullTracking()
        case .denied, .restricted:
            analytics.enableLimitedTracking()
        case .notDetermined:
            break
        @unknown default:
            break
        }
    }
}
```

---

## Event Naming Conventions

| Pattern | Example | Notes |
|---------|---------|-------|
| `noun_verb` | `product_viewed` | Past tense for completed actions |
| `noun_verb` | `cart_item_added` | Include context noun |
| `feature_action` | `search_performed` | Feature-scoped |
| `screen_action` | `settings_opened` | Screen-scoped |

Rules:
- Use `snake_case` consistently
- Max 40 characters per event name
- Max 25 custom parameters per event
- Prefix custom events to avoid Firebase reserved names

## User Property Design

```kotlin
// Set on login
analytics.setUserProperty("subscription_tier", "premium")
analytics.setUserProperty("account_age_days", "365")
analytics.setUserProperty("preferred_language", "en")
```

Properties should be low-cardinality (not unique per user). Use for segmentation, not identification.

---

## Privacy: Consent Management

```kotlin
class ConsentManager(private val prefs: SharedPreferences) {
    fun hasAnalyticsConsent(): Boolean = prefs.getBoolean("analytics_consent", false)
    fun hasAdConsent(): Boolean = prefs.getBoolean("ad_consent", false)

    fun updateConsent(analytics: Boolean, ads: Boolean) {
        prefs.edit()
            .putBoolean("analytics_consent", analytics)
            .putBoolean("ad_consent", ads)
            .apply()
        // Disable Firebase collection if consent revoked
        FirebaseAnalytics.getInstance(context).setAnalyticsCollectionEnabled(analytics)
    }
}
```

GDPR/CCPA checklist:
- Show consent dialog before any tracking
- Allow granular opt-in/opt-out
- Provide data deletion request mechanism
- Do not track until consent is given
- Log consent timestamps for audit
- Respect platform-level tracking preferences (ATT on iOS)
