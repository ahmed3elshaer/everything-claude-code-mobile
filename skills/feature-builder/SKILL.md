---
name: feature-builder
description: End-to-end mobile feature builder. Takes a feature from description to fully running code with E2E tests through six phases - planning, architecture review, implementation, testing, build-fix, quality gate, and verification. Supports Android, iOS, and KMP with platform auto-detection.
---

# Feature Builder Skill

Zero-to-feature orchestration pipeline for mobile development. Transforms a feature description into production-ready code through six structured phases with automated agent coordination, build verification, and quality enforcement.

## Overview

The feature builder runs a deterministic six-phase pipeline:

```
Phase 1: Planning          Phase 2: Implementation       Phase 3: Testing
 ┌────────────┐             ┌────────────────┐            ┌──────────────┐
 │ Plan + Arch│────────────▶│ 5-Agent DAG    │───────────▶│ 3 Test Agents│
 │   Review   │             │  Build Code    │            │  in Parallel │
 └────────────┘             └────────────────┘            └──────────────┘
        │                                                        │
        ▼                                                        ▼
Phase 6: Verification      Phase 5: Quality Gate          Phase 4: Build & Fix
 ┌────────────┐             ┌────────────────┐            ┌──────────────┐
 │ pass@k=3   │◀────────────│ 3 Reviewers    │◀───────────│ Compile/Test │
 │ Coverage   │             │  in Parallel   │            │  Fix Loop    │
 └────────────┘             └────────────────┘            └──────────────┘
```

**Entry Points:**
- `/feature-build <description>` -- Full pipeline from planning to verification
- `/feature-build --from-phase=<N>` -- Resume from a specific phase
- `/feature-build --skip-phase=<N>` -- Skip a phase (e.g., skip quality gate for prototypes)
- Individual phase commands for targeted execution

**Supported Platforms:** Android, iOS, KMP (auto-detected or explicit via `--platform`)

---

## Usage

### Full Pipeline

```bash
# Auto-detect platform, run all phases
/feature-build "User authentication with biometric login"

# Explicit platform
/feature-build --platform=android "Shopping cart checkout flow"
/feature-build --platform=ios "Push notification preferences"
/feature-build --platform=kmp "Offline-first data sync"
```

### Partial Execution

```bash
# Resume from implementation (plan already exists)
/feature-build --from-phase=2 --feature=auth

# Skip quality gate for rapid prototyping
/feature-build --skip-phase=5 "Quick settings screen"

# Run only a single phase
/feature-plan "User profile editor"
/feature-implement --feature=profile-editor
/feature-test --feature=profile-editor
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--platform` | Target platform: `android`, `ios`, `kmp` | Auto-detect |
| `--from-phase` | Start from phase N (1-6) | `1` |
| `--skip-phase` | Comma-separated phases to skip | None |
| `--feature` | Feature name (for resuming) | Derived from description |
| `--force` | Reset and re-run current phase | `false` |
| `--dry-run` | Generate plan only, no implementation | `false` |

---

## Phase 1: Planning (`/feature-plan`)

Creates a comprehensive plan document and validates it through architecture review.

### Workflow

```
User Description
       │
       ▼
┌──────────────────┐     ┌───────────────────┐     ┌─────────────┐
│ feature-planner  │────▶│ mobile-architect   │────▶│ User Review │
│ (create plan)    │     │ (critique plan)    │     │ (approve)   │
└──────────────────┘     └───────────────────┘     └─────────────┘
```

### Steps

1. **Platform Detection** -- Scan project for platform markers (see Platform Detection)
2. **Codebase Analysis** -- `feature-planner` agent reads project structure, existing modules, DI setup, navigation graph, and version catalog
3. **Plan Generation** -- Produces `.omc/plans/feature-{name}.json` with module breakdown, file list, dependency graph, and task ordering
4. **Architecture Review** -- `mobile-architect` agent (model: opus) critiques the plan for:
   - Layer separation violations
   - Missing error handling paths
   - Navigation integration gaps
   - DI registration completeness
   - Naming convention adherence
5. **Revision** -- Planner incorporates architect feedback
6. **User Approval** -- Present plan summary; user approves, requests changes, or cancels

### Checkpoint

```
Checkpoint: after-plan-{featureName}
Contents: plan document, platform detection results, codebase analysis
```

---

