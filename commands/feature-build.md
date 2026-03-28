---
description: Build a complete mobile feature from description to running code with E2E tests. Orchestrates 6 phases - planning, implementation, testing, build-fix, quality gate, and verification. Auto-detects platform.
---

# Feature Build Command

Master entry point for end-to-end mobile feature construction. Runs all 6 phases sequentially, tracking progress in state files.

## Usage

```bash
/feature-build Add user authentication with biometrics
/feature-build --platform=android Implement offline caching
/feature-build --from-phase=test auth
/feature-build --skip-phase=quality Add profile screen
```

## Flags

| Flag | Values | Description |
|------|--------|-------------|
| `--platform` | `android`, `ios`, `kmp` | Override auto-detection |
| `--from-phase` | `implement`, `test`, `build-fix`, `quality`, `verify` | Resume from a specific phase |
| `--skip-phase` | `quality` | Skip a phase |

## Phases

| # | Phase | Command | Description |
|---|-------|---------|-------------|
| 1 | Plan | `/feature-plan` | Architecture, file breakdown, test strategy |
| 2 | Implement | `/feature-implement` | Parallel agent implementation |
| 3 | Test | `/feature-test` | Unit, UI, and E2E test creation |
| 4 | Build & Fix | `/feature-build-fix` | Compile and fix errors iteratively |
| 5 | Quality Gate | `/feature-quality-gate` | Code review, security, performance |
| 6 | Verify | `/feature-verify` | pass@k metrics, coverage, sign-off |
| 7 | Learn | *(automatic)* | Pattern extraction, instinct updates, completeness scoring |

## State

Progress tracked in `.omc/state/feature-{name}.json`. Use `/feature-status` to inspect.

## Examples

```bash
# Full feature build with auto-detected platform
/feature-build Add push notification support

# Android-only, skip quality gate for prototype
/feature-build --platform=android --skip-phase=quality Add search screen

# Resume a failed build from the test phase
/feature-build --from-phase=test auth

# KMP feature targeting shared module
/feature-build --platform=kmp Add offline sync for user data
```

## Invokes

- `feature-builder` skill (orchestrates all phases)
