// Port of the SpecBackend contract embedded in skills/kbd-apply/kbd-apply.sh
// (prometheus-skill-pack, 602 lines: backend_detect ~63-116, the native-kbd adapter
// ~118-221, the OpenSpec adapter ~223-286). `lib/AGENTS.md` already names `spec-backend` as a
// planned `lib/<capability>/` directory, confirming this placement.
//
// Not a 1:1 translation of every backend — only what kbd-apply.mjs's six-op contract needs:
// detect, list, progress, mark_done, verify, archive. All THREE engines are ported with full
// parity: openspec (CLI-backed, spawned with no shell), speckit (GitHub Spec Kit — pure
// filesystem markdown parsing of specs/<change>/{spec,plan,tasks}.md mirroring the bash `sk_*`
// functions; the `specify` CLI is never invoked), and native-kbd (the always-available fallback
// under .kbd-orchestrator/changes/).
//
// OpenSpec is the DEFAULT ENGINE: when a repo carries more than one backend's evidence and
// nothing is pinned, detection resolves to openspec. Full order: pinned (project.json
// `specBackend`) > openspec > speckit > native-kbd. Pin a different engine via
// .kbd-orchestrator/project.json ("openspec"|"speckit"|"native-kbd"); engine metadata (CLI name,
// pinned upstream version, default-engine declaration) lives in config/spec-engines.json.
//
// The engines are exposed through `specEngines`, an extensible registry keyed by backend id.
// Each entry is { list, progress, markDone, verify, archive } under the uniform
// (root, change, ctx) call shape (markDone takes (root, change, id, ctx)), so adding an engine
// is one adapter object plus its detection evidence in `detectBackend` — no per-caller dispatch
// rewrite.
//
// Judgment call: every function takes `root` as its first argument and an optional trailing
// `ctx` for injected `spawn` (defaulting to `spawnOpenSpec`) and other test seams (`now`,
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
import { spawnOpenSpec } from '../platform/openspec.mjs';
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

/**
 * Whether the managed OpenSpec CLI can actually run (source: `command -v openspec`). The probe
 * goes through the same runner every OpenSpec call uses, so a disabled, contended or uninstallable
 * runner is reported here instead of after a backend has been chosen.
 */
function openspecAvailable(root, spawn) {
  try {
    const result = spawn('openspec', ['--version'], { cwd: root });
    return !result?.error && result?.status === 0;
  } catch {
    return false;
  }
}

/**
 * Resolve the active spec backend. OpenSpec is the DEFAULT ENGINE: when more than one backend's
 * on-disk evidence exists, resolution order is pinned > openspec > speckit > native-kbd, so an
 * unpinned repo carrying both an `openspec/` directory and `specs/<slug>/tasks.md` resolves to
 * openspec. Otherwise mirrors `backend_detect()`: an explicit `project.json.specBackend` pin wins
 * outright; when `change` is given, resolution is scoped to that change's own on-disk shape
 * (native-kbd checked first so an unrelated openspec/ directory elsewhere in the repo cannot
 * shadow a change that lives under a different backend; a change counts as speckit when
 * `specs/<change>/` holds tasks.md, spec.md, or plan.md); otherwise a repo-wide heuristic.
 * Returns `''` when nothing matches, never throws.
 */
export function detectBackend({ root = '.', change = '', spawn = spawnOpenSpec } = {}) {
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
      openspecAvailable(root, spawn)
    ) {
      return 'openspec';
    }
    const skDir = path.join(root, 'specs', change);
    if (['tasks.md', 'spec.md', 'plan.md'].some((f) => existsSync(path.join(skDir, f)))) {
      return 'speckit';
    }
    // Falls through to the repo-wide heuristic, matching the source.
  }

  if (existsSync(path.join(root, 'openspec')) && openspecAvailable(root, spawn)) return 'openspec';
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