## Phase 2: Implementation (`/feature-implement`)

Executes a five-agent dependency DAG to build the feature layer by layer.

### Agent DAG

```
         ┌─────────────────────┐
         │  architecture-impl  │   Phase 2a: Domain layer
         │  (domain models,    │   - Models, repository interfaces
         │   use cases, repo   │   - Use cases with Result<T>
         │   interfaces)       │   - Domain exceptions
         └──────────┬──────────┘
                    │
           ┌────────┴────────┐
           ▼                 ▼
  ┌─────────────────┐  ┌─────────────────┐
  │   network-impl  │  │     ui-impl     │   Phase 2b: Parallel
  │   (API client,  │  │   (Composables, │   - Network + UI run
  │    DTOs, remote │  │    Screens,     │     simultaneously
  │    data source) │  │    ViewModels,  │   - Both read plan for
  └────────┬────────┘  │    States,      │     file locations
           │           │    Intents)     │
           │           └─────────────────┘
           ▼
  ┌─────────────────┐
  │    data-impl    │   Phase 2c: Data layer
  │  (Repository    │   - Needs network DTOs
  │   impl, mappers,│   - Implements domain interfaces
  │   local cache)  │   - Mapper functions
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   wiring-impl   │   Phase 2d: Integration
  │  (DI modules,   │   - Koin/Hilt module registration
  │   navigation,   │   - Navigation graph updates
  │   manifest)     │   - AndroidManifest changes (if any)
  └─────────────────┘
```

### Execution Rules

- Each agent reads from `.omc/plans/feature-{name}.json` for its file list and module paths
- Agents write only to their designated files (enforced by plan document)
- `network-impl` and `ui-impl` run in parallel since they have no mutual dependency
- `data-impl` waits for `network-impl` (needs DTOs for mapping)
- `wiring-impl` runs last to connect all layers
- All agents respect the project's existing patterns (read from mobile-memory MCP)

### Platform-Specific Behavior

| Platform | Domain | Network | UI | Data | Wiring |
|----------|--------|---------|-----|------|--------|
| Android | Kotlin data classes | Retrofit/Ktor | Compose + ViewModel | Room/DataStore | Koin/Hilt + Navigation |
| iOS | Swift structs | URLSession/Alamofire | SwiftUI + ObservableObject | CoreData/SwiftData | Dependency container + NavigationStack |
| KMP | commonMain models | Ktor (shared) | Compose Multiplatform / SwiftUI | SQLDelight | Koin + expect/actual navigation |

### Checkpoint

```
Checkpoint: after-impl-{featureName}
Contents: all generated source files, updated DI modules, navigation changes
```

---

## Phase 3: Testing (`/feature-test`)

Three test-writing agents run in parallel, each reading the plan's test section.

### Agents

```
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  unit-test-writer  │  │  ui-test-writer   │  │ mobile-e2e-runner │
│                   │  │                   │  │                   │
│ - ViewModel tests │  │ - Screen tests    │  │ - Flow tests      │
│ - UseCase tests   │  │ - Component tests │  │ - Integration     │
│ - Repository tests│  │ - Navigation tests│  │ - Happy path      │
│ - Mapper tests    │  │ - Snapshot tests  │  │ - Error paths     │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Test Coverage Targets

| Test Type | Minimum Coverage | Agent |
|-----------|-----------------|-------|
| Unit tests | 80% line coverage | `unit-test-writer` |
| UI tests | All screens + key interactions | `ui-test-writer` |
| E2E tests | Happy path + top 3 error paths | `mobile-e2e-runner` |

### Test File Locations

| Platform | Unit Tests | UI Tests | E2E Tests |
|----------|-----------|----------|-----------|
| Android | `src/test/java/...` | `src/androidTest/java/...` | `src/androidTest/java/.../e2e/` |
| iOS | `Tests/{Feature}Tests/` | `UITests/{Feature}UITests/` | `UITests/{Feature}E2ETests/` |
| KMP | `src/commonTest/...` | Platform-specific `androidTest`/`iosTest` | Platform-specific |

### Checkpoint

```
Checkpoint: after-test-{featureName}
Contents: all test files, test configuration changes
```

---

## Phase 4: Build & Fix (`/feature-build-fix`)

Iterative compile-test-fix loop that resolves build errors and test failures.

### Loop

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Compile    │────▶│  Analyze     │────▶│    Fix       │
│              │     │  Errors      │     │              │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │         ┌──────────────┐                │
       │         │  Run Tests   │                │
       │         └──────┬───────┘                │
       │                │                        │
       ▼                ▼                        ▼
  ┌─────────────────────────────────────────────────┐
  │              All Green?                          │
  │  YES ──▶ Proceed to Phase 5                     │
  │  NO  ──▶ Iteration++ (max 5)                    │
  │  MAX  ──▶ Escalate to user with diagnostics     │
  └─────────────────────────────────────────────────┘
```

