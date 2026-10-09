// Materializes the Claude and Codex plugin packages and the two marketplace files from
// skill-system.json, into a temp directory first and only then atomically swapping them into the
// real output paths -- the same build-then-replace pattern prometheus-skill-pack's own generator
// uses (fs.mkdtempSync + a final copy), so a failed or interrupted generation never leaves a
// half-written dist/ tree.
//
// Every copy in this module is copy-mode: a real file, never a symlink. That is the one
// deliberate divergence from the full pack's own generator, which symlinks most install targets.
// This repo's own rule (rules/src, openspec/config.yaml) forbids symlinks everywhere, specifically
// because they need Windows Developer Mode or elevation to create -- exactly what the mini exists
// to avoid requiring.

import fs from 'node:fs';
import path from 'node:path';
import { createAtomicWrite } from '../platform/atomic-write.mjs';
import { tempDir, homeDir } from '../platform/paths.mjs';
import { canonicalBytes } from './canonical-bytes.mjs';
import { collectDistributionSkills } from './skill-system.mjs';
import { codexHooksDocument } from './codex-hooks.mjs';
import { claudePluginManifest, codexPluginManifest } from './manifest.mjs';
import { claudeMarketplace, codexMarketplace } from './marketplace.mjs';
import { writeReviewedSkillClosures } from './reviewed-skill-closures.mjs';

const SKIPPED_DIR_NAMES = new Set(['.git', 'node_modules', 'target', '.kbd-orchestrator', '__pycache__']);
// Canonical JSON has no executable intent. Explicit mode also protects an
// atomic writer's temporary files from a permissive caller umask.
const atomicWrite = createAtomicWrite({
  writeFile: (file, content, options) => fs.writeFileSync(file, content, { ...options, mode: 0o644 }),
});

function assertOwnedPath(root, file) {
  const boundary = path.resolve(root);
  const absolute = path.resolve(file);
  const relative = path.relative(boundary, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`distribution path escapes declared ownership: ${file}`);
  }
  let current = absolute;
  while (true) {
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) throw new Error(`refusing a linked distribution path: ${current}`);
    if (current === boundary) break;
    current = path.dirname(current);
  }
}

function ownedMode(stat) {
  // Keep source executable intent and ordinary permissions, dropping special
  // bits and world write. Owned directories retain owner traversal/write so a
  // read-only source can be staged, cleaned up and regenerated safely.
  return ((stat.mode & 0o777) & ~0o002) | (stat.isDirectory() ? 0o700 : 0o400);
}

