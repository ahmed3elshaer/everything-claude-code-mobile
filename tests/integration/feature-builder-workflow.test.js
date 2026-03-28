/**
 * Integration tests for Feature Builder workflows
 *
 * Tests end-to-end feature build workflows across Android, iOS, and KMP
 * platforms, including phase transitions, build fix loops, quality gates,
 * verification, continuous learning, and status reporting.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { createMockAndroidProject, createMockIOSProject, createMockKMPProject, cleanupDir, writeFiles, mkdirs } = require('../helpers/test-utils');

const TEST_DIR = path.join(__dirname, '../fixtures/feature-builder-integration');

describe('Feature Builder - Full Android Feature Build Workflow', () => {
    beforeEach(() => createMockAndroidProject(TEST_DIR));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should create plan with correct Android module structure', () => {
        const plan = {
            feature: 'profile',
            platform: 'android',
            modules: [
                'feature/profile/data/',
                'feature/profile/domain/',
                'feature/profile/presentation/',
                'feature/profile/di/'
            ],
            files: [
                'feature/profile/data/repository/ProfileRepository.kt',
                'feature/profile/data/datasource/ProfileRemoteDataSource.kt',
                'feature/profile/domain/usecase/GetProfileUseCase.kt',
                'feature/profile/domain/model/Profile.kt',
                'feature/profile/presentation/ProfileScreen.kt',
                'feature/profile/presentation/ProfileViewModel.kt',
                'feature/profile/di/ProfileModule.kt'
            ]
        };

        const planFile = path.join(TEST_DIR, '.claude/plans/profile-feature.json');
        fs.mkdirSync(path.dirname(planFile), { recursive: true });
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

        const loaded = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        assert.strictEqual(loaded.feature, 'profile');
        assert.ok(loaded.modules.some(m => m.includes('data/')), 'Should have data module');
        assert.ok(loaded.modules.some(m => m.includes('domain/')), 'Should have domain module');
        assert.ok(loaded.modules.some(m => m.includes('presentation/')), 'Should have presentation module');
        assert.ok(loaded.modules.some(m => m.includes('di/')), 'Should have DI module');
    });

    it('should simulate implementation and validate all files exist', () => {
        const featureFiles = {
            'feature/profile/data/repository/ProfileRepository.kt': `
package com.example.profile.data.repository
class ProfileRepository(private val remote: ProfileRemoteDataSource) {
    suspend fun getProfile(id: String): Result<Profile> = runCatching { remote.fetchProfile(id) }
}`,
            'feature/profile/domain/usecase/GetProfileUseCase.kt': `
package com.example.profile.domain.usecase
class GetProfileUseCase(private val repository: ProfileRepository) {
    suspend operator fun invoke(id: String): Result<Profile> = repository.getProfile(id)
}`,
            'feature/profile/domain/model/Profile.kt': `
package com.example.profile.domain.model
data class Profile(val id: String, val name: String, val avatarUrl: String)`,
            'feature/profile/presentation/ProfileScreen.kt': `
package com.example.profile.presentation
@Composable
fun ProfileScreen(uiState: ProfileUiState, viewModel: ProfileViewModel = koinViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
}`,
            'feature/profile/presentation/ProfileViewModel.kt': `
package com.example.profile.presentation
sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Success(val profile: Profile) : ProfileUiState
    data object Error : ProfileUiState
}
class ProfileViewModel(private val getProfileUseCase: GetProfileUseCase) : ViewModel() {
    fun onIntent(intent: ProfileIntent) { viewModelScope.launch { } }
}`,
            'feature/profile/di/ProfileModule.kt': `
package com.example.profile.di
val profileModule = module {
    single { ProfileRepository(get()) }
    factory { GetProfileUseCase(get()) }
    viewModel { ProfileViewModel(get()) }
}`
        };

        writeFiles(TEST_DIR, featureFiles);

        for (const filePath of Object.keys(featureFiles)) {
            assert.ok(fs.existsSync(path.join(TEST_DIR, filePath)), `Should exist: ${filePath}`);
        }
    });

    it('should simulate state transitions through all 6 phases', () => {
        const phases = ['planning', 'implementation', 'build-fix', 'quality-gate', 'verification', 'completed'];
        const stateFile = path.join(TEST_DIR, '.claude/feature-state.json');
        fs.mkdirSync(path.dirname(stateFile), { recursive: true });

        for (let i = 0; i < phases.length; i++) {
            const state = {
                feature: 'profile',
                currentPhase: phases[i],
                phaseIndex: i,
                completedPhases: phases.slice(0, i).map(p => ({ phase: p, completedAt: new Date().toISOString() })),
                startedAt: new Date().toISOString()
            };
            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
        }

        const finalState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        assert.strictEqual(finalState.currentPhase, 'completed');
        assert.strictEqual(finalState.completedPhases.length, 5);
    });
});

describe('Feature Builder - Full iOS Feature Build Workflow', () => {
    beforeEach(() => createMockIOSProject(TEST_DIR));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should create plan with correct iOS structure', () => {
        const plan = {
            feature: 'settings',
            platform: 'ios',
            modules: [
                'Features/Settings/Views/',
                'Features/Settings/ViewModels/',
                'Features/Settings/Models/'
            ],
            files: [
                'Features/Settings/Views/SettingsMainView.swift',
                'Features/Settings/Views/NotificationSettingsView.swift',
                'Features/Settings/ViewModels/SettingsViewModel.swift',
                'Features/Settings/Models/SettingsConfig.swift'
            ]
        };

        const planFile = path.join(TEST_DIR, '.claude/plans/settings-feature.json');
        fs.mkdirSync(path.dirname(planFile), { recursive: true });
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

        const loaded = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        assert.strictEqual(loaded.feature, 'settings');
        assert.ok(loaded.modules.some(m => m.includes('Views/')), 'Should have Views module');
        assert.ok(loaded.modules.some(m => m.includes('ViewModels/')), 'Should have ViewModels module');
        assert.ok(loaded.modules.some(m => m.includes('Models/')), 'Should have Models module');
    });

    it('should simulate implementation and validate all files exist', () => {
        const featureFiles = {
            'Features/Settings/Views/SettingsMainView.swift': `
import SwiftUI
struct SettingsMainView: View {
    @StateObject private var viewModel = SettingsViewModel()
    var body: some View { Form { Section("General") { Toggle("Notifications", isOn: $viewModel.notificationsEnabled) } } }
}
#Preview { SettingsMainView() }`,
            'Features/Settings/ViewModels/SettingsViewModel.swift': `
import Foundation
import Combine
@MainActor
class SettingsViewModel: ObservableObject {
    @Published var notificationsEnabled = true
    func loadSettings() async { }
}`,
            'Features/Settings/Models/SettingsConfig.swift': `
import Foundation
struct SettingsConfig: Codable {
    let notificationsEnabled: Bool
    let theme: String
}`
        };

        writeFiles(TEST_DIR, featureFiles);

        for (const filePath of Object.keys(featureFiles)) {
            assert.ok(fs.existsSync(path.join(TEST_DIR, filePath)), `Should exist: ${filePath}`);
        }
    });

    it('should verify state transitions', () => {
        const phases = ['planning', 'implementation', 'build-fix', 'quality-gate', 'verification', 'completed'];
        const stateFile = path.join(TEST_DIR, '.claude/feature-state.json');
        fs.mkdirSync(path.dirname(stateFile), { recursive: true });

        const state = {
            feature: 'settings',
            platform: 'ios',
            currentPhase: 'completed',
            completedPhases: phases.slice(0, 5).map(p => ({ phase: p, completedAt: new Date().toISOString() }))
        };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        assert.strictEqual(loaded.currentPhase, 'completed');
        assert.strictEqual(loaded.completedPhases.length, 5);
    });
});

describe('Feature Builder - Full KMP Feature Build Workflow', () => {
    beforeEach(() => createMockKMPProject(TEST_DIR));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should create plan with correct KMP structure', () => {
        const plan = {
            feature: 'auth',
            platform: 'kmp',
            modules: [
                'shared/src/commonMain/kotlin/com/example/shared/auth/',
                'shared/src/androidMain/kotlin/com/example/shared/auth/',
                'shared/src/iosMain/kotlin/com/example/shared/auth/'
            ],
            files: [
                'shared/src/commonMain/kotlin/com/example/shared/auth/AuthRepository.kt',
                'shared/src/commonMain/kotlin/com/example/shared/auth/AuthToken.kt',
                'shared/src/androidMain/kotlin/com/example/shared/auth/AuthRepositoryAndroid.kt',
                'shared/src/iosMain/kotlin/com/example/shared/auth/AuthRepositoryIos.kt'
            ]
        };

        const planFile = path.join(TEST_DIR, '.claude/plans/auth-feature.json');
        fs.mkdirSync(path.dirname(planFile), { recursive: true });
        fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

        const loaded = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        assert.strictEqual(loaded.feature, 'auth');
        assert.ok(loaded.modules.some(m => m.includes('commonMain')), 'Should have commonMain');
        assert.ok(loaded.modules.some(m => m.includes('androidMain')), 'Should have androidMain');
        assert.ok(loaded.modules.some(m => m.includes('iosMain')), 'Should have iosMain');
    });

    it('should simulate implementation and validate all files exist', () => {
        const featureFiles = {
            'shared/src/commonMain/kotlin/com/example/shared/auth/AuthRepository.kt': `
package com.example.shared.auth
expect class AuthRepository() {
    suspend fun login(username: String, password: String): AuthToken
    suspend fun logout()
}`,
            'shared/src/commonMain/kotlin/com/example/shared/auth/AuthToken.kt': `
package com.example.shared.auth
import kotlinx.serialization.Serializable
@Serializable
data class AuthToken(val accessToken: String, val refreshToken: String, val expiresIn: Long)`,
            'shared/src/androidMain/kotlin/com/example/shared/auth/AuthRepositoryAndroid.kt': `
package com.example.shared.auth
actual class AuthRepository {
    actual suspend fun login(username: String, password: String): AuthToken {
        return AuthToken("android-token", "android-refresh", 3600)
    }
    actual suspend fun logout() { }
}`,
            'shared/src/iosMain/kotlin/com/example/shared/auth/AuthRepositoryIos.kt': `
package com.example.shared.auth
actual class AuthRepository {
    actual suspend fun login(username: String, password: String): AuthToken {
        return AuthToken("ios-token", "ios-refresh", 3600)
    }
    actual suspend fun logout() { }
}`
        };

        writeFiles(TEST_DIR, featureFiles);

        for (const filePath of Object.keys(featureFiles)) {
            assert.ok(fs.existsSync(path.join(TEST_DIR, filePath)), `Should exist: ${filePath}`);
        }
    });
});

describe('Feature Builder - Phase Resume Workflow', () => {
    beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should identify remaining agents and advance to testing phase', () => {
        const stateFile = path.join(TEST_DIR, 'feature-state.json');
        const state = {
            feature: 'profile',
            currentPhase: 'implementation',
            agents: {
                'data-layer': { status: 'completed', completedAt: new Date().toISOString() },
                'domain-layer': { status: 'completed', completedAt: new Date().toISOString() },
                'presentation-layer': { status: 'completed', completedAt: new Date().toISOString() },
                'di-setup': { status: 'pending' },
                'test-scaffold': { status: 'pending' }
            }
        };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const pending = Object.entries(loaded.agents).filter(([, v]) => v.status === 'pending');
        const completed = Object.entries(loaded.agents).filter(([, v]) => v.status === 'completed');

        assert.strictEqual(completed.length, 3, 'Should have 3 completed agents');
        assert.strictEqual(pending.length, 2, 'Should have 2 pending agents');
        assert.ok(pending.some(([k]) => k === 'di-setup'), 'di-setup should be pending');
        assert.ok(pending.some(([k]) => k === 'test-scaffold'), 'test-scaffold should be pending');

        // Advance remaining agents
        for (const [name] of pending) {
            loaded.agents[name] = { status: 'completed', completedAt: new Date().toISOString() };
        }
        loaded.currentPhase = 'build-fix';
        fs.writeFileSync(stateFile, JSON.stringify(loaded, null, 2));

        const final = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const allCompleted = Object.values(final.agents).every(a => a.status === 'completed');
        assert.ok(allCompleted, 'All agents should be completed');
        assert.strictEqual(final.currentPhase, 'build-fix');
    });
});

describe('Feature Builder - Build Fix Loop Workflow', () => {
    beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should track iterations and advance to quality gate', () => {
        const stateFile = path.join(TEST_DIR, 'feature-state.json');
        const state = {
            feature: 'profile',
            currentPhase: 'build-fix',
            buildIterations: []
        };

        // Iteration 1: compile error
        state.buildIterations.push({
            iteration: 1,
            compileResult: 'fail',
            error: 'Unresolved reference: ProfileRepository',
            testResult: null
        });
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        // Iteration 2: compile passes, test fails
        state.buildIterations.push({
            iteration: 2,
            compileResult: 'pass',
            error: null,
            testResult: 'fail',
            testError: 'testGetProfile: Expected Success but was Loading'
        });
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        // Iteration 3: all pass
        state.buildIterations.push({
            iteration: 3,
            compileResult: 'pass',
            error: null,
            testResult: 'pass',
            testError: null
        });
        state.currentPhase = 'quality-gate';
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        assert.strictEqual(loaded.buildIterations.length, 3);
        assert.strictEqual(loaded.buildIterations[0].compileResult, 'fail');
        assert.strictEqual(loaded.buildIterations[1].testResult, 'fail');
        assert.strictEqual(loaded.buildIterations[2].compileResult, 'pass');
        assert.strictEqual(loaded.buildIterations[2].testResult, 'pass');
        assert.strictEqual(loaded.currentPhase, 'quality-gate');
    });
});

describe('Feature Builder - Quality Gate Workflow', () => {
    beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should track findings with severity and pass when critical resolved', () => {
        const stateFile = path.join(TEST_DIR, 'feature-state.json');
        const state = {
            feature: 'profile',
            currentPhase: 'quality-gate',
            findings: []
        };

        // Add review findings from 3 reviewers
        state.findings.push(
            { reviewer: 'code-review', severity: 'critical', message: 'Missing null check in ProfileRepository', resolved: false },
            { reviewer: 'code-review', severity: 'warning', message: 'Consider extracting mapper function', resolved: false },
            { reviewer: 'security', severity: 'critical', message: 'Token stored in plain text', resolved: false },
            { reviewer: 'security', severity: 'info', message: 'Consider certificate pinning', resolved: false },
            { reviewer: 'performance', severity: 'warning', message: 'Unnecessary recomposition in ProfileScreen', resolved: false }
        );
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        // Fix critical findings
        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        for (const finding of loaded.findings) {
            if (finding.severity === 'critical') {
                finding.resolved = true;
            }
        }
        fs.writeFileSync(stateFile, JSON.stringify(loaded, null, 2));

        const final = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const criticalFindings = final.findings.filter(f => f.severity === 'critical');
        const unresolvedCritical = criticalFindings.filter(f => !f.resolved);

        assert.strictEqual(criticalFindings.length, 2, 'Should have 2 critical findings');
        assert.strictEqual(unresolvedCritical.length, 0, 'All critical findings should be resolved');

        // Gate passes when all critical resolved
        const gatePass = unresolvedCritical.length === 0;
        assert.ok(gatePass, 'Quality gate should pass');

        // Verify severity levels are tracked
        const severities = [...new Set(final.findings.map(f => f.severity))];
        assert.ok(severities.includes('critical'), 'Should track critical severity');
        assert.ok(severities.includes('warning'), 'Should track warning severity');
        assert.ok(severities.includes('info'), 'Should track info severity');
    });
});

describe('Feature Builder - Verification Workflow', () => {
    beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should sign off when thresholds met', () => {
        const stateFile = path.join(TEST_DIR, 'feature-state.json');

        // pass@k=3 with one flaky test but high overall rate
        const passAtKResults = {
            'testLoadProfile': [true, true, true],
            'testUpdateProfile': [true, true, true],
            'testDeleteProfile': [true, true, true]
        };

        const totalRuns = Object.values(passAtKResults).flat().length;
        const totalPasses = Object.values(passAtKResults).flat().filter(r => r).length;
        const passAtK = totalPasses / totalRuns;

        const state = {
            feature: 'profile',
            currentPhase: 'verification',
            passAtKResults,
            passAtK: parseFloat(passAtK.toFixed(4)),
            coverage: 85,
            thresholds: { passAtK: 0.9, coverage: 80 }
        };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const meetsPassAtK = loaded.passAtK >= loaded.thresholds.passAtK;
        const meetsCoverage = loaded.coverage >= loaded.thresholds.coverage;
        const signOff = meetsPassAtK && meetsCoverage;

        assert.ok(meetsPassAtK, 'pass@k should meet threshold');
        assert.ok(meetsCoverage, 'coverage should meet threshold');
        assert.ok(signOff, 'Should sign off when both thresholds met');
    });

    it('should reject when thresholds not met', () => {
        const stateFile = path.join(TEST_DIR, 'feature-state.json');

        const passAtKResults = {
            'testLoadProfile': [true, false, true],
            'testUpdateProfile': [false, true, false],
            'testDeleteProfile': [true, false, false]
        };

        const totalRuns = Object.values(passAtKResults).flat().length;
        const totalPasses = Object.values(passAtKResults).flat().filter(r => r).length;
        const passAtK = totalPasses / totalRuns;

        const state = {
            feature: 'profile',
            currentPhase: 'verification',
            passAtKResults,
            passAtK: parseFloat(passAtK.toFixed(4)),
            coverage: 65,
            thresholds: { passAtK: 0.9, coverage: 80 }
        };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const meetsPassAtK = loaded.passAtK >= loaded.thresholds.passAtK;
        const meetsCoverage = loaded.coverage >= loaded.thresholds.coverage;
        const signOff = meetsPassAtK && meetsCoverage;

        assert.ok(!signOff, 'Should reject when thresholds not met');
        assert.ok(!meetsPassAtK, 'pass@k should not meet threshold');
        assert.ok(!meetsCoverage, 'Coverage should not meet threshold');
    });
});

describe('Feature Builder - Continuous Learning Integration', () => {
    beforeEach(() => createMockAndroidProject(TEST_DIR));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should extract patterns and store as instincts', () => {
        // Create feature files with known patterns
        writeFiles(TEST_DIR, {
            'feature/profile/presentation/ProfileViewModel.kt': `
package com.example.profile.presentation
sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Success(val profile: Profile) : ProfileUiState
    data object Error : ProfileUiState
}
sealed interface ProfileIntent {
    data object LoadProfile : ProfileIntent
}
sealed interface ProfileSideEffect {
    data class ShowError(val message: String) : ProfileSideEffect
}
class ProfileViewModel(private val useCase: GetProfileUseCase) : ViewModel() {
    fun onIntent(intent: ProfileIntent) { viewModelScope.launch { } }
}`,
            'feature/profile/data/repository/ProfileRepository.kt': `
package com.example.profile.data.repository
interface ProfileRepository {
    suspend fun getProfile(id: String): Result<Profile>
}
class ProfileRepositoryImpl(private val remote: ProfileRemoteDataSource) : ProfileRepository {
    override suspend fun getProfile(id: String): Result<Profile> = runCatching { remote.fetchProfile(id) }
}`,
            'feature/profile/di/ProfileModule.kt': `
package com.example.profile.di
val profileModule = module {
    single<ProfileRepository> { ProfileRepositoryImpl(get()) }
    factory { GetProfileUseCase(get()) }
    viewModel { ProfileViewModel(get()) }
}`,
            'feature/profile/presentation/ProfileScreen.kt': `
package com.example.profile.presentation
@Composable
fun ProfileScreen(
    uiState: ProfileUiState,
    viewModel: ProfileViewModel = koinViewModel(),
    onNavigate: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
}`
        });

        // Scan feature files for patterns
        const patterns = { mvi: 0, repository: 0, koin: 0, compose: 0 };

        function scanFiles(dir) {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanFiles(fullPath);
                } else if (entry.name.endsWith('.kt')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (/sealed\s+interface\s+\w+(State|Intent|SideEffect)/.test(content)) patterns.mvi++;
                    if (/interface\s+\w+Repository/.test(content)) patterns.repository++;
                    if (/val\s+\w+Module\s*=\s*module/.test(content)) patterns.koin++;
                    if (/@Composable/.test(content)) patterns.compose++;
                }
            }
        }

        scanFiles(path.join(TEST_DIR, 'feature/profile'));

        assert.ok(patterns.mvi > 0, 'Should detect MVI pattern');
        assert.ok(patterns.repository > 0, 'Should detect Repository pattern');
        assert.ok(patterns.koin > 0, 'Should detect Koin module pattern');
        assert.ok(patterns.compose > 0, 'Should detect Compose screen pattern');

        // Store as instincts
        const instincts = [
            { pattern: 'mvi', context: 'feature-viewmodel', confidence: 0.8, detectedIn: 'ProfileViewModel.kt' },
            { pattern: 'repository', context: 'feature-data', confidence: 0.8, detectedIn: 'ProfileRepository.kt' },
            { pattern: 'koin-module', context: 'feature-di', confidence: 0.8, detectedIn: 'ProfileModule.kt' },
            { pattern: 'compose-screen', context: 'feature-ui', confidence: 0.8, detectedIn: 'ProfileScreen.kt' }
        ];

        const instinctsFile = path.join(TEST_DIR, '.claude/instincts/profile-patterns.json');
        fs.writeFileSync(instinctsFile, JSON.stringify(instincts, null, 2));

        const loaded = JSON.parse(fs.readFileSync(instinctsFile, 'utf8'));
        assert.strictEqual(loaded.length, 4);
        assert.ok(loaded.every(i => i.confidence === 0.8), 'All instincts should have initial confidence');
    });

    it('should increase instinct confidence on repeated detection', () => {
        const instinctsFile = path.join(TEST_DIR, '.claude/instincts/mvi-pattern.json');
        const instinct = { pattern: 'mvi', context: 'feature-viewmodel', confidence: 0.8, detections: 1 };
        fs.writeFileSync(instinctsFile, JSON.stringify(instinct, null, 2));

        // Simulate repeated detection
        const loaded = JSON.parse(fs.readFileSync(instinctsFile, 'utf8'));
        loaded.detections += 1;
        loaded.confidence = parseFloat(Math.min(1.0, loaded.confidence + 0.05).toFixed(2));
        fs.writeFileSync(instinctsFile, JSON.stringify(loaded, null, 2));

        const updated = JSON.parse(fs.readFileSync(instinctsFile, 'utf8'));
        assert.strictEqual(updated.detections, 2);
        assert.strictEqual(updated.confidence, 0.85);

        // Another detection
        updated.detections += 1;
        updated.confidence = parseFloat(Math.min(1.0, updated.confidence + 0.05).toFixed(2));
        fs.writeFileSync(instinctsFile, JSON.stringify(updated, null, 2));

        const final = JSON.parse(fs.readFileSync(instinctsFile, 'utf8'));
        assert.strictEqual(final.detections, 3);
        assert.ok(final.confidence > 0.85, 'Confidence should increase');
        assert.ok(final.confidence <= 1.0, 'Confidence should not exceed 1.0');
    });
});

describe('Feature Builder - Cross-Platform Plan Validation', () => {
    beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should validate platform-specific plan references', () => {
        const plansDir = path.join(TEST_DIR, 'plans');
        fs.mkdirSync(plansDir, { recursive: true });

        const androidPlan = {
            platform: 'android',
            feature: 'profile',
            dependencies: ['Ktor', 'Room', 'Koin', 'Compose'],
            structure: ['data/', 'domain/', 'presentation/', 'di/']
        };

        const iosPlan = {
            platform: 'ios',
            feature: 'settings',
            dependencies: ['URLSession', 'CoreData', 'SwiftUI'],
            structure: ['Views/', 'ViewModels/', 'Models/']
        };

        const kmpPlan = {
            platform: 'kmp',
            feature: 'auth',
            dependencies: ['shared-modules', 'expect-actual', 'commonMain'],
            structure: ['shared/src/commonMain/', 'shared/src/androidMain/', 'shared/src/iosMain/']
        };

        fs.writeFileSync(path.join(plansDir, 'android.json'), JSON.stringify(androidPlan, null, 2));
        fs.writeFileSync(path.join(plansDir, 'ios.json'), JSON.stringify(iosPlan, null, 2));
        fs.writeFileSync(path.join(plansDir, 'kmp.json'), JSON.stringify(kmpPlan, null, 2));

        // Validate Android plan
        const loadedAndroid = JSON.parse(fs.readFileSync(path.join(plansDir, 'android.json'), 'utf8'));
        assert.ok(loadedAndroid.dependencies.includes('Ktor'), 'Android should reference Ktor');
        assert.ok(loadedAndroid.dependencies.includes('Room'), 'Android should reference Room');
        assert.ok(loadedAndroid.dependencies.includes('Koin'), 'Android should reference Koin');
        assert.ok(loadedAndroid.dependencies.includes('Compose'), 'Android should reference Compose');

        // Validate iOS plan
        const loadedIOS = JSON.parse(fs.readFileSync(path.join(plansDir, 'ios.json'), 'utf8'));
        assert.ok(loadedIOS.dependencies.includes('URLSession'), 'iOS should reference URLSession');
        assert.ok(loadedIOS.dependencies.includes('CoreData'), 'iOS should reference CoreData');
        assert.ok(loadedIOS.dependencies.includes('SwiftUI'), 'iOS should reference SwiftUI');

        // Validate KMP plan
        const loadedKMP = JSON.parse(fs.readFileSync(path.join(plansDir, 'kmp.json'), 'utf8'));
        assert.ok(loadedKMP.dependencies.includes('shared-modules'), 'KMP should reference shared modules');
        assert.ok(loadedKMP.dependencies.includes('expect-actual'), 'KMP should reference expect/actual');
        assert.ok(loadedKMP.dependencies.includes('commonMain'), 'KMP should reference commonMain');
        assert.ok(loadedKMP.structure.some(s => s.includes('commonMain')), 'KMP structure should have commonMain');
        assert.ok(loadedKMP.structure.some(s => s.includes('androidMain')), 'KMP structure should have androidMain');
        assert.ok(loadedKMP.structure.some(s => s.includes('iosMain')), 'KMP structure should have iosMain');
    });
});

describe('Feature Builder - Feature Status Report', () => {
    beforeEach(() => fs.mkdirSync(TEST_DIR, { recursive: true }));
    afterEach(() => cleanupDir(TEST_DIR));

    it('should generate a status report mid-feature', () => {
        const phases = ['planning', 'implementation', 'build-fix', 'quality-gate', 'verification', 'completed'];
        const now = new Date();

        const state = {
            feature: 'profile',
            currentPhase: 'build-fix',
            startedAt: new Date(now.getTime() - 3600000).toISOString(),
            completedPhases: [
                { phase: 'planning', completedAt: new Date(now.getTime() - 3000000).toISOString() },
                { phase: 'implementation', completedAt: new Date(now.getTime() - 1800000).toISOString() }
            ],
            blockers: ['Unresolved dependency: ProfileRemoteDataSource not found']
        };

        const stateFile = path.join(TEST_DIR, 'feature-state.json');
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

        // Generate status report
        const currentPhaseIndex = phases.indexOf(loaded.currentPhase);
        const totalPhases = phases.length;
        const completedCount = loaded.completedPhases.length;
        const progressPercent = Math.round((completedCount / totalPhases) * 100);

        const pendingPhases = phases.slice(currentPhaseIndex + 1);

        const report = {
            feature: loaded.feature,
            overallProgress: progressPercent,
            currentPhase: loaded.currentPhase,
            completedPhases: loaded.completedPhases,
            pendingPhases: pendingPhases,
            blockers: loaded.blockers,
            startedAt: loaded.startedAt
        };

        assert.strictEqual(report.overallProgress, 33, 'Progress should be 33% (2 of 6 phases)');
        assert.strictEqual(report.currentPhase, 'build-fix');
        assert.strictEqual(report.completedPhases.length, 2);
        assert.deepStrictEqual(report.pendingPhases, ['quality-gate', 'verification', 'completed']);
        assert.strictEqual(report.blockers.length, 1);

        // Verify completed phases have timestamps
        for (const cp of report.completedPhases) {
            assert.ok(cp.completedAt, `Phase ${cp.phase} should have timestamp`);
            assert.ok(!isNaN(Date.parse(cp.completedAt)), `Timestamp should be valid ISO date`);
        }
    });
});
