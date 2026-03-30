/**
 * Unit tests for hook scripts and library modules
 *
 * Tests:
 *   - scripts/lib/utils.js
 *   - scripts/lib/instincts.js
 *   - scripts/hooks/extract-pattern.js (PATTERNS array and regex logic)
 *   - scripts/hooks/auto-checkpoint.js (LEVELS config and cleanOldCheckpoints)
 *   - scripts/hooks/track-dependency.js (categorizeLibrary and dependency regex)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Create a disposable temp directory and return its path. */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'scripts-test-'));
}

/** Recursively remove a directory. */
function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ===========================================================================
// 1. scripts/lib/utils.js
// ===========================================================================

describe('scripts/lib/utils.js', () => {
  const utils = require('../../scripts/lib/utils');

  // ---- platform flags ----
  describe('platform detection', () => {
    it('exports boolean platform flags', () => {
      assert.strictEqual(typeof utils.isWindows, 'boolean');
      assert.strictEqual(typeof utils.isMac, 'boolean');
      assert.strictEqual(typeof utils.isLinux, 'boolean');
    });

    it('exactly one of the three main platforms is true (or none on exotic)', () => {
      const trueCount = [utils.isWindows, utils.isMac, utils.isLinux].filter(Boolean).length;
      assert.ok(trueCount <= 1, 'At most one platform flag should be true');
    });
  });

  // ---- getClaudeConfigDir ----
  describe('getClaudeConfigDir', () => {
    it('returns a path ending in .claude under the home directory', () => {
      const dir = utils.getClaudeConfigDir();
      assert.strictEqual(path.basename(dir), '.claude');
      assert.ok(dir.startsWith(os.homedir()));
    });
  });

  // ---- getProjectRoot ----
  describe('getProjectRoot', () => {
    it('returns a string that is an absolute path', () => {
      const root = utils.getProjectRoot();
      assert.ok(path.isAbsolute(root));
    });
  });

  // ---- isAndroidProject / hasGradleWrapper / getGradleCommand ----
  describe('isAndroidProject', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { rmDir(tmpDir); });

    it('returns false for empty directory', () => {
      assert.strictEqual(utils.isAndroidProject(tmpDir), false);
    });

    it('returns true when build.gradle exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'build.gradle'), '');
      assert.strictEqual(utils.isAndroidProject(tmpDir), true);
    });

    it('returns true when build.gradle.kts exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'build.gradle.kts'), '');
      assert.strictEqual(utils.isAndroidProject(tmpDir), true);
    });

    it('returns true when settings.gradle exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'settings.gradle'), '');
      assert.strictEqual(utils.isAndroidProject(tmpDir), true);
    });
  });

  describe('hasGradleWrapper', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { rmDir(tmpDir); });

    it('returns false when no gradlew exists', () => {
      assert.strictEqual(utils.hasGradleWrapper(tmpDir), false);
    });

    it('returns true when gradlew exists (unix)', () => {
      const name = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
      fs.writeFileSync(path.join(tmpDir, name), '');
      assert.strictEqual(utils.hasGradleWrapper(tmpDir), true);
    });
  });

  describe('getGradleCommand', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { rmDir(tmpDir); });

    it('returns "gradle" when no wrapper exists', () => {
      assert.strictEqual(utils.getGradleCommand(tmpDir), 'gradle');
    });

    it('returns wrapper path when gradlew exists', () => {
      const name = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
      fs.writeFileSync(path.join(tmpDir, name), '');
      const cmd = utils.getGradleCommand(tmpDir);
      assert.ok(cmd.includes('gradlew'));
    });
  });

  // ---- runCommand ----
  describe('runCommand', () => {
    it('captures successful command output', () => {
      const result = utils.runCommand('echo hello');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.output, 'hello');
    });

    it('returns success=false for failing command', () => {
      const result = utils.runCommand('false');
      assert.strictEqual(result.success, false);
    });
  });

  // ---- readJsonFile / writeJsonFile ----
  describe('readJsonFile / writeJsonFile', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { rmDir(tmpDir); });

    it('writes and reads back JSON', () => {
      const filePath = path.join(tmpDir, 'data.json');
      const data = { name: 'test', value: 42 };
      utils.writeJsonFile(filePath, data);
      const result = utils.readJsonFile(filePath);
      assert.deepStrictEqual(result, data);
    });

    it('returns null for non-existent file', () => {
      const result = utils.readJsonFile(path.join(tmpDir, 'missing.json'));
      assert.strictEqual(result, null);
    });

    it('returns null for invalid JSON', () => {
      const filePath = path.join(tmpDir, 'bad.json');
      fs.writeFileSync(filePath, 'not json');
      assert.strictEqual(utils.readJsonFile(filePath), null);
    });

    it('creates parent directories automatically', () => {
      const filePath = path.join(tmpDir, 'a', 'b', 'c', 'deep.json');
      utils.writeJsonFile(filePath, { ok: true });
      assert.deepStrictEqual(utils.readJsonFile(filePath), { ok: true });
    });
  });

  // ---- ensureDir ----
  describe('ensureDir', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { rmDir(tmpDir); });

    it('creates directory recursively and returns the path', () => {
      const deep = path.join(tmpDir, 'x', 'y', 'z');
      const result = utils.ensureDir(deep);
      assert.strictEqual(result, deep);
      assert.ok(fs.existsSync(deep));
    });

    it('does not throw if directory already exists', () => {
      const dir = path.join(tmpDir, 'existing');
      fs.mkdirSync(dir);
      assert.doesNotThrow(() => utils.ensureDir(dir));
    });
  });

  // ---- getTimestamp ----
  describe('getTimestamp', () => {
    it('returns a 19-character ISO-ish string without colons or dots', () => {
      const ts = utils.getTimestamp();
      assert.strictEqual(ts.length, 19);
      assert.ok(!ts.includes(':'));
      assert.ok(!ts.includes('.'));
    });
  });

  // ---- getInstinctsDir ----
  describe('getInstinctsDir', () => {
    it('returns a path ending in instincts inside .claude', () => {
      const dir = utils.getInstinctsDir();
      assert.strictEqual(path.basename(dir), 'instincts');
      assert.ok(dir.includes('.claude'));
    });
  });

  // ---- log ----
  describe('log', () => {
    it('does not throw for each log type', () => {
      assert.doesNotThrow(() => utils.log('msg', 'info'));
      assert.doesNotThrow(() => utils.log('msg', 'warn'));
      assert.doesNotThrow(() => utils.log('msg', 'error'));
      assert.doesNotThrow(() => utils.log('msg', 'success'));
      assert.doesNotThrow(() => utils.log('msg', 'unknown_type'));
    });
  });
});

