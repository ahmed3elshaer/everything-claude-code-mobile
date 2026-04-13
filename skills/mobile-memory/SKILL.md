---
name: mobile-memory
description: "Persist and query mobile project state across sessions including module structure, dependencies, architecture patterns, and test coverage. Use when starting a session to load context, after major changes to save state, or when querying project facts without reading files."
---

# Mobile Memory — Cross-Session Project State

Persists factual project state (modules, dependencies, architecture, tests) across sessions and context compressions, enabling the agent to resume work without re-reading the entire project.

## Workflow

1. **Load**: At session start, run `/memory-load all` to restore project context.
2. **Validate**: After loading, verify memory matches the actual project:
   - Check that listed modules still exist on disk
   - Confirm key dependencies match `build.gradle.kts` versions
   - Verify listed screens exist in the expected file paths
3. **Query**: Use `/memory-query` during development instead of asking the user for project facts.
4. **Save**: After significant changes (new modules, dependency updates, architecture shifts), run `/memory-save <type>`.
5. **Clean**: Remove stale entries with `/memory-forget --older-than 90days`.

## Memory Types

| Type | Contents | Refresh trigger |
|------|----------|----------------|
| `project-structure` | Module list, build variants, feature modules | Gradle sync |
| `dependencies` | Library versions, Gradle/KGP versions | Gradle sync |
| `architecture` | MVI/MVVM pattern, layer structure, DI framework | File changes |
| `test-coverage` | Coverage percentage, trends, failing tests | Test runs |
| `compose-screens` | Screen names, routes, file paths | File changes |

## Commands

| Command | Purpose |
|---------|---------|
| `/memory-load all` | Load all memory types at session start |
| `/memory-load <type>` | Load a specific memory type (e.g., `dependencies`) |
| `/memory-save <type>` | Save current state for a memory type |
| `/memory-save all` | Save all memory types (usually automatic) |
| `/memory-query "<question>"` | Query project facts (e.g., "What modules use Ktor?") |
| `/memory-forget <type>` | Remove a specific memory type |
| `/memory-forget --older-than <duration>` | Clean stale entries |
| `/memory-summary` | Overview of all stored memory with freshness dates |

## Storage

Memory is stored as JSON in `.claude/memory/`. Each memory type maps to a file:

```
.claude/memory/project-structure.json
.claude/memory/dependencies.json
.claude/memory/architecture.json
.claude/memory/test-coverage.json
.claude/memory/compose-screens.json
```

Example `project-structure.json`:

```json
{
  "modules": ["app", "core:network", "core:database", "feature:auth", "feature:home"],
  "buildVariants": ["debug", "release", "staging"],
  "featureModules": ["auth", "home", "profile"],
  "lastUpdated": "2026-04-10T14:30:00Z"
}
```

## Validation After Load

After `/memory-load all`, verify accuracy before relying on cached state:

```bash
# Check modules exist
/memory-query "What modules exist?"
# Then verify: ls -d app/ core/ feature/*/

# Check dependency versions
/memory-query "What Compose version?"
# Then verify against build.gradle.kts
```

If memory is stale, run `/memory-save all` to refresh from the current project state.

## Integration

- **With checkpoints**: Checkpoint restore includes memory state — no manual reload needed
- **With compaction**: Memory survives context compression; old entries are summarized automatically
- **With instincts**: Memory informs pattern extraction — project structure tells instincts where to look for patterns

## Memory vs Instincts

| Aspect | Memory | Instincts |
|--------|--------|-----------|
| Content | Factual state (what exists) | Patterns (how to build) |
| Updates | On project changes | On pattern observations |
| Confidence | Binary (current or stale) | 0.0–1.0 scored |
| Retention | 30–90 days, then cleaned | Persistent |
