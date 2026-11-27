// Read-only audit of the instruction and rule files that are effective in a project, and of the
// pack version actually installed there. It creates, changes and deletes nothing, and a finding
// never fails the run: the report is for an operator to act on.
//
// Self-contained on purpose: an installed skill is copied without the pack's lib/.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const INSTRUCTION_NAMES = new Set(['AGENTS.md', 'CLAUDE.md', 'CLAUDE.local.md']);
const RULE_DIRECTORIES = ['.claude/rules', '.cursor/rules', '.github/instructions'];
const RULE_FILES = ['.github/copilot-instructions.md'];
const SKILL_DIRECTORIES = ['.claude/skills', '.agents/skills'];
const OWNERSHIP_MARKERS = ['.prometheus-mini-managed.json', '.the-boss-managed.json'];
const SKIPPED = new Set(['.git', 'node_modules', 'dist', 'build', 'target', 'vendor', '.venv']);
const MAX_DEPTH = 6;
const PASSAGE_CAP = 160;

// Passages that make a test count or task order the goal. Recognised patterns only: prose that
// says the same thing another way is not found, and the report says so.
const CONFLICTS = [
  { rule: 'test count treated as completion', pattern: /\b(?:done|complete[d]?|completion|finished)\b[^.\n]{0,40}\b(?:when|once|if|after)\b[^.\n]{0,30}\btests?\s+pass/i },
  { rule: 'test count treated as completion', pattern: /\b(?:all|every)\s+tests?\s+pass(?:ing|es)?\b[^.\n]{0,40}\b(?:means|is|=)\s+(?:done|complete|finished)/i },
  { rule: 'task order treated as the goal', pattern: /\bnext\s+unchecked\s+task\b/i },
  { rule: 'task order treated as the goal', pattern: /\b(?:finish|complete)\s+(?:all|every)\s+(?:the\s+)?tasks?\b[^.\n]{0,30}\b(?:is|as)\s+the\s+goal/i },
];

const posix = (relative) => relative.split(path.sep).join('/');

function listInstructionFiles(root) {
  const found = [];
  const walk = (directory, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED.has(entry.name) && depth < MAX_DEPTH) walk(absolute, depth + 1);
      } else if (INSTRUCTION_NAMES.has(entry.name)) {
        found.push(posix(path.relative(root, absolute)));
      }
    }
  };
  walk(root, 0);
  return found;
}

function listRuleFiles(root) {
  const found = RULE_FILES.filter((relative) => fs.existsSync(path.join(root, relative)));
  for (const relative of RULE_DIRECTORIES) {
    let names;
    try {
      names = fs.readdirSync(path.join(root, relative));
    } catch {
      continue;
    }
    for (const name of names.sort()) found.push(`${relative}/${name}`);
  }
  return found;
}

function readText(file) {
  try {
    return fs.statSync(file).isFile() ? fs.readFileSync(file, 'utf8') : null;
  } catch {
    return null;
  }
}

function importsOf(root, relative, text) {
  const imports = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:[^@\n]*:\s*)?@(\S+\.md)\s*$/.exec(line);
    if (!match) continue;
    const target = path.resolve(path.dirname(path.join(root, relative)), match[1]);
    imports.push({ from: relative, target: match[1], exists: fs.existsSync(target) });
  }
  return imports;
}

function conflictsOf(relative, text) {
  const conflicts = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const hit = CONFLICTS.find(({ pattern }) => pattern.test(line));
    if (hit) conflicts.push({ file: relative, line: index + 1, rule: hit.rule, passage: line.trim().slice(0, PASSAGE_CAP) });
  });
  return conflicts;
}

function inspect(root) {
  const instructions = listInstructionFiles(root);
  const rules = listRuleFiles(root);
  const imports = [];
  const conflicts = [];
  for (const relative of [...instructions, ...rules]) {
    const text = readText(path.join(root, relative));
    if (text === null) continue;
    imports.push(...importsOf(root, relative, text));
    conflicts.push(...conflictsOf(relative, text));
  }
  return { instructions, rules, imports, conflicts };
}

function linkedWorktrees(root) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const result = spawnSync('git', ['--no-optional-locks', '-C', root, 'worktree', 'list', '--porcelain'], {
    encoding: 'utf8', env, shell: false, windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;
  // The native form expands Windows 8.3 short names (RUNNER~1) and normalises separators, so the
  // path Git prints and the path the caller passed compare equal when they are the same directory.
  const real = (directory) => {
    try {
      return fs.realpathSync.native(directory);
    } catch {
      return directory;
    }
  };
  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length))
    .filter((directory) => real(directory) !== real(root));
}

