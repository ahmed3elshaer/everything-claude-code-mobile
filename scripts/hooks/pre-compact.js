#!/usr/bin/env node
/**
 * Pre-compact hook - saves session context before compaction
 * Preserves important state that might be lost during context compression
 */

const path = require('path');
const fs = require('fs');
const { log, getProjectRoot, ensureDir, getTimestamp } = require('../lib/utils');
const { loadInstincts, saveInstincts } = require('../lib/instincts');

async function main() {
    const projectRoot = getProjectRoot();
    const claudeDir = path.join(projectRoot, '.claude');

    log('Pre-compact: Saving session state...', 'info');

    // Save session checkpoint
    const checkpointDir = ensureDir(path.join(claudeDir, 'checkpoints'));
    const checkpointFile = path.join(checkpointDir, `checkpoint-${getTimestamp()}.json`);

    const checkpoint = {
        timestamp: new Date().toISOString(),
        projectRoot,
        instincts: loadInstincts(),
        gitBranch: getGitBranch(projectRoot),
        lastFiles: getRecentFiles(projectRoot)
    };

    fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
    log(`Checkpoint saved: ${path.basename(checkpointFile)}`, 'success');

    // Clean old checkpoints (keep last 10)
    cleanOldCheckpoints(checkpointDir, 10);
}

function getGitBranch(dir) {
    const { runCommand } = require('../lib/utils');
    const result = runCommand('git rev-parse --abbrev-ref HEAD', { cwd: dir });
    return result.success ? result.output : 'unknown';
}

function getRecentFiles(dir) {
    const { runCommand } = require('../lib/utils');
    const result = runCommand('git diff --name-only HEAD~3', { cwd: dir });
    return result.success ? result.output.split('\n').slice(0, 20) : [];
}

function cleanOldCheckpoints(dir, keepCount) {
    try {
        const files = fs.readdirSync(dir)
            .filter(f => f.startsWith('checkpoint-'))
            .sort()
            .reverse();

        for (let i = keepCount; i < files.length; i++) {
            fs.unlinkSync(path.join(dir, files[i]));
        }
    } catch (error) {
        // Ignore cleanup errors
    }
}

main().catch(error => {
    log(`Pre-compact error: ${error.message}`, 'error');
});