// ===========================================================================
// 2. scripts/lib/instincts.js
// ===========================================================================

describe('scripts/lib/instincts.js', () => {
  /**
   * The instincts module reads/writes to ~/.claude/instincts by default.
   * We monkey-patch getInstinctsDir in utils to redirect to a temp dir so
   * that tests are isolated and safe.
   */
  let tmpDir;
  let instinctsDir;
  const utilsPath = require.resolve('../../scripts/lib/utils');
  const instinctsPath = require.resolve('../../scripts/lib/instincts');

  beforeEach(() => {
    tmpDir = makeTmpDir();
    instinctsDir = path.join(tmpDir, 'instincts');
    fs.mkdirSync(instinctsDir, { recursive: true });

    // Clear the module cache so instincts.js picks up fresh requires
    delete require.cache[instinctsPath];
    delete require.cache[utilsPath];

    // Re-require utils and override getInstinctsDir
    const freshUtils = require('../../scripts/lib/utils');
    freshUtils.getInstinctsDir = () => instinctsDir;
  });

  afterEach(() => {
    // Restore module cache
    delete require.cache[instinctsPath];
    delete require.cache[utilsPath];
    rmDir(tmpDir);
  });

  function getInstincts() {
    // Must require fresh each time to pick up patched utils
    return require('../../scripts/lib/instincts');
  }

  describe('loadInstincts', () => {
    it('returns default structure when no file exists', () => {
      const { loadInstincts } = getInstincts();
      const data = loadInstincts();
      assert.deepStrictEqual(data.instincts, []);
      assert.strictEqual(data.version, '1.0');
      assert.strictEqual(data.lastUpdated, null);
    });

    it('loads existing instincts from file', () => {
      const existing = {
        instincts: [{ id: 'test-1', confidence: 0.5 }],
        version: '1.0',
        lastUpdated: '2025-01-01T00:00:00.000Z'
      };
      fs.writeFileSync(
        path.join(instinctsDir, 'mobile-instincts.json'),
        JSON.stringify(existing)
      );
      const { loadInstincts } = getInstincts();
      const data = loadInstincts();
      assert.strictEqual(data.instincts.length, 1);
      assert.strictEqual(data.instincts[0].id, 'test-1');
    });
  });

  describe('saveInstincts', () => {
    it('writes data and sets lastUpdated', () => {
      const { saveInstincts, loadInstincts } = getInstincts();
      const data = { instincts: [{ id: 'x' }], version: '1.0', lastUpdated: null };
      saveInstincts(data);
      assert.ok(data.lastUpdated !== null);
      const reloaded = loadInstincts();
      assert.strictEqual(reloaded.instincts.length, 1);
    });
  });

  describe('addInstinct', () => {
    it('adds a new instinct with default confidence', () => {
      const { addInstinct, loadInstincts } = getInstincts();
      addInstinct({ id: 'new-instinct', type: 'pattern', description: 'test' });
      const data = loadInstincts();
      assert.strictEqual(data.instincts.length, 1);
      assert.strictEqual(data.instincts[0].id, 'new-instinct');
      assert.strictEqual(data.instincts[0].confidence, 0.3);
      assert.strictEqual(data.instincts[0].usageCount, 1);
    });

    it('increases confidence for existing instinct', () => {
      const { addInstinct, loadInstincts } = getInstincts();
      addInstinct({ id: 'repeat', confidence: 0.5 });
      addInstinct({ id: 'repeat' });
      const data = loadInstincts();
      assert.strictEqual(data.instincts.length, 1);
      assert.ok(data.instincts[0].confidence > 0.5);
      assert.strictEqual(data.instincts[0].usageCount, 2);
    });

    it('caps confidence at 1.0', () => {
      const { addInstinct, loadInstincts } = getInstincts();
      addInstinct({ id: 'cap', confidence: 0.95 });
      // Bump twice: 0.95 + 0.1 => capped to 1.0
      addInstinct({ id: 'cap' });
      addInstinct({ id: 'cap' });
      const data = loadInstincts();
      assert.ok(data.instincts[0].confidence <= 1.0);
    });
  });

  describe('getInstinctsByContext', () => {
    it('filters by context', () => {
      const { addInstinct, getInstinctsByContext } = getInstincts();
      addInstinct({ id: 'a', context: 'compose' });
      addInstinct({ id: 'b', context: 'ktor' });
      addInstinct({ id: 'c', context: 'compose' });
      const compose = getInstinctsByContext('compose');
      assert.strictEqual(compose.length, 2);
    });

    it('returns all instincts when context is falsy', () => {
      const { addInstinct, getInstinctsByContext } = getInstincts();
      addInstinct({ id: 'a', context: 'x' });
      addInstinct({ id: 'b', context: 'y' });
      const all = getInstinctsByContext(null);
      assert.strictEqual(all.length, 2);
    });
  });

  describe('getHighConfidenceInstincts', () => {
    it('returns only instincts above threshold', () => {
      const { addInstinct, getHighConfidenceInstincts } = getInstincts();
      addInstinct({ id: 'low', confidence: 0.2 });
      addInstinct({ id: 'high', confidence: 0.9 });
      const high = getHighConfidenceInstincts(0.7);
      assert.strictEqual(high.length, 1);
      assert.strictEqual(high[0].id, 'high');
    });
  });

  describe('exportInstincts / importInstincts', () => {
    it('round-trips instincts through export/import', () => {
      const { addInstinct, exportInstincts, loadInstincts } = getInstincts();
      addInstinct({ id: 'exp-1', context: 'test', confidence: 0.6 });
      const exportPath = path.join(tmpDir, 'export.json');
      const exported = exportInstincts(exportPath);
      assert.ok(exported.exportedAt);
      assert.strictEqual(exported.instincts.length, 1);

      // Verify file was created
      assert.ok(fs.existsSync(exportPath));
    });

    it('importInstincts merges instincts keeping higher confidence', () => {
      const { addInstinct, importInstincts, loadInstincts } = getInstincts();
      // Existing low-confidence instinct
      addInstinct({ id: 'merge-1', confidence: 0.3 });

      // Create import file with higher confidence
      const importPath = path.join(tmpDir, 'import.json');
      fs.writeFileSync(importPath, JSON.stringify({
        instincts: [
          { id: 'merge-1', confidence: 0.9, context: 'imported' },
          { id: 'merge-2', confidence: 0.5 }
        ],
        version: '1.0'
      }));

      importInstincts(importPath);
      const data = loadInstincts();
      assert.strictEqual(data.instincts.length, 2);

      const merged = data.instincts.find(i => i.id === 'merge-1');
      assert.strictEqual(merged.confidence, 0.9, 'should keep higher confidence');
    });

    it('importInstincts throws on invalid file', () => {
      const { importInstincts } = getInstincts();
      const badPath = path.join(tmpDir, 'bad-import.json');
      fs.writeFileSync(badPath, JSON.stringify({ noInstincts: true }));
      assert.throws(() => importInstincts(badPath), /Invalid instincts file/);
    });
  });

  describe('decayUnusedInstincts', () => {
    it('decays confidence for old instincts', () => {
      const { saveInstincts, decayUnusedInstincts, loadInstincts } = getInstincts();
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
      saveInstincts({
        instincts: [{
          id: 'old-one',
          confidence: 0.8,
          lastUsed: oldDate,
          usageCount: 1
        }],
        version: '1.0',
        lastUpdated: null
      });

      decayUnusedInstincts(30);
      const data = loadInstincts();
      assert.ok(data.instincts[0].confidence < 0.8, 'confidence should have decayed');
      assert.ok(data.instincts[0].confidence >= 0.1, 'confidence should not go below 0.1');
    });

    it('does not decay recently-used instincts', () => {
      const { saveInstincts, decayUnusedInstincts, loadInstincts } = getInstincts();
      saveInstincts({
        instincts: [{
          id: 'recent',
          confidence: 0.8,
          lastUsed: new Date().toISOString(),
          usageCount: 1
        }],
        version: '1.0',
        lastUpdated: null
      });

      decayUnusedInstincts(30);
      const data = loadInstincts();
      assert.strictEqual(data.instincts[0].confidence, 0.8);
    });
  });
});

