// The one reader of a phase's canonical closure state (mini #66, full pack #192).
//
// The interpretation lives in the shared runtime: `prometheus kbd phase disposition --json`.
// This module only fetches it and matches whole tokens — never substrings of decision text —
// so a recorded string can neither fake nor hide a closure.

import { readFileSync } from 'node:fs';
import { spawnExecutable } from '../platform/spawn.mjs';

export const DISPOSITION_SCHEMA = 'kbd.phase-disposition/v1';
export const DISPOSITION_TOKENS = Object.freeze(['UNBOUND', 'OPEN', 'CLOSED', 'REFUSED_BLOCKED', 'REFUSED_FAIL']);

/**
 * Canonical disposition of `phase`. `dispositionFile` substitutes a fixture JSON (disclosed
 * test seam). Returns { status: 0, json } or { status: 1, stderr } — callers under canonical
 * runtime authority must treat status 1 as BLOCKED, never as "not closed".
 */
export function readDisposition({ root, phase, dispositionFile, spawn = spawnExecutable } = {}) {
  let raw;
  if (dispositionFile) {
    try {
      raw = readFileSync(dispositionFile, 'utf8');
    } catch (error) {
      return { status: 1, stderr: `canonical phase disposition fixture unreadable: ${error.message}` };
    }
  } else {
    const result = spawn('prometheus', ['kbd', '--path', root, 'phase', 'disposition', '--id', phase, '--json']);
    if (result?.status !== 0 || result?.error) {
      return {
        status: 1,
        stderr: `canonical phase disposition for ${phase} is unreadable (phase missing, or prometheus predates typed phase closure)`,
      };
    }
    raw = result.stdout;
  }
  try {
    const json = JSON.parse(raw);
    if (json?.schema !== DISPOSITION_SCHEMA || !DISPOSITION_TOKENS.includes(json?.disposition)) {
      return { status: 1, stderr: `canonical phase disposition for ${phase} has an unknown shape` };
    }
    return { status: 0, json };
  } catch {
    return { status: 1, stderr: `canonical phase disposition for ${phase} is not JSON` };
  }
}

/** Run one typed `prometheus kbd phase …` command; returns { status, stdout, stderr }. */
export function runPhaseCommand({ root, args, spawn = spawnExecutable }) {
  const result = spawn('prometheus', ['kbd', '--path', root, 'phase', ...args]);
  return {
    status: result?.error ? 127 : (result?.status ?? 1),
    stdout: result?.stdout ?? '',
    stderr: `${result?.stderr ?? ''}${result?.error?.message ?? ''}`,
  };
}
