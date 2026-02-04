#!/usr/bin/env node
/**
 * KMP Context MCP Server
 *
 * Context server for Kotlin Multiplatform projects.
 * Tracks shared modules, source sets, expect/actual declarations,
 * and cross-platform dependencies.
 */

const fs = require('fs');
const path = require('path');

// MCP Server SDK
const MCPServer = require('@modelcontextprotocol/sdk/server/index.js').Server;
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Configuration
const CONTEXT_DIR = process.env.KMP_CONTEXT_DIR || '.claude/kmp-context';
const AUTO_DETECT = process.env.KMP_AUTO_DETECT === 'true';

// Context storage paths
const getContextDir = () => path.join(process.cwd(), CONTEXT_DIR);
const ensureContextDir = () => {
    const dir = getContextDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

const getContextPath = (type) => path.join(ensureContextDir(), `${type}.json`);

// Utility functions
const readJson = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        // Return null on error
    }
    return null;
};

const writeJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const getTimestamp = () => new Date().toISOString();

// Context schemas
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

// KMP project detection
function isKMPProject(dir) {
    // Check for kotlin("multiplatform") plugin
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

    // Check for shared module with commonMain
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

// Detect platform type of project
function detectProjectType(dir) {
    if (isKMPProject(dir)) {
        return 'kmp';
    }

    // Check for Android
    const androidIndicators = ['build.gradle.kts', 'settings.gradle.kts', 'AndroidManifest.xml'];
    let androidScore = 0;
    for (const ind of androidIndicators) {
        if (fs.existsSync(path.join(dir, ind)) || fs.existsSync(path.join(dir, 'app', ind))) {
            androidScore++;
        }
    }
    if (androidScore >= 2) return 'android';

    // Check for iOS
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

// Extract KMP module structure
function extractKMPModules(projectRoot) {
    const modules = { ...CONTEXT_SCHEMAS['kmp-modules'] };

    // Find shared module
    const sharedLocations = ['shared', 'common', 'core'];
    for (const location of sharedLocations) {
        const sharedPath = path.join(projectRoot, location);
        if (fs.existsSync(sharedPath)) {
            modules.sharedModule.name = location;
            modules.sharedModule.path = sharedPath;
            break;
        }
    }

    // Detect hierarchical structure (Xcode-style)
    const buildFiles = [
        path.join(projectRoot, 'settings.gradle.kts'),
        path.join(projectRoot, 'shared', 'build.gradle.kts')
    ];

    for (const buildFile of buildFiles) {
        if (fs.existsSync(buildFile)) {
            const content = fs.readFileSync(buildFile, 'utf8');
            if (content.includes('kotlin.android()') || content.includes('kotlin.ios()')) {
                // Old-style hierarchical
                modules.hierarchicalStructure = true;
            }
        }
    }

    // Extract targets from build.gradle.kts
    const targetPattern = /kotlin\((?:jvm|android|ios|js|wasm|native|linux|windows|macos|x64|arm64)/g;
    const targetMatches = new Set();

    for (const buildFile of buildFiles) {
        if (fs.existsSync(buildFile)) {
            const content = fs.readFileSync(buildFile, 'utf8');
            const matches = content.matchAll(targetPattern);
            for (const match of matches) {
                targetMatches.add(match[1].replace('.', '-'));
            }
        }
    }

    modules.targets = Array.from(targetMatches);

    modules.lastAnalyzed = getTimestamp();
    return modules;
}

// Extract source sets
function extractSourceSets(projectRoot) {
    const sourceSets = { ...CONTEXT_SCHEMAS['source-sets'] };

    // Find shared module
    const sharedPath = modules.sharedModule.path || findModulePath(projectRoot);
    if (!sharedPath) {
        return sourceSets;
    }

    // Map source set names to directory names
    const sourceSetMapping = {
        'commonMain': ['commonMain', 'commonMain/kotlin'],
        'commonTest': ['commonTest', 'commonTest/kotlin'],
        'androidMain': ['androidMain', 'androidMain/kotlin'],
        'androidTest': ['androidTest', 'androidTest/kotlin'],
        'iosMain': ['iosMain', 'iosMain/kotlin'],
        'iosTest': ['iosTest', 'iosTest/kotlin'],
        'desktopMain': ['desktopMain', 'desktopMain/kotlin']
    };

    for (const [sourceSet, dirPatterns] of Object.entries(sourceSetMapping)) {
        for (const dirPattern of dirPatterns) {
            const dirPath = path.join(sharedPath, dirPattern);
            if (fs.existsSync(dirPath)) {
                sourceSets[sourceSet] = {
                    path: dirPath,
                    dependencies: extractSourceSetDependencies(dirPath),
                    packages: extractPackages(dirPath)
                };
                break;
            }
        }
    }

    sourceSets.lastIndexed = getTimestamp();
    return sourceSets;
}

function findModulePath(projectRoot) {
    const possiblePaths = ['shared', 'common', 'core'];
    for (const p of possiblePaths) {
        const testPath = path.join(projectRoot, p);
        if (fs.existsSync(testPath)) {
            return testPath;
        }
    }
    return null;
}

function extractSourceSetDependencies(sourceSetPath) {
    const dependencies = [];
    const buildFile = path.join(sourceSetPath, '../../build.gradle.kts');

    if (!fs.existsSync(buildFile)) {
        // Try at module root
        const moduleBuildFile = path.join(sourceSetPath, '../build.gradle.kts');
        if (!fs.existsSync(moduleBuildFile)) {
            return dependencies;
        }
    }

    // Simple extraction of implementation dependencies
    const content = fs.readFileSync(buildFile, 'utf8');
    const implMatches = content.matchAll(/implementation\s*\(\s*["']([^"']+)["']/g);

    for (const match of implMatches) {
        dependencies.push(match[1]);
    }

    return dependencies;
}

function extractPackages(sourceSetPath) {
    const packages = [];

    if (!fs.existsSync(sourceSetPath)) {
        return packages;
    }

    function scanDirectory(dir, basePackage = '') {
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                // Check if this is a package directory (contains .kt files)
                const subPath = path.join(dir, entry.name);
                const hasKotlinFiles = fs.readdirSync(subPath).some(f => f.endsWith('.kt'));

                if (hasKotlinFiles) {
                    packages.push(basePackage ? `${basePackage}.${entry.name}` : entry.name);
                }

                scanDirectory(subPath, basePackage ? `${basePackage}.${entry.name}` : entry.name);
            }
        }
    }

    // Remove common Kotlin prefix
    const kotlinDir = path.join(sourceSetPath, 'kotlin');
    if (fs.existsSync(kotlinDir)) {
        scanDirectory(kotlinDir);
    } else {
        scanDirectory(sourceSetPath);
    }

    return packages;
}

// Extract expect/actual declarations
function extractExpectActual(projectRoot) {
    const declarations = { ...CONTEXT_SCHEMAS['expect-actual'] };

    const sharedPath = modules.sharedModule.path || findModulePath(projectRoot);
    if (!sharedPath) {
        return declarations;
    }

    const commonMain = path.join(sharedPath, 'commonMain');
    if (!fs.existsSync(commonMain)) {
        return declarations;
    }

    // Find all .kt files in commonMain
    function findExpectDeclarations(dir) {
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                findExpectDeclarations(fullPath);
            } else if (entry.name.endsWith('.kt')) {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Find expect declarations
                const expectMatches = content.matchAll(/expect\s+(class|object|fun|val|var)\s+(\w+)/g);
                for (const match of expectMatches) {
                    const kind = match[1];
                    const name = match[2];

                    declarations.declarations.push({
                        name,
                        kind,
                        expectLocation: {
                            file: path.relative(projectRoot, fullPath),
                            sourceSet: 'commonMain'
                        },
                        actualImplementations: findActualImplementations(sharedPath, name),
                        signature: extractExpectSignature(content, name, kind)
                    });
                }
            }
        }
    }

    findExpectDeclarations(commonMain);

    declarations.lastScanned = getTimestamp();
    return declarations;
}

