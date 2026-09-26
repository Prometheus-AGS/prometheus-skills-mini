// Materializes imported skill packages as adjacent plugins. The imported package owns its
// payload contract and staging command; this pack pins the Git source and exposes the staged
// bytes through separate Claude and Codex distribution roots without flattening its skills.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PLATFORMS = ['claude', 'codex'];

function safeRelative(value, field) {
  if (typeof value !== 'string' || value.length === 0 || path.isAbsolute(value)) {
    throw new Error(`${field} must be a non-empty relative path`);
  }
  const normalized = path.posix.normalize(value.replaceAll('\\', '/'));
  if (normalized === '..' || normalized.startsWith('../') || normalized !== value.replaceAll('\\', '/')) {
    throw new Error(`${field} must stay inside its declared root: ${value}`);
  }
  return normalized;
}

function inside(root, relative, field) {
  const resolved = path.resolve(root, ...safeRelative(relative, field).split('/'));
  const relation = path.relative(root, resolved);
  if (relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    throw new Error(`${field} escapes its declared root: ${relative}`);
  }
  return resolved;
}

function readJson(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} is missing: ${file}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function checkoutCommit(root, entry) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', shell: false });
  if (result.status !== 0) {
    throw new Error(`cannot read ${entry.id} checkout commit: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function copyTree(source, destination) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error(`adjacent plugin payload contains a symlink: ${source}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source).sort()) {
      copyTree(path.join(source, name), path.join(destination, name));
    }
    return;
  }
  if (!stat.isFile()) throw new Error(`adjacent plugin payload contains an unsupported entry: ${source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

export function collectAdjacentPlugins(sourceRoot, contract) {
  const adjacent = [];
  for (const entry of contract.imports ?? []) {
    if (entry.distribution?.mode !== 'adjacent-plugin') continue;
    const importRoot = inside(sourceRoot, entry.path, `import ${entry.id} path`);
    if (!fs.existsSync(importRoot)) throw new Error(`adjacent plugin checkout is unavailable: ${entry.path}`);
    if (!/^[a-f0-9]{40}$/.test(entry.commit ?? '')) {
      throw new Error(`adjacent plugin ${entry.id} must declare a full 40-character commit`);
    }
    const actualCommit = checkoutCommit(importRoot, entry);
    if (actualCommit !== entry.commit) {
      throw new Error(`adjacent plugin ${entry.id} checkout is ${actualCommit}, expected ${entry.commit}`);
    }

    const distribution = entry.distribution;
    if (!['full', 'mini'].includes(distribution.stageVariant)) {
      throw new Error(`adjacent plugin ${entry.id} has an invalid stageVariant`);
    }
    const stageScript = inside(importRoot, distribution.stageScript, `${entry.id} stageScript`);
    if (!fs.existsSync(stageScript)) throw new Error(`adjacent plugin stage script is missing: ${distribution.stageScript}`);

    const manifests = {};
    const outputs = {};
    for (const platform of PLATFORMS) {
      const manifestRelative = distribution.manifests?.[platform];
      const outputRelative = distribution.outputs?.[platform];
      const manifest = readJson(inside(importRoot, manifestRelative, `${entry.id} ${platform} manifest`), `${entry.id} ${platform} manifest`);
      if (manifest.name !== entry.id) {
        throw new Error(`${entry.id} ${platform} manifest name is ${manifest.name ?? 'missing'}`);
      }
      if (manifest.version !== distribution.version) {
        throw new Error(`${entry.id} ${platform} manifest version is ${manifest.version ?? 'missing'}, expected ${distribution.version}`);
      }
      manifests[platform] = { relative: manifestRelative, value: manifest };
      outputs[platform] = safeRelative(outputRelative, `${entry.id} ${platform} output`);
    }
    adjacent.push({ entry, distribution, importRoot, stageScript, manifests, outputs });
  }
  return adjacent;
}

export function adjacentOutputRelativePaths(adjacent) {
  return adjacent.flatMap((plugin) => PLATFORMS.map((platform) => plugin.outputs[platform]));
}

export function materializeAdjacentPlugins(root, adjacent) {
  for (const plugin of adjacent) {
    const stage = path.join(root, `.adjacent-${plugin.entry.id}`);
    const result = spawnSync(
      process.execPath,
      [plugin.stageScript, '--output', stage, '--variant', plugin.distribution.stageVariant],
      { cwd: plugin.importRoot, encoding: 'utf8', shell: false },
    );
    if (result.status !== 0) {
      throw new Error(`failed to stage adjacent plugin ${plugin.entry.id}: ${result.stderr.trim() || result.stdout.trim()}`);
    }
    const packageRoot = path.join(stage, 'package');
    if (!fs.existsSync(packageRoot)) throw new Error(`adjacent plugin ${plugin.entry.id} staged no package directory`);
    for (const platform of PLATFORMS) {
      copyTree(stage, path.join(root, plugin.outputs[platform]));
      const manifest = path.join(root, plugin.outputs[platform], 'package', ...plugin.manifests[platform].relative.split('/'));
      if (!fs.existsSync(manifest)) {
        throw new Error(`staged ${plugin.entry.id} ${platform} payload is missing its native manifest`);
      }
    }
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

export function adjacentMarketplaceEntries(adjacent, platform) {
  return adjacent.map((plugin) => ({
    name: plugin.entry.id,
    source:
      platform === 'claude'
        ? `./${plugin.outputs.claude}/package`
        : { source: 'local', path: `./${plugin.outputs.codex}/package` },
    version: plugin.distribution.version,
    category: plugin.distribution.category,
    description: plugin.manifests[platform].value.description,
    ...(platform === 'codex'
      ? {
          policy: {
            installation: plugin.distribution.installByDefault ? 'INSTALLED_BY_DEFAULT' : 'AVAILABLE',
            authentication: 'ON_INSTALL',
          },
          metadata: { repository: plugin.entry.repository, sha: plugin.entry.commit },
        }
      : {}),
  }));
}
