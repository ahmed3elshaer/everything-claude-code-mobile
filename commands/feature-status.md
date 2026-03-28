---
description: Show the current status of a feature build - which phase is active, what has completed, what remains, and any blockers.
---

# Feature Status Command

Progress tracker for feature builds. Reads state files and displays a summary of phase completion, agent status, and blockers.

## Usage

```bash
/feature-status auth            # Status of a specific feature
/feature-status                 # List all tracked features
```

## Reads

State file at `.omc/state/feature-{name}.json`.

## Output Example

```
Feature: auth
═════════════

Phase Progress:
  1. Plan          ████████████  completed
  2. Implement     ████████░░░░  in-progress
  3. Test          ░░░░░░░░░░░░  pending
  4. Build & Fix   ░░░░░░░░░░░░  pending
  5. Quality Gate  ░░░░░░░░░░░░  pending
  6. Verify        ░░░░░░░░░░░░  pending

Implementation Agents:
  architecture-impl:  completed  (4 files)
  network-impl:       completed  (3 files)
  ui-impl:            in-progress (3/5 files)
  data-impl:          waiting
  wiring-impl:        waiting

Files Created: 14 / ~22
Blockers: none
```

## List All Features

```
/feature-status

Tracked Features:
  auth              Phase 2/6  (Implement)   in-progress
  offline-cache     Phase 5/6  (Quality)     in-progress
  push-notifs       Phase 6/6  (Verify)      completed ✓
```

## No Agents Invoked

This command reads the state file directly without delegating to any agent.
