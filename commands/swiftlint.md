---
description: Run SwiftLint to check Swift code style. Auto-fix issues where possible.
---

# SwiftLint Command

Run SwiftLint for Swift code quality checks.

## What It Does

1. Run `swiftlint` to check code style
2. Show violations by severity
3. Offer auto-fix for compatible issues

## Usage

```
/swiftlint
/swiftlint fix
/swiftlint strict
```

## Quick Commands

```bash
# Run SwiftLint
swiftlint

# Auto-fix issues
swiftlint --fix

# Strict mode
swiftlint --strict

# Specific directory
swiftlint --path App/

# Generate report
swiftlint --reporter html > swiftlint-report.html
```
