// OpenSpec 2.0 writes each skill once to .agents/skills/openspec-* and gives some
// tools (Claude Code among them) a relative symlink per skill in their own
// skills/ folder. It also deletes "unchanged copies" from tool folders whose
// harness reads .agents/skills directly. This repository's rule is no symlinks
// (installers copy; Windows checkouts cannot rely on links), so after a
// successful refresh the runner turns every such link into a real directory copy
// and restores the copies in harness roots that held them before the update.
import fs from 'node:fs';
import path from 'node:path';

const CANONICAL = path.join('.agents', 'skills');
const isOpenSpecSkill = name => name.startsWith('openspec-');

function canonicalNames(project) {
  const root = path.join(project, CANONICAL);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && isOpenSpecSkill(entry.name))
    .map(entry => entry.name)
    .sort();
}

// Every <project>/.<harness>/skills directory except the canonical one.
function harnessSkillRoots(project) {
  const roots = [];
  for (const entry of fs.readdirSync(project, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('.') || entry.name === '.agents' || entry.name === '.git') continue;
    const skills = path.join(project, entry.name, 'skills');
    if (fs.existsSync(skills) && fs.lstatSync(skills).isDirectory()) roots.push(skills);
  }
  return roots;
}

// Before update: the harness roots that hold at least one real openspec-* copy.
export function copyMirrors(project) {
  return harnessSkillRoots(project).filter(root => fs.readdirSync(root, { withFileTypes: true })
    .some(entry => isOpenSpecSkill(entry.name) && entry.isDirectory()));
}

function copySkill(project, name, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(project, CANONICAL, name), target, { recursive: true, dereference: true });
}

// After update: replace links with copies, and resync the roots that held copies.
export function materializeSkills(project, mirrors = []) {
  const names = canonicalNames(project);
  if (!names.length) return [];
  const written = [];
  for (const root of harnessSkillRoots(project)) {
    const mirrored = mirrors.includes(root);
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!isOpenSpecSkill(entry.name)) continue;
      const target = path.join(root, entry.name);
      const isLink = fs.lstatSync(target).isSymbolicLink();
      if (isLink && names.includes(entry.name)) { copySkill(project, entry.name, target); written.push(target); }
      else if (isLink || (mirrored && !names.includes(entry.name))) { fs.rmSync(target, { recursive: true, force: true }); written.push(target); }
    }
    if (!mirrored) continue;
    for (const name of names) {
      const target = path.join(root, name);
      if (written.includes(target)) continue;
      copySkill(project, name, target);
      written.push(target);
    }
  }
  return written.map(file => path.relative(project, file)).sort();
}
