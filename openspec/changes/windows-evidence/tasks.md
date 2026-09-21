## 1. Precondition

- [x] 1.1 Confirm with the owner that a remote with GitHub Actions exists and that they have pushed; if not, STOP and report the phase as incomplete.

## 2. Observe

- [x] 2.1 Record in `evidence/windows.md`, for Node 22 and Node 24 on `windows-latest`: `npm ci`; `node --test`; checkout under `core.autocrlf=true` followed by `node rules/build.mjs --check`; the CRLF parser tests; the real held-open `atomicWrite` test; the `wx` lock tests; `spawnNodeCli` with `shell: false`; `node scripts/spec-validate.mjs`.
- [x] 2.2 For each row give the asserting test name, the run URL, the job name and the result.

## 3. Fix

- [x] 3.1 For each failing row: reproduce with a failing test, commit it, fix at the root cause, commit the fix, and re-run. Update the owning capability's delta spec in the same commit when a requirement changes.
- [x] 3.2 If the retry attempt count or delays needed tuning, record the observed timings that justified the new values.

## 4. Close

- [x] 4.1 Move the `README.md` §9 entries this phase settles from "unverified" to a link to the evidence; leave every other entry untouched.
- [x] 4.2 Mark any claim with no passing run as NOT MET with the reason.
- [x] 4.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `docs: record windows-latest evidence for platform-foundation`. Do not push.

> DONE (2026-09-21). Run 35585743561, all six jobs green; `windows-latest · node 22` reports
> **88 tests, 88 pass, 0 fail, 0 SKIPPED** — every win32-only test genuinely executed there.
>
> Task 3 (fix what Windows breaks) had nothing left to do AT THIS POINT, and that is not luck: the
> Windows failures were found and fixed inside the changes that caused them, because CI landed
> second by design. Two were real and neither was findable on macOS — `EPERM` on a rename over a
> held handle, which showed the retry window was a guess (150 ms → ~1.575 s); and a held-handle
> test whose `setTimeout` release could never fire against a synchronous write.
>
> The evidence file is generated from the job log verbatim: each row carries the `ok N - <name>`
> line that proves it, and the generator fails if any claim has no matching line.
>
> README updated: the status block now states what is built and verified rather than "planning",
> and §9 lists what this phase settled — while keeping Node 26, Docker on Windows, and the hook
> budgets explicitly unclaimed.
