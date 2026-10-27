// kbd-handoff: build a lease-free, read-only harness handoff packet for the active KBD phase.
//
// Returns { exitCode, out, err } so the entry point only prints and exits. The only files this
// writes are the packet and its sidecar under the phase's harness-handoffs/ directory, and
// nothing at all under --dry-run. Exit codes: 0 written (or dry run), 1 refused, 2 usage.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../../platform/atomic-write.mjs';
import { homeDir } from '../../platform/paths.mjs';
import { implementationCompleted, implementationTotal } from '../progress.mjs';
import { kbdNodeChain } from '../waypoint.mjs';
import { SUPPORTED_HARNESSES, resolveHarness } from './harnesses.mjs';
import { classifyObligations, readPhaseFiles, readPosition, selectPhasePath } from './state.mjs';
import { nativeRoleCheck, repoState, repoWarnings, skillCheck } from './checks.mjs';
import { gateSections, neverDoFromAgents } from './extract.mjs';
import { phaseMethodReferences } from '../method-context/index.mjs';
import { obligationRemediation, renderPacket, renderSidecar, startPrompt } from './packet.mjs';

export const USAGE = 'usage: kbd-handoff --to <harness> [--phase <name>] [--dry-run]';

/** Parse argv into options; a usage error is returned, not thrown. */
export function parseArgs(argv) {
  const options = { to: null, phase: null, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--to' || arg === '--phase') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) return { error: `${arg} needs a value` };
      options[arg === '--to' ? 'to' : 'phase'] = value;
      index += 1;
    } else return { error: `unknown argument: ${arg}` };
  }
  if (!options.to) return { error: '--to <harness> is required' };
  return { options };
}

const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const rel = (root, file) => path.relative(root, file).split(path.sep).join('/');

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function filesToRead(root, phaseDir, phaseFiles, nextChange, methodReferences) {
  const candidates = [
    existsSync(path.join(root, 'AGENTS.md')) ? path.join(root, 'AGENTS.md') : path.join(root, 'CLAUDE.md'),
    path.join(root, '.prometheus', 'gotchas.md'),
    path.join(root, '.kbd-orchestrator', 'position-reminder.txt'),
    path.join(root, '.kbd-orchestrator', 'current-waypoint.json'),
    ...methodReferences.filter((item) => item.observation === 'observed').map((item) => path.join(root, item.path)),
    path.join(phaseDir, 'progress.json'),
    phaseFiles.plan,
    phaseFiles.execution,
    phaseFiles.assessment,
    phaseFiles.goals,
    nextChange ? path.join(root, 'openspec', 'changes', nextChange) : null,
  ];
  return candidates.filter((file) => file && existsSync(file)).map((file) => rel(root, file));
}

function refuse(out, message, extra = []) {
  return { exitCode: 1, out, err: [`kbd-handoff: refused: ${message}`, ...extra] };
}

/** Run one handoff. `now` and `home` are injectable so a run is reproducible. */
export function runHandoff(argv, { root = process.cwd(), env = process.env, home = homeDir(), now = new Date() } = {}) {
  const parsed = parseArgs(argv);
  if (parsed.error) return { exitCode: 2, out: [], err: [`kbd-handoff: ${parsed.error}`, USAGE] };
  const { options } = parsed;
  const harness = resolveHarness(options.to);
  if (!harness) {
    return { exitCode: 2, out: [], err: [`kbd-handoff: unknown harness '${options.to}'; supported: ${SUPPORTED_HARNESSES.join(', ')} (aliases: claude, kimi)`] };
  }

  const projectRoot = path.resolve(root);
  const position = readPosition({ root: projectRoot, env });
  const selected = selectPhasePath(projectRoot, position, options.phase);
  const phaseLabel = options.phase ?? position.phasePath.at(-1) ?? '(none)';
  const out = [`Starting kbd-handoff — ${phaseLabel} to ${harness.id}`];
  if (!selected) {
    return refuse(out, `phase '${phaseLabel}' not found under .kbd-orchestrator/phases`, [
      '  remediation: start or select a phase (/kbd-new-phase, /kbd-status) or pass --phase <name>.',
    ]);
  }

  const { blocking, carried } = classifyObligations(position);
  if (blocking.length) {
    return refuse(out, `${blocking.length} open boundary obligation(s); repair them before handing off:`, obligationRemediation(blocking));
  }

  const warnings = [];
  if (!Array.isArray(position.obligations)) {
    warnings.push(`Boundary obligations not checked: ${position.statusError ?? 'runtime unavailable'}; run \`prometheus kbd status --json\` before resuming.`);
  }
  for (const entry of carried) {
    warnings.push(`Open ${entry.boundary} ${entry.subject} (${entry.status}) is started and not finished outside the active position${entry.signal ? ` (${entry.signal})` : ''}; carried work, not an interrupted close.`);
  }
  const repo = repoState(projectRoot);
  warnings.push(...repoWarnings(repo));

  const phaseFiles = readPhaseFiles(selected.dir);
  const methodReferences = phaseMethodReferences(projectRoot, selected.dir);
  const phaseChain = kbdNodeChain(selected.phasePath, env);
  const packetDir = path.join(selected.dir, 'harness-handoffs');
  const stamp = utcStamp(now);
  const packetFile = path.join(packetDir, `${harness.id}-${stamp}.md`);
  const packetRel = rel(projectRoot, packetFile);
  const planText = phaseFiles.plan ? readText(phaseFiles.plan) : null;
  const facts = {
    harness,
    phasePath: selected.phasePath,
    phaseChain,
    position,
    implementation: { completed: implementationCompleted(phaseFiles.progress), total: implementationTotal(phaseFiles.progress) },
    repo,
    warnings,
    nativeRoles: nativeRoleCheck(projectRoot, harness),
    skills: skillCheck(harness, { home, root: projectRoot }),
    neverDo: neverDoFromAgents(readText(path.join(projectRoot, 'AGENTS.md'))),
    gates: gateSections(planText),
    planRel: phaseFiles.plan ? rel(projectRoot, phaseFiles.plan) : null,
    methodContext: methodReferences,
    filesToRead: filesToRead(projectRoot, selected.dir, phaseFiles, position.nextChange, methodReferences),
    timestamp: now.toISOString(),
    packetRel,
  };
  facts.prompt = startPrompt({ harness, phaseChain, repoRoot: repo.isRepo ? repo.root : projectRoot, packetRel });
  const markdown = renderPacket(facts);
  const sidecar = renderSidecar(facts);
  const err = sidecar.prerequisites.map((item) => `kbd-handoff: warn: ${item}`);

  if (options.dryRun) {
    out.push(`Dry run: nothing written; packet would be ${packetRel}`, '', markdown);
  } else {
    atomicWrite(packetFile, markdown);
    atomicWrite(packetFile.replace(/\.md$/, '.json'), `${JSON.stringify(sidecar, null, 2)}\n`);
    out.push('', 'Start prompt:', '', facts.prompt, '');
  }
  out.push(`Completed kbd-handoff — ${phaseChain} packet ${options.dryRun ? '(dry run) ' : ''}${packetRel}`);
  return { exitCode: 0, out, err };
}
