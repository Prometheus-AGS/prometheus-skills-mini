# Windows evidence — platform-foundation

Every Windows behaviour this phase claims, with the run and the asserting test that proves it.
Lines in the table are copied verbatim from the job log; none is paraphrased.

- **Run:** [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) · commit `0dc907e2` · all six jobs green
- **Job:** `windows-latest · node 22` (the `node 24` leg is identical)
- **Suite on Windows:** # tests 88, # pass 88, # fail 0, # skipped 0 — **nothing skipped**, so every win32-only test genuinely executed
- **Repository:** `Prometheus-AGS/prometheus-skills-mini` (public); prerequisite P2 met 2026-09-21

## Per-claim evidence

| Claim | Asserting test, verbatim from the Windows job log |
|---|---|
| Bounded EPERM/EBUSY/EACCES retry replaces a destination another process holds open | `ok 12 - a destination held open by another process is still replaced` |
| A pre-existing file at the temporary path is never truncated | `ok 10 - a pre-existing file in the target directory is never truncated by the temporary write` |
| `wx` lock: held then released | `ok 13 - the lock file exists while held and is gone after release` |
| `wx` lock: a second acquisition is refused and names the file | `ok 14 - a second acquisition fails immediately and names the lock file` |
| `wx` lock: release cannot delete a newer holder's lock | `ok 18 - release does not delete a lock that another acquisition now holds` |
| An npm CLI runs with no global install (emptied PATH) | `ok 29 - the CLI runs with an emptied PATH, proving no global install is used` |
| A bare name resolving to `.cmd` via PATHEXT is refused, not spawned | `ok 34 - a bare name that can only resolve to a .cmd on PATH is refused, not spawned` |
| A CRLF checkout reports "current", not spurious drift | `ok 39 - a CRLF checkout is reported as current, not as drift` |
| `splitFrontmatter` parses CRLF input | `ok 57 - splitFrontmatter tolerates CRLF line endings` |

## Whole-job evidence

| Claim | Verbatim |
|---|---|
| The rules build is clean on a Windows checkout made with `core.autocrlf=true` | `rules/build: ✓ 19 files current (1 mirror of CLAUDE.md); CLAUDE.md 57/120 lines, 10502/12500 chars` |
| `rules/build.mjs` coverage is real on Windows, not only macOS | `rules/build.mjs: 102/102 lines = 100.00%` |
| OpenSpec validation runs shell-free through `scripts/spec-validate.mjs` | `Totals: 8 passed, 0 failed (8 items)` |

The Windows legs set `git config --global core.autocrlf true` **before** `actions/checkout`, so the
line-ending work is tested against the default most likely to break it rather than a friendly one.

## What CI found that this machine could not

1. **A spec defect invisible locally.** The first run failed all six jobs: a MODIFIED delta in
   `platform-spawn` omitted two scenarios its requirement still had. It only became detectable once
   `ci-three-os` archived and made its spec canonical.
2. **Windows really does raise `EPERM` on a rename over a held handle**, and the original retry
   window was too short. 10 ms × 4 (150 ms) was a number guessed on macOS, where the failure cannot
   occur; it is now 25 ms × 6 (~1.575 s). The failing run is
   [35581871347](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35581871347).
3. **A test that could not fail.** Its handle-release used `setTimeout`, which can never fire —
   `atomicWrite` is synchronous and blocks the event loop for the whole retry window. The holder is
   now a separate process that signals readiness on stdout.

## Claims deliberately NOT made

- **Node 26.** The development host runs it; CI covers 22 and 24 (the supported LTS range, which
  `engines.node` declares). Node 26 is untested and unclaimed.
- **Windows without Docker Desktop's backend.** No service in this phase needs Docker, so nothing
  here exercises it. That belongs to the `docker-services` phase.
- **Real antivirus or indexer interference.** The retry is proven against a deliberately held
  handle, which is the same mechanism, not against a live scanner.
