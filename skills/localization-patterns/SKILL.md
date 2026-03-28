---
name: localization-patterns
description: Localization patterns for mobile - string resources, plurals, RTL support, Compose localization, KMP shared strings, and locale management.
---

# Localization Patterns for Mobile

## Android

### strings.xml Resources

```xml
<!-- res/values/strings.xml (default - English) -->
<resources>
    <string name="app_name">MyApp</string>
    <string name="welcome_message">Welcome, %1$s!</string>
    <string name="price_format">%1$s %2$.2f</string>

    <string-array name="categories">
        <item>Electronics</item>
        <item>Clothing</item>
        <item>Books</item>
    </string-array>

    <plurals name="items_count">
        <item quantity="zero">No items</item>
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>

<!-- res/values-es/strings.xml (Spanish) -->
<resources>
    <string name="app_name">MiApp</string>
    <string name="welcome_message">Bienvenido, %1$s!</string>

    <plurals name="items_count">
        <item quantity="one">%d elemento</item>
        <item quantity="other">%d elementos</item>
    </plurals>
</resources>

<!-- res/values-ar/strings.xml (Arabic - RTL) -->
<resources>
    <string name="welcome_message">%1$s ,مرحبًا</string>

    <plurals name="items_count">
        <item quantity="zero">لا عناصر</item>
        <item quantity="one">عنصر واحد</item>
        <item quantity="two">عنصران</item>
        <item quantity="few">%d عناصر</item>
        <item quantity="many">%d عنصرًا</item>
        <item quantity="other">%d عنصر</item>
    </plurals>
</resources>
```

### String Formatting with Arguments

```kotlin
// Positional arguments: %1$s = first string, %2$d = second integer
// strings.xml: <string name="greeting">Hello %1$s, you have %2$d new messages</string>

val formatted = context.getString(R.string.greeting, userName, messageCount)

// Plurals
val itemsText = context.resources.getQuantityString(
    R.plurals.items_count,
    count,  // quantity selector
    count   // format argument
)
```

### Compose Localization

```kotlin
@Composable
fun WelcomeScreen(userName: String, itemCount: Int) {
    Column {
        Text(text = stringResource(R.string.welcome_message, userName))
        Text(text = pluralStringResource(R.plurals.items_count, itemCount, itemCount))
    }
}
```

### Per-App Language Preference (API 33+)

```kotlin
// AndroidManifest.xml
<application android:localeConfig="@xml/locales_config" ...>

// res/xml/locales_config.xml
<?xml version="1.0" encoding="utf-8"?>
<locale-config xmlns:android="http://schemas.android.com/apk/res/android">
    <locale android:name="en" />
    <locale android:name="es" />
    <locale android:name="ar" />
    <locale android:name="ja" />
</locale-config>
```

```kotlin
// Programmatic language change
val localeManager = context.getSystemService(LocaleManager::class.java)
localeManager.applicationLocales = LocaleList(Locale.forLanguageTag("es"))

// For pre-API 33 with AppCompat
AppCompatDelegate.setApplicationLocales(
    LocaleListCompat.forLanguageTags("es")
)
```

### RTL Layout Support

```xml
<!-- AndroidManifest.xml -->
<application android:supportsRtl="true" ...>

<!-- Use start/end instead of left/right -->
<TextView
    android:layout_marginStart="16dp"
    android:layout_marginEnd="8dp"
    android:paddingStart="12dp"
    android:textAlignment="viewStart" />
```

```kotlin
// Compose RTL
@Composable
fun AdaptiveLayout() {
    val layoutDirection = LocalLayoutDirection.current
    val isRtl = layoutDirection == LayoutDirection.Rtl

    Row(
        modifier = Modifier.padding(start = 16.dp, end = 8.dp)
        // start/end automatically flip in RTL
    ) {
        Icon(
            imageVector = if (isRtl) Icons.Default.ArrowBack else Icons.Default.ArrowForward,
            contentDescription = null
        )
        Text(text = stringResource(R.string.next))
    }
}
```

---

## iOS

### Localizable.strings

```
/* Localizable.strings (English) */
"app_name" = "MyApp";
"welcome_message" = "Welcome, %@!";
"price_format" = "%@ %.2f";
"settings_title" = "Settings";
```

