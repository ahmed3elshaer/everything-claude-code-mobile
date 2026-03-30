/**
 * Integration tests for Mobile Port workflows
 *
 * Tests end-to-end workflows for continuous learning, checkpoints,
 * memory persistence, and verification loops.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { createMockAndroidProject, cleanupDir } = require('../helpers/test-utils');

const TEST_PROJECT = path.join(__dirname, '../fixtures/integration-project');

function setupIntegrationProject() {
    createMockAndroidProject(TEST_PROJECT);
}

function cleanupIntegrationProject() {
    cleanupDir(TEST_PROJECT);
}

describe('Integration Tests - Continuous Learning V1', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should extract Compose patterns from HomeScreen.kt', () => {
        const screenContent = fs.readFileSync(
            path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeScreen.kt'),
            'utf8'
        );

        // Check for state hoisting
        assert.ok(/uiState:\s*HomeUiState/.test(screenContent), 'Should have state hoisting');

        // Check for collectAsState
        assert.ok(/collectAsStateWithLifecycle/.test(screenContent), 'Should use collectAsStateWithLifecycle');

        // Check for koinViewModel
        assert.ok(/koinViewModel/.test(screenContent), 'Should use koinViewModel');
    });

    it('should extract MVI patterns from HomeViewModel.kt', () => {
        const viewModelContent = fs.readFileSync(
            path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeViewModel.kt'),
            'utf8'
        );

        // Check for sealed state
        assert.ok(/sealed\s+interface\s+HomeUiState/.test(viewModelContent), 'Should have sealed state');

        // Check for intent handler
        assert.ok(/fun\s+onIntent\s*\(/.test(viewModelContent), 'Should have onIntent');

        // Check for viewModelScope
        assert.ok(/viewModelScope\.launch/.test(viewModelContent), 'Should use viewModelScope');
    });

    it('should extract Koin patterns from AppModule.kt', () => {
        const moduleContent = fs.readFileSync(
            path.join(TEST_PROJECT, 'app/src/main/java/com/example/di/AppModule.kt'),
            'utf8'
        );

        // Check for module definition
        assert.ok(/val\s+appModule\s*=\s*module/.test(moduleContent), 'Should have module definition');

        // Check for factory
        assert.ok(/factory\s*\{\s*GetUserUseCase/.test(moduleContent), 'Should have factory');

        // Check for viewModel
        assert.ok(/viewModel\s*\{\s*HomeViewModel/.test(moduleContent), 'Should have viewModel');
    });

    it('should capture all pattern categories across project', () => {
        const patterns = {
            compose: 0,
            mvi: 0,
            koin: 0,
            repository: 0,
            usecase: 0
        };

        // Scan all Kotlin files
        function scanFiles(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanFiles(fullPath);
                } else if (entry.name.endsWith('.kt')) {
                    const content = fs.readFileSync(fullPath, 'utf8');

                    if (/@Composable/.test(content)) patterns.compose++;
                    if (/sealed\s+(?:interface|class)\s*\w*State/.test(content)) patterns.mvi++;
                    if (/module\s*\{/.test(content)) patterns.koin++;
                    if (/class\s+\w+Repository/.test(content)) patterns.repository++;
                    if (/class\s+\w+UseCase/.test(content)) patterns.usecase++;
                }
            }
        }

        scanFiles(path.join(TEST_PROJECT, 'app/src/main/java'));

        assert.ok(patterns.compose > 0, 'Should find Compose patterns');
        assert.ok(patterns.mvi > 0, 'Should find MVI patterns');
        assert.ok(patterns.koin > 0, 'Should find Koin patterns');
        assert.ok(patterns.repository > 0, 'Should find repository patterns');
    });
});

describe('Integration Tests - Continuous Learning V2', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should detect layer separation pattern', () => {
        const hasUi = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui'));
        const hasData = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/data'));
        const hasDomain = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/domain'));

        assert.ok(hasUi, 'Should have UI layer');
        assert.ok(hasData, 'Should have data layer');
        assert.ok(hasDomain, 'Should have domain layer');
    });

    it('should detect test mirroring', () => {
        const hasSource = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeViewModel.kt'));
        const hasTest = fs.existsSync(path.join(TEST_PROJECT, 'app/src/test/java/com/example/ui/HomeViewModelTest.kt'));

        assert.ok(hasSource, 'Should have source file');
        assert.ok(hasTest, 'Should have test file');
    });

    it('should detect feature module structure', () => {
        const featureAuthExists = fs.existsSync(path.join(TEST_PROJECT, 'feature/auth/src/main/java/com/example/auth'));

        assert.ok(featureAuthExists, 'Should have feature auth module');
    });
});

describe('Integration Tests - Checkpoint System', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should create checkpoint with git state', () => {
        const checkpoint = {
            name: 'test-checkpoint',
            timestamp: new Date().toISOString(),
            level: 'standard',
            git: {
                branch: 'main',
                commit: 'abc123',
                status: ['M app/src/main/java/com/example/ui/HomeScreen.kt']
            },
            build: {
                gradleVersion: '8.2',
                kgpVersion: '1.9.20',
                buildVariants: ['debug', 'release']
            }
        };

        const checkpointFile = path.join(TEST_PROJECT, '.claude/checkpoints/test-checkpoint.json');
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

        assert.ok(fs.existsSync(checkpointFile));

        const loaded = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
        assert.strictEqual(loaded.name, 'test-checkpoint');
        assert.ok(loaded.git);
        assert.ok(loaded.build);
    });

    it('should restore checkpoint state', () => {
        // Create a checkpoint
        const checkpoint = {
            name: 'before-refactor',
            timestamp: new Date().toISOString(),
            git: { branch: 'feature/auth', commit: 'def456' },
            build: { gradleVersion: '8.2' }
        };

        const checkpointFile = path.join(TEST_PROJECT, '.claude/checkpoints/before-refactor.json');
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

        // Simulate restoration
        const loaded = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));

        assert.strictEqual(loaded.git.branch, 'feature/auth');
        assert.strictEqual(loaded.git.commit, 'def456');
        assert.strictEqual(loaded.build.gradleVersion, '8.2');
    });
});

describe('Integration Tests - Memory Persistence', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should extract project structure to memory', () => {
        const settingsPath = path.join(TEST_PROJECT, 'settings.gradle.kts');
        const settingsContent = fs.readFileSync(settingsPath, 'utf8');

        const includeMatches = settingsContent.matchAll(/include\s*\("([^"]+)"\)/g);
        const modules = Array.from(includeMatches).map(m => m[1]);

        const memory = {
            modules: modules,
            buildVariants: ['debug', 'release'],
            featureModules: ['auth']
        };

        const memoryFile = path.join(TEST_PROJECT, '.claude/mobile-memory/project-structure.json');
        fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));

        const loaded = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
        assert.strictEqual(loaded.modules.length, 3);
        assert.ok(loaded.modules.includes(':app'));
    });

    it('should extract dependencies to memory', () => {
        const buildPath = path.join(TEST_PROJECT, 'app/build.gradle.kts');
        const buildContent = fs.readFileSync(buildPath, 'utf8');

        const implMatches = buildContent.matchAll(/implementation\s*\(\s*"([^:]+):([^:]+):([^")]+)"\s*\)/g);
        const dependencies = Array.from(implMatches).map(m => ({
            group: m[1],
            name: m[2],
            version: m[3].replace(/['"\s]/g, '')
        }));

        assert.ok(dependencies.length > 0, 'Should extract dependencies');

        const ktorDeps = dependencies.filter(d => d.group.startsWith('io.ktor'));
        assert.ok(ktorDeps.length >= 2, 'Should find Ktor dependencies');
    });
});

describe('Integration Tests - Verification Loops', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should calculate pass@k metrics', () => {
        const iterations = [true, true, false, true, true]; // Pass@3 = 4/5 = 0.8

        const k = iterations.length;
        const passed = iterations.filter(r => r).length;
        const passAtK = passed / k;

        assert.strictEqual(passAtK, 0.8);
        assert.strictEqual(k, 5);
    });

    it('should detect flaky tests', () => {
        const testResults = {
            'testLogin': [true, true, true],      // Stable
            'testLogout': [true, false, true],     // Flaky
            'testRefresh': [false, false, true]   // Very flaky
        };

        const flakyTests = [];

        for (const [test, results] of Object.entries(testResults)) {
            const passCount = results.filter(r => r).length;
            const passRate = passCount / results.length;

            if (passRate < 1.0) {
                flakyTests.push({
                    test,
                    passAtK: passRate,
                    pattern: getFailurePattern(results)
                });
            }
        }

        assert.strictEqual(flakyTests.length, 2);
        assert.ok(flakyTests.some(t => t.test === 'testLogout'));
        assert.ok(flakyTests.some(t => t.test === 'testRefresh'));
    });

    function getFailurePattern(results) {
        if (results[0] === false && results.slice(1).every(r => r)) return 'cold-start';
        if (results.filter(r => !r).length === results.length / 2) return '50%-flaky';
        return 'random';
    }
});

module.exports = { setupIntegrationProject, cleanupIntegrationProject };
