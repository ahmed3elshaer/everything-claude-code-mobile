---
name: mobile-checkpoint
description: Checkpoint workflow for mobile development safety. Save/restore Android project state at critical points.
---

# Mobile Checkpoint Skill

Comprehensive checkpoint workflow for Android development safety and state recovery.

## When to Use

**Before risky operations:**
- Large refactors (MVI migration, architecture changes)
- Gradle updates (`./gradlew wrapper`, dependency upgrades)
- Manifest changes (permissions, components)
- Navigation restructuring
- Experimental features

**After milestones:**
- Feature completion
- Passing all tests
- Successful release build
- Performance optimization

## Checkpoint Workflow

### 1. Pre-Operation Check

```bash
# Verify clean state
git status
./gradlew check

# Create checkpoint
/mobile-checkpoint save before-<operation>
```

### 2. Perform Operation

```bash
# Make your changes
# ... edits, refactors, updates ...

# Verify build
./gradlew build
```

### 3. Post-Operation Verification

```bash
# If successful - create new checkpoint
/mobile-checkpoint save after-<operation>

# If failed - restore
/mobile-checkpoint restore before-<operation>
```

## Checkpoint Content Levels

| Level | Content | Use Case |
|-------|---------|----------|
| **Quick** | Git status, branch, recent files | Quick experiments |
| **Standard** | + Build config, tests | Default for most ops |
| **Full** | + Dependencies, manifest, instincts | Major refactors, releases |

## State Recovery

### Git State Recovery
```bash
/mobile-checkpoint restore <name>
# Agent will:
# 1. Show git diff to current state
# 2. Offer git reset --hard <commit>
# 3. Restore staged/unstaged changes
```

### Dependency Recovery
```bash
# Checkpoint includes:
# - build.gradle.kts files
# - gradle/wrapper/gradle-wrapper.properties
# - version catalog (libs.versions.toml)

# Agent provides diff for manual restoration
```

### Test State Recovery
```bash
# Checkpoint shows:
# - Previous test results
# - Failing tests (if any)
# - Coverage metrics

# Run tests to verify state:
./gradlew test
```

## Auto-Checkpoint Integration

The checkpoint system integrates with hooks:

```json
// hooks/checkpoint-hooks.json
{
    "trigger": "PreToolUse",
    "matcher": "tool == \"Bash\" && command contains \"gradle\"",
    "action": "Create quick checkpoint"
}

{
    "trigger": "PostToolUse",
    "matcher": "tool == \"Edit\" && file == \"AndroidManifest.xml\"",
    "action": "Create standard checkpoint"
}
```

## Checkpoint Naming Convention

Use descriptive names with operation and context:

| Name Pattern | Example |
|--------------|---------|
| `before-{operation}` | `before-mvi-migration` |
| `after-{operation}` | `after-koin-refactor` |
| `{feature}-complete` | `auth-flow-complete` |
| `{version}-rc` | `v1.2.0-rc1` |
| `working-{date}` | `working-2026-02-03` |

Avoid: `checkpoint1`, `save`, `temp`

## Checkpoint Management

### List Checkpoints
```bash
/mobile-checkpoint list
# Output:
# before-mvi-refactor    2 hours ago    Standard
# auth-feature-done     1 day ago      Full
# working-0203          2 days ago     Quick
```

### Delete Old Checkpoints
```bash
# Keep last 10
/mobile-checkpoint prune --keep 10

# Delete specific
/mobile-checkpoint delete working-0203
```

### Export for Backup
```bash
# Export to file
/mobile-checkpoint export release-ready > ~/backups/mobile-checkpoint.json

# Import from file
/mobile-checkpoint import ~/backups/mobile-checkpoint.json
```

## Integration with Instincts

Checkpoints preserve instinct learning:
```json
{
    "instincts": {
        "version": "2.0",
        "count": 47,
        "highConfidence": 23,
        "lastUpdated": "2026-02-03T10:30:00Z"
    }
}
```

Restoring a checkpoint also restores your learned patterns.

## Troubleshooting

### Restore Fails
1. Check git state: `git status`
2. Verify checkpoint integrity: `/mobile-checkpoint verify <name>`
3. Manual recovery: Checkout commit manually

### Missing Dependencies
1. Checkpoint shows original versions
2. Restore build.gradle.kts manually
3. Run `./gradlew --refresh-dependencies`

### Tests Differ After Restore
1. Tests may have changed between checkpoint and now
2. Checkpoint captures test STATE, not test CODE
3. Use git diff to see test file changes

## Best Practices

1. **Checkpoint Before**: Always save before major changes
2. **Name Clearly**: Use operation-based names
3. **Verify After**: Run tests before confirming checkpoint
4. **Clean Regularly**: Remove old checkpoints monthly
5. **Export Milestones**: Export before releases
6. **Trust Git**: Checkpoints complement, don't replace, version control

---

**Remember**: A checkpoint is a safety net, not a time machine. It shows you what changed, not how to undo every change.