function makeDirectory(directory) {
  const firstCreated = fs.mkdirSync(directory, { recursive: true, mode: 0o755 });
  if (firstCreated) {
    let current = directory;
    while (true) {
      fs.chmodSync(current, 0o755);
      if (current === firstCreated) break;
      current = path.dirname(current);
    }
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function writeJson(root, relative, value) {
  const file = path.join(root, relative);
  assertOwnedPath(root, file);
  makeDirectory(path.dirname(file));
  atomicWrite(file, `${JSON.stringify(canonicalJson(value), null, 2)}\n`);
  fs.chmodSync(file, 0o644);
}

/** Recursively copies `source` into `destination`, real files only, never a symlink. */
function copyTree(source, destination, sourceRoot, ownershipRoot) {
  assertOwnedPath(sourceRoot, source);
  assertOwnedPath(ownershipRoot, destination);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    throw new Error(`refusing to copy a symlink into the distribution payload: ${source}`);
  }
  if (stat.isDirectory()) {
    const mode = ownedMode(stat);
    makeDirectory(path.dirname(destination));
    fs.mkdirSync(destination, { recursive: true, mode });
    fs.chmodSync(destination, mode);
    for (const name of fs.readdirSync(source).sort()) {
      if (SKIPPED_DIR_NAMES.has(name)) continue;
      copyTree(path.join(source, name), path.join(destination, name), sourceRoot, ownershipRoot);
    }
    fs.chmodSync(destination, mode);
    return;
  }
  if (!stat.isFile()) throw new Error(`refusing a non-file distribution source: ${source}`);
  makeDirectory(path.dirname(destination));
  const mode = ownedMode(stat);
  const existing = fs.lstatSync(destination, { throwIfNoEntry: false });
  if (existing?.isFile()) fs.chmodSync(destination, mode | 0o600);
  fs.writeFileSync(destination, canonicalBytes(source), { mode });
  fs.chmodSync(destination, mode);
}

/**
 * Whether a serialized JSON document contains any of the given absolute paths. JSON escapes a
 * Windows path's backslashes, so the raw path alone never matches there; check every spelling a
 * path can take inside JSON: raw, JSON-escaped, and forward-slashed.
 */
export function containsMachinePath(serialized, paths) {
  return paths
    .filter(Boolean)
    .flatMap((p) => [p, JSON.stringify(p).slice(1, -1), p.replaceAll('\\', '/')])
    .some((needle) => serialized.includes(needle));
}

/** Reads the repo's own .mcp.json if one exists; otherwise an empty, valid server map. */
function sourceMcpConfig(sourceRoot) {
  const file = path.join(sourceRoot, '.mcp.json');
  assertOwnedPath(sourceRoot, file);
  if (!fs.existsSync(file)) return { mcpServers: {} };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const serialized = JSON.stringify(parsed);
  if (containsMachinePath(serialized, [sourceRoot, homeDir()])) {
    throw new Error('.mcp.json contains a machine-specific absolute path');
  }
  if (/tvly-[A-Za-z0-9_-]{12,}/.test(serialized)) {
    throw new Error('.mcp.json contains a literal Tavily credential');
  }
  return parsed;
}

// Every file hooks/hooks.json tells the harness to run must ship with the Claude package. When
// one is missing, every hook event dies with MODULE_NOT_FOUND before any pack code runs, so it
// can only be caught here, at packaging time -- not from inside the hook. Derived from
// hooks.json's own ${CLAUDE_PLUGIN_ROOT} references, never a hand-kept list.
function copyHookTargets(sourceRoot, packageRoot, platform) {
  const hooksJsonPath = path.join(sourceRoot, 'hooks', 'hooks.json');
  assertOwnedPath(sourceRoot, hooksJsonPath);
  if (!fs.existsSync(hooksJsonPath)) return;
  const claudeHooksJson = fs.readFileSync(hooksJsonPath, 'utf8');
  // Codex gets the same hook source rendered into its single-command-string form; its targets are
  // read from the rendered file, so what Codex is told to run is exactly what ships.
  const codexHooks = platform === 'codex' ? codexHooksDocument(JSON.parse(claudeHooksJson)) : null;
  const hooksJson = codexHooks ? JSON.stringify(codexHooks) : claudeHooksJson;
  const targets = new Set(
    [...hooksJson.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/g)].map((match) => path.posix.normalize(match[1])),
  );
  if (codexHooks) writeJson(packageRoot, 'hooks/hooks.json', codexHooks);
  else copyTree(hooksJsonPath, path.join(packageRoot, 'hooks', 'hooks.json'), sourceRoot, packageRoot);
  for (const target of [...targets].sort()) {
    if (target.startsWith('../') || path.posix.isAbsolute(target)) {
      throw new Error(`hooks.json references a path outside the plugin root: ${target}`);
    }
    const source = path.join(sourceRoot, ...target.split('/'));
    if (!fs.existsSync(source)) throw new Error(`hooks.json references a missing file: ${target}`);
    copyTree(source, path.join(packageRoot, ...target.split('/')), sourceRoot, packageRoot);
  }
}

