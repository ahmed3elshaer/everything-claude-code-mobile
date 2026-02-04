# iOS Swift Style

## Swift Language
- ✅ camelCase for variables, PascalCase for types
- ✅ `let` over `var` for immutability
- ✅ Structs over classes (value semantics)
- ✅ Explicit access control (private, fileprivate, internal)

## Optionals
- ✅ Safe unwrapping: `guard let`, `if let`, `??`
- ✅ Optional chaining: `?.`
- ❌ Minimize force unwrap `!`

## SwiftUI
- ✅ State hoisting (stateless views preferred)
- ✅ `@StateObject` for ownership
- ✅ `@ObservedObject` for observation
- ✅ `@EnvironmentObject` for app-wide state
- ✅ Previews for all views
- ❌ No side effects in body

## Concurrency
- ✅ `async/await` over completion handlers
- ✅ `MainActor` for UI updates
- ✅ `Task` for cancellable work
- ❌ No `DispatchQueue.main.async` (use MainActor)

## File Organization
- 📁 Files < 400 lines
- 📁 Functions < 50 lines
- 📁 Nesting < 4 levels
