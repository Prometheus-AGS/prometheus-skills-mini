// Immutable boundary authorization event for a KBD value phase (VLBV CR-33). Port of the full
// pack's shared/scripts/kbd-boundary-authorize.mjs (1.15.x, #225).
//
// The owner authorizes B4 (or a B5 repair) once the agreed implementation is complete. This
// appends an event to .kbd-orchestrator/phases/<id>/boundary-authorization.json BEFORE the first
// attempt, so closure can tell runner output produced before authorization (passive evidence of
// early execution; report only, no guard) from output of the authorized boundary run.
// Boundaries: skills/kbd-process-orchestrator/references/boundaries.md.
//
// Ordering invariant: contract adopted (phase bound) < implementation complete
// < B4 authorized <= first attempt. A B4 event is refused once boundary-results.json exists; a B5
// event needs a prior B4 event and an existing boundary-results.json.
//
// Statuses: 0 recorded or ALREADY-AUTHORIZED; 1 usage/io; 2 phase not bound; 3 ordering violated.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { findKbdRoot } from './contract-adopt.mjs';
import { readDisposition } from './phase-disposition.mjs';

const PHASE_ID = /^[a-z0-9][a-z0-9._-]*$/;
const BOUNDARIES = ['B4', 'B5'];
const KIND = 'kbd.boundary-authorization';

const fail = (status, message) => ({ status, stdout: '', stderr: `kbd-boundary-authorize: ${message}\n` });

function readRecord(file, phase) {
  if (!existsSync(file)) return { record: { schemaVersion: 1, kind: KIND, phaseId: phase, events: [] } };
  try {
    const record = JSON.parse(readFileSync(file, 'utf8'));
    if (record?.kind !== KIND || record.phaseId !== phase || !Array.isArray(record.events)) {
      return { error: `${file} is not a boundary authorization record for ${phase}` };
    }
    return { record };
  } catch {
    return { error: `${file} is not valid JSON` };
  }
}

/**
 * Record one authorization. `options`: { phase, authorizer, boundary = 'B4', reason, project,
 * dispositionFile, spawn, now }. Never throws — returns { status, stdout, stderr }.
 */
export function authorizeBoundary({ phase, authorizer, boundary = 'B4', reason = '', project, dispositionFile, spawn, now = new Date() } = {}) {
  if (!phase || !PHASE_ID.test(phase)) return fail(1, '--phase <id> is required (kebab-case)');
  if (!authorizer) return fail(1, '--authorizer <who> is required');
  if (!BOUNDARIES.includes(boundary)) return fail(1, '--boundary must be B4 or B5');
  const start = path.resolve(project ?? process.cwd());
  const root = findKbdRoot(start);
  if (!root) return fail(1, 'no .kbd-orchestrator above the working directory');
  const phaseDir = path.join(root, '.kbd-orchestrator', 'phases', phase);
  if (!existsSync(phaseDir)) return fail(1, `phase directory ${phaseDir} does not exist`);

  const disposition = readDisposition({ root, phase, dispositionFile, spawn });
  const digest = disposition.status === 0 ? disposition.json.binding?.contractDigest ?? null : null;
  if (!digest) {
    return fail(2, `phase ${phase} has no bound contract (adopt it with kbd-contract-adopt.mjs before authorizing a boundary)`);
  }

  const file = path.join(phaseDir, 'boundary-authorization.json');
  const { record, error } = readRecord(file, phase);
  if (error) return fail(1, error);
  const resultsExist = existsSync(path.join(phaseDir, 'boundary-results.json'));
  const priorB4 = record.events.find((e) => e?.boundary === 'B4');

  if (boundary === 'B4') {
    if (priorB4) {
      return {
        status: 0,
        stdout: `ALREADY-AUTHORIZED phase=${phase} boundary=B4 at=${priorB4.authorizedAt} contract=${priorB4.contractDigest}\n`,
        stderr: '',
      };
    }
    if (resultsExist) return fail(3, `boundary-results.json already exists for ${phase}; B4 must be authorized before the first attempt`);
  } else {
    if (!priorB4) return fail(3, 'B5 needs a prior B4 authorization');
    if (!resultsExist) return fail(3, 'B5 repairs a recorded boundary attempt; boundary-results.json is missing');
  }

  // Millisecond precision: the closure scan compares runner-output mtimes against this instant.
  const event = { boundary, authorizedAt: now.toISOString(), authorizer, contractDigest: digest, ...(reason ? { reason } : {}) };
  atomicWrite(file, `${JSON.stringify({ ...record, events: [...record.events, event] }, null, 2)}\n`);
  return { status: 0, stdout: `AUTHORIZED phase=${phase} boundary=${boundary} at=${event.authorizedAt} contract=${digest}\n`, stderr: '' };
}
