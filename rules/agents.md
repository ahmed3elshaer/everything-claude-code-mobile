# Agent Delegation

## Build a Complete Feature

Use `/feature-build` to orchestrate all agents through a 7-phase pipeline:

```
/feature-build Add user authentication with biometrics
```

**Phases**: Plan → Implement → Test → Build Fix → Quality Gate → Verify → Learn

## When to Delegate

### Code Review
| Situation | Agent |
|-----------|-------|
| Android/Kotlin review | `android-reviewer` |
| iOS/Swift review | `ios-reviewer` |
| Security audit | `mobile-security-reviewer` |
| Performance review | `mobile-performance-reviewer` |

### Build & Fix
| Situation | Agent |
|-----------|-------|
| Gradle/AGP/R8 errors | `android-build-resolver` |
| Xcode/SPM/CocoaPods errors | `xcode-build-resolver` |
| Gradle optimization | `gradle-expert` |

### Architecture & Planning
| Situation | Agent |
|-----------|-------|
| Architecture decisions | `mobile-architect` |
| KMP shared module design | `kmp-architect` |
| Feature planning | `feature-planner` |
| Cross-platform models | `shared-model-designer` |

### UI & Design
| Situation | Agent |
|-----------|-------|
| Compose patterns | `compose-guide` |
| SwiftUI patterns | `swiftui-guide` |
| Material 3 Expressive | `m3-expressive-guide` |
| Apple Liquid Glass (iOS 26+) | `liquid-glass-guide` |

### Implementation (Layer Agents)
| Situation | Agent |
|-----------|-------|
| Domain models, use cases, DI | `architecture-impl` |
| API clients, DTOs, mappers | `network-impl` |
| Repositories, local DB, caching | `data-impl` |
| Screens, ViewModels, components | `ui-impl` |
| Navigation, DI wiring, integration | `wiring-impl` |

### Testing
| Situation | Agent |
|-----------|-------|
| TDD workflow (mandatory) | `mobile-tdd-guide` |
| E2E / instrumentation tests | `mobile-e2e-runner` |
| Unit tests (ViewModel, UseCase) | `unit-test-writer` |
| UI tests (Compose, SwiftUI) | `ui-test-writer` |
| Verification with pass@k | `mobile-verifier` |

### Learning & Quality
| Situation | Agent |
|-----------|-------|
| Extract codebase patterns | `mobile-pattern-extractor` |
| Context compaction | `mobile-compactor` |

## Guidelines
- Delegate complex, specialized tasks
- Provide context and constraints
- Review agent output
- Use `/feature-build` for end-to-end feature construction
- Layer agents run in dependency order: architecture → network + UI → data → wiring
