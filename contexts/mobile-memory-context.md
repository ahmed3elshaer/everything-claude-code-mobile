# Mobile Memory Context

Persistent context injection for mobile development sessions.

## Purpose

This context is automatically loaded at session start to provide immediate awareness of the mobile project state without requiring file reads or analysis.

## When It's Injected

- **Session Start**: Always loaded for mobile projects
- **After Compaction**: Reloaded to restore context
- **Checkpoint Restore**: Loaded from checkpoint data
- **Project Switch**: Loaded when switching between projects

## Context Structure

```markdown
## Mobile Project Context

### Project Structure
- **Modules**: app, core:network, core:database, feature:auth, feature:home
- **Build Variants**: debug, release, staging
- **Min SDK**: 24
- **Target SDK**: 34
- **Compile SDK**: 34

### Architecture
- **Pattern**: MVI (Model-View-Intent)
- **DI Framework**: Koin 3.4.0
- **Async**: Coroutines + Flow
- **UI**: Jetpack Compose 1.5.0

### Key Dependencies
- **Compose**: BOM 2023.10.01
- **Ktor**: 2.3.0
- **Koin**: 3.4.0
- **Room**: 2.6.0
- **Navigation**: Compose 2.7.0

### Test State
- **Coverage**: 78%
- **Trend**: Improving (+5% from last week)
- **Failing Tests**: 0
- **Flaky Tests**: AuthViewModelTest.testLogin

### Recent Work
- Last session: Added profile screen
- Current branch: feature/settings
- Uncommitted changes: 3 files

### Compose Screens
- Total: 24
- With Previews: 18
- Tested: 15
```

## Loading Behavior

### Automatic Load

At session start, the mobile-memory MCP server is queried:
```javascript
const context = await memory.load('mobile-context-summary');
```

This produces a concise summary suitable for context injection.

### Selective Load

For focused sessions, specific memory types can be loaded:
```
/context-load mobile-memory --type=dependencies
/context-load mobile-memory --type=architecture
```

## Integration Points

### With Continuous Learning

Memory informs instinct capture:
```javascript
// Only capture patterns for frameworks that exist
const frameworks = memory.get('dependencies').libraries.map(l => l.name);
instinctCapture.setKnownFrameworks(frameworks);
```

### With Checkpoints

Context is saved in checkpoints:
```json
{
    "context": {
        "modules": ["app", "core:network"],
        "architecture": "mvi",
        "snapshot": "2026-02-03T10:30:00Z"
    }
}
```

### With Compaction

Context is preserved during compaction:
- **Before compaction**: Full context saved to memory
- **After compaction**: Context reloaded from memory
- **Result**: No context loss

## Context Sources

The mobile-memory context aggregates from:

1. **Project Structure Memory**
   - settings.gradle.kts analysis
   - build.gradle.kts parsing

2. **Dependencies Memory**
   - Gradle dependency resolution
   - Version catalog parsing

3. **Architecture Memory**
   - Source code analysis
   - Pattern detection

4. **Test Memory**
   - Test execution results
   - Coverage reports

5. **Recent Activity**
   - Git history
   - Recent file changes

## Context Refresh

Context auto-refreshes when:
- Dependencies change (build.gradle.kts edited)
- Modules added/removed (settings.gradle.kts edited)
- Architecture patterns detected
- Tests executed

## Manual Context Update

```bash
# Force refresh all context
/context-refresh mobile-memory

# Refresh specific type
/context-refresh mobile-memory --type=dependencies

# Verify context matches project
/context-verify mobile-memory
```

## Context Size Management

To keep context manageable:
- **Project Structure**: ~500 tokens
- **Dependencies**: Top 50 libraries (~300 tokens)
- **Architecture**: High-level only (~200 tokens)
- **Test State**: Summary only (~200 tokens)

**Total**: ~1200-1500 tokens

For large projects, use selective loading:
```
/context-load mobile-memory --module=feature:auth
```

---

**Remember**: Context is for awareness, not detail. Query memory for specifics when needed.