```
/* Localizable.strings (Spanish) */
"app_name" = "MiApp";
"welcome_message" = "Bienvenido, %@!";
"settings_title" = "Configuración";
```

### String Catalogs (.xcstrings - Xcode 15+)

Xcode 15 introduces String Catalogs (`.xcstrings`) as a single JSON file replacing `.strings` and `.stringsdict`. Xcode auto-extracts localizable strings from code and manages translations in one place.

### String(localized:) and NSLocalizedString

```swift
// Modern (iOS 16+)
let welcome = String(localized: "welcome_message")

// With arguments
let greeting = String(localized: "Welcome, \(userName)!")

// Legacy
let title = NSLocalizedString("settings_title", comment: "Title for settings screen")
```

### SwiftUI Text with LocalizedStringKey

```swift
struct WelcomeView: View {
    let userName: String

    var body: some View {
        VStack {
            // Automatically uses Localizable.strings
            Text("settings_title")

            // With interpolation
            Text("Welcome, \(userName)!")

            // Explicit localized key
            Text(LocalizedStringKey("welcome_message"))
        }
    }
}
```

### Plural Rules with .stringsdict

```xml
<!-- Localizable.stringsdict -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
    <key>items_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@count@</string>
        <key>count</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>zero</key>
            <string>No items</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>
```

```swift
let text = String(format: NSLocalizedString("items_count", comment: ""), itemCount)
```

### RTL Support in SwiftUI

```swift
struct AdaptiveRow: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        HStack {
            // leading/trailing automatically respect RTL
            Text("Label")
            Spacer()
            Image(systemName: layoutDirection == .rightToLeft
                ? "chevron.left" : "chevron.right")
        }
        .padding(.leading, 16)
        .padding(.trailing, 8)
    }
}
```

---

## KMP Shared Strings

### Common Interface with expect/actual

```kotlin
// commonMain
expect class StringProvider {
    fun getString(key: String): String
    fun getString(key: String, vararg args: Any): String
    fun getPluralString(key: String, quantity: Int, vararg args: Any): String
}

// androidMain
actual class StringProvider(private val context: Context) {
    actual fun getString(key: String): String {
        val resId = context.resources.getIdentifier(key, "string", context.packageName)
        return if (resId != 0) context.getString(resId) else key
    }

    actual fun getString(key: String, vararg args: Any): String {
        val resId = context.resources.getIdentifier(key, "string", context.packageName)
        return if (resId != 0) context.getString(resId, *args) else key
    }

    actual fun getPluralString(key: String, quantity: Int, vararg args: Any): String {
        val resId = context.resources.getIdentifier(key, "plurals", context.packageName)
        return if (resId != 0) context.resources.getQuantityString(resId, quantity, *args) else key
    }
}

// iosMain
actual class StringProvider {
    actual fun getString(key: String): String {
        return NSBundle.mainBundle.localizedStringForKey(key, value = key, table = null)
    }

    actual fun getString(key: String, vararg args: Any): String {
        val template = getString(key)
        return String.format(template, *args)
    }

    actual fun getPluralString(key: String, quantity: Int, vararg args: Any): String {
        val template = getString(key)
        return String.format(template, *args)
    }
}
```

### moko-resources Library Pattern

```kotlin
// build.gradle.kts
commonMain {
    dependencies {
        implementation("dev.icerock.moko:resources:0.23.0")
    }
}

// commonMain/resources/MR/base/strings.xml
// commonMain/resources/MR/es/strings.xml
// Access: MR.strings.welcome_message.getString()
```

---

## Testing

### Pseudo-Localization

Android: Enable in Developer Options > "Force pseudo-locales" to test with accented characters and RTL wrapping.

```bash
# Force locale on Android emulator
adb shell settings put system user_locale "ar-SA"
adb shell am restart
```

### Layout Testing with Long Strings

Create `values-en-rXA/strings.xml` (pseudo-locale) to test text expansion. German and Finnish text is typically 30-40% longer than English.

```kotlin
// Compose UI test with locale
@Test
fun testLongTextLayout() {
    composeTestRule.setContent {
        CompositionLocalProvider(
            LocalConfiguration provides Configuration().apply {
                setLocale(Locale("de"))
            }
        ) {
            WelcomeScreen(userName = "Maximilian Schwarzenegger")
        }
    }
    // Verify no text truncation or overflow
}
```
