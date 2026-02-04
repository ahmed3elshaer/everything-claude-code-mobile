---
name: combine-framework
description: Apple Combine framework for reactive programming. Publishers, subscribers, operators, and error handling.
---

# Combine Framework

Reactive programming with Apple's Combine framework.

## Core Concepts

### Publisher & Subscriber

```swift
// ✅ Basic subscription
let publisher = Just("Hello")
let subscriber = publisher.sink { value in
    print(value)  // "Hello"
}
```

### Creating Publishers

```swift
// ✅ Just - single value
Just(42)

// ✅ Future - async result
Future { promise in
    promise(.success(42))
    // or
    promise(.failure(Error()))
}

// ✅ PassthroughSubject - broadcast
let subject = PassthroughSubject<String, Never>()
subject.send("Hello")
subject.send(completion: .finished)

// ✅ CurrentValueSubject - holds current value
let currentValue = CurrentValueSubject<Int, Never>(0)
currentValue.send(1)
print(currentValue.value)  // 1

// ✅ @Published in ObservableObject
class ViewModel: ObservableObject {
    @Published var count = 0
}
```

## Common Operators

### Transform

```swift
// ✅ map - transform values
[1, 2, 3].publisher
    .map { $0 * 2 }
    .sink { print($0) }  // 2, 4, 6

// ✅ flatMap - nested publishers
[1, 2, 3].publisher
    .flatMap { value in
        Future { promise in
            promise(.success(value * 2))
        }
    }
    .sink { print($0) }

// ✅ scan - accumulate
(1...10).publisher
    .scan(0, +)
    .sink { print($0) }  // 1, 3, 6, 10, 15...
```

### Filter

```swift
// ✅ filter
(1...10).publisher
    .filter { $0 % 2 == 0 }
    .sink { print($0) }  // 2, 4, 6, 8, 10

// ✅ removeDuplicates
[1, 1, 2, 2, 3].publisher
    .removeDuplicates()
    .sink { print($0) }  // 1, 2, 3

// ✅ debounce - wait for pause
searchTextPublisher
    .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
    .sink { text in
        performSearch(text)
    }
```

### Combine

```swift
// ✅ combineLatest - waits for both
let namePublisher = CurrentValueSubject<String, Never>("")
let agePublisher = CurrentValueSubject<Int, Never>(0)

Publishers.CombineLatest(namePublisher, agePublisher)
    .sink { name, age in
        print("\(name), \(age)")
    }

// ✅ merge - same type, interleaved
let p1 = PassthroughSubject<Int, Never>()
let p2 = PassthroughSubject<Int, Never>()

p1.merge(with: p2)
    .sink { print($0) }

// ✅ zip - pairs up
let names = PassthroughSubject<String, Never>()
let ages = PassthroughSubject<Int, Never>()

names.zip(ages)
    .sink { print("\($0) is \($1) years old") }
```

## Error Handling

```swift
// ✅ catch - recover from error
failingPublisher
    .catch { error in
        return Just("Fallback value")
    }
    .sink { print($0) }

// ✅ retry - attempt on failure
failingPublisher
    .retry(3)
    .sink { print($0) }

// ✅ replaceError - replace with default
riskyPublisher
    .replaceError(with: "Default")
    .sink { print($0) }

// ✅ mapError - transform error
riskyPublisher
    .mapError { error in
        return MyError.custom(error)
    }
    .sink { _ in } receiveValue: { error in
        print(error)
    }
```

## SwiftUI Integration

### @Published

```swift
class HomeViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()

    func loadUsers() {
        isLoading = true

        service.getUsers()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] users in
                self?.users = users
            }
            .store(in: &cancellables)
    }
}
```

### Assign

```swift
// ✅ assign to property
publisher
    .map(\.name)
    .assign(to: &$viewModel.userName)

// ✅ assign to KVO-compliant property
publisher
    .map(\.text)
    .assign(to: \.text, on: label)
```

## Subject Patterns

### Behavior Subject Pattern

```swift
class SearchViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var results: [Result] = []

    private let searchSubject = PassthroughSubject<String, Never>()
    private var cancellables = Set<AnyCancellable>()

    init() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .removeDuplicates()
            .flatMap { query in
                self.search(query)
                    .catch { _ in Just([]) }
            }
            .assign(to: &$results)
    }

    private func search(_ query: String) -> AnyPublisher<[Result], Never> {
        // Perform search
    }
}
```

## Custom Publishers

```swift
// ✅ Publisher for notifications
extension NotificationCenter {
    func publisher(for name: Notification.Name, object: AnyObject? = nil) -> NotificationCenter.Publisher {
        Publisher(center: self, name: name, object: object)
    }

    struct Publisher: Combine.Publisher {
        typealias Output = Notification
        typealias Failure = Never

        let center: NotificationCenter
        let name: Notification.Name
        let object: AnyObject?

        func receive<S>(subscriber: S) where S: Subscriber, Notification == S.Input, Never == S.Failure {
            let subscription = Subscription(
                subscriber: subscriber,
                center: center,
                name: name,
                object: object
            )
            subscriber.receive(subscription: subscription)
        }
    }
}

// Usage
NotificationCenter.default
    .publisher(for: UIApplication.didBecomeActiveNotification)
    .sink { notification in
        print("App became active")
    }
    .store(in: &cancellables)
```

## Memory Management

```swift
class ViewModel {
    private var cancellables = Set<AnyCancellable>()

    func setup() {
        // ✅ Store subscription
        publisher
            .sink { value in
                print(value)
            }
            .store(in: &cancellables)

        // ✅ Or use retain cycle
        var cancellable: AnyCancellable? = publisher
            .sink { value in
                print(value)
            }
        // cancellable = nil when done
    }
}
```

## Testing

```swift
func testPublisher_transformsValues() {
    let publisher = [1, 2, 3].publisher
    var results: [Int] = []

    publisher
        .map { $0 * 2 }
        .sink { results.append($0) }

    XCTAssertEqual(results, [2, 4, 6])
}
```

---

**Remember**: Combine is declarative. Describe your data flow chain, and let the framework handle execution.
