# Android Setup Guide

## Environment Setup

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Android Studio | 2023.2+ | IDE and SDK |
| JDK | 17+ | Kotlin compilation |
| Gradle | 8.2+ | Build system |

### Environment Variables

```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME="$HOME/Library/Android/sdk"  # macOS
# export ANDROID_HOME="$HOME/Android/Sdk"        # Linux
# export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" # Windows

export JAVA_HOME="$(/usr/libexec/java_home)"     # macOS
# export JAVA_HOME="/usr/lib/jvm/java-17"        # Linux

export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/emulator:$PATH"
```

## Project Structure

```
app/
├── build.gradle.kts
├── src/
│   ├── main/
│   │   ├── kotlin/com/example/
│   │   │   ├── di/           # Koin modules
│   │   │   ├── data/         # Repositories, API
│   │   │   ├── domain/       # Use cases
│   │   │   └── ui/           # Compose screens
│   │   └── res/
│   └── test/                 # Unit tests
feature/
├── home/
├── detail/
└── ...
core/
├── common/
├── network/
└── ui/
gradle/
└── libs.versions.toml        # Version catalog
```

## Recommended Dependencies

```toml
# gradle/libs.versions.toml
[versions]
compose-bom = "2024.02.00"
koin = "3.5.3"
ktor = "2.3.8"
coroutines = "1.8.0"

[libraries]
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
koin-compose = { module = "io.insert-koin:koin-androidx-compose", version.ref = "koin" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
```

## First Build

```bash
# Sync project
./gradlew --refresh-dependencies

# Build debug
./gradlew assembleDebug

# Run tests
./gradlew test
```

## Next Steps

- [Architecture Guide](./architecture.md) - MVI patterns
- [TDD Workflow](./tdd-workflow.md) - Testing approach
