---
name: accessibility-patterns
description: Mobile accessibility patterns for Android and iOS - content descriptions, touch targets, screen reader support, WCAG compliance, dynamic type, and color contrast.
---

# Mobile Accessibility Patterns

## Android / Jetpack Compose

### Content Descriptions

```kotlin
// Images and icons must have content descriptions
Image(
    painter = painterResource(R.drawable.profile_photo),
    contentDescription = "User profile photo"
)

Icon(
    imageVector = Icons.Default.Settings,
    contentDescription = "Open settings"
)

// Decorative elements use null
Image(
    painter = painterResource(R.drawable.decorative_divider),
    contentDescription = null // purely decorative
)
```

### Semantics Modifier

```kotlin
// Custom semantic properties
Box(
    modifier = Modifier.semantics {
        contentDescription = "User card for Alice Johnson, 3 unread messages"
        stateDescription = "Expanded"
    }
)

// Heading hierarchy for screen reader navigation
Text(
    text = "Account Settings",
    style = MaterialTheme.typography.headlineMedium,
    modifier = Modifier.semantics { heading() }
)

// Live region for dynamic content updates
Text(
    text = "Items in cart: $count",
    modifier = Modifier.semantics {
        liveRegion = LiveRegionMode.Polite
    }
)

// Assertive live region for critical updates
Text(
    text = errorMessage,
    modifier = Modifier.semantics {
        liveRegion = LiveRegionMode.Assertive
    }
)
```

### Minimum Touch Target Size

```kotlin
// Material 3 enforces 48dp minimum automatically for clickable elements
// For custom elements, ensure minimum size:
IconButton(
    onClick = { /* action */ },
    modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)
) {
    Icon(Icons.Default.Close, contentDescription = "Close dialog")
}

// Small icon with expanded touch target
Box(
    modifier = Modifier
        .size(48.dp)
        .clickable(onClick = { /* action */ }),
    contentAlignment = Alignment.Center
) {
    Icon(
        imageVector = Icons.Default.Info,
        contentDescription = "More information",
        modifier = Modifier.size(24.dp)
    )
}
```

### Grouping and Merging Semantics

```kotlin
// Merge child semantics into a single announcement
Row(
    modifier = Modifier
        .clearAndSetSemantics {
            contentDescription = "Alice Johnson, Software Engineer, Online"
        }
        .clickable { onUserClick() }
) {
    Avatar(url = user.avatarUrl)
    Column {
        Text(user.name)
        Text(user.title)
    }
    OnlineIndicator(isOnline = user.isOnline)
}

// Role assignment
Box(
    modifier = Modifier
        .clickable { onAction() }
        .semantics { role = Role.Button }
) {
    Text("Custom Button")
}

// Tab role
Text(
    text = tabTitle,
    modifier = Modifier
        .clickable { onTabSelect() }
        .semantics {
            role = Role.Tab
            selected = isSelected
        }
)
```

### Toggle and Switch Accessibility

```kotlin
Row(
    modifier = Modifier
        .toggleable(
            value = isEnabled,
            onValueChange = { onToggle(it) },
            role = Role.Switch
        )
        .padding(16.dp)
        .semantics {
            contentDescription = "Dark mode"
            stateDescription = if (isEnabled) "Enabled" else "Disabled"
        }
) {
    Text("Dark Mode", modifier = Modifier.weight(1f))
    Switch(checked = isEnabled, onCheckedChange = null) // null: Row handles toggle
}
```

### Traversal Order

```kotlin
Column(
    modifier = Modifier.semantics {
        traversalIndex = 0f // read first
    }
) {
    Text("Important announcement")
}

Column(
    modifier = Modifier.semantics {
        traversalIndex = 1f // read second
    }
) {
    Text("Secondary content")
}
```

## iOS / SwiftUI

### Accessibility Labels and Hints

```swift
Image(systemName: "gear")
    .accessibilityLabel("Settings")
    .accessibilityHint("Opens application settings")

Button(action: { deleteItem() }) {
    Image(systemName: "trash")
}
.accessibilityLabel("Delete item")
.accessibilityHint("Permanently removes this item from your list")
```

### Combining Child Elements

```swift
HStack {
    Image(systemName: "person.circle")
    VStack(alignment: .leading) {
        Text(user.name)
        Text(user.role)
    }
}
.accessibilityElement(children: .combine) // reads as single element

// Ignore children, provide custom label
HStack {
    StarRating(rating: 4.5)
}
.accessibilityElement(children: .ignore)
.accessibilityLabel("Rating: 4.5 out of 5 stars")
```

