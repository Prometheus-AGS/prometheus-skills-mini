import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOwned } from '../../acceptance/lib/processes.mjs';
import { writeNew, hashFile } from '../../acceptance/lib/records.mjs';

// Durable supervisor for the observed loss of tool-session handles; never retries an execution.
const evidence = dirname(fileURLToPath(import.meta.url));
const phase = dirname(dirname(evidence));
const project = dirname(dirname(dirname(phase)));
const program = '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin/node';
const entry = phase + '/acceptance/local-release-acceptance.mjs';
const config = phase + '/acceptance/candidate-inputs.json';
const stage = process.argv[2];
if (!['integration', 'finalize'].includes(stage)) throw new Error('stage_invalid');
const stamp = process.argv[3];
if (!/^[0-9]{2}$/.test(stamp ?? '')) throw new Error('attempt_invalid');
const prefix = evidence + '/coordinator-' + stage + '-' + stamp;
const command = { program, args: [entry, '--config', config, '--stage', stage], cwd: project };
const sourceInputs = [];
for (const path of [program, entry, config]) sourceInputs.push({ path, sha256: await hashFile(path) });
let reported;
const result = await runOwned({ ...command, env: {
  PATH: '/Users/gqadonis/.local/share/mise/installs/node/22.20.0/bin:/Users/gqadonis/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  LANG: 'en_US.UTF-8'
}, budgetMs: 18000000, outputPolicy: {
  async onStarted(value) { await writeNew(prefix + '-started.json', { schemaVersion: 1, ...value, supervisorPid: process.pid, command, sourceInputs }); },
  observeLine(stream, line) {
    if (stream !== 'stdout') return;
    try {
      const value = JSON.parse(line);
      if (value.schemaVersion === 1 && [0, 1, 2].includes(value.exitCode)) {
        reported = { schemaVersion: 1, exitCode: value.exitCode, status: value.status, category: value.category, receipt: value.receipt };
      }
    } catch {}
  },
  result() { return { coordinatorReported: Boolean(reported) }; }
} });
const receipt = await writeNew(prefix + '.json', { schemaVersion: 1, command, sourceInputs, result, reported });
console.log(JSON.stringify({ receipt, exitCode: result.exitCode, category: result.category, reported }));
process.exitCode = result.category === 'completed' && result.cleanup.groupAbsent && !result.cleanup.unknownDescendants
  ? result.exitCode ?? 2 : 2;