### Build Commands by Platform

| Platform | Compile | Unit Tests | UI Tests |
|----------|---------|------------|----------|
| Android | `./gradlew assembleDebug` | `./gradlew test` | `./gradlew connectedAndroidTest` |
| iOS | `xcodebuild build` | `xcodebuild test` | `xcodebuild test -testPlan UITests` |
| KMP | `./gradlew build` | `./gradlew allTests` | Platform-specific |

### Error Resolution Agents

| Platform | Agent | Specialization |
|----------|-------|---------------|
| Android | `android-build-resolver` | Gradle, Kotlin compiler, resource errors |
| iOS | `xcode-build-resolver` | Xcode, Swift compiler, linker errors |
| KMP | Both (routed by error source) | Shared + platform-specific errors |

### Iteration Limits

- **Max iterations:** 5
- **Per-iteration timeout:** 3 minutes
- **Escalation:** After 5 failed iterations, pause and present:
  - Full error log from last iteration
  - Summary of attempted fixes
  - Suggested manual interventions
  - Option to `--force` reset the phase

### Checkpoint

```
Checkpoint: after-build-fix-{featureName}
Contents: compiled artifacts, fixed source files, build logs
```

---

## Phase 5: Quality Gate (`/feature-quality-gate`)

Three review agents run in parallel to assess code quality, security, and performance.

### Reviewers

```
┌───────────────────────┐  ┌──────────────────────────┐  ┌────────────────────────────────┐
│   android-reviewer    │  │ mobile-security-reviewer  │  │ mobile-performance-reviewer    │
│   (or ios-reviewer)   │  │                          │  │                                │
│                       │  │ - Hardcoded secrets      │  │ - Memory leaks                 │
│ - Code style          │  │ - Insecure storage       │  │ - Unnecessary recomposition    │
│ - Architecture        │  │ - Network security       │  │ - Blocking main thread         │
│ - Error handling      │  │ - Input validation       │  │ - Large allocations            │
│ - Naming conventions  │  │ - Logging exposure       │  │ - N+1 queries                  │
│ - Dead code           │  │ - Permission usage       │  │ - Image loading efficiency     │
└───────────┬───────────┘  └────────────┬─────────────┘  └───────────────┬────────────────┘
            │                           │                                │
            └───────────────┬───────────┘                                │
                            │◀───────────────────────────────────────────┘
                            ▼
                   ┌────────────────┐
                   │ Collect & Triage│
                   │  Findings      │
                   └────────┬───────┘
                            │
                   ┌────────▼───────┐
                   │ Apply Fixes    │
                   │ (auto for low) │
                   └────────┬───────┘
                            │
                   ┌────────▼───────┐
                   │ Re-verify      │
                   │ Critical Items │
                   └────────────────┘
```

### Finding Severity Levels

| Severity | Action | Example |
|----------|--------|---------|
| **Critical** | Block release, fix immediately | Hardcoded API key, SQL injection |
| **High** | Must fix before merge | Missing error handling, memory leak |
| **Medium** | Should fix, auto-applied when possible | Naming convention violation, missing null check |
| **Low** | Informational, auto-applied | Import ordering, trailing whitespace |

### Gate Pass Criteria

- Zero critical findings
- Zero high findings (or user-acknowledged exceptions)
- All medium findings addressed or explicitly deferred
- Re-verification passes for any critical/high fixes applied

### Checkpoint

```
Checkpoint: after-quality-gate-{featureName}
Contents: review reports, applied fixes, acknowledged deferrals
```

---

## Phase 6: Verification (`/feature-verify`)

Final sign-off with pass@k reliability testing and coverage enforcement.

### Process

