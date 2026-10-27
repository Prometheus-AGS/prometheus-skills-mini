// PreCompact: same adapter as SessionStart, because a compaction drops standing
// policy exactly as a new session does — the position has to be re-anchored on
// both. Declared at 1000 ms.
import { methodReanchorLines } from './method-reanchor.mjs';
import { findProjectRoot, readProjectId, isPaused, degradeSafely, cwdOf } from './context.mjs';

export async function run(payload) {
  return degradeSafely(payload.hookId, async () => {
    const projectRoot = findProjectRoot(cwdOf(payload.input));
    const paused = isPaused(projectRoot);

    if (paused) {
      process.stderr.write(
        'KBD REANCHOR: pause advisory is active after compaction. Confirm intent before advancing planned work.\n',
      );
    }

    for (const line of methodReanchorLines(projectRoot)) process.stderr.write(`${line}\n`);

    return { projectRoot, projectId: readProjectId(projectRoot), paused };
  });
}
