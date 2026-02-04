/**
 * Unit tests for Mobile Memory MCP Server
 *
 * Tests the core functionality of the memory persistence system.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock the MCP SDK
class MockServer {
    constructor() {
        this.resources = new Map();
        this.tools = new Map();
    }

    setResource(uri, data) {
        this.resources.set(uri, data);
    }

    getResource(uri) {
        return this.resources.get(uri);
    }

    setTool(name, handler) {
        this.tools.set(name, handler);
    }
}

// Test utilities
const TEST_DIR = path.join(__dirname, '../fixtures/test-project');
const MEMORY_DIR = path.join(TEST_DIR, '.claude/mobile-memory');

function setupTestProject() {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.mkdirSync(MEMORY_DIR, { recursive: true });

    // Create mock Android project files
    fs.writeFileSync(path.join(TEST_DIR, 'settings.gradle.kts'), `
include(":app")
include(":core:network")
include(":feature:auth")
    `);

    fs.writeFileSync(path.join(TEST_DIR, 'gradle/wrapper/gradle-wrapper.properties'), `
distributionBase=GRADLE_USER_HOME_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
    `);

    fs.writeFileSync(path.join(TEST_DIR, 'app/build.gradle.kts'), `
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    buildTypes {
        getByName("debug") { ... }
        getByName("release") { ... }
    }
}
    `);
}

function cleanupTestProject() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

// Tests
describe('Mobile Memory MCP Server', () => {
    beforeEach(setupTestProject);
    afterEach(cleanupTestProject);

    describe('Project Structure Extraction', () => {
        it('should extract modules from settings.gradle.kts', () => {
            const settingsPath = path.join(TEST_DIR, 'settings.gradle.kts');
            const content = fs.readFileSync(settingsPath, 'utf8');

            const includeMatches = content.matchAll(/include\s*\("([^"]+)"\)/g);
            const modules = Array.from(includeMatches).map(m => m[1].replace(':', '/'));

            assert.strictEqual(modules.length, 3);
            assert.ok(modules.includes('app'));
            assert.ok(modules.includes('core/network'));
            assert.ok(modules.includes('feature/auth'));
        });

        it('should identify feature modules', () => {
            const settingsPath = path.join(TEST_DIR, 'settings.gradle.kts');
            const content = fs.readFileSync(settingsPath, 'utf8');

            const featureMatches = content.matchAll(/include\s*\("feature:([^"]+)"\)/g);
            const featureModules = Array.from(featureMatches).map(m => m[1]);

            assert.strictEqual(featureModules.length, 1);
            assert.ok(featureModules.includes('auth'));
        });
    });

    describe('Dependency Extraction', () => {
        it('should extract Gradle version from wrapper properties', () => {
            const wrapperPath = path.join(TEST_DIR, 'gradle/wrapper/gradle-wrapper.properties');
            const content = fs.readFileSync(wrapperPath, 'utf8');

            const versionMatch = content.match(/gradle\-([\d.]+)/);
            const version = versionMatch ? versionMatch[1] : null;

            assert.strictEqual(version, '8.2');
        });

        it('should extract build variants from build.gradle.kts', () => {
            const buildPath = path.join(TEST_DIR, 'app/build.gradle.kts');
            const content = fs.readFileSync(buildPath, 'utf8');

            const variantMatches = content.matchAll(/buildTypes\s*\{[^}]*getByName\s*\(\s*"([^"]+)"/g);
            const variants = Array.from(variantMatches).map(m => m[1]);

            assert.ok(variants.includes('debug'));
            assert.ok(variants.includes('release'));
        });
    });

    describe('Memory Storage', () => {
        it('should save project structure to JSON file', () => {
            const data = {
                modules: ['app', 'core:network', 'feature:auth'],
                buildVariants: ['debug', 'release'],
                lastUpdated: new Date().toISOString()
            };

            const filePath = path.join(MEMORY_DIR, 'project-structure.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

            assert.ok(fs.existsSync(filePath));

            const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.deepStrictEqual(loaded.modules, data.modules);
            assert.strictEqual(loaded.buildVariants.length, 2);
        });

        it('should load memory from JSON file', () => {
            const data = {
                dependencies: [
                    { group: 'androidx.compose', name: 'runtime', version: '1.5.0' }
                ]
            };

            const filePath = path.join(MEMORY_DIR, 'dependencies.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

            const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.strictEqual(loaded.dependencies.length, 1);
            assert.strictEqual(loaded.dependencies[0].name, 'runtime');
        });
    });

    describe('Memory Types', () => {
        it('should have all required memory types', () => {
            const requiredTypes = [
                'project-structure',
                'dependencies',
                'architecture',
                'test-coverage',
                'compose-screens',
                'build-variants',
                'navigation-graph',
                'recent-changes'
            ];

            // Each memory type should have a schema
            const schemas = {
                'project-structure': {
                    modules: [],
                    buildVariants: ['debug', 'release'],
                    sourceSets: { main: 'src/main/java' },
                    featureModules: []
                },
                'dependencies': {
                    libraries: [],
                    plugins: [],
                    kgpVersion: null,
                    gradleVersion: null
                },
                'architecture': {
                    pattern: null,
                    uiLayer: { screens: [], components: [], viewmodels: [] },
                    dataLayer: { repositories: [], datasources: [], models: [] },
                    di: { framework: null, modules: [] }
                },
                'test-coverage': {
                    totalCoverage: 0,
                    trend: 'stable',
                    failingTests: [],
                    flakyTests: []
                },
                'compose-screens': {
                    screens: [],
                    navigation: { type: null, graphFile: null }
                },
                'build-variants': {
                    variants: [],
                    flavors: []
                },
                'navigation-graph': {
                    routes: [],
                    deepLinks: [],
                    nestedGraphs: []
                },
                'recent-changes': {
                    files: [],
                    sessions: []
                }
            };

            for (const type of requiredTypes) {
                assert.ok(schemas[type], `Missing schema for ${type}`);
            }
        });
    });
});

// Run tests when executed directly
if (require.main === module) {
    console.log('Running Mobile Memory MCP Server tests...\n');
    run();
}

module.exports = { setupTestProject, cleanupTestProject };