// Adapters live outside the shared skill. Include their actual module closure in both
// harness payloads; copying only SKILL.md or all of lib/ respectively breaks execution
// or unnecessarily distributes fixtures and tests. The recorder is a runtime URL target.
export function cadenceRuntimeFiles(sourceRoot, entries = ['scripts/cadence-kbd-adapter.mjs', 'scripts/cadence-karpathy-adapter.mjs', 'scripts/record-progress.mjs']) {
  const pending = [...entries];
  const found = new Set();
  while (pending.length) {
    const relative = pending.pop();
    if (found.has(relative)) continue;
    if (relative.startsWith('../') || path.posix.isAbsolute(relative)) throw new Error(`Cadence dependency escapes package: ${relative}`);
    const file = path.join(sourceRoot, ...relative.split('/'));
    assertOwnedPath(sourceRoot, file);
    if (!fs.existsSync(file)) throw new Error(`Cadence runtime dependency is missing: ${relative}`);
    found.add(relative);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:import\(|new URL\()\s*['"](\.[^'"]+)['"]/g)) {
      pending.push(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
    }
    for (const match of source.matchAll(/^\s*(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"](\.[^'"]+)['"]/gm)) {
      pending.push(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
    }
  }
  return [...found].sort();
}

// KBD lifecycle entry points every package ships, with their module closure. A source tree
// without one of these cannot produce a working package, so the build fails rather than skip it.
export const LIFECYCLE_ENTRIES = Object.freeze(['scripts/hook-entry.mjs', 'scripts/kbd-new-phase.mjs', 'scripts/kbd-next-phase.mjs', 'scripts/kbd-new-child.mjs', 'scripts/kbd-next-child.mjs', 'scripts/kbd-apply.mjs']);

function materializePlatformPackage(sourceRoot, packageRoot, platform, contract, skills) {
  for (const skill of skills) copyTree(skill.source, path.join(packageRoot, 'skills', skill.name), sourceRoot, packageRoot);
  if (skills.some((skill) => skill.name === 'delivery-cadence')) {
    for (const relative of cadenceRuntimeFiles(sourceRoot)) {
      copyTree(path.join(sourceRoot, relative), path.join(packageRoot, relative), sourceRoot, packageRoot);
    }
  }
  for (const relative of cadenceRuntimeFiles(sourceRoot, LIFECYCLE_ENTRIES)) {
    copyTree(path.join(sourceRoot, relative), path.join(packageRoot, relative), sourceRoot, packageRoot);
  }
  copyTree(path.join(sourceRoot, 'lib/platform/openspec/README.md'), path.join(packageRoot, 'lib/platform/openspec/README.md'), sourceRoot, packageRoot);
  writeJson(packageRoot, '.mcp.json', sourceMcpConfig(sourceRoot));
  if (platform === 'claude') {
    writeJson(packageRoot, '.claude-plugin/plugin.json', claudePluginManifest(contract));
  } else {
    // No `hooks` manifest key: Codex rejects one and finds hooks/hooks.json by convention.
    writeJson(packageRoot, '.codex-plugin/plugin.json', codexPluginManifest(contract));
  }
  copyHookTargets(sourceRoot, packageRoot, platform);
  writeReviewedSkillClosures(packageRoot, { sharedRoots: ['scripts', 'lib', 'hooks', '.mcp.json'] });
}

/** Builds both plugin packages and both marketplace files into `root` (a fresh, empty directory). */
export function materializeDistribution(sourceRoot, root, contract) {
  for (const output of outputRelativePaths(contract)) assertOwnedPath(root, path.join(root, output));
  for (const inventory of contract.inventory.roots) {
    const directory = path.join(sourceRoot, inventory.path);
    assertOwnedPath(sourceRoot, directory);
    // The existing collector inspects SKILL.md through stat/read. Reject linked
    // inventory children before that scan can follow one outside the source.
    if (fs.existsSync(directory)) {
      for (const name of fs.readdirSync(directory).sort()) {
        const child = path.join(directory, name);
        assertOwnedPath(sourceRoot, child);
        if (fs.lstatSync(child).isDirectory()) assertOwnedPath(sourceRoot, path.join(child, 'SKILL.md'));
      }
    }
  }
  const skills = collectDistributionSkills(sourceRoot, contract);
  materializePlatformPackage(sourceRoot, path.join(root, contract.outputs.claudePackage), 'claude', contract, skills);
  materializePlatformPackage(sourceRoot, path.join(root, contract.outputs.codexPackage), 'codex', contract, skills);
  writeJson(root, contract.outputs.claudeMarketplace, claudeMarketplace(contract));
  writeJson(root, contract.outputs.codexMarketplace, codexMarketplace(contract));
  return skills;
}

function digestTree(directory, modes, relative = '') {
  const absolute = path.join(directory, relative);
  const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (!stat) return null;
  // Check mode/kind drift without following an unexpected output link.
  const kind = stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other';
  const entry = { path: relative.split(path.sep).join('/'), kind };
  if (modes) entry.mode = stat.mode & 0o7777;
  if (kind === 'file') entry.bytes = canonicalBytes(absolute).toString('base64');
  const result = [entry];
  if (kind === 'directory') {
    for (const name of fs.readdirSync(absolute).sort()) {
      result.push(...digestTree(directory, modes, path.join(relative, name)));
    }
  }
  return result;
}

function outputRelativePaths(contract) {
  const outputs = [contract.outputs.claudePackage, contract.outputs.codexPackage,
    contract.outputs.claudeMarketplace, contract.outputs.codexMarketplace];
  for (const output of outputs) {
    if (typeof output !== 'string' || !output || /[\\\0]/.test(output) ||
        path.posix.isAbsolute(output) || path.win32.isAbsolute(output) ||
        path.posix.normalize(output) !== output || output === '.' || output === '..' || output.startsWith('../')) {
      throw new Error(`invalid distribution ownership path: ${output}`);
    }
  }
  return outputs;
}

function stagingDirectory(sourceRoot) {
  // Prefer the source volume so permission semantics match the outputs. A
  // read-only checkout still supports --check via the original temp location.
  try {
    return fs.mkdtempSync(path.join(sourceRoot, '.mini-distribution-'));
  } catch (error) {
    if (!['EACCES', 'EPERM', 'EROFS'].includes(error.code)) throw error;
    return fs.mkdtempSync(path.join(tempDir(), 'prometheus-skills-mini-distribution-'));
  }
}

function modeVerification(sourceRoot, staging, outputs) {
  if (process.platform === 'win32') {
    return { supported: false, reason: 'Node on Windows does not express POSIX executable modes' };
  }
  const device = fs.statSync(staging).dev;
  for (const output of outputs) {
    let existing = path.join(sourceRoot, output);
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    if (fs.statSync(existing).dev !== device) {
      return { supported: false, reason: 'staging and generated outputs are on different filesystem volumes' };
    }
  }
  const probe = path.join(staging, '.mode-probe');
  const probeDirectory = path.join(staging, '.mode-probe-directory');
  try {
    fs.writeFileSync(probe, '', { mode: 0o600, flag: 'wx' });
    for (const mode of [0o755, 0o644, 0o600]) {
      fs.chmodSync(probe, mode);
      if ((fs.statSync(probe).mode & 0o777) !== mode) {
        return { supported: false, reason: 'filesystem does not preserve POSIX permission changes' };
      }
    }
    fs.mkdirSync(probeDirectory, { mode: 0o700 });
    for (const mode of [0o755, 0o700]) {
      fs.chmodSync(probeDirectory, mode);
      if ((fs.statSync(probeDirectory).mode & 0o777) !== mode) {
        return { supported: false, reason: 'filesystem does not preserve directory traversal permissions' };
      }
    }
    return { supported: true, reason: null };
  } catch (error) {
    return { supported: false, reason: `filesystem mode probe unavailable: ${error.code ?? error.message}` };
  } finally {
    fs.rmSync(probe, { force: true });
    fs.rmSync(probeDirectory, { recursive: true, force: true });
  }
}

/**
 * Builds the distribution in staging, then either replaces the declared output paths
 * (`check: false`, the default) or compares without changing outputs (`check: true`).
 * Returns `{ skills, drift, modeVerification }`; drift is only non-empty in check mode.
 */
export function generateDistribution(sourceRoot, contract, { check = false } = {}) {
  const outputs = outputRelativePaths(contract);
  // Refuse linked ancestors before any owned output is removed or read.
  for (const output of outputs) assertOwnedPath(sourceRoot, path.join(sourceRoot, output));
  const staging = stagingDirectory(sourceRoot);
  try {
    const modes = modeVerification(sourceRoot, staging, outputs);
    const skills = materializeDistribution(sourceRoot, staging, contract);
    if (check) {
      const drift = [];
      for (const output of outputs) {
        const expectedPath = path.join(staging, output);
        const actualPath = path.join(sourceRoot, output);
        const expected = digestTree(expectedPath, modes.supported);
        const actual = digestTree(actualPath, modes.supported);
        if (JSON.stringify(expected) !== JSON.stringify(actual)) drift.push(output);
      }
      return { skills, drift, modeVerification: modes };
    }
    for (const output of outputs) {
      const destination = path.join(sourceRoot, output);
      fs.rmSync(destination, { recursive: true, force: true });
      copyTree(path.join(staging, output), destination, staging, sourceRoot);
    }
    return { skills, drift: [], modeVerification: modes };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
