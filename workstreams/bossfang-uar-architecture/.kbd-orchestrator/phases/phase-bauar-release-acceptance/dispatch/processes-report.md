# Owned process runner source handoff

Canonical parent task: phase-bauar-release-acceptance / bauar-acc-03-local-acceptance-evidence / backend1 (Spec1.1). This is a disjoint production subassignment, not a separate canonical task.

Status: source delivered only. No runtime PASS, compilation, product review or test evidence.

## Exact source manifest

- Path: /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/acceptance/lib/processes.mjs
- SHA-256: 9db8c0af6ae9182b0f62c6a1efe889b1ff71f3f0d4c3b27d7b5e3e856b20e179
- Bytes: 7304
- Lines: 194
- Other owned write: /Users/gqadonis/.codex/worktrees/bossfang-uar-architecture/prometheus-skills-mini/workstreams/bossfang-uar-architecture/.kbd-orchestrator/phases/phase-bauar-release-acceptance/dispatch/processes-report.md (this report).

## Exported contract

runOwned({program,args,cwd,env,budgetMs,outputPolicy}) returns {exitCode,signal,startedAt,endedAt,pid,category,observations,cleanup}. Category is completed, spawn_failed, timed_out, cancelled, output_policy_failed or cleanup_unknown. The lead explicitly approved output_policy_failed for parser/result/ledger-hook failures during this assignment. Cleanup contains groupAbsent, gracefulStopAttempted, forcedStopAttempted and unknownDescendants.

outputPolicy.observeLine(stream,line) receives transient complete lines and a final unterminated line. Each stdout/stderr buffer is bounded to 256KiB. Oversize lines stop processing and the owned group, with outputLineOverflows counted. outputPolicy.result() is synchronous and must produce a flat object of booleans or finite numbers; runner adds outputBytes, outputLineOverflows and outputPolicyFailed. No child text, exception messages or supplied credentials are logged or persisted by this module.

Optional async outputPolicy.onStarted({pid,startedAt}) runs after the actual spawn event. A normal completed outcome waits for both child exit and successful hook resolution. Hook rejection stops the group and records output_policy_failed. An incomplete hook at budget/cancellation is also an evidence failure; the runner does not wait indefinitely for the hook. The callback signature cannot cancel arbitrary work within a hanging hook; the caller owns that implementation, and an unresolved callback may still finish later. This limitation was messaged to the lead.

## Required behaviors implemented

- Node built-ins only; explicit argv; shell:false; detached POSIX group; stdin ignored and stdout/stderr piped only into transient parsers.
- Supplied env is copied without process.env merge. Missing/non-string env values are refused before launch to prevent Node's ambient credential fallback. Absolute program/cwd, string argv and a finite positive timer-compatible budget are required at this real tool-execution boundary. Windows launch is refused; this module makes no Windows execution claim.
- SIGINT/SIGTERM and the phase supervision budget stop only the spawned negative-PID process group. Normal child exit also checks the group and stops remaining group members.
- Cleanup observes group presence with process.kill(-pid,0), sends group SIGTERM when necessary, allows ten seconds for observed disappearance, then sends SIGKILL only to the same owned group and observes for up to two more seconds. Errors are retained only as uncertainty, never raw text.
- Missing group is identified by ESRCH; other probe failures cannot become groupAbsent. Unobserved group disappearance yields cleanup_unknown/unknownDescendants.
- Child close is observed for up to two seconds after group handling; inherited pipes that outlive the observed group mark unknownDescendants rather than proving cleanup. Open local pipe handles are destroyed and an unexited child handle unreferenced so uncertainty can be returned.
- Signal listeners and timers are removed after supervision. Known output/ledger failure remains separate from actual cleanup booleans; cleanup uncertainty takes precedence in category when both occur.

## Assumptions and precise limits

The owned PGID is the detached child's PID. Signals target that group only, not process names, shared services, installed apps, or arbitrary discovered PIDs. Descendants are expected to remain within that group; the runner does not assert universal discovery of a descendant that deliberately starts a separate session and closes inherited pipes. The result exposes group absence and detectable open-pipe uncertainty, not an OS-wide proof.

The coordinator exclusively owns command/env construction, immutable ledgers, finite parser logic, schemas, receipts and stage decisions. It must adjudicate nonzero exit, output_policy_failed and cleanup_unknown rather than treating any completed category as a scenario PASS. completed means the observed child exited and hook completed, regardless of exitCode; scenario acceptance requires separate real observations.

Failure handling traces to explicit brief/spec requirements: bounded output/no raw persistence, explicit private env, ledger failure, spawn failure, timeout/cancellation, actual group cleanup and incomplete evidence. No unrelated guard or product behavior was added.

## Evidence and deferred boundary

Read the exact processes brief, change03 design/tasks/verification, Plan global constraints and coordinator interfaces; inherited source-only KBD restrictions remain in force. Inspected adjacent records/environment contracts without changing them. The reserved processes.mjs was absent before creation. Hash and line count above are artifact identity only.

No tests, executable scenario authoring, builds, type/syntax/compiler checks, runtime gates, per-task product review, commits, canonical/task checkbox writes, or subagents were performed. No UAR paths were accessed. Five-production-task barrier status is owned by the lead; runtime E02 acceptance and independent cumulative review remain deferred.
