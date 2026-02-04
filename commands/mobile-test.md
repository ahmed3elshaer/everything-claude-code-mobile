---
description: Unified mobile test command. Detects platform (Android/iOS/KMP) and delegates to appropriate test command.
---

# Mobile Test Command

Unified test command for mobile projects. Detects platform and delegates appropriately.

## What It Does

1. Detect project type (Android, iOS, KMP, or hybrid)
2. Delegate to platform-specific test command
3. Show test results and coverage

## Delegation

```
/mobile-test
    ├─ Android project detected → /android-test
    ├─ iOS project detected → /ios-test
    └─ KMP project detected → /kmp-test
```

## Usage

```
/mobile-test
/mobile-test --platform=android
/mobile-test --platform=ios
/mobile-test unit
/mobile-test ui
```

## Platform Detection

Same as mobile-build - detects based on project files.

## Platform-Specific Behavior

### Android
```bash
./gradlew test
./gradlew connectedAndroidTest
```

### iOS
```bash
xcodebuild test -scheme MyApp
xcodebuild test -scheme MyApp -only-testing:MyAppTests
```

### KMP
```bash
./gradlew test  # All platforms
./gradlew :shared:allTests  # Common tests
./gradlew :shared:androidAndroidTest
./gradlew :shared:iosSimulatorArm64Test
```
