---
description: Save and restore mobile development checkpoints. Capture build variants, test states, and project state before risky operations.
---

# Mobile Checkpoint Command

Save and restore Android project state at critical points during development.

## Usage

```bash
/mobile-checkpoint save [name]       # Save current state
/mobile-checkpoint list               # List all checkpoints
/mobile-checkpoint restore <name>     # Restore a checkpoint
/mobile-checkpoint delete <name>      # Delete a checkpoint
/mobile-checkpoint export <name>      # Export checkpoint to file
/mobile-checkpoint import <file>      # Import checkpoint from file
```

## Examples

```bash
# Save before risky refactor
/mobile-checkpoint save before-mvi-refactor

# Save before Gradle updates
/mobile-checkpoint save before-gradle-update

# List available checkpoints
/mobile-checkpoint list

# Restore after failed experiment
/mobile-checkpoint restore before-mvi-refactor

# Export for sharing
/mobile-checkpoint export working-state > checkpoint.json
```

## What Gets Saved

### Build State
- Current build variant (debug/release/staging)
- Gradle dependency versions
- Build configuration files
- ProGuard rules

### Test State
- Last test run results
- Test coverage per module
- Failing test list
- Flaky test history

### Code State
- Current git commit
- Staged and unstaged changes
- Branch name
- Recent file modifications

### Compose State
- Recent Compose preview changes
- UI component modifications
- Navigation graph state

### Manifest State
- Declared permissions
- Activity/Service declarations
- Deep link configurations

## Checkpoint Structure

```json
{
    "name": "before-mvi-refactor",
    "timestamp": "2026-02-03T10:30:00Z",
    "git": {
        "branch": "feature/auth",
        "commit": "abc123",
        "status": "clean",
        "staged": [],
        "unstaged": []
    },
    "build": {
        "variant": "debug",
        "gradleVersion": "8.2",
        "kgpVersion": "1.9.20",
        "dependencies": { ... }
    },
    "tests": {
        "lastRun": "2026-02-03T10:25:00Z",
        "passed": 142,
        "failed": 3,
        "coverage": "78%"
    },
    "manifest": {
        "permissions": ["INTERNET", "ACCESS_NETWORK_STATE"],
        "activities": 12,
        "services": 3
    },
    "compose": {
        "screens": 24,
        "previews": 18,
        "recentChanges": ["HomeScreen.kt", "ProfileScreen.kt"]
    },
    "instincts": { ... }
}
```

## Auto-Checkpoint Triggers

Checkpoints are automatically created before:
- Gradle sync operations
- Major refactors (detected by file churn)
- Dependency version updates
- Manifest permission changes

## Restoration

When restoring a checkpoint:
1. **Code**: Resets git state (commit, branch, changes)
2. **Dependencies**: Restores Gradle versions
3. **Tests**: Shows previous test results
4. **Configuration**: Restores build files

**Note**: Restoration doesn't modify files directly - it guides you through the recovery process.

## Use Cases

| Scenario | Checkpoint Point |
|----------|------------------|
| Large Refactor | Before starting |
| Dependency Update | Before running `gradle upgrade` |
| Architecture Change | Before modifying structure |
| Experiment | Before trying new approach |
| Release Prep | Before release branch |
| Bug Hunt | After bug is found (for comparison) |

## Integration

- **skills/mobile-checkpoint.md**: Checkpoint workflow guide
- **hooks/checkpoint-hooks.json**: Auto-save triggers
- **scripts/hooks/pre-compact.js**: Backup during compaction

## Tips

1. **Name descriptively**: `before-mvi-migration` > `checkpoint-1`
2. **Clean old checkpoints**: Keep last 10-20 for storage efficiency
3. **Export milestones**: Export before major releases
4. **Document context**: Add notes about what was being attempted

---

**Remember**: Checkpoints are for recovery, not version control. Git is your source of truth.
