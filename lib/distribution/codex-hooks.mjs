// Derives the Codex `hooks/hooks.json` from the Claude one, so both harnesses are generated
// from the single hook source (hooks/hooks.json) and cannot drift.
//
// Three things differ for Codex, each verified against codex-cli 0.158.0 (and recorded by the
// full pack in its commit abf0ade):
//   1. Codex ignores `args`. An exec-form entry never runs, so each hook is ONE command string.
//      Every token is fixed and whitespace-free, so it does not matter whether Codex hands the
//      string to a shell -- no user input, no quoting, no metacharacters.
//   2. Codex reads `timeout` as MILLISECONDS; Claude Code reads seconds. Starting hook-entry takes
//      about a second, so Codex timeouts have a 5000 ms floor.
//   3. `--harness` is rewritten from claude-code to codex.
// A group whose event Codex has no equivalent for is left out (see CLAUDE_ONLY_EVENTS), and so is
// any individual hook that only serves Claude (see CLAUDE_ONLY_HOOKS).

export const CODEX_MIN_HOOK_TIMEOUT_MS = 5000;

// TaskCompleted is a Claude Code event; Codex has none, so the entry could never fire. The full
// pack filters the same group out of its Codex output (`harnesses: ["claude-code"]`).
export const CLAUDE_ONLY_EVENTS = Object.freeze(['TaskCompleted']);

// Per-hook filter, keyed by the `--hook` id. `subagentstart-learning` reads Claude's auto-memory file
// tier, returns immediately for any harness other than claude-code (lib/hooks/subagentstart-learning.mjs),
// and signals by printing `{"hookSpecificOutput":...}` on stdout, which Codex parses as a structured
// response and can fail the hook. Under Codex it could only ever do nothing, so it is not shipped.
export const CLAUDE_ONLY_HOOKS = Object.freeze(['subagentstart-learning']);

const hookIdOf = (hook) => {
  const at = hook.args.indexOf('--hook');
  return at >= 0 ? hook.args[at + 1] : undefined;
};

// `${CLAUDE_PLUGIN_ROOT}` is substituted by Codex (which also exports PLUGIN_ROOT); it is the
// only metacharacter sequence a token may contain.
const SAFE_TOKEN = /^(?:\$\{CLAUDE_PLUGIN_ROOT\}\/)?[A-Za-z0-9._\/-]+$/;

function codexHook(hook, where) {
  if (hook.type !== 'command' || typeof hook.command !== 'string' || !Array.isArray(hook.args)) {
    throw new Error(`${where}: expected an exec-form command hook (command + args)`);
  }
  const argv = hook.args.map((arg) => (arg === 'claude-code' ? 'codex' : arg));
  for (const token of [hook.command, ...argv]) {
    if (!SAFE_TOKEN.test(token)) {
      throw new Error(`${where}: token ${JSON.stringify(token)} is not a fixed whitespace-free token`);
    }
  }
  const emitted = { type: 'command', command: [hook.command, ...argv].join(' ') };
  if (hook.timeout !== undefined) {
    emitted.timeout = Math.max(hook.timeout * 1000, CODEX_MIN_HOOK_TIMEOUT_MS);
  }
  return emitted;
}

/** Converts the parsed Claude hooks document into the parsed Codex one. */
export function codexHooksDocument(claudeHooks) {
  const hooks = {};
  for (const [event, groups] of Object.entries(claudeHooks.hooks ?? {})) {
    if (CLAUDE_ONLY_EVENTS.includes(event)) continue;
    const kept = groups
      .map((group, index) => ({
        ...group,
        hooks: group.hooks
          .filter((hook) => !CLAUDE_ONLY_HOOKS.includes(hookIdOf(hook)))
          .map((hook, at) => codexHook(hook, `${event}[${index}].hooks[${at}]`)),
      }))
      .filter((group) => group.hooks.length > 0);
    if (kept.length > 0) hooks[event] = kept;
  }
  return { hooks };
}
