# KMP Development Context

Kotlin Multiplatform development context and patterns.

## Purpose

This context provides immediate awareness of the KMP project state for cross-platform development.

## When It's Injected

- **Session Start**: When KMP project is detected
- **After Compaction**: Restore KMP context
- **Platform Switch**: Loading KMP module context

## Context Structure

```markdown
## KMP Project Context

### Module Structure
- **Shared Module**: shared/
- **Targets**: android, iosArm64, iosX64, iosSimulatorArm64
- **Source Sets**: commonMain, androidMain, iosMain, commonTest

### Platform Targets
- **Android**: minSdk 24, targetSdk 34
- **iOS**: 15.0 deployment target
- **Frameworks**: Compose (Android), SwiftUI (iOS)

### Shared Architecture
- **Pattern**: Clean Architecture with MVI
- **Networking**: Ktor 2.3.x
- **Serialization**: kotlinx.serialization 1.6.x
- **DI**: Koin 3.4.x

### expect/actual Declarations
- **Platform Services**: 8 expect declarations
- **Database**: 3 expect implementations
- **File System**: 5 expect implementations
- **Networking**: Platform engines (OkHttp/Darwin)

### Shared Models
- **Domain Models**: 25 @Serializable classes
- **API Models**: 15 request/response models
- **UI State**: 5 sealed hierarchies
```

## Project Detection

KMP project is detected when:
- `build.gradle.kts` contains `kotlin("multiplatform")`
- `settings.gradle.kts` has KMP plugin
- `shared` directory exists with `commonMain`

## Integration Points

### With Mobile Memory

```javascript
const kmpContext = {
    modules: memory.get('kmp-modules'),
    expectActual: memory.get('expect-actual'),
    sharedModels: memory.get('shared-models')
}
```

### With Platform Memory

Merges with Android/iOS contexts for full picture:
```javascript
const fullContext = {
    kmp: kmpContext,
    android: androidContext,
    ios: iosContext
}
```

## Quick Reference

```bash
# KMP Module
./gradlew :shared:build

# Android
./gradlew :androidApp:assembleDebug

# iOS Framework
./gradlew :shared:linkAndSyncDebugFrameworkIosArm64

# Tests
./gradlew test
```

---

**Remember**: KMP context bridges all platforms. Use it for cross-platform awareness.
