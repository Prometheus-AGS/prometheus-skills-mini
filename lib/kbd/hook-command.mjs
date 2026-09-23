// The `runCommand` implementation every ported KBD entry point (kbd-next-child.mjs,
// kbd-child-exit.mjs, kbd-new-phase.mjs, kbd-next-phase.mjs, kbd-new-child.mjs, kbd-apply.mjs)
// passes to lib/kbd/hooks.mjs's `hooksFire`.
//
// hooks.mjs's own header comment already names the divergence this module implements: the
// source runs every hook `command` through `bash -c "$command"`. This repo's node-scripts.md
// constitution forbids shell-string execution outright ("spawn/spawnSync with shell:false and an
// args array. Never build a command string"), and the source pack's own builtin hooks.json ships
// genuine shell-string commands (conditionals, `&&`, quoting) that have no direct argv
// equivalent — porting THOSE specific commands is out of scope for this batch (C2 already ported
// hooks.mjs; a project that wants the source's builtin hooks re-authored as argv-shaped commands
// is a separate, explicit follow-up, not something this module can decide unilaterally).
//
// So this module supports exactly one hook-command shape going forward: a JSON string
// `{"program": "<name>", "args": [...]}`, spawned via `spawnExecutable` with no shell. Any other
// command string (including every one of the source's builtin shell-string hooks) is recognized
// as unsupported and skipped with a clear stderr note rather than mis-executed or silently
// dropped — matching the "on_failure: warn/ignore, never abort the driver" posture every ported
// script already follows for hook fires.

import { spawnExecutable } from '../platform/spawn.mjs';

function parseJsonCommand(command) {
  try {
    const parsed = JSON.parse(command);
    if (parsed && typeof parsed.program === 'string' && Array.isArray(parsed.args)) return parsed;
  } catch {
    // Not JSON — falls through to "unsupported".
  }
  return null;
}

/**
 * `ctx.runCommand(command, env, { timeout })` for `hooksFire`. Never throws — a hook failure
 * must never abort the driver that fired it.
 */
export async function runHookCommand(command, env, ctx = {}) {
  const spawn = ctx.spawn ?? spawnExecutable;
  const parsed = parseJsonCommand(command);
  if (!parsed) {
    return {
      status: 0,
      stdout: '',
      stderr: `hook command requires shell semantics and was not run: ${command}`,
    };
  }

  try {
    const result = spawn(parsed.program, parsed.args, { env: { ...process.env, ...env } });
    return { status: result?.status ?? 1, stdout: result?.stdout ?? '', stderr: result?.stderr ?? '' };
  } catch (error) {
    return { status: 1, stdout: '', stderr: String(error?.message ?? error) };
  }
}
