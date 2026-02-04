---
name: mobile-verification
description: Automated testing workflow with pass@k metrics for mobile development. Detects flaky tests and ensures code reliability.
---

# Mobile Verification Skill

Comprehensive testing workflow with pass@k metrics for Android development reliability.

## Philosophy

**Single test runs lie.**

A test that passes once might fail tomorrow. Verification loops run tests multiple times to reveal:
- Flaky tests (timing issues, async problems)
- Intermittent failures (resource contention)
- Reliability trends (improving vs degrading)

## Pass@k Explained

Pass@k = proportion of test iterations that passed

```
Pass@3(test) = tests_passed / 3

testLogin(): ✓✓✓ → Pass@3 = 3/3 = 1.0 (100%)
testLogout(): ✓✓✗ → Pass@3 = 2/3 = 0.67 (67%)
testRefresh(): ✗✗✗ → Pass@3 = 0/3 = 0.0 (0%)
```

## Verification Levels

### Quick Verification (k=2)
```
Purpose: Fast feedback during development
Usage: /mobile-verify --k=2
Time: ~2 minutes
When: After small changes, before commit
```

### Standard Verification (k=3)
```
Purpose: Standard confidence level
Usage: /mobile-verify --k=3
Time: ~5 minutes
When: Before push, after feature complete
```

### Thorough Verification (k=5)
```
Purpose: High confidence, flaky detection
Usage: /mobile-verify --k=5
Time: ~10 minutes
When: Before release, after refactor
```

### Release Verification (k=10)
```
Purpose: Maximum confidence
Usage: /mobile-verify --k=10
Time: ~20 minutes
When: Production release, critical bugs
```

## Test Type Strategies

### Unit Tests (JUnit)

**Characteristics:**
- Fast: ~1-2 seconds per test
- Isolated: No Android dependencies
- Reliable: Should be Pass@k = 1.0

**Target Pass@k:** ≥ 0.95 (95%)

**Common Flaky Causes:**
- Async operations without proper waiting
- Date/time dependencies
- Random data generation
- Static state leakage

**Fix Strategies:**
```kotlin
// Bad: Flaky
@Test
fun testLoadData() {
    viewModel.loadData()
    assert(viewModel.state.value is Loaded)
}

// Good: Stable
@Test
fun testLoadData() = runTest {
    viewModel.loadData()
    advanceUntilIdle()
    assert(viewModel.state.value is Loaded)
}
```

### UI Tests (Espresso)

**Characteristics:**
- Slow: ~5-10 seconds per test
- Device-dependent: Need emulator/device
- Fragile: UI changes break tests

**Target Pass@k:** ≥ 0.80 (80%)

**Common Flaky Causes:**
- Idling resource not registered
- Animation interference
- Screen rotation
- Network timeouts

**Fix Strategies:**
```kotlin
// Register idling resources
@IdlingResource
val countingIdlingResource = CountingIdlingResource("api")

// Disable animations
@get:Rule
val disableAnimationsRule = DisableAnimationsRule()
```

### Compose Tests

**Characteristics:**
- Fast: ~1-3 seconds per test
- UI-level: Tests Composable behavior
- Modern: Uses Compose Testing framework

**Target Pass@k:** ≥ 0.90 (90%)

**Common Flaky Causes:**
- Recomposition timing
- State hoisting issues
- Animation interference

**Fix Strategies:**
```kotlin
@Composable
fun TestComposable(content: @Composable () -> Unit) {
    CompositionLocalProvider(
        LocalInspectionMode provides true
    ) {
        content()
    }
}
```

## Verification Workflow

### During Development

```bash
# 1. Write test
# 2. Quick verify
/mobile-verify --class=NewTest --k=2

# 3. Fix if fails
# 4. Standard verify
/mobile-verify --class=NewTest --k=3
```

### Before Commit

```bash
# Verify changed modules only
/mobile-verify --module=$(git diff --name-only | head -1) --k=2
```

### Before Push

```bash
# Full verification
/mobile-verify --k=3
```

### Before Release

```bash
# Thorough verification with flaky detection
/mobile-verify --k=5 --flaky
```

## Interpreting Results

### Pass@k Scores

| Score | Meaning | Action |
|-------|---------|--------|
| 1.0 | Perfect | Celebrate |
| 0.8-0.9 | Excellent | Monitor |
| 0.6-0.7 | Good | Investigate |
| 0.4-0.5 | Fair | Fix needed |
| 0.0-0.3 | Poor | Block release |

### Trends

Track pass@k over time:

```
Week 1: Pass@3 = 0.85
Week 2: Pass@3 = 0.87  ↗ Improving
Week 3: Pass@3 = 0.82  ↘ Degraded - investigate!
Week 4: Pass@3 = 0.88  ↗ Recovered
```

### Flaky Test Patterns

| Pattern | Likely Cause |
|---------|--------------|
| Fails on iteration 1 only | Cold start issue |
| Fails randomly | Async timing |
| Fails on specific iteration | Resource leak |
| Fails in parallel only | Shared state |

## Fixing Flaky Tests

### Step 1: Identify Pattern

```bash
/mobile-verify --flaky --k=10
```

Look for patterns in failures.

### Step 2: Add Diagnostics

```kotlin
@Test
fun flakyTest() = runTest {
    val startTime = System.currentTimeMillis()
    // ... test code ...
    val duration = System.currentTimeMillis() - startTime
    Log.d("Test", "Duration: $duration ms")  // Check for timing issues
}
```

### Step 3: Apply Fix

Common fixes:
- Add `advanceUntilIdle()` for coroutines
- Add `IdlingResource` for network
- Disable animations for UI tests
- Use `@UiThreadTest` for main thread work
- Add explicit waits for async operations

### Step 4: Verify Fix

```bash
/mobile-verify --class=FixedTest --k=5
```

Target: Pass@5 = 1.0

## Integration

### With Checkpoints

Create checkpoint before verification:
```bash
/mobile-checkpoint save pre-verify
/mobile-verify --k=3
```

### With Memory

Track pass@k in memory:
```json
{
    "test-coverage": {
        "passAt3": 0.87,
        "trend": "improving",
        "flakyTests": []
    }
}
```

### With Instincts

Learn testing patterns:
```json
{
    "id": "test-coroutine-async",
    "description": "Always use runTest + advanceUntilIdle for ViewModel tests",
    "confidence": 0.95
}
```

## Thresholds by Context

| Context | Pass@k Threshold | Rationale |
|---------|------------------|-----------|
| Unit tests | 0.95 | Should be deterministic |
| UI tests | 0.80 | More fragile, device-dependent |
| Compose tests | 0.90 | Better than Espresso, more stable |
| Integration tests | 0.70 | Complex, more variables |
| E2E tests | 0.60 | Full system, many variables |

## Best Practices

1. **Start High, Go Low**: Use k=5 for investigation, k=3 for routine
2. **Fix Flaky Fast**: Don't tolerate flaky tests
3. **Track Trends**: Monitor pass@k over time
4. **Context Matters**: UI tests can have lower thresholds than unit
5. **Block Release**: Failed verification should block releases

---

**Remember**: A test that sometimes passes is worse than no test at all. It gives false confidence.
