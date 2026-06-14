---
description: Fix KMP dependency conflicts, version mismatches, and Gradle issues.
---

# KMP Dependency Fix

Fix Kotlin Multiplatform dependency and Gradle issues.

## What It Does

1. Analyzes dependency tree
2. Identifies conflicts
3. Applies fixes with minimal changes

## Common Issues

``❌ Could not resolve com.example:library:1.0.0
→ Add repository or check version

❌ The library is a companion object and cannot be serialized
→ Use @SerializableClassSerializers

�️ Expected class but found interface
→ Check expect/actual matches

�️ Platform class mismatch
→ Verify actual implementations exist
```

## Quick Commands

```bash
# Check dependencies
./gradlew :shared:dependencies --configuration commonMainApi

# Refresh dependencies
./gradlew --refresh-dependencies

# Clean build
./gradlew clean cleanBuildCache
```
