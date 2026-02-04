#!/usr/bin/env node
/**
 * iOS Memory MCP Server
 *
 * Persistent memory system for iOS development context across sessions.
 * Maintains Xcode project structure, SwiftUI views, Swift Package Manager dependencies,
 * CocoaPods, and test state.
 */

const fs = require('fs');
const path = require('path');

// MCP Server SDK
const MCPServer = require('@modelcontextprotocol/sdk/server/index.js').Server;
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Configuration
const MEMORY_DIR = process.env.IOS_MEMORY_DIR || '.claude/ios-memory';
const MAX_SIZE = process.env.IOS_MEMORY_MAX_SIZE || '10MB';
const RETENTION = process.env.IOS_MEMORY_RETENTION || '90days';

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
    'xcode-project': {
        projectFile: null,
        workspace: null,
        targets: [],
        schemes: [],
        configurations: [],
        lastAnalyzed: null
    },
    'swiftui-views': {
        views: [],
        navigationPaths: [],
        sheets: [],
        previews: [],
        lastIndexed: null
    },
    'ios-dependencies': {
        spmPackages: [],
        cocoaPods: [],
        frameworks: [],
        systemFrameworks: [],
        lastSync: null
    },
    'ios-schemes': {
        schemes: [],
        runConfigurations: [],
        lastListed: null
    },
    'ios-tests': {
        unitTestTargets: [],
        uiTestTargets: [],
        testCount: 0,
        coverage: 0,
        failingTests: [],
        lastRun: null
    },
    'info-plist': {
        bundleId: null,
        version: null,
        buildNumber: null,
        deploymentTarget: null,
        permissions: [],
        urlSchemes: [],
        lastRead: null
    }
};

// iOS project detection
function isIOSProject(dir) {
    const indicators = [
        '*.xcodeproj',
        '*.xcworkspace',
        'Podfile',
        'Package.swift',
        'Info.plist'
    ];

    // Check for xcodeproj or xcworkspace
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
    for (const entry of entries) {
        if (entry.isDirectory() && (entry.name.endsWith('.xcodeproj') || entry.name.endsWith('.xcworkspace'))) {
            return true;
        }
    }

    // Check for Podfile or Package.swift
    if (fs.existsSync(path.join(dir, 'Podfile')) || fs.existsSync(path.join(dir, 'Package.swift'))) {
        return true;
    }

    // Check for Info.plist in common locations
    const plistLocations = [
        path.join(dir, 'Info.plist'),
        path.join(dir, 'app', 'Info.plist'),
        path.join(dir, 'ios', 'Info.plist')
    ];
    if (plistLocations.some(p => fs.existsSync(p))) {
        return true;
    }

    return false;
}

// Find Xcode project file
function findXcodeProject(dir) {
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];

    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('.xcodeproj')) {
            return path.join(dir, entry.name, 'project.pbxproj');
        }
    }

    // Check subdirectories
    const iosDir = path.join(dir, 'ios');
    if (fs.existsSync(iosDir)) {
        return findXcodeProject(iosDir);
    }

    return null;
}

