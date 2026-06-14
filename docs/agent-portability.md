# Agent Portability

The canonical implementation stays in `skills/`, `agents/`, `commands/`, `hooks/`, and `mcp-servers/`. Host-specific files are thin adapters, following the same approach as Ponytail.

## Support Matrix

| Host | Adapter | Skills/commands | MCP tools | Notes |
|---|---|---:|---:|---|
| Claude Code | `.claude-plugin/`, `hooks/`, `.mcp.json` | Full | Full | Native plugin install, subagents, slash commands, hooks, and tools. |
| Codex | `.codex-plugin/`, `.agents/plugins/marketplace.json` | Skills | Full | Hooks require user trust. Claude-only subagent definitions are not portable. |
| OpenCode | `AGENTS.md`, `opencode.json`, `.opencode/` | Host adapters | Full | Run from a checkout so relative MCP paths resolve. |
| Pi | `package.json#pi` | Skills and prompts | No automatic MCP install | Install as a Pi Git package. |
| Cursor | `.cursor/rules/`, `.cursor/mcp.json` | Rules | Full in this checkout | Copy the rule for use in another project. |
| Cline | `.clinerules/`, `.cline/mcp.json` | Rules | Full in this checkout | Cline also reads `AGENTS.md`. |
| Windsurf | `.windsurf/rules/` | Rules | Manual user config | Windsurf MCP config is user-level, so repository-relative installation is not portable. |
| GitHub Copilot | `.github/copilot-instructions.md` | Rules | Host-dependent | Repository instructions only. |
| Kiro | `.kiro/steering/` | Rules | Host-dependent | Copy globally or into the target project. |
| Aider/generic | `AGENTS.md` | Rules | Host-dependent | Read a specific `skills/*/SKILL.md` for detailed workflows. |

## Design Rules

- Do not add Claude-only `agents` or `commands` fields to `.claude-plugin/plugin.json`; Claude discovers the standard directories.
- Keep the shared install config in `.mcp.json`. Claude Code and Codex require that conventional plugin path.
- MCP server entrypoints must run from a clean checkout with Node.js only. Plugin installers do not install each server's npm dependencies.
- Keep copied compact rules aligned with `AGENTS.md` by running `npm run check:adapters`.
- Do not claim full subagent or slash-command parity on hosts that only support repository rules.

## Shared MCP Servers

The three servers use newline-delimited JSON-RPC over stdio and expose:

- `mobile-memory`: Android project structure, dependencies, architecture, and test state
- `ios-memory`: Xcode, SwiftUI, dependency, and iOS project context
- `kmp-context`: KMP modules, source sets, expect/actual declarations, and shared models

`tests/unit/mcp-stdio.test.js` launches each server, negotiates MCP `2025-11-25`, and verifies `tools/list` before release.
