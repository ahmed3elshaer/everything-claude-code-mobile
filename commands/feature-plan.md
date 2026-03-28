---
description: Plan a mobile feature with architecture decisions, file breakdown, dependency analysis, and test strategy. Produces a structured plan document reviewed by an architecture agent.
---

# Feature Plan Command

Phase 1 of the feature build pipeline. Creates a structured plan document and gets architecture review before implementation begins.

## Usage

```bash
/feature-plan Add user authentication with biometrics
/feature-plan Implement offline caching for articles
/feature-plan Add push notification handling
```

## Workflow

1. **Scan**: `feature-planner` agent analyzes the project structure, existing modules, and dependencies
2. **Plan**: Creates plan document at `.omc/plans/feature-{name}.json` with:
   - Module placement decisions
   - File breakdown per layer (domain, data, presentation, DI)
   - Dependency analysis (new libraries, version constraints)
   - Task list with execution order
   - Test strategy with coverage targets
3. **Review**: `mobile-architect` agent reviews the plan for:
   - Architecture pattern compliance (MVI/MVVM)
   - Module boundaries and dependency direction
   - API surface and interface design
   - Scalability and testability concerns
4. **Approve**: User is shown the plan summary and architecture review, then asked to approve or request changes

## Output

Plan document (`.omc/plans/feature-{name}.json`) containing:

- **modules**: Where new code lives, what existing modules are touched
- **files**: Every file to create or modify, grouped by layer
- **dependencies**: New libraries, version bumps, Gradle/SPM changes
- **tasks**: Ordered implementation tasks with agent assignments
- **testStrategy**: What to test, coverage targets per layer

## Examples

```bash
# Plan a new feature from scratch
/feature-plan Add biometric login with fallback to PIN

# Plan an enhancement to an existing feature
/feature-plan Add offline support to article feed

# Plan a cross-cutting concern
/feature-plan Add analytics tracking to all screens
```

## Invokes

- `feature-planner` agent
- `mobile-architect` agent