// Extract Xcode project structure
function extractXcodeProject(projectRoot) {
    const structure = { ...MEMORY_SCHEMAS['xcode-project'] };

    // Find project file
    const projectFile = findXcodeProject(projectRoot);
    if (projectFile) {
        structure.projectFile = projectFile;
        const relativePath = path.relative(projectRoot, projectFile);
        structure.workspace = relativePath.replace('/project.pbxproj', '');
    }

    // Look for xcworkspace
    const entries = fs.existsSync(projectRoot) ? fs.readdirSync(projectRoot, { withFileTypes: true }) : [];
    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('.xcworkspace')) {
            structure.workspace = entry.name;
            break;
        }
    }

    // Extract targets and schemes from project file
    if (projectFile && fs.existsSync(projectFile)) {
        const content = fs.readFileSync(projectFile, 'utf8');

        // Extract targets (PBXNativeTarget)
        const targetMatches = content.matchAll(/PBXNativeTarget\s*\/\*\s*((?:\w|\s)+?)\s*\*\//g);
        structure.targets = Array.from(targetMatches).map(m => m[1].trim());

        // Extract schemes
        const schemeMatches = content.matchAll(/([A-Za-z0-9_]+)\.xcscheme/g);
        const uniqueSchemes = new Set(Array.from(schemeMatches).map(m => m.replace('.xcscheme', '')));
        structure.schemes = Array.from(uniqueSchemes);

        // Extract configurations
        const configMatches = content.matchAll(/buildConfigList\s*=\s*\(([^)]+)\)/g);
        if (configMatches) {
            const configs = configMatches[0][1].split(',').map(c => c.trim().replace(/"/g, ''));
            structure.configurations = configs;
        }
    }

    // Look for xcshareddata in derived data location (for user schemes)
    const schemeDirs = [
        path.join(projectRoot, 'xcshareddata', 'xcschemes'),
        path.join(projectRoot, 'ios', 'xcshareddata', 'xcschemes')
    ];

    for (const schemeDir of schemeDirs) {
        if (fs.existsSync(schemeDir)) {
            const schemeFiles = fs.readdirSync(schemeDir).filter(f => f.endsWith('.xcscheme'));
            for (const schemeFile of schemeFiles) {
                const schemeName = schemeFile.replace('.xcscheme', '');
                if (!structure.schemes.includes(schemeName)) {
                    structure.schemes.push(schemeName);
                }
            }
        }
    }

    structure.lastAnalyzed = getTimestamp();
    return structure;
}

// Extract SwiftUI views
function extractSwiftUIViews(projectRoot) {
    const views = { ...MEMORY_SCHEMAS['swiftui-views'] };

    // Common Swift source directories
    const sourceDirs = findSwiftSourceDirs(projectRoot);

    for (const srcDir of sourceDirs) {
        if (!fs.existsSync(srcDir)) continue;

        findSwiftFiles(srcDir, (filePath, fileName) => {
            const content = fs.readFileSync(filePath, 'utf8');

            // Find struct conforming to View
            const viewMatches = content.matchAll(/struct\s+(\w+)\s*:\s*View\s*{/g);
            for (const match of viewMatches) {
                const viewName = match[1];
                views.views.push({
                    name: viewName,
                    file: path.relative(projectRoot, filePath),
                    hasPreview: content.includes('#Preview'),
                    stateProperties: extractStateProperties(content, viewName)
                });
            }

            // Find NavigationDestination
            const navMatches = content.matchAll(/NavigationDestination\s*\(\s*(?:\w+:)?\s*(\w+)\s*\)/g);
            for (const match of navMatches) {
                views.navigationPaths.push(match[2]);
            }

            // Find sheet presentations
            if (content.includes('.sheet(') || content.includes('.sheet(isPresented:')) {
                const sheetMatches = content.matchAll(/(?:isPresented|isPresented:)\s*:\s*\$?(\w+)/g);
                for (const match of sheetMatches) {
                    if (!views.sheets.includes(match[1])) {
                        views.sheets.push(match[1]);
                    }
                }
            }
        });
    }

    // Count views with previews
    views.previews = views.views.filter(v => v.hasPreview);

    views.lastIndexed = getTimestamp();
    return views;
}

// Helper: Find Swift source directories
function findSwiftSourceDirs(projectRoot) {
    const dirs = [];

    // Common iOS project structures
    const possibleDirs = [
        path.join(projectRoot, 'Sources'),
        path.join(projectRoot, 'app'),
        path.join(projectRoot, 'ios', 'Sources'),
        path.join(projectRoot, 'ios'),
        path.join(projectRoot, 'shared')
    ];

    for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
            dirs.push(dir);

            // Also check subdirectories with .swift files
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subDir = path.join(dir, entry.name);
                    if (fs.existsSync(path.join(subDir, 'file.swift')) ||
                        fs.existsSync(path.join(subDir, `${entry.name}.swift`))) {
                        dirs.push(subDir);
                    }
                }
            }
        }
    }

    return dirs;
}

// Helper: Recursively find Swift files
function findSwiftFiles(dir, callback) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findSwiftFiles(fullPath, callback);
        } else if (entry.name.endsWith('.swift')) {
            callback(fullPath, entry.name);
        }
    }
}

