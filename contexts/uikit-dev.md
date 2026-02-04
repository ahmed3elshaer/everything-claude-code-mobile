# UIKit Development Context

Context for UIKit development using traditional iOS patterns.

## When It's Injected

- **Session Start**: When UIKit/Xcode project is detected (without SwiftUI)
- **UIKit File Detected**: When editing .swift files with UIKit content
- **Legacy Code**: When working on view controllers, table views, etc.

## Context Structure

```markdown
## UIKit Project Context

### UI Framework
- **Primary**: UIKit (UIView, UIViewController)
- **Modern**: SwiftUI (for new features, mixed approach)
- **Navigation**: UINavigationController / UITabBarController
- **State**: Programmatic UI + Delegates

### View Controllers
- **Total**: 25 view controllers
- **Storyboards**: 5 (legacy)
- **Programmatic**: 20 (preferred)
- **XIBs**: 0 (deprecated)

### Legacy Patterns
- **Delegates**: 15 delegate implementations
- **Data Sources**: UITableView/UICollectionView
- **Notification Center**: KVO for state observation

### Dependencies
- **UIKit**: Native
- **Combine**: Partial adoption for reactive streams
- **RxSwift**: Legacy reactive (being phased out)
```

## UIKit ↔ Modern Equivalents

### State Management

| UIKit (Legacy) | Modern (SwiftUI/Combine) | Notes |
|----------------|------------------------|-------|
| `UIViewController` | `struct View` | VC is imperative, View is declarative |
| `delegates` | `closures` | Delegates → Closures |
| `KVO` | `@Published` | Observation patterns |
| `NotificationCenter` | `Combine` | Event broadcasting |
| `UserDefaults` | `@AppStorage` | Persistence |

### Data Loading

| UIKit (Legacy) | Modern (SwiftUI/Async) | Notes |
|----------------|------------------------|-------|
| `didAppear` | `.onAppear` | Lifecycle hooks |
| `viewDidLoad` | `init` + `.task` | Initialization |
| `UIAlertController` | `.alert()` | Presentation |
| `UITableViewDataSource` | `List { }` | Data-driven UI |

### Animation

| UIKit (Legacy) | Modern (SwiftUI) | Notes |
|----------------|----------------|-------|
| `UIView.animate` | `.animation()` | Imperative vs declarative |
| `CoreAnimation` | `.transition()` | Low-level vs high-level |
| `UIViewControllerTransition` | `.navigationTransition()` | Custom transitions |

## Common Patterns

### Programmatic Layout

```swift
// ✅ Modern programmatic layout with anchors
class HomeViewController: UIViewController {
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupView()
    }

    private func setupView() {
        view.backgroundColor = .systemBackground
        navigationItem.title = "Home"

        view.addSubview(titleLabel)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16).isActive = true
        titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16).isActive = true
    }
}
```

### Modern UIKit with Combine

```swift
class HomeViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false

    private var cancellables = Set<AnyCancellable>()

    func loadItems() {
        isLoading = true
        service.getItems()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                self?.items = $0
                self?.isLoading = false
            }
            .store(in: &cancellables)
    }
}
```

### UITableView Modernization

```swift
// ✅ Modern diffable data source
class HomeViewController: UIViewController {
    var dataSource: UITableViewDiffableDataSource<Section, Item>!

    func configureDataSource() {
        dataSource = UITableViewDiffableDataSource<Section, Item>(tableView: tableView) {
            tableView.register(Cell.self, forCellReuseIdentifier: "Cell")

            return UIListContentConfiguration.cell(for: $0) { _, item, _ in
                var content = UIListContentConfiguration.cell()
                content.text = item.title
                content.secondaryText = item.subtitle
                content.image = UIImage(systemName: "star")
                return content
            }
        }
    }
}
```

## Migration Path

### UIKit → SwiftUI

```
1. Extract business logic from VCs (use cases, repositories)
2. Create @Observable view models
3. Convert views to SwiftUI (one screen at a time)
4. Use UIHostingController to embed SwiftUI in UIKit
5. Incrementally replace UIKit with SwiftUI
```

### Hybrid Approach

```swift
// ✅ Using SwiftUI within UIKit
class ViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let childView = ContentView()
        let hostingController = UIHostingController(rootView: childView)
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.frame = view.bounds
        hostingController.didMove(toParent: self)
    }
}
```

---

**Remember**: UIKit is still powerful and necessary. Mix UIKit with SwiftUI gradually, prioritizing new features in SwiftUI while keeping stable UIKit code.
