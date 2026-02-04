#!/usr/bin/env node
/**
 * V1 Instinct: Extract patterns from Kotlin file edits
 *
 * Analyzes Kotlin files for mobile development patterns and
 * captures them as instincts with confidence scoring.
 */

const fs = require('fs');
const path = require('path');

const { getProjectRoot, ensureDir, getTimestamp } = require('../lib/utils');
const { addInstinct, loadInstincts } = require('../lib/instincts');

// Pattern definitions with detection regex and initial confidence
const PATTERNS = [
    // Compose Patterns
    {
        id: 'compose-state-hoisting',
        category: 'compose',
        description: 'State hoisted to caller in Composable',
        regex: /@Composable\s+fun\s+\w+\([^)]*\n[^}]*uiState:\s*\w+/,
        confidence: 0.6
    },
    {
        id: 'compose-remember-key',
        category: 'compose',
        description: 'LazyColumn/LazyRow with stable keys',
        regex: /Lazy(?:Column|Row)\s*\([^)]*key\s*=\s*\{[^}]+\.id/,
        confidence: 0.7
    },
    {
        id: 'compose-launched-effect',
        category: 'compose',
        description: 'LaunchedEffect for side effects',
        regex: /LaunchedEffect\s*\([^)]*\)\s*\{[^}]*viewModelScope\.launch/,
        confidence: 0.6
    },
    {
        id: 'compose-immutable',
        category: 'compose',
        description: 'Immutable data class for Compose stability',
        regex: /@Immutable\s+data\s+class/,
        confidence: 0.7
    },
    {
        id: 'compose-derived-state',
        category: 'compose',
        description: 'Derived state optimization',
        regex: /val\s+\w+\s+by\s+remember\s*\{[^}]*derivedStateOf/,
        confidence: 0.6
    },

    // MVI Patterns
    {
        id: 'mvi-sealed-state',
        category: 'mvi',
        description: 'Sealed interface for UI state',
        regex: /sealed\s+(?:interface|class)\s+\w*State/,
        confidence: 0.8
    },
    {
        id: 'mvi-intent-handler',
        category: 'mvi',
        description: 'onIntent pattern for user actions',
        regex: /(?:private|fun)\s+onIntent\s*\(\s*intent:\s*\w+Intent\s*\)/,
        confidence: 0.7
    },
    {
        id: 'mvi-state-reduction',
        category: 'mvi',
        description: 'State reduction function',
        regex: /fun\s+reduce\s*\([^)]*\)\s*:\s*\w+State/,
        confidence: 0.6
    },
    {
        id: 'mvi-single-event',
        category: 'mvi',
        description: 'One-time event handling (not state)',
        regex: /sealed\s+(?:interface|class)\s+\w*Event/,
        confidence: 0.6
    },

    // Koin Patterns
    {
        id: 'koin-viewmodel-injection',
        category: 'koin',
        description: 'koinViewModel injection in Compose',
        regex: /koinViewModel\s*<\s*\w+ViewModel\s*>/,
        confidence: 0.8
    },
    {
        id: 'koin-koin-inject',
        category: 'koin',
        description: 'koinInject for dependencies',
        regex: /koinInject\s*<\s*\w+\s*>/,
        confidence: 0.7
    },
    {
        id: 'koin-module-definition',
        category: 'koin',
        description: 'Koin module definition',
        regex: /val\s+\w+Module\s*=\s*module\s*\{/,
        confidence: 0.7
    },
    {
        id: 'koin-factory-of',
        category: 'koin',
        description: 'factoryOf for transient dependencies',
        regex: /factoryOf\s*{\s*::\w+/,
        confidence: 0.6
    },

    // Ktor Patterns
    {
        id: 'ktor-safe-request',
        category: 'ktor',
        description: 'Safe Ktor request with runCatching',
        regex: /runCatching\s*\{[^}]*client\.(?:get|post|put|delete|patch)/,
        confidence: 0.7
    },
    {
        id: 'ktor-plugin-install',
        category: 'ktor',
        description: 'ContentNegotiation plugin installation',
        regex: /install\s*\(\s*ContentNegotiation/,
        confidence: 0.6
    },
    {
        id: 'ktor-timeout-config',
        category: 'ktor',
        description: 'Request timeout configuration',
        regex: /timeout\s*\{[^}]*requestTimeoutMillis\s*=/,
        confidence: 0.5
    },
    {
        id: 'ktor-retry-pattern',
        category: 'ktor',
        description: 'Retry pattern for Ktor requests',
        regex: /retry\s*\([^)]*\)\s*{[^}]*HttpRequest/,
        confidence: 0.6
    },

    // Coroutine Patterns
    {
        id: 'coroutine-viewmodel-scope',
        category: 'coroutines',
        description: 'viewModelScope for coroutine launches',
        regex: /viewModelScope\.launch\s*\{/,
        confidence: 0.8
    },
    {
        id: 'coroutine-lifecycle-scope',
        category: 'coroutines',
        description: 'lifecycleScope for Composable coroutines',
        regex: /LifecycleCoroutineScope\s*\(/,
        confidence: 0.7
    },
    {
        id: 'coroutine-dispatcher-io',
        category: 'coroutines',
        description: 'Dispatchers.IO for blocking operations',
        regex: /withContext\s*\(\s*Dispatchers\.IO\s*\)/,
        confidence: 0.7
    },
    {
        id: 'coroutine-structured',
        category: 'coroutines',
        description: 'Structured concurrency pattern',
        regex: /coroutineScope\s*\{\s*launch/,
        confidence: 0.6
    },
    {
        id: 'coroutine-flow-collect',
        category: 'coroutines',
        description: 'Flow collection in Compose',
        regex: /\.collectAsStateWithLifecycle\s*\(/,
        confidence: 0.8
    },

    // Testing Patterns
    {
        id: 'test-run-test',
        category: 'testing',
        description: 'runTest for coroutine testing',
        regex: /fun\s+\w+\s*\([^)]*\)\s*=\s*runTest/,
        confidence: 0.7
    },
    {
        id: 'test-advance-until-idle',
        category: 'testing',
        description: 'advanceUntilIdle for test synchronization',
        regex: /advanceUntilIdle\s*\(/,
        confidence: 0.7
    },
    {
        id: 'test-compose-test-rule',
        category: 'testing',
        description: 'ComposeTestRule for Compose testing',
        regex: /val\s+\w+TestRule\s*=\s*createComposeRule/,
        confidence: 0.7
    }
];

function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Usage: extract-pattern.js <file-path>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const detectedPatterns = [];

    // Scan for all patterns
    for (const pattern of PATTERNS) {
        if (pattern.regex.test(content)) {
            detectedPatterns.push({
                id: pattern.id,
                category: pattern.category,
                description: pattern.description,
                confidence: pattern.confidence
            });

            // Add as instinct
            addInstinct({
                id: pattern.id,
                type: 'pattern',
                description: pattern.description,
                context: pattern.category,
                confidence: pattern.confidence,
                examples: [path.basename(filePath)]
            });
        }
    }

    if (detectedPatterns.length > 0) {
        console.log(`🧠 V1 Instinct: Captured ${detectedPatterns.length} pattern(s) from ${path.basename(filePath)}`);
        detectedPatterns.forEach(p => {
            console.log(`   • ${p.description} (${p.category}, confidence: ${p.confidence})`);
        });
    }
}

main();