### Dynamic Type Support

```swift
// Use system text styles that scale automatically
Text("Heading")
    .font(.title)

Text("Body text")
    .font(.body)

// Custom sizes that scale
@ScaledMetric(relativeTo: .body) var iconSize: CGFloat = 24

Image(systemName: "star.fill")
    .frame(width: iconSize, height: iconSize)

// Fixed minimum line height
Text("Important text")
    .font(.body)
    .lineSpacing(4)
```

### Reduce Motion Support

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

var animation: Animation? {
    reduceMotion ? nil : .spring(response: 0.5)
}

Button("Animate") {
    withAnimation(animation) {
        isExpanded.toggle()
    }
}
```

### VoiceOver Rotor Support

```swift
List(items) { item in
    ItemRow(item: item)
        .accessibilityRotorEntry(id: item.id, in: .headings)
}

// Custom rotor
.accessibilityRotor("Unread Messages") {
    ForEach(messages.filter(\.isUnread)) { message in
        AccessibilityRotorEntry(message.subject, id: message.id)
    }
}
```

### Accessibility Actions

```swift
ItemRow(item: item)
    .accessibilityAction(named: "Delete") {
        deleteItem(item)
    }
    .accessibilityAction(named: "Mark as favorite") {
        toggleFavorite(item)
    }
```

## Cross-Platform Patterns

### Color Contrast Requirements (WCAG 2.1)

```
Minimum contrast ratios:
- Normal text:     4.5:1 (AA)
- Large text:      3.0:1 (AA, >=18sp or >=14sp bold)
- UI components:   3.0:1 (AA)
- Enhanced (AAA):  7.0:1 for normal text, 4.5:1 for large text

Common passing combinations:
- #000000 on #FFFFFF -> 21:1 (pass all)
- #595959 on #FFFFFF -> 7.0:1 (pass AAA)
- #767676 on #FFFFFF -> 4.54:1 (pass AA)
- #949494 on #FFFFFF -> 2.95:1 (FAIL AA)
```

### Focus Management

```kotlin
// Android/Compose: Request focus
val focusRequester = remember { FocusRequester() }

TextField(
    value = text,
    onValueChange = { text = it },
    modifier = Modifier.focusRequester(focusRequester)
)

LaunchedEffect(Unit) {
    focusRequester.requestFocus()
}
```

```swift
// iOS/SwiftUI: Focus state
@FocusState private var isTextFieldFocused: Bool

TextField("Search", text: $query)
    .focused($isTextFieldFocused)

Button("Focus Search") {
    isTextFieldFocused = true
}
```

### Error Announcements

```kotlin
// Android: Announce error to screen reader
Text(
    text = "Invalid email address",
    color = MaterialTheme.colorScheme.error,
    modifier = Modifier.semantics {
        liveRegion = LiveRegionMode.Assertive
        error("Invalid email address")
    }
)
```

```swift
// iOS: Post accessibility notification
AccessibilityNotification.Announcement("Invalid email address")
    .post()
```

## Testing Accessibility

### Android

```kotlin
@Test
fun profileCard_hasCorrectSemantics() {
    composeTestRule.setContent {
        ProfileCard(user = testUser)
    }

    composeTestRule
        .onNodeWithContentDescription("User profile photo")
        .assertExists()

    composeTestRule
        .onNode(hasClickAction() and hasText("View Profile"))
        .assert(hasMinimumTouchTargetSize())
}
```

### Manual Testing Checklist

```
1. Enable TalkBack (Android) / VoiceOver (iOS)
2. Navigate through the entire screen using swipe gestures
3. Verify every interactive element is reachable and announced
4. Check that images have meaningful descriptions (or are hidden if decorative)
5. Verify touch targets are at least 48dp x 48dp
6. Test with font scaling at 200%
7. Test with display size set to largest
8. Test with high contrast / bold text enabled
9. Verify color is not the only indicator of state
10. Check focus order matches visual reading order
```

## Best Practices

- Every interactive element must have a content description or accessible label.
- Never rely solely on color to convey meaning; pair with icons, text, or patterns.
- Group related elements so screen readers announce them as a single unit.
- Use heading semantics to create a navigable document structure.
- Test with real assistive technology, not just automated checks.
- Support both larger text sizes and reduced motion preferences.
- Provide live region announcements for dynamic content changes (toasts, counters, errors).
- Minimum 48dp (Android) / 44pt (iOS) touch target for all interactive elements.
