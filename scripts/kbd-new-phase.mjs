// Port of kbd-new-phase.sh (prometheus-skill-pack, 274 lines).
//
// Manually creates a new top-level KBD phase: validates the name, refuses collisions, writes
// goals.md + progress.json atomically, flips current-waypoint.json + project.json activePhase,
// fires phase:before via lib/kbd/hooks.mjs.
//
// Judgment call: same runCommand divergence as kbd-next-child.mjs — see lib/kbd/hook-command.mjs.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../lib/platform/spawn.mjs';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { isRuntimeAuthoritative } from '../lib/kbd/runtime-authority.mjs';
import { isBottleneckActive, evaluateBottleneck, bottleneckSignalText } from '../lib/kbd/bottleneck-guard.mjs';
import { hooksFire } from '../lib/kbd/hooks.mjs';
import { runHookCommand } from '../lib/kbd/hook-command.mjs';

function die(message) {
  process.stderr.write(`kbd-new-phase: ${message}\n`);
  process.exit(1);
}
function warn(message) {
  process.stderr.write(`kbd-new-phase: warn: ${message}\n`);
}

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const WP = path.join('.kbd-orchestrator', 'current-waypoint.json');
const PJ = path.join('.kbd-orchestrator', 'project.json');

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function validateName(name) {
  if (!name) die('usage: kbd-new-phase.mjs <name> [goal-1] [goal-2] …');
  if (name.includes('..')) die('invalid name: parent traversal not allowed');
  if (name.includes('/')) die('invalid name: slashes not allowed');
  if (name === '.' || name === '..') die(`invalid name: '${name}'`);
  if (!NAME_RE.test(name)) die(`invalid name '${name}': must match ^[a-z0-9][a-z0-9._-]*$`);
}

async function runtimeAuthorityPath(name) {
  const guardEnabled = isBottleneckActive('.');
  const createResult = spawnExecutable('prometheus', [
    'kbd', '--path', '.', 'phase', 'create',
    '--command-id', `phase-create:${name}`,
    '--id', name, '--title', name,
  ]);
  if (createResult?.status !== 0) die(`phase create failed: ${createResult?.stderr ?? ''}`);

  if (guardEnabled) {
    const pre = evaluateBottleneck('phase', 'before', name, true, { root: '.' });
    if (pre.status !== 0) die('phase start precommit evaluation blocked');
  }
  const activateResult = spawnExecutable('prometheus', [
    'kbd', '--path', '.', 'phase', 'activate',
    '--command-id', `phase-activate:${name}`,
    '--id', name, '--exact-next-work', `/kbd-assess ${name}`,
  ]);
  if (activateResult?.status !== 0) die(`phase activate failed: ${activateResult?.stderr ?? ''}`);
  const transitionResult = spawnExecutable('prometheus', [
    'kbd', '--path', '.', 'phase', 'transition',
    '--command-id', `phase-start:${name}`,
    '--id', name, '--status', 'in-progress',
  ]);
  if (transitionResult?.status !== 0) die(`phase transition failed: ${transitionResult?.stderr ?? ''}`);

  if (guardEnabled) {
    const post = evaluateBottleneck('phase', 'before', name, false, { root: '.' });
    if (post.status !== 0) die('phase start postcommit evaluation blocked');
    process.stdout.write(`${bottleneckSignalText(post.stdout)}\n`);
  }
}

function writeGoals(phaseDir, goals) {
  const lines =
    goals.length > 0
      ? goals.map((g) => `- ${g}`)
      : ['<!-- TBD: enumerate goals before /kbd-assess -->'];
  atomicWrite(path.join(phaseDir, 'goals.md'), `# Goals\n\n${lines.join('\n')}\n`);
}

function writeProgress(phaseDir, name, sourceTool, now) {
  const progress = {
    schemaVersion: '2',
    phase: name,
    parentPhase: null,
    childPhases: [],
    childPointer: null,
    assessment_complete: false,
    plan_complete: false,
    execute_complete: false,
    reflect_complete: false,
    implementation_total: 0,
    implementation_completed: 0,
    changes_total: 0,
    changes_completed: 0,
    completion: {
      primaryCounter: 'implementation',
      implementation: { completed: 0, total: 0, status: 'PENDING' },
      evidence: { status: 'NOT_TRACKED', summary: null, blockers: [] },
      certification: { status: 'NOT_TRACKED', summary: null, blockers: [] },
      publication: { status: 'NOT_TRACKED', summary: null, blockers: [] },
    },
    completed_changes: [],
    active_change: null,
    blocked_changes: [],
    changes: [],
    last_updated: now,
    last_updated_by: 'kbd-new-phase',
    sourceTool,
    createdBy: 'kbd-new-phase',
    updatedAt: now,
  };
  atomicWrite(path.join(phaseDir, 'progress.json'), JSON.stringify(progress, null, 2));
}

