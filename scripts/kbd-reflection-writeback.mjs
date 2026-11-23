// Persist accepted reflection lessons in the learning log consumed by the local file tier.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { acquireLock } from '../lib/platform/lock.mjs';
import { phaseDirectory, safeId } from '../lib/kbd/reconcile-artifacts.mjs';
import { buildEnvelope } from '../lib/learning/envelope.mjs';
import { resolveIdentity, resolveUserScope } from '../lib/learning/identity.mjs';

const root = process.cwd();
const phase = safeId(process.env.KBD_HOOK_NAME, 'phase');
const phaseDir = process.env.KBD_HOOK_PHASE_DIR ?? phaseDirectory(root, phase);
const report = readFileSync(path.join(phaseDir, 'reflection.md'), 'utf8');
const section = (title) => report.match(new RegExp('^##\\s+' + title + '\\s*$([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))', 'im'))?.[1]?.trim();
const records = [];
const context = ['Delta', 'Root Cause', 'Corrective Actions'].map(title => [title, section(title)])
  .filter(([, body]) => body).map(([title, body]) => title + '\n' + body);
if (context.length) records.push({ text: 'Phase ' + phase + '\n' + context.join('\n\n'), kind: 'lesson' });
const lessons = section('(?:Lessons Learned|Lessons)') ?? '';
for (const line of lessons.split(/\r?\n/)) {
  const item = line.match(/^\s*[-*]\s+(?:\[(GLOBAL|USER)\]\s*)?(.+?)\s*$/i);
  if (item && !/^\(?none\)?\.?$/i.test(item[2])) records.push({ text: item[2], kind: 'lesson', visibility: item[1]?.toLowerCase() });
}
const seed = section('(?:Next Phase Seed|Next Phase Focus)');
if (seed) records.push({ text: 'Phase ' + phase + ' next-phase seed:\n' + seed, kind: 'progress' });
if (records.length) {
  const identity = resolveIdentity({}, root);
  const dir = process.env.PROMETHEUS_LEARNING_LOG_DIR || path.join(homedir(), '.prometheus', 'learning-log');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'lessons.jsonl');
  const release = acquireLock(file + '.lock');
  try {
    const done = new Set();
    for (const row of (existsSync(file) ? readFileSync(file, 'utf8') : '').split('\n').filter(Boolean)) {
      const { envelope: e } = JSON.parse(row);
      if (e) done.add(JSON.stringify([e.projectId, e.visibility, e.contentHash]));
    }
    for (const { text, kind, visibility = 'project' } of records) {
      const envelope = { ...buildEnvelope({ identity, kind, text, stage: 'reflect' }), visibility };
      const key = JSON.stringify([envelope.projectId, visibility, envelope.contentHash]);
      if (done.has(key)) continue;
      const uid = visibility === 'global' ? '@global' : visibility === 'user'
        ? '@' + resolveUserScope(root).replace(/^@/, '') : identity.projectId;
      appendFileSync(file, JSON.stringify({ envelope, text, scopes: [[uid, '@' + visibility]] }) + '\n', { mode: 0o600 });
      done.add(key);
    }
  } finally { release(); }
}
