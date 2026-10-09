import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evidence = path.dirname(fileURLToPath(import.meta.url));
const inputsPath = path.join(evidence, 'build-inputs.json');
const pinPath = path.join(evidence, 'boss-local-pin.json');
const inputs = JSON.parse(fs.readFileSync(inputsPath, 'utf8'));
const pin = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
const contract = JSON.parse(fs.readFileSync(inputs.commandContract.path, 'utf8'));
const command = contract.commands.find(item => item.task.endsWith('/3'));
const cwd = command.cwd;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const identify = file => ({ path: file, sha256: digest(fs.readFileSync(file)), bytes: fs.statSync(file).size });
const run = (program, args, directory = cwd) => {
  const result = spawnSync(program, args, { cwd: directory, shell: false, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${program} ${args.join(' ')} failed: ${result.stderr}`);
  return { program, args, cwd: directory, exitCode: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
};
const source = run('git', ['rev-parse', 'HEAD']).stdout;
const bossSource = run('git', ['rev-parse', 'HEAD'], pin.candidateRoot).stdout;
if (source !== inputs.candidates.uar.commit || source !== pin.uarCheckpoint || bossSource !== pin.commit.hash) throw new Error('Candidate HEAD differs from frozen source/pin authority');
const dependencies = inputs.authorities.dependencyManifests.map(expected => {
  const actual = identify(expected.path);
  if (actual.sha256 !== expected.sha256) throw new Error(`Dependency manifest differs: ${expected.path}`);
  return actual;
});
const authorities = inputs.authorities.uar.map(expected => {
  const actual = identify(expected.path);
  if (actual.sha256 !== expected.sha256) throw new Error(`Build authority differs: ${expected.path}`);
  return actual;
});
const tools = [run(process.execPath, ['--version']), run('cargo', ['--version']), run('rustc', ['-vV'])];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(evidence, `uar-build-${stamp}.log`);
const receiptPath = path.join(evidence, 'uar-build.json');
const receipt = {
  schemaVersion: 1, phase: inputs.phase, change: inputs.change, task: '3',
  status: 'running', startedAt: new Date().toISOString(),
  source: { root: cwd, commit: source, bossCommit: bossSource },
  inputs: identify(inputsPath), pin: identify(pinPath), commandContract: identify(inputs.commandContract.path),
  command: { program: command.program, args: command.args, cwd, shell: false, environmentOverrides: command.environmentConstraints },
  tools, features: inputs.features, profile: 'release', target: 'aarch64-apple-darwin',
  authorities, dependencyManifestDigest: digest(JSON.stringify(dependencies)), dependencies,
  globalCargoConfiguration: identify(inputs.globalCargoBuildConfiguration.path),
  cachePolicy: inputs.globalCargoBuildConfiguration.build,
  outputPath: command.output, outputExistedBefore: fs.existsSync(command.output), logPath,
  boundaries: { build: 'running', runtimeAcceptance: 'operator-deferred', tests: 'not run', review: 'operator-deferred', packaging: 'not run', securityHardening: 'none', f6: 'excluded paths not accessed directly', canonicalState: 'root owned; not mutated' }
};
const save = () => fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
save();
const fd = fs.openSync(logPath, 'wx');
const start = performance.now();
const child = spawn(command.program, command.args, {
  cwd, shell: false, env: { ...process.env, ...command.environmentConstraints }, stdio: ['ignore', fd, fd]
});
receipt.pid = child.pid;
save();
console.log(JSON.stringify({ status: 'running', pid: child.pid, logPath, receiptPath, command: receipt.command }));
child.on('error', error => { receipt.spawnError = error.message; });
child.on('close', (exitCode, signal) => {
  fs.closeSync(fd);
  receipt.finishedAt = new Date().toISOString();
  receipt.elapsedMilliseconds = Math.round(performance.now() - start);
  receipt.exitCode = exitCode;
  receipt.signal = signal;
  receipt.log = identify(logPath);
  receipt.status = exitCode === 0 ? 'built' : 'failed';
  receipt.boundaries.build = receipt.status;
  receipt.source.commitAfter = run('git', ['rev-parse', 'HEAD']).stdout;
  receipt.authoritiesAfter = authorities.map(item => identify(item.path));
  receipt.authoritiesPreserved = receipt.authoritiesAfter.every((item, index) => item.sha256 === authorities[index].sha256);
  if (exitCode === 0) receipt.output = identify(command.output);
  save();
  console.log(JSON.stringify({ status: receipt.status, exitCode, elapsedMilliseconds: receipt.elapsedMilliseconds, output: receipt.output ?? null, receiptPath }));
  process.exitCode = exitCode ?? 1;
});