function flipWaypoint(name, now) {
  mkdirSync(path.dirname(WP), { recursive: true });
  const existing = existsSync(WP) ? readJsonSafe(WP) : null;
  const priorPhase = existing?.phase ?? '';
  const revision = (existing?.revision ?? 0) + 1;

  const {
    stage, previous_phase, last_updated, last_updated_by, exact_next_command, fallback_command,
    active_change, next_pending_change, changes_total, changes_completed, changesCompleted, changesTotal,
    ...rest
  } = existing ?? {};

  const next = {
    ...rest,
    schemaVersion: '5',
    previousPhase: priorPhase || null,
    phase: name,
    change: null,
    status: 'assessment_ready',
    currentTask: `run kbd-assess for ${name}`,
    nextPendingChange: null,
    sourceTool: rest.sourceTool ?? 'unknown',
    exactNextCommand: `/kbd-assess ${name}`,
    parentPhase: null,
    childPhases: [],
    childPointer: null,
    path: [name],
    completionMetric: 'implementation',
    implementationCompleted: 0,
    implementationTotal: 0,
    certificationStatus: 'NOT_TRACKED',
    publicationStatus: 'NOT_TRACKED',
    planRevision: 1,
    revision,
    updatedAt: now,
  };
  atomicWrite(WP, JSON.stringify(next, null, 2));
  return next.sourceTool;
}

function flipProjectActivePhase(name, now, project) {
  if (project !== null) {
    const { active_phase, ...rest } = project;
    atomicWrite(PJ, JSON.stringify({ ...rest, activePhase: name, updatedAt: now }, null, 2));
    return;
  }
  warn(`${PJ} missing — writing a minimal project identity so KBD can keep project state isolated`);
  const projectName = path.basename(path.resolve('.'));
  atomicWrite(
    PJ,
    JSON.stringify(
      {
        name: projectName,
        activePhase: name,
        focus_project_path: path.resolve('.'),
        updatedAt: now,
        bootstrappedBy: 'kbd-new-phase',
      },
      null,
      2
    )
  );
}

async function main(argv) {
  const [name, ...goals] = argv;
  validateName(name);

  if (existsSync(WP)) {
    const parsed = readJsonSafe(WP);
    if (parsed === null) die(`malformed waypoint at ${WP} — fix by hand before retrying (no files were modified)`);
  }

  // Validate before runtime status/start as well as filesystem phase creation.
  const project = existsSync(PJ) ? readJsonSafe(PJ) : null;
  if (existsSync(PJ) && (project === null || typeof project !== 'object' || Array.isArray(project))) {
    die(`malformed project at ${PJ} — expected a JSON object; fix by hand before retrying (no files were modified)`);
  }

  const phaseDir = path.join('.kbd-orchestrator', 'phases', name);
  if (existsSync(phaseDir)) die(`phase already exists: ${phaseDir} (try /kbd-next-phase or pick another name)`);

  const now = new Date().toISOString();

  const runtimeAuthoritative = isRuntimeAuthoritative('.');
  if (runtimeAuthoritative) {
    const statusResult = spawnExecutable('prometheus', ['kbd', '--path', '.', 'status', '--json']);
    if (statusResult?.status !== 0) die('could not read canonical runtime status');
    const state = JSON.parse(statusResult.stdout);
    const lifecycle = state?.lifecycle ?? '';
    if (lifecycle === 'completed' || lifecycle === 'cancelled' || lifecycle === 'failed') {
      const currentRunId = state?.runId ?? '';
      if (!currentRunId) die('terminal runtime status omitted runId');
      const successorRunId = `${name}-${now.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;
      const startResult = spawnExecutable('prometheus', [
        'kbd', '--path', '.', 'run', 'start',
        '--run-id', successorRunId,
        '--reason', `start phase ${name} after terminal run ${currentRunId}`,
        '--exact-next-work', `/kbd-new-phase ${name}`,
      ]);
      if (startResult?.status !== 0) die(`could not start successor run ${successorRunId}`);
    }
  }

  if (runtimeAuthoritative) {
    await runtimeAuthorityPath(name);
  }
  // Author local goals only after canonical creation and activation succeed.
  mkdirSync(phaseDir, { recursive: true });
  writeGoals(phaseDir, goals);

  if (!runtimeAuthoritative) {
    const sourceTool = existsSync(WP) ? readJsonSafe(WP)?.sourceTool ?? 'unknown' : 'unknown';
    writeProgress(phaseDir, name, sourceTool || 'unknown', now);
    flipWaypoint(name, now);
  }
  flipProjectActivePhase(name, now, project);

  const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? '.';
  try {
    await hooksFire('phase', 'before', name, 1, 1, {
      orchestratorRoot,
      cwd: '.',
      runCommand: async (...args) => {
        const result = await runHookCommand(...args);
        if (result.status !== 0) {
          warn(`phase:before hook command failed (exit ${result.status}; phase still created)`);
        } else if (result.stderr.startsWith('hook command requires shell semantics and was not run:')) {
          warn('phase:before hook command was not run (unsupported shell command format; phase still created)');
        }
        return result;
      },
      phasePath: name,
      sourceTool: 'kbd-new-phase',
    });
  } catch {
    warn('phase:before hook fire failed (phase still created)');
  }

  process.stdout.write(`\nCompleted kbd-new-phase — ${name} ready for /kbd-assess\n`);
  process.stdout.write(`  phase:  ${name}\n`);
  process.stdout.write(`  goals:  ${path.join(phaseDir, 'goals.md')}\n`);
  process.stdout.write(`  Next:   /kbd-assess ${name}\n`);
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
