---
description: View and manage patterns learned from feature builds. Shows extracted instincts, confidence scores, and feature completeness history.
---

# Feature Learn Command

View patterns learned from feature builds. Displays instincts captured during Phase 7 (Learning), confidence scores, and feature completeness history over time.

## Usage

```bash
# Show all learned feature patterns
/feature-learn

# Show patterns for a specific feature
/feature-learn auth

# Export learned patterns for sharing across projects
/feature-learn --export
```

## Flags

| Flag | Values | Description |
|------|--------|-------------|
| *(none)* | | Show all learned patterns and completeness scores |
| `<name>` | Feature name | Show learning details for a specific feature |
| `--export` | | Export all learned patterns to `.omc/exports/feature-instincts.json` |

## Output

### All Features Summary

```
Feature Learning Summary
========================

Features Analyzed: 3
Total Patterns Captured: 28
High Confidence Instincts (>= 0.7): 12

Feature Completeness Scores:
  auth .................. 100%  (12 patterns, 2026-03-28)
  payments .............. 85%   (10 patterns, 2026-03-27)
  profile ............... 60%   (6 patterns, 2026-03-26)

Top Instincts:
  sealed-interface-state ....... 0.9  (mvi-architecture)
  compose-state-hoisting ....... 0.8  (jetpack-compose)
  repository-interface ......... 0.8  (clean-architecture)
  koin-module-def .............. 0.7  (koin-patterns)
```

### Specific Feature Detail

```
Feature: auth
Platform: android
Learned: 2026-03-28T10:20:00Z
Completeness: 100%

Composite Patterns:
  feature-clean-architecture ... PRESENT (25%)
  feature-mvi-complete ......... PRESENT (25%)
  feature-di-complete .......... PRESENT (15%)
  feature-test-coverage ........ PRESENT (20%)
  feature-navigation-wired ..... PRESENT (15%)

Individual Patterns Detected (12):
  - sealed-interface-state (mvi-architecture)
  - sealed-interface-intent (mvi-architecture)
  - sealed-interface-side-effect (mvi-architecture)
  - mvi-intent-handling (mvi-architecture)
  - coroutine-structured (coroutines-patterns)
  - compose-state-hoisting (jetpack-compose)
  - repository-interface (clean-architecture)
  - repository-impl (clean-architecture)
  - usecase-class (clean-architecture)
  - koin-module-def (koin-patterns)
  - koin-viewmodel-injection (koin-patterns)
  - compose-navigation-route (navigation-patterns)

Build Metrics:
  Build Iterations: 2
  Quality Findings: 0 critical, 1 medium
  pass@k: 0.96
  Coverage: 84%
```

## Data Sources

- **Learning summaries:** `.omc/state/feature-{name}-learning.json`
- **Instincts database:** `~/.claude/instincts/mobile-instincts.json`
- **Feature plans:** `.omc/plans/feature-{name}.json`
- **Feature state:** `.omc/state/feature-{name}.json`

## How It Works

1. Reads all `feature-*-learning.json` files from `.omc/state/`
2. Loads the instincts database to show current confidence scores
3. Aggregates completeness scores across all features
4. For `--export`, calls `exportInstincts()` to produce a portable file

## No Agents Invoked

This command reads from local state and instinct files only. No agents are spawned.

## Related Commands

| Command | Description |
|---------|-------------|
| `/feature-build` | Full feature pipeline (learning runs automatically in Phase 7) |
| `/instinct-status` | View all instincts (not just feature-learned ones) |
| `/instinct-export` | Export full instinct database |
| `/instinct-import` | Import instincts from another project |
