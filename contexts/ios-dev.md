# iOS Development Context

iOS-specific development patterns and context injection.

## Purpose

This context provides immediate awareness of the iOS project state without requiring file analysis.

## When It's Injected

- **Session Start**: When iOS project is detected
- **After Compaction**: Restore iOS context
- **Project Switch**: Loading iOS project

## Context Structure

```markdown
## iOS Project Context

### Project Structure
- **Target**: MyApp, MyAppTests, MyAppUITests
- **Bundles**: com.example.myapp
- **Min iOS**: 15.0
- **Swift**: 5.9
- **Xcode**: 15.2

### Architecture
- **Pattern**: MVVM + SwiftUI
- **State Management**: @Observable (iOS 17+)
- **Navigation**: NavigationStack
- **DI**: Manual DI / Environment Objects

### Key Dependencies
- **SwiftUI**: Native
- **Combine**: Native
- **SwiftData**: iOS 17+
- **Networking**: URLSession + async/await
- **Image**: AsyncImage

### UI Components
- **Views**: 42 SwiftUI views
- **Previews**: 38 with previews
- **Sheets**: 12 sheet presentations
- **Navigation**: 5 navigation paths

### Test State
- **Unit Tests**: 45 tests
- **UI Tests**: 12 tests
- **Coverage**: 72%
- **Trend**: Stable
```

## Project Detection

iOS project is detected when:
- `*.xcodeproj` directory exists
- `*.xcworkspace` directory exists
- `Package.swift` file exists (Swift Package Manager)
- `Podfile` exists (CocoaPods)

## Integration Points

### With Mobile Memory

Memory informs iOS development:
```javascript
// iOS-specific structure
const iosStructure = {
    targets: memory.get('targets'),
    schemes: memory.get('schemes'),
    entitlements: memory.get('entitlements'),
    infoPlist: memory.get('info-plist')
}
```

### With Checkpoints

iOS context saved in checkpoints:
```json
{
    "iosContext": {
        "targets": ["MyApp"],
        "frameworks": ["SwiftUI", "Combine"],
        "snapshot": "2026-02-03T10:30:00Z"
    }
}
```

## Quick Commands Reference

```bash
# Build
xcodebuild build -scheme MyApp

# Test
xcodebuild test -scheme MyApp

# Clean
xcodebuild clean -scheme MyApp

# List simulators
xcrun simctl list devices

# Boot simulator
xcrun simctl boot "iPhone 15"
```

---

**Remember**: Context is for awareness. Query memory for specifics when needed.
