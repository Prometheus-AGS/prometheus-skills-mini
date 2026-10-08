// Detects a NATIVE full-pack install (prometheus-skill-pack / the full skill system).
//
// openspec/config.yaml, binding: the mini pack is never installed natively on a machine
// that already has the full pack. Inside the-boss's own data directory is fine; anywhere
// under the user's home on such a machine is not, because the two would shadow each
// other's skills. This module is how that rule is enforced mechanically.
//
// Read-only by construction: it decides whether we may write, so it must never write.
// Every effect is injected, so the tests run on a machine in any state.

import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { homeDir } from './paths.mjs';
import { spawnExecutable } from './spawn.mjs';

const SKILL_ROOTS = ['.claude', '.agents'];
const FULL_PACK_SKILL = 'kbd-process-orchestrator';
const UNIT_PREFIX = 'ai.prometheus.';

const isDirectory = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// Both products ship this name. A directory by itself cannot distinguish a
// full install from the mini copy-skills fix's own previous installation.
// Exempt only a plain mini-owned directory whose recorded SKILL.md fingerprint
// still matches. Unknown, edited, linked, malformed or generic application
// receipts remain ambiguous and retain the conflict guard. Other full-pack
// markers (CLI, setup state and service units) are never exempted by a receipt.
const isVerifiedMiniCopy = (directory) => {
  try {
    if (!lstatSync(directory).isDirectory()) return false;
    const marker = path.join(directory, '.prometheus-mini-managed.json');
    const markerStat = lstatSync(marker);
    if (!markerStat.isFile() || markerStat.size > 256 * 1024) return false;
    const receipt = JSON.parse(readFileSync(marker, 'utf8'));
    if (receipt?.owner !== 'prometheus-mini' || !receipt.files ||
        typeof receipt.files !== 'object' || Array.isArray(receipt.files)) return false;
    const expected = receipt.files['SKILL.md'];
    if (typeof expected !== 'string' || !/^[a-f\d]{64}$/i.test(expected)) return false;
    const skillFile = path.join(directory, 'SKILL.md');
    if (!lstatSync(skillFile).isFile()) return false;
    const actual = createHash('sha256').update(readFileSync(skillFile)).digest('hex');
    return actual === expected.toLowerCase();
  } catch {
    return false;
  }
};

/**
 * Which markers of a native full-pack install are present.
 *
 * @param {object} [options]
 * @param {string} [options.home] the home directory to inspect; defaults to the real one
 * @param {Function} [options.spawn] `(file, args) => { status, stdout, stderr }`
 * @param {string} [options.platform] `process.platform`, for the service-unit marker
 * @returns {{ present: boolean, markers: string[] }} every marker found, each naming itself
 */
export function detectFullPack({ home = homeDir(), spawn = spawnExecutable, platform = process.platform } = {}) {
  // An unreadable home is NOT "absent". Returning absent here would report a full-pack
  // machine as clean and let the installer write into it — the rule failing open on
  // exactly the side that does damage.
  if (!isDirectory(home)) {
    throw new Error(`detectFullPack: home ${JSON.stringify(home)} is not a readable directory`);
  }

  const markers = [];

  // The CLI on PATH. `where` on Windows, `command -v` is a shell builtin so it cannot be
  // spawned without a shell — `which` is the portable executable everywhere else.
  const probe = platform === 'win32' ? 'where' : 'which';
  const onPath = spawn(probe, ['prometheus']);
  if (onPath?.status === 0 && String(onPath.stdout ?? '').trim() !== '') {
    markers.push(`the prometheus CLI is on PATH (${String(onPath.stdout).trim().split(/\r?\n/)[0]})`);
  }

  const setupState = path.join(home, '.prometheus', 'setup-state.json');
  if (existsSync(setupState)) {
    markers.push(`the full pack's setup-state.json exists (${setupState})`);
  }

  for (const root of SKILL_ROOTS) {
    const skill = path.join(home, root, 'skills', FULL_PACK_SKILL);
    if (isDirectory(skill) && !isVerifiedMiniCopy(skill)) {
      markers.push(`a native ${FULL_PACK_SKILL} directory has no verified mini ownership receipt (${skill})`);
    }
  }

  // Service units. The full pack installs LaunchAgents on macOS and systemd user units on
  // Linux, both named `ai.prometheus.*` (verified on a full-pack machine: nine of them in
  // ~/Library/LaunchAgents). Windows has no equivalent the pack installs, so there is
  // nothing to look for there. A missing directory is simply no marker — unlike `home`,
  // its absence is the ordinary case on a clean machine, not a failure to look.
  const unitDir =
    platform === 'darwin'
      ? path.join(home, 'Library', 'LaunchAgents')
      : platform === 'win32'
        ? null
        : path.join(home, '.config', 'systemd', 'user');

  if (unitDir !== null && isDirectory(unitDir)) {
    let units = [];
    try {
      units = readdirSync(unitDir).filter((name) => name.startsWith(UNIT_PREFIX));
    } catch {
      units = [];
    }
    if (units.length > 0) {
      const shown = units.slice(0, 3).join(', ');
      const rest = units.length > 3 ? `, and ${units.length - 3} more` : '';
      markers.push(`the full pack's service units are installed in ${unitDir} (${shown}${rest})`);
    }
  }

  return { present: markers.length > 0, markers };
}
