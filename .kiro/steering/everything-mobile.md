---
inclusion: always
---

# Everything Claude Code Mobile

Use this repository's mobile guidance for Android, iOS, and Kotlin Multiplatform work.

Before implementation:

1. Detect the project type from Gradle, Xcode, Swift Package, and KMP files.
2. Prefer native platform APIs and already-installed dependencies.
3. Load the relevant skill when the host supports Agent Skills.
4. State architecture assumptions before making broad changes.

Implementation rules:

- Keep changes scoped to the requested feature.
- Follow TDD for non-trivial behavior and run the platform's real build or test command.
- Use structured concurrency: Kotlin coroutines and Swift async/await.
- Preserve null safety and avoid force unwraps unless an invariant is explicit.
- Keep secrets out of source control and logs.
- Respect accessibility, lifecycle, and offline behavior where applicable.

Useful workflows:

- Feature delivery: `feature-builder` skill or `/feature-build` in Claude Code.
- Android review: `android-patterns`, `jetpack-compose`, and `mobile-testing`.
- iOS review: `swift-patterns`, `swiftui-patterns`, and `ios-testing`.
- KMP review: `expect-actual`, `shared-coroutines`, and `kmp-repositories`.
- Persistent context: use the `mobile-memory`, `ios-memory`, and `kmp-context` MCP tools when available.

Hosts without skills or subagents should treat this file as the compact fallback and read the relevant file under `skills/` for detailed guidance.
