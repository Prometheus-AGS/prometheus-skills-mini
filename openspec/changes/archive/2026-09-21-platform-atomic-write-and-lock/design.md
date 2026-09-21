## Context

`rules/build.mjs` has a private six-line atomic write with no retry and is imported by no test, so it is absent from the coverage report. The phase goal names a bounded `EPERM`/`EBUSY` retry explicitly; analysis first deferred it as "unobserved" and review corrected that — an explicit requirement is admissible under A-2. Candidates: cand-001 (build), cand-002 and cand-003 (reference only), cand-004 (build), cand-005 (rejected).

## Goals / Non-Goals

**Goals**
- Never a half-written state file.
- The Windows retry, exactly bounded, unit-tested on every OS and validated for real on `windows-latest`.
- `rules/build.mjs` under test.

**Non-Goals**
- Stale-lock recovery, lock waiting, cross-machine locking.
- Retrying on any platform but `win32` or for any other error.
- A dependency: `write-file-atomic` and `graceful-fs` are read for prior art, not installed.

## Decisions

- **Inject `{ rename, writeFile, rm, platform, sleep }`** — lets the retry be asserted deterministically on macOS and Linux by fault injection, with no real delays in unit tests. *Alternative considered:* mocking `node:fs` globally — rejected, hidden global state.
- **A separate `win32`-only test for the real behaviour** — fault injection proves the loop, not that Windows actually raises these codes; only a held-open handle on a Windows runner does. It is skipped, not faked, elsewhere.
- **`EACCES` alongside `EPERM` and `EBUSY`** — the prior art treats all three as the same transient sharing violation on Windows.
- **Wire the lock into the rules build** — the lock's real consumers arrive in a later phase; without a consumer here it would be tested dead code (A-9). A single-writer build guard is a legitimate use (A-10). *Alternative considered:* defer the lock to that phase — a valid owner choice that would need a second goal revision.

## Risks / Trade-offs

- The lock is the weakest-justified item in the phase; stated in the plan.
- A crashed write run leaves the lock behind and blocks the next one until a human removes it. That is the stated non-guarantee, and the error says which file.
- Attempt count and delays are guesses until `windows-latest` has run; `windows-evidence` may tune them.
