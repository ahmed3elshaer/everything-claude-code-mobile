/**
 * Utility functions for everything-claude-code-mobile scripts
 * Cross-platform compatible (Windows, macOS, Linux)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

// Platform detection
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

/**
 * Get the Claude config directory
 */
function getClaudeConfigDir() {
    const home = os.homedir();
    return path.join(home, '.claude');
}

/**
 * Get the project root directory (where .claude or CLAUDE.md exists)
 */
function getProjectRoot() {
    let dir = process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'CLAUDE.md')) ||
            fs.existsSync(path.join(dir, '.claude'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return process.cwd();
}

/**
 * Check if directory is an Android project
 */
function isAndroidProject(dir = process.cwd()) {
    return fs.existsSync(path.join(dir, 'build.gradle')) ||
        fs.existsSync(path.join(dir, 'build.gradle.kts')) ||
        fs.existsSync(path.join(dir, 'settings.gradle')) ||
        fs.existsSync(path.join(dir, 'settings.gradle.kts'));
}

/**
 * Check if Gradle wrapper exists
 */
function hasGradleWrapper(dir = process.cwd()) {
    const gradlew = isWindows ? 'gradlew.bat' : 'gradlew';
    return fs.existsSync(path.join(dir, gradlew));
}

/**
 * Get Gradle command
 */
function getGradleCommand(dir = process.cwd()) {
    if (hasGradleWrapper(dir)) {
        return isWindows ? 'gradlew.bat' : './gradlew';
    }
    return 'gradle';
}

/**
 * Run a command and return output
 */
function runCommand(command, options = {}) {
    try {
        const output = execSync(command, {
            encoding: 'utf-8',
            cwd: options.cwd || process.cwd(),
            timeout: options.timeout || 60000,
            ...options
        });
        return { success: true, output: output.trim() };
    } catch (error) {
        return {
            success: false,
            output: error.stdout?.trim() || '',
            error: error.stderr?.trim() || error.message
        };
    }
}

/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

/**
 * Write JSON file with formatting
 */
function writeJsonFile(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Get instincts directory
 */
function getInstinctsDir() {
    return path.join(getClaudeConfigDir(), 'instincts');
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

/**
 * Get timestamp for file names
 */
function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Log with prefix
 */
function log(message, type = 'info') {
    const prefix = {
        info: '[INFO]',
        warn: '[WARN]',
        error: '[ERROR]',
        success: '[OK]'
    }[type] || '[INFO]';

    console.log(`${prefix} ${message}`);
}

module.exports = {
    isWindows,
    isMac,
    isLinux,
    getClaudeConfigDir,
    getProjectRoot,
    isAndroidProject,
    hasGradleWrapper,
    getGradleCommand,
    runCommand,
    readJsonFile,
    writeJsonFile,
    getInstinctsDir,
    ensureDir,
    getTimestamp,
    log
};
