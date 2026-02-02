# TDD Workflow for Android

## The Cycle

```
   SCAFFOLD ──▶ RED ──▶ GREEN ──▶ REFACTOR
      │                              │
      └──────────────────────────────┘
```

1. **SCAFFOLD** - Define interfaces
2. **RED** - Write failing test
3. **GREEN** - Minimal implementation
4. **REFACTOR** - Clean up

## Example: ViewModel Testing

### 1. Define Interface

```kotlin
interface HomeRepository {
    suspend fun getItems(): Result<List<Item>>
}
```

### 2. Write Failing Test

```kotlin
@Test
fun `loads items successfully`() = runTest {
    coEvery { repository.getItems() } returns Result.success(items)
    
    viewModel.state.test {
        viewModel.onIntent(LoadItems)
        awaitItem().isLoading shouldBe true
        awaitItem().items shouldBe items
    }
}
```

### 3. Implement

```kotlin
private fun loadItems() {
    viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        repository.getItems()
            .onSuccess { items -> _state.update { it.copy(items = items, isLoading = false) } }
    }
}
```

### 4. Refactor

Extract common patterns, improve naming, simplify.

## Coverage Target: 80%+

```bash
./gradlew koverHtmlReport
open build/reports/kover/html/index.html
```

## Command

```bash
/mobile-tdd Add search functionality to HomeScreen
```
