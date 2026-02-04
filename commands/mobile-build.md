---
description: Unified mobile build command. Detects platform (Android/iOS/KMP) and delegates to appropriate build command. Invokes platform-specific resolver on failure.
---

# Mobile Build Command

Unified build command for mobile projects. Detects platform and delegates appropriately.

## What It Does

1. Detect project type (Android, iOS, KMP, or hybrid)
2. Delegate to platform-specific build command
3. If errors, invoke appropriate resolver agent
4. Report build status

## Delegation

```
/mobile-build
    ├─ Android project detected → /android-build
    ├─ iOS project detected → /ios-build
    └─ KMP project detected → /kmp-build
```

## Usage

```
/mobile-build
/mobile-build --platform=android
/mobile-build --platform=ios
/mobile-build release
```

## Platform Detection

```bash
# Android detection
- build.gradle.kts exists
- settings.gradle.kts exists
- AndroidManifest.xml exists

# iOS detection
- *.xcodeproj exists
- *.xcworkspace exists
- Package.swift exists

# KMP detection
- kotlin("multiplatform") in build.gradle.kts
- shared/commonMain exists
```

## Platform-Specific Behavior

### Android
```bash
./gradlew assembleDebug
./gradlew assembleRelease
```

### iOS
```bash
xcodebuild build -scheme MyApp
xcodebuild archive -scheme MyApp
```

### KMP
```bash
./gradlew build  # All targets
./gradlew :shared:compileKotlinAndroid
./gradlew :shared:linkAndSyncDebugFrameworkIosArm64
```