1. **pass@k=3 Testing** -- `mobile-verifier` agent runs all feature tests 3 times
2. **Flaky Detection** -- Identify tests with pass@k < 1.0
3. **Coverage Check** -- Enforce >= 80% line coverage on new code
4. **Report Generation** -- Produce final verification report

### Acceptance Criteria

| Metric | Threshold | Action if Failed |
|--------|-----------|-----------------|
| Unit test pass@3 | >= 0.95 | Fix flaky tests, re-run |
| UI test pass@3 | >= 0.80 | Investigate, fix or quarantine |
| E2E test pass@3 | >= 0.60 | Investigate root cause |
| Line coverage | >= 80% | Add missing tests |
| Critical findings | 0 | Return to Phase 5 |

### Final Report

```
Feature: {featureName}
Platform: {platform}
Status: PASSED / FAILED

Phase Results:
  1. Planning .............. COMPLETED
  2. Implementation ........ COMPLETED (5 agents, 23 files)
  3. Testing ............... COMPLETED (14 unit, 6 UI, 3 E2E)
  4. Build & Fix ........... COMPLETED (2 iterations)
  5. Quality Gate .......... COMPLETED (0 critical, 1 medium fixed)
  6. Verification .......... COMPLETED (pass@3=0.96, coverage=84%)

Files Created: 23
Tests Written: 23
Build Iterations: 2
Duration: ~18 minutes
```

### Checkpoint

```
Checkpoint: feature-complete-{featureName}
Contents: full verification report, final metrics, all source + test files
```

---

## Phase 7: Learning (`/feature-learn`)

Automatic pattern extraction and continuous learning. Runs immediately after Phase 6 verification completes -- no separate invocation needed.

### Process

```
Phase 6 PASSED
       |
       v
+-----------------------+     +------------------------+     +---------------------+
| Scan Generated Files  |---->| Extract Mobile Patterns|---->| Detect Feature      |
| (from plan manifest)  |     | (17 pattern matchers)  |     | Composite Patterns  |
+-----------------------+     +------------------------+     +---------------------+
                                                                      |
                                                                      v
+---------------------+     +------------------------+     +---------------------+
| Save Learning       |<----| Calculate Completeness |<----| Store as Instincts  |
| Summary Report      |     | Score (weighted)       |     | (with confidence)   |
+---------------------+     +------------------------+     +---------------------+
```

### Pattern Extraction

The learning phase scans all generated feature files for established mobile patterns:

| Category | Patterns Detected | Context Tag |
|----------|------------------|-------------|
| **Compose** | State hoisting, lazy keys, immutable data classes | `jetpack-compose` |
| **MVI** | Intent handling, sealed state/intent/side-effect | `mvi-architecture` |
| **DI** | Koin module definition, ViewModel injection | `koin-patterns` |
| **Network** | Safe Ktor requests with runCatching | `ktor-patterns` |
| **Coroutines** | Structured concurrency with viewModelScope | `coroutines-patterns` |
| **Clean Architecture** | Repository interface/impl, use cases, mappers, Result type | `clean-architecture` |
| **Navigation** | Compose Navigation route registration | `navigation-patterns` |

### Feature Composite Patterns

Higher-level patterns detected by combining individual pattern presence:

| Pattern ID | Criteria | Weight |
|-----------|----------|--------|
| `feature-clean-architecture` | Domain + Data + Presentation layers all present (repository interface, impl, and use case detected) | 25% |
| `feature-mvi-complete` | State + Intent + SideEffect sealed interfaces + ViewModel with viewModelScope | 25% |
| `feature-di-complete` | Koin module definition + ViewModel injection present | 15% |
| `feature-test-coverage` | Unit + UI + E2E test files all present in plan | 20% |
| `feature-navigation-wired` | Navigation route registered in navigation graph | 15% |

### Confidence Scoring

- Individual patterns start at confidence **0.5** (higher than session-detected patterns at 0.4, since feature builds are more deliberate)
- Each subsequent detection of the same pattern increases confidence by **0.1** (capped at 1.0)
- Composite feature patterns start at **0.5-0.6** based on complexity
- Unused instincts decay by **0.05** after 30 days of inactivity

### Completeness Score

The feature completeness score is a weighted sum (0-100%) of the five composite patterns:

