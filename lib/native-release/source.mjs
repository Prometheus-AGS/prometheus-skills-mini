import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { bundleWindowsMemory, needsWindowsMemoryBundle, prepareWindowsMemory } from './windows-memory.mjs';
import { currentHost, executable, product, root } from './catalog.mjs';

// esaxx-rs 0.1.10 hardcodes /MT in its cc::Build. The prebuilt ONNX Runtime
// that supplies palace embeddings uses /MD. cc reads CXXFLAGS_<target> last.
export function nativeBuildEnvironment(name, target = currentHost()?.target) {
  if (name !== 'surreal-memory-server' || !['x86_64-pc-windows-msvc', 'aarch64-pc-windows-msvc'].includes(target)) {
    return process.env;
  }
  const key = 'CXXFLAGS_' + target;
  return { ...process.env, [key]: [process.env[key], '/MD'].filter(Boolean).join(' ') };
}

// Compile a clean snapshot. Reuse a local submodule's Git objects without building its
// dirty working tree, moving its HEAD or sharing a target directory with another build.
export async function buildBinary(name, output, target) {
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
    // Pin the fallback to the same Windows target as the selected runtime, including
    // when Node runs under emulation and rustup's default host has a different CPU.
    const hostTarget = target ?? currentHost()?.target;
    const cargoTarget = target ?? (name === 'surreal-memory-server' && hostTarget?.endsWith('-windows-msvc') ? hostTarget : undefined);
    const args = ['build', '--locked', '--release', '--manifest-path', manifest, '--target-dir', targetDir,
      '--package', spec.pkg, '--bin', name, ...(cargoTarget ? ['--target', cargoTarget] : []), ...(spec.flags ?? [])];
    const runtime = needsWindowsMemoryBundle(name, hostTarget) ? await prepareWindowsMemory(directory) : null;
    const env = { ...nativeBuildEnvironment(name, hostTarget), ...runtime?.env };
    execFileSync('cargo', args, { cwd: root, stdio: 'inherit', env });
    const binary = path.join(targetDir, cargoTarget ?? '', 'release', executable(name));
    if (runtime) bundleWindowsMemory(runtime.payload, binary, output);
    else fs.copyFileSync(binary, output);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}
