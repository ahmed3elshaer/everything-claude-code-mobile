---
description: Run Android unit and instrumentation tests. Invokes mobile-tdd-guide for test-driven development.
---

# Android Test Command

Run tests and verify coverage.

## Usage

```
/android-test
/android-test :feature:home
/android-test --coverage
```

## Quick Commands

```bash
# All unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest

# With coverage
./gradlew koverHtmlReport
```
