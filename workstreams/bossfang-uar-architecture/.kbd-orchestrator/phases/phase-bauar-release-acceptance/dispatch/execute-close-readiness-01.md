# Execute closure readiness — phase-bauar-release-acceptance

Prepared only. Root owns every invocation below after the completed delivery gates pass. Integration03 was active when this recipe was prepared. No task/stage/certification change, verification, archive, reconciliation, hook dispatch, handoff write, QA, formatting or review was invoked by this preparation. Stop after Execute; do not enter or run Reflect.

## Actual interfaces and scope

Work directory for all lifecycle/backend commands:

`/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture`

Node adapter/runtime: `/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node`.
Canonical CLI, resolved by read-only executable lookup: `/Users/gqadonis/.local/bin/prometheus`.
Installed orchestrator root: `/Users/gqadonis/.codex/skills/kbd-process-orchestrator`.

Exactly three phase changes:

1. `bauar-acc-01-private-packaged-desktop`
2. `bauar-acc-02-current-harness-regression`
3. `bauar-acc-03-local-acceptance-evidence`

Read-only projected progress at preparation time was01 3/3,02 2/3,03 2/5; implementation1/3. These are a dated projection, not a completion claim. Root must complete the remaining actual tasks at their evidence boundaries through the existing KBD task driver before closing. Do not use bare mark-done as a substitute for canonical task transition/hooks.

Prerequisites from the full inspected kbd-execute completion protocol: every assigned task/change complete; final real integration, artifact QA, formatting and independent-review/disposition requirements satisfied; every required verify/archive successful; no pending_review or unexplained blocked row; applicable required hook outcomes resolved. A dispatch receipt never establishes completion. Unknown producer connection identity remains `unverified-producer-unknown`; do not fabricate independence from configured MiniMax selection.

The actual latest-managed OpenSpec preflight already obtained by Root was officialv1.14.1, latestVerifiedtrue, authoredPathsChanged[] at01:57:07UTC. This recipe did not refresh or reinstall it. Reuse the existing actual freshness receipt; if it is no longer usable at closure, Root owns the approved managed preflight before dependent mutations.

## Verify/archive through the existing Node backend adapter

The worktree `scripts/kbd-apply.mjs` verify/archive calls exported `osVerify/osArchive` in `lib/kbd/spec-backend.mjs`. Its default `spawnOpenSpec` already invokes the worktree managed runner with Node and an argv array; it does **not** require a global executable shim. Both operations accept an injected `{spawn}` callback, so Root can explicitly bind its already-selected installed managed runner and strict validation without editing a plugin/cache.

The following is a **future Node module recipe**, not a script that ran. Root can execute it through the exact Node22 `--input-type=module -e` interface or place it in a separately bound owned closure driver. All subprocesses use shell:false and literal argv. Preserve the actual stdout/stderr/exit in the closure receipt subject to normal redaction; stop on first failed dependent operation. Do not automatically retry an archive that may already have moved its change.

```js
import { spawnSync } from 'node:child_process';
import { osVerify, osArchive } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/spec-backend.mjs';
const node = '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node';
const runner = '/Users/gqadonis/.codex/skills/kbd-process-orchestrator/shared/openspec/cli.mjs';
const project = '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture';
const changes = [
  'bauar-acc-01-private-packaged-desktop',
  'bauar-acc-02-current-harness-regression',
  'bauar-acc-03-local-acceptance-evidence',
];
const outcomes = [];
const managed = (_name, args) => {
  const exact = [...args];
  if (exact[0] === 'validate') exact.push('--strict');
  // Root's explicit closure direction: change02 only has the skip-specs exception.
  if (exact[0] === 'archive' && exact[1] === changes[1]) exact.push('--skip-specs');
  const result = spawnSync(node, [runner, 'run', '--project', project, '--', ...exact],
    { cwd: project, encoding: 'utf8', shell: false, maxBuffer: 1024 * 1024 });
  outcomes.push({ operation: exact[0], change: exact[1], args: exact,
    exitCode: result.status, signal: result.signal, errorPresent: Boolean(result.error) });
  return result;
};
for (const change of changes) {
  if (!osVerify(project, change, { spawn: managed })) throw new Error('backend_verify_failed');
}
for (const change of changes) osArchive(project, change, { spawn: managed });
// Record outcomes and actual archive destinations; do not invent their timestamped names.
```

