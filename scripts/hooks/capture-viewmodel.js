#!/usr/bin/env node
/**
 * V1 Instinct: Capture ViewModel patterns
 *
 * Analyzes ViewModel files for specific patterns like:
 * - StateFlow usage
 * - Intent handling
 * - Coroutine scopes
 * - State reduction
 */

const fs = require('fs');
const path = require('path');

const { getInstinctsDir, ensureDir, getTimestamp } = require('../lib/utils');

function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Usage: capture-viewmodel.js <viewmodel-file-path>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(filePath, '.kt');

    // Detect ViewModel patterns
    const patterns = {
        usesStateFlow: /StateFlow</.test(content),
        usesMutableStateFlow: /MutableStateFlow</.test(content),
        usesIntent: /fun\s+onIntent\s*\(/.test(content) || /sealed\s+(?:interface|class)\s+\w*Intent/.test(content),
        usesViewModelScope: /viewModelScope\.launch/.test(content),
        usesSavedStateHandle: /SavedStateHandle/.test(content),
        sealedState: /sealed\s+(?:interface|class)\s*\w*State/.test(content),
        reduceFunction: /fun\s+reduce\s*\([^)]*State[^)]*\)/.test(content),
        initBlock: /init\s*\{/.test(content),
        hiltInjection: /@HiltViewModel/.test(content),
        koinCompatible: /KoinComponent/.test(content) || /factory\s*\{\s*::\s*${className}/.test(content)
    };

    // Build instinct data
    const instinctsDir = ensureDir(getInstinctsDir());
    const viewmodelInstinctsFile = path.join(instinctsDir, 'viewmodel-patterns.json');

    let existing = {};
    if (fs.existsSync(viewmodelInstinctsFile)) {
        existing = JSON.parse(fs.readFileSync(viewmodelInstinctsFile, 'utf8'));
    }

    // Update with this ViewModel's patterns
    existing[className] = {
        file: path.relative(process.cwd(), filePath),
        patterns: patterns,
        capturedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        viewmodelInstinctsFile,
        JSON.stringify(existing, null, 2),
        'utf8'
    );

    // Output detected patterns
    const detected = Object.entries(patterns)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);

    if (detected.length > 0) {
        console.log(`🧠 V1 Instinct: ViewModel patterns captured from ${className}`);
        detected.forEach(p => {
            console.log(`   • ${p}`);
        });
    }

    // Add specific patterns to main instinct storage
    const { addInstinct } = require('../lib/instincts');

    if (patterns.usesStateFlow && patterns.sealedState) {
        addInstinct({
            id: 'mvi-stateflow-state',
            type: 'pattern',
            description: 'MVI StateFlow with sealed state pattern',
            context: 'mvi-architecture',
            confidence: 0.8,
            examples: [className]
        });
    }

    if (patterns.usesIntent) {
        addInstinct({
            id: 'mvi-intent-handling',
            type: 'pattern',
            description: 'Intent-based user action handling',
            context: 'mvi-architecture',
            confidence: 0.7,
            examples: [className]
        });
    }

    if (patterns.usesViewModelScope) {
        addInstinct({
            id: 'coroutine-viewmodel-scope',
            type: 'pattern',
            description: 'ViewModelScope for coroutine launches',
            context: 'coroutines',
            confidence: 0.8,
            examples: [className]
        });
    }
}

main();
