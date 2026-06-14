---
description: Fix Gradle sync, dependency conflicts, and cache issues. Invokes android-build-resolver agent.
---

# Gradle Fix Command

Resolve Gradle build issues.

## Usage

```
/gradle-fix
/gradle-fix dependencies
/gradle-fix sync
```

## Common Fixes

```bash
# Clear caches
./gradlew cleanBuildCache
rm -rf ~/.gradle/caches

# Refresh dependencies
./gradlew --refresh-dependencies

# View dependency tree
./gradlew :app:dependencies
```
