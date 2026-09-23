import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../platform/atomic-write.mjs';
import { readText } from '../platform/text.mjs';

const START = '<!-- prometheus-mini-context:start v1 -->';
const END = '<!-- prometheus-mini-context:end -->';
const SUPPORTED_STACKS = new Set(['rust', 'typescript']);

const inside = (root, candidate) => candidate === root || candidate.startsWith(`${root}${path.sep}`);
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');
const exists = (file) => fs.existsSync(file);

function readIfPresent(file) {
  return exists(file) ? readText(file) : '';
}

function managedRegion(template) {
  const start = template.indexOf(START);
  const end = template.indexOf(END);
  if (start < 0 || end < start) throw new Error('bootstrap reference has an invalid managed marker pair');
  return template.slice(start, end + END.length);
}

function spliceManaged(existing, template) {
  const starts = existing.split(START).length - 1;
  const ends = existing.split(END).length - 1;
  if (starts !== ends || starts > 1) throw new Error('target has a corrupt prometheus-mini-context marker pair');
  const region = managedRegion(template);
  if (starts === 0) return `${existing.trimEnd()}${existing.trim() ? '\n\n' : ''}${region}\n`;
  const start = existing.indexOf(START);
  const end = existing.indexOf(END, start) + END.length;
  return `${existing.slice(0, start)}${region}${existing.slice(end)}`;
}

function assertSafeExistingTarget(root, file) {
  let existing = file;
  while (!exists(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) throw new Error(`cannot resolve a safe parent for ${file}`);
    existing = parent;
  }
  const resolved = fs.realpathSync(existing);
  if (!inside(root, resolved)) throw new Error(`refusing to write outside project root through ${file}`);
}

function planWrite(plan, root, file, content, kind = 'WRITE') {
  assertSafeExistingTarget(root, file);
  const current = readIfPresent(file);
  plan.push({ kind: current === content ? 'CURRENT' : kind, path: relative(root, file), file, content });
}

function walkFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`skill payload contains a symlink: ${file}`);
    return entry.isDirectory() ? walkFiles(file, base) : [{ source: file, relative: path.relative(base, file) }];
  });
}

function planSkillCopy(plan, root, packRoot, name) {
  const source = path.join(packRoot, 'skills', name);
  if (!exists(path.join(source, 'SKILL.md'))) throw new Error(`missing bundled skill: ${name}`);
  for (const harness of ['.agents', '.claude']) {
    const destination = path.join(root, harness, 'skills', name);
    for (const file of walkFiles(source)) {
      planWrite(plan, root, path.join(destination, file.relative), readText(file.source), 'COPY');
    }
  }
}

function selectedStacks(root, requested) {
  const stacks = requested?.length
    ? requested
    : [exists(path.join(root, 'Cargo.toml')) && 'rust', exists(path.join(root, 'package.json')) && 'typescript'].filter(Boolean);
  const unique = [...new Set(stacks)];
  for (const stack of unique) {
    if (!SUPPORTED_STACKS.has(stack)) throw new Error(`unsupported stack ${JSON.stringify(stack)}; expected rust or typescript`);
  }
  return unique;
}

function agentTargets(root) {
  const agents = path.join(root, 'AGENTS.md');
  const claude = path.join(root, 'CLAUDE.md');
  if (exists(agents) && fs.lstatSync(agents).isSymbolicLink()) {
    const target = fs.realpathSync(agents);
    if (!inside(root, target)) throw new Error('AGENTS.md symlink resolves outside the project root');
    return { primary: target, agents, claude, linked: true };
  }
  if (exists(agents) && exists(claude) && readText(agents).trim() === 'CLAUDE.md') {
    return { primary: claude, agents, claude, linked: true };
  }
  if (exists(claude) && fs.lstatSync(claude).isSymbolicLink()) {
    const target = fs.realpathSync(claude);
    if (!inside(root, target)) throw new Error('CLAUDE.md symlink resolves outside the project root');
    if (!exists(agents) || fs.realpathSync(agents) !== target) {
      throw new Error('CLAUDE.md symlink does not resolve to AGENTS.md; preserve it manually before bootstrap');
    }
    return { primary: agents, agents, claude, linked: true };
  }
  return { primary: agents, agents, claude, linked: false };
}

function createPlan({ projectRoot, packRoot, stacks }) {
  if (!exists(projectRoot) || !fs.statSync(projectRoot).isDirectory()) throw new Error(`not a directory: ${projectRoot}`);
  const root = fs.realpathSync(projectRoot);
  const chosen = selectedStacks(root, stacks);
  const skillRoot = path.join(packRoot, 'skills', 'prometheus-context-bootstrap');
  const base = readText(path.join(skillRoot, 'references', 'AGENTS.base.md'));
  const plan = [];
  const targets = agentTargets(root);

  planWrite(plan, root, targets.primary, spliceManaged(readIfPresent(targets.primary), base), 'MERGE');
  if (!targets.linked) {
    const claude = readIfPresent(targets.claude);
    const imported = /^@AGENTS\.md\s*$/m.test(claude) ? claude : `@AGENTS.md\n${claude ? `\n${claude}` : ''}`;
    planWrite(plan, root, targets.claude, imported, claude ? 'MERGE' : 'CREATE');
  }

  for (const stack of chosen) {
    const template = readText(path.join(skillRoot, 'references', `rules-${stack}.md`));
    const destination = path.join(root, '.claude', 'rules', `${stack}.md`);
    const existing = readIfPresent(destination);
    planWrite(plan, root, destination, existing ? spliceManaged(existing, template) : template, existing ? 'MERGE' : 'CREATE');
  }

  planSkillCopy(plan, root, packRoot, 'prometheus-context-bootstrap');
  if (chosen.includes('rust')) planSkillCopy(plan, root, packRoot, 'prometheus-rust-workspace');

  for (const [name, title] of [['decisions.md', 'Decisions'], ['gotchas.md', 'Gotchas'], ['session-log.md', 'Session Log']]) {
    const file = path.join(root, '.prometheus', name);
    if (!exists(file)) planWrite(plan, root, file, `# ${title}\n\nAppend-only. Mark superseded entries; do not delete them.\n`, 'CREATE');
  }
  for (const directory of ['knowledge', 'postmortems']) {
    plan.push({ kind: exists(path.join(root, '.prometheus', directory)) ? 'CURRENT' : 'DIRECTORY', path: `.prometheus/${directory}`, directory: path.join(root, '.prometheus', directory) });
  }

  return { root, stacks: chosen, plan };
}

function checkPlan(plan) {
  const drift = [];
  for (const item of plan) {
    if (item.directory) {
      if (!exists(item.directory) || !fs.statSync(item.directory).isDirectory()) drift.push(item.path);
    } else if (!exists(item.file) || readText(item.file) !== item.content) {
      drift.push(item.path);
    }
  }
  return drift;
}

export function runContextBootstrap(options) {
  const state = createPlan(options);
  if (options.check) return { ...state, drift: checkPlan(state.plan), changed: 0 };
  if (options.dryRun) return { ...state, drift: [], changed: state.plan.filter((item) => item.kind !== 'CURRENT').length };

  let changed = 0;
  for (const item of state.plan) {
    if (item.kind === 'CURRENT') continue;
    if (item.directory) fs.mkdirSync(item.directory, { recursive: true });
    else atomicWrite(item.file, item.content);
    changed += 1;
  }
  return { ...state, drift: [], changed };
}
