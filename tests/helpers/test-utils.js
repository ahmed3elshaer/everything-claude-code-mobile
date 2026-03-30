/**
 * Shared test utilities for everything-claude-code-mobile tests.
 *
 * Provides mock project scaffolding for Android, iOS, and KMP projects,
 * plus common setup/teardown helpers. Each caller should use a unique
 * base directory to avoid race conditions when tests run in parallel.
 */

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

/**
 * Safe recursive directory cleanup.
 */
function cleanupDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * Create directories, ensuring all parents exist.
 */
function mkdirs(base, dirs) {
    for (const dir of dirs) {
        fs.mkdirSync(path.join(base, dir), { recursive: true });
    }
}

/**
 * Write multiple files from a map of { relativePath: content }.
 */
function writeFiles(base, files) {
    for (const [relativePath, content] of Object.entries(files)) {
        const fullPath = path.join(base, relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
    }
}

/**
 * Create a mock Android project with Gradle, Kotlin source, and test files.
 */
function createMockAndroidProject(dir) {
    cleanupDir(dir);

    mkdirs(dir, [
        'app/src/main/java/com/example/ui',
        'app/src/main/java/com/example/data/repository',
        'app/src/main/java/com/example/data/datasource',
        'app/src/main/java/com/example/domain/usecase',
        'app/src/main/java/com/example/di',
        'app/src/test/java/com/example/ui',
        'app/src/androidTest/java/com/example',
        'core/network/src/main/java/com/example/network',
        'feature/auth/src/main/java/com/example/auth',
        'gradle/wrapper',
        '.claude/instincts',
        '.claude/checkpoints',
        '.claude/mobile-memory',
    ]);

    writeFiles(dir, {
        'settings.gradle.kts': `
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
`,
        'build.gradle.kts': `
plugins {
    id("com.android.application") version "8.1.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("org.jetbrains.compose") version "1.5.0" apply false
    id("io.insert-koin") version "3.4.0" apply false
}
`,
        'app/build.gradle.kts': `
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
        getByName("debug") {
            isMinifyEnabled = false
        }
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
`,
        'gradle/wrapper/gradle-wrapper.properties': `
distributionBase=GRADLE_USER_HOME_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
`,
        'app/src/main/java/com/example/ui/HomeScreen.kt': `
package com.example.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    viewModel: HomeViewModel = koinViewModel(),
    onNavigate: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    when (uiState) {
        is HomeUiState.Loading -> LoadingContent()
        is HomeUiState.Success -> SuccessContent(uiState.user)
        is HomeUiState.Error -> ErrorContent()
    }
}
`,
        'app/src/main/java/com/example/ui/HomeViewModel.kt': `
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
`,
        'app/src/main/java/com/example/data/repository/UserRepository.kt': `
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
`,
        'app/src/main/java/com/example/domain/usecase/GetUserUseCase.kt': `
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
`,
        'app/src/main/java/com/example/di/AppModule.kt': `
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
`,
        'app/src/test/java/com/example/ui/HomeViewModelTest.kt': `
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
`,
    });
}

/**
 * Create a mock iOS project with Xcode, SwiftUI, and SPM files.
 */
function createMockIOSProject(dir) {
    cleanupDir(dir);

    mkdirs(dir, [
        'MyApp.xcodeproj',
        'MyApp/Views',
        'MyApp/ViewModels',
        'MyApp/Models',
        'MyAppTests',
    ]);

    writeFiles(dir, {
        'Package.swift': `
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0"),
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.10.0"),
    ],
    targets: [
        .target(name: "MyApp", dependencies: ["Alamofire", "Kingfisher"]),
        .testTarget(name: "MyAppTests", dependencies: ["MyApp"]),
    ]
)
`,
        'Podfile': `
platform :ios, '17.0'
use_frameworks!

target 'MyApp' do
  pod 'SwiftLint', '~> 0.54'
  pod 'SnapKit', '~> 5.7'
end

target 'MyAppTests' do
  inherit! :search_paths
end
`,
        'Info.plist': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.example.MyApp</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>42</string>
    <key>MinimumOSVersion</key>
    <string>17.0</string>
    <key>NSCameraUsageDescription</key>
    <string>We need camera access for photos</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>We need location for nearby search</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>myapp</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
`,
        'MyApp/Views/HomeView.swift': `
import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var showSettings = false
    @Binding var isLoggedIn: Bool

    var body: some View {
        NavigationStack {
            List(viewModel.items) { item in
                ItemRow(item: item)
            }
            .navigationTitle("Home")
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
        }
    }
}

#Preview {
    HomeView(isLoggedIn: .constant(true))
}
`,
        'MyApp/Views/SettingsView.swift': `
import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @Environment(\\.dismiss) var dismiss

    var body: some View {
        Form {
            Section("Account") {
                Text(viewModel.username)
            }
        }
    }
}

#Preview {
    SettingsView(viewModel: SettingsViewModel())
}
`,
        'MyApp/ViewModels/HomeViewModel.swift': `
