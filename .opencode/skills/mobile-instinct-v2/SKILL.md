---
name: mobile-instinct-v2
description: V2 instinct-based observational learning. Analyzes sessions to extract reusable mobile development patterns across time.
---

# Mobile Instinct v2 - Observational Learning

Cross-session observational learning that extracts patterns from your development workflow over time.

## Overview

V2 instincts **observe your sessions** and extract patterns that emerge across multiple development activities. Unlike V1's immediate capture, V2 looks for:
- Recurring architectural decisions
- Problem-solving approaches
- Code organization patterns
- Testing strategies

## Session Analysis

At session end, V2 analyzes:
1. **Code changes**: What was modified
2. **Problem context**: What issue was being solved
3. **Solution approach**: How it was resolved
4. **Dependencies**: What libraries/techniques were used

## Pattern Categories

### Architectural Patterns

| Pattern | Detected By | Example |
|---------|-------------|---------|
| `layer-separation` | Consistent data/ui/domain separation | Repository + ViewModel + Composable |
| `dependency-injection` | Koin module patterns | factoryOf, viewModel |
| `navigation-pattern` | Compose Navigation usage | NavHost with routes |
| `state-management` | MVI/MVVM consistency | StateFlow + sealed classes |

### Problem-Solution Patterns

| Pattern | Detected By | Example |
|---------|-------------|---------|
| `error-boundary` | Try-catch with UI feedback | Error state in Composable |
| `loading-state` | isLoading + Content pattern | Box with progress |
| `pagination` | LazyColumn with Pager | Paging 3 integration |
| `caching-strategy` | Repository layer caching | Cached repository pattern |

### Code Organization Patterns

| Pattern | Detected By | Example |
|---------|-------------|---------|
| `feature-module` | Self-contained feature folders | feature/auth/ structure |
| `shared-UI` | Reusable Composables | ui/components/ |
| `test-mirroring` | Test structure matching src | Parallel test folders |
| `naming-convention` | Consistent naming patterns | XxxViewModel, XxxScreen |

## Observation Windows

V2 uses sliding windows for pattern detection:

```
Window 1 (Current Session):    Immediate patterns
Window 2 (Last 5 Sessions):    Emerging patterns
Window 3 (Last 20 Sessions):   Established patterns
Window 4 (All Time):           Core patterns
```

## Confidence Evolution

```
Session 1-3:    Experimental (0.1-0.3)
Session 4-10:   Validating (0.3-0.6)
Session 11-20:  Established (0.6-0.8)
Session 20+:    Best Practice (0.8-1.0)
```

## Commands

### View Observations

```
/instinct-status --v2
/instinct-status --observations
```

Shows:
- Recent session observations
- Emerging patterns (low confidence)
- Established patterns (high confidence)
- Pattern clusters by domain

### Manual Observation

```
/instinct-observe "Used Ktor with retry pattern for API calls"
```

Manually add an observation for pattern learning.

## Integration

V2 instincts are evaluated by:
1. **Session hooks**: `hooks/instinct-hooks.json` Stop event
2. **Pattern extractor**: `agents/mobile-pattern-extractor.md`
3. **Pre-compact preservation**: Maintains learning during context compression

## Difference from V1

| Aspect | V1 | V2 |
|--------|----|----|
| Trigger | Code write | Session observation |
| Scope | Single file | Cross-file patterns |
| Timing | Immediate | End of session |
| Focus | Code patterns | Architectural patterns |

---

**Remember**: V2 needs multiple sessions to build confidence. The more you develop, the smarter it gets.
