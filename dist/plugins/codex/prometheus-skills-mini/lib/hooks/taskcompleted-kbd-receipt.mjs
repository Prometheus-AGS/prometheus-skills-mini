// TaskCompleted: records a receipt for the completed task. Declared at 1000 ms.
//
// Upstream parses the harness payload with jq and then shells out to
// `prometheus kbd status --json`; here the payload is already parsed JSON and the
// receipt is written without a child process, so the hook stays inside its budget
// and needs no external binary.
import { findProjectRoot, readProjectId, degradeSafely, cwdOf } from './context.mjs';

export async function run(payload) {
  return degradeSafely(payload.hookId, async () => {
    const input = payload.input ?? {};
    const taskId = typeof input.task_id === 'string' ? input.task_id : null;
    const subject = typeof input.task_subject === 'string' ? input.task_subject : null;
    const projectRoot = findProjectRoot(cwdOf(input));

    return {
      taskId,
      subject,
      projectRoot,
      projectId: readProjectId(projectRoot),
      at: new Date().toISOString(),
    };
  });
}
