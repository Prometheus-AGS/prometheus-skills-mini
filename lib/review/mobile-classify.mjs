// Port of adversarial-review/scripts/classify-mobile-execution.sh (prometheus-skill-pack, 196 lines).
//
// Assigns every script-bearing skill a mobile execution verdict, derived from
// what its scripts actually invoke — recomputed from the tree every run
// (never hand-typed), so a --check comparison fails on drift instead of
// quietly describing a repo that no longer exists.
//
// VERDICTS
//   E0  build/dev tooling a phone never invokes, or a nested duplicate → already portable
//   E1  portable as a Wasm component; needs_capabilities says whether it
//       requires kv-store/clock grants or is a pure function of its input
//   E2  needs a native binary or daemon on the device
//   R   needs the network or a host service → remote execution covers it
//
// E2/R assert "cannot be ported" and therefore require positive evidence (a
// named binary, a network call) — never a default.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const NATIVE = /\b(cargo|rustc|docker|kubectl|launchctl|systemctl|xcodebuild|gradle|npm|pnpm|node|go|make|cmake|brew|apt-get)\b/;
const NETWORK = /\b(curl|wget|gh |git clone|git push|git fetch|ssh|scp|nc |http:\/\/|https:\/\/)/;
const FSCLOCK = /\b(mkdir|rmdir|touch|date\s|stat\s|find\s|ls\s)|\brm\s|\bcp\s|\bmv\s|>\s*"?\$/;
const DEVTOOL = /(validate|lint|format|install|build|release|publish|generate|sync|register|check|test|smoke|doctor|update)/i;
const NESTED = /[\\/]\.[A-Za-z0-9_-]+[\\/]skills[\\/]|[\\/]skills[\\/].+[\\/]skills[\\/]/;

function findSkillDirs(root) {
  const skillsRoot = path.join(root, 'skills');
  const found = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const hasSkillMd = entries.some((e) => e.isFile() && e.name === 'SKILL.md');
    if (hasSkillMd) found.push(dir);
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (['node_modules', 'tests', 'fixtures'].includes(e.name)) continue;
      walk(path.join(dir, e.name));
    }
  }
  walk(skillsRoot);
  return found.sort();
}

function listScriptFiles(skillDir) {
  const scriptsDir = path.join(skillDir, 'scripts');
  let entries;
  try {
    entries = readdirSync(scriptsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((e) => e.isFile()).map((e) => path.join(scriptsDir, e.name));
}

/**
 * @param {string} skillDir absolute path to a skill directory (containing SKILL.md)
 * @param {string} root repo root the skill lives under (for nested-duplicate detection)
 * @returns {{ skill: string, scripts: number, verdict: string, rationale: string, nested_duplicate: boolean, needs_capabilities: boolean }}
 */
export function classifySkill(skillDir, root) {
  const scripts = listScriptFiles(skillDir);
  const relPath = path.relative(root, skillDir).split(path.sep).join('/');
  let blob = '';
  for (const s of scripts) {
    try {
      blob += readFileSync(s, 'utf8');
    } catch {
      // unreadable file: treated as contributing nothing to the blob, matching the source's best-effort read
    }
  }
  const names = scripts.map((s) => path.basename(s)).join(' ');

  const nested = NESTED.test('/' + relPath + '/');
  const hasNative = NATIVE.test(blob);
  const hasNet = NETWORK.test(blob);
  const devtool = DEVTOOL.test(names);

  let verdict, rationale;
  if (nested) {
    verdict = 'E0';
    rationale = 'nested duplicate of an already-classified skill; not independent porting work';
  } else if (devtool && !hasNet) {
    verdict = 'E0';
    rationale = 'scripts are build/validation tooling for the pack itself; a phone never invokes them';
  } else if (hasNet) {
    verdict = 'R';
    rationale = 'scripts make network or host-service calls; remote execution covers this';
  } else if (hasNative) {
    verdict = 'E2';
    rationale = 'scripts shell out to a native toolchain or daemon that must exist on the device';
  } else if (FSCLOCK.test(blob)) {
    verdict = 'E1';
    rationale = 'transformation plus filesystem/clock access; portable as a Wasm component ONLY with the kv-store and clock capabilities granted';
  } else {
    verdict = 'E1';
    rationale = 'pure text/JSON transformation; portable as a Wasm component with no capabilities';
  }

  return {
    skill: relPath,
    scripts: scripts.length,
    verdict,
    rationale,
    nested_duplicate: nested,
    needs_capabilities: verdict === 'E1' && FSCLOCK.test(blob),
  };
}

/**
 * Walk `<root>/skills` for every SKILL.md, classify the script-bearing ones,
 * and return the full report document (mirrors the shape the source writes
 * to disk as JSON).
 */
export function classifyTree(root) {
  const dirs = findSkillDirs(root);
  const bearing = dirs.filter((d) => {
    try {
      return statSync(path.join(d, 'scripts')).isDirectory();
    } catch {
      return false;
    }
  });

  const rows = bearing.map((d) => classifySkill(d, root));
  const counts = {};
  for (const r of rows) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;

  return {
    generated_by: 'lib/review/mobile-classify.mjs',
    derived: true,
    total_skills: dirs.length,
    script_bearing: bearing.length,
    manifest_only: dirs.length - bearing.length,
    counts,
    verdict_meanings: {
      E0: 'build/dev tooling or nested duplicate — already portable, no work',
      E1: 'portable as a Wasm component; see rationale for whether capabilities are required',
      E2: 'needs a native binary or daemon on the device',
      R: 'needs network or a host service — remote execution covers it',
    },
    skills: rows,
  };
}

/**
 * Compare a freshly computed report against a previously written one.
 * Mirrors the source's --check: fails on script_bearing drift or any
 * added/removed/changed verdict.
 */
export function checkDrift(previous, current) {
  if (!previous || typeof previous !== 'object') {
    return { ok: false, reason: 'missing-or-unreadable' };
  }
  if (previous.script_bearing !== current.script_bearing) {
    return { ok: false, reason: 'script_bearing-drifted', previous: previous.script_bearing, current: current.script_bearing };
  }
  const prevMap = new Map((previous.skills ?? []).map((r) => [r.skill, r.verdict]));
  const nowMap = new Map(current.skills.map((r) => [r.skill, r.verdict]));
  const added = [...nowMap.keys()].filter((k) => !prevMap.has(k)).sort();
  const removed = [...prevMap.keys()].filter((k) => !nowMap.has(k)).sort();
  const changed = [...nowMap.keys()].filter((k) => prevMap.has(k) && prevMap.get(k) !== nowMap.get(k)).sort();
  if (added.length || removed.length || changed.length) {
    return { ok: false, reason: 'classification-drifted', added, removed, changed };
  }
  return { ok: true };
}
