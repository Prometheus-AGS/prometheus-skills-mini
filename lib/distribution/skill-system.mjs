// Reads and validates skill-system.json (the distribution manifest at the repo root), and scans
// its declared inventory roots for distributable skills. Ported from prometheus-skill-pack's
// scripts/lib/skill-system.js, scaled to the mini's single-root, copy-only inventory.

import fs from 'node:fs';
import path from 'node:path';
import { parseSkillFrontmatter } from './frontmatter.mjs';

const SCHEMA_VERSION = 'prometheus-mini-skill-system-v1';

/** Reads skill-system.json from `sourceRoot`, throwing if it is missing or malformed. */
export function readSkillSystem(sourceRoot) {
  const file = path.join(sourceRoot, 'skill-system.json');
  if (!fs.existsSync(file)) throw new Error(`distribution manifest is missing: ${file}`);
  const contract = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (contract.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`unsupported distribution manifest schemaVersion: ${contract.schemaVersion ?? 'missing'}`);
  }
  if (!Array.isArray(contract.targets) || contract.targets.length === 0) {
    throw new Error('distribution manifest must declare at least one install target');
  }
  for (const target of contract.targets) {
    if (target.mode !== 'copy') {
      throw new Error(`target ${target.id ?? '<missing>'} must use mode "copy" (no symlinks in this repo)`);
    }
  }
  if (compareVersions(contract.releaseVersion, contract.minimumActiveVersion) < 0) {
    throw new Error('releaseVersion cannot be below minimumActiveVersion');
  }
  return contract;
}

export function compareVersions(left, right) {
  const parse = (value) => {
    const match = String(value).match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    if (!match) throw new Error(`invalid semantic version: ${value}`);
    return match.slice(1).map(Number);
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function skillNameFor(skillFile) {
  const { name } = parseSkillFrontmatter(skillFile);
  const resolved = name || path.basename(path.dirname(skillFile));
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(resolved)) {
    throw new Error(`unsafe skill name in ${skillFile}: ${resolved}`);
  }
  return resolved;
}

/**
 * Every skill directory under the manifest's inventory roots that has a SKILL.md. A directory
 * without one (a skill still being authored, e.g. by a parallel session) is silently skipped --
 * the manifest reflects what exists on disk right now, not a fixed roster.
 */
export function collectDistributionSkills(sourceRoot, contract) {
  const result = [];
  for (const root of contract.inventory.roots) {
    const absolute = path.join(sourceRoot, root.path);
    if (!fs.existsSync(absolute)) throw new Error(`skill inventory root is unavailable: ${root.path}`);
    for (const name of fs.readdirSync(absolute).sort()) {
      const child = path.join(absolute, name);
      if (!fs.statSync(child).isDirectory()) continue;
      const skillFile = path.join(child, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      result.push({ name: skillNameFor(skillFile), source: child });
    }
  }
  result.sort((left, right) => left.name.localeCompare(right.name));
  for (let index = 1; index < result.length; index += 1) {
    if (result[index - 1].name === result[index].name) {
      throw new Error(`duplicate distributed skill name: ${result[index].name}`);
    }
  }
  return result;
}
