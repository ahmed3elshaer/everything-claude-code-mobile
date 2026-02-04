#!/usr/bin/env node
/**
 * Auto-checkpoint script
 *
 * Creates automatic checkpoints before risky operations or
 * after successful milestones.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { getProjectRoot, ensureDir, getTimestamp } = require('../lib/utils');

const CHECKPOINT_DIR = '.claude/checkpoints';

const LEVELS = {
    quick: {
        description: 'Quick checkpoint with git state',
        collect: ['git-status', 'git-branch', 'recent-files']
    },
    standard: {
        description: 'Standard checkpoint with build and test state',
        collect: ['git-status', 'git-branch', 'build-config', 'test-results', 'recent-files']
    },
    full: {
        description: 'Full checkpoint with all state',
        collect: ['git-state', 'build-config', 'dependencies', 'manifest', 'test-results', 'instincts', 'compose-state']
    }
};

function getGitStatus(dir) {
    try {
        return execSync('git status --porcelain', { cwd: dir, encoding: 'utf8' });
    } catch {
        return '';
    }
}

function getGitBranch(dir) {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir, encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function getGitCommit(dir) {
    try {
        return execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function getRecentFiles(dir, count = 10) {
    try {
        const output = execSync('git diff --name-only HEAD~5', { cwd: dir, encoding: 'utf8' });
        return output.split('\n').filter(f => f.trim()).slice(0, count);
    } catch {
        return [];
    }
}

function getBuildConfig(dir) {
    const config = {
        gradleVersion: null,
        kgpVersion: null,
        buildVariants: []
    };

    const wrapperPath = path.join(dir, 'gradle/wrapper/gradle-wrapper.properties');
    if (fs.existsSync(wrapperPath)) {
        const wrapper = fs.readFileSync(wrapperPath, 'utf8');
        const match = wrapper.match(/gradle\-([\d.]+)/);
        if (match) config.gradleVersion = match[1];
    }

    const buildPath = path.join(dir, 'app/build.gradle.kts');
    if (fs.existsSync(buildPath)) {
        const build = fs.readFileSync(buildPath, 'utf8');
        const flavorMatches = build.matchAll(/(?:productFlavors|buildTypes)\s*\{[^}]*name\s*\(\s*"([^"]+)"/g);
        for (const match of flavorMatches) {
            config.buildVariants.push(match[1]);
        }
    }

    return config;
}

function getTestResults(dir) {
    const results = {
        lastRun: null,
        passed: 0,
        failed: 0,
        flaky: []
    };

    const testResultsDir = path.join(dir, 'app/build/test-results');
    if (fs.existsSync(testResultsDir)) {
        const dirs = fs.readdirSync(testResultsDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort()
            .reverse();

        if (dirs.length > 0) {
            results.lastRun = dirs[0];
        }
    }

    return results;
}

function loadInstincts(dir) {
    const instinctsPath = path.join(dir, '.claude/instincts/mobile-instincts.json');
    if (fs.existsSync(instinctsPath)) {
        try {
            return JSON.parse(fs.readFileSync(instinctsPath, 'utf8'));
        } catch {
            return { instincts: [] };
        }
    }
    return { instincts: [] };
}

function createCheckpoint(level, name) {
    const projectRoot = getProjectRoot();
    const checkpointDir = ensureDir(path.join(projectRoot, CHECKPOINT_DIR));

    const levelConfig = LEVELS[level] || LEVELS.standard;
    const timestamp = getTimestamp();
    const checkpointName = name || `${level}-${timestamp.replace(/[:.]/g, '-')}`;
    const checkpointFile = path.join(checkpointDir, `${checkpointName}.json`);

    const checkpoint = {
        name: checkpointName,
        timestamp: new Date().toISOString(),
        level: level,
        description: levelConfig.description
    };

    for (const item of levelConfig.collect) {
        switch (item) {
            case 'git-status':
            case 'git-state':
                checkpoint.git = {
                    branch: getGitBranch(projectRoot),
                    commit: getGitCommit(projectRoot),
                    status: getGitStatus(projectRoot).split('\n').filter(l => l.trim())
                };
                break;

            case 'git-branch':
                if (!checkpoint.git) checkpoint.git = {};
                checkpoint.git.branch = getGitBranch(projectRoot);
                break;

            case 'recent-files':
                checkpoint.recentFiles = getRecentFiles(projectRoot, 20);
                break;

            case 'build-config':
                checkpoint.build = getBuildConfig(projectRoot);
                break;

            case 'test-results':
                checkpoint.tests = getTestResults(projectRoot);
                break;

            case 'instincts':
                checkpoint.instincts = loadInstincts(projectRoot);
                break;

            case 'dependencies':
                checkpoint.dependencies = { tracked: true };
                break;

            case 'manifest':
                checkpoint.manifest = { tracked: true };
                break;

            case 'compose-state':
                checkpoint.compose = { tracked: true };
                break;
        }
    }

    fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

    cleanOldCheckpoints(checkpointDir, 20);

    return checkpointFile;
}

function cleanOldCheckpoints(dir, keepCount) {
    try {
        const files = fs.readdirSync(dir)
            .filter(f => f.endsWith('.json'))
            .map(f => ({
                name: f,
                path: path.join(dir, f),
                time: fs.statSync(path.join(dir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        for (let i = keepCount; i < files.length; i++) {
            fs.unlinkSync(files[i].path);
        }
    } catch (error) {
        // Ignore cleanup errors
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: auto-checkpoint.js <level> [name]');
        console.error('Levels: quick, standard, full');
        process.exit(1);
    }

    const level = args[0];
    const name = args[1];

    if (!LEVELS[level]) {
        console.error(`Unknown checkpoint level: ${level}`);
        console.error(`Available levels: ${Object.keys(LEVELS).join(', ')}`);
        process.exit(1);
    }

    try {
        const checkpointFile = createCheckpoint(level, name);
        console.log(`Checkpoint created: ${path.basename(checkpointFile)}`);
    } catch (error) {
        console.error(`Error creating checkpoint: ${error.message}`);
        process.exit(1);
    }
}

main();
