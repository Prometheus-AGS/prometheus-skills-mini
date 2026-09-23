// Port of the SpecBackend contract embedded in skills/kbd-apply/kbd-apply.sh
// (prometheus-skill-pack, 602 lines: backend_detect ~63-116, the native-kbd adapter
// ~118-221, the OpenSpec adapter ~223-286). `lib/AGENTS.md` already names `spec-backend` as a
// planned `lib/<capability>/` directory, confirming this placement.
//
// Not a 1:1 translation of every backend — only what kbd-apply.mjs's six-op contract needs:
// detect, list, progress, mark_done, verify, archive. The Spec Kit (speckit) adapter is NOT
// ported here: kbd-apply.sh's own `b_verify`/`b_archive` treat speckit as a no-op for those two
// ops, and its `sk_*` functions are markdown-checklist parsing that mirrors `os_mark_done`'s
// pattern closely enough that porting it un-asked would be scope creep for this batch (C1 scopes
// this port to the 8 jq-dependent scripts + kbd-apply; no source SKILL.md in that set names a
// Spec Kit project as in-scope, and `openspec/config.yaml` names OpenSpec as this repo's own spec
// backend). `detectBackend` still returns `'speckit'` when the on-disk evidence says so (an
// explicit pin or `specs/*/tasks.md`), matching the source's detection surface exactly — a caller
// that reaches a speckit change without dedicated speckit functions gets a clear "not implemented"
// story instead of a silently wrong result. If speckit support becomes a real requirement later,
// `skList`/`skProgress`/`skMarkDone` are a same-shaped follow-up.
//
// Judgment call: every function takes `root` as its first argument and an optional trailing
// `ctx` for injected `spawn` (defaulting to `spawnExecutable`) and other test seams (`now`,
// `tool`, `dateStamp`), matching this repo's injected-ctx convention (memory.mjs,
// bottleneck-guard.mjs) instead of reading `process.cwd()`/`process.env`/`Date.now()` directly.
//
// Judgment call: `nkList`/`osList` return an array of `{ id, done, title }` objects rather than
// the source's TSV text (`id\tdone 0|1\ttitle`). The task's own instruction offered either shape
// "whichever is more idiomatic" for the Node port; objects are what every caller in this repo
// (kbd-apply.mjs) actually wants, and TSV was only ever a bash-pipeline convenience the source
// used because it had no structured value to pass between functions. `scripts/kbd-apply.mjs`
// renders the TSV text at the CLI boundary for the `list` subcommand, matching the source's
// stdout contract for anything that still greps it.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnExecutable } from '../platform/spawn.mjs';
import { atomicWrite } from '../platform/atomic-write.mjs';

const isoNow = () => new Date().toISOString();
const dateStamp = () => new Date().toISOString().slice(0, 10);

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// backend detection
// ---------------------------------------------------------------------------

/** Whether the `openspec` executable can actually be spawned (source: `command -v openspec`). */
function openspecAvailable(spawn) {
  try {
    const result = spawn('openspec', ['--version']);
    return result?.status === 0 || result?.status === undefined ? Boolean(result) : result.status !== null;
  } catch {
    return false;
  }
}

/**
 * Resolve the active spec backend. Mirrors `backend_detect()` exactly: an explicit
 * `project.json.specBackend` pin wins outright; otherwise, when `change` is given, resolution is
 * scoped to that change's own on-disk shape (native-kbd checked first so an unrelated openspec/
 * directory elsewhere in the repo cannot shadow a change that lives under a different backend);
 * otherwise a repo-wide heuristic. Returns `''` when nothing matches, never throws.
 */
export function detectBackend({ root = '.', change = '', spawn = spawnExecutable } = {}) {
  const pinnedFile = path.join(root, '.kbd-orchestrator', 'project.json');
  if (existsSync(pinnedFile)) {
    const pinned = readJsonSafe(pinnedFile)?.specBackend;
    if (pinned === 'openspec' || pinned === 'native-kbd' || pinned === 'speckit') return pinned;
  }

  if (change) {
    const nkDir = path.join(root, '.kbd-orchestrator', 'changes', change);
    if (existsSync(path.join(nkDir, 'tasks.json')) || existsSync(path.join(nkDir, 'change.md'))) {
      return 'native-kbd';
    }
    const osDir = path.join(root, 'openspec', 'changes', change);
    if (
      (existsSync(path.join(osDir, 'proposal.md')) || existsSync(path.join(osDir, 'tasks.md'))) &&
      openspecAvailable(spawn)
    ) {
      return 'openspec';
    }
    if (existsSync(path.join(root, 'specs', change, 'tasks.md'))) return 'speckit';
    // Falls through to the repo-wide heuristic, matching the source.
  }

  if (existsSync(path.join(root, 'openspec')) && openspecAvailable(spawn)) return 'openspec';
  if (existsSync(path.join(root, '.specify'))) return 'speckit';
  if (hasAnySpecsTasksMd(root)) return 'speckit';
  if (hasAnyNativeChange(root)) return 'native-kbd';
  return '';
}

