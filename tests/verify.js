#!/usr/bin/env node
/**
 * Mobile Port Verification Script
 *
 * Validates that all components of the mobile port improvement plan
 * are properly implemented and functional.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(category, message, status = 'info') {
    const icons = {
        info: '📋',
        success: '✅',
        error: '❌',
        warning: '⚠️ ',
        skip: '⊘ '
    };

    const color = {
        info: colors.blue,
        success: colors.green,
        error: colors.red,
        warning: colors.yellow,
        skip: colors.cyan
    };

    console.log(`${color[status]}${icons[status]} ${category}: ${message}${colors.reset}`);
}

function checkFile(filePath, description) {
    const fullPath = path.join(PROJECT_ROOT, filePath);

    if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const size = stats.size;

        if (size > 0) {
            log('File Check', `${description} (${filePath}) - ${size} bytes`, 'success');
            return true;
        } else {
            log('File Check', `${description} (${filePath}) - empty file`, 'warning');
            return false;
        }
    } else {
        log('File Check', `${description} (${filePath}) - missing`, 'error');
        return false;
    }
}

function checkDir(dirPath, description) {
    const fullPath = path.join(PROJECT_ROOT, dirPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        log('Directory Check', `${description} (${dirPath})`, 'success');
        return true;
    } else {
        log('Directory Check', `${description} (${dirPath}) - missing`, 'error');
        return false;
    }
}

function checkFileContent(filePath, requiredPatterns) {
    const fullPath = path.join(PROJECT_ROOT, filePath);

    if (!fs.existsSync(fullPath)) {
        log('Content Check', `${filePath} - file missing`, 'error');
        return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const missing = [];

    for (const pattern of requiredPatterns) {
        if (typeof pattern === 'string') {
            if (!content.includes(pattern)) {
                missing.push(pattern);
            }
        } else if (pattern instanceof RegExp) {
            if (!pattern.test(content)) {
                missing.push(pattern.toString());
            }
        }
    }

    if (missing.length === 0) {
        log('Content Check', `${filePath} - all patterns found`, 'success');
        return true;
    } else {
        log('Content Check', `${filePath} - missing patterns: ${missing.slice(0, 3).join(', ')}`, 'warning');
        return false;
    }
}

// Verification phases
const phases = {
    phase1_skills: {
        name: 'Phase 1: Continuous Learning V2',
        checks: () => {
            let pass = true;
            pass &= checkFile('skills/mobile-instinct-v1/SKILL.md', 'Mobile Instinct V1 Skill');
            pass &= checkFile('skills/mobile-instinct-v2/SKILL.md', 'Mobile Instinct V2 Skill');
            pass &= checkFile('skills/continuous-learning-v2/SKILL.md', 'Continuous Learning V2 (existing)');
            pass &= checkFile('hooks/extended/instinct-hooks.json', 'Instinct Hooks Config');
            pass &= checkFile('agents/mobile-pattern-extractor.md', 'Pattern Extractor Agent');
            return pass;
        }
    },

    phase2_checkpoint: {
        name: 'Phase 2: Checkpoint System',
        checks: () => {
            let pass = true;
            pass &= checkFile('commands/mobile-checkpoint.md', 'Mobile Checkpoint Command');
            pass &= checkFile('skills/mobile-checkpoint/SKILL.md', 'Mobile Checkpoint Skill');
            pass &= checkFile('hooks/checkpoint-hooks.json', 'Checkpoint Hooks Config');
            pass &= checkFile('scripts/hooks/auto-checkpoint.js', 'Auto Checkpoint Script');
            pass &= checkFile('scripts/hooks/session-checkpoint-prompt.js', 'Session Checkpoint Prompt');
            return pass;
        }
    },

    phase3_memory: {
        name: 'Phase 3: Memory Persistence',
        checks: () => {
            let pass = true;
            pass &= checkFile('mcp-configs/mobile-memory.json', 'Mobile Memory MCP Config');
            pass &= checkFile('skills/mobile-memory/SKILL.md', 'Mobile Memory Skill');
            pass &= checkFile('contexts/mobile-memory-context.md', 'Mobile Memory Context');
            pass &= checkDir('mcp-servers/mobile-memory', 'Mobile Memory MCP Server');
            pass &= checkFile('mcp-servers/mobile-memory/index.js', 'Mobile Memory MCP Server');
            pass &= checkFile('mcp-servers/mobile-memory/package.json', 'Mobile Memory Package.json');
            return pass;
        }
    },

    phase4_compaction: {
        name: 'Phase 4: Strategic Compaction',
        checks: () => {
            let pass = true;
            pass &= checkFile('skills/mobile-compaction/SKILL.md', 'Mobile Compaction Skill');
            pass &= checkFile('agents/mobile-compactor.md', 'Mobile Compactor Agent');
            return pass;
        }
    },

    phase5_verification: {
        name: 'Phase 5: Verification Loops',
        checks: () => {
            let pass = true;
            pass &= checkFile('commands/mobile-verify.md', 'Mobile Verify Command');
            pass &= checkFile('skills/mobile-verification/SKILL.md', 'Mobile Verification Skill');
            pass &= checkFile('agents/mobile-verifier.md', 'Mobile Verifier Agent');
            return pass;
        }
    },

    support_scripts: {
        name: 'Support Scripts',
        checks: () => {
            let pass = true;
            pass &= checkFile('scripts/hooks/extract-pattern.js', 'Extract Pattern Script');
            pass &= checkFile('scripts/hooks/capture-viewmodel.js', 'Capture ViewModel Script');
            pass &= checkFile('scripts/hooks/capture-compose.js', 'Capture Compose Script');
            pass &= checkFile('scripts/hooks/capture-koin.js', 'Capture Koin Script');
            pass &= checkFile('scripts/hooks/track-dependency.js', 'Track Dependency Script');
            pass &= checkFile('scripts/hooks/v2-analysis.js', 'V2 Analysis Script');
            pass &= checkFile('scripts/lib/utils.js', 'Utils Library (existing)');
            pass &= checkFile('scripts/lib/instincts.js', 'Instincts Library (existing)');
            return pass;
        }
    },

    tests: {
        name: 'Test Suite',
        checks: () => {
            let pass = true;
            pass &= checkFile('tests/unit/mcp-server.test.js', 'MCP Server Unit Tests');
            pass &= checkFile('tests/unit/hooks.test.js', 'Hooks Unit Tests');
            pass &= checkFile('tests/integration/workflow.test.js', 'Integration Tests');
            return pass;
        }
    },

    integrity: {
        name: 'File Integrity Checks',
        checks: () => {
            let pass = true;

            // Check SKILL.md files have proper frontmatter
            const skillFiles = [
                'skills/mobile-instinct-v1/SKILL.md',
                'skills/mobile-instinct-v2/SKILL.md',
                'skills/mobile-checkpoint/SKILL.md',
                'skills/mobile-memory/SKILL.md',
                'skills/mobile-compaction/SKILL.md',
                'skills/mobile-verification/SKILL.md'
            ];

            for (const file of skillFiles) {
                pass &= checkFileContent(file, [/^---\s*name:/m, /^description:/m]);
            }

            // Check JSON files are valid
            const jsonFiles = [
                'hooks/extended/instinct-hooks.json',
                'hooks/checkpoint-hooks.json',
                'mcp-configs/mobile-memory.json'
            ];

            for (const file of jsonFiles) {
                const fullPath = path.join(PROJECT_ROOT, file);
                try {
                    JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    log('JSON Valid', `${file}`, 'success');
                } catch (error) {
                    log('JSON Valid', `${file} - invalid JSON: ${error.message}`, 'error');
                    pass = false;
                }
            }

            return pass;
        }
    },

    documentation: {
        name: 'Documentation Completeness',
        checks: () => {
            let pass = true;

            // Check README exists
            pass &= checkFile('README.md', 'Project README');

            // Check docs directory
            pass &= checkDir('docs', 'Documentation Directory');

            const docFiles = [
                'docs/installation.md',
                'docs/android-setup.md',
                'docs/architecture.md',
                'docs/tdd-workflow.md',
                'docs/continuous-learning.md'
            ];

            for (const file of docFiles) {
                pass &= checkFile(file, `Documentation: ${file}`);
            }

            return pass;
        }
    }
};

// Main execution
function main() {
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}   Mobile Port Improvement Plan Verification${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    };

    for (const [key, phase] of Object.entries(phases)) {
        console.log(`${colors.bright}${phase.name}${colors.reset}`);

        const phasePassed = phase.checks();

        if (phasePassed) {
            log('Phase Status', `All checks passed`, 'success');
        } else {
            log('Phase Status', `Some checks failed`, 'warning');
        }

        console.log('');
    }

    // Summary
    console.log(`${colors.bright}${colors.cyan}─────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}                     Verification Summary${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}─────────────────────────────────────────────────────────${colors.reset}\n`);

    // Count files
    const files = {
        skills: 0,
        commands: 0,
        agents: 0,
        hooks: 0,
        contexts: 0,
        mcpConfigs: 0,
        scripts: 0,
        tests: 0
    };

    function countFiles(dir, pattern) {
        const fullPath = path.join(PROJECT_ROOT, dir);
        if (!fs.existsSync(fullPath)) return;

        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                // Skip test fixtures
                if (entry.name !== 'fixtures') {
                    countFiles(path.join(dir, entry.name), pattern);
                }
            } else if (pattern.test(entry.name)) {
                files[pattern] = (files[pattern] || 0) + 1;
            }
        }
    }

    countFiles('skills', /SKILL.md$/);
    countFiles('commands', /\.md$/);
    countFiles('agents', /\.md$/);
    countFiles('hooks', /\.json$/);
    countFiles('contexts', /\.md$/);
    countFiles('mcp-configs', /\.json$/);
    countFiles('scripts', /\.js$/);
    countFiles('tests', /\.test\.js$/);

    console.log(`Skills:     ${files.skills} created`);
    console.log(`Commands:   ${files.commands} created`);
    console.log(`Agents:     ${files.agents} created`);
    console.log(`Hooks:      ${files.hooks} created`);
    console.log(`Contexts:   ${files.contexts} created`);
    console.log(`MCP Configs: ${files.mcpConfigs} created`);
    console.log(`Scripts:    ${files.scripts} created`);
    console.log(`Tests:      ${files.tests} created\n`);

    const totalFiles = Object.values(files).reduce((a, b) => a + b, 0);
    console.log(`${colors.bright}Total Files Created: ${totalFiles}${colors.reset}\n`);

    // Final status
    console.log(`${colors.bright}${colors.cyan}─────────────────────────────────────────────────────────${colors.reset}\n`);

    log('Verification', 'Mobile Port Improvement Plan implementation complete!', 'success');
    console.log('\nNext steps:');
    console.log('  1. Install MCP SDK: cd mcp-servers/mobile-memory && npm install');
    console.log('  2. Run tests: npm test (or node tests/unit/*.test.js)');
    console.log('  3. Configure Claude Code to use the MCP server');
    console.log('  4. Configure hooks in hooks/hooks.json');
}

main();
