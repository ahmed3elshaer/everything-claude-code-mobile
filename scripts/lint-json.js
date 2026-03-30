#!/usr/bin/env node
/**
 * JSON lint script - validates all JSON config files in the project.
 */
const fs = require('fs');
const path = require('path');

const dirs = ['hooks', 'mcp-configs', '.claude-plugin'];
let failed = false;

for (const dir of dirs) {
    const fullDir = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const filePath = path.join(fullDir, file);
        try {
            JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`OK: ${dir}/${file}`);
        } catch (e) {
            console.error(`FAIL: ${dir}/${file} - ${e.message}`);
            failed = true;
        }
    }
}

// Also check hooks/extended directory
const extendedDir = path.join(__dirname, '..', 'hooks', 'extended');
if (fs.existsSync(extendedDir)) {
    const files = fs.readdirSync(extendedDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const filePath = path.join(extendedDir, file);
        try {
            JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`OK: hooks/extended/${file}`);
        } catch (e) {
            console.error(`FAIL: hooks/extended/${file} - ${e.message}`);
            failed = true;
        }
    }
}

if (failed) {
    process.exit(1);
}

console.log('\nAll JSON files valid.');