function hasAnySpecsTasksMd(root) {
  const specsDir = path.join(root, 'specs');
  if (!existsSync(specsDir)) return false;
  return readdirSync(specsDir).some((entry) => existsSync(path.join(specsDir, entry, 'tasks.md')));
}

function hasAnyNativeChange(root) {
  const changesDir = path.join(root, '.kbd-orchestrator', 'changes');
  if (!existsSync(changesDir)) return false;
  return readdirSync(changesDir).some(
    (entry) =>
      existsSync(path.join(changesDir, entry, 'tasks.json')) ||
      existsSync(path.join(changesDir, entry, 'change.md'))
  );
}

// ---------------------------------------------------------------------------
// native-kbd adapter — source of truth: .kbd-orchestrator/changes/<change>/tasks.json
// ---------------------------------------------------------------------------

const nkChangeDir = (root, change) => path.join(root, '.kbd-orchestrator', 'changes', change);

/** Regenerate tasks.md from tasks.json (generated view; source's `_nk_render_md`). */
function nkRenderMd(changeDir) {
  const tasksFile = path.join(changeDir, 'tasks.json');
  if (!existsSync(tasksFile)) return;
  const parsed = readJsonSafe(tasksFile);
  if (!parsed) return;
  const lines = [
    '<!-- GENERATED by kbd-apply from tasks.json — do not edit; edits are overwritten. -->',
    '',
    `# Tasks — ${parsed.changeId ?? ''}`,
    '',
    ...(parsed.tasks ?? []).map((t) => `- [${t.done ? 'x' : ' '}] ${t.id} ${t.title}`),
  ];
  writeFileSync(path.join(changeDir, 'tasks.md'), `${lines.join('\n')}\n`);
}

/** Parse a legacy `change.md` "## Tasks" checkbox list into tasks.json rows (source's awk). */
function parseLegacyChangeMd(text) {
  const rows = [];
  let n = 0;
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*-\s*\[([ xX/])\]\s*(.*)$/);
    if (!match) continue;
    n += 1;
    const done = /[xX]/.test(match[1]);
    let rest = match[2];
    let id = String(n);
    const numbered = rest.match(/^(\d+)\.\s*/);
    if (numbered) {
      id = numbered[1];
      rest = rest.slice(numbered[0].length);
    }
    rows.push({ id, title: rest, done, doneAt: null, doneBy: null });
  }
  return rows;
}

/** Lazy one-way migration: legacy change.md → tasks.json (source's `_nk_migrate_changemd`). */
function nkMigrateChangeMd(changeDir, changeId) {
  const changeMdFile = path.join(changeDir, 'change.md');
  if (!existsSync(changeMdFile)) return false;
  const tasks = parseLegacyChangeMd(readFileSync(changeMdFile, 'utf8'));
  writeFileSync(
    path.join(changeDir, 'tasks.json'),
    JSON.stringify({ changeId, schemaVersion: '1', tasks }, null, 2)
  );
  nkRenderMd(changeDir);
  return true;
}

/** Ensure tasks.json exists (migrating from change.md if needed); returns the change dir. */
function nkEnsureTasks(root, change) {
  const changeDir = nkChangeDir(root, change);
  if (!existsSync(changeDir)) throw new Error(`native-kbd: no such change dir: ${changeDir}`);
  if (!existsSync(path.join(changeDir, 'tasks.json'))) {
    if (!nkMigrateChangeMd(changeDir, change)) {
      throw new Error(`native-kbd: no tasks.json or change.md under ${changeDir}`);
    }
  }
  return changeDir;
}

export function nkList(root, change) {
  const changeDir = nkEnsureTasks(root, change);
  const parsed = readJsonSafe(path.join(changeDir, 'tasks.json'));
  return (parsed?.tasks ?? []).map((t) => ({ id: t.id, done: Boolean(t.done), title: t.title }));
}

export function nkProgress(root, change) {
  const rows = nkList(root, change);
  const total = rows.length;
  const complete = rows.filter((r) => r.done).length;
  return { total, complete, remaining: total - complete };
}

