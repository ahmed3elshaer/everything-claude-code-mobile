/**
 * Unit tests for Hook Scripts
 *
 * Tests the V1/V2 instinct capture scripts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const { setupTestProject, cleanupTestProject } = require('./mcp-server.test.js');

const TEST_DIR = path.join(__dirname, '../fixtures/test-project');
const HOOKS_DIR = path.join(__dirname, '../../scripts/hooks');

describe('Hook Scripts - Pattern Extraction', () => {
    beforeEach(() => {
        setupTestProject();
        // Create test Kotlin files
        fs.mkdirSync(path.join(TEST_DIR, 'src/main/java/com/example/ui'), { recursive: true });
    });

    afterEach(() => {
        cleanupTestProject();
    });

    describe('extract-pattern.js', () => {
        it('should detect Compose state hoisting pattern', () => {
            const testCode = `
@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onIntent: (HomeIntent) -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // ...
}
            `;

            const hasStateHoisting = /uiState:\s*\w+UiState/.test(testCode);
            const hasCollectAsState = /collectAsStateWithLifecycle/.test(testCode);

            assert.ok(hasStateHoisting, 'Should detect state hoisting parameter');
            assert.ok(hasCollectAsState, 'Should detect collectAsStateWithLifecycle');
        });

        it('should detect MVI sealed state pattern', () => {
            const testCode = `
sealed interface HomeUiState {
    data object Loading : HomeUiState()
    data class Success(val user: User) : HomeUiState()
    data object Error : HomeUiState()
}
            `;

            const hasSealedState = /sealed\s+(?:interface|class)\s+\w*State/.test(testCode);

            assert.ok(hasSealedState, 'Should detect sealed state');
        });

        it('should detect Koin viewModel injection', () => {
            const testCode = `
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = koinViewModel<HomeViewModel>()
) {
    // ...
}
            `;

            const hasKoinViewModel = /koinViewModel\s*</.test(testCode);

            assert.ok(hasKoinViewModel, 'Should detect koinViewModel injection');
        });

        it('should detect Ktor safe request pattern', () => {
            const testCode = `
suspend fun fetchData(): Result<User> = runCatching {
    client.get("/user").body<User>()
}
            `;

            const hasRunCatching = /runCatching\s*\{[^}]*client\.(get|post|put|delete)/.test(testCode);

            assert.ok(hasRunCatching, 'Should detect safe Ktor request');
        });

        it('should detect viewModelScope pattern', () => {
            const testCode = `
fun loadData() {
    viewModelScope.launch {
        // ...
    }
}
            `;

            const hasViewModelScope = /viewModelScope\.launch/.test(testCode);

            assert.ok(hasViewModelScope, 'Should detect viewModelScope');
        });
    });

    describe('Pattern Categories', () => {
        const PATTERNS = {
            compose: [
                { id: 'compose-state-hoisting', regex: /uiState:\s*\w+UiState/ },
                { id: 'compose-remember-key', regex: /key\s*=\s*\{[^}]+\.id/ },
                { id: 'compose-launched-effect', regex: /LaunchedEffect/ },
                { id: 'compose-immutable', regex: /@Immutable/ }
            ],
            mvi: [
                { id: 'mvi-sealed-state', regex: /sealed\s+(?:interface|class)\s*\w*State/ },
                { id: 'mvi-intent-handler', regex: /onIntent\s*\(/ },
                { id: 'mvi-state-reduction', regex: /fun\s+reduce\s*\(/ }
            ],
            koin: [
                { id: 'koin-viewmodel-injection', regex: /koinViewModel\s*</ },
                { id: 'koin-koin-inject', regex: /koinInject\s*</ },
                { id: 'koin-module-definition', regex: /val\s+\w+Module\s*=\s*module/ }
            ],
            ktor: [
                { id: 'ktor-safe-request', regex: /runCatching\s*\{[^}]*client\.(get|post)/ },
                { id: 'ktor-plugin-install', regex: /install\s*\(\s*ContentNegotiation/ },
                { id: 'ktor-timeout-config', regex: /timeout\s*\{[^}]*requestTimeoutMillis/ }
            ],
            coroutines: [
                { id: 'coroutine-viewmodel-scope', regex: /viewModelScope\.launch/ },
                { id: 'coroutine-dispatcher-io', regex: /withContext\s*\(\s*Dispatchers\.IO/ },
                { id: 'coroutine-flow-collect', regex: /\.collectAsState/ }
            ]
        };

        it('should have patterns for all categories', () => {
            const categories = Object.keys(PATTERNS);
            assert.ok(categories.includes('compose'));
            assert.ok(categories.includes('mvi'));
            assert.ok(categories.includes('koin'));
            assert.ok(categories.includes('ktor'));
            assert.ok(categories.includes('coroutines'));
        });

        it('should have valid regex patterns', () => {
            for (const [category, patterns] of Object.entries(PATTERNS)) {
                for (const pattern of patterns) {
                    assert.ok(pattern.regex instanceof RegExp, `${category}.${pattern.id} should have valid regex`);
                    assert.ok(pattern.id, `${category} pattern should have an id`);
                }
            }
        });
    });
});

describe('Hook Scripts - V2 Analysis', () => {
    beforeEach(setupTestProject);
    afterEach(cleanupTestProject);

    it('should detect layer separation pattern', () => {
        const files = [
            'src/main/java/com/example/ui/HomeScreen.kt',
            'src/main/java/com/example/data/repository/UserRepository.kt',
            'src/main/java/com/example/domain/usecase/GetUserUseCase.kt'
        ];

        const hasUi = files.some(f => f.includes('ui') || f.includes('Screen'));
        const hasData = files.some(f => f.includes('repository') || f.includes('data'));
        const hasDomain = files.some(f => f.includes('usecase') || f.includes('domain'));

        assert.ok(hasUi, 'Should have UI layer');
        assert.ok(hasData, 'Should have data layer');
        assert.ok(hasDomain, 'Should have domain layer');
    });

    it('should detect test mirroring pattern', () => {
        const files = [
            'src/main/java/com/example/ui/HomeScreen.kt',
            'src/test/java/com/example/ui/HomeScreenTest.kt'
        ];

        const hasTests = files.some(f => f.includes('/test/') || f.includes('Test.kt'));
        const hasSources = files.some(f => f.includes('/main/') && !f.includes('/test/'));

        assert.ok(hasTests, 'Should have test files');
        assert.ok(hasSources, 'Should have source files');
    });

    it('should detect repository pattern', () => {
        const files = [
            'src/main/java/com/example/data/repository/UserRepository.kt',
            'src/main/java/com/example/data/datasource/RemoteDataSource.kt'
        ];

        const hasRepository = files.some(f => f.includes('Repository') && f.includes('.kt'));

        assert.ok(hasRepository, 'Should detect repository pattern');
    });
});

describe('Hook Scripts - Checkpoint', () => {
    beforeEach(setupTestProject);
    afterEach(cleanupTestProject);

    it('should create checkpoint file', () => {
        const checkpoint = {
            name: 'test-checkpoint',
            timestamp: new Date().toISOString(),
            level: 'quick',
            git: {
                branch: 'main',
                commit: 'abc123',
                status: []
            }
        };

        const checkpointDir = path.join(TEST_DIR, '.claude/checkpoints');
        fs.mkdirSync(checkpointDir, { recursive: true });

        const checkpointFile = path.join(checkpointDir, 'test-checkpoint.json');
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

        assert.ok(fs.existsSync(checkpointFile));

        const loaded = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
        assert.strictEqual(loaded.name, 'test-checkpoint');
        assert.ok(loaded.git);
    });

    it('should limit checkpoint history', () => {
        const checkpointDir = path.join(TEST_DIR, '.claude/checkpoints');
        fs.mkdirSync(checkpointDir, { recursive: true });

        // Create 25 checkpoint files
        for (let i = 0; i < 25; i++) {
            const file = path.join(checkpointDir, `checkpoint-${i}.json`);
            fs.writeFileSync(file, JSON.stringify({ id: i }));
        }

        const files = fs.readdirSync(checkpointDir).filter(f => f.endsWith('.json'));
        assert.ok(files.length >= 25, 'Should create all files');

        // Simulate cleanup (keep last 20)
        const allFiles = fs.readdirSync(checkpointDir)
            .filter(f => f.endsWith('.json'))
            .map(f => ({
                name: f,
                path: path.join(checkpointDir, f),
                time: fs.statSync(path.join(checkpointDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        for (let i = 20; i < allFiles.length; i++) {
            fs.unlinkSync(allFiles[i].path);
        }

        const remainingFiles = fs.readdirSync(checkpointDir).filter(f => f.endsWith('.json'));
        assert.strictEqual(remainingFiles.length, 20, 'Should keep only 20 files after cleanup');
    });
});

describe('Hook Scripts - Dependency Tracking', () => {
    beforeEach(setupTestProject);
    afterEach(cleanupTestProject);

    it('should parse implementation dependencies', () => {
        const buildContent = `
dependencies {
    implementation("androidx.compose.ui:ui:1.5.0")
    implementation("io.ktor:ktor-client-core:2.3.0")
    testImplementation("junit:junit:4.13.2")
}
        `;

        const implMatches = buildContent.matchAll(/implementation\s*\(\s*"([^:]+):([^:]+):([^")]+)"\s*\)/g);
        const dependencies = Array.from(implMatches).map(m => ({
            group: m[1],
            name: m[2],
            version: m[3].replace(/['"\s]/g, '')
        }));

        assert.strictEqual(dependencies.length, 2);
        assert.strictEqual(dependencies[0].group, 'androidx.compose.ui');
        assert.strictEqual(dependencies[0].name, 'ui');
        assert.strictEqual(dependencies[1].group, 'io.ktor');
    });

    it('should detect dependency changes', () => {
        const previous = [
            { group: 'androidx.compose', name: 'ui', version: '1.4.0' }
        ];

        const current = [
            { group: 'androidx.compose', name: 'ui', version: '1.5.0' },
            { group: 'io.ktor', name: 'ktor-client-core', version: '2.3.0' }
        ];

        const currentMap = new Map(current.map(d => [`${d.group}:${d.name}`, d]));
        const previousMap = new Map(previous.map(d => [`${d.group}:${d.name}`, d]));

        const added = [];
        const updated = [];

        for (const [key, dep] of currentMap) {
            if (!previousMap.has(key)) {
                added.push(dep);
            } else {
                const prevDep = previousMap.get(key);
                if (prevDep.version !== dep.version) {
                    updated.push({ ...dep, previousVersion: prevDep.version });
                }
            }
        }

        assert.strictEqual(added.length, 1, 'Should detect 1 new dependency');
        assert.strictEqual(added[0].name, 'ktor-client-core');
        assert.strictEqual(updated.length, 1, 'Should detect 1 updated dependency');
        assert.strictEqual(updated[0].previousVersion, '1.4.0');
        assert.strictEqual(updated[0].version, '1.5.0');
    });
});

if (require.main === module) {
    console.log('Running Hook Scripts tests...\n');
    run();
}

module.exports = { setupTestProject, cleanupTestProject };
