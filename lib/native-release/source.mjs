import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { executable, product, root } from './catalog.mjs';

// Compile a clean snapshot. Reuse a local submodule's Git objects without building its
// dirty working tree, moving its HEAD or sharing a target directory with another build.
export function buildBinary(name, output, target) {
  const spec = product(name);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-native-build-'));
  const checkout = path.join(directory, 'source');
  const local = spec.submodule && path.join(root, spec.submodule);
  const hasLocalSource = local && fs.existsSync(path.join(local, '.git'));
  const targetDir = hasLocalSource ? path.join(local, 'target') : path.join(directory, 'target');
  try {
    fs.mkdirSync(checkout);
    const git = (...args) => execFileSync('git', args, { cwd: checkout, stdio: 'inherit' });
    git('init', '--quiet');
    if (spec.sparse) git('sparse-checkout', 'set', '--cone', ...spec.sparse);
    const source = hasLocalSource ? local : `https://github.com/${spec.repository}.git`;
    git('remote', 'add', 'origin', source);
    git('fetch', '--quiet', '--depth=1', '--filter=blob:none', 'origin', spec.ref);
    git('checkout', '--quiet', '--detach', 'FETCH_HEAD');
    const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim();
    if (actual !== spec.ref) throw new Error(`Unexpected source revision for ${name}: ${actual}`);
    const manifest = path.join(checkout, spec.workspace ?? '', 'Cargo.toml');
    const args = ['build', '--locked', '--release', '--manifest-path', manifest, '--target-dir', targetDir,
      '--package', spec.pkg, '--bin', name, ...(target ? ['--target', target] : []), ...(spec.flags ?? [])];
    execFileSync('cargo', args, { cwd: root, stdio: 'inherit' });
    fs.copyFileSync(path.join(targetDir, target ?? '', 'release', executable(name)), output);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}
