// Pure rendering of the handoff packet (Markdown) and its JSON sidecar from facts gathered by
// the caller. Modelled on a hand-written harness handoff: position, repository state, files to
// read in order, operator gates, task rules, never-do list, open prerequisites, start prompt.

import { repairCommand } from './state.mjs';

export const PACKET_SCHEMA = 'prometheus-kbd-harness-handoff-v1';

const code = (value) => `\`${value}\``;
const bullets = (items, empty) => (items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${empty}`);

/** The prompt the operator pastes into the receiving harness. */
export function startPrompt({ harness, phaseChain, repoRoot, packetRel }) {
  return [
    `You are ${harness.label} taking over KBD phase ${phaseChain} in ${repoRoot}.`,
    `Read ${packetRel} first, then every file it lists under "Read in order", in that order.`,
    'Before changing anything, restate the phase, stage, implementation N/T, next change and task, and every open prerequisite from the packet.',
    'Before dependent work, re-resolve the selected method, adopted contract revision and stage authority from current canonical KBD status (method-context.md is a derived index, not authority); a missing or changed reference is an explicit prerequisite. For a selected VLBV phase, no generated-code tests, builds, lint or typecheck run until the complete agreed value phase is done; a task, hour, commit, reviewer request or compiler problem is not that boundary.',
    'Confirm position with the kbd-status skill, then drive the next task with the kbd-apply skill: begin-task, the work, end-task.',
    'Obey the packet\'s "Never do" list. Stop at every operator gate and ask the operator once, in one batch. Do not push, tag, publish or merge.',
  ].join('\n');
}

function positionSection(facts) {
  const { position, implementation, phaseChain } = facts;
  const next = position.nextChange
    ? `${code(position.nextChange)}${position.nextTask ? ` task ${position.nextTask}` : ''}`
    : 'none recorded';
  return [
    '## Position',
    '',
    `- Phase: ${code(phaseChain)}`,
    `- Stage: ${position.stage ?? 'unknown'}${position.lifecycle ? ` (lifecycle ${position.lifecycle})` : ''}`,
    `- Implementation: ${implementation.completed} of ${implementation.total} (\`completion.implementation\` in the phase \`progress.json\`)`,
    `- Next: ${next}`,
    `- Source: ${position.source === 'cli' ? '`prometheus kbd status --json`' : `projection files (${position.statusError ?? 'runtime unavailable'})`}`,
  ].join('\n');
}

function methodSection(facts) {
  const lines = facts.methodContext.map((item) => `- ${code(item.path)}: ${item.observation}${item.sha256 ? ` (sha256 ${item.sha256.slice(0, 12)})` : ''}`);
  return [
    '## Method and contract references',
    '',
    ...lines,
    '- These are identities, not authority. Re-resolve the latest non-superseded selected method, the adopted contract revision, stage authority, evidence/candidate freshness, consumed budgets and unresolved effects from current canonical state before dependent work; reconcile uncertain effects before any retry.',
    '- Refresh the derived index with `node <pack-root>/scripts/kbd-method-context.mjs --phase <canonical-phase-id> --write`. A missing or stale index is an explicit prerequisite, never guessed from memory or `exactNextCommand`.',
  ].join('\n');
}

function repoSection(repo) {
  if (!repo.isRepo) return `## Repositories\n\n- ${code(repo.root)}: not a git repository; clean/pushed state unknown.`;
  const pushed = !repo.upstream ? 'no upstream (not pushed)' : repo.ahead ? `${repo.ahead} commit(s) ahead of ${code(repo.upstream)} (not pushed)` : `pushed to ${code(repo.upstream)}`;
  return [
    '## Repositories',
    '',
    `- ${code(repo.root)}: branch ${code(repo.branch)} at ${code(repo.commit)}, ${repo.dirty.length ? `${repo.dirty.length} uncommitted change(s)` : 'clean'}, ${pushed}.`,
  ].join('\n');
}

function gatesSection(gates, planRel) {
  if (!planRel) return '## Operator gates and decisions\n\n- No `plan.md` for this phase.';
  if (!gates.length) return `## Operator gates and decisions\n\n- ${code(planRel)} lists no gate or decision section.`;
  const parts = ['## Operator gates and decisions', '', `From ${code(planRel)}; the plan is authoritative.`];
  for (const section of gates) {
    parts.push('', `### ${section.heading}`, '', ...section.lines);
    if (section.truncated) parts.push('', `(truncated; read the full section in ${code(planRel)})`);
  }
  return parts.join('\n');
}

