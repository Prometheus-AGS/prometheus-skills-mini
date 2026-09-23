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
import { atomicWrite } from '../platform/atomic-write.mjs';
import { tempDir, homeDir } from '../platform/paths.mjs';
import { canonicalBytes } from './canonical-bytes.mjs';
import { collectDistributionSkills } from './skill-system.mjs';
import { claudePluginManifest, codexPluginManifest } from './manifest.mjs';
import { claudeMarketplace, codexMarketplace } from './marketplace.mjs';

const SKIPPED_DIR_NAMES = new Set(['.git', 'node_modules', 'target', '.kbd-orchestrator', '__pycache__']);

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function writeJson(root, relative, value) {
  const file = path.join(root, relative);
  atomicWrite(file, `${JSON.stringify(canonicalJson(value), null, 2)}\n`);
}

/** Recursively copies `source` into `destination`, real files only, never a symlink. */
function copyTree(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    throw new Error(`refusing to copy a symlink into the distribution payload: ${source}`);
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source).sort()) {
      if (SKIPPED_DIR_NAMES.has(name)) continue;
      copyTree(path.join(source, name), path.join(destination, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, canonicalBytes(source));
}

/** Reads the repo's own .mcp.json if one exists; otherwise an empty, valid server map. */
function sourceMcpConfig(sourceRoot) {
  const file = path.join(sourceRoot, '.mcp.json');
  if (!fs.existsSync(file)) return { mcpServers: {} };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const serialized = JSON.stringify(parsed);
  if (serialized.includes(sourceRoot) || serialized.includes(homeDir())) {
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
function copyHookTargets(sourceRoot, packageRoot) {
  const hooksJsonPath = path.join(sourceRoot, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksJsonPath)) return;
  const hooksJson = fs.readFileSync(hooksJsonPath, 'utf8');
  const targets = new Set(
    [...hooksJson.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/g)].map((match) => path.posix.normalize(match[1])),
  );
  copyTree(hooksJsonPath, path.join(packageRoot, 'hooks', 'hooks.json'));
  for (const target of [...targets].sort()) {
    if (target.startsWith('../') || path.posix.isAbsolute(target)) {
      throw new Error(`hooks.json references a path outside the plugin root: ${target}`);
    }
    const source = path.join(sourceRoot, ...target.split('/'));
    if (!fs.existsSync(source)) throw new Error(`hooks.json references a missing file: ${target}`);
    copyTree(source, path.join(packageRoot, ...target.split('/')));
  }
}

function materializePlatformPackage(sourceRoot, packageRoot, platform, contract, skills) {
  for (const skill of skills) copyTree(skill.source, path.join(packageRoot, 'skills', skill.name));
  writeJson(packageRoot, '.mcp.json', sourceMcpConfig(sourceRoot));
  if (platform === 'claude') {
    writeJson(packageRoot, '.claude-plugin/plugin.json', claudePluginManifest(contract));
    copyHookTargets(sourceRoot, packageRoot);
  } else {
    writeJson(packageRoot, '.codex-plugin/plugin.json', codexPluginManifest(contract));
  }
}

/** Builds both plugin packages and both marketplace files into `root` (a fresh, empty directory). */
export function materializeDistribution(sourceRoot, root, contract) {
  const skills = collectDistributionSkills(sourceRoot, contract);
  materializePlatformPackage(sourceRoot, path.join(root, contract.outputs.claudePackage), 'claude', contract, skills);
  materializePlatformPackage(sourceRoot, path.join(root, contract.outputs.codexPackage), 'codex', contract, skills);
  writeJson(root, contract.outputs.claudeMarketplace, claudeMarketplace(contract));
  writeJson(root, contract.outputs.codexMarketplace, codexMarketplace(contract));
  return skills;
}

function digestTree(directory, relative = '') {
  const result = [];
  if (!fs.existsSync(path.join(directory, relative))) return result;
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const child = path.join(relative, name);
    const absolute = path.join(directory, child);
    const stat = fs.lstatSync(absolute);
    if (stat.isDirectory()) result.push(...digestTree(directory, child));
    else result.push({ path: child.split(path.sep).join('/'), bytes: canonicalBytes(absolute).toString('base64') });
  }
  return result;
}

const outputRelativePaths = (contract) => [
  contract.outputs.claudePackage,
  contract.outputs.codexPackage,
  contract.outputs.claudeMarketplace,
  contract.outputs.codexMarketplace,
];

/**
 * Builds the distribution in a temp directory, then either atomically replaces the real output
 * paths (`check: false`, the default) or compares against them without writing (`check: true`).
 * Returns `{ skills, drift }`; `drift` is only ever non-empty in check mode.
 */
export function generateDistribution(sourceRoot, contract, { check = false } = {}) {
  const staging = fs.mkdtempSync(path.join(tempDir(), 'prometheus-skills-mini-distribution-'));
  try {
    const skills = materializeDistribution(sourceRoot, staging, contract);
    const outputs = outputRelativePaths(contract);
    if (check) {
      const drift = [];
      for (const output of outputs) {
        const expectedPath = path.join(staging, output);
        const actualPath = path.join(sourceRoot, output);
        const expected = fs.existsSync(expectedPath)
          ? fs.statSync(expectedPath).isDirectory()
            ? digestTree(expectedPath)
            : canonicalBytes(expectedPath).toString('base64')
          : null;
        const actual = fs.existsSync(actualPath)
          ? fs.statSync(actualPath).isDirectory()
            ? digestTree(actualPath)
            : canonicalBytes(actualPath).toString('base64')
          : null;
        if (JSON.stringify(expected) !== JSON.stringify(actual)) drift.push(output);
      }
      return { skills, drift };
    }
    for (const output of outputs) {
      const destination = path.join(sourceRoot, output);
      fs.rmSync(destination, { recursive: true, force: true });
      copyTree(path.join(staging, output), destination);
    }
    return { skills, drift: [] };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
