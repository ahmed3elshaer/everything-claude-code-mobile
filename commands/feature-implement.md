---
description: Implement a planned mobile feature using parallel specialized agents for network, data, architecture, UI, and wiring layers. Requires an approved feature plan.
---

# Feature Implement Command

Phase 2 of the feature build pipeline. Executes the approved plan using specialized agents running in dependency order.

## Usage

```bash
/feature-implement auth
/feature-implement offline-cache
/feature-implement push-notifications
```

## Prerequisite

An approved plan must exist at `.omc/plans/feature-{name}.json`. Run `/feature-plan` first.

## Execution Order (Dependency DAG)

```
Phase 1:  architecture-impl
              |
         ┌────┴────┐
Phase 2:  network    ui-impl
         -impl       |
           |         |
Phase 3:  data-impl  |
              |      |
         └────┬────┘
Phase 4:  wiring-impl
```

1. **architecture-impl** - Domain models, interfaces, DI module skeleton, shared contracts
2. **network-impl** + **ui-impl** (parallel) - API clients, DTOs, mappers / Compose screens, components, navigation
3. **data-impl** (after network) - Repository implementations, local DB, caching
4. **wiring-impl** (after all) - DI bindings, navigation wiring, feature flag integration

Each agent reads its assigned section from the plan document and writes only the files it owns.

## State

Progress tracked in `.omc/state/feature-{name}.json`:

```
architecture-impl:  completed
network-impl:       completed
ui-impl:            in-progress (3/5 files)
data-impl:          waiting
wiring-impl:        waiting
```

## Invokes

- `architecture-impl` agent
- `network-impl` agent
- `data-impl` agent
- `ui-impl` agent
- `wiring-impl` agent
