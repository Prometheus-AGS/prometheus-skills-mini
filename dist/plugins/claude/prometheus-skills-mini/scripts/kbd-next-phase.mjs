import { refreshOpenSpec } from '../lib/platform/openspec.mjs';
// Port of kbd-next-phase.sh (prometheus-skill-pack, 403 lines).
//
// Seeds and initializes the next KBD phase from the previous phase's reflection.md
// "Recommended Next Phase" section.
//
// Judgment call: the source shells out to `python3 -c ...` three times (reading JSON fields
// tolerantly, and extracting the "Recommended Next Phase" section + a phase-name guess from
// reflection.md via regex). This repo forbids Python outright (`openspec/config.yaml`: "No
// Python anywhere"), so all three are ported to plain JS below — `readJsonField` for the
// tolerant JSON reads, `extractSeedContent`/`extractSeedPhaseName` for the regex extraction.
// Same patterns, same fallback order, no new dependency.
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
import { readDisposition, runPhaseCommand } from '../lib/kbd/phase-disposition.mjs';

const USAGE = `Usage: node scripts/kbd-next-phase.mjs [phase-name] [--allow-incomplete-reflection]

Seed and activate the next KBD phase from the current phase reflection.

A reflection recommendation is a proposal, not authorization (mini #59): when the current
stage is not a recognized reflection-complete state, or reflection.md is missing, this
driver REFUSES to complete the current phase and create/activate a successor. Re-run
/kbd-reflect first, or pass --allow-incomplete-reflection to record an explicit operator
authorization for this exact continuation scope.

Contract-bound phases (mini #66 / full #192): closing is not continuing. The current phase
must already be CLOSED in canonical state (kbd-phase-close-eval records that; otherwise exit 2,
nothing written), and a successor starts only with an operator-signed start-successor
manifest (otherwise exit 4, nothing written). The successor id and title come from the
manifest; a rerun reports ALREADY-STARTED. --allow-incomplete-reflection never bypasses this.

Options:
  --authorize-successor <manifest> --signature <sig>
                                 Signed start-successor authorization (see
                                 scripts/kbd-scope-authority-template.mjs).
  --allow-incomplete-reflection  Explicit operator authorization to continue despite an
                                 incomplete or missing reflection (recorded in output).
  -h, --help                     Show this help.
`;

function die(message) {
  process.stderr.write(`[kbd-next-phase] ERROR: ${message}\n`);
  process.exit(1);
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function findProjectRoot() {
  let dir = path.resolve('.');
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, '.kbd-orchestrator'))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve('.');
}

