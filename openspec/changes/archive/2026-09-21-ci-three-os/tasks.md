## 1. Workflow

> RED (2026-09-21): `node --test rules/test/ci-workflow.test.mjs` → tests 7, pass 0, fail 7;
> every one `ENOENT: no such file or directory, open '.github/workflows/ci.yml'`.

- [x] 1.1 Write `.github/workflows/ci.yml`: triggers `push` and `pull_request`; `permissions: contents: read`; matrix of three operating systems × Node 22 and 24; `fail-fast: false`.
- [x] 1.2 Windows-only step before checkout: `git config --global core.autocrlf true`.
- [x] 1.3 Steps: `actions/checkout`, `actions/setup-node` with the matrix version and npm cache, `npm ci`, `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive`.

## 2. Verify locally

> GREEN (2026-09-21): 7/7 in `rules/test/ci-workflow.test.mjs`; full suite 28→35 tests, all passing.
> The workflow shape is asserted by test rather than by a YAML dependency (zero-runtime-dependency rule).
> Discrimination check: injecting `npx openspec validate` into a run line fails 2 of the 7 tests.

> Adversarial diff review (2026-09-21): round 1 BLOCK — `npm ci` uses npm.cmd on Windows; correct
> mechanism, overbroad requirement (narrowed, rationale in design.md). Round 2 BLOCK was a false positive
> (packet showed only this change's diff, so package.json from the archived project-scaffold was invisible);
> disproved by a clean clone of HEAD running all four commands green. Round 3 PASS, verified-distinct.

- [x] 2.1 Parse the workflow as YAML with a short `node` one-off and assert the matrix, the four commands in order, and the permissions block.
- [x] 2.2 Run the four commands locally in the listed order; all exit 0.
- [x] 2.3 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0.
- [x] 2.4 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `ci: add three-OS node 22/24 matrix`. Do not push.

## 3. Owner

- [x] 3.1 State in the change summary that the workflow is UNVERIFIED until prerequisite P2 (a remote with GitHub Actions) exists; the agent does not create or push one.
