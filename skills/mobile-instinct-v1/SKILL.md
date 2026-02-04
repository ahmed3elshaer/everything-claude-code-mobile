---
name: mobile-instinct-v1
description: V1 instinct-based pattern capture for mobile development. Captures patterns as code is written with immediate feedback.
---

# Mobile Instinct v1 - Pattern Capture

Immediate pattern capture during mobile development with real-time feedback.

## Overview

V1 instincts capture mobile development patterns **as you write code**. When you create Composables, ViewModels, or repositories, relevant patterns are automatically extracted and stored with confidence scoring.

## Triggers

Automatic capture on:
- Creating `.kt` files in Compose screens
- Writing ViewModel code
- Adding Koin modules
- Configuring Ktor clients
- Writing coroutine code

## Pattern Categories

### Compose Patterns

| Pattern ID | Description | Initial Confidence |
|------------|-------------|-------------------|
| `compose-state-hoisting` | State hoisted to caller | 0.5 |
| `compose-remember-key` | Stable keys in lazy lists | 0.6 |
| `compose-side-effect` | Proper LaunchedEffect usage | 0.5 |
| `compose-immutable` | Immutable data classes | 0.7 |

### MVI Patterns

| Pattern ID | Description | Initial Confidence |
|------------|-------------|-------------------|
| `mvi-sealed-state` | Sealed interface for state | 0.7 |
| `mvi-intent-handler` | onIntent pattern | 0.6 |
| `mvi-reduce-function` | State reduction | 0.5 |
| `mvi-single-event` | One-time event handling | 0.6 |

### Koin Patterns

| Pattern ID | Description | Initial Confidence |
|------------|-------------|-------------------|
| `koin-viewmodel-injection` | koinViewModel() in Compose | 0.7 |
| `koin-module-factory` | Module definition with factory | 0.6 |
| `koin-scoped-deps` | Scoped dependencies | 0.5 |

### Ktor Patterns

| Pattern ID | Description | Initial Confidence |
|------------|-------------|-------------------|
| `ktor-safe-request` | runCatching wrapper | 0.7 |
| `ktor-plugin-install` | ContentNegotiation setup | 0.6 |
| `ktor-timeout-config` | Request timeout handling | 0.5 |

### Coroutine Patterns

| Pattern ID | Description | Initial Confidence |
|------------|-------------|-------------------|
| `coroutine-viewmodel-scope` | viewModelScope.launch | 0.8 |
| `coroutine-structured` | Proper scope hierarchy | 0.7 |
| `coroutine-dispatcher` | Correct dispatcher selection | 0.6 |

## Usage

Patterns are captured automatically. To review captured patterns:

```
/instinct-status
```

## Confidence Boosting

When a pattern is:
- **Detected**: Initial confidence (0.3-0.5)
- **Used again**: +0.1
- **User accepted**: +0.2
- **Passes review**: +0.1

Maximum confidence: 1.0

## Integration with Hooks

Works with `hooks/instinct-hooks.json` for:
- Post-tool-use pattern detection
- Session-end pattern consolidation
- Pre-compact instinct preservation

---

**Remember**: V1 is about immediate capture. V2 provides observational learning across sessions.
