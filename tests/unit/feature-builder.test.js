/**
 * Unit tests for Feature Builder System
 *
 * Tests the feature builder pipeline: agent files, command files, skill files,
 * plugin registration, state management, plan documents, platform detection,
 * agent dependency DAG, phase transitions, and build-fix iteration logic.
 *
 * Tests exercise validation logic and file-system structure directly
 * against the project's agent/command/skill files and mock fixture data.
 */

const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const {
    createMockAndroidProject,
    createMockIOSProject,
    createMockKMPProject,
    cleanupDir,
    writeFiles,
    mkdirs,
} = require('../helpers/test-utils');

const ROOT_DIR = path.join(__dirname, '../../');
const AGENTS_DIR = path.join(ROOT_DIR, 'agents');
const COMMANDS_DIR = path.join(ROOT_DIR, 'commands');
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
const PLUGIN_FILE = path.join(ROOT_DIR, '.claude-plugin/plugin.json');

const TEST_DIR = path.join(__dirname, '../fixtures/feature-builder-test');
const STATE_DIR = path.join(TEST_DIR, '.omc/state');
const PLANS_DIR = path.join(TEST_DIR, '.omc/plans');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YAML frontmatter from a markdown file. Returns { meta, body }. */
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { meta: null, body: content };
    const meta = {};
    for (const line of match[1].split('\n')) {
        const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
        if (kv) meta[kv[1]] = kv[2].trim();
    }
    return { meta, body: match[2] };
}

/** JSON round-trip helpers. */
function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function readJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (_) { /* fall through */ }
    return null;
}

/** Detect platform from project structure. */
function detectPlatform(dir) {
    // KMP check
    const sharedBuild = path.join(dir, 'shared/build.gradle.kts');
    if (fs.existsSync(sharedBuild)) {
        const content = fs.readFileSync(sharedBuild, 'utf8');
        if (content.includes('kotlin("multiplatform")')) return 'kmp';
    }

    // iOS check
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.endsWith('.xcodeproj')) return 'ios';
    }

    // Android check
    if (
        fs.existsSync(path.join(dir, 'build.gradle.kts')) &&
        fs.existsSync(path.join(dir, 'settings.gradle.kts'))
    ) {
        return 'android';
    }

    return 'unknown';
}

/** Topological sort for agent dependency DAG. */
function topoSort(graph) {
    const visited = new Set();
    const order = [];
    function visit(node) {
        if (visited.has(node)) return;
        visited.add(node);
        for (const dep of graph[node] || []) {
            visit(dep);
        }
        order.push(node);
    }
    for (const node of Object.keys(graph)) {
        visit(node);
    }
    return order;
}

