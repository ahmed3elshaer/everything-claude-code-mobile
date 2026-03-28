---
description: Run quality reviews on an implemented feature - code review, security audit, and performance review. Collect findings and apply fixes.
---

# Feature Quality Gate Command

Phase 5 of the feature build pipeline. Runs parallel quality reviews, collects findings, applies fixes, and re-verifies critical issues.

## Usage

```bash
/feature-quality-gate auth
/feature-quality-gate offline-cache
/feature-quality-gate push-notifications
```

## Parallel Reviews

Three review agents run simultaneously:

### Code Review
- `android-reviewer` (Android) / `ios-reviewer` (iOS)
- Kotlin/Swift style compliance
- Pattern adherence (MVI/MVVM, Compose/SwiftUI conventions)
- Error handling completeness
- API surface cleanliness

### Security Audit
- `mobile-security-reviewer`
- No hardcoded secrets or API keys
- Proper encryption for stored data
- HTTPS-only network calls, certificate pinning
- Secure token storage (Keystore / Keychain)
- Input validation and sanitization

### Performance Review
- `mobile-performance-reviewer`
- Compose recomposition efficiency / SwiftUI view identity
- Memory leak detection (retained references, unclosed streams)
- Startup impact analysis
- Network call optimization (batching, caching headers)

## Workflow

1. All three reviews run in parallel
2. Findings collected and deduplicated
3. Fixes applied automatically where possible
4. Critical findings re-verified after fix

## Severity Levels

| Severity | Action | Example |
|----------|--------|---------|
| **Critical** | Must fix before proceeding | Hardcoded API key, memory leak |
| **Warning** | Should fix, non-blocking | Missing null check, suboptimal recomposition |
| **Info** | Nice to have | Naming suggestion, minor style nit |

## Output

Quality report appended to `.omc/state/feature-{name}.json` with findings count per severity and review pass/fail status.

## Invokes

- `android-reviewer` / `ios-reviewer` agent
- `mobile-security-reviewer` agent
- `mobile-performance-reviewer` agent