export function osList(root, change, { spawn = spawnOpenSpec } = {}) {
  const parsed = osApplyJson(root, change, spawn);
  return (parsed.tasks ?? []).map((t) => ({ id: t.id, done: Boolean(t.done), title: t.description }));
}

export function osProgress(root, change, { spawn = spawnOpenSpec } = {}) {
  const parsed = osApplyJson(root, change, spawn);
  const p = parsed.progress;
  if (!p || !['total', 'complete', 'remaining'].every(key => Number.isSafeInteger(p[key]) && p[key] >= 0)
      || p.complete + p.remaining !== p.total) {
    throw new Error(`openspec: invalid progress for ${change}; no completion may be inferred`);
  }
  return { total: p.total, complete: p.complete, remaining: p.remaining };
}

// OpenSpec 1.10.0's TASK_LINE_PATTERN (utils/task-progress.js): a `-`/`*` bullet with a checkbox
// at any indent. Group 1 is the whole prefix up to and including the box.
const OPENSPEC_TASK_LINE = /^(\s*[-*]\s*\[[\sxX]\])\s*(.*)/;
const flipBox = (prefix) => prefix.replace(/\[[\sxX]\]$/, '[x]');

/**
 * Mark one OpenSpec task done (source's `os_mark_done`).
 *
 * Task ids are whatever `openspec instructions apply --json` (osList) says they are, and OpenSpec's
 * counting rule has changed across releases: older versions counted only column-0 checkboxes, 1.10.0
 * counts every checkbox line (nested sub-tasks and `*` bullets included). Re-deriving the count here
 * drifts whenever that rule changes, and a drift checks off the wrong task. So the id is resolved
 * through OpenSpec's own list (its description, and which occurrence of that description it is) and
 * that line is flipped. Without the CLI, a numeric id falls back to OpenSpec 1.10's ordinal counting;
 * a non-numeric id is a text match on the first open task line.
 */
export function osMarkDone(root, change, id, { spawn = spawnOpenSpec } = {}) {
  const tasksFile = path.join(root, 'openspec', 'changes', change, 'tasks.md');
  if (!existsSync(tasksFile)) throw new Error(`openspec: no tasks.md at ${tasksFile}`);
  const lines = readFileSync(tasksFile, 'utf8').split('\n');

  let tasks = null;
  try {
    tasks = osApplyJson(root, change, spawn).tasks ?? null;
  } catch {
    tasks = null;
  }

  const index = tasks ? tasks.findIndex((task) => String(task.id) === String(id)) : -1;
  if (index >= 0) {
    const want = tasks[index].description;
    const occurrence = tasks.slice(0, index + 1).filter((task) => task.description === want).length;
    let seen = 0;
    let hit = false;
    const next = lines.map((line) => {
      if (hit) return line;
      const match = line.replace(/\r$/, '').match(OPENSPEC_TASK_LINE);
      if (!match || match[2].trim() !== want) return line;
      seen += 1;
      if (seen !== occurrence) return line;
      hit = true;
      return flipBox(match[1]) + line.slice(match[1].length);
    });
    if (!hit) throw new Error(`openspec: task ${id} ("${want}") has no matching line in ${tasksFile}`);
    writeFileSync(tasksFile, next.join('\n'));
    return;
  }

  if (/^\d+$/.test(id)) {
    const target = Number(id);
    let n = 0;
    const next = lines.map((line) => {
      const match = line.match(OPENSPEC_TASK_LINE);
      if (!match) return line;
      n += 1;
      return n === target ? flipBox(match[1]) + line.slice(match[1].length) : line;
    });
    writeFileSync(tasksFile, next.join('\n'));
    return;
  }

  let done = false;
  const next = lines.map((line) => {
    const match = !done && line.match(/^(\s*[-*]\s*\[\s\])/);
    if (match && line.includes(id)) {
      done = true;
      return match[1].replace(/\[\s\]$/, '[x]') + line.slice(match[1].length);
    }
    return line;
  });
  writeFileSync(tasksFile, next.join('\n'));
}