```
Score = (clean_arch * 25) + (mvi_complete * 25) + (di_complete * 15)
      + (test_coverage * 20) + (navigation_wired * 15)

Score >= 80%  -->  High quality feature build
Score 50-79%  -->  Acceptable, some patterns missing
Score < 50%   -->  Needs improvement, review missing layers
```

### Learning Output

Saved to `.omc/state/feature-{name}-learning.json`:

```json
{
  "featureName": "auth",
  "platform": "android",
  "learnedAt": "2026-03-28T10:20:00Z",
  "patternsDetected": ["sealed-interface-state", "mvi-intent-handling", "..."],
  "featurePatterns": {
    "feature-clean-architecture": true,
    "feature-mvi-complete": true,
    "feature-di-complete": true,
    "feature-test-coverage": true,
    "feature-navigation-wired": true
  },
  "completenessScore": 100,
  "filesScanned": 23,
  "instinctsAdded": 12
}
```

### Feedback Loop

Learned patterns feed back into the instinct system:
- Future `/feature-build` runs consult high-confidence instincts when generating plans
- Patterns with confidence >= 0.7 are treated as established project conventions
- The `/feature-learn` command shows accumulated learning across all feature builds
- Instincts can be exported via `/instinct-export` for sharing across projects

### Checkpoint

```
Checkpoint: feature-learning-{featureName}
Contents: learning summary, updated instincts, completeness score
```

---

## Plan Document Schema

Plan documents are stored at `.omc/plans/feature-{name}.json`.

```json
{
  "featureName": "auth",
  "description": "User authentication with email/password and biometric login",
  "platform": "android",
  "createdAt": "2026-03-28T10:00:00Z",
  "updatedAt": "2026-03-28T10:15:00Z",
  "architecture": {
    "pattern": "MVI",
    "diFramework": "Koin",
    "networkClient": "Ktor",
    "localStorage": "DataStore",
    "navigationLib": "Compose Navigation"
  },
  "moduleLocation": "feature/auth",
  "modules": {
    "domain": {
      "path": "feature/auth/domain",
      "files": [
        "model/User.kt",
        "model/AuthToken.kt",
        "repository/AuthRepository.kt",
        "usecase/LoginUseCase.kt",
        "usecase/BiometricAuthUseCase.kt"
      ]
    },
    "data": {
      "path": "feature/auth/data",
      "files": [
        "remote/AuthApi.kt",
        "remote/dto/LoginRequest.kt",
        "remote/dto/LoginResponse.kt",
        "repository/AuthRepositoryImpl.kt",
        "mapper/AuthMapper.kt",
        "local/TokenStorage.kt"
      ]
    },
    "presentation": {
      "path": "feature/auth/presentation",
      "files": [
        "LoginViewModel.kt",
        "LoginState.kt",
        "LoginIntent.kt",
        "LoginSideEffect.kt",
        "ui/LoginScreen.kt",
        "ui/BiometricPromptWrapper.kt"
      ]
    },
    "di": {
      "path": "feature/auth/di",
      "files": [
        "AuthModule.kt"
      ]
    }
  },
  "wiring": {
    "navigationChanges": [
      {
        "file": "app/src/main/java/.../navigation/AppNavGraph.kt",
        "action": "add_route",
        "detail": "Add Login and BiometricPrompt routes"
      }
    ],
    "diRegistration": [
      {
        "file": "app/src/main/java/.../di/AppModule.kt",
        "action": "add_module",
        "detail": "Register authModule in appModules list"
      }
    ],
    "manifestChanges": [
      {
        "file": "app/src/main/AndroidManifest.xml",
        "action": "add_permission",
        "detail": "USE_BIOMETRIC permission"
      }
    ]
  },
  "tests": {
    "unit": [
      "LoginViewModelTest.kt",
      "LoginUseCaseTest.kt",
      "AuthRepositoryImplTest.kt",
      "AuthMapperTest.kt"
    ],
    "ui": [
      "LoginScreenTest.kt",
      "BiometricPromptWrapperTest.kt"
    ],
    "e2e": [
      "AuthFlowE2ETest.kt"
    ]
  },
  "dependencies": {
    "new": [
      { "name": "androidx.biometric:biometric", "version": "1.2.0-alpha05" }
    ],
    "existing": [
      "io.insert-koin:koin-android",
      "io.ktor:ktor-client-core"
    ]
  },
  "tasks": [
    { "id": 1, "phase": "impl", "agent": "architecture-impl", "description": "Create domain models and repository interface", "dependsOn": [] },
    { "id": 2, "phase": "impl", "agent": "network-impl", "description": "Create AuthApi, DTOs, and remote data source", "dependsOn": [1] },
    { "id": 3, "phase": "impl", "agent": "ui-impl", "description": "Create LoginViewModel, State, Intent, and LoginScreen", "dependsOn": [1] },
    { "id": 4, "phase": "impl", "agent": "data-impl", "description": "Create AuthRepositoryImpl, mappers, and TokenStorage", "dependsOn": [2] },
    { "id": 5, "phase": "impl", "agent": "wiring-impl", "description": "Register DI module, add navigation routes, update manifest", "dependsOn": [3, 4] },
    { "id": 6, "phase": "test", "agent": "unit-test-writer", "description": "Write unit tests for ViewModel, UseCase, Repository, Mapper", "dependsOn": [5] },
    { "id": 7, "phase": "test", "agent": "ui-test-writer", "description": "Write Compose UI tests for LoginScreen", "dependsOn": [5] },
    { "id": 8, "phase": "test", "agent": "mobile-e2e-runner", "description": "Write E2E auth flow test", "dependsOn": [5] }
  ]
}
```

