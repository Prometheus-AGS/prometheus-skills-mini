// Validates SKILL.md files against the Agent Skills specification and this pack's
// strict rules. A port of the full pack's scripts/validate-skills.js.
//
// There is one frontmatter reader for validation and certification: the one in
// skills/skill-certification/scripts/lib.mjs. That skill is copied standalone, so
// the reader has to live there; importing it here keeps the two from drifting.
//
// A description must also stay readable by lib/distribution/frontmatter.mjs, which
// builds the packaged plugin and understands only an inline scalar or a folded (`>`)
// block. A description written any other way would validate here and ship empty.

import fs from 'node:fs';
import path from 'node:path';

import { readSkill } from '../../skills/skill-certification/scripts/lib.mjs';
import { parseSkillFrontmatter } from '../distribution/frontmatter.mjs';

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const LINES_RECOMMENDED = 500;
const NON_NODE_SCRIPT = /\.(sh|bash|zsh|py|ps1|cmd|bat)$/i;
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git']);

const issue = (severity, rule, message) => ({ severity, rule, message });

function nonNodeScripts(skillDir) {
  const found = [];
  const walk = (directory, relative) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(directory, entry.name), rel);
      else if (NON_NODE_SCRIPT.test(entry.name)) found.push(rel);
    }
  };
  walk(skillDir, '');
  return found;
}

/**
 * Validates one skill directory.
 * @returns {{ skill: string, issues: Array<{severity: 'error'|'warning', rule: string, message: string}> }}
 */
export function validateSkill(skillDir, { strict = false } = {}) {
  const skill = path.basename(path.resolve(skillDir));
  const issues = [];
  const { text, frontmatter, body, lines } = readSkill(skillDir);

  if (text === null && !fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
    return { skill, issues: [issue('error', 'skill-file', 'SKILL.md is required but not found')] };
  }
  if (frontmatter === null) {
    return { skill, issues: [issue('error', 'frontmatter', 'SKILL.md must start with YAML frontmatter')] };
  }

  const { name, description } = frontmatter;
  if (typeof name !== 'string' || !NAME_PATTERN.test(name) || name.length > NAME_MAX) {
    issues.push(issue('error', 'name', `name must be lowercase letters, digits and hyphens, at most ${NAME_MAX} characters`));
  } else if (name !== skill) {
    issues.push(issue('error', 'name-directory', `name "${name}" does not match the directory "${skill}"`));
  }

  if (typeof description !== 'string' || description.trim() === '') {
    issues.push(issue('error', 'description', 'description is required and must be text'));
  } else {
    if (description.length > DESCRIPTION_MAX) {
      issues.push(issue('error', 'description', `description is ${description.length} characters; the limit is ${DESCRIPTION_MAX}`));
    }
    const packaged = parseSkillFrontmatter(path.join(skillDir, 'SKILL.md')).description;
    if (!packaged) {
      issues.push(issue('error', 'description-style', 'description must be an inline scalar or a folded (`>`) block; the packaged plugin cannot read any other style'));
    }
    if (!/\b(use (this |it )?(when|for|whenever|to|before|after)|when (the|a|an|you|asked)|trigger)/i.test(description)) {
      issues.push(issue('warning', 'description-no-trigger', 'description does not say when to use the skill'));
    }
  }

  if (strict) {
    if (typeof frontmatter.license !== 'string' || frontmatter.license.trim() === '') {
      issues.push(issue('error', 'license', 'missing required field: license'));
    }
    if (frontmatter.version !== undefined) {
      issues.push(issue('error', 'top-level-version', 'top-level version is not part of the Agent Skills specification; move it to metadata.version'));
    }
    const metadata = frontmatter.metadata && typeof frontmatter.metadata === 'object' ? frontmatter.metadata : {};
    if (typeof metadata.version !== 'string' || metadata.version.trim() === '') {
      issues.push(issue('error', 'metadata-version', "missing required field: metadata.version (a quoted string, e.g. '1.0.0')"));
    }
    const tags = typeof metadata.tags === 'string' ? metadata.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    if (tags.length === 0) {
      issues.push(issue('error', 'metadata-tags', 'missing required field: metadata.tags (a non-empty comma-separated string; a list is not allowed by the specification)'));
    }
  } else if (!frontmatter.license) {
    issues.push(issue('warning', 'license', 'missing recommended field: license'));
  }

  if (!body || body.trim() === '') issues.push(issue('error', 'body', 'SKILL.md body cannot be empty'));
  if (lines > LINES_RECOMMENDED) {
    issues.push(issue('warning', 'skill-length', `SKILL.md is ${lines} lines; move detail to references/ (recommended limit ${LINES_RECOMMENDED})`));
  }

  for (const file of nonNodeScripts(skillDir)) {
    issues.push(issue('error', 'non-node-script', `${file} is not a Node script; this pack runs on Windows with Node as the only runtime`));
  }

  return { skill, issues };
}

/** Every directory directly under `skillsRoot` that holds a SKILL.md, sorted. */
export function skillDirectories(skillsRoot) {
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
    .map(entry => path.join(skillsRoot, entry.name))
    .sort();
}

/** Validates the given skill directories and totals the result. */
export function validateSkills(directories, options = {}) {
  const results = directories.map(directory => validateSkill(directory, options));
  const count = severity => results.reduce((total, result) => total + result.issues.filter(entry => entry.severity === severity).length, 0);
  return { results, skills: results.length, errors: count('error'), warnings: count('warning') };
}
