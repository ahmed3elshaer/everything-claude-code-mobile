# Everything Claude Code Mobile

[![Stars](https://img.shields.io/github/stars/ahmed3elshaer/everything-claude-code-mobile?style=flat)](https://github.com/ahmed3elshaer/everything-claude-code-mobile/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Kotlin](https://img.shields.io/badge/-Kotlin-7F52FF?logo=kotlin&logoColor=white)
![Compose](https://img.shields.io/badge/-Jetpack%20Compose-4285F4?logo=jetpackcompose&logoColor=white)
![Android](https://img.shields.io/badge/-Android-3DDC84?logo=android&logoColor=white)
![Swift](https://img.shields.io/badge/-Swift-FA7343?logo=swift&logoColor=white)
![SwiftUI](https://img.shields.io/badge/-SwiftUI-0D96F6?logo=swift&logoColor=white)
![KMP](https://img.shields.io/badge/-Kotlin%20Multiplatform-7F52FF?logo=kotlin&logoColor=white)

---

**The complete collection of Claude Code configs for mobile development.**

27 agents, 48 skills, 35 commands, and 3 MCP servers for **Android**, **iOS**, and **Kotlin Multiplatform** development. Includes an end-to-end feature builder that plans, implements, tests, and reviews entire features automatically.

> Mobile companion to [everything-claude-code](https://github.com/ahmed3elshaer/everything-claude-code)

---

## Quick Start

### Step 1: Install the Plugin

```bash
# Add marketplace
/plugin marketplace add ahmed3elshaer/everything-claude-code-mobile

# Install plugin
/plugin install everything-claude-code-mobile@ahmed3elshaer
```

### Step 2: Install Rules (Required)

```bash
# Clone the repo first
git clone https://github.com/ahmed3elshaer/everything-claude-code-mobile.git

# Copy rules (applies to all projects)
cp -r everything-claude-code-mobile/rules/* ~/.claude/rules/
```

### Step 3: Start Using

```bash
# Build a complete feature end-to-end
/feature-build Add user authentication with biometrics

# Build Android project
/android-build

# Fix Gradle issues
/gradle-fix

# TDD workflow
/mobile-tdd

# Check all commands
/plugin list everything-claude-code-mobile@ahmed3elshaer
```

---

## Feature Builder Pipeline

The standout capability of this plugin. `/feature-build` orchestrates specialized agents through 7 phases to build a complete feature from a single description:

```bash
/feature-build Add push notification support
/feature-build --platform=android Implement offline caching
/feature-build --platform=kmp Add offline sync for user data
```

### Phases

| # | Phase | What Happens |
|---|-------|--------------|
| 1 | **Plan** | `feature-planner` + `mobile-architect` analyze your project and create a structured implementation plan |
| 2 | **Implement** | 5 layer agents run in dependency order (architecture -> network + UI -> data -> wiring) |
| 3 | **Test** | `unit-test-writer` + `ui-test-writer` create tests with 80% coverage target |
| 4 | **Build Fix** | Compile and fix errors iteratively |
| 5 | **Quality Gate** | Parallel code review + security audit + performance review |
| 6 | **Verify** | `mobile-verifier` runs pass@k metrics and coverage sign-off |
| 7 | **Learn** | Pattern extraction and instinct updates |

### Implementation Agent DAG

```
Phase 1:  architecture-impl    (domain models, interfaces, DI skeleton)
               |
          +----+----+
Phase 2:  network   ui-impl    (API clients, DTOs / Compose screens, components)
          -impl      |
            |        |
Phase 3:  data-impl  |         (repositories, local DB, caching)
               |     |
          +----+----+
Phase 4:  wiring-impl          (DI bindings, navigation, feature flags)
```

### Feature Commands

| Command | Description |
|---------|-------------|
| `/feature-build` | End-to-end feature construction (all 7 phases) |
| `/feature-plan` | Plan architecture, files, deps, and test strategy |
| `/feature-implement` | Execute plan with parallel layer agents |
| `/feature-test` | Create unit, UI, and E2E tests |
| `/feature-build-fix` | Compile and fix build errors |
| `/feature-quality-gate` | Code review + security + performance audit |
| `/feature-status` | Show current feature build progress |
| `/feature-learn` | Extract patterns from completed feature |

---

## What's Inside

```
everything-claude-code-mobile/
├── agents/           # 27 specialized agents
│   ├── Code Review:    android-reviewer, ios-reviewer
│   ├── Build:          android-build-resolver, xcode-build-resolver, gradle-expert
│   ├── Architecture:   mobile-architect, kmp-architect, feature-planner, shared-model-designer
│   ├── UI/Design:      compose-guide, swiftui-guide, m3-expressive-guide, liquid-glass-guide
│   ├── Implementation: architecture-impl, network-impl, data-impl, ui-impl, wiring-impl
│   ├── Testing:        mobile-tdd-guide, mobile-e2e-runner, unit-test-writer, ui-test-writer, mobile-verifier
│   └── Learning:       mobile-pattern-extractor, mobile-compactor
│
├── skills/           # 48 platform skills
│   ├── Android:      android-patterns, jetpack-compose, navigation-compose, coroutines-patterns,
│   │                 koin-patterns, room-patterns, gradle-patterns, m3-expressive
│   ├── iOS:          swift-patterns, swiftui-patterns, combine-framework, core-data,
│   │                 ios-testing, liquid-glass
│   ├── KMP:          kmp-di, kmp-navigation, kmp-networking, kmp-repositories,
│   │                 expect-actual, shared-coroutines, shared-models, sqldelight-patterns
│   ├── Architecture: mvi-architecture, feature-builder, mobile-testing, mobile-security
│   ├── Features:     deep-linking, feature-flags, offline-first, pagination-patterns,
│   │                 push-notifications, image-loading, localization-patterns,
│   │                 analytics-patterns, app-lifecycle, accessibility-patterns, ktor-patterns
│   └── Learning:     continuous-learning, continuous-learning-v2, mobile-instinct-v1,
│                     mobile-instinct-v2, mobile-checkpoint, mobile-compaction, mobile-memory
│
├── commands/         # 35 slash commands
├── rules/            # 5 always-enforced rules
├── contexts/         # 7 dynamic context files
├── hooks/            # Auto-triggered checks and pattern extraction
└── mcp-servers/      # 3 persistent memory servers
```

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Language** | Kotlin, Swift |
| **UI** | Jetpack Compose, SwiftUI, UIKit (legacy) |
| **Design Systems** | Material 3 Expressive, Apple Liquid Glass |
| **Architecture** | MVI, Clean Architecture, MVVM |
| **DI** | Koin (Android), Environment Objects (iOS), Koin Multiplatform (KMP) |
| **Networking** | Ktor Client (Android/KMP), URLSession + async/await (iOS) |
| **Database** | Room (Android), CoreData/SwiftData (iOS), SQLDelight (KMP) |
| **Async** | Kotlin Coroutines + Flow, Swift Concurrency (async/await) |
| **Testing** | JUnit5, Mockk, Turbine, Kotest, Espresso (Android); XCTest (iOS) |
| **Build** | Gradle (KTS), Xcode, SPM, CocoaPods |

---

## Commands

### Build & Fix

| Command | Description |
|---------|-------------|
| `/android-build` | Build Android project, fix errors, generate APK/AAB |
| `/ios-build` | Build iOS project with Xcode |
| `/kmp-build` | Build Kotlin Multiplatform project |
| `/gradle-fix` | Resolve Gradle sync/dependency issues |
| `/kmp-dependency-fix` | Fix KMP dependency conflicts |
| `/compose-preview` | Verify Compose previews compile |
| `/lint-android` | Run Detekt, ktlint, Android Lint |
| `/swiftlint` | Run SwiftLint for iOS code style |
| `/release-build` | Build release/production versions |
| `/mobile-build` | Generic mobile build command |

### Testing

| Command | Description |
|---------|-------------|
| `/mobile-tdd` | TDD workflow (RED -> GREEN -> REFACTOR) |
| `/android-test` | Run Android unit and instrumentation tests |
| `/ios-test` | Run iOS unit and UI tests |
| `/kmp-test` | Run KMP shared tests |
| `/compose-test` | Run Compose UI tests with Espresso |
| `/mobile-test` | Run mobile tests (unit + UI) |
| `/mobile-verify` | Verify implementation against specs |

### Planning & Review

| Command | Description |
|---------|-------------|
| `/mobile-plan` | Plan mobile feature implementation |
| `/android-review` | Android-specific code review |
| `/platform-info` | Show detected platform (Android/iOS/KMP) |

### Learning

| Command | Description |
|---------|-------------|
| `/learn` | Extract patterns from current session |
| `/instinct-status` | View learned mobile patterns |
| `/instinct-export` | Export patterns for sharing |
| `/instinct-import` | Import patterns from external sources |
| `/evolve` | Cluster instincts into reusable skills |

---

## Agents (27)

### Code Review

| Agent | When to Use |
|-------|-------------|
| `android-reviewer` | Kotlin/Compose code review, Google best practices |
| `ios-reviewer` | Swift/SwiftUI code review, Apple best practices |
| `mobile-security-reviewer` | Security audit: secrets, encryption, network, storage |
| `mobile-performance-reviewer` | Startup time, memory, rendering, battery |

### Build & Compilation

| Agent | When to Use |
|-------|-------------|
| `android-build-resolver` | Gradle sync, AGP, R8/ProGuard, dependency conflicts |
| `xcode-build-resolver` | Xcode, SPM, code signing, CocoaPods, simulator errors |
| `gradle-expert` | Gradle optimization, Version Catalogs, convention plugins |

### Architecture & Planning

| Agent | When to Use |
|-------|-------------|
| `mobile-architect` | MVI, Clean Architecture, modularization |
| `kmp-architect` | KMP shared modules, expect/actual, cross-platform DI |
| `feature-planner` | Feature planning with architecture review |
| `shared-model-designer` | Cross-platform data models with @ObjCName |

### UI & Design

| Agent | When to Use |
|-------|-------------|
| `compose-guide` | Compose state, recomposition, theming, animations |
| `swiftui-guide` | SwiftUI state, view optimization, theming |
| `m3-expressive-guide` | Material 3 Expressive: spring animations, shape morphing, 28 components |
| `liquid-glass-guide` | Apple Liquid Glass for SwiftUI (iOS 26+) |

### Implementation (Layer Agents)

These agents are orchestrated by `/feature-implement` and run in dependency order:

| Agent | Layer | What It Creates |
|-------|-------|----------------|
| `architecture-impl` | Domain | Use cases, domain models, repository interfaces, DI modules |
| `network-impl` | Network | API clients, DTOs, request/response models (Ktor / URLSession) |
| `data-impl` | Data | Repositories, local storage, caching (Room / CoreData / SQLDelight) |
| `ui-impl` | Presentation | Screens, ViewModels, state management (Compose / SwiftUI) |
| `wiring-impl` | Integration | Navigation, DI registration, manifest entries, feature flags |

### Testing

| Agent | When to Use |
|-------|-------------|
| `mobile-tdd-guide` | TDD enforcement (mandatory for new features) |
| `mobile-e2e-runner` | Espresso E2E tests, UI automation |
| `unit-test-writer` | ViewModel, UseCase, Repository tests (JUnit5 + Mockk + Turbine) |
| `ui-test-writer` | Compose UI tests, SwiftUI tests, accessibility testing |
| `mobile-verifier` | Automated verification loops with pass@k metrics |

### Learning & Quality

| Agent | When to Use |
|-------|-------------|
| `mobile-pattern-extractor` | Analyze codebase for reusable patterns |
| `mobile-compactor` | Strategic context compaction for token optimization |

---

## Rules Enforced

These rules are always active and apply to all projects:

- **80% test coverage** minimum on all code
- **TDD workflow** mandatory (RED -> GREEN -> REFACTOR)
- **No hardcoded secrets** (use BuildConfig/local.properties on Android, Keychain on iOS)
- **Immutability first** (`val`/`let`, immutable collections, data classes with `copy()`)
- **Null safety** (safe calls, Elvis operator, minimize `!!`/force unwrap)
- **Compose/SwiftUI best practices** (state hoisting, no side effects in composition/body)
- **HTTPS only** with certificate pinning in production
- **Structured concurrency** (Coroutines/async-await, no GlobalScope/DispatchQueue.main.async)
- **Files < 400 lines, functions < 50 lines, nesting < 4 levels**

---

## MCP Servers

Three persistent memory servers maintain context across sessions:

| Server | Purpose |
|--------|---------|
| `mobile-memory` | Project structure, dependencies, architecture, test state |
| `ios-memory` | iOS project state, SwiftUI components, XCTest patterns |
| `kmp-context` | KMP module structure, expect/actual patterns, shared models |

---

## Contexts

Dynamic context files are injected based on your project type:

| Context | When Active |
|---------|-------------|
| `android-dev` | Android project detected (Kotlin, Gradle, Compose) |
| `ios-dev` | iOS project detected (Swift, Xcode, SwiftUI) |
| `kmp-dev` | KMP project detected (shared module, multiplatform) |
| `compose-dev` | Jetpack Compose code being edited |
| `swiftui-dev` | SwiftUI code being edited |
| `uikit-dev` | UIKit (legacy) code being edited |
| `mobile-memory-context` | Persistent memory system active |

---

## Hooks

Automated checks trigger on specific events:

### Android Hooks
- **Anti-pattern detection**: Flags `GlobalScope`, `!!`, `runBlocking` in Kotlin files
- **TDD reminders**: Prompts for test file when creating ViewModels
- **Pattern extraction**: Learns from sessions at exit

### iOS Hooks
- **Anti-pattern detection**: Flags force unwrap `!`, `DispatchQueue.main.async` in Swift files
- **Preview reminders**: Prompts for `#Preview` when editing `ContentView.swift`
- **Dependency reminders**: Prompts `pod install` after Podfile changes, package resolution after `Package.swift` changes

---

## Continuous Learning

The plugin learns from your development patterns and improves over time:

```bash
/learn                  # Extract patterns from current session
/instinct-status        # View learned mobile patterns
/instinct-export        # Export patterns for sharing
/instinct-import        # Import patterns from external sources
/evolve                 # Cluster instincts into reusable skills
```

Patterns learned include:
- Compose recomposition optimizations
- ViewModel/Repository patterns
- Koin module organization
- Ktor client configuration
- SwiftUI state management idioms
- KMP expect/actual patterns
- Test patterns per framework

---

## Contributing

Contributions welcome! Areas needed:

- Additional platform-specific patterns
- CI/CD configurations (Fastlane, GitHub Actions)
- App Store/Play Store guidelines
- Accessibility testing commands
- Device farm integrations

---

## License

MIT - Use freely, modify as needed, contribute back if you can.

---

**Built for mobile developers who ship quality apps with Claude Code.**
