# Windows evidence — platform-foundation

Every Windows behaviour this phase claims, with the run, job, Node version and result that prove it.
Test lines are copied verbatim from the job log; none is paraphrased.

- **Run:** [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) — all six jobs green
- **Windows jobs:** [node 22](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549612) · [node 24](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594)
- **Suite on `windows-latest · node 22`:** `# tests 88 / # pass 88 / # fail 0 / # skipped 0` — nothing
  skipped, so every win32-only test genuinely executed
- **Repository:** `Prometheus-AGS/prometheus-skills-mini` (public); prerequisite P2 met 2026-09-21

## Per-claim evidence

| Claim | Asserting test, verbatim | Run | Job | Result | Node 24 |
|---|---|---|---|---|---|
| Bounded EPERM/EBUSY/EACCES retry replaces a destination another process holds open | `ok 12 - a destination held open by another process is still replaced` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| A pre-existing file at the temporary path is never truncated | `ok 10 - a pre-existing file in the target directory is never truncated by the temporary write` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| `wx` lock: held, then gone after release | `ok 13 - the lock file exists while held and is gone after release` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| `wx` lock: a second acquisition is refused and names the file | `ok 14 - a second acquisition fails immediately and names the lock file` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| `wx` lock: release cannot delete a newer holder's lock | `ok 18 - release does not delete a lock that another acquisition now holds` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| An npm CLI runs with no global install (emptied PATH) | `ok 29 - the CLI runs with an emptied PATH, proving no global install is used` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| A bare name resolving to `.cmd` via PATHEXT is refused, not spawned | `ok 34 - a bare name that can only resolve to a .cmd on PATH is refused, not spawned` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| A CRLF checkout reports "current", not spurious drift | `ok 39 - a CRLF checkout is reported as current, not as drift` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |
| `splitFrontmatter` parses CRLF input | `ok 57 - splitFrontmatter tolerates CRLF line endings` | [35585743561](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561) | `windows-latest · node 22` | PASS | `node 24`: same suite, job [106288549594](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35585743561/job/106288549594) step `node --test` → success |

## Per-step results, both Node versions

Taken from the GitHub API (`actions/jobs/<id>`), which is authoritative for step conclusions.

| Step | `node 22` | `node 24` |
|---|---|---|
| `npm ci` | success | success |
| `node --test` | success | success |
| `node rules/build.mjs --check` | success | success |
| `npm run coverage` | success | success |
| `node scripts/spec-validate.mjs` | success | success |

`npm ci` on `node 22`, verbatim: `added 79 packages, and audited 80 packages in 8s`.

## Whole-job evidence (`node 22` log)

| Claim | Verbatim |
|---|---|
| The rules build is clean on a checkout made with `core.autocrlf=true` | `rules/build: ✓ 19 files current (1 mirror of CLAUDE.md); CLAUDE.md 57/120 lines, 10502/12500 chars` |
| `rules/build.mjs` coverage is real on Windows, not only macOS | `rules/build.mjs: 102/102 lines = 100.00%` |
| OpenSpec validation runs shell-free through `scripts/spec-validate.mjs` | `Totals: 8 passed, 0 failed (8 items)` |

The Windows legs set `git config --global core.autocrlf true` **before** `actions/checkout`, so the
line-ending work is tested against the default most likely to break it.

### A limitation of this evidence, stated rather than hidden

The `node 24` job's downloadable log contains its step names but **not** its test output — it is
truncated, and re-fetching through the API returned an empty body. So for `node 24` the evidence is
the API's per-step conclusion (`node --test → success`), not a verbatim `ok N -` line per claim. That
is weaker than the `node 22` evidence and is marked as such rather than described as "identical".

## What CI found that this machine could not

1. **A spec defect invisible locally.** The first run failed all six jobs: a MODIFIED delta in
   `platform-spawn` omitted two scenarios its requirement still had. It became detectable only once
   `ci-three-os` archived and made its spec canonical.
2. **Windows really does raise `EPERM` on a rename over a held handle**, and the original retry
   window was too short — 10 ms × 4 (150 ms) was guessed on macOS, where the failure cannot occur.
   Now 25 ms × 6 (~1.575 s). Failing run:
   [35581871347](https://github.com/Prometheus-AGS/prometheus-skills-mini/actions/runs/35581871347).
3. **A test that could not fail.** Its handle release used `setTimeout`, which can never fire —
   `atomicWrite` is synchronous and blocks the event loop for the whole retry window. The holder is
   now a separate process that signals readiness on stdout.

## Claims deliberately NOT made

- **Node 26.** This host runs it; CI covers 22 and 24, the range `engines.node` declares.
- **Windows without Docker Desktop's backend.** No service in this phase needs Docker; that belongs
  to the `docker-services` phase.
- **Real antivirus or indexer interference.** The retry is proven against a deliberately held handle
  — the same mechanism, not a live scanner.
