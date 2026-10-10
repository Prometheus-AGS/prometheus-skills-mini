import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const request = JSON.parse(fs.readFileSync(path.join(output, 'candidate-invocation.json'), 'utf8'));
const lock = fs.openSync(path.join(output, 'eligible-writer.lock'), 'wx');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'uar-t2-'));
const env = {};
for (const key of ['PATH', 'HOME', 'CARGO_HOME', 'RUSTUP_HOME']) {
  if (process.env[key] !== undefined) env[key] = process.env[key];
}
env.PATH = path.dirname(process.execPath) + path.delimiter + env.PATH;
Object.assign(env, {CARGO_TARGET_DIR: request.buildEnvironment.CARGO_TARGET_DIR, TMPDIR: scratch, RUN_LLM_TESTS: '0', RUST_TEST_THREADS: '1', RUST_LOG: 'error'});
const batches = [
  {name: 'eligible-lib-bin-integration', args: [...request.args, '--message-format=json', '-j', '2']},
  {name: 'examples-compilation', args: ['build', '--locked', '--no-default-features', '--features', 'server-full', '--examples', '--message-format=json', '-j', '2']},
  {name: 'library-doctests', args: ['test', '--locked', '--no-default-features', '--features', 'server-full', '--doc', '--message-format=json', '-j', '2']},
];
const hash = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(request.cwd, 'tests/uar_integration.rs'))).digest('hex');
function save(name, value) {
  const file = path.join(output, name + '.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}
const aggregate = {schemaVersion: 1, startedAt: new Date().toISOString(), status: 'RUNNING', originalUnqualifiedT2: 'NOTRUN; withdrawn F6 is excluded', cwd: request.cwd, environmentKeys: Object.keys(env).sort(), explicitEnvironment: {CARGO_TARGET_DIR: env.CARGO_TARGET_DIR, TMPDIR: scratch, RUN_LLM_TESTS: '0', RUST_TEST_THREADS: '1', RUST_LOG: 'error'}, sourceHashBefore: hash(), forbiddenSourceAccess: 'No source access; excluded target never selected', batches: []};
save('eligible-batch', aggregate);
try {
  for (const batch of batches) {
    const receipt = {name: batch.name, executable: 'cargo', args: batch.args, startedAt: new Date().toISOString(), status: 'RUNNING', diagnostics: [], testResults: [], summaries: [], suppressedLines: 0, forbiddenDiagnosticsSuppressed: 0};
    aggregate.batches.push(receipt);
    const child = spawn('cargo', batch.args, {cwd: request.cwd, env, shell: false, stdio: ['ignore', 'pipe', 'pipe']});
    receipt.pid = child.pid;
    save('eligible-batch', aggregate);
    console.log(JSON.stringify({event: 'started', name: batch.name, pid: child.pid}));
    const partial = {stdout: '', stderr: ''};
    function line(value) {
      if (/bauar_session_owner|src\/uar\/mcp_server\.rs/.test(value)) {receipt.forbiddenDiagnosticsSuppressed++; return;}
      let record;
      try {record = JSON.parse(value);} catch {}
      if (record?.reason === 'compiler-message') {
        const d = record.message;
        if (receipt.diagnostics.length < 200) receipt.diagnostics.push({level: d.level, code: d.code?.code, message: d.message, spans: d.spans.map(s => ({file: s.file_name, line: s.line_start, column: s.column_start}))});
        if (d.level === 'error') console.log(JSON.stringify({event: 'compiler-error', message: d.message, code: d.code?.code}));
      } else if (record?.reason === 'build-finished') {
        receipt.buildSuccess = record.success;
      } else if (/^test [A-Za-z0-9_:]+ \.\.\. (ok|FAILED|ignored(?:,.*)?)$/.test(value)) {
        if (receipt.testResults.length < 8000) receipt.testResults.push(value);
      } else if (/^test result:|^running \d+ tests?$|^\s*Finished `|^error: (could not compile|test failed|doctest failed)/.test(value)) {
        receipt.summaries.push(value);
        console.log(value);
      } else receipt.suppressedLines++;
    }
    for (const stream of ['stdout', 'stderr']) child[stream].on('data', bytes => {
      partial[stream] += bytes.toString('utf8');
      const lines = partial[stream].split('\n');
      partial[stream] = lines.pop();
      for (const value of lines) line(value);
    });
    const result = await new Promise(resolve => {
      child.once('error', error => resolve({exitCode: null, signal: null, spawnError: error.code}));
      child.once('close', (exitCode, signal) => resolve({exitCode, signal}));
    });
    for (const value of Object.values(partial)) if (value) line(value);
    Object.assign(receipt, result, {completedAt: new Date().toISOString(), status: result.exitCode === 0 ? 'PASS' : 'FAIL'});
    save(batch.name + '-receipt', receipt);
    save('eligible-batch', aggregate);
    console.log(JSON.stringify({event: 'completed', name: batch.name, exitCode: result.exitCode, status: receipt.status}));
    if (result.exitCode !== 0) break;
  }
  aggregate.completedAt = new Date().toISOString();
  aggregate.sourceHashAfter = hash();
  aggregate.status = aggregate.batches.length === batches.length && aggregate.batches.every(b => b.status === 'PASS') ? 'PASS' : 'FAIL';
  aggregate.unrunBatches = batches.filter(b => !aggregate.batches.some(r => r.name === b.name)).map(b => b.name);
  save('eligible-batch', aggregate);
  console.log(JSON.stringify({event: 'batch-completed', status: aggregate.status, unrunBatches: aggregate.unrunBatches}));
} finally {
  fs.closeSync(lock);
  fs.unlinkSync(path.join(output, 'eligible-writer.lock'));
}
