#!/usr/bin/env node
/**
 * V2 Instinct: Session-end observational learning
 *
 * Analyzes the completed session to extract patterns across files:
 * - Architectural decisions
 * - Problem-solving approaches
 * - Code organization patterns
 * - Testing strategies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { getProjectRoot, ensureDir, getTimestamp } = require('../lib/utils');
const { loadInstincts, saveInstincts, addInstinct } = require('../lib/instincts');

// V2 pattern definitions for cross-file analysis
const V2_PATTERNS = {
    architectural: {
        'layer-separation': {
            description: 'UI, data, and domain layers properly separated',
            detect: (files) => {
                const hasUi = files.some(f => f.includes('ui') || f.includes('screen') || f.includes('ViewModel'));
                const hasData = files.some(f => f.includes('repository') || f.includes('datasource') || f.includes('data'));
                const hasDomain = files.some(f => f.includes('usecase') || f.includes('domain'));
                return hasUi && hasData && hasDomain;
            },
            confidence: 0.7
        },
        'feature-module-structure': {
            description: 'Feature modules with self-contained structure',
            detect: (files) => {
                const modulePattern = /feature[\/\\](\w+)/;
                const featureModules = new Set();
                for (const file of files) {
                    const match = file.match(modulePattern);
                    if (match) featureModules.add(match[1]);
                }
                return featureModules.size >= 2;
            },
            confidence: 0.6
        },
        'single-activity': {
            description: 'Single-activity architecture with Compose navigation',
            detect: (files) => {
                return files.some(f => f.includes('MainActivity.kt')) &&
                       files.some(f => f.includes('NavHost'));
            },
            confidence: 0.5
        }
    },
    problemSolving: {
        'error-boundary': {
            description: 'Try-catch with UI error state handling',
            detect: () => false,
            confidence: 0.5
        },
        'loading-state': {
            description: 'IsLoading + Content pattern in UI',
            detect: (files) => {
                return files.some(f => f.includes('Screen') || f.includes('ViewModel'));
            },
            confidence: 0.4
        },
        'pagination': {
            description: 'LazyColumn with Paging 3 integration',
            detect: (files) => {
                return files.some(f => f.includes('Pager') || f.includes('paging'));
            },
            confidence: 0.7
        }
    },
    codeOrganization: {
        'test-mirroring': {
            description: 'Test structure mirrors source structure',
            detect: (files) => {
                const hasTests = files.some(f => f.includes('/test/') || f.includes('Test.kt'));
                const hasSources = files.some(f => f.includes('/main/') && !f.includes('/test/'));
                return hasTests && hasSources;
            },
            confidence: 0.6
        },
        'repository-implementation': {
            description: 'Repository pattern for data access abstraction',
            detect: (files) => {
                return files.some(f => f.includes('Repository') && f.includes('.kt'));
            },
            confidence: 0.7
        },
        'usecase-isolation': {
            description: 'Use cases for business logic isolation',
            detect: (files) => {
                return files.some(f => f.includes('UseCase') || f.includes('usecase'));
            },
            confidence: 0.6
        }
    },
    testing: {
        'viewModel-testing': {
            description: 'ViewModels have corresponding test files',
            detect: (files) => {
                const hasViewModel = files.some(f => f.includes('ViewModel.kt'));
                const hasViewModelTest = files.some(f => f.includes('ViewModelTest.kt'));
                return hasViewModel && hasViewModelTest;
            },
            confidence: 0.7
        },
        'compose-testing': {
            description: 'Compose UI tests with createComposeRule',
            detect: (files) => {
                return files.some(f => f.includes('Test.kt') && f.includes('androidTest'));
            },
            confidence: 0.6
        },
        'coroutine-testing': {
            description: 'Coroutine tests with runTest',
            detect: () => false,
            confidence: 0.5
        }
    }
};

function getRecentGitChanges(projectRoot, limit = 20) {
    try {
        const output = execSync('git diff --name-only HEAD~10', { cwd: projectRoot, encoding: 'utf8' });
        return output.split('\n').filter(f => f.trim() && f.endsWith('.kt'));
    } catch (error) {
        return [];
    }
}

function getSessionFocus(files) {
    const focusAreas = {
        compose: 0,
        mvi: 0,
        koin: 0,
        ktor: 0,
        testing: 0
    };

    for (const file of files) {
        if (file.includes('Screen') || file.includes('ui/') || file.includes('compose')) focusAreas.compose++;
        if (file.includes('ViewModel') || file.includes('State') || file.includes('Intent')) focusAreas.mvi++;
        if (file.includes('module') || file.includes('di/')) focusAreas.koin++;
        if (file.includes('Api') || file.includes('network') || file.includes('remote')) focusAreas.ktor++;
        if (file.includes('Test')) focusAreas.testing++;
    }

    return Object.entries(focusAreas)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, count]) => count > 0)
        .map(([area, _]) => area);
}

function main() {
    const projectRoot = getProjectRoot();
    const instinctsDir = ensureDir(path.join(projectRoot, '.claude/instincts'));

    console.log('🧠 V2 Instinct: Starting session analysis...');

    const changedFiles = getRecentGitChanges(projectRoot);

    if (changedFiles.length === 0) {
        console.log('   No recent Kotlin changes to analyze');
        return;
    }

    console.log(`   Analyzing ${changedFiles.length} changed files...`);

    const focus = getSessionFocus(changedFiles);
    console.log(`   Session focus: ${focus.join(', ') || 'general'}`);

    const detectedPatterns = [];
    const allInstincts = loadInstincts();

    for (const [category, patterns] of Object.entries(V2_PATTERNS)) {
        for (const [patternId, pattern] of Object.entries(patterns)) {
            const detected = pattern.detect(changedFiles);

            if (detected) {
                detectedPatterns.push({
                    id: `v2-${patternId}`,
                    category: category,
                    description: pattern.description,
                    confidence: pattern.confidence
                });

                addInstinct({
                    id: `v2-${patternId}`,
                    type: 'pattern',
                    description: pattern.description,
                    context: category,
                    confidence: pattern.confidence,
                    source: 'v2-observation',
                    examples: changedFiles.slice(0, 3).map(f => path.basename(f))
                });
            }
        }
    }

    const v2AnalysisFile = path.join(instinctsDir, 'v2-sessions.json');

    let v2History = {};
    if (fs.existsSync(v2AnalysisFile)) {
        v2History = JSON.parse(fs.readFileSync(v2AnalysisFile, 'utf8'));
    }

    const sessionId = `session-${Date.now()}`;
    v2History[sessionId] = {
        timestamp: new Date().toISOString(),
        filesChanged: changedFiles.length,
        focus: focus,
        patterns: detectedPatterns,
        gitBranch: getCurrentBranch(projectRoot)
    };

    fs.writeFileSync(
        v2AnalysisFile,
        JSON.stringify(v2History, null, 2),
        'utf8'
    );

    if (detectedPatterns.length > 0) {
        console.log(`   V2 Patterns detected: ${detectedPatterns.length}`);
        detectedPatterns.forEach(p => {
            console.log(`   • ${p.description} (${p.category}, confidence: ${p.confidence})`);
        });
    }

    updatePatternConfidence(v2History, allInstincts);

    console.log('   V2 analysis complete');
}

function getCurrentBranch(projectRoot) {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function updatePatternConfidence(v2History, instincts) {
    const patternCounts = {};

    for (const [sessionId, session] of Object.entries(v2History)) {
        for (const pattern of session.patterns) {
            if (!patternCounts[pattern.id]) {
                patternCounts[pattern.id] = {
                    count: 0,
                    totalConfidence: 0,
                    description: pattern.description,
                    context: pattern.category
                };
            }
            patternCounts[pattern.id].count++;
            patternCounts[pattern.id].totalConfidence += pattern.confidence;
        }
    }

    for (const [patternId, data] of Object.entries(patternCounts)) {
        if (data.count >= 3) {
            const existingInstinct = instincts.instincts.find(i => i.id === patternId);
            if (existingInstinct && existingInstinct.confidence < 0.8) {
                existingInstinct.confidence = Math.min(0.9, existingInstinct.confidence + 0.15);
                existingInstinct.observationCount = data.count;
            }
        }
    }

    saveInstincts(instincts);
}

main();
