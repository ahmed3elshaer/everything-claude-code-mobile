---
name: deep-linking
description: Deep linking patterns for mobile - Android App Links, iOS Universal Links, intent filters, URI handling, deferred deep links, and navigation integration.
---

# Deep Linking Patterns for Mobile

## URI Scheme Design

Design a consistent URI scheme before implementation:

```
myapp://                          # App root
myapp://home                      # Home screen
myapp://product/{id}              # Product detail
myapp://profile/{userId}          # User profile
myapp://settings/notifications    # Nested settings
myapp://search?q={query}          # Query parameters
```

Keep paths RESTful, lowercase, and predictable. Use path segments for hierarchy and query params for filters.

---

## Android

### Intent Filter in AndroidManifest.xml

```xml
<activity
    android:name=".MainActivity"
    android:exported="true">

    <!-- Custom URI scheme -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="myapp"
            android:host="product"
            android:pathPrefix="/" />
    </intent-filter>

    <!-- App Links (HTTPS verified) -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="www.myapp.com"
            android:pathPrefix="/product" />
    </intent-filter>
</activity>
```

### App Links with assetlinks.json

Host at `https://www.myapp.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.myapp.android",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
    ]
  }
}]
```

Get your certificate fingerprint:
```bash
keytool -list -v -keystore my-release-key.keystore -alias my-key-alias
```

### Handling Deep Links in Activity

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent) {
        val uri = intent.data ?: return
        val path = uri.path ?: return
        val segments = path.split("/").filter { it.isNotEmpty() }

        when {
            segments.firstOrNull() == "product" -> {
                val productId = segments.getOrNull(1)
                navigateToProduct(productId)
            }
            segments.firstOrNull() == "profile" -> {
                val userId = segments.getOrNull(1)
                navigateToProfile(userId)
            }
        }
    }
}
```

### Compose Navigation Deep Link Integration

```kotlin
NavHost(navController, startDestination = "home") {
    composable(
        route = "product/{productId}",
        arguments = listOf(navArgument("productId") { type = NavType.StringType }),
        deepLinks = listOf(
            navDeepLink { uriPattern = "myapp://product/{productId}" },
            navDeepLink { uriPattern = "https://www.myapp.com/product/{productId}" }
        )
    ) { backStackEntry ->
        val productId = backStackEntry.arguments?.getString("productId")
        ProductScreen(productId = productId)
    }
}
```

### Deferred Deep Links (Install Attribution)

Use Firebase Dynamic Links or AppsFlyer for deferred deep links that survive app install:

```kotlin
Firebase.dynamicLinks
    .getDynamicLink(intent)
    .addOnSuccessListener { pendingDynamicLinkData ->
        val deepLink: Uri? = pendingDynamicLinkData?.link
        deepLink?.let { handleDeepLink(it) }
    }
```

---

## iOS

### Universal Links with apple-app-site-association

Host at `https://www.myapp.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.myapp.ios",
        "paths": ["/product/*", "/profile/*", "/settings/*"]
      }
    ]
  }
}
```

Enable Associated Domains in Xcode: `applinks:www.myapp.com`

### URL Schemes in Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>myapp</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.myapp.ios</string>
    </dict>
</array>
```

### Handling in AppDelegate / SceneDelegate

```swift
// SceneDelegate (iOS 13+)
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    DeepLinkRouter.shared.handle(url: url)
}

// Universal Links
func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let url = userActivity.webpageURL else { return }
    DeepLinkRouter.shared.handle(url: url)
}
```

### SwiftUI .onOpenURL

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    DeepLinkRouter.shared.handle(url: url)
                }
        }
    }
}
```

---

## Deep Link Routing Architecture

```swift
// iOS Router
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()
    @Published var destination: Destination?

    enum Destination: Equatable {
        case product(id: String)
        case profile(userId: String)
        case settings
    }

    func handle(url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else { return }
        let pathSegments = components.path.split(separator: "/").map(String.init)

        switch pathSegments.first {
        case "product":
            destination = .product(id: pathSegments[safe: 1] ?? "")
        case "profile":
            destination = .profile(userId: pathSegments[safe: 1] ?? "")
        default:
            break
        }
    }
}
```

---

## Testing Deep Links

```bash
# Android - test custom scheme
adb shell am start -a android.intent.action.VIEW -d "myapp://product/123"

# Android - test App Links
adb shell am start -a android.intent.action.VIEW -d "https://www.myapp.com/product/123"

# iOS Simulator - test URL scheme
xcrun simctl openurl booted "myapp://product/123"

# iOS Simulator - test Universal Link
xcrun simctl openurl booted "https://www.myapp.com/product/123"
```

## Analytics Tracking for Deep Links

Track deep link opens with source attribution:

```kotlin
fun trackDeepLinkOpen(uri: Uri, source: String) {
    analytics.logEvent("deep_link_opened") {
        param("uri", uri.toString())
        param("source", source) // "notification", "email", "social", "qr_code"
        param("path", uri.path ?: "")
        param("has_referrer", (uri.getQueryParameter("ref") != null).toString())
    }
}
```
