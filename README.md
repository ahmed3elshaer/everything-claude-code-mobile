# Everything AI Code Mobile

[![Stars](https://img.shields.io/github/stars/ahmed3elshaer/everything-claude-code-mobile?style=flat)](https://github.com/ahmed3elshaer/everything-claude-code-mobile/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Kotlin](https://img.shields.io/badge/-Kotlin-7F52FF?logo=kotlin&logoColor=white)
![Compose](https://img.shields.io/badge/-Jetpack%20Compose-4285F4?logo=jetpackcompose&logoColor=white)
![Android](https://img.shields.io/badge/-Android-3DDC84?logo=android&logoColor=white)
![Swift](https://img.shields.io/badge/-Swift-FA7343?logo=swift&logoColor=white)
![SwiftUI](https://img.shields.io/badge/-SwiftUI-0D96F6?logo=swift&logoColor=white)
![KMP](https://img.shields.io/badge/-Kotlin%20Multiplatform-7F52FF?logo=kotlin&logoColor=white)

---

**A portable mobile development toolkit for Claude Code, Codex, and other coding agents.**

27 agents, 46 skills, 35 commands, and 3 MCP servers for **Android**, **iOS**, and **Kotlin Multiplatform** development. Includes an end-to-end feature builder that plans, implements, tests, and reviews entire features automatically.

> Mobile companion to [everything-claude-code](https://github.com/ahmed3elshaer/everything-claude-code)

---

## Quick Start

### Step 1: Install the Plugin

```bash
# Add marketplace
/plugin marketplace add ahmed3elshaer/everything-claude-code-mobile

# Install plugin
/plugin install everything-claude-code-mobile@everything-claude-code-mobile

# Load skills, hooks, agents, commands, and MCP tools
/reload-plugins
```

### Step 2: Verify the Plugin

```bash
/plugin details everything-claude-code-mobile@everything-claude-code-mobile
/mcp
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

# Check the installed plugin
/plugin details everything-claude-code-mobile@everything-claude-code-mobile
```

### Codex

```bash
codex plugin marketplace add ahmed3elshaer/everything-claude-code-mobile
codex plugin add everything-claude-code-mobile@everything-claude-code-mobile
codex plugin list --json
```

Review the bundled hooks with `/hooks`, then start a new thread. See [Agent Portability](docs/agent-portability.md) for OpenCode, Pi, Cursor, Windsurf, Cline, Copilot, Aider, and Kiro.

---

## Supported Coding Tools

The repository follows the same portable adapter approach as [Ponytail](https://github.com/DietrichGebert/ponytail): one canonical toolkit with small host-specific manifests and rule files.

| Tool | Integration | MCP tools | Notes |
|------|-------------|:---------:|-------|
| **Claude Code** | Native plugin | Yes | Full agents, skills, commands, hooks, and MCP support |
| **OpenAI Codex** | Native plugin | Yes | Skills, trusted hooks, and MCP support |
| **OpenCode** | `AGENTS.md`, config, agents, commands, and skills | Yes | Uses project adapters with absolute MCP paths to the toolkit checkout |
| **Cursor** | Project rules, skills, and MCP config | Yes | Uses `.cursor/rules/`, `.cursor/skills/`, and `.cursor/mcp.json` |
| **Cline** | Project rules, skills, and MCP config | Yes | Uses `.clinerules/`, `.cline/skills/`, and `.cline/mcp.json` |
| **Pi** | Git package | Manual | Loads skills and prompts through `package.json#pi` |
| **Windsurf** | Workspace rules and skills | Manual | MCP servers require user-level configuration with absolute paths |
| **GitHub Copilot** | Repository instructions | Host-dependent | Uses `.github/copilot-instructions.md` |
| **Kiro** | Steering rules and skills | Host-dependent | Uses `.kiro/steering/` and `.kiro/skills/` |
| **Aider and other agents** | `AGENTS.md` | Host-dependent | Can read the shared rules and individual `SKILL.md` files |

See [Installation](docs/installation.md) for setup commands and [Agent Portability](docs/agent-portability.md) for exact capability differences.

## Setup for Other Tools

Tools without native marketplace support use a shared local checkout. Clone it once, then replace `/absolute/path/to/everything-claude-code-mobile` below with the checkout path.

Node.js 18 or newer must be available to the host for the local MCP servers.

```bash
git clone https://github.com/ahmed3elshaer/everything-claude-code-mobile.git ~/.everything-claude-code-mobile
export EVERYTHING_MOBILE_HOME="$HOME/.everything-claude-code-mobile"
```

Run the remaining commands from the mobile project where you want to use the toolkit.

The commands below assume the destination files do not already exist. Merge with existing rules, skills, and MCP configuration instead of replacing project-specific setup.

### OpenCode

Copy the OpenCode agents, commands, and skills into the project:

```bash
mkdir -p .opencode
cp -R "$EVERYTHING_MOBILE_HOME/.opencode/." .opencode/
```

Merge the following into the project's `opencode.json`. OpenCode uses the shared instructions and starts all three MCP servers from the toolkit checkout.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "/absolute/path/to/everything-claude-code-mobile/AGENTS.md"
  ],
  "mcp": {
    "mobile-memory": {
      "type": "local",
      "command": ["node", "/absolute/path/to/everything-claude-code-mobile/mcp-servers/mobile-memory/index.js"],
      "enabled": true
    },
    "ios-memory": {
      "type": "local",
      "command": ["node", "/absolute/path/to/everything-claude-code-mobile/mcp-servers/ios-memory/index.js"],
      "enabled": true
    },
    "kmp-context": {
      "type": "local",
      "command": ["node", "/absolute/path/to/everything-claude-code-mobile/mcp-servers/kmp-context/index.js"],
      "enabled": true
    }
  }
}
```

```bash
opencode mcp list
opencode
```

### Pi

Pi reads the `skills/` and `commands/` directories through the package manifest:

```bash
pi install git:github.com/ahmed3elshaer/everything-claude-code-mobile
pi
```

### Cursor

Install the rule and skills into the current project:

```bash
mkdir -p .cursor/rules .cursor/skills
cp "$EVERYTHING_MOBILE_HOME/.cursor/rules/everything-mobile.mdc" .cursor/rules/
cp -R "$EVERYTHING_MOBILE_HOME/skills/." .cursor/skills/
```

For MCP tools, merge the [shared MCP configuration](#shared-mcp-configuration) into `.cursor/mcp.json`, then reload the Cursor window.

### Cline

Install the rule and skills into the current project:

```bash
mkdir -p .clinerules .cline/skills
cp "$EVERYTHING_MOBILE_HOME/.clinerules/everything-mobile.md" .clinerules/
cp -R "$EVERYTHING_MOBILE_HOME/skills/." .cline/skills/
```

Enable **Skills** in Cline's feature settings. Merge the [shared MCP configuration](#shared-mcp-configuration) into `.cline/mcp.json`, then verify the servers in Cline's MCP panel or with `cline mcp`.

### Windsurf

Install the workspace rule and skills:

```bash
mkdir -p .windsurf/rules .windsurf/skills
cp "$EVERYTHING_MOBILE_HOME/.windsurf/rules/everything-mobile.md" .windsurf/rules/
cp -R "$EVERYTHING_MOBILE_HOME/skills/." .windsurf/skills/
```

Open **Cascade > MCPs > Configure**, edit the raw `mcp_config.json`, and merge the [shared MCP configuration](#shared-mcp-configuration). Windsurf stores MCP configuration at user scope, so the server paths must be absolute.

### GitHub Copilot

Copy the repository instructions into the mobile project:

```bash
mkdir -p .github
cp "$EVERYTHING_MOBILE_HOME/.github/copilot-instructions.md" .github/copilot-instructions.md
```

Copilot loads the file automatically for repository-scoped chat, coding agent, and code review surfaces that support custom instructions.

### Kiro

Install the steering rule and skills into the current workspace:

```bash
mkdir -p .kiro/steering .kiro/skills
cp "$EVERYTHING_MOBILE_HOME/.kiro/steering/everything-mobile.md" .kiro/steering/
cp -R "$EVERYTHING_MOBILE_HOME/skills/." .kiro/skills/
```

Kiro discovers both directories automatically. You can also import individual skill folders from the repository through **Agent Steering & Skills**.

### Aider

Load the compact rules as a read-only conventions file:

```bash
cd /path/to/your/mobile-project
aider --read "$EVERYTHING_MOBILE_HOME/AGENTS.md"
```

Add a relevant `skills/<name>/SKILL.md` with another `--read` option when you need a detailed workflow.

### Shared MCP Configuration

Cursor, Cline, and Windsurf use the same stdio server definitions. Merge this object into the host's MCP configuration and replace the checkout path:

```json
{
  "mcpServers": {
    "mobile-memory": {
      "command": "node",
      "args": ["/absolute/path/to/everything-claude-code-mobile/mcp-servers/mobile-memory/index.js"]
    },
    "ios-memory": {
      "command": "node",
      "args": ["/absolute/path/to/everything-claude-code-mobile/mcp-servers/ios-memory/index.js"]
    },
    "kmp-context": {
      "command": "node",
      "args": ["/absolute/path/to/everything-claude-code-mobile/mcp-servers/kmp-context/index.js"]
    }
  }
}
```

Restart the host after changing MCP configuration, then confirm that `mobile-memory`, `ios-memory`, and `kmp-context` appear in its tools list.

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

**Built for mobile developers using Claude Code, Codex, Cursor, OpenCode, and other coding agents.**