function rulesSection(facts) {
  return [
    '## Task execution rules',
    '',
    `- Drive every task through \`kbd-apply\`: \`node <pack-root>/scripts/kbd-apply.mjs begin-task <change> <id> <i> <n> "<title>"\`, then the work, then \`end-task\` with the same arguments. A ticked checkbox alone does not move the runtime.`,
    '- Select work from derived state (`nextChange` / `nextTask`, then `progress.json`), never from `exactNextCommand`.',
    '- Run every `kbd-apply` and `prometheus kbd` call with a timeout and stdin closed.',
    '- After an interrupted close, read `boundaryObligations` from `prometheus kbd status --json` and repair with `prometheus kbd guard evaluate --boundary <change|task> --edge after --subject <change|change/id> --json --repair-projections`.',
    '- Never edit `progress.json`, `current-waypoint.json` or other projections by hand.',
    '- Finish the complete delivery before its integration gate; reviewers run afterwards in a separate context.',
    `- Native role definitions for ${facts.harness.label} live in ${code(facts.harness.agentsDir)}.`,
  ].join('\n');
}

function prerequisiteItems(facts) {
  const items = [...facts.warnings];
  const { nativeRoles, skills } = facts;
  if (nativeRoles.hasTeam && nativeRoles.missing.length) {
    items.push(`Missing ${facts.harness.label} role definitions in ${code(nativeRoles.agentsDir)}: ${nativeRoles.missing.map(code).join(', ')} (team ${code(nativeRoles.manifest)}).`);
  }
  for (const entry of skills.broken) items.push(`Broken skill install: ${code(entry.path)} (${entry.detail}).`);
  if (skills.missingRequired.length) {
    items.push(`Skills not resolvable for ${facts.harness.label}: ${skills.missingRequired.map(code).join(', ')} (checked ${skills.checkedRoots.map(code).join(', ')}). Installing skills changes the operator's machine and needs approval.`);
  }
  return items;
}

/** The complete Markdown packet. */
export function renderPacket(facts) {
  const harnessLine = facts.nativeRoles.hasTeam
    ? `Team ${code(facts.nativeRoles.manifest)}: ${facts.nativeRoles.roles.length - facts.nativeRoles.missing.length} of ${facts.nativeRoles.roles.length} roles defined in ${code(facts.nativeRoles.agentsDir)}.`
    : 'No agent team in this project; native role definitions not required.';
  return [
    `# Handoff to ${facts.harness.label}: ${facts.phaseChain}`,
    '',
    `Written ${facts.timestamp} by \`kbd-handoff\` (prometheus-skills-mini). Read this file first, then the files under "Read in order". This packet records position and rules; it does not override \`AGENTS.md\`, the plan, or canonical KBD state.`,
    '',
    positionSection(facts),
    '',
    repoSection(facts.repo),
    '',
    methodSection(facts),
    '',
    '## Read in order',
    '',
    facts.filesToRead.map((file, index) => `${index + 1}. ${code(file)}`).join('\n'),
    '',
    gatesSection(facts.gates, facts.planRel),
    '',
    rulesSection(facts),
    '',
    '## Never do',
    '',
    facts.neverDo.length ? `Summarized from ${code('AGENTS.md')}; it is authoritative.\n\n${bullets(facts.neverDo, '')}` : '- No `AGENTS.md` prohibitions found. Push, tag, publish and merge remain operator actions.',
    '',
    '## Target harness',
    '',
    `- ${harnessLine}`,
    `- Installed \`kbd-*\` skills resolved: ${facts.skills.resolved.length ? facts.skills.resolved.map(code).join(', ') : 'none'}.`,
    '',
    '## Open prerequisites',
    '',
    bullets(prerequisiteItems(facts), 'None found.'),
    '',
    '## Start prompt',
    '',
    '```text',
    facts.prompt,
    '```',
    '',
  ].join('\n');
}

/** The machine-readable sidecar written next to the packet. */
export function renderSidecar(facts) {
  return {
    schema: PACKET_SCHEMA,
    generatedAt: facts.timestamp,
    generatedBy: 'kbd-handoff (prometheus-skills-mini)',
    harness: facts.harness.id,
    phasePath: facts.phasePath,
    packet: facts.packetRel,
    position: {
      source: facts.position.source,
      stage: facts.position.stage,
      lifecycle: facts.position.lifecycle,
      implementation: facts.implementation,
      nextChange: facts.position.nextChange,
      nextTask: facts.position.nextTask,
      obligationsChecked: Array.isArray(facts.position.obligations),
    },
    repo: facts.repo,
    filesToRead: facts.filesToRead,
    methodContext: { references: facts.methodContext, authority: 'identity only; re-resolve canonical status before dependent work' },
    nativeRoles: facts.nativeRoles,
    skills: { ...facts.skills, broken: facts.skills.broken.map(({ path: entryPath, detail }) => ({ path: entryPath, detail })) },
    prerequisites: prerequisiteItems(facts),
    startPrompt: facts.prompt,
  };
}

/** Console remediation lines for a refusal on open obligations. */
export function obligationRemediation(blocking) {
  return blocking.map((entry) => {
    const why = entry.boundary === 'task' ? 'task begun and not ended; finish it with kbd-apply end-task, or' : `${entry.status ?? 'unknown to the runtime'}; close edge missing:`;
    return `  ${entry.key}${entry.signal ? ` (${entry.signal})` : ''}: ${why}\n    repair: ${repairCommand(entry)}`;
  });
}
