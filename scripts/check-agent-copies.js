#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8')
        .replace(/\r\n/g, '\n')
        .trim();
}

function stripFrontmatter(content) {
    return content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
}

const canonical = read('AGENTS.md');
const copies = [
    ['.cursor/rules/everything-mobile.mdc', stripFrontmatter],
    ['.windsurf/rules/everything-mobile.md', content => content.trim()],
    ['.clinerules/everything-mobile.md', content => content.trim()],
    ['.github/copilot-instructions.md', content => content.trim()],
    ['.kiro/steering/everything-mobile.md', stripFrontmatter]
];

let failed = false;
for (const [relativePath, normalize] of copies) {
    if (normalize(read(relativePath)) !== canonical) {
        console.error(`${relativePath} drifted from AGENTS.md`);
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}

console.log(`Agent instructions match across ${copies.length} harness adapters.`);
