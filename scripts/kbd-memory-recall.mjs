// Port of kbd-memory-recall.sh (prometheus-skill-pack, 167 lines).
//
// Entry point only: resolves the target phase, probes surreal-memory via
// lib/kbd/memory.mjs's createMemoryProbe, queries GET /api/v1/entities/search, ranks locally
// (same-project affinity, query-token overlap, recency, name, observation index), and writes
// phases/<phase>/prior-context.md. Always exits 0 — a recall failure never blocks the phase that
// depends on it, matching the source's explicit "the skill always exits 0" contract.
//
// Judgment call: the source's local ranking is a `jq` pipeline (tokenizing entity/observation
// text, scoring, sorting). Ported as plain JS functions below — no new dependency, same scoring
// fields and tie-break order.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../lib/platform/atomic-write.mjs';
import { createMemoryProbe } from '../lib/kbd/memory.mjs';

function tokens(text) {
  const lower = String(text ?? '').toLowerCase();
  const matches = lower.match(/[a-z0-9_][a-z0-9_-]*/g) ?? [];
  return [...new Set(matches.filter((t) => t.length > 1))];
}

function recencyKey(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 14);
  return Number(digits) || 0;
}

function decodeObservation(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { text: raw };
    }
  }
  if (raw && typeof raw === 'object') return raw;
  return { text: String(raw) };
}

function rankEntities(searchResponse, project, queryText) {
  if (!Array.isArray(searchResponse)) throw new Error('entity search response is not an array');
  const queryTokens = tokens(queryText);

  const candidates = [];
  for (const entity of searchResponse) {
    if ((entity.entity_type ?? '') !== 'kbd_lifecycle_event') continue;
    const observations = entity.observations ?? [];
    observations.forEach((raw, index) => {
      const event = decodeObservation(raw);
      const candidateText = [entity.name ?? '', entity.entity_type ?? '', JSON.stringify(event)].join(' ');
      const candidateTokens = tokens(candidateText);
      const overlap = candidateTokens.filter((t) => queryTokens.includes(t)).length;
      const ts = event.ts ?? entity.updated_at ?? entity.created_at ?? '?';
      candidates.push({
        entityName: entity.name ?? '?',
        observationIndex: index,
        project: event.project ?? '?',
        phase: event.phase ?? event.name ?? '?',
        kind: event.kind ?? '?',
        ts,
        sameProject: event.project === project ? 1 : 0,
        tokenOverlap: overlap,
        recency: recencyKey(event.ts ?? entity.updated_at ?? entity.created_at ?? ''),
      });
    });
  }

  candidates.sort((a, b) => {
    if (b.sameProject !== a.sameProject) return b.sameProject - a.sameProject;
    if (b.tokenOverlap !== a.tokenOverlap) return b.tokenOverlap - a.tokenOverlap;
    if (b.recency !== a.recency) return b.recency - a.recency;
    if (a.entityName !== b.entityName) return a.entityName < b.entityName ? -1 : 1;
    return a.observationIndex - b.observationIndex;
  });

  return candidates.slice(0, 5);
}

function renderDigest(phase, ranked) {
  const lines = [
    `# Prior context — ${phase}`,
    '',
    '> Auto-populated by /kbd-memory-recall. Replace or extend if needed.',
    '',
    '## Most relevant prior phases (top 5)',
    '',
  ];
  if (ranked.length > 0) {
    ranked.forEach((r, i) => {
      lines.push(`${i + 1}. **${r.project}/${r.phase}** — ${r.kind} @ ${r.ts}`);
    });
  } else {
    lines.push('*(no prior matches found)*');
  }
  lines.push('', '## Patterns observed', '');
  if (ranked.length > 0) {
    const counts = new Map();
    for (const r of ranked) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [kind, count] of sorted) lines.push(`- ${count}× ${kind} events recalled`);
  } else {
    lines.push('*(none — first phase of its kind, or memory empty)*');
  }
  return `${lines.join('\n')}\n`;
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function resolvePhase(argPhase) {
  if (argPhase) return argPhase;
  const wp = path.join('.kbd-orchestrator', 'current-waypoint.json');
  if (!existsSync(wp)) return '';
  return readJsonSafe(wp)?.phase ?? '';
}

