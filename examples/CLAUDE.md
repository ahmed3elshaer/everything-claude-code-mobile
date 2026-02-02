# Example CLAUDE.md for Android Project

Project-specific Claude Code configuration.

## Project Stack
- Kotlin 1.9.22
- Jetpack Compose with Material 3
- MVI Architecture
- Koin for DI
- Ktor for networking
- Room for local database

## Commands Available
- `/android-build` - Build project
- `/android-test` - Run tests
- `/android-review` - Code review
- `/mobile-tdd` - TDD workflow
- `/gradle-fix` - Fix Gradle issues

## Patterns to Follow
- State hoisting in Compose
- Immutable data classes
- Coroutines for async
- 80%+ test coverage

## Disabled MCPs
```json
{
  "disabledMcpServers": ["web-search", "github"]
}
```
