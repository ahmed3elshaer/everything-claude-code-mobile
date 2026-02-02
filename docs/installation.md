# Installation Guide

## Prerequisites

- Claude Code CLI installed
- Android Studio (for Android development)
- JDK 17+
- Node.js 18+ (for scripts)

## Install from Plugin Marketplace

```bash
# Search for the plugin
/plugin marketplace search everything-claude-code-mobile

# Install the plugin
/plugin install ahmed3elshaer/everything-claude-code-mobile
```

## Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/ahmed3elshaer/everything-claude-code-mobile.git
cd everything-claude-code-mobile
```

2. Copy rules to Claude config:
```bash
cp -r rules/* ~/.claude/rules/
```

3. Copy agents (optional):
```bash
cp -r agents/* ~/.claude/agents/
```

## Project Setup

Add to your Android project's `CLAUDE.md`:

```markdown
# Project Configuration

## Stack
- Kotlin + Jetpack Compose
- MVI Architecture
- Koin for DI
- Ktor for networking

## Commands
- `/android-build` - Build project
- `/android-test` - Run tests
- `/mobile-tdd` - TDD workflow

## Rules
Use mobile patterns from everything-claude-code-mobile
```

## Verify Installation

```bash
# Check commands available
/help

# Test Android build
/android-build
```

## Next Steps

- [Android Setup Guide](./android-setup.md)
- [Architecture Guide](./architecture.md)