import Foundation
import Combine

@MainActor
class HomeViewModel: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false

    func loadItems() async {
        isLoading = true
        defer { isLoading = false }
        // fetch items
    }
}
`,
    });
}

/**
 * Create a mock KMP project with shared/android/ios source sets.
 */
function createMockKMPProject(dir) {
    cleanupDir(dir);

    mkdirs(dir, [
        'shared/src/commonMain/kotlin/com/example/shared/model',
        'shared/src/commonMain/kotlin/com/example/shared/repository',
        'shared/src/commonTest/kotlin/com/example/shared',
        'shared/src/androidMain/kotlin/com/example/shared',
        'shared/src/iosMain/kotlin/com/example/shared',
        'androidApp/src/main/java/com/example/android',
        'iosApp',
        'gradle/wrapper',
        '.claude/kmp-context',
    ]);

    writeFiles(dir, {
        'settings.gradle.kts': `
rootProject.name = "KMPTestApp"
include(":shared")
include(":androidApp")
`,
        'build.gradle.kts': `
plugins {
    id("com.android.application") version "8.1.0" apply false
    id("org.jetbrains.kotlin.multiplatform") version "1.9.20" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.20" apply false
}
`,
        'shared/build.gradle.kts': `
plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
    id("com.android.library")
}

kotlin {
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
                implementation("io.ktor:ktor-client-core:2.3.0")
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
        val androidMain by getting
        val iosMain by creating
    }
}

android {
    namespace = "com.example.shared"
    compileSdk = 34
    defaultConfig {
        minSdk = 24
    }
}
`,
        'gradle/wrapper/gradle-wrapper.properties': `
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.2-bin.zip
`,
        'shared/src/commonMain/kotlin/com/example/shared/model/User.kt': `
package com.example.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String
)
`,
        'shared/src/commonMain/kotlin/com/example/shared/model/ApiResponse.kt': `
package com.example.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiResponse<T>(
    val data: T?,
    val error: String? = null
)
`,
        'shared/src/commonMain/kotlin/com/example/shared/repository/UserRepository.kt': `
package com.example.shared.repository

import com.example.shared.model.User

expect class UserRepository() {
    suspend fun getUser(id: String): User
    suspend fun saveUser(user: User)
}
`,
        'shared/src/androidMain/kotlin/com/example/shared/UserRepository.kt': `
package com.example.shared.repository

import com.example.shared.model.User

actual class UserRepository {
    actual suspend fun getUser(id: String): User {
        // Android implementation
        return User(id, "Android User", "android@example.com")
    }
    actual suspend fun saveUser(user: User) {
        // Android implementation
    }
}
`,
        'shared/src/iosMain/kotlin/com/example/shared/UserRepository.kt': `
package com.example.shared.repository

import com.example.shared.model.User

actual class UserRepository {
    actual suspend fun getUser(id: String): User {
        // iOS implementation
        return User(id, "iOS User", "ios@example.com")
    }
    actual suspend fun saveUser(user: User) {
        // iOS implementation
    }
}
`,
    });
}

module.exports = {
    FIXTURES_DIR,
    cleanupDir,
    mkdirs,
    writeFiles,
    createMockAndroidProject,
    createMockIOSProject,
    createMockKMPProject,
};