// Helper: Extract @State and @Published properties
function extractStateProperties(content, viewName) {
    const properties = [];

    // Find @State properties
    const stateMatches = content.matchAll(/@State\s+(?:var|let)\s+(\w+)\s*:\s*(\S+)/g);
    for (const match of stateMatches) {
        properties.push({ name: match[1], type: match[2], kind: 'State' });
    }

    // Find @Binding properties
    const bindingMatches = content.matchAll/@Binding\s+(?:var|let)\s+(\w+)\s*:\s*(\S+)/g);
    for (const match of bindingMatches) {
        properties.push({ name: match[1], type: match[2], kind: 'Binding' });
    }

    // Find @ObservedObject properties
    const observedMatches = content.matchAll/@ObservedObject\s+(?:var|let)\s+(\w+)\s*:\s*(\S+)/g);
    for (const match of observedMatches) {
        properties.push({ name: match[1], type: match[2], kind: 'ObservedObject' });
    }

    return properties;
}

// Extract iOS dependencies
function extractIOSDependencies(projectRoot) {
    const deps = { ...MEMORY_SCHEMAS['ios-dependencies'] };

    // Swift Package Manager
    const packageFile = path.join(projectRoot, 'Package.swift');
    if (fs.existsSync(packageFile)) {
        const content = fs.readFileSync(packageFile, 'utf8');

        // Extract package dependencies
        const packageMatches = content.matchAll(/package\s*\(\s*url:\s*["']([^"']+)["'](?:,\s*from:\s*["']([^"']+)["'](?:,\s*exact:)?/g);
        for (const match of packageMatches) {
            deps.spmPackages.push({
                url: match[1],
                version: match[2] || 'branch'
            });
        }
    }

    // CocoaPods
    const podfile = path.join(projectRoot, 'Podfile');
    if (fs.existsSync(podfile)) {
        const content = fs.readFileSync(podfile, 'utf8');

        // Extract pod dependencies
        const podMatches = content.matchAll(/pod\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g);
        for (const match of podMatches) {
            deps.cocoaPods.push({
                name: match[1],
                version: match[2] || null
            });
        }
    }

    // System frameworks from project file
    const projectFile = findXcodeProject(projectRoot);
    if (projectFile) {
        const content = fs.readFileSync(projectFile, 'utf8');

        // Extract linked frameworks
        const frameworkMatches = content.matchAll(/([\w.]+\.framework)/g);
        const uniqueFrameworks = new Set(Array.from(frameworkMatches));
        deps.frameworks = Array.from(uniqueFrameworks).filter(f => f.endsWith('.framework'));
    }

    deps.lastSync = getTimestamp();
    return deps;
}

// Extract Info.plist data
function extractInfoPlist(projectRoot) {
    const info = { ...MEMORY_SCHEMAS['info-plist'] };

    // Common Info.plist locations
    const plistLocations = [
        path.join(projectRoot, 'Info.plist'),
        path.join(projectRoot, 'app', 'Info.plist'),
        path.join(projectRoot, 'ios', 'Info.plist'),
        path.join(projectRoot, 'ios', 'app', 'Info.plist')
    ];

    // Also look in bundle directories
    const entries = fs.existsSync(projectRoot) ? fs.readdirSync(projectRoot, { withFileTypes: true }) : [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const bundleDir = path.join(projectRoot, entry.name);
            const bundlePlist = path.join(bundleDir, 'Info.plist');
            if (fs.existsSync(bundlePlist)) {
                plistLocations.push(bundlePlist);
            }
        }
    }

    for (const plistPath of plistLocations) {
        if (fs.existsSync(plistPath)) {
            const content = fs.readFileSync(plistPath, 'utf8');

            // Extract bundle identifier
            const bundleIdMatch = content.match(/<key>CFBundleIdentifier<\/key>\s*\n*\s*<string>([^<]+)<\/string>/);
            if (bundleIdMatch) {
                info.bundleId = bundleIdMatch[1];
            }

            // Extract version
            const versionMatch = content.match(/<key>CFBundleShortVersionString<\/key>\s*\n*\s*<string>([^<]+)<\/string>/);
            if (versionMatch) {
                info.version = versionMatch[1];
            }

            // Extract build number
            const buildMatch = content.match(/<key>CFBundleVersion<\/key>\s*\n*\s*<string>([^<]+)<\/string>/);
            if (buildMatch) {
                info.buildNumber = buildMatch[1];
            }

            // Extract deployment target
            const platformMatch = content.match(/<key>IPHONEOS_DEPLOYMENT_TARGET<\/key>\s*\n*\s*<string>([^<]+)<\/string>/);
            if (platformMatch) {
                info.deploymentTarget = platformMatch[1];
            }

            // Extract permissions
            const permissions = [];
            const permissionMatches = content.matchAll(/<key>NS[^<]*Permission[^<]*<\/key>\s*\n*\s*<(?:true|string)>/g);
            for (const match of permissionMatches) {
                const permissionName = match[0].match(/NS(.*?)Permission/)?.[1];
                if (permissionName) {
                    permissions.push(permissionName);
                }
            }
            info.permissions = permissions;

            // Extract URL schemes
            const urlMatches = content.matchAll(/<key>CFBundleURLSchemes<\/key>[\s\S]*?<array>[\s\S]*?<\/array>/g);
            if (urlMatches) {
                const schemes = [];
                const schemeMatches = urlMatches[0].matchAll(/<string>([^<]+)<\/string>/g);
                for (const match of schemeMatches) {
                    schemes.push(match[1]);
                }
                info.urlSchemes = schemes;
            }

            info.lastRead = getTimestamp();
            break;
        }
    }

    return info;
}

// MCP Server implementation
class IOSMemoryServer {
    constructor() {
        this.server = new MCPServer(
            {
                name: 'ios-memory',
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
                uri: `ios-memory://${type}`,
                name: type,
                description: `iOS ${type}`,
                mimeType: 'application/json'
            }));
            return { resources };
        });

        // Read resource
        this.server.setRequestHandler('resources/read', async (request) => {
            const uri = request.params.uri;
            const type = uri.replace('ios-memory://', '');

            if (!MEMORY_SCHEMAS[type]) {
                throw new Error(`Unknown memory type: ${type}`);
            }

            const memoryPath = getMemoryPath(type);
            let data = readJson(memoryPath);

            if (!data) {
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
                        name: 'ios-save',
                        description: 'Save iOS memory data for a specific type',
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
                        name: 'ios-load',
                        description: 'Load iOS memory data for a specific type',
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
                        name: 'ios-query',
                        description: 'Query iOS memory with natural language',
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
                        name: 'ios-summary',
                        description: 'Get summary of all iOS memory types',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'ios-refresh',
                        description: 'Refresh all iOS memory from current project',
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
                case 'ios-save': {
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
                            text: `Saved iOS ${type} memory`
                        }]
                    };
                }

                case 'ios-load': {
                    const type = args.type;
                    const memoryPath = getMemoryPath(type);
                    let data = readJson(memoryPath);

                    if (!data) {
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

                case 'ios-query': {
                    const query = args.query.toLowerCase();
                    const results = [];

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

                case 'ios-summary': {
                    const summary = {};

                    for (const type of Object.keys(MEMORY_SCHEMAS)) {
                        const memoryPath = getMemoryPath(type);
                        const data = readJson(memoryPath);
                        if (data) {
                            summary[type] = {
                                exists: true,
                                lastUpdated: data.lastUpdated || data.lastSync || data.lastAnalyzed || data.lastIndexed || data.lastRead,
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

                case 'ios-refresh': {
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
        if (!isIOSProject(projectRoot)) {
            return { error: 'Not an iOS project', projectRoot };
        }

        switch (type) {
            case 'xcode-project':
                return extractXcodeProject(projectRoot);
            case 'swiftui-views':
                return extractSwiftUIViews(projectRoot);
            case 'ios-dependencies':
                return extractIOSDependencies(projectRoot);
            case 'info-plist':
                return extractInfoPlist(projectRoot);
            default:
                return { ...MEMORY_SCHEMAS[type], lastUpdated: getTimestamp() };
        }
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        // Initialize memory directory
        ensureMemoryDir();

        console.error('iOS Memory MCP Server running');
    }
}

// Start server
if (require.main === module) {
    const server = new IOSMemoryServer();
    server.start().catch(console.error);
}

module.exports = { IOSMemoryServer };
