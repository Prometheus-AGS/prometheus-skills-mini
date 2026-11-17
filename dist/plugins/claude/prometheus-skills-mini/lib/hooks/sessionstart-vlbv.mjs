// SessionStart: state the verification method.
//
// VLBV is the verification method for KBD processes. The `vlbv` skill carries the
// full text, but a skill loads only when the model picks it, and its measured
// trigger rate in the full pack was zero. This hook puts the short boundary rule
// into the session so the default does not depend on skill selection. A port of
// the full pack's shared/scripts/sessionstart-vlbv.sh.
//
// Scope (mode), first match wins:
//   1. PROMETHEUS_VLBV_DEFAULT                    environment variable
//   2. <project>/.prometheus/vlbv-default         one word, per project
//   3. <home>/.prometheus/config/vlbv-default     one word, per user
//   4. kbd                                        built-in default
//
//   kbd     print the rule only in a KBD-managed project (a .kbd-orchestrator
//           directory at or above the project directory). Silent elsewhere.
//   always  print the rule in every session.
//   off     never print it.
//
// It is an instruction, not an interception: nothing is blocked. The rule goes to
// STDOUT, because that is what a harness adds to the session; stderr never reaches
// the model. The text never begins with `{`, which Codex would parse as a
// structured response.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readText } from '../platform/text.mjs';
import { homeDir } from '../platform/paths.mjs';
import { degradeSafely, cwdOf } from './context.mjs';

export const MODES = Object.freeze(['kbd', 'always', 'off']);
const DEFAULT_MODE = 'kbd';

const normalise = (value) => (typeof value === 'string' ? value.replace(/\s+/g, '').toLowerCase() : '');

// A one-word settings file; empty when it is absent or unreadable.
const modeFile = (file) => {
  try {
    return existsSync(file) ? normalise(readText(file)) : '';
  } catch {
    return '';
  }
};

/** The mode in force, and where it came from. An unrecognised value falls back to the default. */
export function resolveMode({ env = process.env, projectDir, home = homeDir() }) {
  const candidates = [
    ['environment', normalise(env.PROMETHEUS_VLBV_DEFAULT)],
    ['project', modeFile(path.join(projectDir, '.prometheus', 'vlbv-default'))],
    ['user', modeFile(path.join(home, '.prometheus', 'config', 'vlbv-default'))],
  ];
  const [source, value] = candidates.find(([, candidate]) => candidate !== '') ?? ['default', DEFAULT_MODE];
  return MODES.includes(value) ? { mode: value, source } : { mode: DEFAULT_MODE, source: 'default' };
}

/** True when `.kbd-orchestrator` exists at or above `start`. Stops at the drive or filesystem root. */
export function isKbdProject(start) {
  let cursor = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(cursor, '.kbd-orchestrator'))) return true;
    const parent = path.dirname(cursor);
    if (parent === cursor) return false;
    cursor = parent;
  }
}

const RULE = [
  'Applies whenever you test, build, lint, type-check or otherwise validate code written in this session, unless the operator names a different method.',
  '- Agree the scenarios before generating. Write the whole agreed increment without executing generated code: no tests, builds, compiler checks, lint or type checks along the way. Editor and LSP diagnostics are static reading and stay available.',
  '- At the value-phase boundary (B4), run the boundary packet once. After a FAIL, rerun only the affected scenarios, and only as an operator-authorized repair (B5).',
  '- Report each scenario as exactly one of PASS, FAIL, BLOCKED or NOT_EXERCISED, and claim only what the evidence supports.',
  '- Load the `vlbv` skill before any verification step for the full method.',
  'Operator override: if the operator asks for another approach (for example test-first, or running checks after each edit), follow theirs and say that VLBV is not being applied. A signed KBD-METHOD decision for the phase takes precedence.',
];

/** The text to print, or null when this session gets none. */
export function ruleText({ mode, kbdProject }) {
  if (mode === 'off') return null;
  if (kbdProject) {
    return ['This is a KBD-managed project, so VLBV (Value-Led Behavioral Verification) is the verification method.', ...RULE].join('\n');
  }
  if (mode === 'always') {
    return ['VLBV (Value-Led Behavioral Verification) is enabled as the verification method for this session by configuration.', ...RULE].join('\n');
  }
  return null;
}

export async function run(payload, options = {}) {
  return degradeSafely(payload.hookId, async () => {
    const env = options.env ?? process.env;
    const projectDir = env.CLAUDE_PROJECT_DIR || cwdOf(payload.input);
    const { mode, source } = resolveMode({ env, projectDir, home: options.home ?? homeDir() });
    const kbdProject = mode === 'off' ? false : isKbdProject(projectDir);
    const text = ruleText({ mode, kbdProject });
    if (text) (options.stdout ?? process.stdout).write(`${text}\n`);
    return { mode, source, kbdProject, printed: Boolean(text) };
  });
}
