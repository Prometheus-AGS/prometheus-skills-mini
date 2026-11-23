// Finalize the accepted reflection against the owning phase and its canonical disposition.
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fireAfter } from '../lib/kbd/after-hooks.mjs';
import { findKbdRoot, readCanonicalStatus } from '../lib/kbd/contract-adopt.mjs';
import { evaluateBottleneck, isBottleneckActive } from '../lib/kbd/bottleneck-guard.mjs';
import { phaseCloseEval } from '../lib/kbd/phase-close-eval.mjs';
import { isClosed, readDisposition, runPhaseCommand } from '../lib/kbd/phase-disposition.mjs';
import { phaseDirectory, safeId } from '../lib/kbd/reconcile-artifacts.mjs';
import { stageGate } from '../lib/kbd/stage-gate.mjs';

async function finalize() {
  const { values } = parseArgs({ options: {
    phase: { type: 'string' }, accepted: { type: 'boolean' },
    superseded: { type: 'string' }, signature: { type: 'string' },
  } });
  const phase = safeId(values.phase, 'phase');
  if (!values.accepted) throw new Error('Finalize only after reflection acceptance; pass --accepted.');
  const root = findKbdRoot(process.cwd());
  if (!root) throw new Error('Missing KBD project');
  const checked = (result) => {
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Canonical operation failed');
    return result.json;
  };
  const status = checked(readCanonicalStatus({ root }));
  const phaseDir = phaseDirectory(root, phase, status);
  const report = readFileSync(path.join(phaseDir, 'reflection.md'), 'utf8');
  if (!report.trim()) throw new Error('Empty reflection');
  const progressPath = path.join(phaseDir, 'progress.json');
  if (existsSync(progressPath) && JSON.parse(readFileSync(progressPath, 'utf8')).reflect_gate === 'rejected') {
    throw new Error('Rejected reflection');
  }
  for (const file of [path.join(phaseDir, 'reflection.md'), path.relative(root, path.join(phaseDir, 'reflection.md'))]) {
    const digest = createHash('sha1').update(file).digest('hex').slice(0, 16);
    if (status.blockers?.['sycophancy:' + digest]?.resolved === false) throw new Error('Unresolved reflection review blocker');
  }
  const view = checked(readDisposition({ root, phase }));
  const context = { root, phase, state: status, runId: status.runId, sourceTool: 'kbd-reflect' };
  if (!view.closure?.operatorExit) checked(stageGate('reflect', { cwd: root, phaseDir }));
  await fireAfter({ ...context, view, kind: 'reflect' });
  const guarded = !isClosed(view.disposition) && isBottleneckActive(root);
  if (guarded) checked(evaluateBottleneck('phase', 'after', phase, true, { root }));
  if (view.contractBound) {
    if (!isClosed(view.disposition) || values.superseded || values.signature) {
      checked(phaseCloseEval(phase, { root, superseded: values.superseded, signature: values.signature }));
    }
  } else {
    checked(runPhaseCommand({ root, args: ['transition', '--id', phase, '--status', 'complete',
      '--command-id', 'phase-complete:' + phase] }));
  }
  if (guarded) checked(evaluateBottleneck('phase', 'after', phase, false, { root }));
  await fireAfter({ ...context, kind: 'phase' });
}
try { await finalize(); } catch (error) {
  process.stderr.write('kbd-reflection-finalize: ' + error.message + '\n');
  process.exitCode = 1;
}
