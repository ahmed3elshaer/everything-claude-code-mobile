---
name: mobile-instinct-v2
description: "Cross-session observational learning that extracts architectural and workflow patterns from mobile development over time. Use when analyzing session history for recurring decisions, identifying emerging patterns, or reviewing how development approaches evolve across multiple sessions."
---

# Mobile Instinct v2 — Observational Learning

Extracts reusable patterns by observing development sessions over time, complementing V1's real-time capture with cross-session analysis.

## Workflow

1. **Observe**: At session end, the agent analyzes code changes, problem context, solution approach, and dependencies used.
2. **Extract**: Identify recurring patterns across the current session and sliding observation windows (see Observation Windows).
3. **Score**: Assign confidence based on recurrence — patterns seen in 1–3 sessions start at 0.1–0.3; those persisting across 20+ sessions reach 0.8–1.0.
4. **Validate**: Run `/instinct-status --v2` and verify:
   - New observations appear under the correct pattern category
   - Confidence scores reflect actual recurrence (not inflated by similar but distinct patterns)
   - No duplicate patterns exist across V1 and V2
5. **Cluster**: Related observations merge into higher-confidence patterns automatically.

## Observation Windows

| Window | Scope | Pattern Level |
|--------|-------|---------------|
| Current session | Immediate patterns from this session | Experimental (0.1–0.3) |
| Last 5 sessions | Emerging patterns with early validation | Validating (0.3–0.6) |
| Last 20 sessions | Consistent patterns across projects | Established (0.6–0.8) |
| All time | Core development practices | Best practice (0.8–1.0) |

## Session Analysis

At each session end, V2 evaluates:

- **Code changes**: Files modified, functions added/changed, patterns in diffs
- **Problem context**: Error messages, bug descriptions, feature requirements addressed
- **Solution approach**: Architectural decisions made, libraries chosen, patterns applied
- **Dependencies**: Frameworks and tools used in the solution

## Pattern Categories

**Architectural**: Layer separation, dependency injection patterns, navigation structure, state management approach
**Problem-solution**: Error boundaries, loading states, pagination, caching strategies
**Code organization**: Feature modules, shared UI components, test mirroring, naming conventions

## Commands

| Command | Purpose |
|---------|---------|
| `/instinct-status --v2` | View V2 observations with confidence and recurrence data |
| `/instinct-status --observations` | List raw session observations not yet promoted to patterns |
| `/instinct-observe "<note>"` | Manually add an observation for pattern learning |

## Integration

- **Session hooks**: `hooks/instinct-hooks.json` `Stop` event triggers V2 analysis
- **Pattern extractor**: `agents/mobile-pattern-extractor.md` performs the cross-session diff analysis
- **Pre-compact preservation**: V2 observations persist through context compression
