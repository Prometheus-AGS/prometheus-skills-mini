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

/**
 * The active phase id.
 *
 * The canonical runtime puts it at `activePath.phaseId`, with `activePath.phasePath` as
 * the parent→child chain — verified against `prometheus kbd status --json` on a real
 * tree. An earlier version looked only for `phase` / `activePhase`, which that payload
 * does not have, so a WORKING CLI was reported as unavailable: the check swallowed its
 * own parse failure into "not installed". The projection uses `phase`, so both spellings
 * are read here, canonical first.
 */
const phaseOf = (value) => {
  if (!value || typeof value !== 'object') return null;

  const active = value.activePath;
  if (active && typeof active === 'object') {
    if (typeof active.phaseId === 'string') return active.phaseId;
    if (Array.isArray(active.phasePath) && active.phasePath.length > 0) {
      return active.phasePath[active.phasePath.length - 1];
    }
  }

  // The waypoint projection represents a nested phase as `phase` (the PARENT) plus
  // `childPointer` (the active child), so the active phase is the child when there is
  // one. Comparing `phase` against canonical's `phaseId` compares a parent to a child
  // and reports drift on a perfectly consistent tree — which it did on this repo before
  // this branch existed.
  if (typeof value.childPointer === 'string' && value.childPointer !== '') return value.childPointer;

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
      let cliBroken = null;
      const result = spawn('prometheus', ['kbd', '--path', repoRoot, 'status', '--json']);
      if (result?.status === 0) {
        // A CLI that ran but whose output we could not read is NOT an absent CLI.
        // Collapsing the two is what let a working runtime report as unavailable.
        try {
          canonical = phaseOf(JSON.parse(String(result.stdout ?? '')));
          if (canonical === null) cliBroken = 'the CLI returned JSON with no active phase in it';
        } catch (error) {
          cliBroken = `the CLI returned output that is not JSON: ${String(error?.message ?? error)}`;
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
      if (cliBroken !== null) {
        return {
          status: 'fail',
          summary: 'The prometheus CLI ran but its status could not be read',
          detail: `${cliBroken}\n\nCanonical state is authoritative, so nothing that reads position can be trusted until this is fixed.`,
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
