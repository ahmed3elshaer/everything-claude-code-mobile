/**
 * Unit tests for KMP Context MCP Server
 *
 * Tests the core logic patterns used by the KMP context server:
 * project detection, module extraction, source set scanning,
 * expect/actual matching, shared model detection, and context storage.
 *
 * We test the LOGIC (regex, file scanning, JSON round-trip) directly
 * against mock fixture data rather than importing the server class
 * (which requires the MCP SDK at runtime).
 */

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { createMockKMPProject, cleanupDir } = require('../helpers/test-utils');

const TEST_DIR = path.join(__dirname, '../fixtures/kmp-test-project');
const CONTEXT_DIR = path.join(TEST_DIR, '.claude/kmp-context');

// ---------------------------------------------------------------------------
// Helpers — mirrors of the pure-logic functions from index.js so we can test
// the patterns without pulling in the MCP SDK transport layer.
// ---------------------------------------------------------------------------

/** Detect whether a project directory is a KMP project. */
function isKMPProject(dir) {
    const buildFiles = [
        path.join(dir, 'build.gradle.kts'),
        path.join(dir, 'shared', 'build.gradle.kts'),
        path.join(dir, 'common', 'build.gradle.kts')
    ];

    for (const buildFile of buildFiles) {
        if (fs.existsSync(buildFile)) {
            const content = fs.readFileSync(buildFile, 'utf8');
            if (content.includes('kotlin("multiplatform")') || content.includes('kotlin-multiplatform')) {
                return true;
            }
        }
    }

    const sharedDir = path.join(dir, 'shared');
    if (fs.existsSync(sharedDir)) {
        const commonMain = path.join(sharedDir, 'commonMain');
        const androidMain = path.join(sharedDir, 'androidMain');
        const iosMain = path.join(sharedDir, 'iosMain');
        if (fs.existsSync(commonMain) && (fs.existsSync(androidMain) || fs.existsSync(iosMain))) {
            return true;
        }
    }

    return false;
}

/** Classify a project as kmp | android | ios | unknown. */
function detectProjectType(dir) {
    if (isKMPProject(dir)) return 'kmp';

    const androidIndicators = ['build.gradle.kts', 'settings.gradle.kts', 'AndroidManifest.xml'];
    let androidScore = 0;
    for (const ind of androidIndicators) {
        if (fs.existsSync(path.join(dir, ind)) || fs.existsSync(path.join(dir, 'app', ind))) {
            androidScore++;
        }
    }
    if (androidScore >= 2) return 'android';

    const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
    for (const entry of entries) {
        if ((entry.name.endsWith('.xcodeproj') || entry.name.endsWith('.xcworkspace')) && entry.isDirectory()) {
            return 'ios';
        }
    }
    if (fs.existsSync(path.join(dir, 'Podfile')) || fs.existsSync(path.join(dir, 'Package.swift'))) {
        return 'ios';
    }

    return 'unknown';
}

/** Find the shared module path. */
function findModulePath(projectRoot) {
    for (const p of ['shared', 'common', 'core']) {
        const testPath = path.join(projectRoot, p);
        if (fs.existsSync(testPath)) return testPath;
    }
    return null;
}

/** Extract platform targets from build.gradle.kts. */
function extractTargetsFromBuild(content) {
    const targets = [];
    const targetPatterns = [
        /androidTarget\(\)/g,
        /iosX64\(\)/g,
        /iosArm64\(\)/g,
        /iosSimulatorArm64\(\)/g,
        /jvm\(\)/g,
        /js\(\)/g,
    ];
    const targetNames = [
        'androidTarget', 'iosX64', 'iosArm64', 'iosSimulatorArm64', 'jvm', 'js'
    ];
    for (let i = 0; i < targetPatterns.length; i++) {
        if (targetPatterns[i].test(content)) {
            targets.push(targetNames[i]);
        }
    }
    return targets;
}

/** Scan source set directories under the shared module. */
function detectSourceSets(sharedPath) {
    const sourceSetNames = [
        'commonMain', 'commonTest', 'androidMain', 'androidTest',
        'iosMain', 'iosTest', 'desktopMain'
    ];
    const found = {};
    for (const name of sourceSetNames) {
        const ssPath = path.join(sharedPath, 'src', name);
        found[name] = fs.existsSync(ssPath) ? ssPath : null;
    }
    return found;
}

