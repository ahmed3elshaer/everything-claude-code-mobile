#!/usr/bin/env node
/**
 * V2 Instinct: Track Gradle dependency changes
 *
 * Tracks when dependencies are added, removed, or updated
 * to understand the project's evolution and patterns.
 */

const fs = require('fs');
const path = require('path');

const { getInstinctsDir, ensureDir, getTimestamp } = require('../lib/utils');

function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Usage: track-dependency.js <build-file-path>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    // Extract dependencies
    const dependencies = [];

    // Extract implementation dependencies
    const implMatches = content.matchAll(/implementation\s*\(\s*(?:project|":)?([^:]+):([^:]+):([^")\s]+)\s*\)/g);
    for (const match of implMatches) {
        dependencies.push({
            type: 'implementation',
            group: match[1].replace(/['"]/g, ''),
            name: match[2],
            version: match[3].replace(/['"\s]/g, '')
        });
    }

    // Extract test implementation dependencies
    const testImplMatches = content.matchAll(/testImplementation\s*\(\s*(?:project|":)?([^:]+):([^:]+):([^")\s]+)\s*\)/g);
    for (const match of testImplMatches) {
        dependencies.push({
            type: 'testImplementation',
            group: match[1].replace(/['"]/g, ''),
            name: match[2],
            version: match[3].replace(/['"\s]/g, '')
        });
    }

    // Extract ksp/kapt plugins
    const kspMatches = content.matchAll/(ksp|kapt)\s*\(\s*"([^:]+):([^:]+):([^")]+)"\s*\)/g);
    for (const match of kspMatches) {
        dependencies.push({
            type: match[1],
            group: match[2],
            name: match[3],
            version: match[4]
        });
    }

    // Extract plugin IDs
    const pluginMatches = content.matchAll/id\s*\(\s*"([^"]+)"\s*\)/g);
    const plugins = Array.from(pluginMatches).map(m => m[1]);

    // Track changes
    const instinctsDir = ensureDir(getInstinctsDir());
    const dependencyHistoryFile = path.join(instinctsDir, 'dependency-history.json');

    let history = {};
    if (fs.existsSync(dependencyHistoryFile)) {
        history = JSON.parse(fs.readFileSync(dependencyHistoryFile, 'utf8'));
    }

    // Get previous state for this file
    const fileKey = fileName.replace(/[^a-z0-9]/gi, '_');
    const previousState = history[fileKey] || { dependencies: [], plugins: [] };

    // Detect changes
    const changes = {
        added: [],
        removed: [],
        updated: [],
        timestamp: new Date().toISOString()
    };

    // Compare dependencies
    const currentMap = new Map(dependencies.map(d => [`${d.group}:${d.name}`, d]));
    const previousMap = new Map(previousState.dependencies.map(d => [`${d.group}:${d.name}`, d]));

    // Find added and updated
    for (const [key, dep] of currentMap) {
        if (!previousMap.has(key)) {
            changes.added.push(dep);
        } else {
            const prevDep = previousMap.get(key);
            if (prevDep.version !== dep.version) {
                changes.updated.push({ ...dep, previousVersion: prevDep.version });
            }
        }
    }

    // Find removed
    for (const [key, dep] of previousMap) {
        if (!currentMap.has(key)) {
            changes.removed.push(dep);
        }
    }

    // Save current state
    history[fileKey] = {
        file: path.relative(process.cwd(), filePath),
        dependencies: dependencies,
        plugins: plugins,
        lastTracked: new Date().toISOString()
    };

    // Track global library usage patterns
    if (!history.libraryPatterns) {
        history.libraryPatterns = {};
    }

    for (const dep of dependencies) {
        const key = `${dep.group}:${dep.name}`;
        if (!history.libraryPatterns[key]) {
            history.libraryPatterns[key] = {
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                usageCount: 1,
                files: [fileName]
            };
        } else {
            history.libraryPatterns[key].lastSeen = new Date().toISOString();
            history.libraryPatterns[key].usageCount++;
            if (!history.libraryPatterns[key].files.includes(fileName)) {
                history.libraryPatterns[key].files.push(fileName);
            }
        }
    }

    fs.writeFileSync(
        dependencyHistoryFile,
        JSON.stringify(history, null, 2),
        'utf8'
    );

    // Report changes
    if (changes.added.length > 0 || changes.removed.length > 0 || changes.updated.length > 0) {
        console.log(`📊 Dependency changes detected in ${fileName}:`);

        if (changes.added.length > 0) {
            console.log(`   Added: ${changes.added.map(d => `${d.group}:${d.name}:${d.version}`).join(', ')}`);
        }

        if (changes.updated.length > 0) {
            console.log(`   Updated: ${changes.updated.map(d => `${d.group}:${d.name} ${d.previousVersion} → ${d.version}`).join(', ')}`);
        }

        if (changes.removed.length > 0) {
            console.log(`   Removed: ${changes.removed.map(d => `${d.group}:${d.name}`).join(', ')}`);
        }

        // Add V2 instinct for new library patterns
        const { addInstinct } = require('../lib/instincts');

        for (const dep of changes.added) {
            const category = categorizeLibrary(dep.group, dep.name);
            if (category) {
                addInstinct({
                    id: `dependency-${category}`,
                    type: 'pattern',
                    description: `Uses ${category} (${dep.group}:${dep.name})`,
                    context: 'dependencies',
                    confidence: 0.5,
                    examples: [`${dep.group}:${dep.name}`]
                });
            }
        }
    }
}

function categorizeLibrary(group, name) {
    const patterns = {
        'jetpack-compose': { groups: ['androidx.compose'], name: 'Jetpack Compose' },
        'ktor': { groups: ['io.ktor'], name: 'Ktor' },
        'koin': { groups: ['io.insert-koin'], name: 'Koin' },
        'room': { groups: ['androidx.room'], name: 'Room' },
        'navigation': { groups: ['androidx.navigation'], name: 'Navigation' },
        'lifecycle': { groups: ['androidx.lifecycle'], name: 'Lifecycle' },
        'coil': { groups: ['coil3', 'io.coil-kt'], name: 'Coil' },
        'retrofit': { groups: ['com.squareup.retrofit2'], name: 'Retrofit' },
        'okhttp': { groups: ['com.squareup.okhttp3'], name: 'OkHttp' }
    };

    for (const [key, pattern] of Object.entries(patterns)) {
        if (pattern.groups.some(g => group.includes(g))) {
            return key;
        }
    }

    return null;
}

main();
