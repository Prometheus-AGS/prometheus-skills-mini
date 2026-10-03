// The single file `hooks/hooks.json` names. The harness starts it as
// `node scripts/hook-entry.mjs --hook <id> --harness <name>` in exec form, so no
// shell is ever in the path — that is what C1 and C3 require and what the
// exec-form probe confirmed on this harness.
//
// Dispatch is in-process: the id selects a loader from a STATIC map. The map is
// static rather than a computed `await import()` because a static map is what
// makes the manifest test expressible — it can assert that every id in
// hooks.json has an entry without executing dispatch. The source pack once
// shipped a payload whose entry file was never packaged, which broke every hook
// in Node's loader before any of its own code ran; only a check that reads the
// manifest catches that, and only a static map lets the check see the ids.
import { readFileSync, fstatSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Keys are the `--hook` argument, NEVER the matcher-level `id`. `id` is a
// property of the matcher, and a matcher holds 1-6 hooks, so it cannot address
// an individual hook: upstream it is present on 4 of 14 matcher entries while
// all 31 hooks carry `--hook`. The two spellings also differ
// (`sessionstart:kbd-control` vs `sessionstart-kbd-control`).
export const HOOK_MODULES = {
  'sessionstart-kbd-control': () => import('../lib/hooks/sessionstart-kbd-control.mjs'),
  'sessionstart-detect-project-context': () =>
    import('../lib/hooks/sessionstart-detect-project-context.mjs'),
  'posttool-write-position-reminder': () =>
    import('../lib/hooks/posttool-write-position-reminder.mjs'),
  'subagent-fallback-checkpoint': () => import('../lib/hooks/subagent-fallback-checkpoint.mjs'),
  'taskcompleted-kbd-receipt': () => import('../lib/hooks/taskcompleted-kbd-receipt.mjs'),
  'precompact-kbd-control': () => import('../lib/hooks/precompact-kbd-control.mjs'),
};

const valueAfter = (args, flag) => {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
};

// The harness delivers JSON on stdin; the orchestrator path delivers nothing.
// Both are normal, so neither may throw and neither may hang.
//
// `readFileSync(0)` blocks until EOF, so it is safe only when fd 0 is a pipe or a
// regular file that the caller will close. On a terminal — or on any fd that
// stays open — it waits forever. That is not hypothetical: it hung this
// project's own in-process dispatch test, which spawns nothing and so inherits
// the test runner's stdin. Only a pipe or a file is read; anything else yields
// no input, which parseInput already treats as the ordinary empty case.
const readStdin = () => {
  try {
    const stat = fstatSync(0);
    if (!stat.isFIFO() && !stat.isFile()) return '';
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

const parseInput = (raw) => {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Malformed input is the harness's problem, not a reason to fail the hook.
    return {};
  }
};

export async function dispatch(args, options = {}) {
  const modules = options.modules ?? HOOK_MODULES;
  const hookId = valueAfter(args, '--hook');

  if (!hookId) {
    process.stderr.write('hook-entry: --hook <id> is required\n');
    return 2;
  }

  const loader = modules[hookId];
  if (!loader) {
    process.stderr.write(
      `hook-entry: unknown hook id "${hookId}"; hooks.json and the import map disagree\n`,
    );
    return 2;
  }

  const payload = {
    hookId,
    harness: valueAfter(args, '--harness') ?? 'unknown',
    input: parseInput(options.stdin ?? readStdin()),
  };

  try {
    // Every map entry is a loader returning a module with a `run` export — the
    // same shape in tests as in production, so a test cannot pass against a
    // shape the harness never delivers.
    const loaded = await loader();
    if (typeof loaded?.run !== 'function') {
      process.stderr.write(`hook-entry: ${hookId} exports no run function\n`);
      return 0;
    }
    await loaded.run(payload);
    return 0;
  } catch (error) {
    // A hook signals; it does not gate. A missing service, an absent optional
    // binary or a throwing payload is a degradation to report, never a failed
    // hook — otherwise an optional service would become mandatory.
    process.stderr.write(`hook-entry: ${hookId} degraded: ${error.message}\n`);
    return 0;
  }
}

// Compare resolved real PATHS, not URL strings. Two independent things break a
// URL comparison here, and a wrong answer is silent: dispatch is skipped, the
// process still exits 0, and the harness reports success with every hook a no-op.
//
//  1. `file://${path}` truncates at '#' or '?' (they become a fragment or query)
//     and double-encodes '%'. Adversarial review caught this.
//  2. Even with pathToFileURL, `import.meta.url` reports the REALPATH while
//     argv[1] keeps the symlinked path — on macOS /var is a symlink to
//     /private/var, so the two differ for anything under a temp directory.
//     Found by the test written for (1), which still failed after fixing it.
//
// realpathSync collapses both. It throws only if the file vanished between spawn
// and this line, which cannot happen for the script currently executing.
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  process.exitCode = await dispatch(process.argv.slice(2));
}
