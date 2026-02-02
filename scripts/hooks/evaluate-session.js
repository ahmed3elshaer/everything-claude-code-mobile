#!/usr/bin/env node
/**
 * Session evaluation hook - extracts patterns from completed sessions
 * Runs on Stop event to capture learned patterns
 */

const path = require('path');
const { log, getProjectRoot, isAndroidProject } = require('../lib/utils');
const { addInstinct, loadInstincts } = require('../lib/instincts');

// Mobile-specific patterns to detect
const MOBILE_PATTERNS = [
    {
        id: 'compose-state-hoisting',
        pattern: /val\s+\w+\s+by\s+viewModel\.\w+\.collectAsStateWithLifecycle/,
        context: 'jetpack-compose',
        description: 'State hoisting with collectAsStateWithLifecycle'
    },
    {
        id: 'mvi-intent-handling',
        pattern: /fun\s+onIntent\s*\(\s*intent:\s*\w+Intent\s*\)/,
        context: 'mvi-architecture',
        description: 'MVI intent handler pattern'
    },
    {
        id: 'koin-viewmodel-injection',
        pattern: /koinViewModel\s*\(\)/,
        context: 'koin-patterns',
        description: 'Koin ViewModel injection in Compose'
    },
    {
        id: 'ktor-safe-request',
        pattern: /runCatching\s*\{[\s\S]*?client\.(get|post|put|delete)/,
        context: 'ktor-patterns',
        description: 'Safe Ktor request with runCatching'
    },
    {
        id: 'coroutine-structured',
        pattern: /viewModelScope\.launch\s*\{/,
        context: 'coroutines-patterns',
        description: 'Structured concurrency with viewModelScope'
    },
    {
        id: 'compose-lazy-key',
        pattern: /items\s*\([^)]*key\s*=\s*\{[^}]+\.id\s*\}/,
        context: 'jetpack-compose',
        description: 'LazyColumn/LazyRow with stable keys'
    },
    {
        id: 'immutable-data-class',
        pattern: /@Immutable\s+data\s+class/,
        context: 'jetpack-compose',
        description: 'Immutable data class for Compose stability'
    },
    {
        id: 'sealed-interface-state',
        pattern: /sealed\s+interface\s+\w+State/,
        context: 'mvi-architecture',
        description: 'Sealed interface for UI state'
    }
];

async function main() {
    const projectRoot = getProjectRoot();

    if (!isAndroidProject(projectRoot)) {
        log('Not an Android project, skipping pattern extraction', 'info');
        return;
    }

    log('Evaluating session for mobile patterns...', 'info');

    // Get recent git changes
    const { runCommand } = require('../lib/utils');
    const diff = runCommand('git diff HEAD~5 --name-only -- "*.kt"', { cwd: projectRoot });

    if (!diff.success || !diff.output) {
        log('No recent Kotlin changes to analyze', 'info');
        return;
    }

    const changedFiles = diff.output.split('\n').filter(f => f.endsWith('.kt'));
    log(`Analyzing ${changedFiles.length} changed Kotlin files`, 'info');

    const detectedPatterns = new Set();

    for (const file of changedFiles) {
        const filePath = path.join(projectRoot, file);
        try {
            const fs = require('fs');
            if (!fs.existsSync(filePath)) continue;

            const content = fs.readFileSync(filePath, 'utf-8');

            for (const patternDef of MOBILE_PATTERNS) {
                if (patternDef.pattern.test(content)) {
                    detectedPatterns.add(patternDef.id);

                    addInstinct({
                        id: patternDef.id,
                        type: 'pattern',
                        description: patternDef.description,
                        context: patternDef.context,
                        confidence: 0.4
                    });

                    log(`Detected: ${patternDef.description}`, 'success');
                }
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }

    if (detectedPatterns.size > 0) {
        log(`Session evaluation complete: ${detectedPatterns.size} patterns reinforced`, 'success');
    } else {
        log('No new patterns detected in this session', 'info');
    }

    // Show current instinct summary
    const instincts = loadInstincts();
    const highConfidence = instincts.instincts.filter(i => i.confidence >= 0.7);
    log(`Total instincts: ${instincts.instincts.length} (${highConfidence.length} high confidence)`, 'info');
}

main().catch(error => {
    log(`Error evaluating session: ${error.message}`, 'error');
    process.exit(1);
});
