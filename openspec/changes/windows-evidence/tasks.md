## 1. Precondition

- [ ] 1.1 Confirm with the owner that a remote with GitHub Actions exists and that they have pushed; if not, STOP and report the phase as incomplete.

## 2. Observe

- [ ] 2.1 Record in `evidence/windows.md`, for Node 22 and Node 24 on `windows-latest`: `npm ci`; `node --test`; checkout under `core.autocrlf=true` followed by `node rules/build.mjs --check`; the CRLF parser tests; the real held-open `atomicWrite` test; the `wx` lock tests; `spawnNodeCli` with `shell: false`; `node scripts/spec-validate.mjs`.
- [ ] 2.2 For each row give the asserting test name, the run URL, the job name and the result.

## 3. Fix

- [ ] 3.1 For each failing row: reproduce with a failing test, commit it, fix at the root cause, commit the fix, and re-run. Update the owning capability's delta spec in the same commit when a requirement changes.
- [ ] 3.2 If the retry attempt count or delays needed tuning, record the observed timings that justified the new values.

## 4. Close

- [ ] 4.1 Move the `README.md` §9 entries this phase settles from "unverified" to a link to the evidence; leave every other entry untouched.
- [ ] 4.2 Mark any claim with no passing run as NOT MET with the reason.
- [ ] 4.3 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `docs: record windows-latest evidence for platform-foundation`. Do not push.
