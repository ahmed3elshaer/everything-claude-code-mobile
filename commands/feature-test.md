---
description: Create all tests for an implemented feature - unit tests (ViewModel, UseCase, Repository), Compose UI tests, and E2E user flow tests.
---

# Feature Test Command

Phase 3 of the feature build pipeline. Creates comprehensive tests for the implemented feature using parallel test-writing agents.

## Usage

```bash
/feature-test auth
/feature-test offline-cache
/feature-test push-notifications
```

## Prerequisite

Implementation phase must be complete for the feature.

## Parallel Execution

Three agents run in parallel, each reading the plan's test strategy section:

### unit-test-writer
- ViewModel tests (state transitions, error handling)
- UseCase tests (business logic, edge cases)
- Repository tests (data mapping, caching logic)
- Mapper/DTO tests

### ui-test-writer
- Compose/SwiftUI screen tests (rendering, interactions)
- Component tests (states, callbacks)
- Navigation tests (routes, deep links)
- Accessibility tests

### mobile-e2e-runner
- End-to-end user flow tests
- Happy path scenarios
- Error path scenarios
- Offline/online transitions

## Coverage Targets

| Layer | Target |
|-------|--------|
| ViewModel / UseCase | 100% |
| Repository | 90% |
| UI Components | 80% |
| E2E Flows | Critical paths |
| **Overall minimum** | **80%** |

## Output

Test files created alongside source files following platform conventions:
- Android: `src/test/` (unit), `src/androidTest/` (UI/E2E)
- iOS: `Tests/` (unit), `UITests/` (UI/E2E)

## Invokes

- `unit-test-writer` agent
- `ui-test-writer` agent
- `mobile-e2e-runner` agent
