// KBD position: the canonical runtime and the on-disk projection must agree.
//
// CLAUDE.md §0.1: `prometheus kbd status` is canonical; `current-waypoint.json` is a
// projection, not a source of truth. So a disagreement between them is a real finding —
// something wrote state out of band — and is the one thing this check exists to catch.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnExecutable } from '../platform/spawn.mjs';

const repoRootDefault = () => fileURLToPath(new URL('../../', import.meta.url));

/** The phase id, wherever this shape happens to carry it. */
const phaseOf = (value) => {
  if (!value || typeof value !== 'object') return null;
  const phase = value.phase ?? value.activePhase ?? null;
  if (typeof phase === 'string') return phase;
  if (phase && typeof phase === 'object') return phase.id ?? phase.name ?? null;
  return null;
};

export const checks = [
  {
    id: 'mini-kbd-state',
    title: 'KBD position',
    offers: [],
    fixes: {},
    async run(ctx = {}) {
      const repoRoot = ctx.repoRoot ?? repoRootDefault();
      const spawn = ctx.spawn ?? spawnExecutable;
      const waypointPath = path.join(repoRoot, '.kbd-orchestrator', 'current-waypoint.json');

      let canonical = null;
      const result = spawn('prometheus', ['kbd', '--path', repoRoot, 'status', '--json']);
      if (result?.status === 0) {
        try {
          canonical = phaseOf(JSON.parse(String(result.stdout ?? '')));
        } catch {
          canonical = null;
        }
      }

      const hasWaypoint = existsSync(waypointPath);
      let projected = null;
      let waypointBroken = false;
      if (hasWaypoint) {
        try {
          projected = phaseOf(JSON.parse(readFileSync(waypointPath, 'utf8')));
        } catch {
          waypointBroken = true;
        }
      }

      if (waypointBroken) {
        return {
          status: 'fail',
          summary: 'The waypoint projection could not be parsed',
          detail: `${waypointPath} is not valid JSON. Nothing that reads position will work until it is.`,
        };
      }
      if (canonical === null && !hasWaypoint) {
        return {
          status: 'skip',
          summary: 'No KBD state here',
          detail: 'Neither the prometheus CLI nor a waypoint projection is present; this may not be a KBD project.',
        };
      }
      if (canonical === null) {
        return {
          status: 'warn',
          summary: `The prometheus CLI is not available; the projection reports ${projected ?? '(no phase)'}`,
          detail: `Canonical state could not be read, so ${waypointPath} is unverified.`,
        };
      }
      if (projected !== null && projected !== canonical) {
        return {
          status: 'fail',
          summary: 'Canonical KBD state and the waypoint projection disagree',
          detail:
            `canonical: ${canonical}\nprojection: ${projected}\n\n` +
            `The runtime is authoritative; something wrote ${waypointPath} out of band.`,
        };
      }
      return { status: 'pass', summary: `Phase ${canonical}` };
    },
  },
];
