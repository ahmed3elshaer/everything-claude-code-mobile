# SwiftUI Development Context

Context for SwiftUI development using modern iOS 17+ patterns.

## When It's Injected

- **Session Start**: When SwiftUI/Xcode project is detected
- **SwiftUI File Detected**: When editing .swift files with SwiftUI content
- **After Compaction**: Restore SwiftUI context

## Context Structure

```markdown
## SwiftUI Project Context

### UI Framework
- **Primary**: SwiftUI
- **Fallback**: UIKit (wrappers)
- **Navigation**: NavigationStack (iOS 16+)
- **State**: @Observable macro (iOS 17+)

### Compose/SwiftUI Mapping
- **Compose Screen** → SwiftUI View
- **ViewModel** → @Observable class
- **StateFlow** → @Published property
- **LaunchedEffect** → .task modifier
- **SideEffect** → .onChange or .onAppear

### SwiftUI Views
- **Total Views**: 42
- **With Previews**: 38
- **Navigation Paths**: 8 routes
- **Sheet Presentations**: 12 sheets

### Dependencies
- **SwiftData**: iOS 17+ (for data persistence)
- **Combine**: Legacy reactive (being phased out)
- **Async/Await**: Modern concurrency
```

## SwiftUI ↔ Compose Equivalents

### State Management

| Compose (Android) | SwiftUI (iOS) | Notes |
|--------------------|-------------------|-------|
| `@Composable` | `struct View` | Both declarative UI |
| `@StateObject` | | Use @Observable in iOS 17+ |
| `@ViewModel` | `@Observable class` | Macro-based in iOS 17 |
| `StateFlow` | `@Published` | Flow → Publisher |
| `collectAsStateWithLifecycle()` | `.task { await }` | Collection differs |
| `LaunchedEffect` | `.task` or `.onAppear` | Effect timing |
| `SideEffect` | `.onChange` | Observation differs |

### Navigation

| Compose (Android) | SwiftUI (iOS) | Notes |
|--------------------|-------------------|-------|
| `NavHost` | `NavigationStack` | Both have type-safe routing |
| `navController` | `navigationDestination` | DSL-based |
| `composable(route)` | `.navigationDestination { }` | Screen definition |
| `navController.navigate()` | `path.append()` | Imperative push |

### Dependency Injection

| Compose (Android) | SwiftUI (iOS) | Notes |
|--------------------|-------------------|-------|
| `koinViewModel()` | `@StateObject` or manual init | Koin in shared code |
| `HiltViewModel` | `@EnvironmentObject` | Manual DI preferred |
| `Koin module` | `Koin module` | Shared DI setup |

### Side Effects

| Compose (Android) | SwiftUI (iOS) | Notes |
|--------------------|-------------------|-------|
| `LaunchedEffect(key) { }` | `.task(id: key) { }` | One-shot async work |
| `DisposableEffect` | `.task { }` with return | Cleanup handled via return |
| `SideEffect { }` | `.onChange(of:) { }` | Per-observation effect |
| `produceState` | `@Published` | State propagation |

## Quick Reference

### @Observable Pattern (iOS 17+)

```swift
@Observable
class HomeViewModel {
    var users: [User] = []
    var isLoading = false

    func loadUsers() async {
        isLoading = true
        users = try await api.getUsers()
        isLoading = false
    }
}
```

### Navigation Stack

```swift
NavigationStack(path: $path) {
    HomeView()
        .navigationDestination(for: Route.self) { route in
            switch route {
            case .detail(let id): DetailView(id: id)
            case .profile: ProfileView()
            }
        }
}
```

### Sheet Presentation

```swift
.sheet(isPresented: $showingSheet) {
    SheetContent()
}

.sheet(item: $selectedItem) { item in
    DetailSheet(item)
}
```

---

**Remember**: SwiftUI is declarative like Compose, but has different patterns. Use `@Observable` for new code, `ObservableObject` for legacy.
