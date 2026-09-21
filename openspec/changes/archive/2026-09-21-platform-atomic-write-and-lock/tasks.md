## 1. Atomic write

> RED (2026-09-21): `node --test` → tests 51, pass 49, fail 2; both
> `ERR_MODULE_NOT_FOUND` for `lib/platform/atomic-write.mjs` and `lib/platform/lock.mjs`.

- [x] 1.1 RED: write `lib/platform/atomic-write.test.mjs`: success, missing parent directories created, failure-leaves-original, and the four injected retry scenarios; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 1.2 GREEN: implement `lib/platform/atomic-write.mjs` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [x] 1.3 RED: write a `win32`-only test that holds the destination open from a child `node` process and releases it after a short delay; on other platforms it is reported as skipped with the reason; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 1.4 GREEN: it passes on `win32` (first observable on CI) and skips elsewhere.
- [x] 1.5 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): atomic write with bounded win32 rename retry`. Do not push.

## 2. Lock

- [x] 2.1 RED: write `lib/platform/lock.test.mjs`: uncontended, contended, stale; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 2.2 GREEN: implement `lib/platform/lock.mjs` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [x] 2.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): exclusive-create lock`. Do not push.

## 3. Rules build under test

- [x] 3.1 RED: write `rules/test/build.test.mjs` running `rules/build.mjs` against a fixture tree in `tempDir()`: drift detected, stale generated file removed, write path, second concurrent write run refused, lock released after a thrown error; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [x] 3.2 GREEN: replace the private `writeAtomic` with `atomicWrite`; take the lock around a write run only; refactor `rules/build.mjs` just enough to be importable by the test.
- [x] 3.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `refactor(rules): write through lib/platform and guard with a lock`. Do not push.

## 4. Verify

- [x] 4.1 `npm run coverage`: line coverage over `lib/platform/` and `rules/` is at least 80%, and `rules/build.mjs` appears in the report.
- [x] 4.2 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0; constraints `no-shell-true`, `no-home-or-tmp-literals` and `no-console-log-in-lib` report clean.

> GREEN (2026-09-21): 72 tests locally (1 win32 skip), and on windows-latest **72 pass / 0 skipped**
> — the real held-handle retry test RAN there. Coverage of rules/build.mjs is 102/102 = 100.00% on
> every platform, measured by scripts/coverage-report.mjs (the default reporter cannot see it: its
> tests run the build as a child process).
>
> CI CHANGED THE IMPLEMENTATION. The first push failed on windows-latest ONLY, with a real
> `EPERM ... rename` while a handle was held. Two things were wrong, neither visible on macOS:
> the retry window (10ms × 4 = 150ms) was a guess made on a platform where the failure cannot
> occur, now 25ms × 6 ≈ 1.575s; and the test released its handle with setTimeout, which can never
> fire because atomicWrite is synchronous and blocks the event loop for the whole window — the
> holder is now a separate process. This is exactly why the plan put CI before the Windows code.

> ADVERSARIAL DIFF REVIEW — 4 rounds. Every round found a real defect, so it was continued past
> the 2-round artifact cap; the FOURTH round's fix is UNREVIEWED.
> - R1 CRITICAL, a data-loss bug I wrote: the temp file used a predictable name opened for
>   TRUNCATING write, so an unrelated file at that path would be destroyed. Now a random suffix
>   created with flag 'wx'. Two tests added; both fail against the old code. Two WARNINGs also
>   accepted: the win32 test could pass without the child ever opening the file (it now waits for
>   a readiness signal on stdout), and release() could delete a lock another writer had taken
>   after a human cleared a supposedly stale one (each acquisition now writes a token and removes
>   the file only while that token is present; test fails without the guard).
> - R2 CRITICAL ×2: my spec said a temp collision "fails with EEXIST" while my code retried — the
>   spec described a mechanism, not the guarantee. Rewritten as three scenarios: bystander never
>   damaged, collision retried, retries bounded. And 'npm run coverage' did not enforce the
>   build.mjs threshold; folding it in with '&&' would have broken this project's own no-chaining
>   rule, which its own scaffold test caught at once — the reporter now runs the suite with
>   --experimental-test-coverage and inherits output, so one command does both.
> - R3 CRITICAL: I had widened the live spec to "every source file" while the script thresholds
>   only its listed child-process targets. Spec narrowed to what is enforced. UNREVIEWED.
