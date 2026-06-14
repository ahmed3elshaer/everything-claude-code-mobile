# Mobile Pattern Extractor Agent

Analyzes codebases to extract and categorize mobile development patterns for continuous learning.

## Purpose

This agent identifies reusable patterns in Android/Kotlin codebases and extracts them as instincts for the continuous learning system. It bridges the gap between V1 (immediate capture) and V2 (observational learning).

## When to Use

Invoke this agent when:
- A new feature has been implemented and patterns should be extracted
- Code review reveals reusable patterns
- Setting up a new mobile project for learning
- After refactoring to capture new patterns
- Periodically (e.g., weekly) to consolidate learning

## Pattern Extraction Categories

### 1. Compose UI Patterns

Extract patterns for:
- **State Management**: How state flows through composables
- **Recomposition Optimization**: Stable keys, remember, derivedStateOf
- **Side Effects**: LaunchedEffect, DisposableEffect usage
- **Layout Patterns**: Box, Column, Row combinations

**Look for:**
```kotlin
// State hoisting
@Composable
fun MyScreen(
    uiState: UiState,
    onIntent: (Intent) -> Unit
) { ... }

// Stable keys
LazyColumn(items = list, key = { it.id }) { ... }

// Side effects
LaunchedEffect(key1) { ... }
```

### 2. MVI Architecture Patterns

Extract patterns for:
- **State Sealing**: Sealed interfaces/classes for UI state
- **Intent Handling**: User action processing
- **State Reduction**: Reduce function patterns
- **Event Handling**: One-time event emission

**Look for:**
```kotlin
sealed interface UiState { ... }
sealed interface Intent { ... }

fun onIntent(intent: Intent) {
    when (intent) {
        is Intent.Load -> loadData()
    }
}
```

### 3. Dependency Injection Patterns

Extract patterns for:
- **Koin Modules**: Module organization
- **ViewModel Injection**: koinViewModel usage
- **Repository Injection**: factoryOf patterns
- **Scoped Dependencies**: Android ViewModel scopes

**Look for:**
```kotlin
val appModule = module {
    factoryOf(::Repository)
    viewModel { MyViewModel(get()) }
}
```

### 4. Networking Patterns

Extract patterns for:
- **Ktor Client Setup**: Plugins, serializers
- **Error Handling**: runCatching patterns
- **Retry Logic**: Exponential backoff
- **Caching**: Response caching strategies

**Look for:**
```kotlin
runCatching {
    client.get(url)
}.onFailure { /* error handling */ }
```

### 5. Coroutine Patterns

Extract patterns for:
- **Scope Usage**: viewModelScope, lifecycleScope
- **Dispatcher Selection**: IO, Default, Main
- **Exception Handling**: try-catch, CoroutineExceptionHandler
- **Cancellation**: Structured concurrency

**Look for:**
```kotlin
viewModelScope.launch {
    withContext(Dispatchers.IO) { ... }
}
```

### 6. Testing Patterns

Extract patterns for:
- **JUnit Setup**: @Before, test fixtures
- **Compose Testing**: composeTestRule usage
- **Mocking**: MockK patterns
- **Coroutines Testing**: runTest usage

## Extraction Process

### Step 1: Scan Codebase

Search for pattern indicators:
- File names (`*Screen.kt`, `*ViewModel.kt`, `*Module.kt`)
- Package structures (`ui/screens`, `data/repository`, `di`)
- Language constructs (`sealed`, `@Composable`, `module`)

### Step 2: Analyze Patterns

For each candidate:
1. Read the file content
2. Identify the pattern type
3. Extract the reusable structure
4. Rate confidence (0.0-1.0)

### Step 3: Categorize

Group patterns by:
- **Context**: Compose, MVI, Koin, Ktor, Coroutines
- **Confidence**: Experimental, Validating, Established, Best Practice
- **Frequency**: How often it appears

### Step 4: Store as Instinct

Create instinct entries:
```json
{
    "id": "pattern-name",
    "type": "pattern",
    "description": "Human-readable description",
    "context": "category",
    "confidence": 0.7,
    "examples": ["file1.kt", "file2.kt"],
    "code": "kotlin code snippet",
    "createdAt": "2026-02-03",
    "lastUsed": "2026-02-03"
}
```

## Output

The agent produces:

1. **Pattern Report**: Summary of extracted patterns
2. **Instinct Updates**: JSON files added to instincts directory
3. **Confidence Scores**: Assessment of pattern reliability
4. **Recommendations**: Suggested pattern improvements

## Example Workflow

```
User: /extract-patterns

Agent:
1. Scanning 47 Kotlin files...
2. Found 12 Compose screens, 5 ViewModels, 3 Koin modules
3. Extracting patterns...

Patterns Extracted:
✓ compose-state-hoisting (confidence: 0.8)
  - Found in: HomeScreen.kt, ProfileScreen.kt, SettingsScreen.kt

✓ mvi-sealed-state (confidence: 0.9)
  - Found in: HomeViewModel.kt, AuthViewModel.kt

✓ koin-viewmodel-factory (confidence: 0.7)
  - Found in: AppModule.kt

✓ ktor-run-catching (confidence: 0.6)
  - Found in: ApiClient.kt

4. Instincts updated: 4 patterns added/updated
5. Run /instinct-status to review
```

## Confidence Scoring Guidelines

| Confidence | Criteria |
|------------|----------|
| 0.9-1.0 | Used in 5+ files, consistent structure, follows best practices |
| 0.7-0.8 | Used in 3-4 files, mostly consistent |
| 0.5-0.6 | Used in 2 files, some variation |
| 0.3-0.4 | Found once or twice, experimental |
| 0.0-0.2 | Hypothetical, not yet observed |

## Integration

Works with:
- **skills/mobile-instinct-v1.md**: Receives immediate patterns
- **skills/mobile-instinct-v2.md**: Observes across sessions
- **hooks/extended/instinct-hooks.json**: Auto-trigger on code changes
- **scripts/hooks/evaluate-session.js**: Session-end consolidation

---

**Remember**: Good patterns become instincts. Bad patterns become anti-patterns to avoid.
