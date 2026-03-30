/**
 * Unit tests for iOS Memory MCP Server
 *
 * Tests the core logic patterns used by the iOS Memory server:
 * project detection, SwiftUI view extraction, dependency parsing,
 * Info.plist parsing, and memory storage.
 *
 * These tests exercise the regex patterns and file-system logic
 * directly against mock iOS project fixtures, without importing
 * the MCP SDK-dependent server module.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { createMockIOSProject, cleanupDir } = require('../helpers/test-utils');

const TEST_DIR = path.join(__dirname, '../fixtures/ios-test-project');
const MEMORY_DIR = path.join(TEST_DIR, '.claude/ios-memory');

// ---------------------------------------------------------------------------
// Helper: replicate the server's isIOSProject logic
// ---------------------------------------------------------------------------
function isIOSProject(dir) {
    const entries = fs.existsSync(dir)
        ? fs.readdirSync(dir, { withFileTypes: true })
        : [];
    for (const entry of entries) {
        if (
            entry.isDirectory() &&
            (entry.name.endsWith('.xcodeproj') ||
                entry.name.endsWith('.xcworkspace'))
        ) {
            return true;
        }
    }
    if (
        fs.existsSync(path.join(dir, 'Podfile')) ||
        fs.existsSync(path.join(dir, 'Package.swift'))
    ) {
        return true;
    }
    const plistLocations = [
        path.join(dir, 'Info.plist'),
        path.join(dir, 'app', 'Info.plist'),
        path.join(dir, 'ios', 'Info.plist'),
    ];
    if (plistLocations.some((p) => fs.existsSync(p))) {
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Helper: replicate the server's SwiftUI extraction regexes
// ---------------------------------------------------------------------------
function extractViewsFromContent(content) {
    const views = [];
    const viewMatches = content.matchAll(/struct\s+(\w+)\s*:\s*View\s*\{/g);
    for (const match of viewMatches) {
        const viewName = match[1];
        views.push({
            name: viewName,
            hasPreview: content.includes('#Preview'),
            stateProperties: extractStateProperties(content),
        });
    }
    return views;
}

function extractStateProperties(content) {
    const properties = [];

    const stateMatches = content.matchAll(
        /@State\s+(?:private\s+)?(?:var|let)\s+(\w+)\s*(?::\s*(\S+)|=)/g,
    );
    for (const match of stateMatches) {
        properties.push({
            name: match[1],
            type: match[2] || 'inferred',
            kind: 'State',
        });
    }

    const bindingMatches = content.matchAll(
        /@Binding\s+(?:private\s+)?(?:var|let)\s+(\w+)\s*:\s*(\S+)/g,
    );
    for (const match of bindingMatches) {
        properties.push({
            name: match[1],
            type: match[2],
            kind: 'Binding',
        });
    }

    const observedMatches = content.matchAll(
        /@ObservedObject\s+(?:private\s+)?(?:var|let)\s+(\w+)\s*:\s*(\S+)/g,
    );
    for (const match of observedMatches) {
        properties.push({
            name: match[1],
            type: match[2],
            kind: 'ObservedObject',
        });
    }

    const stateObjectMatches = content.matchAll(
        /@StateObject\s+(?:private\s+)?(?:var|let)\s+(\w+)\s*(?::\s*(\S+)|=)/g,
    );
    for (const match of stateObjectMatches) {
        properties.push({
            name: match[1],
            type: match[2] || 'inferred',
            kind: 'StateObject',
        });
    }

    return properties;
}

// ---------------------------------------------------------------------------
// Helper: replicate the server's dependency extraction regexes
// ---------------------------------------------------------------------------
function extractSPMDependencies(content) {
    const packages = [];
    const packageMatches = content.matchAll(
        /\.package\s*\(\s*url:\s*["']([^"']+)["'](?:,\s*from:\s*["']([^"']+)["'])?/g,
    );
    for (const match of packageMatches) {
        packages.push({
            url: match[1],
            version: match[2] || 'branch',
        });
    }
    return packages;
}

function extractCocoaPods(content) {
    const pods = [];
    const podMatches = content.matchAll(
        /pod\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g,
    );
    for (const match of podMatches) {
        pods.push({
            name: match[1],
            version: match[2] || null,
        });
    }
    return pods;
}

// ---------------------------------------------------------------------------
// Helper: replicate the server's Info.plist extraction
// ---------------------------------------------------------------------------
function extractInfoPlist(content) {
    const info = {
        bundleId: null,
        version: null,
        buildNumber: null,
        deploymentTarget: null,
        permissions: [],
        urlSchemes: [],
    };

    const bundleIdMatch = content.match(
        /<key>CFBundleIdentifier<\/key>\s*\n*\s*<string>([^<]+)<\/string>/,
    );
    if (bundleIdMatch) info.bundleId = bundleIdMatch[1];

    const versionMatch = content.match(
        /<key>CFBundleShortVersionString<\/key>\s*\n*\s*<string>([^<]+)<\/string>/,
    );
    if (versionMatch) info.version = versionMatch[1];

    const buildMatch = content.match(
        /<key>CFBundleVersion<\/key>\s*\n*\s*<string>([^<]+)<\/string>/,
    );
    if (buildMatch) info.buildNumber = buildMatch[1];

    // Permissions: match <key>NS...UsageDescription</key> followed by <string>
    const permissionMatches = content.matchAll(
        /<key>(NS\w+UsageDescription)<\/key>\s*\n*\s*<string>[^<]*<\/string>/g,
    );
    for (const match of permissionMatches) {
        info.permissions.push(match[1]);
    }

    // URL schemes
    const urlBlock = content.match(
        /<key>CFBundleURLSchemes<\/key>[\s\S]*?<array>([\s\S]*?)<\/array>/,
    );
    if (urlBlock) {
        const schemeMatches = urlBlock[1].matchAll(
            /<string>([^<]+)<\/string>/g,
        );
        for (const match of schemeMatches) {
            info.urlSchemes.push(match[1]);
        }
    }

    return info;
}

// ---------------------------------------------------------------------------
// Helper: memory save/load utilities (mirrors server's readJson / writeJson)
// ---------------------------------------------------------------------------
function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (_err) {
        // return null on error
    }
    return null;
}

// Memory type schemas (exact replica from server)
const MEMORY_SCHEMAS = {
    'xcode-project': {
        projectFile: null,
        workspace: null,
        targets: [],
        schemes: [],
        configurations: [],
        lastAnalyzed: null,
    },
    'swiftui-views': {
        views: [],
        navigationPaths: [],
        sheets: [],
        previews: [],
        lastIndexed: null,
    },
    'ios-dependencies': {
        spmPackages: [],
        cocoaPods: [],
        frameworks: [],
        systemFrameworks: [],
        lastSync: null,
    },
    'ios-schemes': {
        schemes: [],
        runConfigurations: [],
        lastListed: null,
    },
    'ios-tests': {
        unitTestTargets: [],
        uiTestTargets: [],
        testCount: 0,
        coverage: 0,
        failingTests: [],
        lastRun: null,
    },
    'info-plist': {
        bundleId: null,
        version: null,
        buildNumber: null,
        deploymentTarget: null,
        permissions: [],
        urlSchemes: [],
        lastRead: null,
    },
};

// ===========================================================================
// Tests
// ===========================================================================

describe('iOS Memory MCP Server', () => {
    beforeEach(() => createMockIOSProject(TEST_DIR));
    afterEach(() => cleanupDir(TEST_DIR));

    // -----------------------------------------------------------------------
    // 1. iOS Project Detection
    // -----------------------------------------------------------------------
    describe('iOS Project Detection', () => {
        it('should detect an iOS project via .xcodeproj directory', () => {
            // createMockIOSProject creates MyApp.xcodeproj directory
            assert.strictEqual(isIOSProject(TEST_DIR), true);
        });

        it('should detect an iOS project via Podfile', () => {
            // Remove the xcodeproj dir to isolate Podfile detection
            const xcodeprojDir = path.join(TEST_DIR, 'MyApp.xcodeproj');
            fs.rmSync(xcodeprojDir, { recursive: true, force: true });

            assert.strictEqual(isIOSProject(TEST_DIR), true);
        });

        it('should detect an iOS project via Package.swift', () => {
            // Remove xcodeproj and Podfile to isolate Package.swift
            fs.rmSync(path.join(TEST_DIR, 'MyApp.xcodeproj'), {
                recursive: true,
                force: true,
            });
            fs.unlinkSync(path.join(TEST_DIR, 'Podfile'));

            assert.strictEqual(isIOSProject(TEST_DIR), true);
        });

        it('should return false for a non-iOS project', () => {
            const emptyDir = path.join(TEST_DIR, '_empty_project');
            fs.mkdirSync(emptyDir, { recursive: true });
            fs.writeFileSync(
                path.join(emptyDir, 'README.md'),
                '# Not an iOS project',
            );

            assert.strictEqual(isIOSProject(emptyDir), false);
        });

        it('should detect via Info.plist at root level', () => {
            // Remove xcodeproj, Podfile, and Package.swift
            fs.rmSync(path.join(TEST_DIR, 'MyApp.xcodeproj'), {
                recursive: true,
                force: true,
            });
            fs.unlinkSync(path.join(TEST_DIR, 'Podfile'));
            fs.unlinkSync(path.join(TEST_DIR, 'Package.swift'));

            // Info.plist still present at root
            assert.strictEqual(isIOSProject(TEST_DIR), true);
        });

        it('should return false for non-existent directory', () => {
            assert.strictEqual(
                isIOSProject('/tmp/does-not-exist-xyz-123'),
                false,
            );
        });
    });

    // -----------------------------------------------------------------------
    // 2. SwiftUI View Extraction
    // -----------------------------------------------------------------------
    describe('SwiftUI View Extraction', () => {
        it('should find struct conforming to View', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/HomeView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);

            assert.strictEqual(views.length, 1);
            assert.strictEqual(views[0].name, 'HomeView');
        });

        it('should detect #Preview annotations', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/HomeView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);

            assert.strictEqual(views[0].hasPreview, true);
        });

        it('should extract @State properties', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/HomeView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);
            const stateProps = views[0].stateProperties.filter(
                (p) => p.kind === 'State',
            );

            assert.ok(stateProps.length >= 1);
            const showSettings = stateProps.find(
                (p) => p.name === 'showSettings',
            );
            assert.ok(showSettings, 'Should find showSettings @State property');
        });

        it('should extract @Binding properties', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/HomeView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);
            const bindingProps = views[0].stateProperties.filter(
                (p) => p.kind === 'Binding',
            );

            assert.ok(bindingProps.length >= 1);
            const isLoggedIn = bindingProps.find(
                (p) => p.name === 'isLoggedIn',
            );
            assert.ok(isLoggedIn, 'Should find isLoggedIn @Binding property');
            assert.strictEqual(isLoggedIn.type, 'Bool');
        });

        it('should extract @StateObject properties', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/HomeView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);
            const stateObjectProps = views[0].stateProperties.filter(
                (p) => p.kind === 'StateObject',
            );

            assert.ok(stateObjectProps.length >= 1);
            const vm = stateObjectProps.find((p) => p.name === 'viewModel');
            assert.ok(vm, 'Should find viewModel @StateObject property');
        });

        it('should extract @ObservedObject properties', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/SettingsView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);
            const observedProps = views[0].stateProperties.filter(
                (p) => p.kind === 'ObservedObject',
            );

            assert.ok(observedProps.length >= 1);
            const vm = observedProps.find((p) => p.name === 'viewModel');
            assert.ok(vm, 'Should find viewModel @ObservedObject property');
            assert.strictEqual(vm.type, 'SettingsViewModel');
        });

        it('should detect multiple views in separate files', () => {
            const homeContent = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/HomeView.swift'),
                'utf8',
            );
            const settingsContent = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/SettingsView.swift'),
                'utf8',
            );

            const homeViews = extractViewsFromContent(homeContent);
            const settingsViews = extractViewsFromContent(settingsContent);

            assert.strictEqual(homeViews[0].name, 'HomeView');
            assert.strictEqual(settingsViews[0].name, 'SettingsView');
        });

        it('should handle files with no views', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/ViewModels/HomeViewModel.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);

            assert.strictEqual(views.length, 0);
        });

        it('should detect #Preview in SettingsView', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'MyApp/Views/SettingsView.swift'),
                'utf8',
            );
            const views = extractViewsFromContent(content);

            assert.strictEqual(views.length, 1);
            assert.strictEqual(views[0].hasPreview, true);
        });
    });

    // -----------------------------------------------------------------------
    // 3. iOS Dependency Extraction
    // -----------------------------------------------------------------------
    describe('iOS Dependency Extraction', () => {
        it('should parse SPM dependencies from Package.swift', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Package.swift'),
                'utf8',
            );
            const packages = extractSPMDependencies(content);

            assert.strictEqual(packages.length, 2);

            const alamofire = packages.find((p) =>
                p.url.includes('Alamofire'),
            );
            assert.ok(alamofire, 'Should find Alamofire dependency');
            assert.strictEqual(alamofire.version, '5.8.0');

            const kingfisher = packages.find((p) =>
                p.url.includes('Kingfisher'),
            );
            assert.ok(kingfisher, 'Should find Kingfisher dependency');
            assert.strictEqual(kingfisher.version, '7.10.0');
        });

        it('should extract full URLs from SPM packages', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Package.swift'),
                'utf8',
            );
            const packages = extractSPMDependencies(content);

            assert.strictEqual(
                packages[0].url,
                'https://github.com/Alamofire/Alamofire.git',
            );
            assert.strictEqual(
                packages[1].url,
                'https://github.com/onevcat/Kingfisher.git',
            );
        });

        it('should parse CocoaPods from Podfile', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Podfile'),
                'utf8',
            );
            const pods = extractCocoaPods(content);

            assert.strictEqual(pods.length, 2);

            const swiftlint = pods.find((p) => p.name === 'SwiftLint');
            assert.ok(swiftlint, 'Should find SwiftLint pod');
            assert.strictEqual(swiftlint.version, '~> 0.54');

            const snapkit = pods.find((p) => p.name === 'SnapKit');
            assert.ok(snapkit, 'Should find SnapKit pod');
            assert.strictEqual(snapkit.version, '~> 5.7');
        });

        it('should handle empty Package.swift with no dependencies', () => {
            const content = `
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "EmptyApp",
    targets: [
        .target(name: "EmptyApp"),
    ]
)
`;
            const packages = extractSPMDependencies(content);
            assert.strictEqual(packages.length, 0);
        });

        it('should handle Podfile with no pods', () => {
            const content = `
platform :ios, '17.0'
use_frameworks!

target 'MyApp' do
end
`;
            const pods = extractCocoaPods(content);
            assert.strictEqual(pods.length, 0);
        });

        it('should handle SPM package without version (branch dependency)', () => {
            const content = `
.package(url: "https://github.com/example/SomeLib.git"),
`;
            const packages = extractSPMDependencies(content);
            assert.strictEqual(packages.length, 1);
            assert.strictEqual(packages[0].version, 'branch');
        });

        it('should handle pod without explicit version', () => {
            const content = `
pod 'Firebase'
`;
            const pods = extractCocoaPods(content);
            assert.strictEqual(pods.length, 1);
            assert.strictEqual(pods[0].name, 'Firebase');
            assert.strictEqual(pods[0].version, null);
        });
    });

    // -----------------------------------------------------------------------
    // 4. Info.plist Parsing
    // -----------------------------------------------------------------------
    describe('Info.plist Parsing', () => {
        it('should extract bundle identifier', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.strictEqual(info.bundleId, 'com.example.MyApp');
        });

        it('should extract version string', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.strictEqual(info.version, '1.0');
        });

        it('should extract build number', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.strictEqual(info.buildNumber, '42');
        });

        it('should extract camera permission', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.ok(
                info.permissions.includes('NSCameraUsageDescription'),
                'Should find NSCameraUsageDescription',
            );
        });

        it('should extract location permission', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.ok(
                info.permissions.includes(
                    'NSLocationWhenInUseUsageDescription',
                ),
                'Should find NSLocationWhenInUseUsageDescription',
            );
        });

        it('should extract all permissions', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.strictEqual(info.permissions.length, 2);
        });

        it('should extract URL schemes', () => {
            const content = fs.readFileSync(
                path.join(TEST_DIR, 'Info.plist'),
                'utf8',
            );
            const info = extractInfoPlist(content);

            assert.strictEqual(info.urlSchemes.length, 1);
            assert.strictEqual(info.urlSchemes[0], 'myapp');
        });

        it('should handle missing plist gracefully', () => {
            const content = '';
            const info = extractInfoPlist(content);

            assert.strictEqual(info.bundleId, null);
            assert.strictEqual(info.version, null);
            assert.strictEqual(info.buildNumber, null);
            assert.strictEqual(info.permissions.length, 0);
            assert.strictEqual(info.urlSchemes.length, 0);
        });

        it('should handle plist without URL schemes', () => {
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.example.Simple</string>
</dict>
</plist>`;
            const info = extractInfoPlist(content);

            assert.strictEqual(info.bundleId, 'com.example.Simple');
            assert.strictEqual(info.urlSchemes.length, 0);
        });

        it('should handle plist without permissions', () => {
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.example.NoPerm</string>
    <key>CFBundleVersion</key>
    <string>1</string>
</dict>
</plist>`;
            const info = extractInfoPlist(content);

            assert.strictEqual(info.bundleId, 'com.example.NoPerm');
            assert.strictEqual(info.permissions.length, 0);
        });
    });

    // -----------------------------------------------------------------------
    // 5. Memory Storage
    // -----------------------------------------------------------------------
    describe('Memory Storage', () => {
        beforeEach(() => {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        });

        it('should save and load iOS memory as JSON', () => {
            const data = {
                bundleId: 'com.example.MyApp',
                version: '1.0',
                buildNumber: '42',
                lastRead: new Date().toISOString(),
            };

            const filePath = path.join(MEMORY_DIR, 'info-plist.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.ok(loaded);
            assert.strictEqual(loaded.bundleId, 'com.example.MyApp');
            assert.strictEqual(loaded.version, '1.0');
            assert.strictEqual(loaded.buildNumber, '42');
        });

        it('should return null for non-existent memory file', () => {
            const loaded = readJson(
                path.join(MEMORY_DIR, 'does-not-exist.json'),
            );
            assert.strictEqual(loaded, null);
        });

        it('should return null for corrupt JSON', () => {
            const filePath = path.join(MEMORY_DIR, 'corrupt.json');
            fs.writeFileSync(filePath, '{ invalid json !!!', 'utf8');

            const loaded = readJson(filePath);
            assert.strictEqual(loaded, null);
        });

        it('should overwrite existing memory', () => {
            const filePath = path.join(MEMORY_DIR, 'info-plist.json');

            writeJson(filePath, { version: '1.0' });
            writeJson(filePath, { version: '2.0' });

            const loaded = readJson(filePath);
            assert.strictEqual(loaded.version, '2.0');
        });

        it('should merge memory data like the server does', () => {
            const filePath = path.join(MEMORY_DIR, 'swiftui-views.json');

            const existing = { views: ['HomeView'], lastIndexed: 'old' };
            writeJson(filePath, existing);

            const loaded = readJson(filePath) || {};
            const update = {
                views: ['HomeView', 'SettingsView'],
                previews: ['HomeView'],
            };
            const merged = {
                ...loaded,
                ...update,
                lastUpdated: new Date().toISOString(),
            };
            writeJson(filePath, merged);

            const result = readJson(filePath);
            assert.deepStrictEqual(result.views, [
                'HomeView',
                'SettingsView',
            ]);
            assert.deepStrictEqual(result.previews, ['HomeView']);
            assert.ok(result.lastUpdated);
        });

        it('should validate all memory schema types exist', () => {
            const requiredTypes = [
                'xcode-project',
                'swiftui-views',
                'ios-dependencies',
                'ios-schemes',
                'ios-tests',
                'info-plist',
            ];

            for (const type of requiredTypes) {
                assert.ok(
                    MEMORY_SCHEMAS[type],
                    `Missing schema for type: ${type}`,
                );
            }
        });

        it('should have correct schema structure for xcode-project', () => {
            const schema = MEMORY_SCHEMAS['xcode-project'];
            assert.ok('projectFile' in schema);
            assert.ok('workspace' in schema);
            assert.ok(Array.isArray(schema.targets));
            assert.ok(Array.isArray(schema.schemes));
            assert.ok(Array.isArray(schema.configurations));
            assert.strictEqual(schema.lastAnalyzed, null);
        });

        it('should have correct schema structure for swiftui-views', () => {
            const schema = MEMORY_SCHEMAS['swiftui-views'];
            assert.ok(Array.isArray(schema.views));
            assert.ok(Array.isArray(schema.navigationPaths));
            assert.ok(Array.isArray(schema.sheets));
            assert.ok(Array.isArray(schema.previews));
            assert.strictEqual(schema.lastIndexed, null);
        });

        it('should have correct schema structure for ios-dependencies', () => {
            const schema = MEMORY_SCHEMAS['ios-dependencies'];
            assert.ok(Array.isArray(schema.spmPackages));
            assert.ok(Array.isArray(schema.cocoaPods));
            assert.ok(Array.isArray(schema.frameworks));
            assert.ok(Array.isArray(schema.systemFrameworks));
            assert.strictEqual(schema.lastSync, null);
        });

        it('should have correct schema structure for ios-schemes', () => {
            const schema = MEMORY_SCHEMAS['ios-schemes'];
            assert.ok(Array.isArray(schema.schemes));
            assert.ok(Array.isArray(schema.runConfigurations));
            assert.strictEqual(schema.lastListed, null);
        });

        it('should have correct schema structure for ios-tests', () => {
            const schema = MEMORY_SCHEMAS['ios-tests'];
            assert.ok(Array.isArray(schema.unitTestTargets));
            assert.ok(Array.isArray(schema.uiTestTargets));
            assert.strictEqual(schema.testCount, 0);
            assert.strictEqual(schema.coverage, 0);
            assert.ok(Array.isArray(schema.failingTests));
            assert.strictEqual(schema.lastRun, null);
        });

        it('should have correct schema structure for info-plist', () => {
            const schema = MEMORY_SCHEMAS['info-plist'];
            assert.strictEqual(schema.bundleId, null);
            assert.strictEqual(schema.version, null);
            assert.strictEqual(schema.buildNumber, null);
            assert.strictEqual(schema.deploymentTarget, null);
            assert.ok(Array.isArray(schema.permissions));
            assert.ok(Array.isArray(schema.urlSchemes));
            assert.strictEqual(schema.lastRead, null);
        });

        it('should store and retrieve complex memory with nested data', () => {
            const data = {
                ...MEMORY_SCHEMAS['ios-dependencies'],
                spmPackages: [
                    {
                        url: 'https://github.com/Alamofire/Alamofire.git',
                        version: '5.8.0',
                    },
                ],
                cocoaPods: [{ name: 'SwiftLint', version: '~> 0.54' }],
                lastSync: new Date().toISOString(),
            };

            const filePath = path.join(MEMORY_DIR, 'ios-dependencies.json');
            writeJson(filePath, data);

            const loaded = readJson(filePath);
            assert.strictEqual(loaded.spmPackages.length, 1);
            assert.strictEqual(loaded.spmPackages[0].version, '5.8.0');
            assert.strictEqual(loaded.cocoaPods.length, 1);
            assert.strictEqual(loaded.cocoaPods[0].name, 'SwiftLint');
        });
    });
});
