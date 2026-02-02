# Everything Claude Code Mobile

[![Stars](https://img.shields.io/github/stars/affaan-m/everything-claude-code-mobile?style=flat)](https://github.com/affaan-m/everything-claude-code-mobile/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Kotlin](https://img.shields.io/badge/-Kotlin-7F52FF?logo=kotlin&logoColor=white)
![Compose](https://img.shields.io/badge/-Jetpack%20Compose-4285F4?logo=jetpackcompose&logoColor=white)
![Android](https://img.shields.io/badge/-Android-3DDC84?logo=android&logoColor=white)
![Swift](https://img.shields.io/badge/-Swift-FA7343?logo=swift&logoColor=white)

---

**The complete collection of Claude Code configs for mobile development.**

Production-ready agents, skills, hooks, commands, and rules specifically designed for **Android**, **iOS**, and **Kotlin Multiplatform** development.

> 📱 **Mobile companion to [everything-claude-code](https://github.com/affaan-m/everything-claude-code)**

---

## 🚀 Quick Start

### Step 1: Install the Plugin

```bash
# Add marketplace
/plugin marketplace add affaan-m/everything-claude-code-mobile

# Install plugin
/plugin install everything-claude-code-mobile@everything-claude-code-mobile
```

### Step 2: Install Rules (Required)

```bash
# Clone the repo first
git clone https://github.com/affaan-m/everything-claude-code-mobile.git

# Copy rules (applies to all projects)
cp -r everything-claude-code-mobile/rules/* ~/.claude/rules/
```

### Step 3: Start Using

```bash
# Build Android project
/android-build

# Fix Gradle issues
/gradle-fix

# TDD workflow for mobile
/mobile-tdd

# Check available commands
/plugin list everything-claude-code-mobile@everything-claude-code-mobile
```

---

## 📦 What's Inside

```
everything-claude-code-mobile/
├── agents/           # Mobile-specialized subagents
│   ├── android-reviewer.md       # Android code review
│   ├── android-build-resolver.md # Gradle/AGP error resolution
│   ├── compose-guide.md          # Jetpack Compose patterns
│   ├── mobile-architect.md       # MVI/Clean Architecture
│   ├── mobile-tdd-guide.md       # Android TDD workflow
│   └── ...
│
├── skills/           # Mobile patterns and workflows
│   ├── android-patterns/         # Android idioms, coroutines
│   ├── jetpack-compose/          # Compose state, theming
│   ├── mvi-architecture/         # MVI with Koin/Ktor
│   ├── mobile-testing/           # Espresso, JUnit5, Mockk
│   ├── continuous-learning/      # Pattern extraction (mobile)
│   └── ...
│
├── commands/         # Slash commands
│   ├── android-build.md          # /android-build
│   ├── gradle-fix.md             # /gradle-fix
│   ├── mobile-tdd.md             # /mobile-tdd
│   ├── compose-preview.md        # /compose-preview
│   └── ...
│
├── rules/            # Always-follow guidelines
│   ├── android-style.md          # Kotlin/Compose conventions
│   ├── mobile-security.md        # No hardcoded secrets
│   ├── mobile-testing.md         # 80% coverage, TDD
│   └── ...
│
├── hooks/            # Trigger-based automations
│   └── hooks.json                # Mobile-specific hooks
│
└── contexts/         # Dynamic context injection
    ├── android-dev.md            # Android development mode
    └── compose-dev.md            # Compose-focused mode
```

---

## 🎯 Tech Stack Focus

This plugin is optimized for:

| Category | Technologies |
|----------|--------------|
| **Language** | Kotlin, Swift |
| **UI** | Jetpack Compose, SwiftUI |
| **Architecture** | MVI, Clean Architecture |
| **DI** | Koin |
| **Networking** | Ktor Client |
| **Async** | Kotlin Coroutines, Flow |
| **Testing** | JUnit5, Mockk, Espresso, Compose Testing |
| **Build** | Gradle (KTS), Xcode |
| **Style** | Functional programming, immutability |

---

## 🛠️ Key Commands

### Build & Fix

| Command | Description |
|---------|-------------|
| `/android-build` | Build Android project, fix errors |
| `/gradle-fix` | Resolve Gradle sync/dependency issues |
| `/compose-preview` | Verify Compose previews compile |
| `/lint-android` | Run Detekt, ktlint, Android Lint |

### Testing

| Command | Description |
|---------|-------------|
| `/mobile-tdd` | TDD workflow for Android |
| `/android-test` | Run unit and instrumentation tests |
| `/compose-test` | Run Compose UI tests with Espresso |

### Planning & Review

| Command | Description |
|---------|-------------|
| `/mobile-plan` | Plan mobile feature implementation |
| `/android-review` | Android-specific code review |

### Learning

| Command | Description |
|---------|-------------|
| `/learn` | Extract patterns from session |
| `/instinct-status` | View learned mobile patterns |
| `/evolve` | Cluster instincts into skills |

---

## 🧪 Agent Specializations

| Agent | When to Use |
|-------|-------------|
| **android-reviewer** | Code review for Kotlin/Compose code |
| **android-build-resolver** | Gradle, AGP, R8/ProGuard errors |
| **compose-guide** | Compose patterns, recomposition |
| **mobile-architect** | Architecture decisions (MVI/Clean) |
| **mobile-tdd-guide** | Test-driven development |
| **mobile-security-reviewer** | Security audit for mobile |
| **mobile-performance-reviewer** | Startup, memory, rendering |

---

## 📋 Rules Enforced

- **80% test coverage** minimum
- **TDD workflow** mandatory
- **No hardcoded secrets** (use BuildConfig/local.properties)
- **Functional patterns** (immutability, pure functions)
- **Compose best practices** (state hoisting, stable types)
- **Coroutine conventions** (structured concurrency)

---

## 🧠 Continuous Learning

Like the original, this plugin supports pattern extraction:

```bash
/learn                  # Extract patterns mid-session
/instinct-status        # Show learned mobile instincts
/instinct-export        # Export for sharing
/evolve                 # Cluster into reusable skills
```

Mobile-specific patterns learned include:
- Compose recomposition optimizations
- ViewModel/Repository patterns
- Koin module organization
- Ktor client configuration
- Espresso test patterns

---

## 🤝 Contributing

Contributions welcome! Areas needed:

- iOS/SwiftUI patterns
- Kotlin Multiplatform skills
- Additional testing frameworks
- CI/CD configurations (Fastlane, GitHub Actions)
- App Store/Play Store guidelines

---

## 📄 License

MIT - Use freely, modify as needed, contribute back if you can.

---

**Built for mobile developers who ship quality apps with Claude Code.**
