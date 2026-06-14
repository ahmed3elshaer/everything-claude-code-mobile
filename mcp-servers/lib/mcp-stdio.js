'use strict';

const SUPPORTED_PROTOCOL_VERSIONS = new Set([
    '2025-11-25',
    '2025-06-18',
    '2025-03-26',
    '2024-11-05'
]);

class StdioServerTransport {}

class Server {
    constructor(serverInfo, options = {}) {
        this.serverInfo = serverInfo;
        this.capabilities = options.capabilities || {};
        this.handlers = new Map();
        this.buffer = '';
    }

    setRequestHandler(method, handler) {
        this.handlers.set(method, handler);
    }

    async connect() {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => this.handleChunk(chunk));
        process.stdin.on('error', error => console.error(error));
        process.stdin.resume();
    }

    handleChunk(chunk) {
        this.buffer += chunk;

        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (line.trim()) {
                this.handleMessage(line);
            }
        }
    }

    async handleMessage(line) {
        let message;
        try {
            message = JSON.parse(line);
        } catch (error) {
            this.sendError(null, -32700, 'Parse error');
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(message, 'id')) {
            return;
        }

        try {
            const result = await this.dispatch(message);
            this.send({ jsonrpc: '2.0', id: message.id, result });
        } catch (error) {
            this.sendError(message.id, error.code || -32603, error.message || 'Internal error');
        }
    }

    async dispatch(message) {
        if (message.method === 'initialize') {
            const requestedVersion = message.params && message.params.protocolVersion;
            const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)
                ? requestedVersion
                : '2025-11-25';

            return {
                protocolVersion,
                capabilities: this.capabilities,
                serverInfo: this.serverInfo
            };
        }

        if (message.method === 'ping') {
            return {};
        }

        const handler = this.handlers.get(message.method);
        if (!handler) {
            const error = new Error(`Method not found: ${message.method}`);
            error.code = -32601;
            throw error;
        }

        return handler({ method: message.method, params: message.params || {} });
    }

    sendError(id, code, message) {
        this.send({ jsonrpc: '2.0', id, error: { code, message } });
    }

    send(message) {
        process.stdout.write(`${JSON.stringify(message)}\n`);
    }
}

module.exports = { Server, StdioServerTransport };
