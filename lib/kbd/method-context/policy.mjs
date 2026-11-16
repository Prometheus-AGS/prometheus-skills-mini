// Method selection and governing-policy reading for the method-context index (VLBV CR-05,
// CR-25; port of the 1.15.0 additions to the full pack's shared/method-context.mjs).
//
// - Every phase uses VLBV unless a signed KBD-METHOD decision names a deviation; a project file
//   can pin VLBV but never deviate.
// - The governing files are those the active harness actually loads (its capability profile);
//   without a profile the historical mini file set is used and that is reported.
// - Policy is read from a marked `<!-- kbd-policy:begin/end -->` block; free-text matching is
//   only the fallback for files that predate the block.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { harnessProfile } from '../harness-profiles.mjs';

export const DEFAULT_METHOD = 'VLBV';

const CONSTRAINTS = '.kbd-orchestrator/constraints.md';
const DEFAULT_RULE_FILES = Object.freeze(['AGENTS.md', 'CLAUDE.md', CONSTRAINTS, '.claude/rules/rust.md', '.claude/rules/typescript.md']);
const POLICY_BLOCK = /<!--\s*kbd-policy:begin\s*-->([\s\S]*?)<!--\s*kbd-policy:end\s*-->/;
const COMPILER_EXCEPTION = /compiler.{0,100}(exception|unblock)|(?:narrow|targeted|intermediate|package-scoped).{0,60}compiler (?:check|run)/is;
const HOURLY_EXCEPTION = /(?:hourly|this hour).{0,160}(?:integration gate|delivery boundary)|(?:hourly|hour).{0,100}(?:test|verif)/is;

/**
 * The project's method pin: { method, source, rejected? }. Absent → pack default; "VLBV" →
 * project pin; anything else is rejected (a deviation needs a signed decision).
 */
export function projectMethodPin(root) {
  const file = path.join(root, '.kbd-orchestrator', 'project.json');
  try {
    const value = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).verificationMethod : undefined;
    if (value === undefined || value === null) return { method: DEFAULT_METHOD, source: 'pack-default' };
    if (value === DEFAULT_METHOD) return { method: DEFAULT_METHOD, source: 'project-pin' };
    return { method: DEFAULT_METHOD, source: 'project-pin-rejected', rejected: String(value) };
  } catch {
    return { method: DEFAULT_METHOD, source: 'pack-default' };
  }
}

/**
 * The governing rule files for `harness` (default PROMETHEUS_HARNESS):
 * { harness, profile: 'found' | 'not-found' | 'unavailable', files, shadowing }.
 */
export function effectiveRuleFiles(root, harness = process.env.PROMETHEUS_HARNESS, env = process.env) {
  const { harness: id, profile, availability } = harness ? harnessProfile(harness, env) : { harness: null, profile: null, availability: 'not-found' };
  const rules = profile?.rulesFiles;
  if (!Array.isArray(rules?.precedence)) {
    return { harness: id ?? null, profile: availability === 'unavailable' ? 'unavailable' : 'not-found', files: [...DEFAULT_RULE_FILES], shadowing: null };
  }
  const present = rules.precedence.filter((file) => existsSync(path.join(root, file)));
  let files = present;
  let shadowing = null;
  if (rules.firstMatchOnly) {
    files = present.slice(0, 1);
    if (present.length > 0 && present[0] !== 'AGENTS.md' && present.includes('AGENTS.md')) {
      shadowing = `${id} loads only ${present[0]}; AGENTS.md is shadowed and its policy is not applied by this host`;
    }
  }
  if (rules.overrideFile && existsSync(path.join(root, rules.overrideFile))) {
    shadowing = `${rules.overrideFile} replaces AGENTS.md for ${id}`;
  }
  return { harness: id, profile: 'found', files: [...new Set([...files, CONSTRAINTS])], shadowing };
}

/** Compiler/cadence exceptions a governing file grants: { marked, compiler, cadence }. */
export function policyExceptions(text) {
  const block = text.match(POLICY_BLOCK);
  if (block) {
    const value = (key) => (block[1].match(new RegExp(`^\\s*-?\\s*${key}:\\s*([A-Za-z-]+)`, 'mi')) ?? [])[1]?.toLowerCase();
    return { marked: true, compiler: value('compiler-exception') === 'allowed', cadence: value('cadence-exception') === 'allowed' };
  }
  return { marked: false, compiler: COMPILER_EXCEPTION.test(text), cadence: HOURLY_EXCEPTION.test(text) };
}
