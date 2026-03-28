#!/usr/bin/env node
/**
 * Feature build learning hook - extracts patterns from completed feature builds
 * Runs after Phase 6 verification passes to capture learned patterns
 * and feed them back into the instinct system for future features.
 */

const path = require('path');
const fs = require('fs');
const { log, getProjectRoot, readJsonFile, writeJsonFile, ensureDir } = require('../lib/utils');
const { addInstinct, loadInstincts } = require('../lib/instincts');

// Mobile-specific patterns to detect (same as evaluate-session.js + feature-specific)
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
    },
    // Additional feature-builder-specific patterns
    {
        id: 'sealed-interface-intent',
        pattern: /sealed\s+interface\s+\w+Intent/,
        context: 'mvi-architecture',
        description: 'Sealed interface for MVI intents'
    },
    {
        id: 'sealed-interface-side-effect',
        pattern: /sealed\s+interface\s+\w+SideEffect/,
        context: 'mvi-architecture',
        description: 'Sealed interface for MVI side effects'
    },
    {
        id: 'repository-interface',
        pattern: /interface\s+\w+Repository\s*\{/,
        context: 'clean-architecture',
        description: 'Repository interface in domain layer'
    },
    {
        id: 'repository-impl',
        pattern: /class\s+\w+RepositoryImpl\s*\(/,
        context: 'clean-architecture',
        description: 'Repository implementation in data layer'
    },
    {
        id: 'usecase-class',
        pattern: /class\s+\w+UseCase\s*\(/,
        context: 'clean-architecture',
        description: 'Use case class pattern'
    },
    {
        id: 'koin-module-def',
        pattern: /val\s+\w+Module\s*=\s*module\s*\{/,
        context: 'koin-patterns',
        description: 'Koin module definition'
    },
    {
        id: 'compose-navigation-route',
        pattern: /composable\s*\(\s*route\s*=|composable\s*\(\s*"[^"]+"/,
        context: 'navigation-patterns',
        description: 'Compose Navigation route registration'
    },
    {
        id: 'result-type-usage',
        pattern: /Result<\w+>/,
        context: 'clean-architecture',
        description: 'Result type for error handling'
    },
    {
        id: 'mapper-function',
        pattern: /fun\s+\w+\.(toDomain|toDto|toEntity)\s*\(/,
        context: 'clean-architecture',
        description: 'DTO/Entity mapper extension function'
    }
];

// Feature-level composite patterns
const FEATURE_PATTERNS = {
    'feature-clean-architecture': {
        description: 'Clean architecture with domain/data/presentation layers',
        context: 'feature-architecture',
        requires: ['repository-interface', 'repository-impl', 'usecase-class'],
        confidence: 0.6
    },
    'feature-mvi-complete': {
        description: 'Complete MVI pattern with State, Intent, SideEffect, and ViewModel',
        context: 'feature-architecture',
        requires: ['sealed-interface-state', 'sealed-interface-intent', 'sealed-interface-side-effect', 'coroutine-structured'],
        confidence: 0.6
    },
    'feature-di-complete': {
        description: 'Koin DI module with all layer registrations',
        context: 'feature-architecture',
        requires: ['koin-module-def', 'koin-viewmodel-injection'],
        confidence: 0.5
    },
    'feature-test-coverage': {
        description: 'Complete test coverage with unit, UI, and E2E tests',
        context: 'feature-testing',
        requires: [],  // Checked separately via test file presence
        confidence: 0.5
    },
    'feature-navigation-wired': {
        description: 'Navigation route registered in navigation graph',
        context: 'feature-architecture',
        requires: ['compose-navigation-route'],
        confidence: 0.5
    }
};

/**
 * Find the most recently completed feature state file
 */
function findCompletedFeatureState(projectRoot) {
    const stateDir = path.join(projectRoot, '.omc', 'state');
    if (!fs.existsSync(stateDir)) {
        return null;
    }

    const stateFiles = fs.readdirSync(stateDir)
        .filter(f => f.startsWith('feature-') && f.endsWith('.json') && !f.includes('-learning'))
        .map(f => ({
            name: f,
            path: path.join(stateDir, f),
            mtime: fs.statSync(path.join(stateDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

    for (const file of stateFiles) {
        const state = readJsonFile(file.path);
        if (state && state.phases && state.phases['6_verification'] &&
            state.phases['6_verification'].status === 'completed') {
            return state;
        }
    }

    return null;
}

/**
 * Get the list of generated files from the plan document
 */
function getGeneratedFiles(projectRoot, featureName) {
    const planPath = path.join(projectRoot, '.omc', 'plans', `feature-${featureName}.json`);
    const plan = readJsonFile(planPath);

    if (!plan || !plan.modules) {
        return [];
    }

    const files = [];
    const moduleLocation = plan.moduleLocation || '';

    for (const [layerName, layerDef] of Object.entries(plan.modules)) {
        if (layerDef.files) {
            for (const file of layerDef.files) {
                files.push({
                    layer: layerName,
                    relativePath: file,
                    fullPath: path.join(projectRoot, layerDef.path || '', file)
                });
            }
        }
    }

    // Also gather test files
    if (plan.tests) {
        for (const [testType, testFiles] of Object.entries(plan.tests)) {
            for (const file of testFiles) {
                files.push({
                    layer: `test-${testType}`,
                    relativePath: file,
                    fullPath: null  // Test paths vary by platform; we scan for them
                });
            }
        }
    }

    return files;
}

/**
 * Scan files for mobile patterns
 */
function scanForPatterns(files) {
    const detectedPatterns = new Set();

    for (const file of files) {
        if (!file.fullPath || !fs.existsSync(file.fullPath)) continue;

        try {
            const content = fs.readFileSync(file.fullPath, 'utf-8');

            for (const patternDef of MOBILE_PATTERNS) {
                if (patternDef.pattern.test(content)) {
                    detectedPatterns.add(patternDef.id);
                }
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }

    return detectedPatterns;
}

/**
 * Check for test file presence across test types
 */
function checkTestCoverage(plan) {
    if (!plan || !plan.tests) return false;

    const hasUnit = plan.tests.unit && plan.tests.unit.length > 0;
    const hasUI = plan.tests.ui && plan.tests.ui.length > 0;
    const hasE2E = plan.tests.e2e && plan.tests.e2e.length > 0;

    return hasUnit && hasUI && hasE2E;
}

/**
 * Calculate feature completeness score based on detected patterns
 */
function calculateCompletenessScore(detectedPatterns, featurePatterns, hasTestCoverage) {
    const weights = {
        'feature-clean-architecture': 0.25,
        'feature-mvi-complete': 0.25,
        'feature-di-complete': 0.15,
        'feature-test-coverage': 0.20,
        'feature-navigation-wired': 0.15
    };

    let score = 0;
    const patternResults = {};

    for (const [patternId, patternDef] of Object.entries(featurePatterns)) {
        let met = false;

        if (patternId === 'feature-test-coverage') {
            met = hasTestCoverage;
        } else {
            met = patternDef.requires.every(req => detectedPatterns.has(req));
        }

        patternResults[patternId] = met;
        if (met) {
            score += weights[patternId] || 0;
        }
    }

    return { score: Math.round(score * 100), patternResults };
}

async function main() {
    const projectRoot = getProjectRoot();

    log('Feature build learning: extracting patterns from completed feature...', 'info');

    // Step 1: Find the most recently completed feature state
    const featureState = findCompletedFeatureState(projectRoot);

    if (!featureState) {
        log('No completed feature builds found to learn from', 'info');
        return;
    }

    const featureName = featureState.featureName;
    log(`Learning from completed feature: ${featureName}`, 'info');

    // Step 2: Read the plan document to get file list
    const planPath = path.join(projectRoot, '.omc', 'plans', `feature-${featureName}.json`);
    const plan = readJsonFile(planPath);

    if (!plan) {
        log(`No plan document found for feature: ${featureName}`, 'warn');
        return;
    }

    // Step 3: Get generated files and scan for patterns
    const generatedFiles = getGeneratedFiles(projectRoot, featureName);
    log(`Scanning ${generatedFiles.length} generated files for patterns`, 'info');

    const detectedPatterns = scanForPatterns(generatedFiles);

    // Step 4: Add detected patterns as instincts
    let newInstincts = 0;
    for (const patternId of detectedPatterns) {
        const patternDef = MOBILE_PATTERNS.find(p => p.id === patternId);
        if (patternDef) {
            addInstinct({
                id: patternDef.id,
                type: 'pattern',
                description: patternDef.description,
                context: patternDef.context,
                confidence: 0.5,
                source: `feature-build:${featureName}`
            });
            newInstincts++;
            log(`Detected: ${patternDef.description}`, 'success');
        }
    }

    // Step 5: Check feature-level composite patterns
    const hasTestCoverage = checkTestCoverage(plan);
    const featurePatternResults = {};

    for (const [patternId, patternDef] of Object.entries(FEATURE_PATTERNS)) {
        let met = false;

        if (patternId === 'feature-test-coverage') {
            met = hasTestCoverage;
        } else {
            met = patternDef.requires.every(req => detectedPatterns.has(req));
        }

        featurePatternResults[patternId] = met;

        if (met) {
            addInstinct({
                id: patternId,
                type: 'feature-pattern',
                description: patternDef.description,
                context: patternDef.context,
                confidence: patternDef.confidence,
                source: `feature-build:${featureName}`
            });
            log(`Feature pattern: ${patternDef.description}`, 'success');
        }
    }

    // Step 6: Calculate completeness score
    const { score, patternResults } = calculateCompletenessScore(
        detectedPatterns,
        FEATURE_PATTERNS,
        hasTestCoverage
    );

    log(`Feature completeness score: ${score}%`, score >= 80 ? 'success' : 'warn');

    // Step 7: Save learning summary
    const learningSummary = {
        featureName,
        platform: featureState.platform || plan.platform || 'unknown',
        learnedAt: new Date().toISOString(),
        patternsDetected: Array.from(detectedPatterns),
        featurePatterns: featurePatternResults,
        completenessScore: score,
        filesScanned: generatedFiles.length,
        instinctsAdded: newInstincts,
        phases: {
            planning: featureState.phases?.['1_planning']?.status || 'unknown',
            implementation: featureState.phases?.['2_implementation']?.status || 'unknown',
            testing: featureState.phases?.['3_testing']?.status || 'unknown',
            buildFix: featureState.phases?.['4_build_fix']?.status || 'unknown',
            qualityGate: featureState.phases?.['5_quality_gate']?.status || 'unknown',
            verification: featureState.phases?.['6_verification']?.status || 'unknown'
        },
        metrics: {
            buildIterations: featureState.phases?.['4_build_fix']?.iterations || 0,
            qualityFindings: featureState.phases?.['5_quality_gate']?.findings || {},
            passAtK: featureState.phases?.['6_verification']?.passAtK || null,
            coverage: featureState.phases?.['6_verification']?.coverage || null
        }
    };

    const stateDir = ensureDir(path.join(projectRoot, '.omc', 'state'));
    const learningPath = path.join(stateDir, `feature-${featureName}-learning.json`);
    writeJsonFile(learningPath, learningSummary);
    log(`Learning summary saved to: ${learningPath}`, 'success');

    // Final summary
    const instincts = loadInstincts();
    const highConfidence = instincts.instincts.filter(i => i.confidence >= 0.7);
    log(`Learning complete: ${newInstincts} patterns captured, score ${score}%`, 'success');
    log(`Total instincts: ${instincts.instincts.length} (${highConfidence.length} high confidence)`, 'info');
}

main().catch(error => {
    log(`Error in feature build learning: ${error.message}`, 'error');
    process.exit(1);
});
