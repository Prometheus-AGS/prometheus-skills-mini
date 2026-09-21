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

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

function measure(hookId) {
  const timings = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const started = process.hrtime.bigint();
    const result = spawnSync(process.execPath, [entry, '--hook', hookId, '--harness', 'ci'], {
      shell: false,
      encoding: 'utf8',
      input: '',
    });
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    if (result.status !== 0) {
      throw new Error(`${hookId} exited ${result.status}: ${result.stderr?.trim() ?? ''}`);
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

if (failed) {
  // Deliberately not a hard failure. The budget is this project's to set: if the
  // tail does not fit, the honest move is to raise it and state the measurement,
  // never to reach for a compiled dispatcher (C7).
  console.error('\nAt least one hook exceeded its declared budget on this platform.');
  console.error('Raise the budget and record the measurement; do not add a compiled dispatcher (C7).');
  process.exitCode = 1;
}
