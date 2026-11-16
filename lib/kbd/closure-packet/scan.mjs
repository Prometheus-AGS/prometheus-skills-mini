// Passive pre-authorization artifact scan (VLBV CR-33). Report only: never a guard and never
// verdict-changing. Lists runner output under the contract's boundaryPacket.runnerOutputGlobs
// whose modification time is earlier than the recorded B4 authorization event
// (boundary-authorization.json, written by scripts/kbd-boundary-authorize.mjs).
//
// Globs are project-relative and use `/`; `**` crosses directories, `*` and `?` do not.

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SKIPPED_DIRECTORIES = new Set(['.git', 'node_modules']);

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** A glob as an anchored regular expression over posix relative paths. */
export function globRegex(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
    } else if (ch === '*') out += '[^/]*';
    else if (ch === '?') out += '[^/]';
    else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

/** The literal directory prefix of a glob (the walk root), as a posix relative path. */
function literalBase(glob) {
  const parts = glob.split('/');
  const base = [];
  for (const part of parts) {
    if (/[*?]/.test(part)) break;
    base.push(part);
  }
  return base.join('/');
}

function walkFiles(root, base) {
  const start = path.join(root, ...base.split('/').filter(Boolean));
  if (!existsSync(start)) return [];
  const startStat = lstatSync(start);
  if (startStat.isFile()) return [{ rel: base, mtimeMs: startStat.mtimeMs }];
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIPPED_DIRECTORIES.has(name)) continue;
      const full = path.join(dir, name);
      const stat = lstatSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) found.push({ rel: path.relative(root, full).split(path.sep).join('/'), mtimeMs: stat.mtimeMs });
    }
  };
  if (startStat.isDirectory()) walk(start);
  return found;
}

/**
 * Scan `projectRoot` for runner output older than the B4 authorization recorded in
 * `<phaseDir>/boundary-authorization.json`. Returns
 * { status: 'no-globs' | 'no-authorization' | 'none' | 'found', authorizedAt, globs, scanned, artifacts }.
 */
export function preAuthorizationScan({ contract, phaseDir, projectRoot }) {
  const globs = contract?.boundaryPacket?.runnerOutputGlobs ?? [];
  const authorization = readJson(path.join(phaseDir, 'boundary-authorization.json'));
  const event = (authorization?.events ?? []).find((e) => e?.boundary === 'B4');
  const authorizedAt = event?.authorizedAt ?? null;
  if (globs.length === 0) return { status: 'no-globs', authorizedAt, globs, scanned: 0, artifacts: [] };
  if (!authorizedAt || Number.isNaN(Date.parse(authorizedAt))) {
    return { status: 'no-authorization', authorizedAt: null, globs, scanned: 0, artifacts: [] };
  }
  const authMs = Date.parse(authorizedAt);
  const seen = new Map();
  for (const glob of globs) {
    const regex = globRegex(glob);
    for (const file of walkFiles(projectRoot, literalBase(glob))) {
      if (regex.test(file.rel)) seen.set(file.rel, file.mtimeMs);
    }
  }
  const artifacts = [...seen.entries()]
    .filter(([, mtimeMs]) => mtimeMs < authMs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, mtimeMs]) => ({ path: file, mtime: new Date(mtimeMs).toISOString() }));
  return { status: artifacts.length > 0 ? 'found' : 'none', authorizedAt, globs, scanned: seen.size, artifacts };
}
