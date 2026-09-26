// Runs only tests owned by prometheus-skills-mini. Imported adjacent plugins and generated
// distribution payloads carry their own suites and are verified through their staging contract;
// Node's default recursive discovery would otherwise execute those foreign tests repeatedly.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['hooks', 'lib', 'rules', 'scripts', 'skills'];
const skipped = new Set(['.git', 'dist', 'node_modules', 'plugins', 'target']);
const testName = /\.(?:test|spec)\.(?:c|m)?js$/;

function collect(directory, result) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute, result);
    else if (entry.isFile() && testName.test(entry.name)) result.push(path.relative(root, absolute));
  }
}

const files = [];
for (const directory of roots) collect(path.join(root, directory), files);
files.sort();
if (files.length === 0) {
  console.error('No mini-owned test files found.');
  process.exitCode = 1;
} else {
  const args = ['--test'];
  if (process.argv.includes('--coverage')) args.push('--experimental-test-coverage');
  args.push(...files);
  const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
