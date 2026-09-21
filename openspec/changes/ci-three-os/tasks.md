## 1. Workflow

- [ ] 1.1 Write `.github/workflows/ci.yml`: triggers `push` and `pull_request`; `permissions: contents: read`; matrix of three operating systems × Node 22 and 24; `fail-fast: false`.
- [ ] 1.2 Windows-only step before checkout: `git config --global core.autocrlf true`.
- [ ] 1.3 Steps: `actions/checkout`, `actions/setup-node` with the matrix version and npm cache, `npm ci`, `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive`.

## 2. Verify locally

- [ ] 2.1 Parse the workflow as YAML with a short `node` one-off and assert the matrix, the four commands in order, and the permissions block.
- [ ] 2.2 Run the four commands locally in the listed order; all exit 0.
- [ ] 2.3 T2: `node --test`, `node rules/build.mjs --check`, `node node_modules/@fission-ai/openspec/bin/openspec.js validate --all --no-interactive` all exit 0.
- [ ] 2.4 Commit locally with an `Assisted-by` trailer and no `Signed-off-by`: `ci: add three-OS node 22/24 matrix`. Do not push.

## 3. Owner

- [ ] 3.1 State in the change summary that the workflow is UNVERIFIED until prerequisite P2 (a remote with GitHub Actions) exists; the agent does not create or push one.