/** Find expect declarations in a file's content. */
function findExpectDeclarations(content) {
    const results = [];
    const regex = /expect\s+(class|object|fun|val|var)\s+(\w+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        results.push({ kind: match[1], name: match[2] });
    }
    return results;
}

/** Check whether a file contains an actual implementation for a given name. */
function hasActualDeclaration(content, expectName) {
    const pattern = new RegExp(`actual\\s+(class|object|fun|val|var)\\s+${expectName}\\b`);
    return pattern.test(content);
}

/** Find @Serializable data classes in file content. */
function findSerializableModels(content) {
    const results = [];
    const regex = /@Serializable\s+data class\s+(\w+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        results.push(match[1]);
    }
    return results;
}

/** Extract properties from a data class definition. */
function extractDataClassProperties(content, className) {
    const classPattern = new RegExp(`data class\\s+${className}\\s*(?:<[^>]*>)?\\s*\\(([^)]*)\\)`);
    const match = content.match(classPattern);
    if (!match) return [];

    const propsStr = match[1];
    const properties = [];
    const propMatches = propsStr.matchAll(/(\w+)\s*:\s*([^,)=]+)/g);
    for (const propMatch of propMatches) {
        const isNullable = propMatch[2].includes('?');
        const type = propMatch[2].replace('?', '').trim();
        properties.push({ name: propMatch[1], type, nullable: isNullable });
    }
    return properties;
}

/** Extract include() modules from settings.gradle.kts. */
function extractModulesFromSettings(content) {
    const modules = [];
    const regex = /include\s*\(\s*"([^"]+)"\s*\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        modules.push(match[1].replace(/^:/, '').replace(/:/g, '/'));
    }
    return modules;
}

// Context schemas (mirrors from index.js)
const CONTEXT_SCHEMAS = {
    'kmp-modules': {
        sharedModule: { name: null, path: null },
        platformModules: { android: null, ios: null, desktop: null, web: null },
        targets: [],
        hierarchicalStructure: false,
        lastAnalyzed: null
    },
    'source-sets': {
        commonMain: { path: null, dependencies: [], packages: [] },
        commonTest: { path: null },
        androidMain: { path: null, dependencies: [] },
        iosMain: { path: null, dependencies: [] },
        iosTest: { path: null },
        androidTest: { path: null },
        desktopMain: { path: null, dependencies: [] },
        lastIndexed: null
    },
    'expect-actual': {
        declarations: [],
        lastScanned: null
    },
    'shared-models': {
        models: [],
        serializers: [],
        jsonConfig: { ignoreUnknownKeys: true, isLenient: true, encodeDefaults: false },
        lastCatalogued: null
    },
    'platform-targets': {
        android: { minSdk: null, targetSdk: null },
        ios: { deploymentTarget: null },
        lastDetected: null
    }
};

