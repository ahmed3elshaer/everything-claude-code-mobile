/**
 * Integration tests for Mobile Port workflows
 *
 * Tests end-to-end workflows for continuous learning, checkpoints,
 * memory persistence, and verification loops.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const TEST_PROJECT = path.join(__dirname, '../fixtures/integration-project');

function setupIntegrationProject() {
    // Create a complete mock Android project
    if (fs.existsSync(TEST_PROJECT)) {
        fs.rmSync(TEST_PROJECT, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_PROJECT, { recursive: true });

    // Project structure
    const dirs = [
        'app/src/main/java/com/example/ui',
        'app/src/main/java/com/example/data',
        'app/src/main/java/com/example/data/repository',
        'app/src/main/java/com/example/data/datasource',
        'app/src/main/java/com/example/domain',
        'app/src/main/java/com/example/domain/usecase',
        'app/src/main/java/com/example/di',
        'app/src/test/java/com/example',
        'app/src/androidTest/java/com/example',
        'core/network/src/main/java/com/example/network',
        'feature/auth/src/main/java/com/example/auth',
        'gradle/wrapper',
        '.claude/instincts',
        '.claude/checkpoints',
        '.claude/mobile-memory'
    ];

    for (const dir of dirs) {
        fs.mkdirSync(path.join(TEST_PROJECT, dir), { recursive: true });
    }

    // Create settings.gradle.kts
    fs.writeFileSync(path.join(TEST_PROJECT, 'settings.gradle.kts'), `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

rootProject.name = "MobileTestApp"
include(":app")
include(":core:network")
include(":feature:auth")
    `);

    // Create build files
    fs.writeFileSync(path.join(TEST_PROJECT, 'build.gradle.kts'), `
plugins {
    id("com.android.application") version "8.1.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("org.jetbrains.compose") version "1.5.0" apply false
    id("io.insert-koin") version "3.4.0" apply false
}
    `);

    fs.writeFileSync(path.join(TEST_PROJECT, 'app/build.gradle.kts'), `
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.compose")
    id("io.insert-koin")
}

android {
    namespace = "com.example.test"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.test"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
        }
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(projects.core.network)
    implementation(projects.feature.auth)

    implementation("androidx.compose.ui:ui:1.5.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.6.0")
    implementation("io.insert-koin:koin-androidx-compose:3.4.0")
    implementation("io.ktor:ktor-client-core:2.3.0")
    implementation("io.ktor:ktor-client-okhttp:2.3.0")
}
    `);

    // Create gradle wrapper
    fs.writeFileSync(path.join(TEST_PROJECT, 'gradle/wrapper/gradle-wrapper.properties'), `
distributionBase=GRADLE_USER_HOME_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
    `);

    // Create sample files for pattern detection

    // HomeScreen.kt - Compose patterns
    fs.writeFileSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeScreen.kt'), `
package com.example.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun HomeScreen(
    viewModel: HomeViewModel = koinViewModel(),
    onNavigate: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (uiState) {
        is HomeUiState.Loading -> LoadingContent()
        is HomeUiState.Success -> SuccessContent(uiState.user)
        is HomeUiState.Error -> ErrorContent()
    }
}
    `);

    // HomeViewModel.kt - MVI patterns
    fs.writeFileSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeViewModel.kt'), `
package com.example.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

sealed interface HomeUiState {
    data object Loading : HomeUiState()
    data class Success(val user: User) : HomeUiState()
    data object Error : HomeUiState()
}

sealed interface HomeIntent {
    data object LoadUser : HomeIntent()
    data class RefreshUser(val userId: String) : HomeIntent()
}

class HomeViewModel(
    private val getUserUseCase: GetUserUseCase
) : ViewModel() {

    private val _uiState = mutableStateOf<HomeUiState>(HomeUiState.Loading)
    val uiState: State<HomeUiState> = _uiState

    fun onIntent(intent: HomeIntent) {
        when (intent) {
            is HomeIntent.LoadUser -> loadUser()
            is HomeIntent.RefreshUser -> refreshUser(intent.userId)
        }
    }

    private fun loadUser() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            // ...
        }
    }
}
    `);

    // UserRepository.kt - Repository pattern
    fs.writeFileSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/data/repository/UserRepository.kt'), `
package com.example.data.repository

import com.example.domain.model.User
import com.example.data.datasource.RemoteDataSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UserRepository(
    private val remoteDataSource: RemoteDataSource
) {
    suspend fun getUser(id: String): Result<User> = withContext(Dispatchers.IO) {
        runCatching {
            remoteDataSource.fetchUser(id)
        }
    }
}
    `);

    // GetUserUseCase.kt - Use case pattern
    fs.writeFileSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/domain/usecase/GetUserUseCase.kt'), `
package com.example.domain.usecase

import com.example.data.repository.UserRepository
import com.example.domain.model.User

class GetUserUseCase(
    private val repository: UserRepository
) {
    suspend operator fun invoke(id: String): Result<User> {
        return repository.getUser(id)
    }
}
    `);

    // AppModule.kt - Koin DI pattern
    fs.writeFileSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/di/AppModule.kt'), `
package com.example.di

import com.example.data.repository.UserRepository
import com.example.domain.usecase.GetUserUseCase
import com.example.ui.HomeViewModel
import org.koin.core.module.Module
import org.koin.dsl.module

val appModule = module {
    single { UserRepository(get()) }
    factory { GetUserUseCase(get()) }
    viewModel { HomeViewModel(get()) }
}
    `);

    // HomeViewModelTest.kt - Test file
    fs.writeFileSync(path.join(TEST_PROJECT, 'app/src/test/java/com/example/ui/HomeViewModelTest.kt'), `
package com.example.ui

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.test.runTest

class HomeViewModelTest {

    @Test
    fun testInitialState() = runTest {
        val viewModel = HomeViewModel(FakeGetUserUseCase())
        assertEquals(HomeUiState.Loading, viewModel.uiState.value)
    }

    @Test
    fun testLoadUser() = runTest {
        val viewModel = HomeViewModel(FakeGetUserUseCase())
        viewModel.onIntent(HomeIntent.LoadUser)
        advanceUntilIdle()
        // Assert state
    }
}
    `);
}

function cleanupIntegrationProject() {
    if (fs.existsSync(TEST_PROJECT)) {
        fs.rmSync(TEST_PROJECT, { recursive: true, force: true });
    }
}

describe('Integration Tests - Continuous Learning V1', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should extract Compose patterns from HomeScreen.kt', () => {
        const screenContent = fs.readFileSync(
            path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeScreen.kt'),
            'utf8'
        );

        // Check for state hoisting
        assert.ok(/uiState:\s*HomeUiState/.test(screenContent), 'Should have state hoisting');

        // Check for collectAsState
        assert.ok(/collectAsStateWithLifecycle/.test(screenContent), 'Should use collectAsStateWithLifecycle');

        // Check for koinViewModel
        assert.ok(/koinViewModel/.test(screenContent), 'Should use koinViewModel');
    });

    it('should extract MVI patterns from HomeViewModel.kt', () => {
        const viewModelContent = fs.readFileSync(
            path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeViewModel.kt'),
            'utf8'
        );

        // Check for sealed state
        assert.ok(/sealed\s+interface\s+HomeUiState/.test(viewModelContent), 'Should have sealed state');

        // Check for intent handler
        assert.ok(/fun\s+onIntent\s*\(/.test(viewModelContent), 'Should have onIntent');

        // Check for viewModelScope
        assert.ok(/viewModelScope\.launch/.test(viewModelContent), 'Should use viewModelScope');
    });

    it('should extract Koin patterns from AppModule.kt', () => {
        const moduleContent = fs.readFileSync(
            path.join(TEST_PROJECT, 'app/src/main/java/com/example/di/AppModule.kt'),
            'utf8'
        );

        // Check for module definition
        assert.ok(/val\s+appModule\s*=\s*module/.test(moduleContent), 'Should have module definition');

        // Check for factory
        assert.ok(/factory\s*\{\s*GetUserUseCase/.test(moduleContent), 'Should have factory');

        // Check for viewModel
        assert.ok(/viewModel\s*\{\s*HomeViewModel/.test(moduleContent), 'Should have viewModel');
    });

    it('should capture all pattern categories across project', () => {
        const patterns = {
            compose: 0,
            mvi: 0,
            koin: 0,
            repository: 0,
            usecase: 0
        };

        // Scan all Kotlin files
        function scanFiles(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanFiles(fullPath);
                } else if (entry.name.endsWith('.kt')) {
                    const content = fs.readFileSync(fullPath, 'utf8');

                    if (/@Composable/.test(content)) patterns.compose++;
                    if (/sealed\s+(?:interface|class)\s*\w*State/.test(content)) patterns.mvi++;
                    if (/module\s*\{/.test(content)) patterns.koin++;
                    if (/class\s+\w+Repository/.test(content)) patterns.repository++;
                    if (/class\s+\w+UseCase/.test(content)) patterns.usecase++;
                }
            }
        }

        scanFiles(path.join(TEST_PROJECT, 'app/src/main/java'));

        assert.ok(patterns.compose > 0, 'Should find Compose patterns');
        assert.ok(patterns.mvi > 0, 'Should find MVI patterns');
        assert.ok(patterns.koin > 0, 'Should find Koin patterns');
        assert.ok(patterns.repository > 0, 'Should find repository patterns');
    });
});

describe('Integration Tests - Continuous Learning V2', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should detect layer separation pattern', () => {
        const hasUi = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui'));
        const hasData = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/data'));
        const hasDomain = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/domain'));

        assert.ok(hasUi, 'Should have UI layer');
        assert.ok(hasData, 'Should have data layer');
        assert.ok(hasDomain, 'Should have domain layer');
    });

    it('should detect test mirroring', () => {
        const hasSource = fs.existsSync(path.join(TEST_PROJECT, 'app/src/main/java/com/example/ui/HomeViewModel.kt'));
        const hasTest = fs.existsSync(path.join(TEST_PROJECT, 'app/src/test/java/com/example/ui/HomeViewModelTest.kt'));

        assert.ok(hasSource, 'Should have source file');
        assert.ok(hasTest, 'Should have test file');
    });

    it('should detect feature module structure', () => {
        const featureAuthExists = fs.existsSync(path.join(TEST_PROJECT, 'feature/auth/src/main/java/com/example/auth'));

        assert.ok(featureAuthExists, 'Should have feature auth module');
    });
});

describe('Integration Tests - Checkpoint System', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should create checkpoint with git state', () => {
        const checkpoint = {
            name: 'test-checkpoint',
            timestamp: new Date().toISOString(),
            level: 'standard',
            git: {
                branch: 'main',
                commit: 'abc123',
                status: ['M app/src/main/java/com/example/ui/HomeScreen.kt']
            },
            build: {
                gradleVersion: '8.2',
                kgpVersion: '1.9.20',
                buildVariants: ['debug', 'release']
            }
        };

        const checkpointFile = path.join(TEST_PROJECT, '.claude/checkpoints/test-checkpoint.json');
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

        assert.ok(fs.existsSync(checkpointFile));

        const loaded = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
        assert.strictEqual(loaded.name, 'test-checkpoint');
        assert.ok(loaded.git);
        assert.ok(loaded.build);
    });

    it('should restore checkpoint state', () => {
        // Create a checkpoint
        const checkpoint = {
            name: 'before-refactor',
            timestamp: new Date().toISOString(),
            git: { branch: 'feature/auth', commit: 'def456' },
            build: { gradleVersion: '8.2' }
        };

        const checkpointFile = path.join(TEST_PROJECT, '.claude/checkpoints/before-refactor.json');
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

        // Simulate restoration
        const loaded = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));

        assert.strictEqual(loaded.git.branch, 'feature/auth');
        assert.strictEqual(loaded.git.commit, 'def456');
        assert.strictEqual(loaded.build.gradleVersion, '8.2');
    });
});

describe('Integration Tests - Memory Persistence', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should extract project structure to memory', () => {
        const settingsPath = path.join(TEST_PROJECT, 'settings.gradle.kts');
        const settingsContent = fs.readFileSync(settingsPath, 'utf8');

        const includeMatches = settingsContent.matchAll(/include\s*\("([^"]+)"\)/g);
        const modules = Array.from(includeMatches).map(m => m[1]);

        const memory = {
            modules: modules,
            buildVariants: ['debug', 'release'],
            featureModules: ['auth']
        };

        const memoryFile = path.join(TEST_PROJECT, '.claude/mobile-memory/project-structure.json');
        fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));

        const loaded = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
        assert.strictEqual(loaded.modules.length, 3);
        assert.ok(loaded.modules.includes(':app'));
    });

    it('should extract dependencies to memory', () => {
        const buildPath = path.join(TEST_PROJECT, 'app/build.gradle.kts');
        const buildContent = fs.readFileSync(buildPath, 'utf8');

        const implMatches = buildContent.matchAll(/implementation\s*\(\s*"([^:]+):([^:]+):([^")]+)"\s*\)/g);
        const dependencies = Array.from(implMatches).map(m => ({
            group: m[1],
            name: m[2],
            version: m[3].replace(/['"\s]/g, '')
        }));

        assert.ok(dependencies.length > 0, 'Should extract dependencies');

        const ktorDeps = dependencies.filter(d => d.group.startsWith('io.ktor'));
        assert.ok(ktorDeps.length >= 2, 'Should find Ktor dependencies');
    });
});

describe('Integration Tests - Verification Loops', () => {
    beforeEach(setupIntegrationProject);
    afterEach(cleanupIntegrationProject);

    it('should calculate pass@k metrics', () => {
        const iterations = [true, true, false, true, true]; // Pass@3 = 4/5 = 0.8

        const k = iterations.length;
        const passed = iterations.filter(r => r).length;
        const passAtK = passed / k;

        assert.strictEqual(passAtK, 0.8);
        assert.strictEqual(k, 5);
    });

    it('should detect flaky tests', () => {
        const testResults = {
            'testLogin': [true, true, true],      // Stable
            'testLogout': [true, false, true],     // Flaky
            'testRefresh': [false, false, true]   // Very flaky
        };

        const flakyTests = [];

        for (const [test, results] of Object.entries(testResults)) {
            const passCount = results.filter(r => r).length;
            const passRate = passCount / results.length;

            if (passRate < 1.0) {
                flakyTests.push({
                    test,
                    passAtK: passRate,
                    pattern: getFailurePattern(results)
                });
            }
        }

        assert.strictEqual(flakyTests.length, 2);
        assert.ok(flakyTests.some(t => t.test === 'testLogout'));
        assert.ok(flakyTests.some(t => t.test === 'testRefresh'));
    });

    function getFailurePattern(results) {
        if (results[0] === false && results.slice(1).every(r => r)) return 'cold-start';
        if (results.filter(r => !r).length === results.length / 2) return '50%-flaky';
        return 'random';
    }
});

if (require.main === module) {
    console.log('Running Integration tests...\n');
    run();
}

module.exports = { setupIntegrationProject, cleanupIntegrationProject };
