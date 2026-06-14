const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '../..');

function requestTools(serverPath) {
    return new Promise((resolve, reject) => {
        const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-mcp-'));
        const child = spawn(process.execPath, [path.join(ROOT, serverPath)], { cwd });
        const responses = new Map();
        let stdout = '';
        let stderr = '';

        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error(`MCP server timed out: ${stderr}`));
        }, 5000);

        child.stderr.on('data', chunk => {
            stderr += chunk;
        });

        child.stdout.on('data', chunk => {
            stdout += chunk;
            let newlineIndex;
            while ((newlineIndex = stdout.indexOf('\n')) !== -1) {
                const line = stdout.slice(0, newlineIndex);
                stdout = stdout.slice(newlineIndex + 1);
                if (!line.trim()) continue;

                const message = JSON.parse(line);
                responses.set(message.id, message);
                if (responses.has(1) && responses.has(2)) {
                    clearTimeout(timeout);
                    child.kill();
                    fs.rmSync(cwd, { recursive: true, force: true });
                    resolve(responses);
                }
            }
        });

        child.on('error', error => {
            clearTimeout(timeout);
            fs.rmSync(cwd, { recursive: true, force: true });
            reject(error);
        });

        child.stdin.write(`${JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-11-25',
                capabilities: {},
                clientInfo: { name: 'test-client', version: '1.0.0' }
            }
        })}\n`);
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);
    });
}

describe('Dependency-free MCP stdio servers', () => {
    const servers = [
        ['mcp-servers/mobile-memory/index.js', 'mobile-memory', 'memory-refresh'],
        ['mcp-servers/ios-memory/index.js', 'ios-memory', 'ios-refresh'],
        ['mcp-servers/kmp-context/index.js', 'kmp-context', 'kmp-refresh']
    ];

    for (const [serverPath, serverName, expectedTool] of servers) {
        it(`${serverName} completes initialization and exposes tools`, async () => {
            const responses = await requestTools(serverPath);
            assert.strictEqual(responses.get(1).result.serverInfo.name, serverName);
            assert.strictEqual(responses.get(1).result.protocolVersion, '2025-11-25');

            const toolNames = responses.get(2).result.tools.map(tool => tool.name);
            assert.ok(toolNames.includes(expectedTool));
        });
    }
});