const skillVersion = (file) => {
  const text = readText(file);
  const front = text ? /^---\r?\n([\s\S]*?)\r?\n---/.exec(text) : null;
  const match = front ? /^\s*version:\s*['"]?([^'"\r\n]+)['"]?\s*$/m.exec(front[1]) : null;
  return match ? match[1].trim() : null;
};

function packVersion(start) {
  for (let directory = start, depth = 0; depth < 8; depth += 1) {
    for (const manifest of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'package.json']) {
      try {
        const { version } = JSON.parse(fs.readFileSync(path.join(directory, manifest), 'utf8'));
        if (typeof version === 'string' && version) return version;
      } catch {
        // Not here; keep looking upward.
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return 'unknown';
}

function installedSkills(root, packSkills) {
  return SKILL_DIRECTORIES.flatMap((relative) => {
    const directory = path.join(root, relative);
    let names;
    try {
      names = fs.readdirSync(directory).sort();
    } catch {
      return [];
    }
    const marker = OWNERSHIP_MARKERS.find((name) => fs.existsSync(path.join(directory, name)));
    let owner = null;
    try {
      owner = marker ? JSON.parse(fs.readFileSync(path.join(directory, marker), 'utf8')).owner ?? null : null;
    } catch {
      owner = null;
    }
    const differing = [];
    for (const name of names) {
      const installed = skillVersion(path.join(directory, name, 'SKILL.md'));
      const pack = skillVersion(path.join(packSkills, name, 'SKILL.md'));
      if (installed && pack && installed !== pack) differing.push({ skill: name, installed, pack });
    }
    return [{ directory: relative, managed: marker ? `managed copy (${owner ?? 'owner not recorded'})` : 'unknown (no receipt)', differing }];
  });
}

/** The whole audit as data. Reads only. */
export function auditRules(root, { scriptDirectory = path.dirname(fileURLToPath(import.meta.url)) } = {}) {
  const worktrees = linkedWorktrees(root);
  return {
    root,
    ...inspect(root),
    worktrees: worktrees === null ? null : worktrees.map((directory) => ({ directory, ...inspect(directory) })),
    packVersion: packVersion(scriptDirectory),
    installed: installedSkills(root, path.resolve(scriptDirectory, '..', '..')),
  };
}

function renderSection(lines, label, { instructions, rules, imports, conflicts }) {
  lines.push(`${label} instruction files: ${instructions.length ? '' : 'none'}`);
  for (const file of instructions) lines.push(`  ${file.includes('/') ? 'NESTED' : 'ROOT  '} ${file}`);
  lines.push(`${label} harness rule files: ${rules.length ? '' : 'none'}`);
  for (const file of rules) lines.push(`  RULE   ${file}`);
  for (const entry of imports) lines.push(`  IMPORT ${entry.from} -> ${entry.target}${entry.exists ? '' : ' (missing)'}`);
  for (const entry of conflicts) lines.push(`  CONFLICT ${entry.file}:${entry.line} — ${entry.rule}: "${entry.passage}"`);
}

export function renderAudit(audit) {
  const lines = [`Rules audit — ${audit.root}`];
  renderSection(lines, 'Project', audit);
  if (audit.worktrees === null) lines.push('Linked worktrees: unknown (not a Git working tree, or Git unavailable)');
  else if (!audit.worktrees.length) lines.push('Linked worktrees: none');
  for (const worktree of audit.worktrees ?? []) renderSection(lines, `Worktree ${worktree.directory}`, worktree);
  lines.push(`Pack version running this audit: ${audit.packVersion}`);
  if (!audit.installed.length) lines.push('Installed skills in this project: none found (version unknown)');
  for (const entry of audit.installed) {
    lines.push(`Installed skills in ${entry.directory}: ${entry.managed}`);
    for (const skill of entry.differing) lines.push(`  VERSION ${skill.skill}: installed ${skill.installed}, pack ${skill.pack}`);
    if (!entry.differing.length) lines.push('  no skill version differs from this pack');
  }
  const total = audit.conflicts.length + (audit.worktrees ?? []).reduce((sum, worktree) => sum + worktree.conflicts.length, 0);
  lines.push(`${total} outcome-first conflict(s) found. Recognised patterns only; review operator prose yourself.`);
  lines.push('Nothing was changed.');
  return `${lines.join('\n')}\n`;
}

export function runRulesAudit(args) {
  const index = args.indexOf('--path');
  const root = index >= 0 ? args[index + 1] : undefined;
  if (!root || args.length !== 2) {
    process.stderr.write('USAGE use --path <project-root>\n');
    return 1;
  }
  let real;
  try {
    real = fs.realpathSync.native(root);
  } catch {
    process.stderr.write(`USAGE ${root} is not an existing directory\n`);
    return 1;
  }
  process.stdout.write(renderAudit(auditRules(real)));
  return 0;
}