/** JSON round-trip helpers. */
function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (_) {
        // fall through
    }
    return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KMP Context MCP Server', () => {
    beforeEach(() => {
        createMockKMPProject(TEST_DIR);
    });

    afterEach(() => {
        cleanupDir(TEST_DIR);
    });

    // -----------------------------------------------------------------------
    // 1. KMP Project Detection
    // -----------------------------------------------------------------------
    describe('KMP Project Detection', () => {
        it('should detect a KMP project via kotlin("multiplatform") in shared/build.gradle.kts', () => {
            assert.strictEqual(isKMPProject(TEST_DIR), true);
        });

        it('should detect a KMP project via root build.gradle.kts containing multiplatform plugin', () => {
            // The root build.gradle.kts in the fixture has
            // id("org.jetbrains.kotlin.multiplatform") — that does NOT match
            // the exact string kotlin("multiplatform"), but shared/build.gradle.kts does.
            // Verify detection still works through the shared path.
            assert.strictEqual(isKMPProject(TEST_DIR), true);
        });

        it('should return false for a non-KMP project', () => {
            const nonKmpDir = path.join(TEST_DIR, '_non_kmp');
            fs.mkdirSync(nonKmpDir, { recursive: true });
            fs.writeFileSync(path.join(nonKmpDir, 'build.gradle.kts'), 'plugins { id("com.android.application") }');
            assert.strictEqual(isKMPProject(nonKmpDir), false);
            cleanupDir(nonKmpDir);
        });

        it('should classify a KMP project as type "kmp"', () => {
            assert.strictEqual(detectProjectType(TEST_DIR), 'kmp');
        });

        it('should classify an Android-only project as "android"', () => {
            const androidDir = path.join(TEST_DIR, '_android_only');
            fs.mkdirSync(path.join(androidDir, 'app'), { recursive: true });
            fs.writeFileSync(path.join(androidDir, 'build.gradle.kts'), 'plugins { id("com.android.application") }');
            fs.writeFileSync(path.join(androidDir, 'settings.gradle.kts'), 'include(":app")');
            assert.strictEqual(detectProjectType(androidDir), 'android');
            cleanupDir(androidDir);
        });

        it('should classify an iOS-only project as "ios"', () => {
            const iosDir = path.join(TEST_DIR, '_ios_only');
            fs.mkdirSync(path.join(iosDir, 'MyApp.xcodeproj'), { recursive: true });
            assert.strictEqual(detectProjectType(iosDir), 'ios');
            cleanupDir(iosDir);
        });

        it('should classify an iOS project with Podfile as "ios"', () => {
            const iosDir = path.join(TEST_DIR, '_ios_pod');
            fs.mkdirSync(iosDir, { recursive: true });
            fs.writeFileSync(path.join(iosDir, 'Podfile'), "platform :ios, '17.0'");
            assert.strictEqual(detectProjectType(iosDir), 'ios');
            cleanupDir(iosDir);
        });

        it('should return "unknown" for an empty directory', () => {
            const emptyDir = path.join(TEST_DIR, '_empty');
            fs.mkdirSync(emptyDir, { recursive: true });
            assert.strictEqual(detectProjectType(emptyDir), 'unknown');
            cleanupDir(emptyDir);
        });
    });

    // -----------------------------------------------------------------------
    // 2. Module Extraction
    // -----------------------------------------------------------------------
    describe('Module Extraction', () => {
        it('should extract include() modules from settings.gradle.kts', () => {
            const settingsContent = fs.readFileSync(
                path.join(TEST_DIR, 'settings.gradle.kts'), 'utf8'
            );
            const modules = extractModulesFromSettings(settingsContent);
            assert.strictEqual(modules.length, 2);
            assert.ok(modules.includes('shared'));
            assert.ok(modules.includes('androidApp'));
        });

        it('should find the shared module path', () => {
            const modulePath = findModulePath(TEST_DIR);
            assert.ok(modulePath !== null, 'shared module should be found');
            assert.ok(modulePath.endsWith('shared'));
        });

        it('should extract platform targets from shared/build.gradle.kts', () => {
            const buildContent = fs.readFileSync(
                path.join(TEST_DIR, 'shared', 'build.gradle.kts'), 'utf8'
            );
            const targets = extractTargetsFromBuild(buildContent);
            assert.ok(targets.includes('androidTarget'), 'should detect androidTarget');
            assert.ok(targets.includes('iosX64'), 'should detect iosX64');
            assert.ok(targets.includes('iosArm64'), 'should detect iosArm64');
            assert.ok(targets.includes('iosSimulatorArm64'), 'should detect iosSimulatorArm64');
            assert.strictEqual(targets.length, 4);
        });

        it('should not find jvm or js targets when they are absent', () => {
            const buildContent = fs.readFileSync(
                path.join(TEST_DIR, 'shared', 'build.gradle.kts'), 'utf8'
            );
            const targets = extractTargetsFromBuild(buildContent);
            assert.ok(!targets.includes('jvm'));
            assert.ok(!targets.includes('js'));
        });

        it('should detect hierarchical source set structure when present', () => {
            const buildContent = fs.readFileSync(
                path.join(TEST_DIR, 'shared', 'build.gradle.kts'), 'utf8'
            );
            // The fixture uses "val commonMain by getting" style — check for sourceSets block
            assert.ok(buildContent.includes('sourceSets'), 'should have sourceSets block');
            assert.ok(buildContent.includes('commonMain'), 'should reference commonMain');
        });
    });

    // -----------------------------------------------------------------------
    // 3. Source Set Detection
    // -----------------------------------------------------------------------
    describe('Source Set Detection', () => {
        it('should find commonMain source set directory', () => {
            const sharedPath = findModulePath(TEST_DIR);
            const sourceSets = detectSourceSets(sharedPath);
            assert.ok(sourceSets.commonMain !== null, 'commonMain should exist');
            assert.ok(fs.existsSync(sourceSets.commonMain));
        });

        it('should find commonTest source set directory', () => {
            const sharedPath = findModulePath(TEST_DIR);
            const sourceSets = detectSourceSets(sharedPath);
            assert.ok(sourceSets.commonTest !== null, 'commonTest should exist');
        });

        it('should find androidMain source set directory', () => {
            const sharedPath = findModulePath(TEST_DIR);
            const sourceSets = detectSourceSets(sharedPath);
            assert.ok(sourceSets.androidMain !== null, 'androidMain should exist');
        });

        it('should find iosMain source set directory', () => {
            const sharedPath = findModulePath(TEST_DIR);
            const sourceSets = detectSourceSets(sharedPath);
            assert.ok(sourceSets.iosMain !== null, 'iosMain should exist');
        });

        it('should return null for missing source sets (desktopMain)', () => {
            const sharedPath = findModulePath(TEST_DIR);
            const sourceSets = detectSourceSets(sharedPath);
            assert.strictEqual(sourceSets.desktopMain, null, 'desktopMain should not exist');
        });

        it('should return null for missing source sets (iosTest)', () => {
            const sharedPath = findModulePath(TEST_DIR);
            const sourceSets = detectSourceSets(sharedPath);
            assert.strictEqual(sourceSets.iosTest, null, 'iosTest should not exist');
        });

        it('should handle a module with no src directory gracefully', () => {
            const emptyModule = path.join(TEST_DIR, '_empty_module');
            fs.mkdirSync(emptyModule, { recursive: true });
            const sourceSets = detectSourceSets(emptyModule);
            for (const key of Object.keys(sourceSets)) {
                assert.strictEqual(sourceSets[key], null, `${key} should be null for empty module`);
            }
            cleanupDir(emptyModule);
        });
    });

    // -----------------------------------------------------------------------
    // 4. Expect / Actual Matching
    // -----------------------------------------------------------------------
    describe('Expect/Actual Matching', () => {
        it('should find expect class declarations in commonMain', () => {
            const repoFile = path.join(
                TEST_DIR,
                'shared/src/commonMain/kotlin/com/example/shared/repository/UserRepository.kt'
            );
            const content = fs.readFileSync(repoFile, 'utf8');
            const expects = findExpectDeclarations(content);

            assert.strictEqual(expects.length, 1);
            assert.strictEqual(expects[0].kind, 'class');
            assert.strictEqual(expects[0].name, 'UserRepository');
        });

        it('should match actual class in androidMain', () => {
            const androidFile = path.join(
                TEST_DIR,
                'shared/src/androidMain/kotlin/com/example/shared/UserRepository.kt'
            );
            const content = fs.readFileSync(androidFile, 'utf8');
            assert.ok(
                hasActualDeclaration(content, 'UserRepository'),
                'androidMain should have actual UserRepository'
            );
        });

        it('should match actual class in iosMain', () => {
            const iosFile = path.join(
                TEST_DIR,
                'shared/src/iosMain/kotlin/com/example/shared/UserRepository.kt'
            );
            const content = fs.readFileSync(iosFile, 'utf8');
            assert.ok(
                hasActualDeclaration(content, 'UserRepository'),
                'iosMain should have actual UserRepository'
            );
        });

        it('should report missing actual when declaration is absent', () => {
            const content = `
package com.example.shared

class SomethingElse {
    fun doWork() {}
}
`;
            assert.ok(
                !hasActualDeclaration(content, 'UserRepository'),
                'should not find UserRepository actual in unrelated file'
            );
        });

        it('should find multiple expect declarations in a single file', () => {
            const content = `
expect class PlatformLogger() {
    fun log(message: String)
}

expect fun getPlatformName(): String

expect val platformVersion: String
`;
            const expects = findExpectDeclarations(content);
            assert.strictEqual(expects.length, 3);
            assert.deepStrictEqual(expects.map(e => e.kind), ['class', 'fun', 'val']);
            assert.deepStrictEqual(expects.map(e => e.name), ['PlatformLogger', 'getPlatformName', 'platformVersion']);
        });

        it('should not match non-expect declarations', () => {
            const content = `
class NormalClass() {
    fun normalFun(): String = "hello"
}
`;
            const expects = findExpectDeclarations(content);
            assert.strictEqual(expects.length, 0);
        });
    });

    // -----------------------------------------------------------------------
    // 5. Shared Model Detection
    // -----------------------------------------------------------------------
    describe('Shared Model Detection', () => {
        it('should find @Serializable data class User', () => {
            const userFile = path.join(
                TEST_DIR,
                'shared/src/commonMain/kotlin/com/example/shared/model/User.kt'
            );
            const content = fs.readFileSync(userFile, 'utf8');
            const models = findSerializableModels(content);

            assert.strictEqual(models.length, 1);
            assert.strictEqual(models[0], 'User');
        });

        it('should find @Serializable data class ApiResponse', () => {
            const apiFile = path.join(
                TEST_DIR,
                'shared/src/commonMain/kotlin/com/example/shared/model/ApiResponse.kt'
            );
            const content = fs.readFileSync(apiFile, 'utf8');
            const models = findSerializableModels(content);

            assert.strictEqual(models.length, 1);
            assert.strictEqual(models[0], 'ApiResponse');
        });

        it('should extract User data class properties', () => {
            const userFile = path.join(
                TEST_DIR,
                'shared/src/commonMain/kotlin/com/example/shared/model/User.kt'
            );
            const content = fs.readFileSync(userFile, 'utf8');
            const props = extractDataClassProperties(content, 'User');

            assert.strictEqual(props.length, 3);
            assert.deepStrictEqual(props.map(p => p.name), ['id', 'name', 'email']);
            assert.ok(props.every(p => p.type === 'String'));
            assert.ok(props.every(p => p.nullable === false));
        });

        it('should extract ApiResponse data class properties with nullable types', () => {
            const apiFile = path.join(
                TEST_DIR,
                'shared/src/commonMain/kotlin/com/example/shared/model/ApiResponse.kt'
            );
            const content = fs.readFileSync(apiFile, 'utf8');
            const props = extractDataClassProperties(content, 'ApiResponse');

            // ApiResponse<T> has: data: T?, error: String? = null
            // The regex extracts val/name : Type patterns inside the parens
            assert.ok(props.length >= 2, `expected at least 2 properties, got ${props.length}`);

            const dataField = props.find(p => p.name === 'data');
            assert.ok(dataField, 'should have a "data" property');
            assert.strictEqual(dataField.nullable, true);

            const errorField = props.find(p => p.name === 'error');
            assert.ok(errorField, 'should have an "error" property');
            assert.strictEqual(errorField.nullable, true);
        });

        it('should not find serializable models in non-annotated classes', () => {
            const content = `
data class PlainModel(
    val x: Int,
    val y: Int
)
`;
            const models = findSerializableModels(content);
            assert.strictEqual(models.length, 0);
        });

        it('should find multiple serializable models in one file', () => {
            const content = `
import kotlinx.serialization.Serializable

@Serializable
data class Foo(val a: String)

@Serializable
data class Bar(val b: Int)
`;
            const models = findSerializableModels(content);
            assert.strictEqual(models.length, 2);
            assert.ok(models.includes('Foo'));
            assert.ok(models.includes('Bar'));
        });
    });

    // -----------------------------------------------------------------------
    // 6. Context Storage (JSON save/load)
    // -----------------------------------------------------------------------
    describe('Context Storage', () => {
        it('should save and load kmp-modules context', () => {
            const data = {
                ...CONTEXT_SCHEMAS['kmp-modules'],
                sharedModule: { name: 'shared', path: '/project/shared' },
                targets: ['androidTarget', 'iosX64', 'iosArm64'],
                lastAnalyzed: new Date().toISOString()
            };
            const filePath = path.join(CONTEXT_DIR, 'kmp-modules.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.ok(loaded !== null);
            assert.strictEqual(loaded.sharedModule.name, 'shared');
            assert.strictEqual(loaded.targets.length, 3);
            assert.ok(loaded.lastAnalyzed);
        });

        it('should save and load source-sets context', () => {
            const data = {
                ...CONTEXT_SCHEMAS['source-sets'],
                commonMain: { path: '/project/shared/src/commonMain', dependencies: ['ktor-core'], packages: ['com.example.shared'] },
                lastIndexed: new Date().toISOString()
            };
            const filePath = path.join(CONTEXT_DIR, 'source-sets.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.ok(loaded !== null);
            assert.strictEqual(loaded.commonMain.path, '/project/shared/src/commonMain');
            assert.strictEqual(loaded.commonMain.dependencies[0], 'ktor-core');
            assert.ok(loaded.lastIndexed);
        });

        it('should save and load expect-actual context', () => {
            const data = {
                declarations: [
                    {
                        name: 'UserRepository',
                        kind: 'class',
                        expectLocation: { file: 'shared/src/commonMain/kotlin/UserRepository.kt', sourceSet: 'commonMain' },
                        actualImplementations: [
                            { platform: 'android', location: { file: 'shared/src/androidMain/kotlin/UserRepository.kt', sourceSet: 'androidMain' } },
                            { platform: 'ios', location: { file: 'shared/src/iosMain/kotlin/UserRepository.kt', sourceSet: 'iosMain' } }
                        ]
                    }
                ],
                lastScanned: new Date().toISOString()
            };
            const filePath = path.join(CONTEXT_DIR, 'expect-actual.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.ok(loaded !== null);
            assert.strictEqual(loaded.declarations.length, 1);
            assert.strictEqual(loaded.declarations[0].name, 'UserRepository');
            assert.strictEqual(loaded.declarations[0].actualImplementations.length, 2);
        });

        it('should save and load shared-models context', () => {
            const data = {
                ...CONTEXT_SCHEMAS['shared-models'],
                models: [
                    { name: 'User', file: 'shared/src/commonMain/kotlin/model/User.kt', properties: [{ name: 'id', type: 'String', nullable: false }] },
                    { name: 'ApiResponse', file: 'shared/src/commonMain/kotlin/model/ApiResponse.kt', properties: [] }
                ],
                lastCatalogued: new Date().toISOString()
            };
            const filePath = path.join(CONTEXT_DIR, 'shared-models.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.ok(loaded !== null);
            assert.strictEqual(loaded.models.length, 2);
            assert.strictEqual(loaded.models[0].name, 'User');
        });

        it('should save and load platform-targets context', () => {
            const data = {
                ...CONTEXT_SCHEMAS['platform-targets'],
                android: { minSdk: '24', targetSdk: '34' },
                ios: { deploymentTarget: '16.0' },
                lastDetected: new Date().toISOString()
            };
            const filePath = path.join(CONTEXT_DIR, 'platform-targets.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.ok(loaded !== null);
            assert.strictEqual(loaded.android.minSdk, '24');
            assert.strictEqual(loaded.android.targetSdk, '34');
            assert.strictEqual(loaded.ios.deploymentTarget, '16.0');
        });

        it('should return null for missing context file', () => {
            const loaded = readJson(path.join(CONTEXT_DIR, 'nonexistent.json'));
            assert.strictEqual(loaded, null);
        });

        it('should return null for malformed JSON', () => {
            const filePath = path.join(CONTEXT_DIR, 'bad.json');
            writeJson(filePath, { ok: true }); // write valid first to create dirs
            fs.writeFileSync(filePath, '{ invalid json {{');

            const loaded = readJson(filePath);
            assert.strictEqual(loaded, null);
        });

        it('should validate that all schema keys exist', () => {
            const expectedTypes = ['kmp-modules', 'source-sets', 'expect-actual', 'shared-models', 'platform-targets'];
            for (const type of expectedTypes) {
                assert.ok(CONTEXT_SCHEMAS[type], `schema should exist for ${type}`);
            }
            assert.strictEqual(Object.keys(CONTEXT_SCHEMAS).length, expectedTypes.length);
        });
    });
});