Underlying exact managed argv, for the receipt:

- `run --project /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture -- validate CHANGE --type change --strict`
- `run --project /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture -- archive CHANGE --yes`
- Change02 only: append `--skip-specs` per Root's explicit current direction. The inspected plan.md requires strict managed OpenSpec gates but did not contain that literal flag; preserve the specific parent instruction rather than claiming it was found in plan.md. Root should retain the reason in the closure receipt.

Backend archive moves/synchronizes filesystem state. It does not call a canonical change transition. If a change has not already become canonically complete through its last task boundary, Root must reconcile/transition its actual canonical state using the existing process guard policy; do not re-register or duplicate tasks. The actual typed change-completion shape from read-only CLI help is:

```text
/Users/gqadonis/.local/bin/prometheus kbd --path /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture change transition --command-id <unique-stable-logical-operation-id> --phase phase-bauar-release-acceptance --id <exact-change-id> --status complete
```

Do not write progress.json or generated waypoints by hand. Never run native direct OpenSpec apply/implement-all to finish this phase.

## Read-only archived reconciliation

Worktree kbd-apply lacks reconcile. Use the updated **primary mini source**, not an immutable installed cache. This exact future command must run with cwd equal to the workstream above:

```text
/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node /Users/gqadonis/Projects/prometheus/prometheus-skills-mini/scripts/kbd-apply.mjs reconcile phase-bauar-release-acceptance --json
```

No `--repair`. The inspected primary entry calls `runReconcile`; archived filesystem task artifacts are handled by its reconciliation modules. Its canonical read copies the actual authority to an isolated temporary data root and invokes status there; it verifies original hashes and does not refresh the live inspected project's projections. Exit0 means completed clean scan;1 means drift;2 means incomplete/unavailable/invalid scan. Require cleantrue, drifted0, drift[], errors[]. Missing or ambiguous archive/task/canonical state is not clean. Retain JSON and exit in an actual closure receipt. Do not silently waive or repair a nonzero result.

## Canonical Execute completion

Read-only actual CLI help confirmed:

```text
prometheus kbd stage transition --command-id <COMMAND_ID> --phase <PHASE> --id <ID> --status <STATUS>
statuses: pending, in-progress, blocked, complete, cancelled
```

Only after every preceding required result is successful, Root's exact typed command shape is:

```text
/Users/gqadonis/.local/bin/prometheus kbd --path /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture stage transition --command-id <unique-stable-execute-close-operation-id> --phase phase-bauar-release-acceptance --id execute --status complete
```

Use Root's existing boundary/certification policy and actual outcome receipts. A preparation document is not authorization to substitute guessed counts, invent a gate, clear a blocker, or bypass a signed boundary obligation.

The read-only CLI help also confirmed `completion set` is an independent **project-wide** dimension command and accepts `--dimension implementation|evidence|certification|publication --completed N --total T --status STATUS`, optional summary/blocker; it has no phase flag. Do not use it to set a guessed phase counter. Phase task/change state and projections derive from typed transitions. Publication/shipping remain outside this phase.

## Node execute:after adapter and honest hook outcomes

Full inspected sources:

- `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs` exports `hooksFire(kind,edge,name,index,total,ctx)`.
- `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs` exports `runHookCommand(command,env,ctx)`; supports a JSON `{program,args}` string or explicit ctx.args, never shell execution.
- Installed lifecycle hooks file `/Users/gqadonis/.codex/skills/kbd-process-orchestrator/hooks/hooks.json` has matching execute:after augments report-progress and kbd-memory-log; both use shell strings and on_failureignore.
- Installed user.json and project `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/hooks-config.json` were absent at preparation. Worktree hooks/hooks.json is harness hooks{} and would not substitute for installed lifecycle hooks[]. Recheck only these literal files before future dispatch, because hook policy can change.
- `runHookCommand` returns status0 with an unsupported-shell diagnostic for those two strings. That means **not executed**, not proof of successful reporting or memory effects. No matching required/error hook was observed. Do not invoke shell/Python or start shared services to manufacture their effects.

