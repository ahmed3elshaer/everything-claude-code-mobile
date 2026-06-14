---
description: Run automated verification loops with pass@k metrics for mobile testing. Executes tests multiple times to detect flakiness.
---

# Mobile Verify Command

Automated test verification with pass@k metrics for mobile development.

## Usage

```bash
/mobile-verify                      # Run all tests with k=3
/mobile-verify --k=5                # Run tests 5 times
/mobile-verify --unit               # Unit tests only
/mobile-verify --ui                 # UI/Espresso tests only
/mobile-verify --compose            # Compose tests only
/mobile-verify --module=feature:auth# Specific module
/mobile-verify --class=AuthViewModelTest# Specific test class
/mobile-verify --flaky              # Focus on flaky test detection
```

## Pass@k Metrics

Pass@k measures reliability: how often tests pass when run k times.

| Pass@3 Score | Meaning | Action |
|--------------|---------|--------|
| 3/3 (100%) | Stable | No action needed |
| 2/3 (67%) | Somewhat flaky | Monitor |
| 1/3 (33%) | Flaky | Investigate |
| 0/3 (0%) | Failing | Fix required |

## Verification Types

### Unit Tests (JUnit)

```bash
/mobile-verify --unit --k=3
```

Runs JUnit tests k times:
- Executes `./gradlew test` k iterations
- Tracks pass/fail per iteration
- Identifies flaky tests

**Output:**
```
Unit Test Verification (k=3)
═════════════════════════════════
AuthViewModelTest:
  testLogin()          ✓✓✓  (3/3) 100%
  testLogout()         ✓✓✗  (2/3) 67%  FLAKY
  testTokenRefresh()   ✓✓✓  (3/3) 100%

Overall: 8/9 (89%)
Flaky tests: 1
```

### UI Tests (Espresso)

```bash
/mobile-verify --ui --k=3
```

Runs Espresso tests k times:
- Executes `./gradlew connectedAndroidTest`
- Handles device/emulator setup
- Measures test stability

### Compose Tests

```bash
/mobile-verify --compose --k=3
```

Runs Compose UI tests k times:
- Executes `./gradlew connectedDebugAndroidTest`
- Tests Composable behavior
- Measures recomposition stability

### Build Verification

```bash
/mobile-verify --build
```

Verifies build reliability:
- Executes `./gradlew build` k times
- Checks for intermittent build failures
- Validates dependency resolution

## Flaky Test Detection

```bash
/mobile-verify --flaky --k=5
```

Aggressively detects flaky tests:
- Higher k value for better detection
- Analyzes failure patterns
- Suggests fixes

**Flaky Test Report:**
```
Flaky Test Analysis
═══════════════════
AuthViewModelTest.testLogout()
  Pass@5: 3/5 (60%)
  Pattern: Fails on iteration 2, 4
  Possible Cause: Async timing issue
  Suggestion: Add runTest { } or advanceUntilIdle
```

## Module-Level Verification

```bash
/mobile-verify --module=feature:auth --k=3
```

Runs tests for specific module:
- Faster than full test suite
- Useful during feature development
- CI/CD integration

## Output Formats

### Console Output
```bash
/mobile-verify --k=3 --output=console
```

Human-readable results with emoji indicators.

### JSON Output
```bash
/mobile-verify --k=3 --output=json
```

Machine-readable for CI/CD:
```json
{
    "k": 3,
    "timestamp": "2026-02-03T10:30:00Z",
    "results": {
        "unit": {
            "total": 15,
            "passed": 14,
            "pass_at_k": 0.93
        },
        "ui": {
            "total": 8,
            "passed": 6,
            "pass_at_k": 0.75
        }
    },
    "flakyTests": ["AuthViewModelTest.testLogout"]
}
```

### JUnit Format
```bash
/mobile-verify --k=3 --output=junit
```

Generates JUnit XML for CI integration.

## CI/CD Integration

### GitHub Actions
```yaml
- name: Verify Mobile Tests
  run: /mobile-verify --k=3 --output=json

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: verification-results
    path: verification-results.json
```

### Pre-commit Hook
```bash
#!/bin/bash
# Run quick verification before commit
/mobile-verify --k=2 --module=$(git diff --name-only | grep Module | head -1)
```

## Verification Workflow

### Before Commit
```bash
/mobile-verify --k=2 --module=<changed-module>
```
Quick check (2 iterations) for changed modules.

### Before Push
```bash
/mobile-verify --k=3
```
Full verification with moderate iterations.

### Before Release
```bash
/mobile-verify --k=5 --flaky
```
Thorough verification with aggressive flaky detection.

## Thresholds

Configure pass@k thresholds:

```bash
/mobile-verify --threshold=0.9  # Require 90% pass rate
```

| Threshold | Usage |
|-----------|-------|
| 1.0 (100%) | Critical paths, release blocking |
| 0.9 (90%) | Production code |
| 0.7 (70%) | Development tolerance |
| 0.5 (50%) | Experimental features |

## Integration

- **skills/mobile-verification.md**: Verification workflow
- **agents/mobile-verifier.md**: Test execution and analysis

## Examples

### Quick Check
```bash
$ /mobile-verify --unit --k=2

Quick unit test verification (k=2)
✓ AuthViewModelTest (4/4 passed)
✓ UserRepositoryTest (3/3 passed)
⚠ ProfileViewModelTest (3/4 passed) - 1 flaky detected
```

### Full Verification
```bash
$ /mobile-verify --k=3

Full verification (k=3)
═════════════════════
Unit Tests:     42/45 (93%) ✓
UI Tests:       18/20 (90%) ✓
Compose Tests:  12/12 (100%) ✓
─────────────────────────────
Overall:        72/77 (94%)

Flaky Tests:
- ProfileViewModelTest.testImageLoad
- AuthViewModelTest.testLogout

Run /mobile-verify --flaky for details
```

---

**Remember**: Pass@k > Pass@1. Running tests once gives false confidence. Verification loops reveal flakiness.
