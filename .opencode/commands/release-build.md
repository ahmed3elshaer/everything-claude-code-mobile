---
description: Build release APK/AAB with signing, ProGuard/R8, and optimizations.
---

# Release Build Command

Build production-ready Android artifacts.

## Usage

```
/release-build
/release-build apk
/release-build bundle
```

## What It Does

1. Runs lint checks
2. Executes all tests
3. Builds signed release
4. Verifies R8 optimization
5. Reports APK/AAB size

## Commands

```bash
# Release APK
./gradlew assembleRelease

# App Bundle (Play Store)
./gradlew bundleRelease

# With mapping upload
./gradlew assembleRelease -PuploadMapping=true
```

## Signing Configuration

```kotlin
// build.gradle.kts
android {
    signingConfigs {
        create("release") {
            storeFile = file(keystoreProperties["storeFile"]!!)
            storePassword = keystoreProperties["storePassword"]!!
            keyAlias = keystoreProperties["keyAlias"]!!
            keyPassword = keystoreProperties["keyPassword"]!!
        }
    }
    
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

## Pre-release Checklist

- [ ] Version code/name updated
- [ ] All tests passing
- [ ] ProGuard rules verified
- [ ] Signing configured
- [ ] Analytics/crash reporting enabled