function findActualImplementations(sharedPath, expectName) {
    const implementations = [];
    const platforms = ['android', 'ios', 'desktop', 'web'];

    for (const platform of platforms) {
        const platformMain = path.join(sharedPath, `${platform}Main`);
        if (!fs.existsSync(platformMain)) {
            // Try kotlin subdirectory
            const kotlinDir = path.join(platformMain, 'kotlin');
            if (!fs.existsSync(kotlinDir)) {
                continue;
            }
        }

        // Search for actual declaration
        function findActualInDir(dir) {
            if (!fs.existsSync(dir)) return null;

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const result = findActualInDir(path.join(dir, entry.name));
                    if (result) return result;
                } else if (entry.name.endsWith('.kt')) {
                    const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');

                    // Check for actual declaration
                    const actualPattern = new RegExp(`actual\\s+${expectName}\\b`);
                    if (actualPattern.test(content)) {
                        return {
                            platform,
                            location: {
                                file: path.join(dir, entry.name),
                                sourceSet: `${platform}Main`
                            }
                        };
                    }
                }
            }
            return null;
        }

        const actual = findActualInDir(platformMain);
        if (actual) {
            implementations.push(actual);
        }
    }

    return implementations;
}

function extractExpectSignature(content, name, kind) {
    // Extract the full expect declaration for better context
    const pattern = new RegExp(`expect\\s+${kind}\\s+${name}[^{\\n]*(?:\\([^)]*\\))?[^{\\n]*(?:\\{[^}]*\\})?`);
    const match = content.match(pattern);
    return match ? match[0].substring(0, 200) : `expect ${kind} ${name}`;
}

