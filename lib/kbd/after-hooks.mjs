import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { hooksFire, miniPackRoot } from './hooks.mjs';
import { runHookCommand } from './hook-command.mjs';
import { isClosed, readDisposition } from './phase-disposition.mjs';
import { phaseDirectory } from './reconcile-artifacts.mjs';
import { readCanonicalStatus } from './contract-adopt.mjs';

export async function fireAfter({ root, phase, kind, view, state, runId, sourceTool }) {
  if (!state) {
    const status = readCanonicalStatus({ root });
    if (status.status !== 0) throw new Error(status.stderr);
    state = status.json;
  }
  const phaseDir = phaseDirectory(root, phase, state);
  if (kind === 'phase' && !view) {
    const current = readDisposition({ root, phase });
    if (current.status !== 0) throw new Error(current.stderr);
    view = current.json;
  }
  if (kind === 'phase' && view.contractBound && !isClosed(view.disposition)) {
    throw new Error('Cannot record completion for an open bound phase: ' + phase);
  }
  let revision = view?.closure?.closureKey ?? runId;
  if (kind === 'reflect') {
    const report = readFileSync(path.join(phaseDir, 'reflection.md'));
    revision = runId + ':' + createHash('sha256').update(report).digest('hex');
  }
  if (!revision) throw new Error('Missing canonical revision for ' + phase);
  const disposition = view?.contractBound ? view.disposition : 'COMPLETE';
  const failed = await hooksFire(kind, 'after', phase, 1, 1, {
    cwd: root, orchestratorRoot: process.env.KBD_ORCHESTRATOR_ROOT ?? miniPackRoot,
    runCommand: runHookCommand, phaseDir, phasePath: phase, sourceTool, revision, disposition,
  });
  if (failed.length) throw new Error('Retry failed ' + kind + ' completion actions: ' + failed.join(', '));
}
