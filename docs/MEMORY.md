# Project Memory

## 2026-06-14: Cross-Harness Plugin Packaging

- Claude Code discovers `agents/`, `commands/`, `skills/`, `hooks/hooks.json`, and `.mcp.json` from standard plugin locations. The Claude manifest should remain minimal instead of listing unsupported `agents` or `commands` fields.
- The Claude marketplace name is `everything-claude-code-mobile`, so the install selector is `everything-claude-code-mobile@everything-claude-code-mobile`, not `@ahmed3elshaer`.
- Codex needs its own `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json`. It reuses the root skills, hooks, and `.mcp.json`.
- Plugin installation does not run `npm install` inside each MCP server. The three servers therefore use the dependency-free shared transport in `mcp-servers/lib/mcp-stdio.js`.
- Codex CLI 0.140.0 does not interpolate `${CLAUDE_PLUGIN_ROOT}` in MCP arguments and strips `CODEX_HOME` from MCP processes. `.mcp.json` passes the root explicitly for Claude and derives the active Codex home from its generated `PATH` entry before reading the native plugin cache.
- Portability is capability-based: Claude has the full subagent/command surface, Codex has skills/hooks/MCP, and rule-only hosts use thin adapters derived from `AGENTS.md`.
- Run `npm run check:adapters` after changing `AGENTS.md`, and keep live MCP handshake coverage in `tests/unit/mcp-stdio.test.js`.