// Extract shared models
function extractSharedModels(projectRoot) {
    const models = { ...CONTEXT_SCHEMAS['shared-models'] };

    const sharedPath = modules.sharedModule.path || findModulePath(projectRoot);
    if (!sharedPath) {
        return models;
    }

    const commonMain = path.join(sharedPath, 'commonMain');
    if (!fs.existsSync(commonMain)) {
        return models;
    }

    // Find all @Serializable classes
    function findSerializableModels(dir, basePackage = '') {
        if (!fs.existsSync(dir)) return;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                findSerializableModels(fullPath, basePackage ? `${basePackage}.${entry.name}` : entry.name);
            } else if (entry.name.endsWith('.kt')) {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Find @Serializable data classes
                const serializableMatches = content.matchAll(/@Serializable\s+data class\s+(\w+)/g);
                for (const match of serializableMatches) {
                    models.models.push({
                        name: match[1],
                        file: path.relative(projectRoot, fullPath),
                        properties: extractDataClassProperties(content, match[1]),
                        isSealed: content.includes(`sealed ${match[1]}`) || content.includes(`sealed class ${match[1]}`)
                    });
                }

                // Find custom serializers
                const serializerMatches = content.matchAll(/object\s+(\w+)\s*:\s*KSerializer/);
                for (const match of serializerMatches) {
                    models.serializers.push({
                        type: match[1],
                        serializer: match[1]
                    });
                }

                // Check JSON config
                const jsonConfigMatches = content.matchAll(/Json\s*\{[^}]*ignoreUnknownKeys\s*=\s*(true|false)/g);
                for (const match of jsonConfigMatches) {
                    models.jsonConfig.ignoreUnknownKeys = match[1] === 'true';
                }
            }
        }
    }

    models.lastCatalogued = getTimestamp();
    return models;
}

function extractDataClassProperties(content, className) {
    // Extract properties from data class
    const classPattern = new RegExp(`data class\\s+${className}\\s*\\(([^)]*)\\)`);
    const match = content.match(classPattern);

    if (!match) return [];

    const propsStr = match[1];
    const properties = [];

    // Simple property extraction (name: Type, ...)
    const propMatches = propsStr.matchAll(/(\w+)\s*:\s*([^,)=]+)/g);
    for (const propMatch of propMatches) {
        const isNullable = propMatch[2].includes('?');
        const type = propMatch[2].replace('?', '').trim();
        properties.push({
            name: propMatch[1],
            type: type,
            nullable: isNullable
        });
    }

    return properties;
}

// Detect platform targets from build files
function detectPlatformTargets(projectRoot) {
    const targets = { ...CONTEXT_SCHEMAS['platform-targets'] };

    // Android targets
    const buildFile = path.join(projectRoot, 'app', 'build.gradle.kts');
    if (fs.existsSync(buildFile)) {
        const content = fs.readFileSync(buildFile, 'utf8');

        const minSdkMatch = content.match(/minSdk\s*=\s*(\d+)/);
        if (minSdkMatch) {
            targets.android.minSdk = minSdkMatch[1];
        }

        const targetSdkMatch = content.match(/targetSdk\s*=\s*(\d+)/);
        if (targetSdkMatch) {
            targets.android.targetSdk = targetSdkMatch[1];
        }
    }

    // iOS targets
    const plistLocations = [
        path.join(projectRoot, 'ios', 'Info.plist'),
        path.join(projectRoot, 'shared', 'iosMain', 'Info.plist')
    ];

    for (const plistPath of plistLocations) {
        if (fs.existsSync(plistPath)) {
            const content = fs.readFileSync(plistPath, 'utf8');
            const deploymentMatch = content.match(/IPHONEOS_DEPLOYMENT_TARGET<\/key>\s*\n*\s*<string>([^<]+)<\/string>/);
            if (deploymentMatch) {
                targets.ios.deploymentTarget = deploymentMatch[1];
                break;
            }
        }
    }

    targets.lastDetected = getTimestamp();
    return targets;
}

// Global reference to modules (set during extraction)
let modules = { sharedModule: {} };

// MCP Server implementation
class KMPContextServer {
    constructor() {
        this.server = new MCPServer(
            {
                name: 'kmp-context',
                version: '1.0.0'
            },
            {
                capabilities: {
                    resources: {},
                    tools: {},
                    prompts: {}
                }
            }
        );

        this.setupHandlers();
    }

