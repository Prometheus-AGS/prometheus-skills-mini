import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseVersionsToml } from '../../rules/lib/versions-toml.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const releaseVersion = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
export const repository = 'Prometheus-AGS/prometheus-skills-mini';
export const releaseTag = `v${releaseVersion}`;
if (!/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(releaseTag)) throw new Error('Invalid Mini release version');

export const hosts = [
  ['darwin', 'x64', 'x86_64-apple-darwin', 'macos-15-intel'],
  ['darwin', 'arm64', 'aarch64-apple-darwin', 'macos-15'],
  ['linux', 'x64', 'x86_64-unknown-linux-gnu', 'ubuntu-24.04'],
  ['linux', 'arm64', 'aarch64-unknown-linux-gnu', 'ubuntu-24.04-arm'],
  ['win32', 'x64', 'x86_64-pc-windows-msvc', 'windows-2025'],
  ['win32', 'arm64', 'aarch64-pc-windows-msvc', 'windows-11-arm'],
].map(([platform, arch, target, runner]) => ({ platform, arch, target, runner }));

export function currentHost() {
  // The Linux assets use glibc; a matching CPU on a musl system still needs a source build.
  if (process.platform === 'linux' && !process.report.getReport().header.glibcVersionRuntime) return null;
  return hosts.find(({ platform, arch }) => platform === process.platform && arch === process.arch);
}

const pins = parseVersionsToml(readFileSync(path.join(root, 'versions.toml'), 'utf8')).submodules;
export const products = {
  pk: { submodule: 'tools/prometheus-knowledge', repository: 'Prometheus-AGS/prometheus-knowledge-rs', pkg: 'pk-cli' },
  prometheus: {
    repository: 'Prometheus-AGS/prometheus-skill-system', ref: 'd0af0f66fb2eff397309330e517d7919a284ce11',
    workspace: 'tools/prometheus-cli', sparse: ['tools/prometheus-cli', 'substrate/kbd-runtime', 'scripts'], pkg: 'prometheus-cli',
  },
  'liter-llm': { submodule: 'tools/liter-llm', repository: 'GQAdonis/liter-llm', pkg: 'liter-llm-cli' },
  'surreal-memory-server': {
    submodule: 'tools/surreal-memory-server', repository: 'Prometheus-AGS/surreal-memory-server', pkg: 'surreal-memory-server',
    flags: ['--no-default-features', '--features', 'server-only,palace,local-embeddings'],
  },
};

export function product(name) {
  if (!Object.hasOwn(products, name)) throw new Error(`Unknown tool ${name}. Choose from ${Object.keys(products).join(', ')}`);
  const spec = products[name];
  const ref = spec.ref ?? pins[spec.submodule];
  if (!/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error(`Missing exact source revision for ${name}`);
  return { ...spec, ref };
}

export const executable = (name, platform = process.platform) => name + (platform === 'win32' ? '.exe' : '');
export const assetName = (name, host) => executable(`${name}-${releaseTag}-${host.target}`, host.platform);