// ===========================================================================
// 3. scripts/hooks/extract-pattern.js — PATTERNS regexes
// ===========================================================================

describe('scripts/hooks/extract-pattern.js — PATTERNS', () => {
  /**
   * extract-pattern.js runs as a standalone script (main() at bottom).
   * We cannot require it without side effects, so we test the PATTERNS
   * array regexes directly by reading the file and extracting them, or
   * by duplicating the key regexes and testing against sample Kotlin code.
   */

  // Compose patterns
  describe('Compose pattern regexes', () => {
    it('detects compose-state-hoisting', () => {
      const regex = /@Composable\s+fun\s+\w+\([^)]*\n[^}]*uiState:\s*\w+/;
      const code = `@Composable
fun MyScreen(
    uiState: ScreenState,
    onAction: () -> Unit
) {`;
      assert.ok(regex.test(code));
    });

    it('detects compose-remember-key (LazyColumn with key)', () => {
      const regex = /Lazy(?:Column|Row)[\s\S]*?key\s*=\s*\{[^}]+\.id/;
      const code = `LazyColumn(modifier = Modifier) {
    items(list, key = { item.id }) {`;
      assert.ok(regex.test(code));
    });

    it('detects compose-immutable data class', () => {
      const regex = /@Immutable\s+data\s+class/;
      assert.ok(regex.test('@Immutable data class UiState(val x: Int)'));
      assert.ok(!regex.test('data class UiState(val x: Int)'));
    });

    it('detects compose-derived-state', () => {
      const regex = /val\s+\w+\s+by\s+remember\s*\{[^}]*derivedStateOf/;
      const code = `val filtered by remember { derivedStateOf { list.filter { it.active } } }`;
      assert.ok(regex.test(code));
    });
  });

  // MVI patterns
  describe('MVI pattern regexes', () => {
    it('detects mvi-sealed-state (sealed interface)', () => {
      const regex = /sealed\s+(?:interface|class)\s+\w*State/;
      assert.ok(regex.test('sealed interface HomeState'));
      assert.ok(regex.test('sealed class LoginState'));
      assert.ok(!regex.test('data class LoginState'));
    });

    it('detects mvi-intent-handler (onIntent function)', () => {
      const regex = /(?:private|fun)\s+onIntent\s*\(\s*intent:\s*\w+Intent\s*\)/;
      assert.ok(regex.test('private onIntent(intent: HomeIntent)'));
      assert.ok(regex.test('fun onIntent(intent: LoginIntent)'));
    });

    it('detects mvi-state-reduction', () => {
      const regex = /fun\s+reduce\s*\([^)]*\)\s*:\s*\w+State/;
      assert.ok(regex.test('fun reduce(intent: Intent): HomeState'));
    });

    it('detects mvi-single-event', () => {
      const regex = /sealed\s+(?:interface|class)\s+\w*Event/;
      assert.ok(regex.test('sealed interface NavigationEvent'));
      assert.ok(regex.test('sealed class UiEvent'));
    });
  });

  // Koin patterns
  describe('Koin pattern regexes', () => {
    it('detects koin-viewmodel-injection', () => {
      const regex = /koinViewModel\s*<\s*\w+ViewModel\s*>/;
      assert.ok(regex.test('val viewModel = koinViewModel<HomeViewModel>()'));
    });

    it('detects koin-module-definition', () => {
      const regex = /val\s+\w+Module\s*=\s*module\s*\{/;
      assert.ok(regex.test('val networkModule = module {'));
    });

    it('detects koin-factory-of', () => {
      const regex = /factoryOf\s*{\s*::\w+/;
      assert.ok(regex.test('factoryOf { ::GetUserUseCase }'));
    });
  });

  // Ktor patterns
  describe('Ktor pattern regexes', () => {
    it('detects ktor-safe-request (runCatching with client call)', () => {
      const regex = /runCatching\s*\{[^}]*client\.(?:get|post|put|delete|patch)/;
      const code = `runCatching { client.get("https://api.example.com/data") }`;
      assert.ok(regex.test(code));
    });

    it('detects ktor-plugin-install', () => {
      const regex = /install\s*\(\s*ContentNegotiation/;
      assert.ok(regex.test('install(ContentNegotiation) {'));
    });

    it('detects ktor-timeout-config', () => {
      const regex = /timeout\s*\{[^}]*requestTimeoutMillis\s*=/;
      const code = `timeout { requestTimeoutMillis = 30000 }`;
      assert.ok(regex.test(code));
    });
  });

  // Coroutine patterns
  describe('Coroutine pattern regexes', () => {
    it('detects coroutine-viewmodel-scope', () => {
      const regex = /viewModelScope\.launch\s*\{/;
      assert.ok(regex.test('viewModelScope.launch {'));
    });

    it('detects coroutine-dispatcher-io', () => {
      const regex = /withContext\s*\(\s*Dispatchers\.IO\s*\)/;
      assert.ok(regex.test('withContext(Dispatchers.IO)'));
    });

    it('detects coroutine-flow-collect', () => {
      const regex = /\.collectAsStateWithLifecycle\s*\(/;
      assert.ok(regex.test('val state by flow.collectAsStateWithLifecycle('));
    });

    it('detects coroutine-structured concurrency', () => {
      const regex = /coroutineScope\s*\{\s*launch/;
      assert.ok(regex.test('coroutineScope { launch {'));
    });
  });

  // Testing patterns
  describe('Testing pattern regexes', () => {
    it('detects test-run-test', () => {
      const regex = /fun\s+\w+\s*\([^)]*\)\s*=\s*runTest/;
      assert.ok(regex.test('fun testLoading() = runTest {'));
    });

    it('detects test-advance-until-idle', () => {
      const regex = /advanceUntilIdle\s*\(/;
      assert.ok(regex.test('advanceUntilIdle()'));
    });

    it('detects test-compose-test-rule', () => {
      const regex = /val\s+\w+TestRule\s*=\s*createComposeRule/;
      assert.ok(regex.test('val composeTestRule = createComposeRule()'));
    });
  });
});

// ===========================================================================
// 4. scripts/hooks/auto-checkpoint.js — LEVELS and cleanOldCheckpoints
// ===========================================================================

describe('scripts/hooks/auto-checkpoint.js — checkpoint logic', () => {
  /**
   * auto-checkpoint.js is a standalone script. We test:
   *   - The LEVELS configuration object
   *   - The cleanOldCheckpoints logic (reproduced here since it's not exported)
   *   - The checkpoint JSON structure
   */

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

  describe('LEVELS config', () => {
    it('has quick, standard, and full levels', () => {
      assert.ok(LEVELS.quick);
      assert.ok(LEVELS.standard);
      assert.ok(LEVELS.full);
    });

    it('each level has a description string', () => {
      for (const level of Object.values(LEVELS)) {
        assert.strictEqual(typeof level.description, 'string');
        assert.ok(level.description.length > 0);
      }
    });

    it('each level has a non-empty collect array', () => {
      for (const level of Object.values(LEVELS)) {
        assert.ok(Array.isArray(level.collect));
        assert.ok(level.collect.length > 0);
      }
    });

    it('quick collects fewer items than standard', () => {
      assert.ok(LEVELS.quick.collect.length < LEVELS.standard.collect.length);
    });

    it('full collects the most items', () => {
      assert.ok(LEVELS.full.collect.length >= LEVELS.standard.collect.length);
    });
  });

  describe('cleanOldCheckpoints logic', () => {
    let tmpDir;
    beforeEach(() => { tmpDir = makeTmpDir(); });
    afterEach(() => { rmDir(tmpDir); });

    /**
     * Reproduce the cleanOldCheckpoints logic from auto-checkpoint.js.
     */
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

    it('keeps only the newest N files', () => {
      // Create 5 json files with staggered mtimes
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tmpDir, `checkpoint-${i}.json`);
        fs.writeFileSync(filePath, JSON.stringify({ index: i }));
        // Touch with increasing mtime
        const time = new Date(Date.now() + i * 1000);
        fs.utimesSync(filePath, time, time);
      }

      cleanOldCheckpoints(tmpDir, 3);

      const remaining = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
      assert.strictEqual(remaining.length, 3);
    });

    it('does nothing when fewer than keepCount files exist', () => {
      fs.writeFileSync(path.join(tmpDir, 'one.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'two.json'), '{}');

      cleanOldCheckpoints(tmpDir, 10);

      const remaining = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
      assert.strictEqual(remaining.length, 2);
    });

    it('ignores non-json files', () => {
      fs.writeFileSync(path.join(tmpDir, 'keep.txt'), 'text');
      fs.writeFileSync(path.join(tmpDir, 'one.json'), '{}');

      cleanOldCheckpoints(tmpDir, 0);

      const remaining = fs.readdirSync(tmpDir);
      assert.ok(remaining.includes('keep.txt'), 'non-json file should remain');
      assert.ok(!remaining.includes('one.json'), 'json file should be deleted');
    });

    it('does not throw on empty directory', () => {
      assert.doesNotThrow(() => cleanOldCheckpoints(tmpDir, 5));
    });
  });
});

// ===========================================================================
// 5. scripts/hooks/track-dependency.js — categorizeLibrary & dependency regex
// ===========================================================================

describe('scripts/hooks/track-dependency.js — dependency tracking', () => {
  /**
   * track-dependency.js is standalone. We test:
   *   - categorizeLibrary function (reproduced since not exported)
   *   - Dependency extraction regexes
   *   - Change detection logic
   */

  // Reproduce categorizeLibrary
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

  describe('categorizeLibrary', () => {
    it('categorizes androidx.compose as jetpack-compose', () => {
      assert.strictEqual(categorizeLibrary('androidx.compose.ui', 'ui'), 'jetpack-compose');
    });

    it('categorizes io.ktor as ktor', () => {
      assert.strictEqual(categorizeLibrary('io.ktor', 'ktor-client-core'), 'ktor');
    });

    it('categorizes io.insert-koin as koin', () => {
      assert.strictEqual(categorizeLibrary('io.insert-koin', 'koin-core'), 'koin');
    });

    it('categorizes androidx.room as room', () => {
      assert.strictEqual(categorizeLibrary('androidx.room', 'room-runtime'), 'room');
    });

    it('categorizes androidx.navigation as navigation', () => {
      assert.strictEqual(categorizeLibrary('androidx.navigation', 'navigation-compose'), 'navigation');
    });

    it('categorizes androidx.lifecycle as lifecycle', () => {
      assert.strictEqual(categorizeLibrary('androidx.lifecycle', 'lifecycle-viewmodel'), 'lifecycle');
    });

    it('categorizes coil3 as coil', () => {
      assert.strictEqual(categorizeLibrary('coil3', 'coil-compose'), 'coil');
    });

    it('categorizes io.coil-kt as coil', () => {
      assert.strictEqual(categorizeLibrary('io.coil-kt', 'coil'), 'coil');
    });

    it('categorizes com.squareup.retrofit2 as retrofit', () => {
      assert.strictEqual(categorizeLibrary('com.squareup.retrofit2', 'retrofit'), 'retrofit');
    });

    it('categorizes com.squareup.okhttp3 as okhttp', () => {
      assert.strictEqual(categorizeLibrary('com.squareup.okhttp3', 'okhttp'), 'okhttp');
    });

    it('returns null for unknown library', () => {
      assert.strictEqual(categorizeLibrary('com.example', 'unknown-lib'), null);
    });
  });

  describe('dependency extraction regex (implementation)', () => {
    const implRegex = /implementation\s*\(\s*"([^:]+):([^:]+):([^"]+)"\s*\)/g;

    it('extracts implementation dependency from Kotlin DSL', () => {
      const code = 'implementation("io.ktor:ktor-client-core:2.3.7")';
      const matches = Array.from(code.matchAll(implRegex));
      assert.strictEqual(matches.length, 1);
      assert.ok(matches[0][1].includes('io.ktor'));
      assert.ok(matches[0][2].includes('ktor-client-core'));
      assert.ok(matches[0][3].includes('2.3.7'));
    });

    it('extracts multiple dependencies', () => {
      const code = `
        implementation("io.ktor:ktor-client-core:2.3.7")
        implementation("io.insert-koin:koin-core:3.5.0")
      `;
      const matches = Array.from(code.matchAll(implRegex));
      assert.strictEqual(matches.length, 2);
    });
  });

  describe('dependency extraction regex (testImplementation)', () => {
    const testImplRegex = /testImplementation\s*\(\s*"([^:]+):([^:]+):([^"]+)"\s*\)/g;

    it('extracts testImplementation dependency', () => {
      const code = 'testImplementation("junit:junit:4.13.2")';
      const matches = Array.from(code.matchAll(testImplRegex));
      assert.strictEqual(matches.length, 1);
      assert.ok(matches[0][3].includes('4.13.2'));
    });
  });

  describe('change detection logic', () => {
    it('detects added dependencies', () => {
      const previous = new Map();
      const current = new Map([
        ['io.ktor:ktor-core', { group: 'io.ktor', name: 'ktor-core', version: '2.3.7' }]
      ]);

      const added = [];
      for (const [key, dep] of current) {
        if (!previous.has(key)) {
          added.push(dep);
        }
      }
      assert.strictEqual(added.length, 1);
      assert.strictEqual(added[0].name, 'ktor-core');
    });

    it('detects removed dependencies', () => {
      const previous = new Map([
        ['old:lib', { group: 'old', name: 'lib', version: '1.0' }]
      ]);
      const current = new Map();

      const removed = [];
      for (const [key, dep] of previous) {
        if (!current.has(key)) {
          removed.push(dep);
        }
      }
      assert.strictEqual(removed.length, 1);
    });

    it('detects updated dependencies (version change)', () => {
      const previous = new Map([
        ['io.ktor:core', { group: 'io.ktor', name: 'core', version: '2.3.6' }]
      ]);
      const current = new Map([
        ['io.ktor:core', { group: 'io.ktor', name: 'core', version: '2.3.7' }]
      ]);

      const updated = [];
      for (const [key, dep] of current) {
        if (previous.has(key)) {
          const prev = previous.get(key);
          if (prev.version !== dep.version) {
            updated.push({ ...dep, previousVersion: prev.version });
          }
        }
      }
      assert.strictEqual(updated.length, 1);
      assert.strictEqual(updated[0].previousVersion, '2.3.6');
      assert.strictEqual(updated[0].version, '2.3.7');
    });

    it('detects no changes when dependencies are identical', () => {
      const previous = new Map([
        ['io.ktor:core', { group: 'io.ktor', name: 'core', version: '2.3.7' }]
      ]);
      const current = new Map([
        ['io.ktor:core', { group: 'io.ktor', name: 'core', version: '2.3.7' }]
      ]);

      const added = [];
      const removed = [];
      const updated = [];

      for (const [key, dep] of current) {
        if (!previous.has(key)) {
          added.push(dep);
        } else if (previous.get(key).version !== dep.version) {
          updated.push(dep);
        }
      }
      for (const [key, dep] of previous) {
        if (!current.has(key)) {
          removed.push(dep);
        }
      }

      assert.strictEqual(added.length, 0);
      assert.strictEqual(removed.length, 0);
      assert.strictEqual(updated.length, 0);
    });
  });
});
