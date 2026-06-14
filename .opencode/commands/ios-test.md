---
description: Run iOS tests with xcodebuild, show coverage. Invokes ios-testing patterns.
---

# iOS Test Command

Run iOS unit and UI tests.

## What It Does

1. Run `xcodebuild test -scheme MyApp`
2. Show test results and coverage
3. If failures, analyze with ios-testing skill

## Usage

```
/ios-test
/ios-test unit
/ios-test ui
/ios-test coverage
```

## Quick Commands

```bash
# Run all tests
xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15'

# Unit tests only
xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:MyAppTests

# UI tests only
xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:MyAppUITests

# With coverage
xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15' -enableCodeCoverage YES

# Specific test
xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15' -only-testing:MyAppTests/UserTests/testUserCreation
```
