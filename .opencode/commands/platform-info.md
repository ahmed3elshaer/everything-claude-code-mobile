---
description: Detect project type (Android/iOS/KMP), list platforms, show platform info, and delegate to appropriate commands.
---

# Platform Info Command

Detect project platform and show information.

## What It Does

1. Detect project type (Android, iOS, KMP, or hybrid)
2. List available platforms
3. Show platform-specific info
4. Delegate to appropriate commands

## Usage

```
/platform-info
/platform-info detect
/platform-info list
```

## Output Examples

```
### Android Project Detected
Type: Android (Gradle)
Build Tool: Gradle
UI: Jetpack Compose
Min SDK: 24
Target SDK: 34

### iOS Project Detected
Type: iOS (Xcode)
Build Tool: xcodebuild
UI: SwiftUI
Deployment Target: 15.0

### KMP Project Detected
Type: Kotlin Multiplatform
Shared Module: shared/
Targets: android, iosArm64, iosX64
Frameworks: Compose (Android), SwiftUI (iOS)
```

## Detection Logic

```bash
# Android detection
- build.gradle.kts exists
- AndroidManifest.xml exists
- settings.gradle.kts exists

# iOS detection
- *.xcodeproj exists
- *.xcworkspace exists
- Package.swift exists

# KMP detection
- kotlin("multiplatform") in build.gradle.kts
- shared/commonMain exists
- expect/actual declarations found
```

## Platform Delegation

When platform is detected, commands delegate:

```
/mobile-build → /android-build (Android) or /ios-build (iOS) or /kmp-build (KMP)
/mobile-test → /android-test or /ios-test or /kmp-test
/mobile-review → /android-review or /ios-review
```
