---
name: mobile-memory
description: Memory persistence for mobile development context across sessions. Maintains project structure, dependencies, architecture, and test state.
---

# Mobile Memory Skill

Persistent memory system that maintains mobile development context across sessions.

## Purpose

Unlike instincts (which capture patterns), memory retains **factual project state**:
- What modules exist
- What dependencies are installed
- What the architecture looks like
- What tests cover what code

This survives session breaks and compaction.

## Memory Types

### Project Structure Memory

Remembers your Android project layout:
```json
{
    "modules": ["app", "core:network", "feature:auth"],
    "buildVariants": ["debug", "release", "staging"],
    "featureModules": ["auth", "home", "profile"]
}
```

**Use when**: Starting work on a new feature, need to know project layout

### Dependencies Memory

Tracks all Gradle dependencies:
```json
{
    "libraries": [
        {"name": "compose-runtime", "group": "androidx.compose", "version": "1.5.0"}
    ],
    "kgpVersion": "1.9.20",
    "gradleVersion": "8.2"
}
```

**Use when**: Adding new dependencies, checking compatibility

### Architecture Memory

Documents your architecture patterns:
```json
{
    "pattern": "mvi",
    "uiLayer": {"screens": ["Home", "Profile"]},
    "dataLayer": {"repositories": ["UserRepository"]},
    "di": {"framework": "koin", "modules": ["appModule"]}
}
```

**Use when**: Onboarding new developers, explaining codebase

### Test Coverage Memory

Tracks test metrics:
```json
{
    "totalCoverage": 78,
    "trend": "improving",
    "failingTests": [
        {"class": "AuthViewModelTest", "method": "testLogin"}
    ]
}
```

**Use when**: Planning testing work, tracking quality goals

### Compose Screens Memory

Indexes all Composable screens:
```json
{
    "screens": [
        {"name": "HomeScreen", "route": "home", "file": "HomeScreen.kt"}
    ]
}
```

**Use when**: Finding screens, understanding navigation

## Usage

### Load Memory

```bash
# At session start - load all memory
/memory-load all

# Load specific type
/memory-load project-structure
/memory-load dependencies
```

### Save Memory

```bash
# Save current state
/memory-save project-structure
/memory-save test-coverage

# Save all (usually automatic)
/memory-save all
```

### Query Memory

```bash
# Ask questions about project
/memory-query "What modules use Ktor?"
/memory-query "Which screens are not tested?"
/memory-query "What's the test coverage for auth module?"
```

### Forget Memory

```bash
# Remove stale memory
/memory-forget recent-changes
/memory-forget --older-than 90days
```

### Summary

```bash
# Get overview of all memory
/memory-summary
```

## Memory Refresh Triggers

Memory auto-refreshes on:
- **Gradle sync**: Dependencies, build variants
- **File changes**: Recent changes, architecture
- **Test runs**: Test coverage, failing tests
- **Session start**: Load all memory
- **Session end**: Save all memory

## Memory vs Instincts

| Aspect | Memory | Instincts |
|--------|--------|-----------|
| Content | Factual state | Patterns |
| Examples | Module list, deps | "Use collectAsStateWithLifecycle" |
| Updates | On changes | On observations |
| Confidence | Binary (exists/doesn't) | 0.0-1.0 score |
| Retention | 30-90 days | Persistent |

## Integration

### With Checkpoints

Checkpoints include memory state:
```json
{
    "checkpoint": {
        "memory": {
            "project-structure": {...},
            "dependencies": {...}
        }
    }
}
```

Restoring a checkpoint restores memory too.

### With Compaction

Memory survives compaction:
- Recent memory: Kept as-is
- Old memory: Summarized
- Always available via `/memory-query`

### With Instincts

Memory informs instinct extraction:
- Project structure → Where to look for patterns
- Dependencies → What frameworks are used
- Architecture → What patterns to expect

## Best Practices

1. **Let it auto-refresh**: Memory updates automatically on hooks
2. **Query, don't remember**: Use `/memory-query` instead of asking user
3. **Validate on load**: Check memory matches actual project
4. **Update after changes**: Run `/memory-save` after major changes
5. **Clean up**: Use `/memory-forget` to remove stale data

## Example Session

```
User: I need to add a new feature for user profiles

Agent: /memory-query project-structure
Response: Found modules: app, core:network, feature:auth
       No profile module exists.

Agent: /memory-query dependencies
Response: Using Compose 1.5.0, Ktor 2.3.0, Koin 3.4.0

Agent: Based on memory, I'll create feature:profile module
       following your existing architecture pattern.
```

---

**Remember**: Memory is about what **exists**, not what **should be**. That's what instincts are for.