/** Extract the content under "Recommended Next Phase" / "Next Phase Seed" / "Next Phase" H2. */
function extractSeedContent(reflectionText) {
  const patterns = [
    /^##\s+Recommended Next Phase(?:\s+Seed)?\s*$/m,
    /^##\s+Next Phase Seed\s*$/m,
    /^##\s+Next Phase\s*$/m,
    /^##.*[Nn]ext.*[Pp]hase/m,
    /^##.*[Rr]ecommended/m,
  ];

  let match;
  for (const pattern of patterns) {
    const all = [...reflectionText.matchAll(new RegExp(pattern, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
    if (all.length > 0) {
      match = all.at(-1);
      break;
    }
  }
  if (!match) return '';

  const start = match.index + match[0].length;
  const rest = reflectionText.slice(start);
  const nextH2 = rest.match(/^##\s/m);
  const end = nextH2 ? start + nextH2.index : reflectionText.length;
  return reflectionText.slice(start, end).trim();
}

function extractSeedPhaseName(text) {
  const backtickOrBold = text.match(/[`*]{1,2}(phase-[a-z0-9][a-z0-9-]*)[`*]{0,2}/i);
  if (backtickOrBold) return backtickOrBold[1];
  const standalone = text.match(/\b(phase-[a-z0-9][a-z0-9-]*)\b/);
  if (standalone) return standalone[1];
  return '';
}

function normalizePhaseName(name) {
  return name
    .toLowerCase()
    .split(' ')
    .join('-')
    .replace(/[^a-z0-9-]/g, '');
}

/** goals.md is written only after canonical success, labelled as proposals, never adopted scope. */
function writeGoals({ newPhaseDir, newPhase, currentPhase, timestamp, seedContent }) {
  mkdirSync(newPhaseDir, { recursive: true });
  const goalsBody = seedContent || '(No seed content found in reflection -- add goals manually before running /kbd-assess)';
  atomicWrite(
    path.join(newPhaseDir, 'goals.md'),
    [
      `# Goals: ${newPhase}`,
      '',
      `Seeded from: \`${currentPhase}/reflection.md\``,
      `Created: ${timestamp}`,
      '',
      '## Reflection proposals — not adopted scope',
      '',
      'These are suggestions carried forward from the previous reflection. They are not',
      "requirements: blocking scope exists only once this phase's contract is adopted (and any",
      'later change is a signed amendment).',
      '',
      goalsBody,
      '',
      '---',
      '',
      '## Instructions',
      '',
      'Review and refine the goals above before running `/kbd-assess`.',
      'Add, remove, or clarify as needed. When ready:',
      '',
      '```',
      `/kbd-assess ${newPhase}`,
      '```',
      '',
    ].join('\n')
  );
}

function canonicalStatus(projectRoot) {
  const result = spawnExecutable('prometheus', ['kbd', '--path', projectRoot, 'status', '--json']);
  if (result?.status !== 0) die('canonical status read failed');
  return JSON.parse(result.stdout);
}

/**
 * Contract-bound continuation (mini #66 / full #192). Returns { done: true } when it already
 * reported an outcome, { successor } when an authorized start should proceed, or {} when the
 * current phase is unbound (legacy flow).
 */
function boundContinuation({ projectRoot, kbdDir, currentPhase, proposedName, authManifest, authSignature }) {
  let requested = proposedName;
  if (!requested && authManifest && existsSync(authManifest)) requested = readJsonSafe(authManifest)?.successorPhaseId ?? '';
  if (requested && requested === currentPhase) {
    // A rerun after the authorized successor started: the active phase already is it.
    const phases = canonicalStatus(projectRoot)?.phaseClosure?.phases ?? {};
    const predecessor = Object.entries(phases).find(([, entry]) => entry?.successor?.phaseId === requested)?.[0];
    if (predecessor) {
      process.stdout.write(`[kbd-next-phase] ALREADY-STARTED: successor '${requested}' of '${predecessor}' was already started; no new events.\n`);
      process.stdout.write(`  Next:  /kbd-assess ${requested}\n`);
      return { done: true };
    }
  }
  const disposition = readDisposition({ root: projectRoot, phase: currentPhase });
  if (disposition.status !== 0) die(`${disposition.stderr}; nothing was written`);
  const view = disposition.json;
  if (!view.contractBound) return {};
  if (view.disposition !== 'CLOSED') {
    process.stdout.write(
      `[kbd-next-phase] NOT-CLOSED: phase '${currentPhase}' disposition is ${view.disposition}; nothing was written.\n` +
        '  A contract-bound phase closes only through its terminal evaluator:\n' +
        `    node scripts/kbd-phase-close-eval.mjs --phase ${currentPhase}\n`
    );
    process.exit(2);
  }
  if (view.successor?.phaseId) {
    const started = view.successor.phaseId;
    const goals = path.join(kbdDir, 'phases', started, 'goals.md');
    if (!existsSync(goals)) {
      const reflection = path.join(kbdDir, 'phases', currentPhase, 'reflection.md');
      const seed = existsSync(reflection) ? extractSeedContent(readFileSync(reflection, 'utf8')) : '';
      writeGoals({ newPhaseDir: path.dirname(goals), newPhase: started, currentPhase, timestamp: new Date().toISOString(), seedContent: seed });
    }
    process.stdout.write(`[kbd-next-phase] ALREADY-STARTED: successor '${started}' of '${currentPhase}' was already started; no new events.\n`);
    process.stdout.write(`  Next:  /kbd-assess ${started}\n`);
    return { done: true };
  }
  if (!authManifest || !authSignature) {
    process.stdout.write(
      `[kbd-next-phase] SUCCESSOR-UNAUTHORIZED: '${currentPhase}' is CLOSED; closure alone never starts a successor. Nothing was written.\n` +
        '  An operator signs a start-successor manifest naming the successor:\n' +
        `    node scripts/kbd-scope-authority-template.mjs start-successor --phase ${currentPhase} --successor <id> --title '<title>' > successor.json\n` +
        '    ssh-keygen -Y sign -f <operator-key> -n prometheus-kbd-scope-amendment successor.json\n' +
        '  then: node scripts/kbd-next-phase.mjs --authorize-successor successor.json --signature successor.json.sig\n'
    );
    process.exit(4);
  }
  const manifest = readJsonSafe(authManifest);
  const id = manifest?.successorPhaseId ?? '';
  const title = manifest?.successorTitle ?? '';
  if (!id || !title) {
    process.stdout.write('[kbd-next-phase] SUCCESSOR-UNAUTHORIZED: manifest names no successorPhaseId/successorTitle\n');
    process.exit(4);
  }
  if (proposedName && normalizePhaseName(proposedName) !== id) {
    process.stdout.write(`[kbd-next-phase] SUCCESSOR-UNAUTHORIZED: '${proposedName}' is not the authorized successor '${id}'\n`);
    process.exit(4);
  }
  return { successor: { id, title, authManifest, authSignature } };
}

/** One typed runtime event defines and activates exactly the authorized successor. */
async function startAuthorizedSuccessor({ id, title, authManifest, authSignature, projectRoot, kbdDir, currentPhase, orchestratorRoot, timestamp }) {
  const newPhaseDir = path.join(kbdDir, 'phases', id);
  if (existsSync(newPhaseDir)) die(`Phase '${id}' already exists:\n  ${newPhaseDir}`);
  refreshOpenSpec(projectRoot);
  const started = runPhaseCommand({ root: projectRoot, args: ['successor', 'start', '--predecessor', currentPhase,
    '--id', id, '--title', title, '--exact-next-work', `/kbd-assess ${id}`,
    '--authorization', authManifest, '--signature', authSignature] });
  if (started.status !== 0) {
    process.stdout.write(`[kbd-next-phase] SUCCESSOR-UNAUTHORIZED: the runtime refused the successor; nothing was written.\n${started.stdout}${started.stderr}`);
    process.exit(4);
  }
  try {
    await hooksFire('phase', 'after', currentPhase, 1, 1, {
      orchestratorRoot, cwd: projectRoot, runCommand: runHookCommand, phasePath: currentPhase, sourceTool: 'kbd-next-phase',
    });
  } catch {
    process.stderr.write('[kbd-next-phase] phase completion hook failed\n');
  }
  if (isBottleneckActive(projectRoot)) {
    const postStart = evaluateBottleneck('phase', 'before', id, false, { root: projectRoot });
    if (postStart.status !== 0) die(`next phase start postcommit blocked; record it with: prometheus kbd --path . guard evaluate --boundary phase --edge before --subject ${id} --json`);
    process.stdout.write(`${bottleneckSignalText(postStart.stdout)}\n`);
  }
  const reflection = path.join(kbdDir, 'phases', currentPhase, 'reflection.md');
  const seedContent = existsSync(reflection) ? extractSeedContent(readFileSync(reflection, 'utf8')) : '';
  writeGoals({ newPhaseDir, newPhase: id, currentPhase, timestamp, seedContent });
  process.stdout.write(`\nCompleted kbd-next-phase — ${id} ready for /kbd-assess\n`);
  process.stdout.write(`  phase: ${id}\n`);
  process.stdout.write(`  goals: ${path.join(newPhaseDir, 'goals.md')}\n`);
  process.stdout.write(`  Next:  /kbd-assess ${id}\n`);
}

async function main(argv) {
  if (argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(USAGE);
    return;
  }

  const allowIncompleteReflection = argv.includes('--allow-incomplete-reflection');
  const optionValue = (flag) => {
    const index = argv.indexOf(flag);
    return index === -1 ? null : argv[index + 1] ?? null;
  };
  const authManifest = optionValue('--authorize-successor');
  const authSignature = optionValue('--signature');
  const valueArgs = new Set([authManifest, authSignature].filter(Boolean));
  const proposedName = argv.filter((a) => !a.startsWith('-') && !valueArgs.has(a))[0] ?? '';
  const timestamp = new Date().toISOString();
  const dateSlug = timestamp.slice(0, 10);

  const projectRoot = findProjectRoot();
  const kbdDir = path.join(projectRoot, '.kbd-orchestrator');
  const waypointJson = path.join(kbdDir, 'current-waypoint.json');
  const waypointMd = path.join(kbdDir, 'current-waypoint.md');
  const projectJson = path.join(kbdDir, 'project.json');
  const orchestratorRoot = process.env.KBD_ORCHESTRATOR_ROOT ?? projectRoot;

  if (!existsSync(waypointJson)) {
    die('.kbd-orchestrator/current-waypoint.json not found.\n  Run /kbd-init first to initialize KBD for this project.');
  }

  const waypoint = readJsonSafe(waypointJson) ?? {};
  const currentPhase = waypoint.activePhaseId || waypoint.activePhase || waypoint.phase || 'unknown';
  const currentStage = waypoint.stage || waypoint.status || 'unknown';
  const changesTotal = waypoint.implementationTotal ?? waypoint.changesTotal ?? waypoint.changes_total ?? 0;
  const changesCompleted = waypoint.implementationCompleted ?? waypoint.changesCompleted ?? waypoint.changes_completed ?? 0;

  const projectData = existsSync(projectJson) ? readJsonSafe(projectJson) : null;
  const projectName = projectData?.name ?? 'unknown';
  const projectStatus = projectData?.status ?? '';

  if (isRuntimeAuthoritative(projectRoot)) {
    const bound = boundContinuation({ projectRoot, kbdDir, currentPhase, proposedName, authManifest, authSignature });
    if (bound.done) return;
    if (bound.successor) {
      await startAuthorizedSuccessor({ ...bound.successor, projectRoot, kbdDir, currentPhase, orchestratorRoot, timestamp });
      return;
    }
  }

  const reflectDone = new Set(['reflect_complete', 'reflected', 'phase_complete']);
  const reflectionComplete = reflectDone.has(currentStage) || reflectDone.has(projectStatus);
  if (!reflectionComplete && !allowIncompleteReflection) {
    die(
      `Current stage is '${currentStage}' (project status '${projectStatus || 'none'}'), ` +
        'not a recognized reflection-complete state.\n' +
        '  A successor phase is never created or activated without a completed reflection (mini #59).\n' +
        '  Remediation: run /kbd-reflect first, then re-run /kbd-next-phase. If an operator\n' +
        '  explicitly authorizes this exact continuation without one, re-run with\n' +
        '  --allow-incomplete-reflection.'
    );
  }
  if (!reflectionComplete) {
    process.stdout.write(
      `\n[kbd-next-phase] OPERATOR AUTHORIZATION RECORDED: continuing from stage '${currentStage}' ` +
        'without a completed reflection (--allow-incomplete-reflection).\n' +
        '  The next phase is seeded from whatever reflection content exists; this authorization\n' +
        '  covers only this invocation and does not amend any adopted contract.\n\n'
    );
  }

  const reflectionFile = path.join(kbdDir, 'phases', currentPhase, 'reflection.md');
  let seedContent = '';
  let seedPhaseName = '';
  if (existsSync(reflectionFile)) {
    const reflectionText = readFileSync(reflectionFile, 'utf8');
    seedContent = extractSeedContent(reflectionText);
    seedPhaseName = extractSeedPhaseName(seedContent);
  } else if (!allowIncompleteReflection) {
    die(
      `No reflection.md found at:\n  ${reflectionFile}\n` +
        '  Run /kbd-reflect first to generate a reflection, then re-run /kbd-next-phase.\n' +
        '  An explicitly authorized continuation without it requires --allow-incomplete-reflection.'
    );
  } else {
    process.stdout.write(
      `\n[kbd-next-phase] OPERATOR AUTHORIZATION RECORDED: no reflection.md at ${reflectionFile};\n` +
        '  continuing with empty seed content (--allow-incomplete-reflection).\n\n'
    );
  }

  let newPhase;
  if (proposedName) newPhase = proposedName;
  else if (seedPhaseName) newPhase = `${seedPhaseName}-${dateSlug}`;
  else newPhase = `phase-next-${dateSlug}`;
  newPhase = normalizePhaseName(newPhase);

  const newPhaseDir = path.join(kbdDir, 'phases', newPhase);
  if (existsSync(newPhaseDir)) {
    die(
      `Phase '${newPhase}' already exists:\n  ${newPhaseDir}\n` +
        `  Choose a different name or resume it with: /kbd-assess ${newPhase}`
    );
  }

  refreshOpenSpec(projectRoot);

  if (isRuntimeAuthoritative(projectRoot)) {
    const statusResult = spawnExecutable('prometheus', ['kbd', '--path', projectRoot, 'status', '--json']);
    if (statusResult?.status !== 0) die('canonical status read failed');
    const state = JSON.parse(statusResult.stdout);
    const currentPhaseStatus = state?.phases?.[currentPhase]?.status ?? 'missing';
    if (currentPhaseStatus === 'missing') die(`current phase '${currentPhase}' is absent from canonical state`);

    const guardEnabled = isBottleneckActive(projectRoot);
    let completedGuardText = '';
    if (currentPhaseStatus !== 'complete') {
      if (guardEnabled) {
        const pre = evaluateBottleneck('phase', 'after', currentPhase, true, { root: projectRoot });
        if (pre.status !== 0) die('current phase completion precommit blocked');
      }
      const transitionResult = spawnExecutable('prometheus', [
        'kbd', '--path', projectRoot, 'phase', 'transition',
        '--command-id', `phase-complete:${currentPhase}`,
        '--id', currentPhase, '--status', 'complete',
      ]);
      if (transitionResult?.status !== 0) die('current phase completion transition failed');
      if (guardEnabled) {
        const post = evaluateBottleneck('phase', 'after', currentPhase, false, { root: projectRoot });
        if (post.status !== 0) die('current phase completion postcommit blocked');
        completedGuardText = bottleneckSignalText(post.stdout);
      }
      try {
        await hooksFire('phase', 'after', currentPhase, 1, 1, {
          orchestratorRoot,
          cwd: projectRoot,
          runCommand: runHookCommand,
          phasePath: currentPhase,
          sourceTool: 'kbd-next-phase',
        });
      } catch {
        process.stderr.write('[kbd-next-phase] phase completion hook failed\n');
      }
    }

    const createResult = spawnExecutable('prometheus', [
      'kbd', '--path', projectRoot, 'phase', 'create',
      '--command-id', `phase-create:${newPhase}`,
      '--id', newPhase, '--title', newPhase,
    ]);
    if (createResult?.status !== 0) die(`phase create failed: ${createResult?.stderr ?? ''}`);
    if (guardEnabled) {
      const preStart = evaluateBottleneck('phase', 'before', newPhase, true, { root: projectRoot });
      if (preStart.status !== 0) die('next phase start precommit blocked');
    }
    const activateResult = spawnExecutable('prometheus', [
      'kbd', '--path', projectRoot, 'phase', 'activate',
      '--command-id', `phase-activate:${newPhase}`,
      '--id', newPhase, '--exact-next-work', `/kbd-assess ${newPhase}`,
    ]);
    if (activateResult?.status !== 0) die(`phase activate failed: ${activateResult?.stderr ?? ''}`);
    const startTransition = spawnExecutable('prometheus', [
      'kbd', '--path', projectRoot, 'phase', 'transition',
      '--command-id', `phase-start:${newPhase}`,
      '--id', newPhase, '--status', 'in-progress',
    ]);
    if (startTransition?.status !== 0) die(`phase transition failed: ${startTransition?.stderr ?? ''}`);
    if (guardEnabled) {
      const postStart = evaluateBottleneck('phase', 'before', newPhase, false, { root: projectRoot });
      if (postStart.status !== 0) die('next phase start postcommit blocked');
      if (completedGuardText) process.stdout.write(`${completedGuardText}\n`);
      process.stdout.write(`${bottleneckSignalText(postStart.stdout)}\n`);
    }

    writeGoals({ newPhaseDir, newPhase, currentPhase, timestamp, seedContent });
    process.stdout.write(`\nCompleted kbd-next-phase — ${newPhase} ready for /kbd-assess\n`);
    process.stdout.write(`  phase: ${newPhase}\n`);
    process.stdout.write(`  goals: ${path.join(newPhaseDir, 'goals.md')}\n`);
    process.stdout.write(`  Next:  /kbd-assess ${newPhase}\n`);
    return;
  }

  writeGoals({ newPhaseDir, newPhase, currentPhase, timestamp, seedContent });
  atomicWrite(
    path.join(newPhaseDir, 'progress.json'),
    JSON.stringify(
      {
        schemaVersion: '2',
        phase: newPhase,
        started: timestamp,
        last_updated: timestamp,
        last_updated_by: 'kbd-next-phase',
        assessment_complete: false,
        plan_complete: false,
        execution_dispatched: false,
        reflection_complete: false,
        changes_total: 0,
        changes_completed: 0,
        implementation_total: 0,
        implementation_completed: 0,
        completion: {
          primaryCounter: 'implementation',
          implementation: { completed: 0, total: 0, status: 'PENDING' },
          evidence: { status: 'NOT_TRACKED', summary: null, blockers: [] },
          certification: { status: 'NOT_TRACKED', summary: null, blockers: [] },
          publication: { status: 'NOT_TRACKED', summary: null, blockers: [] },
        },
        changes: [],
      },
      null,
      2
    )
  );

  const revision = ((readJsonSafe(waypointJson)?.revision ?? 0) + 1);
  const {
    stage, previous_phase, last_updated, last_updated_by, exact_next_command, fallback_command,
    active_change, next_pending_change, changes_total, changes_completed, changesCompleted: _cc, changesTotal: _ct,
    ...restWaypoint
  } = waypoint;
  atomicWrite(
    waypointJson,
    JSON.stringify(
      {
        ...restWaypoint,
        schemaVersion: '5',
        phase: newPhase,
        previousPhase: currentPhase,
        status: 'assessment_ready',
        currentTask: `run kbd-assess for ${newPhase}`,
        sourceTool: 'kbd-next-phase',
        exactNextCommand: `/kbd-assess ${newPhase}`,
        change: null,
        nextPendingChange: null,
        path: [newPhase],
        completionMetric: 'implementation',
        implementationCompleted: 0,
        implementationTotal: 0,
        certificationStatus: 'NOT_TRACKED',
        publicationStatus: 'NOT_TRACKED',
        planRevision: 1,
        revision,
        updatedAt: timestamp,
      },
      null,
      2
    )
  );

  if (existsSync(projectJson)) {
    const parsed = readJsonSafe(projectJson) ?? {};
    const { active_phase, ...rest } = parsed;
    atomicWrite(projectJson, JSON.stringify({ ...rest, activePhase: newPhase, updatedAt: timestamp }, null, 2));
  }

  atomicWrite(
    waypointMd,
    [
      '# Current Waypoint',
      '',
      `**Phase**: \`${newPhase}\``,
      '**Stage**: `assess_pending`',
      `**Created**: ${timestamp}`,
      `**Previous phase**: \`${currentPhase}\``,
      '',
      '## Summary',
      '',
      `New phase seeded from \`${currentPhase}/reflection.md\`.`,
      `Goals are pre-loaded in \`.kbd-orchestrator/phases/${newPhase}/goals.md\`.`,
      'Review the goals, then run `/kbd-assess` to begin.',
      '',
      '## Next action',
      '',
      '```',
      `/kbd-assess ${newPhase}`,
      '```',
      '',
      '## References',
      '',
      `- [goals.md](phases/${newPhase}/goals.md)`,
      `- [Previous reflection](phases/${currentPhase}/reflection.md)`,
      '',
    ].join('\n')
  );

  const prevGoalsMet = changesTotal === 0 ? '(see reflection)' : `${changesCompleted}/${changesTotal}`;

  process.stdout.write('\n==================================================================\n');
  process.stdout.write(`KBD NEXT PHASE -- ${projectName}\n\n`);
  process.stdout.write(`Previous phase:  ${currentPhase}\n`);
  process.stdout.write(`  Goals met:     ${prevGoalsMet}\n\n`);
  process.stdout.write(`New phase:       ${newPhase}\n`);
  process.stdout.write(`  Goals file:    .kbd-orchestrator/phases/${newPhase}/goals.md\n`);
  process.stdout.write(`  Seeded from:   ${currentPhase}/reflection.md\n\n`);
  if (seedContent) {
    process.stdout.write('Seeded content preview:\n');
    for (const line of seedContent.split('\n').slice(0, 8)) process.stdout.write(`  ${line}\n`);
    process.stdout.write('\n');
  }
  process.stdout.write('Waypoint:        stage=assess_pending  next=/kbd-assess\n\n');
  process.stdout.write('Run /kbd-assess to start the new phase.\n');
  process.stdout.write('==================================================================\n\n');
}

main(process.argv.slice(2)).catch((error) => die(error?.message ?? String(error)));