Future Node adapter after actual canonical stage completion:

```js
import { hooksFire } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hooks.mjs';
import { runHookCommand } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/hook-command.mjs';
const outcomes = [];
await hooksFire('execute', 'after', 'phase-bauar-release-acceptance', 1, 1, {
  orchestratorRoot: '/Users/gqadonis/.codex/skills/kbd-process-orchestrator',
  cwd: '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture',
  phasePath: 'phase-bauar-release-acceptance',
  sourceTool: 'kbd-execute',
  runCommand: async (command, env, ctx) => {
    const result = await runHookCommand(command, env, ctx);
    const skipped = String(result.stderr ?? '').startsWith('hook command requires shell semantics and was not run:');
    outcomes.push({ exitCode: result.status, executed: !skipped,
      category: skipped ? 'unsupported-shell-not-executed' : result.status === 0 ? 'completed' : 'hook-failed' });
    // Strip raw hook stderr from persisted hook snippets; preserve fixed classification separately.
    return { status: result.status, stdout: '', stderr: skipped ? '' : result.status ? 'hook_failed' : '' };
  },
});
// Record actual outcomes, hooks-status/log paths and policy dispositions in an immutable closure receipt.
// Resolve newly configured required hook failures before writing the completion handoff.
```

This does not claim execute:after already fired. The adapter's log is a dispatch log; the separate executed/category observations preserve the two optional skipped effects. Reusing the installed root is essential; silently using worktree root to make every hook disappear would change the inspected dispatch scope.

## Completion handoff; then stop

Full inspected schema: `/Users/gqadonis/.codex/skills/kbd-process-orchestrator/references/schemas/handoff.schema.json`. Required fields are stage, completedAt, skipped. Actual helper emits all seven allowed fields:

- stage `execute`
- completedAt actual UTC ISO timestamp
- outputs string paths for actual completed execution/progress, gate/QA/review/format, verify/archive/reconcile and hook receipts
- nextStage `reflect`
- summaryForNext concise scope, exact actual evidence and deployment/restart/baseline limits
- skipped false
- skipReason null

No other keys are allowed. Store richer digests/provenance in referenced receipts, not extra handoff fields. The nextStage label names the next lifecycle stage; it does not enter or execute Reflect.

The actual helper interface is:

```js
import { stageHandoffWrite } from '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/lib/kbd/stage-gate.mjs';
stageHandoffWrite('execute', '<actual complete-scope and evidence summary>', [
  'execution.md', 'progress.json',
  '<actual phase-relative closure/gate/QA/review/format receipt paths>'
], { cwd: '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture', phaseDir: '/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance' });
```

Replace placeholders with actual evidence and check the predecessor completion conditions first. The helper atomically writes `/Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/handoffs/execute.handoff.json`; it can overwrite that path, so preserve any earlier handoff before calling and never synthesize an earlier completion date. Keep all failed receipts and historical candidates.

After the actual handoff validates against the schema and canonical Execute state is complete, emit the real Completed kbd-execute signal with phase counters derived from the actual projection. Return Execute results to the operator and stop. Do not call kbd-reflect, stage enter reflect, phase transition complete, next-phase or any publication/release command.

## Verification performed by this preparation

Only exact source-document reads, finite file-existence metadata, current phase progress projection read, executable path lookup and these installed canonical CLI help commands ran: stage transition --help; task transition --help; completion --help; completion set --help; change --help; change transition --help. All help invocations returned0. No root status request or lifecycle/backend mutation ran. No excluded F6 file or private runtime body was read. Recipe behavior is source-inspected, not runtime-tested.

