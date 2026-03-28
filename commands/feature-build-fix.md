---
description: Compile the feature, run all tests, and iteratively fix compilation errors and test failures until everything passes. Max 5 iterations.
---

# Feature Build Fix Command

Phase 4 of the feature build pipeline. Iteratively compiles and fixes until the feature builds and all tests pass.

## Usage

```bash
/feature-build-fix auth
/feature-build-fix offline-cache
/feature-build-fix push-notifications
```

## Workflow Loop (Max 5 Iterations)

```
┌─→ 1. Compile
│      ├─ Android: ./gradlew build
│      └─ iOS: xcodebuild build
│
│   2. Compile failed?
│      ├─ Android → android-build-resolver fixes errors
│      └─ iOS → xcode-build-resolver fixes errors
│      └─ Go to step 1
│
│   3. Compile passed → Run tests
│      ├─ Android: ./gradlew test connectedAndroidTest
│      └─ iOS: xcodebuild test
│
│   4. Tests failed?
│      └─ mobile-tdd-guide analyzes and fixes failures
│      └─ Go to step 1
│
└── 5. All pass → Phase complete ✓
```

## Iteration Tracking

Each iteration is logged in `.omc/state/feature-{name}.json`:

```
build-fix:
  iteration: 3
  max: 5
  history:
    - { round: 1, compile: fail, errors: 12 }
    - { round: 2, compile: pass, tests: fail, failures: 4 }
    - { round: 3, compile: pass, tests: pass }
  status: completed
```

## Escalation

If max iterations (5) reached without full success:
- Reports remaining compile errors and test failures to user
- Lists blocked items with suggested manual fixes
- State marked as `blocked` for `/feature-status` visibility

## Invokes

- `android-build-resolver` agent (Android compile errors)
- `xcode-build-resolver` agent (iOS compile errors)
- `mobile-tdd-guide` agent (test failure analysis and fixes)
