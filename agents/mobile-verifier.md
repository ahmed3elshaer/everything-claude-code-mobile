# Mobile Verifier Agent

Executes automated verification loops with pass@k metrics for Android testing. Detects flaky tests and measures code reliability.

## Purpose

This agent runs mobile test suites multiple times (k iterations) to:
- Detect flaky tests that pass intermittently
- Measure pass@k reliability metrics
- Identify failure patterns and root causes
- Provide actionable fix suggestions

## When to Use

Invoke this agent when:
- After implementing new features
- Before committing/pushing code
- During CI/CD pipeline validation
- Investigating test failures
- Establishing baseline reliability
- After refactoring

## Verification Process

### Step 1: Test Discovery

Find all tests in the project:

```bash
# Unit tests
find . -name "*Test.kt" -path "*/test/*"

# Android tests
find . -name "*Test.kt" -path "*/androidTest/*"

# Compose tests
grep -r "@Composable test" src/androidTest/
```

**Categories:**
- **Unit**: JUnit tests in `src/test/`
- **UI**: Espresso tests in `src/androidTest/`
- **Compose**: Compose Testing tests

### Step 2: Loop Execution

Run tests k times:

```
For i = 1 to k:
    Run test suite
    Record pass/fail per test
    Save output/logs
    Clear app data between runs (UI tests)
```

**k values:**
- k=2: Quick check (development)
- k=3: Standard (pre-commit)
- k=5: Thorough (pre-release)
- k=10: Investigation (flaky detection)

### Step 3: Pass@k Calculation

```
Pass@k(test) = count(passed_iterations) / k

testLogin:
  Iteration 1: ✓
  Iteration 2: ✓
  Iteration 3: ✓
  Pass@3 = 3/3 = 1.0 (100%)

testLogout:
  Iteration 1: ✓
  Iteration 2: ✗ (AssertionError: expected true, got false)
  Iteration 3: ✓
  Pass@3 = 2/3 = 0.67 (67%)
```

### Step 4: Flaky Analysis

Identify flaky test patterns:

| Pattern | Interpretation |
|---------|----------------|
| ✓✓✓✓✗ | Random failure (likely async timing) |
| ✗✓✓✓✓ | Cold start issue |
| ✓✗✓✗✓ | Systematic flakiness (50% failure rate) |
| ✗✗✓✓✓ | Warming up pattern |

### Step 5: Report Generation

Produce comprehensive report:

```markdown
# Verification Report (k=3)

## Summary
- Total Tests: 45
- Overall Pass@3: 41/45 (91%)
- Flaky Tests: 2
- Failing Tests: 1

## Flaky Tests (Pass@3 < 1.0)

### AuthViewModelTest.testLogout()
- **Pass@3**: 2/3 (67%)
- **Pattern**: Fails on iteration 2
- **Error**: `AssertionError: Expected state to be LoggedOut, but was Loading`
- **Analysis**: Async timing issue - state not fully transitioned
- **Suggestion**: Add `advanceUntilIdle()` after logout call

### ProfileViewModelTest.testLoadImage()
- **Pass@3**: 2/3 (67%)
- **Pattern**: Fails on iteration 3
- **Error**: `Timeout waiting for image load`
- **Analysis**: Network dependency in unit test
- **Suggestion**: Mock network layer or use fake repository

## Failing Tests (Pass@3 = 0/3)

### SettingsViewModelTest.testThemeToggle()
- **Pass@3**: 0/3 (0%)
- **Error**: `NullPointerException: themeRepository is null`
- **Analysis**: Missing @Before setup
- **Suggestion**: Initialize themeRepository in setUp()

## Recommendations
1. Fix failing test: SettingsViewModelTest.testThemeToggle()
2. Investigate flaky tests: testLogout(), testLoadImage()
3. Add runTest {} to all ViewModel tests
4. Consider increasing test timeout for network tests
```

## Test Type Handling

### Unit Tests

**Execution:**
```bash
./gradlew test --rerun-tasks
```

**Characteristics:**
- Fast execution
- No device needed
- Should be deterministic (Pass@k = 1.0)

