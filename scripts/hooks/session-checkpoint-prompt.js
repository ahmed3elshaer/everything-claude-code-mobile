#!/usr/bin/env node
/**
 * Session checkpoint prompt
 *
 * At session end, evaluates if a checkpoint should be created
 * and prompts if the session was productive.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { getProjectRoot, ensureDir, getTimestamp } = require('../lib/utils');

const SESSION_FILE = '.claude/mobile-memory/session-history.json';

function getGitDiffCount(projectRoot) {
    try {
        const output = execSync('git diff --stat', { cwd: projectRoot, encoding: 'utf8' });
        const lines = output.split('\n').filter(l => l.trim());
        return lines.length;
    } catch {
        return 0;
    }
}

function getGitStagedCount(projectRoot) {
    try {
        const output = execSync('git diff --cached --stat', { cwd: projectRoot, encoding: 'utf8' });
        const lines = output.split('\n').filter(l => l.trim());
        return lines.length;
    } catch {
        return 0;
    }
}

function getSessionActivity(projectRoot) {
    const diffCount = getGitDiffCount(projectRoot);
    const stagedCount = getGitStagedCount(projectRoot);
    const branch = getCurrentBranch(projectRoot);

    return {
        filesChanged: diffCount + stagedCount,
        filesStaged: stagedCount,
        filesUnstaged: diffCount,
        branch: branch
    };
}

function getCurrentBranch(projectRoot) {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function loadSessionHistory(projectRoot) {
    const sessionPath = path.join(projectRoot, SESSION_FILE);
    if (fs.existsSync(sessionPath)) {
        try {
            return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        } catch {
            return { sessions: [] };
        }
    }
    return { sessions: [] };
}

function saveSessionHistory(projectRoot, history) {
    const sessionPath = path.join(projectRoot, SESSION_FILE);
    const sessionDir = path.dirname(sessionPath);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    fs.writeFileSync(sessionPath, JSON.stringify(history, null, 2));
}

function shouldSuggestCheckpoint(activity) {
    const significantChange = activity.filesChanged >= 5;
    const onFeatureBranch = activity.branch.startsWith('feature/') ||
                          activity.branch.startsWith('feat/');
    const commitReady = activity.filesStaged >= 3;

    return significantChange || onFeatureBranch || commitReady;
}

function main() {
    const projectRoot = getProjectRoot();

    const activity = getSessionActivity(projectRoot);

    const history = loadSessionHistory(projectRoot);
    history.sessions.push({
        timestamp: new Date().toISOString(),
        activity: activity
    });

    if (history.sessions.length > 30) {
        history.sessions = history.sessions.slice(-30);
    }

    saveSessionHistory(projectRoot, history);

    if (shouldSuggestCheckpoint(activity)) {
        console.log('');
        console.log('Session Summary:');
        console.log(`   Branch: ${activity.branch}`);
        console.log(`   Files changed: ${activity.filesChanged}`);
        console.log(`   Files staged: ${activity.filesStaged}`);
        console.log('');

        const level = activity.filesChanged >= 10 ? 'full' : 'standard';
        const suggestedName = `${activity.branch.replace(/[\/\\]/g, '-')}-${Date.now()}`;

        console.log(`Productive session detected! Consider creating a checkpoint:`);
        console.log(`   /mobile-checkpoint save ${suggestedName}`);
        console.log(`   Or: /mobile-checkpoint save session-${getTimestamp().replace(/[:.]/g, '-')}`);
        console.log('');
    } else {
        console.log('Session ended. Low activity - no checkpoint suggested.');
    }
}

main();
