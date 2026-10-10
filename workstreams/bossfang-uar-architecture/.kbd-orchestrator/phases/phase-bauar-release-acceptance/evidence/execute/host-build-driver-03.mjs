import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const phaseRoot = path.resolve(process.argv[2]);
const { runOwned } = await import(pathToFileURL(path.join(phaseRoot, 'acceptance/lib/processes.mjs')));
const executeRoot = path.join(phaseRoot, 'evidence/execute');
const manifest = JSON.parse(fs.readFileSync(path.join(phaseRoot, 'acceptance/harness-inputs.json'), 'utf8'));
const prior = JSON.parse(fs.readFileSync(path.join(executeRoot, 'host-api-compile.receipt.json'), 'utf8'));
const recovery = JSON.parse(fs.readFileSync(path.join(executeRoot, 'host-api-compile-reconciliation-02.json'), 'utf8'));
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hash = file => ({ path: file, exists: true, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), bytes: fs.statSync(file).size });
const sourceInputs = () => manifest.sources.bossfang.inputs.map(input => hash(input.path));
const expected = manifest.sources.bossfang.inputs;
if (!recovery.groupAbsent || recovery.unknownDescendants) throw new Error('Owned prior compiler group unresolved');
const head = spawnSync('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: prior.command.cwd, encoding: 'utf8' });
if (head.status !== 0 || head.stdout.trim() !== manifest.sources.bossfang.head) throw new Error('Source revision changed');
const before = sourceInputs();
if (before.some((input, index) => input.sha256 !== expected[index].sha256)) throw new Error('Finite source input changed');

for (const host of manifest.hosts) {
  const name = host.id;
  const receiptPath = path.join(executeRoot, 'host-' + name + '-compile.receipt-03.json');
  const artifactsPath = path.join(executeRoot, 'host-' + name + '-compiler-artifacts-03.jsonl');
  if (fs.existsSync(receiptPath) || fs.existsSync(artifactsPath)) throw new Error('Retry03 already exists; inspect it before another build');
  fs.writeFileSync(artifactsPath, '', { flag: 'wx' });
  const artifacts = [];
  const diagnostics = [];
  let compileMessages = 0;
  let compilerMessages = 0;
  let errorCount = 0;
  let buildFinished = false;
  let buildSucceeded = false;
  const environment = { ...prior.environment };
  const command = { program: host.compile.program, args: host.compile.args, cwd: host.compile.cwd };
  const result = await runOwned({
    ...command,
    env: environment,
    budgetMs: 10_800_000,
    outputPolicy: {
      onStarted({ pid, startedAt }) {
        writeNew(path.join(executeRoot, 'host-' + name + '-compile-started-03.json'), {
          schemaVersion: 1, pid, processGroupId: pid, supervisorPid: process.pid, startedAt,
          command, environment, reason: 'Durable source driver after observed orphan reconciliation; original profile and exact argv'
        });
        console.log(JSON.stringify({ host: name, status: 'compiling', pid, supervisorPid: process.pid }));
      },
      observeLine(stream, line) {
        if (stream === 'stderr') {
          if (/^\s*Compiling\s/.test(line)) {
            compileMessages++;
            if (compileMessages % 50 === 0) console.log(JSON.stringify({ host: name, compiling: compileMessages }));
          }
          if (/^error:/.test(line)) errorCount++;
          return;
        }
        let message;
        try { message = JSON.parse(line); } catch { return; }
        if (message.reason === 'compiler-artifact'
          && message.manifest_path === host.resolution.selection.packageManifest
          && message.target?.name === host.testTarget
          && message.target.kind.includes('test')
          && message.profile?.test === true
          && typeof message.executable === 'string') {
          const artifact = {
            reason: message.reason, package_id: message.package_id, manifest_path: message.manifest_path,
            target: message.target, profile: message.profile, features: message.features,
            executable: message.executable, fresh: message.fresh
          };
          artifacts.push(artifact);
          fs.appendFileSync(artifactsPath, JSON.stringify(artifact) + '\n');
        }
        if (message.reason === 'compiler-message') {
          compilerMessages++;
          if (message.message?.level === 'error') {
            errorCount++;
            if (diagnostics.length < 30) diagnostics.push({
              code: message.message.code?.code ?? null,
              message: String(message.message.message).slice(0, 4000),
              spans: message.message.spans.filter(span => span.is_primary).map(span => ({
                file_name: span.file_name, line_start: span.line_start, line_end: span.line_end
              }))
            });
          }
        }
        if (message.reason === 'build-finished') {
          buildFinished = true;
          buildSucceeded = message.success === true;
        }
      },
      result: () => ({ compilerArtifacts: artifacts.length, compileMessages, compilerMessages, errorCount, buildFinished, buildSucceeded })
    }
  });
  const after = sourceInputs();
  const sourceUnchanged = after.every((input, index) => input.sha256 === before[index].sha256);
  const completed = result.exitCode === 0 && result.category === 'completed'
    && result.cleanup.groupAbsent && !result.cleanup.unknownDescendants
    && buildFinished && buildSucceeded && artifacts.length === 1 && sourceUnchanged;
  const resolution = completed ? {
    status: 'compiled-not-runtime-tested',
    ...hash(fs.realpathSync(artifacts[0].executable)),
    executable: fs.realpathSync(artifacts[0].executable),
    target: host.testTarget, features: artifacts[0].features,
    profile: artifacts[0].profile, compilerArtifactPath: artifactsPath
  } : null;
  const receipt = {
    schemaVersion: 1, kind: 'host-build', host: name, sourceHead: host.sourceHead,
    command, environment, sourceInputs: before, sourceInputsAfter: after, sourceUnchanged,
    toolchain: manifest.runtimes.bossfangCargo, driver: hash(new URL(import.meta.url)),
    priorCancellation: recovery, result, resolution, diagnostics,
    acceptanceExecuted: false
  };
  writeNew(receiptPath, receipt);
  console.log(JSON.stringify({ host: name, receiptPath, result, resolution }));
  if (!completed) { process.exitCode = result.exitCode === 0 ? 2 : result.exitCode ?? 2; break; }
}
