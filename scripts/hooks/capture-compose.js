#!/usr/bin/env node
/**
 * V1 Instinct: Capture Compose screen patterns
 *
 * Analyzes Compose screen files for specific patterns like:
 * - State hoisting
 * - Side effect handling
 * - Preview annotations
 * - Navigation integration
 */

const fs = require('fs');
const path = require('path');

const { getInstinctsDir, ensureDir, getTimestamp } = require('../lib/utils');

function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Usage: capture-compose.js <compose-file-path>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const screenName = path.basename(filePath, '.kt');

    // Detect Compose patterns
    const patterns = {
        hasStateHoisting: /@Composable\s+fun\s+\w+[\s\S]{0,500}uiState:\s*\w+UiState/.test(content),
        hasLaunchedEffect: /LaunchedEffect\s*\(/.test(content),
        hasDisposableEffect: /DisposableEffect\s*\(/.test(content),
        hasSideEffect: /SideEffect\s*\(/.test(content),
        hasProducedState: /produceState\s*\(/.test(content),
        hasRemember: /val\s+\w+\s+by\s+remember\s*\{/.test(content),
        hasRememberSaveable: /val\s+\w+\s+by\s+rememberSaveable\s*\{/.test(content),
        hasCollectAsState: /\.collectAsState\s*\(/.test(content) || /\.collectAsStateWithLifecycle\s*\(/.test(content),
        hasLazyColumn: /LazyColumn\s*\(/.test(content),
        hasLazyRow: /LazyRow\s*\(/.test(content),
        hasLazyVerticalGrid: /LazyVerticalGrid\s*\(/.test(content),
        usesStableKey: /key\s*=\s*\{[^}]+\.id/.test(content),
        hasPreview: /@Preview\s*(?:\([^)]*\))?\s*(?:\n\s*)?@Composable/.test(content),
        usesScaffold: /Scaffold\s*\(/.test(content),
        usesTopAppBar: /TopAppBar\s*\(/.test(content),
        usesBottomNav: /NavigationBar\s*\(/.test(content) || /BottomNavigation\s*\(/.test(content),
        usesSnackbar: /Snackbar\s*\(/.test(content) || /SnackbarHost\s*\(/.test(content),
        usesNavigation: /NavHost\s*\(/.test(content) || /navController\s*\(/.test(content),
        usesMaterial: /Material\s*\(\s*theme\s*=\s*/.test(content) || /MaterialTheme\s*\(/.test(content),
        usesMaterial3: /Material3\s*\{\s*Theme\s*\(/.test(content) || /androidx\.material3/.test(content),
        hasImmutableAnnotation: /@Immutable/.test(content),
        usesDerivedStateOf: /derivedStateOf\s*\(/.test(content),
        usesAnimatedVisibility: /AnimatedVisibility\s*\(/.test(content) || /AnimatedContent\s*\(/.test(content)
    };

    // Build instinct data
    const instinctsDir = ensureDir(getInstinctsDir());
    const composeInstinctsFile = path.join(instinctsDir, 'compose-patterns.json');

    let existing = {};
    if (fs.existsSync(composeInstinctsFile)) {
        existing = JSON.parse(fs.readFileSync(composeInstinctsFile, 'utf8'));
    }

    // Update with this screen's patterns
    existing[screenName] = {
        file: path.relative(process.cwd(), filePath),
        patterns: patterns,
        capturedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        composeInstinctsFile,
        JSON.stringify(existing, null, 2),
        'utf8'
    );

    // Output detected patterns
    const detected = Object.entries(patterns)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);

    if (detected.length > 0) {
        console.log(`🧠 V1 Instinct: Compose patterns captured from ${screenName}`);
        detected.forEach(p => {
            console.log(`   • ${p}`);
        });
    }

    // Add specific patterns to main instinct storage
    const { addInstinct } = require('../lib/instincts');

    if (patterns.hasStateHoisting && patterns.hasCollectAsState) {
        addInstinct({
            id: 'compose-state-hoisting-with-flow',
            type: 'pattern',
            description: 'State hoisting with Flow collection in Composable',
            context: 'jetpack-compose',
            confidence: 0.8,
            examples: [screenName]
        });
    }

    if (patterns.usesStableKey && (patterns.hasLazyColumn || patterns.hasLazyRow)) {
        addInstinct({
            id: 'compose-lazy-stable-keys',
            type: 'pattern',
            description: 'LazyColumn/LazyRow with stable keys',
            context: 'jetpack-compose',
            confidence: 0.8,
            examples: [screenName]
        });
    }

    if (patterns.hasLaunchedEffect && patterns.usesDisposableEffect) {
        addInstinct({
            id: 'compose-side-effects',
            type: 'pattern',
            description: 'Proper side effect handling with LaunchedEffect and DisposableEffect',
            context: 'jetpack-compose',
            confidence: 0.7,
            examples: [screenName]
        });
    }

    if (patterns.hasImmutableAnnotation) {
        addInstinct({
            id: 'compose-immutable-data',
            type: 'pattern',
            description: 'Immutable data class for Compose stability',
            context: 'jetpack-compose',
            confidence: 0.7,
            examples: [screenName]
        });
    }

    if (patterns.usesMaterial3) {
        addInstinct({
            id: 'compose-material3',
            type: 'pattern',
            description: 'Material 3 design system usage',
            context: 'jetpack-compose',
            confidence: 0.6,
            examples: [screenName]
        });
    }
}

main();
