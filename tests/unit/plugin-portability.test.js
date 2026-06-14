const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '../..');
const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));

describe('Plugin portability', () => {
    it('uses Claude native component discovery and a local marketplace source', () => {
        const plugin = readJson('.claude-plugin/plugin.json');
        const marketplace = readJson('.claude-plugin/marketplace.json');

        assert.strictEqual(plugin.name, 'everything-claude-code-mobile');
        assert.strictEqual(plugin.version, '1.2.0');
        assert.strictEqual(marketplace.plugins[0].source, './');
        assert.ok(fs.existsSync(path.join(ROOT, 'agents')));
        assert.ok(fs.existsSync(path.join(ROOT, 'commands')));
        assert.ok(fs.existsSync(path.join(ROOT, 'skills')));
        assert.ok(fs.existsSync(path.join(ROOT, 'hooks/hooks.json')));
        assert.ok(fs.existsSync(path.join(ROOT, '.mcp.json')));
    });

    it('provides a Codex manifest and Git-backed marketplace entry', () => {
        const plugin = readJson('.codex-plugin/plugin.json');
        const marketplace = readJson('.agents/plugins/marketplace.json');

        assert.strictEqual(plugin.skills, './skills/');
        assert.strictEqual(plugin.mcpServers, './.mcp.json');
        assert.strictEqual(marketplace.plugins[0].source.source, 'url');
        assert.match(marketplace.plugins[0].source.url, /everything-claude-code-mobile\.git$/);
        assert.strictEqual(marketplace.plugins[0].policy.installation, 'AVAILABLE');
    });

    it('registers all three MCP servers', () => {
        const config = readJson('.mcp.json');
        assert.deepStrictEqual(
            Object.keys(config.mcpServers).sort(),
            ['ios-memory', 'kmp-context', 'mobile-memory']
        );

        for (const server of Object.values(config.mcpServers)) {
            assert.strictEqual(server.command, 'node');
            assert.strictEqual(server.args[2], '${CLAUDE_PLUGIN_ROOT}');
            assert.match(server.args[1], /mcp-servers\/start\.js/);
            assert.match(server.args[1], /plugins','cache/);
        }
    });

    it('includes adapters for the same harness families as Ponytail', () => {
        const files = [
            'AGENTS.md',
            '.cursor/rules/everything-mobile.mdc',
            '.windsurf/rules/everything-mobile.md',
            '.clinerules/everything-mobile.md',
            '.github/copilot-instructions.md',
            '.kiro/steering/everything-mobile.md',
            'opencode.json'
        ];

        for (const file of files) {
            assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} should exist`);
        }

        const packageJson = readJson('package.json');
        assert.deepStrictEqual(packageJson.pi.skills, ['./skills']);
    });
});
