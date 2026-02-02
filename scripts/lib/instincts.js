/**
 * Instinct management for continuous learning
 * Handles pattern storage, retrieval, and confidence scoring
 */

const fs = require('fs');
const path = require('path');
const { getInstinctsDir, ensureDir, readJsonFile, writeJsonFile, getTimestamp } = require('./utils');

/**
 * Load all instincts
 */
function loadInstincts() {
    const instinctsDir = getInstinctsDir();
    const instinctsFile = path.join(instinctsDir, 'mobile-instincts.json');

    if (!fs.existsSync(instinctsFile)) {
        return { instincts: [], version: '1.0', lastUpdated: null };
    }

    return readJsonFile(instinctsFile) || { instincts: [], version: '1.0', lastUpdated: null };
}

/**
 * Save instincts
 */
function saveInstincts(data) {
    const instinctsDir = ensureDir(getInstinctsDir());
    const instinctsFile = path.join(instinctsDir, 'mobile-instincts.json');

    data.lastUpdated = new Date().toISOString();
    writeJsonFile(instinctsFile, data);
}

/**
 * Add or update an instinct
 */
function addInstinct(instinct) {
    const data = loadInstincts();
    const existingIndex = data.instincts.findIndex(i => i.id === instinct.id);

    if (existingIndex >= 0) {
        // Update existing - increase confidence
        const existing = data.instincts[existingIndex];
        existing.confidence = Math.min(1.0, existing.confidence + 0.1);
        existing.lastUsed = new Date().toISOString();
        existing.usageCount = (existing.usageCount || 1) + 1;
    } else {
        // Add new
        data.instincts.push({
            ...instinct,
            confidence: instinct.confidence || 0.3,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            usageCount: 1
        });
    }

    saveInstincts(data);
    return data;
}

/**
 * Get instincts by context
 */
function getInstinctsByContext(context) {
    const data = loadInstincts();
    return data.instincts.filter(i => i.context === context || !context);
}

/**
 * Get high-confidence instincts
 */
function getHighConfidenceInstincts(threshold = 0.7) {
    const data = loadInstincts();
    return data.instincts.filter(i => i.confidence >= threshold);
}

/**
 * Export instincts to file
 */
function exportInstincts(outputPath) {
    const data = loadInstincts();
    const exportData = {
        ...data,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0'
    };

    writeJsonFile(outputPath, exportData);
    return exportData;
}

/**
 * Import instincts from file
 */
function importInstincts(inputPath) {
    const importData = readJsonFile(inputPath);
    if (!importData || !importData.instincts) {
        throw new Error('Invalid instincts file');
    }

    const currentData = loadInstincts();

    // Merge instincts
    for (const instinct of importData.instincts) {
        const existingIndex = currentData.instincts.findIndex(i => i.id === instinct.id);

        if (existingIndex >= 0) {
            // Keep higher confidence
            if (instinct.confidence > currentData.instincts[existingIndex].confidence) {
                currentData.instincts[existingIndex] = instinct;
            }
        } else {
            currentData.instincts.push(instinct);
        }
    }

    saveInstincts(currentData);
    return currentData;
}

/**
 * Decay confidence for unused instincts
 */
function decayUnusedInstincts(daysThreshold = 30) {
    const data = loadInstincts();
    const now = new Date();

    for (const instinct of data.instincts) {
        const lastUsed = new Date(instinct.lastUsed);
        const daysSinceUse = (now - lastUsed) / (1000 * 60 * 60 * 24);

        if (daysSinceUse > daysThreshold) {
            instinct.confidence = Math.max(0.1, instinct.confidence - 0.05);
        }
    }

    saveInstincts(data);
    return data;
}

module.exports = {
    loadInstincts,
    saveInstincts,
    addInstinct,
    getInstinctsByContext,
    getHighConfidenceInstincts,
    exportInstincts,
    importInstincts,
    decayUnusedInstincts
};
