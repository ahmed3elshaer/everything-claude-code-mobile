---
name: push-notifications
description: Push notification patterns - FCM setup for Android, APNs for iOS, notification channels, payload handling, foreground/background behavior, and rich notifications.
---

# Push Notification Patterns

## Android / Firebase Cloud Messaging

### Firebase Setup

Add `google-services.json` to the `app/` directory and configure dependencies:

```kotlin
// build.gradle.kts (project)
plugins {
    id("com.google.gms.google-services") version "4.4.0" apply false
}

// build.gradle.kts (app)
plugins {
    id("com.google.gms.google-services")
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
}
```

### FirebaseMessagingService Implementation

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // Send token to your server for targeting
        TokenRepository.syncTokenToServer(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Data messages always arrive here
        val data = message.data
        val title = data["title"] ?: message.notification?.title ?: return
        val body = data["body"] ?: message.notification?.body ?: ""

        when (data["type"]) {
            "chat" -> showChatNotification(title, body, data)
            "promo" -> showPromoNotification(title, body, data)
            else -> showDefaultNotification(title, body)
        }
    }

    private fun showDefaultNotification(title: String, body: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_DEFAULT)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    companion object {
        const val CHANNEL_DEFAULT = "default"
        const val CHANNEL_CHAT = "chat_messages"
        const val CHANNEL_PROMO = "promotions"
    }
}
```

### Notification Channels (Android 8+)

```kotlin
object NotificationChannels {
    fun createAll(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(NotificationManager::class.java)

        val defaultChannel = NotificationChannel(
            "default",
            "General",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "General notifications"
        }

        val chatChannel = NotificationChannel(
            "chat_messages",
            "Chat Messages",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "New chat messages"
            enableVibration(true)
            enableLights(true)
        }

        val promoChannel = NotificationChannel(
            "promotions",
            "Promotions",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Promotional offers and deals"
        }

        manager.createNotificationChannels(listOf(defaultChannel, chatChannel, promoChannel))
    }
}
```

Call `NotificationChannels.createAll(this)` in `Application.onCreate()`.

### Data vs Notification Messages

| Aspect | Notification Message | Data Message |
|--------|---------------------|--------------|
| Foreground | `onMessageReceived` | `onMessageReceived` |
| Background | System tray (auto) | `onMessageReceived` |
| Customizable | Limited | Full control |
| Payload key | `"notification": {}` | `"data": {}` |

**Best practice:** Use data-only messages for full control over display behavior.

### Token Registration and Server Sync

```kotlin
class TokenRepository(private val api: ApiService) {
    suspend fun syncTokenToServer(token: String) {
        val deviceInfo = DeviceInfo(
            token = token,
            platform = "android",
            appVersion = BuildConfig.VERSION_NAME,
            locale = Locale.getDefault().toLanguageTag()
        )
        api.registerPushToken(deviceInfo)
    }

    suspend fun getAndSyncToken() {
        val token = FirebaseMessaging.getInstance().token.await()
        syncTokenToServer(token)
    }
}
```

### Notification Permission (Android 13+)

```kotlin
val requestPermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
) { isGranted ->
    if (isGranted) {
        // Permission granted, sync token
    }
}

if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
}
```

---

## iOS / APNs

### Push Notification Capability

Enable in Xcode: Target > Signing & Capabilities > + Push Notifications.
Also enable Background Modes > Remote notifications.

### UNUserNotificationCenter Setup and Permissions

```swift
import UserNotifications

final class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        do {
            let granted = try await center.requestAuthorization(
                options: [.alert, .badge, .sound, .provisional]
            )
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            return granted
        } catch {
            return false
        }
    }

    // Foreground notification display
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        return [.banner, .badge, .sound]
    }

    // Notification tap handling
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        handleNotificationPayload(userInfo)
    }

    private func handleNotificationPayload(_ userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else { return }
        switch type {
        case "chat":
            let chatId = userInfo["chat_id"] as? String ?? ""
            DeepLinkRouter.shared.destination = .chat(id: chatId)
        case "product":
            let productId = userInfo["product_id"] as? String ?? ""
            DeepLinkRouter.shared.destination = .product(id: productId)
        default:
            break
        }
    }
}
```

### AppDelegate Registration

```swift
func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    Task { await TokenService.shared.syncToken(token) }
}

func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
) {
    print("Push registration failed: \(error.localizedDescription)")
}
```

### Notification Service Extension (Rich Notifications)

Create a new target: File > New > Target > Notification Service Extension.

```swift
class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let content = bestAttemptContent,
              let imageURLString = content.userInfo["image_url"] as? String,
              let imageURL = URL(string: imageURLString) else {
            contentHandler(request.content)
            return
        }

        downloadImage(from: imageURL) { attachment in
            if let attachment = attachment {
                content.attachments = [attachment]
            }
            contentHandler(content)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let content = bestAttemptContent {
            contentHandler?(content)
        }
    }
}
```

### Provisional Authorization (iOS 12+)

Provisional auth delivers notifications quietly to Notification Center without prompting:

```swift
let granted = try await center.requestAuthorization(options: [.alert, .sound, .provisional])
```

Users can then promote to prominent delivery or turn off from the notification itself.

---

## Testing

```bash
# Android - send test via Firebase CLI
firebase messaging:send --project=my-project --json '{
  "message": {
    "token": "DEVICE_TOKEN",
    "data": { "type": "chat", "title": "Test", "body": "Hello" }
  }
}'

# iOS - local notification for testing UI
let content = UNMutableNotificationContent()
content.title = "Test Notification"
content.body = "This is a local test."
let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
let request = UNNotificationRequest(identifier: "test", content: content, trigger: trigger)
try await UNUserNotificationCenter.current().add(request)
```
