# MVI Architecture Guide

## Overview

MVI (Model-View-Intent) provides unidirectional data flow for predictable state management.

```
┌─────────────────────────────────────────────┐
│                  UI Layer                    │
│  ┌─────────┐   Intent   ┌──────────────┐   │
│  │  View   │ ─────────▶ │  ViewModel   │   │
│  └─────────┘            └──────────────┘   │
│       ▲                        │            │
│       │         State          │            │
│       └────────────────────────┘            │
└─────────────────────────────────────────────┘
```

## Core Components

### State

```kotlin
@Immutable
data class HomeState(
    val isLoading: Boolean = false,
    val items: List<Item> = emptyList(),
    val error: String? = null
)
```

### Intent

```kotlin
sealed interface HomeIntent {
    object LoadItems : HomeIntent
    data class Search(val query: String) : HomeIntent
    data class ItemClicked(val id: String) : HomeIntent
}
```

### ViewModel

```kotlin
class HomeViewModel(
    private val repository: HomeRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HomeState())
    val state = _state.asStateFlow()

    fun onIntent(intent: HomeIntent) {
        when (intent) {
            is HomeIntent.LoadItems -> loadItems()
            is HomeIntent.Search -> search(intent.query)
            is HomeIntent.ItemClicked -> navigateToDetail(intent.id)
        }
    }
}
```

### Side Effects

```kotlin
sealed interface HomeSideEffect {
    data class Navigate(val route: String) : HomeSideEffect
    data class ShowSnackbar(val message: String) : HomeSideEffect
}
```

## Clean Architecture Layers

```
┌─────────────────────────────────────┐
│          Presentation               │
│   (ViewModel, Compose, State)       │
├─────────────────────────────────────┤
│            Domain                   │
│   (UseCase, Repository Interface)   │
├─────────────────────────────────────┤
│             Data                    │
│   (Repository Impl, API, Database)  │
└─────────────────────────────────────┘
```

## Koin Modules

```kotlin
val featureModule = module {
    single<HomeRepository> { HomeRepositoryImpl(get()) }
    factory { GetItemsUseCase(get()) }
    viewModel { HomeViewModel(get()) }
}
```

## Next Steps

- [TDD Workflow](./tdd-workflow.md) - Test your architecture
- [Commands Reference](./commands.md) - Available commands
