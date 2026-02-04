---
description: Build iOS project with Xcode, fix errors, generate IPA. Invokes xcode-build-resolver for issues.
---

# iOS Build Command

Build and fix iOS project issues.

## What It Does

1. Run `xcodebuild build -scheme MyApp`
2. If errors, invoke `xcode-build-resolver` agent
3. Report build status

## Usage

```
/ios-build
/ios-build release
/ios-build test
```

## Quick Commands

```bash
# Debug build
xcodebuild build -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15'

# Archive for release
xcodebuild archive -scheme MyApp -archivePath ~/Desktop/MyApp.xcarchive

# Export IPA
xcodebuild -exportArchive -archivePath ~/Desktop/MyApp.xcarchive -exportPath ~/Desktop/IPA

# Clean build
xcodebuild clean -scheme MyApp
```
