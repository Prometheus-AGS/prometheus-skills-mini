import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOwned } from '../../acceptance/lib/processes.mjs';
import { writeNew, hashFile } from '../../acceptance/lib/records.mjs';

// One authorized isolated harness invocation, durable across tool-session loss; no retries.
const evidence = dirname(fileURLToPath(import.meta.url));
const phase = dirname(dirname(evidence));
const program = '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node';
const entry = evidence + '/harness-only-integration-driver-01.mjs';
const config = phase + '/acceptance/candidate-inputs.json';
const prefix = evidence + '/harness-only-integration-01';
const command = { program, args: [entry], cwd: dirname(dirname(dirname(phase))) };
const sourceInputs = [];
for (const path of [program, entry, config]) sourceInputs.push({ path, sha256: await hashFile(path) });
let reported;
const result = await runOwned({ ...command, env: {
  PATH: '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  LANG: 'en_US.UTF-8'
}, budgetMs: 1920000, outputPolicy: {
  async onStarted(value) { await writeNew(prefix + '-started.json', {
    schemaVersion: 1, ...value, supervisorPid: process.pid, command, sourceInputs }); },
  observeLine(stream, line) {
    if (stream !== 'stdout') return;
    try {
      const value = JSON.parse(line);
      if (value.schemaVersion === 1 && [0, 1, 2].includes(value.exitCode)
        && value.subsetOnly === true && value.fullPhasePassClaimed === false) {
        reported = { schemaVersion: 1, exitCode: value.exitCode, status: value.status,
          category: value.category, receipt: value.receipt, subsetOnly: true,
          requiredComponents: value.requiredComponents, requiredScenarios: value.requiredScenarios,
          fullPhasePassClaimed: false };
      }
    } catch { /* Only fixed sanitized coordinator JSON is retained. */ }
  },
  result() { return { coordinatorReported: Boolean(reported), subsetOnly: true, fullPhasePassClaimed: false }; }
} });
const receipt = await writeNew(prefix + '.json', { schemaVersion: 1,
  kind: 'harness-only-integration-supervisor', command, sourceInputs, result, reported,
  subsetOnly: true, fullPhasePassClaimed: false });
console.log(JSON.stringify({ receipt, exitCode: result.exitCode, category: result.category, reported }));
process.exitCode = result.category === 'completed' && result.cleanup.groupAbsent
  && !result.cleanup.unknownDescendants ? result.exitCode ?? 2 : 2;
