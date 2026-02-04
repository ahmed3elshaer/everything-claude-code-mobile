---
description: Run KMP tests across all platforms.
---

# KMP Test Command

Run Kotlin Multiplatform tests on all platforms.

## What It Does

1. Run `./gradlew test` for common and platform tests
2. Show test results per platform
3. Report coverage

## Usage

```
/kmp-test
/kmp-test common
/kmp-test android
/kmp-test ios
```

## Quick Commands

```bash
# All tests
./gradlew test

# Common tests only
./gradlew :shared:allTests

# Android tests
./gradlew :shared:compileKotlinAndroid
./gradlew :shared:androidAndroidTest

# iOS Simulator tests
./gradlew :shared:iosSimulatorArm64Test
./gradlew :shared:iosX64Test
```
