---
description: Build KMP project for all platforms. Invokes kmp-dependency-fix for issues.
---

# KMP Build Command

Build Kotlin Multiplatform project for all target platforms.

## What It Does

1. Run `./gradlew build` for all KMP targets
2. If errors, invoke `kmp-dependency-fix` agent
3. Report build status per platform

## Usage

```
/kmp-build
/kmp-build android
/kmp-build ios
/kmp-build all
```

## Quick Commands

```bash
# Build all platforms
./gradlew build

# Build specific target
./gradlew :shared:compileKotlinAndroid
./gradlew :shared:compileKotlinIos

# Xcode framework (for iOS)
./gradlew :shared:linkAndSyncDebugFrameworkIosArm64
./gradlew :shared:linkDebugFrameworkIosX64
```
