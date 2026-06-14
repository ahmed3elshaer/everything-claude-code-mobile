#!/usr/bin/env node

const path = require('path');

const servers = {
    'mobile-memory': ['mobile-memory', 'MobileMemoryServer'],
    'ios-memory': ['ios-memory', 'IOSMemoryServer'],
    'kmp-context': ['kmp-context', 'KMPContextServer']
};

const serverName = process.argv[2];
const entry = servers[serverName];

if (!entry) {
    console.error(`Unknown MCP server: ${serverName || '<missing>'}`);
    process.exit(1);
}

const [directory, exportName] = entry;
const Server = require(path.join(__dirname, directory, 'index.js'))[exportName];

new Server().start().catch(error => {
    console.error(error);
    process.exit(1);
});
