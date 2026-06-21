---
name: continuous-learning-v2
description: "Instinct-based learning system that scores and evolves mobile development patterns across sessions. Use when reviewing captured instincts, adjusting confidence thresholds, importing or exporting patterns, or clustering related instincts into higher-level skills."
---

# Continuous Learning v2 — Instinct Confidence System

Manages the lifecycle of instinct-based patterns: scoring, evolution, import/export, and clustering into reusable skills.

## Workflow

1. **Review instincts**: Run `/instinct-status` to see all patterns with current confidence scores.
2. **Evaluate confidence**: Patterns below 0.3 are experimental — validate before relying on them. Patterns above 0.8 are established best practices.
3. **Evolve**: Run `/evolve` to cluster related instincts (e.g., multiple Compose patterns → a "compose-best-practices" skill).
4. **Share**: Export instincts with `/instinct-export` for team reuse; import with `/instinct-import <file>`.
5. **Validate**: After evolution, re-run `/instinct-status` and confirm clusters make sense and no patterns were lost.

## Instinct Storage

Instincts are stored as JSON files in `.claude/instincts/`. Each file contains:

```json
{
  "id": "compose-state-hoisting",
  "type": "pattern",
  "description": "Always hoist state to caller in Composables",
  "confidence": 0.85,
  "examples": ["HomeScreen.kt:hoistCounterState"],
  "context": "jetpack-compose",
  "lastUsed": "2026-02-02"
}
```

The agent reads instincts from this directory at session start and writes updates back on confidence changes or new captures.

## Confidence Scoring

| Range | Level | Meaning |
|-------|-------|---------|
| 0.0–0.3 | Experimental | Detected but unvalidated — apply cautiously |
| 0.3–0.6 | Validated | Confirmed in multiple sessions — safe to suggest |
| 0.6–0.8 | Established | Consistent across projects — recommend proactively |
| 0.8–1.0 | Best practice | Team-wide standard — apply by default |

Confidence increases on: successful application (+0.1), user acceptance (+0.2), cross-session consistency (+0.1).

## Commands

| Command | Purpose |
|---------|---------|
| `/instinct-status` | List all instincts with confidence scores and last-used dates |
| `/instinct-import <file>` | Import instincts from a shared JSON file |
| `/instinct-export` | Export current instincts for sharing with teammates |
| `/evolve` | Cluster related instincts into higher-level skills |

## Mobile-Specific Instincts

Pre-configured pattern domains:

- **Compose**: Recomposition optimization, state hoisting, side-effect management
- **MVI**: Sealed state interfaces, intent handling, state reduction
- **Koin**: Module organization, scoped dependencies, ViewModel injection
- **Ktor**: Error handling wrappers, plugin configuration, timeout strategies
- **Testing**: Espresso patterns, ViewModel test structure, coroutine test dispatchers
