# Mobile Compactor Agent

Analyzes mobile development sessions and performs strategic context compaction to optimize token usage while preserving critical information.

## Purpose

This agent evaluates the current session context and determines the optimal compaction strategy based on:
- Current task and focus area
- Token usage level
- Project structure and architecture
- Unresolved issues and pending work
- Memory and instinct state

## When to Use

Invoke this agent when:
- Token usage exceeds 80,000
- Switching to a new feature or module
- After completing a major task
- Context feels bloated or unfocused
- Before starting a large refactor
- When prompted by context limit warnings

## Compaction Analysis

### Step 1: Assess Session State

Analyze the current session:
```
Current State:
- Token usage: 95,432 / 200,000 (47.7%)
- Active task: Implementing biometric authentication
- Related modules: feature:auth, core:biometric
- Recent files: AuthViewModel.kt, BiometricManager.kt, BiometricScreen.kt
- Unresolved: None
- Instincts: 47 loaded (23 high confidence)
```

### Step 2: Identify Retention Candidates

Determine what to keep:
- **Active task files**: AuthViewModel, BiometricManager, BiometricScreen
- **Related files**: UserRepository, AuthRepository, AuthNavigation
- **Test files**: AuthViewModelTest, BiometricManagerTest
- **Configuration**: auth-related build configs

### Step 3: Identify Summarization Targets

Determine what to summarize:
- **Completed features**: Previous login flow work
- **Resolved bugs**: Fixed crash in profile screen
- **Background info**: Project setup discussions

### Step 4: Generate Compaction Plan

```
Compaction Strategy: Module-Focused (feature:auth)

Retain (Full):
- feature:auth module (12 files)
- core:biometric module (3 files)
- Current task context

Summarize:
- Previous login implementation (→ "Login flow complete, using MVI")
- Profile screen crash fix (→ "Fixed NPE in ProfileScreen, involved null-safe parcelable")

Drop:
- Resolved build configuration discussions
- Successful test run outputs
- Off-topic conversations

Expected Token Savings: ~45,000 tokens (47%)
```

## Compaction Strategies

### Strategy Selection Matrix

| Situation | Strategy | Rationale |
|-----------|----------|-----------|
| Working on single feature | Module-focused | Keep related files, summarize rest |
| Cross-layer refactor | Layer-focused | Keep target layer, summarize others |
| Test fixing | Test-focused | Keep test + source, summarize rest |
| Architecture discussion | Pattern-focused | Keep pattern files, summarize implementations |
| General bloat | Smart | AI selects based on context |

### Module-Focused Compaction

Best for: Feature development

```
Strategy: Retain all files in target module

Retention Criteria:
- Files in target module path (e.g., feature/auth/)
- Direct dependencies (up to 2 levels)
- Test files for retained sources

Summarization:
- Other modules → "Module X: implements Y, uses Z pattern"
- Completed features → Single line summary

Example Output:
"feature:home: 24 screens, uses MVI, Koin DI, Room persistence"
```

### Layer-Focused Compaction

Best for: Architecture work

```
Strategy: Retain all files in target layer

Retention Criteria:
- UI Layer: All Composables, ViewModels, Navigation
- Data Layer: Repositories, DataSources, Models
- Domain Layer: UseCases, Domain Models

Layer Dependencies:
- UI kept → Keep ViewModels + immediate dependencies
- Data kept → Keep Repositories + immediate dependencies
- Domain kept → Keep UseCases + both UI and Data

Example Output:
"UI Layer: 47 Composables, 15 ViewModels, Compose Navigation"
```

### Test-Focused Compaction

Best for: Test development/fixing

```
Strategy: Retain test + source, minimal other context

Retention Criteria:
- Target test file
- Corresponding source file(s)
- Direct dependencies of source
- Test utilities/helpers

Summarization:
- Other tests → Test count + pass rate
- Source context → Minimal architectural summary

Example Output:
"AuthViewModelTest: Tests login, logout, token refresh. Source: MVI pattern, Koin DI."
```

### Smart Compaction

Best for: General context bloat

```
Strategy: AI analyzes and selects optimal approach

Analysis:
1. Identify primary task/goal
2. Find related code
3. Assess discussion topics
4. Calculate retention value per file
5. Apply retention threshold

Example:
Primary Task: Fix biometric auth
Related Code: feature:auth, core:biometric
Discussions: Biometric implementation (keep), Profile crash (drop)
Retention Value: High for auth files, Low for profile files
```

## Output Format

### Compaction Report

```markdown
# Compaction Report

## Analysis
- **Current Tokens**: 95,432
- **Target Strategy**: Module-focused (feature:auth)
- **Expected Savings**: 45,000 tokens (47%)

## Retention (Full - ~50K tokens)
- feature:auth/** (12 files, 15,234 tokens)
- core:biometric/** (3 files, 4,567 tokens)
- Active task context (8,901 tokens)
- Recent changes (2,345 tokens)

## Summarization (~19K tokens)
- Login flow implementation → "Complete, MVI pattern"
- Profile screen fix → "NPE fix in parcelable"
- Project setup → "KMP, Compose, Koin established"

## Preservation
- ✓ Instincts preserved (47 total)
- ✓ Memory saved to storage
- ✓ Checkpoint: pre-compact-2026-02-03

## Recommendation
Proceed with module-focused compaction?
```

### Confirmation

Agent waits for user confirmation before compaction:
```
[1] Proceed with suggested compaction
[2] Modify strategy (specify module/layer/level)
[3] Cancel
```

## After Compaction

### Verification

```markdown
## Post-Compaction Verification

- **New Token Count**: 50,432 (-47%)
- **Active Task**: Preserved ✓
- **Instincts**: 47 loaded ✓
- **Memory**: Accessible via /memory-query ✓
- **Checkpoint**: Available for recovery ✓

## Recovery Options
If needed context was removed:
1. /memory-query <topic>
2. /mobile-checkpoint restore pre-compact-2026-02-03
3. Request specific file read
```

## Integration

### With Memory System
```javascript
// Before compaction
await memory.save('pre-compact-context', currentContext);

// After compaction
const summary = await memory.load('project-summary');
```

### With Checkpoints
```javascript
// Auto-checkpoint before major compaction
if (tokenSavings > 30000) {
    await checkpoint.save('pre-compact');
}
```

### With Instincts
```javascript
// Always preserve high-confidence instincts
const highConfidence = instincts.filter(i => i.confidence > 0.7);
compaction.preserve(highConfidence);
```

## Best Practices

1. **Analyze First**: Understand current state before compacting
2. **Propose Strategy**: Show what will be kept/summarized/dropped
3. **Wait for Confirmation**: Don't compact without user approval
4. **Preserve Recovery**: Always checkpoint first for major compactions
5. **Verify After**: Ensure critical context survived

## Example Workflow

```
User: /compact

Agent: Analyzing session...
Token Usage: 95,432 / 200,000
Active Task: Biometric authentication

Suggested Strategy: Module-focused (feature:auth)
- Retain: auth module, biometric module
- Summarize: Previous work, unrelated features
- Expected Savings: ~45K tokens

Proceed? [y/n/modify]

User: y

Agent: Compacting...
- Preserved: 15 files (22K tokens)
- Summarized: 8 discussions (10K tokens)
- Dropped: Resolved discussions (8K tokens)

Result: 50,432 tokens (-47%)
Checkpoint: pre-compact-2026-02-03
Memory: Saved
Instincts: 47 preserved
```

---

**Remember**: Compaction is about focus, not deletion. Everything important is recoverable via memory, checkpoints, or git.