export function osVerify(root, change, { spawn = spawnOpenSpec } = {}) {
  const result = spawn('openspec', ['validate', change, '--type', 'change'], { cwd: root });
  return result?.status === 0;
}

/**
 * `openspec archive <change> --yes`. `--yes` is required, not cosmetic — without it the CLI
 * waits on an interactive confirmation that a driven script can never answer, and swallowing
 * stderr on a real failure turns that into a silent no-op reported as success (the exact bug the
 * source's own comment documents). Throws on a non-zero exit so a real archive failure is
 * visible.
 */
export function osArchive(root, change, { spawn = spawnOpenSpec } = {}) {
  const result = spawn('openspec', ['archive', change, '--yes'], { cwd: root });
  if (result?.status !== 0) {
    throw new Error(`openspec: archive ${change} failed: ${result?.stderr ?? ''}`);
  }
}

// ---------------------------------------------------------------------------
// Spec Kit (speckit) adapter — source: kbd-apply.sh `sk_*` functions
// ---------------------------------------------------------------------------
// A "change" for Spec Kit is a feature dir name under specs/ (GitHub Spec Kit v1.1.2 layout,
// pinned in config/spec-engines.json). tasks.md is a markdown checklist
// ("- [ ] T001 description"). Pure filesystem markdown parsing: no `specify` CLI call, no shell,
// no child_process — matching the bash source, whose sk_* functions are plain awk over the file.

// Checkbox line at any indent (source's `^[[:space:]]*-[[:space:]]*\[[ xX]\]`, plus `*` bullets
// so nested checklist variants parse the same way osMarkDone's pattern does).
const SPECKIT_TASK_LINE = /^(\s*[-*]\s*\[[ xX]\])\s*(.*)$/;

/**
 * Resolve the tasks file (source's `_sk_tasks_file`): `specs/<change>/tasks.md` when the named
 * change has one; otherwise the single `specs/<slug>/tasks.md` if exactly one exists. `archive/` is
 * excluded from the fallback scan — the bash source's `ls specs/<slug>/tasks.md | head -1` would let
 * an archived change's tasks.md shadow the next change being driven, and the port fixes that.
 */
function skTasksFile(root, change) {
  if (change) {
    const direct = path.join(root, 'specs', change, 'tasks.md');
    if (existsSync(direct)) return direct;
  }
  const specsDir = path.join(root, 'specs');
  if (!existsSync(specsDir)) return null;
  const candidates = readdirSync(specsDir).filter(
    (entry) => entry !== 'archive' && existsSync(path.join(specsDir, entry, 'tasks.md'))
  );
  return candidates.length === 1 ? path.join(specsDir, candidates[0], 'tasks.md') : null;
}

/** Parse checkbox rows: id = the T[0-9]+ token when present, else the ordinal (source's awk). */
function skParseTasks(text) {
  const rows = [];
  let n = 0;
  for (const line of text.split('\n')) {
    const match = line.match(SPECKIT_TASK_LINE);
    if (!match) continue;
    n += 1;
    const done = /\[[xX]\]/.test(match[1]);
    let rest = match[2];
    let id = String(n);
    const token = rest.match(/^T[0-9]+/);
    if (token) {
      id = token[0];
      rest = rest.slice(token[0].length).replace(/^\s+/, '');
    }
    rows.push({ id, done, title: rest });
  }
  return rows;
}

function skRequireTasksFile(root, change) {
  const file = skTasksFile(root, change);
  if (!file) {
    throw new Error(`speckit: no tasks.md found for change "${change}" under ${path.join(root, 'specs')}`);
  }
  return file;
}

export function skList(root, change) {
  return skParseTasks(readFileSync(skRequireTasksFile(root, change), 'utf8'));
}