---

## State File Schema

State files are stored at `.omc/state/feature-{name}.json` and track real-time progress.

```json
{
  "featureName": "auth",
  "platform": "android",
  "startedAt": "2026-03-28T10:00:00Z",
  "currentPhase": 4,
  "phases": {
    "1_planning": {
      "status": "completed",
      "startedAt": "2026-03-28T10:00:00Z",
      "completedAt": "2026-03-28T10:05:00Z",
      "planPath": ".omc/plans/feature-auth.json"
    },
    "2_implementation": {
      "status": "completed",
      "startedAt": "2026-03-28T10:05:00Z",
      "completedAt": "2026-03-28T10:12:00Z",
      "agents": {
        "architecture-impl": { "status": "completed", "filesCreated": ["model/User.kt", "model/AuthToken.kt", "repository/AuthRepository.kt"] },
        "network-impl":      { "status": "completed", "filesCreated": ["remote/AuthApi.kt", "remote/dto/LoginRequest.kt"] },
        "ui-impl":           { "status": "completed", "filesCreated": ["LoginViewModel.kt", "ui/LoginScreen.kt"] },
        "data-impl":         { "status": "completed", "filesCreated": ["repository/AuthRepositoryImpl.kt", "mapper/AuthMapper.kt"] },
        "wiring-impl":       { "status": "completed", "filesCreated": ["di/AuthModule.kt"] }
      }
    },
    "3_testing": {
      "status": "completed",
      "startedAt": "2026-03-28T10:12:00Z",
      "completedAt": "2026-03-28T10:15:00Z",
      "agents": {
        "unit-test-writer":  { "status": "completed", "testsCreated": 4 },
        "ui-test-writer":    { "status": "completed", "testsCreated": 2 },
        "mobile-e2e-runner": { "status": "completed", "testsCreated": 1 }
      }
    },
    "4_build_fix": {
      "status": "in_progress",
      "startedAt": "2026-03-28T10:15:00Z",
      "iterations": 2,
      "maxIterations": 5,
      "lastError": "Unresolved reference: BiometricManager",
      "lastFix": "Added missing import for androidx.biometric.BiometricManager"
    },
    "5_quality_gate": {
      "status": "pending",
      "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
    },
    "6_verification": {
      "status": "pending",
      "passAtK": null,
      "coverage": null
    }
  }
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Phase not yet started |
| `in_progress` | Phase currently executing |
| `completed` | Phase finished successfully |
| `failed` | Phase failed, requires intervention |
| `skipped` | Phase skipped via `--skip-phase` flag |

---

## Platform Detection

Auto-detection scans the project root for platform markers. First match wins.

### Detection Rules

| Platform | Primary Marker | Secondary Marker | Tertiary Marker |
|----------|---------------|-----------------|-----------------|
| **KMP** | `shared/src/commonMain/` directory | `build.gradle.kts` with `kotlin("multiplatform")` | `composeApp/` directory |
| **Android** | `build.gradle.kts` or `build.gradle` at root | `app/src/main/AndroidManifest.xml` | `settings.gradle.kts` with Android modules |
| **iOS** | `*.xcodeproj` or `*.xcworkspace` | `Package.swift` | `*.pbxproj` file |

### Detection Priority

```
1. Check for shared/src/commonMain/ → KMP
2. Check for *.xcodeproj or *.xcworkspace → iOS
3. Check for build.gradle.kts with android block → Android
4. Prompt user if ambiguous
```

### Override

```bash
# Force platform when auto-detection is wrong
/feature-build --platform=kmp "Feature description"
```

---

## Error Recovery

Every phase creates a checkpoint before execution. On failure, the pipeline can resume from the last successful state.

### Recovery Commands

```bash
# Resume from where it left off (reads state file)
/feature-build --from-phase=auto --feature=auth

