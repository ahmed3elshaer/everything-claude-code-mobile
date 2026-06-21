---
name: mobile-instinct-v1
description: "Capture mobile development patterns in real time as code is written. Use when implementing Compose screens, ViewModels, Koin modules, Ktor clients, or coroutine-based flows to automatically extract and store reusable patterns with confidence scoring."
---

# Mobile Instinct v1 — Real-Time Pattern Capture

Captures mobile development patterns during active coding and stores them with confidence scores for reuse across sessions.

## Workflow

1. **Detect**: Trigger fires when the agent creates or modifies a relevant file (see Triggers below).
2. **Extract**: Identify the pattern category and assign an initial confidence score (0.3–0.5).
3. **Store**: Write the pattern to `.claude/instincts/` as a JSON object (see Instinct Format).
4. **Verify**: Run `/instinct-status` and confirm the new pattern appears with the expected ID and confidence.
5. **Evolve**: Confidence increases on reuse (+0.1), user acceptance (+0.2), or passing review (+0.1). Maximum: 1.0.

## Triggers

Automatic capture activates when the agent:

- Creates or edits `.kt` files containing `@Composable` functions
- Writes ViewModel classes extending `ViewModel()` or using `viewModelScope`
- Adds or modifies Koin `module { }` declarations
- Configures `HttpClient` (Ktor) with plugins or request wrappers
- Writes structured coroutine code using `launch`, `async`, or `Flow`

## Instinct Format

Each captured pattern is stored as JSON in `.claude/instincts/`:

```json
{
  "id": "compose-state-hoisting",
  "type": "pattern",
  "description": "Hoist state to caller in Composables for testability and reuse",
  "confidence": 0.5,
  "context": "jetpack-compose",
  "examples": ["HomeScreen.kt:hoistCounterState"],
  "lastUsed": "2026-02-02"
}
```

## Pattern Categories

**Compose**: `compose-state-hoisting`, `compose-remember-key`, `compose-side-effect`, `compose-immutable`
**MVI**: `mvi-sealed-state`, `mvi-intent-handler`, `mvi-reduce-function`, `mvi-single-event`
**Koin**: `koin-viewmodel-injection`, `koin-module-factory`, `koin-scoped-deps`
**Ktor**: `ktor-safe-request`, `ktor-plugin-install`, `ktor-timeout-config`
**Coroutines**: `coroutine-viewmodel-scope`, `coroutine-structured`, `coroutine-dispatcher`

## Integration

Works with `hooks/instinct-hooks.json`:

- **Post-tool-use**: Detect patterns after file writes
- **Session-end**: Consolidate and deduplicate captured patterns
- **Pre-compact**: Preserve instinct data before context compression

## Validation

After a coding session, verify capture worked:

```bash
/instinct-status
```

Check that:
- New patterns appear with correct IDs
- Confidence scores match the expected initial range (0.3–0.5)
- No duplicate pattern IDs exist
