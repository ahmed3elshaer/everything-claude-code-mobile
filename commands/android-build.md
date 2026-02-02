---
description: Build Android project with Gradle, fix errors, generate APK/AAB. Invokes android-build-resolver for issues.
---

# Android Build Command

Build and fix Android project issues.

## What It Does

1. Run `./gradlew build`
2. If errors, invoke `android-build-resolver` agent
3. Report build status

## Usage

```
/android-build
/android-build release
/android-build :feature:home
```

## Quick Commands

```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Build bundle
./gradlew bundleRelease

# Clean build
./gradlew clean build
```
