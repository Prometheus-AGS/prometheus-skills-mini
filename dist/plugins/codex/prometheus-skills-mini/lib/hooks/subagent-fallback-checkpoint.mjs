// SubagentStop: the backstop when no agent-specific checkpoint matched. Ported
// as 15 lines of bash; the `date -u` call becomes toISOString().
//
// Note it currently has nothing to fall back FROM: the four dispatch/checkpoint
// pairs it backstops are evolver-owned and deferred to a later phase. It is
// included because it is dependency-free and leaving a gap in SubagentStop
// coverage is worse than a hook that reports little.
import { findProjectRoot, degradeSafely, cwdOf } from './context.mjs';

export async function run(payload) {
  return degradeSafely(payload.hookId, async () => {
    const agent =
      typeof payload.input?.subagent_name === 'string' ? payload.input.subagent_name : 'unknown';
    const at = new Date().toISOString();

    process.stderr.write(`SubagentStop checkpoint: agent=${agent} at=${at}\n`);

    return { agent, at, projectRoot: findProjectRoot(cwdOf(payload.input)) };
  });
}
