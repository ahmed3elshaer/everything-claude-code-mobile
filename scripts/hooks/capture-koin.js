#!/usr/bin/env node
/**
 * V1 Instinct: Capture Koin dependency injection patterns
 *
 * Analyzes Koin module files for specific patterns like:
 * - Module definitions
 * - Factory declarations
 * - ViewModel injections
 * - Scoped dependencies
 */

const fs = require('fs');
const path = require('path');

const { getInstinctsDir, ensureDir } = require('../lib/utils');

function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Usage: capture-koin.js <koin-module-file-path>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const moduleName = path.basename(filePath, '.kt');

    // Detect Koin patterns
    const patterns = {
        isModuleDefinition: /val\s+\w+Module\s*=\s*module\s*\{/.test(content),
        hasFactory: /factory\s*\{[^}]*::\w+/.test(content),
        hasFactoryOf: /factoryOf\s*\(\s*::\w+/.test(content),
        hasViewModel: /viewModel\s*\{[^}]*::\w+ViewModel/.test(content),
        hasSingle: /single\s*\{[^}]*::\w+/.test(content),
        hasScoped: /scoped\s*\{/.test(content),
        hasKoinComponent: /KoinComponent/.test(content),
        hasKoinInject: /koinInject\s*</.test(content),
        hasKoinViewModel: /koinViewModel\s*</.test(content) || /by\s+koinViewModel\s*</.test(content),
        hasModuleReference: /\.?(?:module|loadKoinModules)\s*\(/.test(content),
        usesParameters: /parametersOf\s*\(/.test(content),
        usesNamed: /named\s*\(/.test(content)
    };

    // Extract specific dependency declarations
    const dependencies = [];

    // Extract factory declarations
    const factoryMatches = content.matchAll(/factory\s*(?:<[^>]+>)?\s*\{\s*::(\w+)/g);
    for (const match of factoryMatches) {
        dependencies.push({ type: 'factory', class: match[1] });
    }

    // Extract viewModel declarations
    const viewModelMatches = content.matchAll(/viewModel\s*(?:<[^>]+>)?\s*\{\s*::(\w+ViewModel)/g);
    for (const match of viewModelMatches) {
        dependencies.push({ type: 'viewModel', class: match[1] });
    }

    // Extract single declarations
    const singleMatches = content.matchAll(/single\s*(?:<[^>]+>)?\s*\{\s*::(\w+)/g);
    for (const match of singleMatches) {
        dependencies.push({ type: 'single', class: match[1] });
    }

    // Extract factoryOf declarations
    const factoryOfMatches = content.matchAll(/factoryOf\s*\(\s*::(\w+)/g);
    for (const match of factoryOfMatches) {
        dependencies.push({ type: 'factoryOf', class: match[1] });
    }

    // Build instinct data
    const instinctsDir = ensureDir(getInstinctsDir());
    const koinInstinctsFile = path.join(instinctsDir, 'koin-patterns.json');

    let existing = {};
    if (fs.existsSync(koinInstinctsFile)) {
        existing = JSON.parse(fs.readFileSync(koinInstinctsFile, 'utf8'));
    }

    // Update with this module's patterns
    existing[moduleName] = {
        file: path.relative(process.cwd(), filePath),
        patterns: patterns,
        dependencies: dependencies,
        capturedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        koinInstinctsFile,
        JSON.stringify(existing, null, 2),
        'utf8'
    );

    // Output detected patterns
    const detected = Object.entries(patterns)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);

    if (detected.length > 0) {
        console.log(`🧠 V1 Instinct: Koin patterns captured from ${moduleName}`);
        detected.forEach(p => {
            console.log(`   • ${p}`);
        });
        if (dependencies.length > 0) {
            console.log(`   Dependencies: ${dependencies.map(d => `${d.type}:${d.class}`).join(', ')}`);
        }
    }

    // Add specific patterns to main instinct storage
    const { addInstinct } = require('../lib/instincts');

    if (patterns.hasFactory && patterns.hasViewModel) {
        addInstinct({
            id: 'koin-module-with-viewmodels',
            type: 'pattern',
            description: 'Koin module with factory and viewModel definitions',
            context: 'koin-patterns',
            confidence: 0.7,
            examples: [moduleName]
        });
    }

    if (patterns.hasScoped) {
        addInstinct({
            id: 'koin-scoped-dependencies',
            type: 'pattern',
            description: 'Koin scoped dependencies for limited lifetime',
            context: 'koin-patterns',
            confidence: 0.6,
            examples: [moduleName]
        });
    }

    if (patterns.usesParameters) {
        addInstinct({
            id: 'koin-parameters',
            type: 'pattern',
            description: 'Koin parameters for dynamic dependencies',
            context: 'koin-patterns',
            confidence: 0.6,
            examples: [moduleName]
        });
    }
}

main();