export function nkMarkDone(root, change, id, ctx = {}) {
  const now = ctx.now ?? isoNow;
  const tool = ctx.tool ?? 'claude-code';
  const changeDir = nkEnsureTasks(root, change);
  const tasksFile = path.join(changeDir, 'tasks.json');
  const parsed = readJsonSafe(tasksFile);
  if (!parsed) throw new Error(`native-kbd: unreadable tasks.json at ${tasksFile}`);
  const next = {
    ...parsed,
    tasks: (parsed.tasks ?? []).map((t) =>
      t.id === id ? { ...t, done: true, doneAt: now(), doneBy: tool } : t
    ),
  };
  atomicWrite(tasksFile, JSON.stringify(next, null, 2));
  nkRenderMd(changeDir);
}

export function nkVerify(root, change) {
  let changeDir;
  try {
    changeDir = nkEnsureTasks(root, change);
  } catch {
    return false;
  }
  const parsed = readJsonSafe(path.join(changeDir, 'tasks.json'));
  if (!parsed) return false;
  const remaining = (parsed.tasks ?? []).filter((t) => !t.done).length;
  if (remaining !== 0) return false;
  return existsSync(path.join(changeDir, 'spec.md')) || existsSync(path.join(changeDir, 'change.md'));
}

export function nkArchive(root, change, ctx = {}) {
  const stamp = ctx.dateStamp ?? dateStamp;
  const changeDir = nkChangeDir(root, change);
  if (!existsSync(changeDir)) throw new Error(`native-kbd: no such change dir: ${changeDir}`);
  const archiveRoot = path.join(root, '.kbd-orchestrator', 'changes', 'archive');
  mkdirSync(archiveRoot, { recursive: true });
  const dest = path.join(archiveRoot, `${stamp()}-${change}`);
  renameSync(changeDir, dest);
  return dest;
}

// ---------------------------------------------------------------------------
// OpenSpec adapter
// ---------------------------------------------------------------------------

/** `openspec instructions apply --change <id> --json` (source's `_os_apply_json`). */
function osApplyJson(root, change, spawn) {
  const result = spawn('openspec', ['instructions', 'apply', '--change', change, '--json'], { cwd: root });
  if (result?.status !== 0) {
    throw new Error(`openspec: instructions apply --change ${change} failed: ${result?.stderr ?? ''}`);
  }
  const parsed = JSON.parse(result.stdout);
  return parsed;
}

export function osList(root, change, { spawn = spawnExecutable } = {}) {
  const parsed = osApplyJson(root, change, spawn);
  return (parsed.tasks ?? []).map((t) => ({ id: t.id, done: Boolean(t.done), title: t.description }));
}

export function osProgress(root, change, { spawn = spawnExecutable } = {}) {
  const parsed = osApplyJson(root, change, spawn);
  const p = parsed.progress ?? {};
  return { total: p.total ?? 0, complete: p.complete ?? 0, remaining: p.remaining ?? 0 };
}

/**
 * Flip the Nth top-level checkbox (OpenSpec task ids are positional ordinals matching the JSON
 * API's counting, which excludes indented sub-bullets) or, for a non-numeric id, the first
 * unchecked line whose text contains it (source's `os_mark_done`).
 */
export function osMarkDone(root, change, id) {
  const tasksFile = path.join(root, 'openspec', 'changes', change, 'tasks.md');
  if (!existsSync(tasksFile)) throw new Error(`openspec: no tasks.md at ${tasksFile}`);
  const lines = readFileSync(tasksFile, 'utf8').split('\n');

  if (/^\d+$/.test(id)) {
    const target = Number(id);
    let n = 0;
    const next = lines.map((line) => {
      if (/^-\s*\[[ xX]\]/.test(line)) {
        n += 1;
        if (n === target) return line.replace(/\[[ xX]\]/, '[x]');
      }
      return line;
    });
    writeFileSync(tasksFile, next.join('\n'));
    return;
  }

  let done = false;
  const next = lines.map((line) => {
    if (!done && /^-\s*\[ \]/.test(line) && line.includes(id)) {
      done = true;
      return line.replace(/\[ \]/, '[x]');
    }
    return line;
  });
  writeFileSync(tasksFile, next.join('\n'));
}

export function osVerify(root, change, { spawn = spawnExecutable } = {}) {
  const result = spawn('openspec', ['validate', change], { cwd: root });
  return result?.status === 0;
}

/**
 * `openspec archive <change> --yes`. `--yes` is required, not cosmetic — without it the CLI
 * waits on an interactive confirmation that a driven script can never answer, and swallowing
 * stderr on a real failure turns that into a silent no-op reported as success (the exact bug the
 * source's own comment documents). Throws on a non-zero exit so a real archive failure is
 * visible.
 */
export function osArchive(root, change, { spawn = spawnExecutable } = {}) {
  const result = spawn('openspec', ['archive', change, '--yes'], { cwd: root });
  if (result?.status !== 0) {
    throw new Error(`openspec: archive ${change} failed: ${result?.stderr ?? ''}`);
  }
}
