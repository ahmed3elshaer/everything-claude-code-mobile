# Installation Guide

## Requirements

- Node.js 18 or newer for hooks and local MCP servers
- The platform toolchain needed by your project: Android Studio/JDK, Xcode, or both

The MCP servers are self-contained. Do not run `npm install` inside `mcp-servers/`.

## Claude Code

Run these commands inside Claude Code:

```text
/plugin marketplace add ahmed3elshaer/everything-claude-code-mobile
/plugin install everything-claude-code-mobile@everything-claude-code-mobile
/reload-plugins
```

Verify the installation:

```text
/plugin details everything-claude-code-mobile@everything-claude-code-mobile
/mcp
```

The plugin uses Claude Code's native directories:

- `agents/` for subagents
- `commands/` for slash commands
- `skills/` for Agent Skills
- `hooks/hooks.json` for lifecycle hooks
- `.mcp.json` for the three memory/context servers

Plugin skills and commands may appear with the `everything-claude-code-mobile:` namespace.

## Codex

```bash
codex plugin marketplace add ahmed3elshaer/everything-claude-code-mobile
codex plugin add everything-claude-code-mobile@everything-claude-code-mobile
codex plugin list --json
```

Open `/hooks` once to review and trust the bundled lifecycle hooks, then start a new thread so Codex loads the skills and MCP tools from the installed plugin.

## OpenCode

Clone the repository and run OpenCode from the checkout. `AGENTS.md` supplies the compact instructions and `opencode.json` registers the three MCP servers.

```bash
git clone https://github.com/ahmed3elshaer/everything-claude-code-mobile.git
cd everything-claude-code-mobile
opencode mcp list
opencode
```

## Pi

```bash
pi install git:github.com/ahmed3elshaer/everything-claude-code-mobile
```

Pi loads `skills/` and `commands/` from the `package.json#pi` manifest.

## Cursor, Windsurf, Cline, Copilot, Aider, and Kiro

These hosts do not share one plugin format. Use the matching adapter described in [Agent Portability](./agent-portability.md).

- Cursor and Cline include repository-local MCP configuration when this checkout is the active workspace.
- Windsurf requires adding the three stdio server entries to its user-level `mcp_config.json` with absolute paths to this checkout.
- Cursor, Windsurf, Cline, Copilot, Kiro, Aider, and other generic agents can use the compact copied rule or `AGENTS.md`.

## Local Validation

```bash
npm test
npm run lint:json
claude plugin validate . --strict
```

For a live Claude Code development check without installing a marketplace copy:

```bash
claude --plugin-dir .
```
