---
description: Run final verification - pass@k test metrics, coverage report, and sign-off. Confirms feature is production-ready.
---

# Feature Verify Command

Phase 6 of the feature build pipeline. Final verification gate that confirms the feature is production-ready through repeated test runs and coverage analysis.

## Usage

```bash
/feature-verify auth
/feature-verify offline-cache
/feature-verify push-notifications
```

## Verification Steps

1. **pass@k Testing** (k=3): `mobile-verifier` runs the full test suite 3 times to detect flakiness
2. **Coverage Report**: Generates coverage using platform tooling
   - Android: Kover (`./gradlew koverHtmlReport`)
   - iOS: xcov (`xcrun xccov`)
3. **Threshold Check**: Validates coverage meets the 80% minimum
4. **Sign-off Report**: Produces final summary with pass/fail determination

## Thresholds

| Metric | Threshold | Action if Below |
|--------|-----------|-----------------|
| pass@k | >= 0.9 (90%) | Flaky tests must be fixed or quarantined |
| Coverage | >= 80% | Missing tests must be added |

## Output

```
Feature Verification: auth
══════════════════════════
pass@k (k=3):
  Unit Tests:     45/45 (100%)  ✓
  UI Tests:       18/18 (100%)  ✓
  E2E Tests:       5/6  (83%)   ⚠ 1 flaky

Coverage:
  ViewModel:      98%  ✓
  UseCase:       100%  ✓
  Repository:     91%  ✓
  UI:             84%  ✓
  Overall:        88%  ✓

Flaky Tests:
  - AuthE2ETest.testBiometricFallback (2/3 passes)

Sign-off: PASS (with 1 flaky test noted)
```

## Report Location

Final report written to `.omc/state/feature-{name}.json` under the `verification` key.

## Invokes

- `mobile-verifier` agent
