// Detects project context at session start.
// Section 4 gives this its behaviour and its degradation test. Until then it is a
// resolvable no-op: the manifest must never name a file that does not exist.
export async function run(payload) {
  return { hookId: payload.hookId, status: 'noop' };
}
