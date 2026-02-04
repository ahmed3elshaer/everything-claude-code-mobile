#!/usr/bin/env node
/**
 * Mobile Memory MCP Server
 *
 * Persistent memory system for mobile development context across sessions.
 * Maintains project structure, dependencies, architecture, and test state.
 */

const fs = require('fs');
const path = require('path');

// MCP Server SDK (assuming stdio transport)
const MCPServer = require('@modelcontextprotocol/sdk/server/index.js').Server;
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Configuration
const MEMORY_DIR = process.env.MOBILE_MEMORY_DIR || '.claude/mobile-memory';
const MAX_SIZE = process.env.MOBILE_MEMORY_MAX_SIZE || '10MB';
const RETENTION = process.env.MOBILE_MEMORY_RETENTION || '90days';

// Memory storage paths
const getMemoryDir = () => path.join(process.cwd(), MEMORY_DIR);
const ensureMemoryDir = () => {
    const dir = getMemoryDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

const getMemoryPath = (type) => path.join(ensureMemoryDir(), `${type}.json`);

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

// Memory type schemas and defaults
const MEMORY_SCHEMAS = {
    'project-structure': {
        modules: [],
        buildVariants: ['debug', 'release'],
        sourceSets: { main: 'src/main/java', debug: 'src/debug/java', release: 'src/release/java' },
        featureModules: [],
        lastUpdated: null
    },
    'dependencies': {
        libraries: [],
        plugins: [],
        kgpVersion: null,
        gradleVersion: null,
        lastSync: null
    },
    'architecture': {
        pattern: null,
        uiLayer: { screens: [], components: [], viewmodels: [] },
        dataLayer: { repositories: [], datasources: [], models: [] },
        domainLayer: { usecases: [], models: [] },
        di: { framework: null, modules: [] },
        lastAnalyzed: null
    },
    'test-coverage': {
        modules: [],
        totalCoverage: 0,
        trend: 'stable',
        failingTests: [],
        flakyTests: [],
        lastRun: null
    },
    'compose-screens': {
        screens: [],
        navigation: { type: null, graphFile: null },
        lastIndexed: null
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

// Android project detection
function isAndroidProject(dir) {
    const indicators = [
        'build.gradle.kts',
        'build.gradle',
        'app/build.gradle.kts',
        'settings.gradle.kts',
        'src/main/AndroidManifest.xml'
    ];
    return indicators.some(indicator => fs.existsSync(path.join(dir, indicator)));
}

// Extract project structure from Gradle files
function extractProjectStructure(projectRoot) {
    const structure = { ...MEMORY_SCHEMAS['project-structure'] };

    // Read settings.gradle.kts for modules
    const settingsPath = path.join(projectRoot, 'settings.gradle.kts');
    if (fs.existsSync(settingsPath)) {
        const settings = fs.readFileSync(settingsPath, 'utf8');
        // Extract module includes
        const includeMatches = settings.matchAll(/include\s*\("([^"]+)"\)/g);
        structure.modules = Array.from(includeMatches).map(m => m[1].replace(':', '/'));

        // Also find feature modules (common pattern)
        const featureMatches = settings.matchAll(/include\s*\("feature:([^"]+)"\)/g);
        structure.featureModules = Array.from(featureMatches).map(m => m[1]);
    }

    structure.lastUpdated = getTimestamp();
    return structure;
}

// Extract dependencies from build.gradle.kts files
function extractDependencies(projectRoot) {
    const deps = { ...MEMORY_SCHEMAS['dependencies'] };

    // Read gradle wrapper properties
    const wrapperPath = path.join(projectRoot, 'gradle/wrapper/gradle-wrapper.properties');
    if (fs.existsSync(wrapperPath)) {
        const wrapper = fs.readFileSync(wrapperPath, 'utf8');
        const versionMatch = wrapper.match(/gradle\-([\d.]+)/);
        if (versionMatch) {
            deps.gradleVersion = versionMatch[1];
        }
    }

    // Read build.gradle.kts files for dependencies
    const buildFiles = [
        path.join(projectRoot, 'build.gradle.kts'),
        path.join(projectRoot, 'app/build.gradle.kts'),
        path.join(projectRoot, 'gradle/libs.versions.toml')
    ];

    for (const buildFile of buildFiles) {
        if (fs.existsSync(buildFile)) {
            const content = fs.readFileSync(buildFile, 'utf8');

            // Extract Kotlin Gradle Plugin version
            const kgpMatch = content.match(/kotlin\("jvm"\)\s*version\s*["']([^"']+)["']/);
            if (kgpMatch) deps.kgpVersion = kgpMatch[1];

            // Extract plugins
            const pluginMatches = content.matchAll(/id\s*\(\s*["']([^"']+)["']\s*\)/g);
            for (const match of pluginMatches) {
                if (!deps.plugins.includes(match[1])) {
                    deps.plugins.push(match[1]);
                }
            }

            // Extract library dependencies (simple pattern)
            const libMatches = content.matchAll(/implementation\s*\(\s*["']([^:"']+)[:/]([^:"']+)[:/]([^"']+)["']\s*\)/g);
            for (const match of libMatches) {
                deps.libraries.push({
                    group: match[1],
                    name: match[2],
                    version: match[3],
                    type: 'implementation'
                });
            }
        }
    }

    deps.lastSync = getTimestamp();
    return deps;
}

// Extract architecture from code structure
function extractArchitecture(projectRoot) {
    const arch = { ...MEMORY_SCHEMAS['architecture'] };

    const srcMain = path.join(projectRoot, 'src/main/java');
    if (!fs.existsSync(srcMain)) {
        arch.lastAnalyzed = getTimestamp();
        return arch;
    }

    // Detect architecture pattern by directory structure
    function scanDirectory(dir, baseLen) {
        const items = [];
        if (!fs.existsSync(dir)) return items;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                items.push(...scanDirectory(path.join(dir, entry.name), baseLen));
            } else if (entry.name.endsWith('.kt')) {
                items.push(path.relative(baseLen, path.join(dir, entry.name)));
            }
        }
        return items;
    }

    const allFiles = scanDirectory(srcMain, srcMain.length + 1);

    // Categorize files
    for (const file of allFiles) {
        const parts = file.split(path.sep);

        // UI Layer
        if (file.includes('ui') || file.includes('screen') || file.includes('Screen.kt')) {
            if (file.includes('ViewModel')) {
                arch.uiLayer.viewmodels.push(file);
            } else if (file.includes('Screen')) {
                arch.uiLayer.screens.push(file);
            } else {
                arch.uiLayer.components.push(file);
            }
        }

        // Data Layer
        if (file.includes('repository') || file.includes('Repository')) {
            arch.dataLayer.repositories.push(file);
        }
        if (file.includes('datasource') || file.includes('DataSource')) {
            arch.dataLayer.datasources.push(file);
        }

        // Domain Layer
        if (file.includes('usecase') || file.includes('UseCase')) {
            arch.domainLayer.usecases.push(file);
        }
    }

    // Detect DI framework
    const koinExists = allFiles.some(f => f.includes('di') || f.includes('module'));
    if (koinExists) {
        arch.di.framework = 'koin';
    }

    // Detect architecture pattern
    const hasViewModels = arch.uiLayer.viewmodels.length > 0;
    const hasRepositories = arch.dataLayer.repositories.length > 0;
    const hasUseCases = arch.domainLayer.usecases.length > 0;

    if (hasUseCases && hasRepositories) {
        arch.pattern = 'clean-architecture';
    } else if (hasViewModels) {
        arch.pattern = 'mvvm';
    }

    arch.lastAnalyzed = getTimestamp();
    return arch;
}

// Extract Compose screens
function extractComposeScreens(projectRoot) {
    const screens = { ...MEMORY_SCHEMAS['compose-screens'] };

    const srcDirs = [
        path.join(projectRoot, 'src/main/java'),
        path.join(projectRoot, 'app/src/main/java')
    ];

    for (const srcDir of srcDirs) {
        if (!fs.existsSync(srcDir)) continue;

        function findComposeScreens(dir) {
            if (!fs.existsSync(dir)) return;

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    findComposeScreens(fullPath);
                } else if (entry.name.endsWith('.kt')) {
                    const content = fs.readFileSync(fullPath, 'utf8');

                    // Find @Composable functions ending in "Screen"
                    const composableMatches = content.matchAll(/@Composable\s+(?:fun\s+)?(\w+Screen)/g);
                    for (const match of composableMatches) {
                        const screenName = match[1];
                        screens.screens.push({
                            name: screenName,
                            file: path.relative(projectRoot, fullPath),
                            previewable: content.includes('@Preview'),
                            testable: false // Would need to check test files
                        });
                    }
                }
            }
        }

        findComposeScreens(srcDir);
    }

    screens.lastIndexed = getTimestamp();
    return screens;
}

// MCP Server implementation
class MobileMemoryServer {
    constructor() {
        this.server = new MCPServer(
            {
                name: 'mobile-memory',
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
            const resources = Object.keys(MEMORY_SCHEMAS).map(type => ({
                uri: `memory://${type}`,
                name: type,
                description: `${type} memory`,
                mimeType: 'application/json'
            }));
            return { resources };
        });

        // Read resource
        this.server.setRequestHandler('resources/read', async (request) => {
            const uri = request.params.uri;
            const type = uri.replace('memory://', '');

            if (!MEMORY_SCHEMAS[type]) {
                throw new Error(`Unknown memory type: ${type}`);
            }

            const memoryPath = getMemoryPath(type);
            let data = readJson(memoryPath);

            if (!data) {
                // Return empty schema
                data = { ...MEMORY_SCHEMAS[type] };
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
                        name: 'memory-save',
                        description: 'Save memory data for a specific type',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: Object.keys(MEMORY_SCHEMAS),
                                    description: 'Memory type to save'
                                },
                                data: {
                                    type: 'object',
                                    description: 'Data to save'
                                },
                                refresh: {
                                    type: 'boolean',
                                    description: 'Refresh from project before saving',
                                    default: false
                                }
                            },
                            required: ['type']
                        }
                    },
                    {
                        name: 'memory-load',
                        description: 'Load memory data for a specific type',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: Object.keys(MEMORY_SCHEMAS),
                                    description: 'Memory type to load'
                                }
                            },
                            required: ['type']
                        }
                    },
                    {
                        name: 'memory-query',
                        description: 'Query memory with natural language',
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
                        name: 'memory-summary',
                        description: 'Get summary of all memory types',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'memory-forget',
                        description: 'Remove specific memory data',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: Object.keys(MEMORY_SCHEMAS),
                                    description: 'Memory type to forget'
                                },
                                olderThan: {
                                    type: 'string',
                                    description: 'Forget data older than (e.g., 30days)'
                                }
                            }
                        }
                    },
                    {
                        name: 'memory-refresh',
                        description: 'Refresh all memory from current project',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                types: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Specific types to refresh (all if empty)'
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
                case 'memory-save': {
                    const type = args.type;
                    let data = args.data;

                    if (args.refresh) {
                        data = await this.refreshMemoryType(type, projectRoot);
                    } else if (!data) {
                        data = MEMORY_SCHEMAS[type];
                    }

                    const memoryPath = getMemoryPath(type);
                    const existing = readJson(memoryPath) || {};
                    const merged = { ...existing, ...data, lastUpdated: getTimestamp() };
                    writeJson(memoryPath, merged);

                    return {
                        content: [{
                            type: 'text',
                            text: `Saved ${type} memory`
                        }]
                    };
                }

                case 'memory-load': {
                    const type = args.type;
                    const memoryPath = getMemoryPath(type);
                    let data = readJson(memoryPath);

                    if (!data) {
                        // Try to refresh from project
                        data = await this.refreshMemoryType(type, projectRoot);
                        writeJson(memoryPath, data);
                    }

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(data, null, 2)
                        }]
                    };
                }

                case 'memory-query': {
                    const query = args.query.toLowerCase();
                    const results = [];

                    // Search across all memory types
                    for (const type of Object.keys(MEMORY_SCHEMAS)) {
                        const memoryPath = getMemoryPath(type);
                        const data = readJson(memoryPath);
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

                case 'memory-summary': {
                    const summary = {};

                    for (const type of Object.keys(MEMORY_SCHEMAS)) {
                        const memoryPath = getMemoryPath(type);
                        const data = readJson(memoryPath);
                        if (data) {
                            summary[type] = {
                                exists: true,
                                lastUpdated: data.lastUpdated || data.lastSync || data.lastAnalyzed || data.lastIndexed || data.lastRun,
                                size: JSON.stringify(data).length
                            };
                        } else {
                            summary[type] = { exists: false };
                        }
                    }

                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify(summary, null, 2)
                        }]
                    };
                }

                case 'memory-forget': {
                    if (args.type) {
                        const memoryPath = getMemoryPath(args.type);
                        if (fs.existsSync(memoryPath)) {
                            fs.unlinkSync(memoryPath);
                        }
                        return {
                            content: [{
                                type: 'text',
                                text: `Forgot ${args.type} memory`
                            }]
                        };
                    }
                    return {
                        content: [{ type: 'text', text: 'No memory type specified' }]
                    };
                }

                case 'memory-refresh': {
                    const types = args.types || Object.keys(MEMORY_SCHEMAS);
                    const results = {};

                    for (const type of types) {
                        if (MEMORY_SCHEMAS[type]) {
                            const data = await this.refreshMemoryType(type, projectRoot);
                            const memoryPath = getMemoryPath(type);
                            writeJson(memoryPath, data);
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

    async refreshMemoryType(type, projectRoot) {
        if (!isAndroidProject(projectRoot)) {
            return { error: 'Not an Android project' };
        }

        switch (type) {
            case 'project-structure':
                return extractProjectStructure(projectRoot);
            case 'dependencies':
                return extractDependencies(projectRoot);
            case 'architecture':
                return extractArchitecture(projectRoot);
            case 'compose-screens':
                return extractComposeScreens(projectRoot);
            default:
                return { ...MEMORY_SCHEMAS[type], lastUpdated: getTimestamp() };
        }
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        // Initialize memory directory
        ensureMemoryDir();

        console.error('Mobile Memory MCP Server running');
    }
}

// Start server
if (require.main === module) {
    const server = new MobileMemoryServer();
    server.start().catch(console.error);
}

module.exports = { MobileMemoryServer };