    setupHandlers() {
        // List available resources
        this.server.setRequestHandler('resources/list', async () => {
            const resources = Object.keys(CONTEXT_SCHEMAS).map(type => ({
                uri: `kmp-context://${type}`,
                name: type,
                description: `KMP ${type}`,
                mimeType: 'application/json'
            }));
            return { resources };
        });

        // Read resource
        this.server.setRequestHandler('resources/read', async (request) => {
            const uri = request.params.uri;
            const type = uri.replace('kmp-context://', '');

            if (!CONTEXT_SCHEMAS[type]) {
                throw new Error(`Unknown context type: ${type}`);
            }

            const contextPath = getContextPath(type);
            let data = readJson(contextPath);

            if (!data) {
                data = { ...CONTEXT_SCHEMAS[type] };
            }

            return {
                contents: [{
                    uri,
                    mimeType: 'application/json',
                    text: JSON.stringify(data, null, 2)
                }]
            };
        });

        // List available tools
        this.server.setRequestHandler('tools/list', async () => {
            return {
                tools: [
                    {
                        name: 'kmp-detect',
                        description: 'Detect if current project is KMP and what type',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: 'kmp-query',
                        description: 'Query KMP context with natural language',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Natural language query'
                                }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'kmp-summary',
                        description: 'Get summary of KMP project context',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'kmp-refresh',
                        description: 'Refresh all KMP context from project',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                types: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Specific types to refresh'
                                }
                            }
                        }
                    }
                ]
            };
        });

        // Call tool
        this.server.setRequestHandler('tools/call', async (request) => {
            const { name, arguments: args } = request.params;
            const projectRoot = process.cwd();

            switch (name) {
                case 'kmp-detect': {
                    const type = detectProjectType(projectRoot);
                    const isKMP = type === 'kmp';

                    // Also extract module info if KMP
                    let moduleInfo = null;
                    if (isKMP) {
                        modules = extractKMPModules(projectRoot);
                        moduleInfo = {
                            sharedModule: modules.sharedModule.name,
                            targets: modules.targets
                        };
                    }

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({
                                type,
                                isKMP,
                                ...moduleInfo
                            }, null, 2)
                        }]
                    };
                }

                case 'kmp-query': {
                    const query = args.query.toLowerCase();
                    const results = [];

                    for (const type of Object.keys(CONTEXT_SCHEMAS)) {
                        const contextPath = getContextPath(type);
                        const data = readJson(contextPath);
                        if (data) {
                            const jsonStr = JSON.stringify(data);
                            if (jsonStr.toLowerCase().includes(query)) {
                                results.push({ type, data });
                            }
                        }
                    }

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(results, null, 2)
                        }]
                    };
                }

                case 'kmp-summary': {
                    const summary = {};

                    for (const type of Object.keys(CONTEXT_SCHEMAS)) {
                        const contextPath = getContextPath(type);
                        const data = readJson(contextPath);
                        if (data) {
                            summary[type] = {
                                exists: true,
                                lastUpdated: data.lastAnalyzed || data.lastIndexed || data.lastScanned || data.lastCatalogued || data.lastDetected
                            };
                        } else {
                            summary[type] = { exists: false };
                        }
                    }

                    // Add project type info
                    summary.projectType = detectProjectType(projectRoot);

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(summary, null, 2)
                        }]
                    };
                }

                case 'kmp-refresh': {
                    const types = args.types || Object.keys(CONTEXT_SCHEMAS);
                    const results = {};

                    // Update modules reference first
                    modules = extractKMPModules(projectRoot);

                    for (const type of types) {
                        if (CONTEXT_SCHEMAS[type]) {
                            let data;
                            switch (type) {
                                case 'kmp-modules':
                                    data = extractKMPModules(projectRoot);
                                    break;
                                case 'source-sets':
                                    data = extractSourceSets(projectRoot);
                                    break;
                                case 'expect-actual':
                                    data = extractExpectActual(projectRoot);
                                    break;
                                case 'shared-models':
                                    data = extractSharedModels(projectRoot);
                                    break;
                                case 'platform-targets':
                                    data = detectPlatformTargets(projectRoot);
                                    break;
                                default:
                                    data = { ...CONTEXT_SCHEMAS[type], lastUpdated: getTimestamp() };
                            }
                            const contextPath = getContextPath(type);
                            writeJson(contextPath, data);
                            results[type] = 'refreshed';
                        }
                    }

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(results, null, 2)
                        }]
                    };
                }

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        // Initialize context directory
        ensureContextDir();

        console.error('KMP Context MCP Server running');
    }
}

// Start server
if (require.main === module) {
    const server = new KMPContextServer();
    server.start().catch(console.error);
}

module.exports = { KMPContextServer };
