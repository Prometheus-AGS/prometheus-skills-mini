// Measures hook COLD START: the wall time of a full process round trip, which is
// what the harness's timeout actually bounds. In-process benchmarking libraries
// (tinybench, mitata) measure function throughput and cannot see process
// creation, which is why they were rejected in analyze and why this is ~60 lines
// of node:child_process instead of a dependency.
//
// It reports a DISTRIBUTION. A 1 s timeout punishes the tail, not the median, and
// Windows process creation is slower and noisier than macOS — antivirus and the
// search indexer both touch a newly spawned image.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('./hook-entry.mjs', import.meta.url));

// The three hooks the upstream manifest declares at 1000 ms. goals.md names only
// the first two; porting precompact-kbd-control brought a third under the same
// budget, so measuring only the named two would ship an unmeasured hook against
// the very budget this phase exists to test.
const BUDGETED = [
  ['sessionstart-kbd-control', 1000],
  ['taskcompleted-kbd-receipt', 1000],
  ['precompact-kbd-control', 1000],
];

const SAMPLES = Number(process.env.HOOK_SAMPLES ?? 20);

// Liveness differs per hook, because the payloads differ. The two control hooks
// report the PAUSE advisory the fixture sets; taskcompleted-kbd-receipt writes a
// receipt and prints nothing, so for it liveness is proven by asking the entry
// point for a trace. Assuming one shared marker was wrong and this check caught it.
const LIVENESS = {
  'sessionstart-kbd-control': 'KBD REANCHOR',
  'precompact-kbd-control': 'KBD REANCHOR',
  'taskcompleted-kbd-receipt': null,
};

const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'cold-start-'));
mkdirSync(path.join(fixtureRoot, '.prometheus'), { recursive: true });
writeFileSync(
  path.join(fixtureRoot, '.prometheus', 'project.json'),
  JSON.stringify({ projectId: 'cold-start-fixture' }),
);
mkdirSync(path.join(fixtureRoot, '.kbd-orchestrator'), { recursive: true });
writeFileSync(path.join(fixtureRoot, '.kbd-orchestrator', 'PAUSE'), 'measuring\n');

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

// A hook with no stderr output cannot be proven live per sample, so it is proven
// ONCE against an unknown id: if dispatch is reachable at all, an unknown id exits
// 2 and names itself. A guard that never dispatches would exit 0 instead.
function assertDispatchReachable() {
  const probe = spawnSync(process.execPath, [entry, '--hook', 'definitely-not-a-hook'], {
    shell: false,
    encoding: 'utf8',
    input: '',
  });
  if (probe.status === 0) {
    throw new Error('dispatch is not reachable: an unknown hook id exited 0 instead of non-zero');
  }
}

function measure(hookId) {
  const timings = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const started = process.hrtime.bigint();
    const result = spawnSync(process.execPath, [entry, '--hook', hookId, '--harness', 'ci'], {
      shell: false,
      encoding: 'utf8',
      input: '',
      cwd: fixtureRoot,
    });
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    if (result.status !== 0) {
      throw new Error(`${hookId} exited ${result.status}: ${result.stderr?.trim() ?? ''}`);
    }
    // Exit 0 alone proves nothing: the entry point exits 0 on every degradation,
    // and a self-invocation guard that never dispatches also exits 0 — a no-op
    // would make these numbers look BETTER while measuring nothing. The fixture
    // below sets a PAUSE file, so a hook that really ran says so on stderr.
    const marker = LIVENESS[hookId];
    if (marker && !result.stderr?.includes(marker)) {
      throw new Error(`${hookId} produced no "${marker}" on stderr — measured a no-op, not a hook`);
    }
    timings.push(elapsedMs);
  }
  const sorted = [...timings].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    min: sorted[0],
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}

const round = (n) => Math.round(n * 10) / 10;

assertDispatchReachable();

let failed = false;
console.log(`platform=${process.platform} node=${process.version} samples=${SAMPLES}`);
console.log('hook | min | median | p95 | max | budget | verdict');

for (const [hookId, budgetMs] of BUDGETED) {
  const s = measure(hookId);
  // The MAX is checked, not the median: a timeout fires on the slow run.
  const within = s.max < budgetMs;
  if (!within) failed = true;
  console.log(
    `${hookId} | ${round(s.min)} | ${round(s.median)} | ${round(s.p95)} | ${round(s.max)} | ${budgetMs} | ${within ? 'within' : 'OVER'}`,
  );
}

rmSync(fixtureRoot, { recursive: true, force: true });

if (failed) {
  // Deliberately not a hard failure. The budget is this project's to set: if the
  // tail does not fit, the honest move is to raise it and state the measurement,
  // never to reach for a compiled dispatcher (C7).
  console.error('\nAt least one hook exceeded its declared budget on this platform.');
  console.error('Raise the budget and record the measurement; do not add a compiled dispatcher (C7).');
  process.exitCode = 1;
}
