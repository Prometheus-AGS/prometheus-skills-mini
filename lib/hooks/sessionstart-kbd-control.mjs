// SessionStart: the bounded KBD session adapter. Declared at 1000 ms, so it
// imports only what it needs — Node cold start is already most of that budget.
import { findProjectRoot, readProjectId, isPaused, degradeSafely, cwdOf } from './context.mjs';

export async function run(payload) {
  return degradeSafely(payload.hookId, async () => {
    const projectRoot = findProjectRoot(cwdOf(payload.input));
    const paused = isPaused(projectRoot);

    if (paused) {
      // Advisory only: it re-anchors the operator, it does not intercept tools.
      process.stderr.write(
        'KBD REANCHOR: pause advisory is active. Confirm intent before advancing planned work; tools remain available.\n',
      );
    }

    return { projectRoot, projectId: readProjectId(projectRoot), paused };
  });
}