function resolveProject() {
  const projectFile = path.join('.kbd-orchestrator', 'project.json');
  if (existsSync(projectFile)) {
    const parsed = readJsonSafe(projectFile);
    if (parsed?.project) return parsed.project;
    if (parsed?.projectId) return parsed.projectId;
  }
  const wp = path.join('.kbd-orchestrator', 'current-waypoint.json');
  if (existsSync(wp)) {
    const parsed = readJsonSafe(wp);
    if (parsed?.project) return parsed.project;
    if (parsed?.projectId) return parsed.projectId;
  }
  return 'unknown';
}

async function main(argv) {
  const phase = resolvePhase(argv[0] ?? '');
  if (!phase) {
    process.stderr.write('kbd-memory-recall: no phase resolved (arg empty + no waypoint)\n');
    process.exitCode = 0;
    return;
  }

  const phaseDir = path.join('.kbd-orchestrator', 'phases', phase);
  mkdirSync(phaseDir, { recursive: true });
  const digest = path.join(phaseDir, 'prior-context.md');

  const writeStub = (line) => atomicWrite(digest, `${line}\n`);

  const probe = createMemoryProbe({ root: '.', env: process.env, fetchImpl: fetch });
  const available = await probe.available();
  if (!available) {
    writeStub('<!-- memory endpoint unreachable; no prior context retrieved -->');
    process.stderr.write(`Completed kbd-memory-recall — ${phase} (stub; memory unreachable)\n`);
    process.exitCode = 0;
    return;
  }

  const url = probe.url();
  if (!url) {
    writeStub('<!-- memory recall requires HTTP endpoint; MCP-only mode not yet wired here -->');
    process.exitCode = 0;
    return;
  }

  const project = resolveProject();
  const goalsFile = path.join(phaseDir, 'goals.md');
  const assessmentFile = path.join(phaseDir, 'assessment.md');
  let query = '';
  if (existsSync(goalsFile)) query += readFileSync(goalsFile, 'utf8');
  if (existsSync(assessmentFile)) query += `\n\n${readFileSync(assessmentFile, 'utf8')}`;
  if (!query) query = phase;

  let response;
  try {
    const search = new URL(`${url}/api/v1/entities/search`);
    search.searchParams.set('q', 'kbd_lifecycle_event');
    response = await fetch(search, { signal: AbortSignal.timeout(3000) });
  } catch {
    writeStub('<!-- memory endpoint unreachable; no prior context retrieved -->');
    process.stderr.write(`Completed kbd-memory-recall — ${phase} (stub; entity search transport failed)\n`);
    process.exitCode = 0;
    return;
  }

  if (!response.ok) {
    writeStub(`<!-- memory entity-search HTTP error ${response.status}; no prior context retrieved -->`);
    process.stderr.write(`Completed kbd-memory-recall — ${phase} (stub; entity search HTTP ${response.status})\n`);
    process.exitCode = 0;
    return;
  }

  let ranked;
  try {
    const body = await response.json();
    ranked = rankEntities(body, project, `${phase} ${query}`);
  } catch {
    writeStub('<!-- memory entity-search response was invalid; no prior context retrieved -->');
    process.stderr.write(`Completed kbd-memory-recall — ${phase} (stub; invalid entity search response)\n`);
    process.exitCode = 0;
    return;
  }

  atomicWrite(digest, renderDigest(phase, ranked));
  process.stderr.write(`Completed kbd-memory-recall — ${phase} wrote prior-context.md\n`);
  process.exitCode = 0;
}

main(process.argv.slice(2));
