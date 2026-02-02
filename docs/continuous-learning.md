# Continuous Learning

## How It Works

The plugin learns from your coding sessions to become more helpful over time.

## Automatic Pattern Extraction

When you end a session (`Stop` event), the system:
1. Analyzes recent Kotlin changes
2. Detects patterns (Compose, MVI, Koin, etc.)
3. Stores as instincts with confidence scores
4. Reinforces patterns on repeated use

## Confidence Scoring

| Score | Meaning |
|-------|---------|
| 0.0-0.3 | Experimental |
| 0.3-0.6 | Validated |
| 0.6-0.8 | Established |
| 0.8-1.0 | Best practice |

## Commands

| Command | Purpose |
|---------|---------|
| `/learn` | Extract patterns now |
| `/instinct-status` | View learned patterns |
| `/instinct-export` | Export for sharing |
| `/instinct-import <file>` | Import from others |
| `/evolve` | Group into skills |

## Storage

Patterns saved to: `~/.claude/instincts/mobile-instincts.json`

## Sharing Patterns

```bash
# Export your learnings
/instinct-export my-patterns.json

# Share with team (e.g., via repo)
cp my-patterns.json team-shared-patterns.json

# Import team patterns
/instinct-import team-shared-patterns.json
```