export function skProgress(root, change) {
  const rows = skList(root, change);
  const total = rows.length;
  const complete = rows.filter((r) => r.done).length;
  return { total, complete, remaining: total - complete };
}

/**
 * Mark one task done (source's `sk_mark_done`): a numeric id flips the nth checkbox line
 * (ordinal over every checkbox, done or not); any other id text-matches the first OPEN checkbox
 * line containing it. The ordinal path may flip an already-done box to `[x]` — a no-op — exactly
 * like the source's `sub(/\[[ xX]\]/,"[x]")`.
 */
export function skMarkDone(root, change, id) {
  const file = skRequireTasksFile(root, change);
  const lines = readFileSync(file, 'utf8').split('\n');
  if (/^\d+$/.test(id)) {
    const target = Number(id);
    let n = 0;
    writeFileSync(
      file,
      lines
        .map((line) => {
          const match = line.match(SPECKIT_TASK_LINE);
          if (!match) return line;
          n += 1;
          if (n !== target) return line;
          return match[1].replace(/\[[ xX]\]$/, '[x]') + line.slice(match[1].length);
        })
        .join('\n')
    );
    return;
  }
  let done = false;
  writeFileSync(
    file,
    lines
      .map((line) => {
        if (done) return line;
        const match = line.match(/^(\s*[-*]\s*\[\s\])/);
        if (!match || !line.includes(id)) return line;
        done = true;
        return match[1].replace(/\[\s\]$/, '[x]') + line.slice(match[1].length);
      })
      .join('\n')
  );
}

/**
 * Structural verify: every checkbox in the change's tasks.md is checked AND
 * `specs/<change>/spec.md` exists. Spec Kit's `/speckit.analyze` is model-driven with no CLI
 * gate, so — unlike the bash source, which no-opped speckit verify — this port gives the op a
 * real filesystem check. Judgment call: a tasks.md with zero checkbox lines passes vacuously
 * when spec.md exists (there is nothing incomplete).
 */
export function skVerify(root, change) {
  if (!existsSync(path.join(root, 'specs', change, 'spec.md'))) return false;
  const file = skTasksFile(root, change);
  if (!file) return false;
  return skParseTasks(readFileSync(file, 'utf8')).every((row) => row.done);
}

/**
 * Archive: move `specs/<change>` → `specs/archive/<YYYY-MM-DD>-<change>`. The bash source had no
 * speckit archive step; this port adds one so the six-op contract has parity across engines
 * (same shape as native-kbd's nkArchive: create the archive dir, renameSync).
 */
export function skArchive(root, change, ctx = {}) {
  const stamp = ctx.dateStamp ?? dateStamp;
  const changeDir = path.join(root, 'specs', change);
  if (!existsSync(changeDir)) throw new Error(`speckit: no such change dir: ${changeDir}`);
  const archiveRoot = path.join(root, 'specs', 'archive');
  mkdirSync(archiveRoot, { recursive: true });
  const dest = path.join(archiveRoot, `${stamp()}-${change}`);
  renameSync(changeDir, dest);
  return dest;
}

// ---------------------------------------------------------------------------
// Engine registry — the extensible dispatch surface
// ---------------------------------------------------------------------------
// Uniform call shape: list(root, change, ctx), progress(root, change, ctx),
// markDone(root, change, id, ctx), verify(root, change, ctx) → boolean,
// archive(root, change, ctx) → destination path (speckit/native-kbd) or undefined (openspec).
// Engine metadata (CLI, pinned upstream version) lives in config/spec-engines.json; this
// registry is the adapter surface itself.

export const specEngines = {
  openspec: { list: osList, progress: osProgress, markDone: osMarkDone, verify: osVerify, archive: osArchive },
  speckit: { list: skList, progress: skProgress, markDone: skMarkDone, verify: skVerify, archive: skArchive },
  'native-kbd': { list: nkList, progress: nkProgress, markDone: nkMarkDone, verify: nkVerify, archive: nkArchive },
};
