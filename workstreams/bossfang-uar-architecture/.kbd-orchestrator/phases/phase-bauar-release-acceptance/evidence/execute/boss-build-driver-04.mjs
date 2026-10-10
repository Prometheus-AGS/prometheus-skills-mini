import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { runOwned } from '../../acceptance/lib/processes.mjs';
const root = new URL('.', import.meta.url);
const plan = JSON.parse(await fs.readFile(new URL('boss-package-plan-04.json', root), 'utf8'));
const staging = plan.temporaryScenarioStaging;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const writeReceipt = (name, value) => fs.writeFile(new URL(name, root), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
await writeReceipt('boss-package-attempt-04-owned.json', { schemaVersion: 1, pid: process.pid, startedAt: new Date().toISOString() });
let interrupted = false;
const interrupt = () => { interrupted = true; };
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
let staged = false;
let failure = false;
const results = [];
async function replace(bytes) {
  const temporary = staging.file + '.packaging-' + randomUUID();
  await fs.writeFile(temporary, bytes, { flag: 'wx', mode: staging.sourceMode });
  await fs.rename(temporary, staging.file);
}
try {
  if (hash(await fs.readFile(staging.file)) !== staging.originalSha256) throw new Error('H02 source changed before staging');
  for (const ref of [...plan.source, ...plan.fixtureSource]) {
    if (hash(await fs.readFile(ref.path)) !== ref.sha256) throw new Error('Finite build input changed');
  }
  const head = await fs.readFile(staging.head);
  if (hash(head) !== staging.headSha256) throw new Error('H02 baseline identity mismatch');
  await replace(head);
  staged = true;
  await writeReceipt('h02-packaging-staged-02.json', { schemaVersion: 1, stagedAt: new Date().toISOString(), file: staging.file, sha256: hash(await fs.readFile(staging.file)) });
  for (const [index, command] of plan.commands.entries()) {
    if (index < plan.resumeFromStage) continue;
    if (interrupted) throw new Error('Packaging interrupted');
    const counters = { lines: 0, errorLines: 0, warningLines: 0 };
    const outputHash = createHash('sha256');
    const progress = setInterval(() => console.log(JSON.stringify({ stage: index, ...counters })), 30000);
    console.log(JSON.stringify({ stage: index, status: 'starting' }));
    let result;
    try {
      result = await runOwned({ ...command, env: plan.environment, budgetMs: 1800000, outputPolicy: {
        observeLine(stream, line) { outputHash.update(stream + '\n' + line + '\n'); counters.lines++; if (/error|failed/i.test(line)) counters.errorLines++; if (/warn/i.test(line)) counters.warningLines++; },
        result() { return counters; },
        onStarted(info) { return writeReceipt('boss-stage-' + index + '-owned-04.json', { schemaVersion: 1, ...info, command }); }
      } });
    } finally { clearInterval(progress); }
    const receipt = { schemaVersion: 1, kind: 'boss-build-stage', stage: index, command, result, outputSha256: outputHash.digest('hex'), rawOutputRetained: false };
    results.push(receipt);
    await writeReceipt('boss-stage-' + index + '-receipt-04.json', receipt);
    console.log(JSON.stringify(receipt));
    if (result.exitCode !== 0 || result.category !== 'completed' || !result.cleanup.groupAbsent || result.cleanup.unknownDescendants) throw new Error('Packaging stage failed');
  }
} catch {
  failure = true;
  process.exitCode = 2;
  console.log(JSON.stringify({ kind: 'boss-package-attempt-failed', rawOutputRetained: false }));
} finally {
  let restored = !staged;
  if (staged && hash(await fs.readFile(staging.file)) === staging.headSha256) {
    const original = await fs.readFile(staging.backup);
    if (hash(original) === staging.originalSha256) {
      await replace(original);
      await fs.utimes(staging.file, new Date(staging.sourceAtime), new Date(staging.sourceMtime));
      restored = hash(await fs.readFile(staging.file)) === staging.originalSha256;
    }
  }
  await writeReceipt('h02-packaging-restoration-02.json', { schemaVersion: 1, completedAt: new Date().toISOString(), file: staging.file, staged, restored, currentSha256: hash(await fs.readFile(staging.file)), originalSha256: staging.originalSha256, headSha256: staging.headSha256, backup: staging.backup, sourceMode: (await fs.stat(staging.file)).mode & 0o777, packageStagesCompleted: results.length, failed: failure, interrupted });
  if (!restored) process.exitCode = 2;
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  console.log(JSON.stringify({ kind: 'boss-package-attempt-finished', packageStagesCompleted: results.length, failed: failure, interrupted, h02Restored: restored }));
}
