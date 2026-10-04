// SubagentStart, Claude Code only: deliver the file-tier lessons directed to the
// subagent's team role (design §5 and §9). Emits
//   {"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":...}}
// and nothing else. No team, no resolved role, no files, another harness, or any
// error: it prints NOTHING and the hook exits 0 — absence is the normal case
// (integration contract), so it never reports a degradation either.
import { homeDir } from '../platform/paths.mjs';
import { roleResolved } from '../learning/envelope.mjs';
import { fileTierContext } from '../learning/file-tier.mjs';
import { baseDirOf, findTeamRoot, resolveIdentity } from '../learning/identity.mjs';
import { cwdOf } from './context.mjs';

export async function run(payload) {
  try {
    if (payload?.harness !== 'claude-code') return { hookId: payload?.hookId, status: 'skipped' };
    const input = payload.input ?? {};
    const base = baseDirOf(input, cwdOf(input));
    // Checked before identity resolution, which may spawn git and the runtime CLI:
    // a project with no team pays for nothing.
    const projectRoot = findTeamRoot(base);
    if (!projectRoot) return { hookId: payload.hookId, status: 'skipped' };
    const identity = resolveIdentity(input, base);
    if (!roleResolved(identity)) return { hookId: payload.hookId, status: 'skipped' };
    const additionalContext = fileTierContext({ identity, projectRoot, home: homeDir() });
    if (!additionalContext) return { hookId: payload.hookId, status: 'skipped' };
    process.stdout.write(
      `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext } })}\n`,
    );
    return { hookId: payload.hookId, status: 'ok', chars: additionalContext.length };
  } catch {
    return { hookId: payload?.hookId, status: 'skipped' };
  }
}
