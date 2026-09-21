## 1. Atomic write

- [ ] 1.1 RED: write `lib/platform/atomic-write.test.mjs`: success, missing parent directories created, failure-leaves-original, and the four injected retry scenarios; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 1.2 GREEN: implement `lib/platform/atomic-write.mjs` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 1.3 RED: write a `win32`-only test that holds the destination open from a child `node` process and releases it after a short delay; on other platforms it is reported as skipped with the reason; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 1.4 GREEN: it passes on `win32` (first observable on CI) and skips elsewhere.
- [ ] 1.5 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): atomic write with bounded win32 rename retry`. Do not push.

## 2. Lock

- [ ] 2.1 RED: write `lib/platform/lock.test.mjs`: uncontended, contended, stale; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 2.2 GREEN: implement `lib/platform/lock.mjs` until the test passes; keep the module under 500 lines and free of any import from another `lib/platform/` module except `paths.mjs`.
- [ ] 2.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `feat(platform): exclusive-create lock`. Do not push.

## 3. Rules build under test

- [ ] 3.1 RED: write `rules/test/build.test.mjs` running `rules/build.mjs` against a fixture tree in `tempDir()`: drift detected, stale generated file removed, write path, second concurrent write run refused, lock released after a thrown error; run `node --test <that file>` and see it FAIL; commit the failing test on its own and paste the failure output under this task.
- [ ] 3.2 GREEN: replace the private `writeAtomic` with `atomicWrite`; take the lock around a write run only; refactor `rules/build.mjs` just enough to be importable by the test.
- [ ] 3.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `refactor(rules): write through lib/platform and guard with a lock`. Do not push.

## 4. Verify

- [ ] 4.1 `npm run coverage`: line coverage over `lib/platform/` and `rules/` is at least 80%, and `rules/build.mjs` appears in the report.
- [ ] 4.2 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0; constraints `no-shell-true`, `no-home-or-tmp-literals` and `no-console-log-in-lib` report clean.