# Force re-run a specific phase (resets that phase's state)
/feature-build --from-phase=4 --force --feature=auth

# View current state
cat .omc/state/feature-auth.json
```

### Recovery Strategy

| Failure Point | Recovery Action |
|---------------|----------------|
| Phase 1 fails | Re-run planning from scratch |
| Phase 2 agent fails | Re-run only the failed agent + its dependents |
| Phase 3 test writer fails | Re-run only the failed test agent |
| Phase 4 exceeds max iterations | Present diagnostics, user chooses fix or skip |
| Phase 5 critical finding | Apply fix, re-run Phase 4 then Phase 5 |
| Phase 6 coverage below 80% | Return to Phase 3 for additional tests |

### State File Integrity

- State file is written atomically (write to temp, then rename)
- Each phase reads the previous phase's state before starting
- Corrupted state file triggers a full checkpoint restore
- `--force` flag resets a single phase's state to `pending`

---

## Phase Commands

Each phase can be invoked independently for targeted execution.

| Command | Phase | Description | Prerequisite |
|---------|-------|-------------|-------------|
| `/feature-plan <desc>` | 1 | Create and review plan | None |
| `/feature-implement` | 2 | Run 5-agent implementation DAG | Plan exists |
| `/feature-test` | 3 | Run 3 test-writing agents | Implementation complete |
| `/feature-build-fix` | 4 | Iterative compile/test/fix loop | Tests written |
| `/feature-quality-gate` | 5 | Run 3 review agents | Build passing |
| `/feature-verify` | 6 | pass@k testing + coverage | Quality gate passed |
| `/feature-build <desc>` | 1-6 | Full pipeline | None |

### Common Workflows

```bash
# Full feature from scratch
/feature-build "Payment processing with Stripe"

# Already have a plan, just implement
/feature-implement --feature=payments

# Code exists, need tests and verification
/feature-build --from-phase=3 --feature=payments

# Quick iteration: fix build and re-verify
/feature-build-fix --feature=payments && /feature-verify --feature=payments
```

---

## Integration

### Mobile Memory MCP

The feature builder reads and writes to mobile-memory for cross-session context:

- **Reads:** Project architecture patterns, existing module structure, DI conventions, naming patterns, test patterns
- **Writes:** New feature metadata, file manifest, dependency additions, learned patterns from build-fix iterations

### Checkpoint System

Integrates with the `mobile-checkpoint` skill:

- Auto-creates checkpoints at each phase boundary
- Naming convention: `{phase-name}-{featureName}` (e.g., `after-impl-auth`)
- Full checkpoint at feature completion: `feature-complete-{featureName}`
- Checkpoints include instinct snapshots for rollback safety

### Instinct Hooks

The feature builder triggers instinct learning:

- **Phase 2 patterns:** Architecture decisions, file organization choices
- **Phase 4 patterns:** Common build errors and their fixes per project
- **Phase 5 patterns:** Recurring code review findings
- Instincts are versioned per feature so rollback does not lose learning

### Hook Events

| Hook Point | Event | Data |
|-----------|-------|------|
| `PreToolUse` | Phase start | Phase number, feature name, platform |
| `PostToolUse` | Phase complete | Phase number, status, metrics |
| `PostToolUse` | Build iteration | Iteration count, error summary |
| `PostToolUse` | Quality finding | Severity, category, file path |

---

**Remember**: The feature builder is a pipeline, not a monolith. Each phase is independently testable, resumable, and skippable. Trust the DAG -- let agents work in parallel where dependencies allow, and checkpoint aggressively so no work is ever lost.
