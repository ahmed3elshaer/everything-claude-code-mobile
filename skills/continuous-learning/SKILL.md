---
name: continuous-learning
description: "Extract reusable patterns from mobile development sessions and evolve them into skills. Use when ending a coding session to capture what was learned, reviewing accumulated patterns, or generating new skills from repeated approaches."
---

# Continuous Learning for Mobile

Extracts patterns from mobile development sessions and clusters them into reusable skills over time.

## Workflow

1. **Trigger**: Session hooks fire at `PreCompact` (saves context) and `Stop` (extracts patterns).
2. **Extract**: The agent analyzes the session for recurring patterns in five domains (see Pattern Types).
3. **Store**: Patterns are written to `.claude/instincts/` as JSON with confidence scores.
4. **Verify**: Run `/instinct-status` to confirm extraction worked:
   - Check that new patterns appear with correct IDs and descriptions
   - Verify confidence scores are in the expected initial range (0.3–0.5)
   - Confirm no duplicates of existing patterns were created
5. **Evolve**: Run `/evolve` to cluster related patterns into higher-level skills.

## Pattern Types

| Domain | What is captured | Example pattern |
|--------|-----------------|-----------------|
| Compose | UI component structures, state management | `compose-state-hoisting` |
| Architecture | Module organization, layer separation | `layer-separation` |
| Error handling | API error mapping, fallback strategies | `error-boundary` |
| Testing | Test structure, mocking approaches | `test-mirroring` |
| Build | Dependency management, Gradle configuration | `gradle-convention-plugins` |

## Commands

| Command | Purpose |
|---------|---------|
| `/learn` | Manually trigger pattern extraction for the current session |
| `/instinct-status` | View all learned patterns with confidence scores |
| `/instinct-export` | Export patterns as JSON for sharing with teammates |
| `/evolve` | Cluster related patterns into composite skills |

## Validation

After running `/learn` or at session end, verify extraction:

1. Run `/instinct-status` — each pattern should show: pattern ID, confidence (0.0–1.0), last-used timestamp, observation count.
2. If a pattern was not captured, run `/learn` manually and confirm the relevant code changes are still in session context.
3. Run `/evolve` and verify that clustered skills group related patterns logically (e.g., all Compose patterns under one skill, not mixed with Build patterns).

## Example: End-of-Session Extraction

```
# Session involved adding a new Compose screen with MVI + Koin DI

/learn
# → Extracted: compose-state-hoisting (0.4), mvi-sealed-state (0.5), koin-viewmodel-injection (0.3)

/instinct-status
# → Shows 3 new patterns + any previously captured patterns with updated confidence

/evolve
# → Clusters compose-state-hoisting + mvi-sealed-state → "compose-mvi-screen" skill
```