// ===========================================================================
// Tests
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Agent File Validation
// ---------------------------------------------------------------------------
describe('Feature Builder - Agent File Validation', () => {
    const NEW_AGENTS = [
        'feature-planner',
        'network-impl',
        'data-impl',
        'architecture-impl',
        'ui-impl',
        'wiring-impl',
        'unit-test-writer',
        'ui-test-writer',
    ];

    for (const agent of NEW_AGENTS) {
        describe(`agents/${agent}.md`, () => {
            it('should exist on disk', () => {
                const filePath = path.join(AGENTS_DIR, `${agent}.md`);
                assert.ok(fs.existsSync(filePath), `${agent}.md should exist`);
            });

            it('should have valid YAML frontmatter with required fields', () => {
                const filePath = path.join(AGENTS_DIR, `${agent}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                assert.ok(content.startsWith('---'), 'Should start with ---');

                const { meta } = parseFrontmatter(content);
                assert.ok(meta, 'Should have parseable frontmatter');
                assert.ok(meta.name, 'Should have name field');
                assert.ok(meta.description, 'Should have description field');
                assert.ok(meta.tools, 'Should have tools field');
                assert.ok(meta.model, 'Should have model field');
            });

            it('should have tools as a JSON array of strings', () => {
                const filePath = path.join(AGENTS_DIR, `${agent}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                const { meta } = parseFrontmatter(content);

                const tools = JSON.parse(meta.tools);
                assert.ok(Array.isArray(tools), 'tools should be an array');
                assert.ok(tools.length > 0, 'tools should not be empty');
                for (const tool of tools) {
                    assert.strictEqual(typeof tool, 'string', `tool "${tool}" should be a string`);
                }
            });

            it('should have model set to opus', () => {
                const filePath = path.join(AGENTS_DIR, `${agent}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                const { meta } = parseFrontmatter(content);
                assert.strictEqual(meta.model, 'opus', 'model should be opus');
            });

            it('should have markdown content after frontmatter', () => {
                const filePath = path.join(AGENTS_DIR, `${agent}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                const { body } = parseFrontmatter(content);
                assert.ok(body.trim().length > 0, 'Should have body content');
                assert.ok(body.includes('#'), 'Body should contain markdown headings');
            });
        });
    }
});

// ---------------------------------------------------------------------------
// 2. Command File Validation
// ---------------------------------------------------------------------------
describe('Feature Builder - Command File Validation', () => {
    const NEW_COMMANDS = [
        'feature-build',
        'feature-plan',
        'feature-implement',
        'feature-test',
        'feature-build-fix',
        'feature-quality-gate',
        'feature-verify',
        'feature-status',
    ];

    for (const cmd of NEW_COMMANDS) {
        describe(`commands/${cmd}.md`, () => {
            it('should exist on disk', () => {
                const filePath = path.join(COMMANDS_DIR, `${cmd}.md`);
                assert.ok(fs.existsSync(filePath), `${cmd}.md should exist`);
            });

            it('should have valid YAML frontmatter with description', () => {
                const filePath = path.join(COMMANDS_DIR, `${cmd}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                assert.ok(content.startsWith('---'), 'Should start with ---');

                const { meta } = parseFrontmatter(content);
                assert.ok(meta, 'Should have parseable frontmatter');
                assert.ok(meta.description, 'Should have description field');
            });

            it('should contain a Usage section', () => {
                const filePath = path.join(COMMANDS_DIR, `${cmd}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                assert.ok(
                    /##\s+Usage/i.test(content),
                    'Should contain a Usage section'
                );
            });

            it('should contain an Invokes, Workflow, or operational section', () => {
                const filePath = path.join(COMMANDS_DIR, `${cmd}.md`);
                const content = fs.readFileSync(filePath, 'utf8');
                const hasInvokes = /##\s+Invokes/i.test(content);
                const hasWorkflow = /##\s+Workflow/i.test(content);
                const hasPhases = /##\s+Phases/i.test(content);
                const hasReads = /##\s+Reads/i.test(content);
                const hasNoAgents = /##\s+No Agents/i.test(content);
                assert.ok(
                    hasInvokes || hasWorkflow || hasPhases || hasReads || hasNoAgents,
                    'Should contain an Invokes, Workflow, Phases, Reads, or No Agents section'
                );
            });
        });
    }
});

// ---------------------------------------------------------------------------
// 3. Skill File Validation
// ---------------------------------------------------------------------------
describe('Feature Builder - Skill File Validation', () => {
    const NEW_SKILLS = [
        'feature-builder',
        'room-patterns',
        'sqldelight-patterns',
        'offline-first',
        'navigation-compose',
        'accessibility-patterns',
        'pagination-patterns',
        'image-loading',
        'deep-linking',
        'push-notifications',
        'analytics-patterns',
        'feature-flags',
        'localization-patterns',
        'ci-cd-patterns',
        'app-lifecycle',
    ];

    for (const skill of NEW_SKILLS) {
        describe(`skills/${skill}/SKILL.md`, () => {
            it('should exist on disk', () => {
                const filePath = path.join(SKILLS_DIR, skill, 'SKILL.md');
                assert.ok(fs.existsSync(filePath), `${skill}/SKILL.md should exist`);
            });

            it('should have valid YAML frontmatter with name and description', () => {
                const filePath = path.join(SKILLS_DIR, skill, 'SKILL.md');
                const content = fs.readFileSync(filePath, 'utf8');
                assert.ok(content.startsWith('---'), 'Should start with ---');

                const { meta } = parseFrontmatter(content);
                assert.ok(meta, 'Should have parseable frontmatter');
                assert.ok(meta.name, `${skill} should have name field`);
                assert.ok(meta.description, `${skill} should have description field`);
            });

            it('should have content after frontmatter', () => {
                const filePath = path.join(SKILLS_DIR, skill, 'SKILL.md');
                const content = fs.readFileSync(filePath, 'utf8');
                const { body } = parseFrontmatter(content);
                assert.ok(body.trim().length > 0, 'Should have body content');
            });
        });
    }
});

// ---------------------------------------------------------------------------
// 4. Plugin Registration
// ---------------------------------------------------------------------------
describe('Feature Builder - Plugin Registration', () => {
    it('should have a valid plugin.json', () => {
        assert.ok(fs.existsSync(PLUGIN_FILE), 'plugin.json should exist');
        const plugin = readJson(PLUGIN_FILE);
        assert.ok(plugin, 'plugin.json should be valid JSON');
        assert.ok(plugin.name, 'Should have a name');
        assert.ok(plugin.agents, 'Should have agents array');
        assert.ok(plugin.skills, 'Should have skills array');
    });

    it('should list all 27 agents', () => {
        const plugin = readJson(PLUGIN_FILE);
        assert.strictEqual(
            plugin.agents.length,
            27,
            `Expected 27 agents, got ${plugin.agents.length}`
        );
    });

    it('should have all listed agent files existing on disk', () => {
        const plugin = readJson(PLUGIN_FILE);
        for (const agentPath of plugin.agents) {
            const resolved = path.resolve(ROOT_DIR, agentPath);
            assert.ok(
                fs.existsSync(resolved),
                `Agent file should exist: ${agentPath}`
            );
        }
    });

    it('should include all 8 new feature agents', () => {
        const plugin = readJson(PLUGIN_FILE);
        const newAgents = [
            'feature-planner', 'network-impl', 'data-impl',
            'architecture-impl', 'ui-impl', 'wiring-impl',
            'unit-test-writer', 'ui-test-writer',
        ];
        for (const agent of newAgents) {
            const found = plugin.agents.some(a => a.includes(agent));
            assert.ok(found, `plugin.json should list ${agent}`);
        }
    });

    it('should have skills array pointing to skills and commands', () => {
        const plugin = readJson(PLUGIN_FILE);
        assert.ok(
            plugin.skills.some(s => s.includes('skills')),
            'Should have skills directory reference'
        );
        assert.ok(
            plugin.skills.some(s => s.includes('commands')),
            'Should have commands directory reference'
        );
    });
});

// ---------------------------------------------------------------------------
// 5. Feature Plan State Management
// ---------------------------------------------------------------------------
describe('Feature Builder - State Management', () => {
    beforeEach(() => {
        fs.mkdirSync(STATE_DIR, { recursive: true });
    });

    afterEach(() => {
        cleanupDir(TEST_DIR);
    });

    it('should create a valid state file with required fields', () => {
        const state = {
            featureName: 'test-feature',
            platform: 'android',
            startedAt: new Date().toISOString(),
            currentPhase: 1,
            phases: {
                '1_planning': { status: 'in_progress' },
                '2_implementation': { status: 'pending' },
                '3_testing': { status: 'pending' },
                '4_build_fix': { status: 'pending' },
                '5_quality_gate': { status: 'pending' },
                '6_verification': { status: 'pending' },
            },
        };

        const filePath = path.join(STATE_DIR, 'feature-test.json');
        writeJson(filePath, state);

        const loaded = readJson(filePath);
        assert.ok(loaded);
        assert.strictEqual(loaded.featureName, 'test-feature');
        assert.strictEqual(loaded.currentPhase, 1);
        assert.ok(loaded.phases);
    });

    it('should validate each phase has a status field', () => {
        const state = {
            featureName: 'test-feature',
            currentPhase: 1,
            phases: {
                '1_planning': { status: 'completed' },
                '2_implementation': { status: 'pending' },
                '3_testing': { status: 'pending' },
                '4_build_fix': { status: 'pending' },
                '5_quality_gate': { status: 'pending' },
                '6_verification': { status: 'pending' },
            },
        };

        const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
        for (const [phaseName, phaseData] of Object.entries(state.phases)) {
            assert.ok(phaseData.status, `Phase ${phaseName} should have status`);
            assert.ok(
                validStatuses.includes(phaseData.status),
                `Phase ${phaseName} status "${phaseData.status}" should be valid`
            );
        }
    });

    it('should transition between phases', () => {
        const filePath = path.join(STATE_DIR, 'feature-transition.json');
        const state = {
            featureName: 'transition-test',
            currentPhase: 1,
            phases: {
                '1_planning': { status: 'in_progress' },
                '2_implementation': { status: 'pending' },
            },
        };
        writeJson(filePath, state);

        // Simulate phase transition
        const loaded = readJson(filePath);
        loaded.phases['1_planning'].status = 'completed';
        loaded.phases['1_planning'].completedAt = new Date().toISOString();
        loaded.phases['2_implementation'].status = 'in_progress';
        loaded.currentPhase = 2;
        writeJson(filePath, loaded);

        const updated = readJson(filePath);
        assert.strictEqual(updated.phases['1_planning'].status, 'completed');
        assert.strictEqual(updated.phases['2_implementation'].status, 'in_progress');
        assert.strictEqual(updated.currentPhase, 2);
    });

    it('should track agent completion within implementation phase', () => {
        const state = {
            featureName: 'agent-track',
            currentPhase: 2,
            phases: {
                '2_implementation': {
                    status: 'in_progress',
                    agents: {
                        'architecture-impl': { status: 'completed', filesCreated: ['Model.kt'] },
                        'network-impl': { status: 'in_progress', filesCreated: [] },
                        'ui-impl': { status: 'pending', filesCreated: [] },
                        'data-impl': { status: 'pending', filesCreated: [] },
                        'wiring-impl': { status: 'pending', filesCreated: [] },
                    },
                },
            },
        };

        const filePath = path.join(STATE_DIR, 'feature-agents.json');
        writeJson(filePath, state);

        const loaded = readJson(filePath);
        const agents = loaded.phases['2_implementation'].agents;
        assert.strictEqual(agents['architecture-impl'].status, 'completed');
        assert.strictEqual(agents['network-impl'].status, 'in_progress');
        assert.strictEqual(agents['ui-impl'].status, 'pending');
    });
});

// ---------------------------------------------------------------------------
// 6. Feature Plan Document
// ---------------------------------------------------------------------------
describe('Feature Builder - Plan Document Schema', () => {
    beforeEach(() => {
        fs.mkdirSync(PLANS_DIR, { recursive: true });
    });

    afterEach(() => {
        cleanupDir(TEST_DIR);
    });

    it('should create a plan with valid structure', () => {
        const plan = {
            featureName: 'profile',
            description: 'User profile editor',
            platform: 'android',
            architecture: { pattern: 'MVI', diFramework: 'Koin', networkClient: 'Ktor' },
            modules: {
                domain: { path: 'feature/profile/domain', files: ['model/Profile.kt'] },
                data: { path: 'feature/profile/data', files: ['remote/ProfileApi.kt'] },
                presentation: { path: 'feature/profile/presentation', files: ['ProfileScreen.kt'] },
                di: { path: 'feature/profile/di', files: ['ProfileModule.kt'] },
            },
            wiring: {
                navigationChanges: [{ file: 'AppNavGraph.kt', action: 'add_route' }],
                diRegistration: [{ file: 'AppModule.kt', action: 'add_module' }],
            },
            tests: {
                unit: ['ProfileViewModelTest.kt'],
                ui: ['ProfileScreenTest.kt'],
            },
            dependencies: {
                new: [{ name: 'io.coil-kt:coil-compose', version: '2.6.0' }],
                existing: ['io.ktor:ktor-client-core'],
            },
            tasks: [
                { id: 1, phase: 'impl', agent: 'architecture-impl', description: 'Create domain layer', dependsOn: [] },
                { id: 2, phase: 'impl', agent: 'network-impl', description: 'Create API client', dependsOn: [1] },
                { id: 3, phase: 'impl', agent: 'ui-impl', description: 'Create screen and ViewModel', dependsOn: [1] },
                { id: 4, phase: 'impl', agent: 'data-impl', description: 'Create repository impl', dependsOn: [1, 2] },
                { id: 5, phase: 'impl', agent: 'wiring-impl', description: 'Wire DI and navigation', dependsOn: [2, 3, 4] },
            ],
        };

        const filePath = path.join(PLANS_DIR, 'feature-profile.json');
        writeJson(filePath, plan);

        const loaded = readJson(filePath);
        assert.ok(loaded);
        assert.strictEqual(loaded.featureName, 'profile');
        assert.strictEqual(loaded.platform, 'android');
    });

    it('should have modules with domain/data/presentation/di sections', () => {
        const plan = readJson(path.join(PLANS_DIR, 'feature-profile.json')) || {};
        // Write a quick plan if not from previous test
        if (!plan.modules) {
            const p = {
                featureName: 'test',
                modules: {
                    domain: { path: 'd', files: [] },
                    data: { path: 'da', files: [] },
                    presentation: { path: 'p', files: [] },
                    di: { path: 'di', files: [] },
                },
            };
            writeJson(path.join(PLANS_DIR, 'feature-mod-test.json'), p);
            const loaded = readJson(path.join(PLANS_DIR, 'feature-mod-test.json'));
            assert.ok(loaded.modules.domain, 'Should have domain module');
            assert.ok(loaded.modules.data, 'Should have data module');
            assert.ok(loaded.modules.presentation, 'Should have presentation module');
            assert.ok(loaded.modules.di, 'Should have di module');
            return;
        }
        assert.ok(plan.modules.domain, 'Should have domain module');
        assert.ok(plan.modules.data, 'Should have data module');
        assert.ok(plan.modules.presentation, 'Should have presentation module');
        assert.ok(plan.modules.di, 'Should have di module');
    });

    it('should have tasks with id, phase, agent, description, dependsOn', () => {
        const plan = {
            featureName: 'task-test',
            tasks: [
                { id: 1, phase: 'impl', agent: 'architecture-impl', description: 'Domain', dependsOn: [] },
                { id: 2, phase: 'impl', agent: 'network-impl', description: 'Network', dependsOn: [1] },
            ],
        };
        writeJson(path.join(PLANS_DIR, 'feature-task-test.json'), plan);

        const loaded = readJson(path.join(PLANS_DIR, 'feature-task-test.json'));
        for (const task of loaded.tasks) {
            assert.ok(typeof task.id === 'number', 'Task should have numeric id');
            assert.ok(task.phase, 'Task should have phase');
            assert.ok(task.agent, 'Task should have agent');
            assert.ok(task.description, 'Task should have description');
            assert.ok(Array.isArray(task.dependsOn), 'Task should have dependsOn array');
        }
    });

    it('should have dependencies with new and existing arrays', () => {
        const plan = {
            featureName: 'dep-test',
            dependencies: {
                new: [{ name: 'io.coil-kt:coil', version: '2.6.0' }],
                existing: ['io.ktor:ktor-client-core'],
            },
        };
        writeJson(path.join(PLANS_DIR, 'feature-dep-test.json'), plan);

        const loaded = readJson(path.join(PLANS_DIR, 'feature-dep-test.json'));
        assert.ok(Array.isArray(loaded.dependencies.new), 'new deps should be array');
        assert.ok(Array.isArray(loaded.dependencies.existing), 'existing deps should be array');
    });
});

// ---------------------------------------------------------------------------
// 7. Platform Detection Logic
// ---------------------------------------------------------------------------
describe('Feature Builder - Platform Detection', () => {
    afterEach(() => {
        cleanupDir(path.join(__dirname, '../fixtures/platform-android'));
        cleanupDir(path.join(__dirname, '../fixtures/platform-ios'));
        cleanupDir(path.join(__dirname, '../fixtures/platform-kmp'));
    });

    it('should detect Android project', () => {
        const dir = path.join(__dirname, '../fixtures/platform-android');
        createMockAndroidProject(dir);
        assert.strictEqual(detectPlatform(dir), 'android');
    });

    it('should detect iOS project', () => {
        const dir = path.join(__dirname, '../fixtures/platform-ios');
        createMockIOSProject(dir);
        assert.strictEqual(detectPlatform(dir), 'ios');
    });

    it('should detect KMP project', () => {
        const dir = path.join(__dirname, '../fixtures/platform-kmp');
        createMockKMPProject(dir);
        assert.strictEqual(detectPlatform(dir), 'kmp');
    });

    it('should return unknown for empty directory', () => {
        const dir = path.join(__dirname, '../fixtures/platform-empty');
        fs.mkdirSync(dir, { recursive: true });
        assert.strictEqual(detectPlatform(dir), 'unknown');
        cleanupDir(dir);
    });
});

// ---------------------------------------------------------------------------
// 8. Implementation Agent Dependency DAG
// ---------------------------------------------------------------------------
describe('Feature Builder - Agent Dependency DAG', () => {
    const DAG = {
        'architecture-impl': [],
        'network-impl': ['architecture-impl'],
        'ui-impl': ['architecture-impl'],
        'data-impl': ['architecture-impl', 'network-impl'],
        'wiring-impl': ['architecture-impl', 'network-impl', 'ui-impl', 'data-impl'],
    };

    it('should have architecture-impl with no dependencies', () => {
        assert.deepStrictEqual(DAG['architecture-impl'], []);
    });

    it('should have network-impl depending on architecture-impl', () => {
        assert.ok(DAG['network-impl'].includes('architecture-impl'));
    });

    it('should have ui-impl depending on architecture-impl', () => {
        assert.ok(DAG['ui-impl'].includes('architecture-impl'));
    });

    it('should have data-impl depending on architecture-impl and network-impl', () => {
        assert.ok(DAG['data-impl'].includes('architecture-impl'));
        assert.ok(DAG['data-impl'].includes('network-impl'));
    });

    it('should have wiring-impl depending on all others', () => {
        assert.ok(DAG['wiring-impl'].includes('architecture-impl'));
        assert.ok(DAG['wiring-impl'].includes('network-impl'));
        assert.ok(DAG['wiring-impl'].includes('ui-impl'));
        assert.ok(DAG['wiring-impl'].includes('data-impl'));
    });

    it('should produce a valid topological order', () => {
        const order = topoSort(DAG);

        assert.strictEqual(order.length, 5, 'Should have 5 agents in order');

        // architecture-impl must come before all others
        const archIdx = order.indexOf('architecture-impl');
        assert.ok(archIdx < order.indexOf('network-impl'));
        assert.ok(archIdx < order.indexOf('ui-impl'));
        assert.ok(archIdx < order.indexOf('data-impl'));
        assert.ok(archIdx < order.indexOf('wiring-impl'));

        // network-impl must come before data-impl
        assert.ok(order.indexOf('network-impl') < order.indexOf('data-impl'));

        // wiring-impl must be last
        assert.strictEqual(order.indexOf('wiring-impl'), 4);
    });

    it('should allow network-impl and ui-impl to run in parallel', () => {
        // Both depend only on architecture-impl, not on each other
        assert.ok(!DAG['network-impl'].includes('ui-impl'));
        assert.ok(!DAG['ui-impl'].includes('network-impl'));
    });
});

// ---------------------------------------------------------------------------
// 9. Phase Transition Logic
// ---------------------------------------------------------------------------
describe('Feature Builder - Phase Transitions', () => {
    function canTransition(fromPhase, toPhase, conditions) {
        const rules = {
            'planning->implementation': () => conditions.planApproved === true,
            'implementation->testing': () => {
                const agents = ['architecture-impl', 'network-impl', 'ui-impl', 'data-impl', 'wiring-impl'];
                return agents.every(a => conditions.agentStatuses[a] === 'completed');
            },
            'testing->build_fix': () => conditions.testsCreated > 0,
            'build_fix->quality_gate': () =>
                conditions.compilationErrors.length === 0 &&
                conditions.testFailures.length === 0,
            'quality_gate->verification': () =>
                conditions.findings.every(f => f.resolved),
            'verification->done': () =>
                conditions.passAtK >= 0.9 && conditions.coverage >= 80,
        };
        const key = `${fromPhase}->${toPhase}`;
        return rules[key] ? rules[key]() : false;
    }

    it('should allow planning -> implementation when plan is approved', () => {
        assert.strictEqual(
            canTransition('planning', 'implementation', { planApproved: true }),
            true
        );
    });

    it('should block planning -> implementation when plan is not approved', () => {
        assert.strictEqual(
            canTransition('planning', 'implementation', { planApproved: false }),
            false
        );
    });

    it('should allow implementation -> testing when all 5 agents are completed', () => {
        const conditions = {
            agentStatuses: {
                'architecture-impl': 'completed',
                'network-impl': 'completed',
                'ui-impl': 'completed',
                'data-impl': 'completed',
                'wiring-impl': 'completed',
            },
        };
        assert.strictEqual(
            canTransition('implementation', 'testing', conditions),
            true
        );
    });

    it('should block implementation -> testing when agents are incomplete', () => {
        const conditions = {
            agentStatuses: {
                'architecture-impl': 'completed',
                'network-impl': 'completed',
                'ui-impl': 'in_progress',
                'data-impl': 'pending',
                'wiring-impl': 'pending',
            },
        };
        assert.strictEqual(
            canTransition('implementation', 'testing', conditions),
            false
        );
    });

    it('should allow testing -> build_fix when tests are created', () => {
        assert.strictEqual(
            canTransition('testing', 'build_fix', { testsCreated: 7 }),
            true
        );
    });

    it('should block testing -> build_fix when no tests created', () => {
        assert.strictEqual(
            canTransition('testing', 'build_fix', { testsCreated: 0 }),
            false
        );
    });

    it('should allow build_fix -> quality_gate when no errors', () => {
        assert.strictEqual(
            canTransition('build_fix', 'quality_gate', {
                compilationErrors: [],
                testFailures: [],
            }),
            true
        );
    });

    it('should block build_fix -> quality_gate with compilation errors', () => {
        assert.strictEqual(
            canTransition('build_fix', 'quality_gate', {
                compilationErrors: ['Unresolved reference: Foo'],
                testFailures: [],
            }),
            false
        );
    });

    it('should allow quality_gate -> verification when all findings resolved', () => {
        assert.strictEqual(
            canTransition('quality_gate', 'verification', {
                findings: [
                    { severity: 'medium', resolved: true },
                    { severity: 'low', resolved: true },
                ],
            }),
            true
        );
    });

    it('should block quality_gate -> verification with unresolved findings', () => {
        assert.strictEqual(
            canTransition('quality_gate', 'verification', {
                findings: [
                    { severity: 'high', resolved: false },
                ],
            }),
            false
        );
    });

    it('should allow verification -> done when pass@k >= 0.9 and coverage >= 80', () => {
        assert.strictEqual(
            canTransition('verification', 'done', { passAtK: 0.96, coverage: 84 }),
            true
        );
    });

    it('should block verification -> done when coverage below 80', () => {
        assert.strictEqual(
            canTransition('verification', 'done', { passAtK: 0.96, coverage: 72 }),
            false
        );
    });

    it('should block verification -> done when pass@k below 0.9', () => {
        assert.strictEqual(
            canTransition('verification', 'done', { passAtK: 0.85, coverage: 84 }),
            false
        );
    });
});

// ---------------------------------------------------------------------------
// 10. Build Fix Iteration Loop
// ---------------------------------------------------------------------------
describe('Feature Builder - Build Fix Iteration Loop', () => {
    beforeEach(() => {
        fs.mkdirSync(STATE_DIR, { recursive: true });
    });

    afterEach(() => {
        cleanupDir(TEST_DIR);
    });

    function createBuildFixState(overrides) {
        return {
            featureName: 'build-fix-test',
            currentPhase: 4,
            phases: {
                '4_build_fix': {
                    status: 'in_progress',
                    iterations: 0,
                    maxIterations: 5,
                    compilationErrors: [],
                    testFailures: [],
                    lastError: null,
                    lastFix: null,
                    ...overrides,
                },
            },
        };
    }

    it('should have max 5 iterations', () => {
        const state = createBuildFixState({});
        assert.strictEqual(state.phases['4_build_fix'].maxIterations, 5);
    });

    it('should track iteration count', () => {
        const filePath = path.join(STATE_DIR, 'feature-buildfix.json');
        const state = createBuildFixState({ iterations: 0 });
        writeJson(filePath, state);

        // Simulate iteration
        const loaded = readJson(filePath);
        loaded.phases['4_build_fix'].iterations += 1;
        loaded.phases['4_build_fix'].lastError = 'Unresolved reference: Foo';
        loaded.phases['4_build_fix'].lastFix = 'Added missing import';
        writeJson(filePath, loaded);

        const updated = readJson(filePath);
        assert.strictEqual(updated.phases['4_build_fix'].iterations, 1);
        assert.strictEqual(updated.phases['4_build_fix'].lastError, 'Unresolved reference: Foo');
    });

    it('should detect compilation errors', () => {
        const state = createBuildFixState({
            compilationErrors: [
                'Unresolved reference: BiometricManager',
                'Type mismatch: inferred type is String but Int was expected',
            ],
            testFailures: [],
        });

        const phase = state.phases['4_build_fix'];
        const hasCompilationErrors = phase.compilationErrors.length > 0;
        const hasTestFailures = phase.testFailures.length > 0;

        assert.ok(hasCompilationErrors, 'Should detect compilation errors');
        assert.ok(!hasTestFailures, 'Should not have test failures');
    });

    it('should detect test failures', () => {
        const state = createBuildFixState({
            compilationErrors: [],
            testFailures: [
                'HomeViewModelTest.testInitialState FAILED',
            ],
        });

        const phase = state.phases['4_build_fix'];
        const hasCompilationErrors = phase.compilationErrors.length > 0;
        const hasTestFailures = phase.testFailures.length > 0;

        assert.ok(!hasCompilationErrors, 'Should not have compilation errors');
        assert.ok(hasTestFailures, 'Should detect test failures');
    });

    it('should escalate after max iterations', () => {
        const state = createBuildFixState({ iterations: 5 });
        const phase = state.phases['4_build_fix'];

        const shouldEscalate = phase.iterations >= phase.maxIterations;
        assert.ok(shouldEscalate, 'Should escalate after 5 iterations');
    });

    it('should not escalate before max iterations', () => {
        const state = createBuildFixState({ iterations: 3 });
        const phase = state.phases['4_build_fix'];

        const shouldEscalate = phase.iterations >= phase.maxIterations;
        assert.ok(!shouldEscalate, 'Should not escalate at iteration 3');
    });

    it('should complete when no errors remain', () => {
        const state = createBuildFixState({
            iterations: 2,
            compilationErrors: [],
            testFailures: [],
        });

        const phase = state.phases['4_build_fix'];
        const allGreen =
            phase.compilationErrors.length === 0 &&
            phase.testFailures.length === 0;

        assert.ok(allGreen, 'Should be all green with no errors');

        // Mark completed
        phase.status = 'completed';
        assert.strictEqual(phase.status, 'completed');
    });
});