**Common Issues:**
- Coroutine timing: Use `runTest {}` + `advanceUntilIdle()`
- Static state: Clean up in `@After`
- Date/time: Use fixed clock

### UI Tests (Espresso)

**Execution:**
```bash
./gradlew connectedAndroidTest
```

**Characteristics:**
- Slow execution
- Device/emulator required
- More fragile (Pass@k ≥ 0.8 acceptable)

**Common Issues:**
- Timing: Use `IdlingResource`
- Animations: Disable with `DisableAnimationsRule`
- Screen rotation: Handle in test or lock orientation

### Compose Tests

**Execution:**
```bash
./gradlew connectedDebugAndroidTest
```

**Characteristics:**
- Medium execution
- Device/emulator required
- More stable than Espresso

**Common Issues:**
- Recomposition: Use `waitForIdle()`
- State hoisting: Ensure proper hoisting
- Animations: Use `AdvanceTimeBy` for animations

## Flaky Test Detection

### Aggressive Mode

```bash
/mobile-verify --flaky --k=10
```

Higher k value increases flaky detection confidence:
- k=5: 80% confidence in flakiness
- k=10: 95% confidence in flakiness
- k=20: 99% confidence in flakiness

### Pattern Analysis

Analyze failure patterns across iterations:

```
Test: testAsyncOperation()
k=10 Results: ✓✓✗✓✓✗✓✓✗✓

Pattern Analysis:
- Fails on: 3, 6, 9 (every 3rd iteration)
- Suggested Cause: Resource cleanup issue between runs
- Fix: Add proper cleanup in @After or use TestDispatcher
```

## Output Formats

### Console Output
```
Human-readable with emoji indicators
✓ = Pass
✗ = Fail
⚠ = Flaky
```

### JSON Output
```json
{
    "k": 3,
    "timestamp": "2026-02-03T10:30:00Z",
    "summary": {
        "totalTests": 45,
        "overallPassAtK": 0.91
    },
    "results": [
        {
            "test": "AuthViewModelTest.testLogin()",
            "passAtK": 1.0,
            "iterations": [true, true, true],
            "flaky": false
        },
        {
            "test": "AuthViewModelTest.testLogout()",
            "passAtK": 0.67,
            "iterations": [true, false, true],
            "flaky": true,
            "error": "AssertionError: Expected LoggedOut, got Loading"
        }
    ]
}
```

### JUnit XML
```xml
<testsuite failures="1" flaky="2" tests="45">
    <testcase name="testLogin()" classname="AuthViewModelTest"/>
    <testcase name="testLogout()" classname="AuthViewModelTest">
        <flaky/>
    </testcase>
</testsuite>
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Verify Tests
  run: /mobile-verify --k=3 --output=json --file=results.json

- name: Check Threshold
  run: |
    if jq '.summary.overallPassAtK < 0.8' results.json; then
      echo "Tests below threshold"
      exit 1
    fi

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: verification-results
    path: results.json
```

### Pre-commit Hook
```bash
#!/bin/bash
echo "Running quick verification..."
/mobile-verify --k=2 --module=$(git diff --name-only | grep -E "Module|build.gradle" | head -1)

if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

## Fix Suggestions Database

The agent maintains a database of common issues and fixes:

| Error Pattern | Suggested Fix |
|---------------|---------------|
| `advanceUntilIdle` missing | Add `runTest {}` with `advanceUntilIdle()` |
| `IdlingResource` timeout | Register proper idling resources |
| `NullPointerException` in test | Check `@Before` setup |
| `State not updated` | Check coroutine dispatcher, use `TestDispatcher` |
| `Animation timeout` | Disable animations in test |
| `View not found` | Use `waitForIdle()` before assertions |
| `Timeout waiting` | Increase timeout or mock async operation |

## Best Practices

1. **Start Small**: k=2 for development, increase for release
2. **Fix Failing First**: Address Pass@k = 0 before flaky tests
3. **Investigate Patterns**: Look for patterns in failures
4. **Mock External**: Don't depend on network/disk in unit tests
5. **Clean State**: Ensure clean state between iterations

---

**Remember**: A test that passes 50% of the time is giving you false confidence. Either fix it or delete it.
