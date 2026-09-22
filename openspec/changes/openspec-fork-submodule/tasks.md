Each code task is test-first. Blocked until `versions.toml` names the pin (change `review-housekeeping`).

## 0. Gate — versions.toml (operator-authored)

- [ ] 0.1 Before any task below: `node --test rules/test/versions-toml.test.mjs` reports the test **passing**, not `todo` — i.e. the operator has authored `versions.toml` and it agrees with the tree. If it is `todo`, stop and hand the phase back to the operator; do not proceed with a pin this file does not name.

## 1. Submodule

- [ ] 1.1 `git submodule add https://github.com/Prometheus-AGS/OpenSpec.git tools/openspec`; check out `d39ca5a` (the `versions.toml` value); commit the gitlink and `.gitmodules`.
- [ ] 1.2 Exempt `tools/openspec` from the no-shell gate in `.kbd-orchestrator/constraints.md` in its own commit; run the gate before and after (`git grep … ":!tools/prometheus-knowledge" ":!tools/openspec"`), paste both outputs.

## 2. npm without a shell

- [ ] 2.1 Write `lib/platform/npm.test.mjs` first: resolution order per platform with an injected `execPath`; `NPM_CLI_JS` override; refusal of any `.cmd`; the spawn helper passes `process.execPath` and `shell: false`.
- [ ] 2.2 Write `lib/platform/npm.mjs`.

## 3. Installer, first responsibility

- [ ] 3.1 Write `scripts/install.test.mjs` first (spawned, `shell: false`): `--openspec-only` on a temp copy with an unbuilt `tools/openspec` fixture runs `npm ci --ignore-scripts` then `node build.js` (both recorded through an injected spawn) and exits 0; an absent submodule exits 2 naming `git submodule update --init`.
- [ ] 3.1b Extend `scripts/install.test.mjs`: `--home` with an injected full-pack marker exits 2 and writes nothing; `--app-data <tmp>` with the same marker exits 0 and copies skills.
- [ ] 3.2 Write `scripts/install.mjs` with `--home`, `--app-data <dir>` (refusing `--home` when `detectFullPack()` reports present — `lib/platform/full-pack.mjs` from change `pack-doctor` task 2.0), `--openspec-only` and `--doctor` (spawns `scripts/doctor.mjs`, created by change `pack-doctor` task 3.2, at the end of an install; `skip`-with-reason when that file is absent); `--services` is added by change `docker-services` task 4.3.

## 4. Resolver

- [ ] 4.1 Extend `lib/platform/spawn.test.mjs` first: vendored-and-built → path under `tools/openspec`; vendored-and-unbuilt → error naming `scripts/install.mjs`; not vendored → existing behaviour.
- [ ] 4.2 Extend `resolveNodeCli` in `lib/platform/spawn.mjs` (stay under 500 lines; split `resolveNodeCli` into `lib/platform/spawn/resolve.mjs` if it does not).

## 5. Contract tests and the root manifest

- [ ] 5.1 Rewrite `rules/test/scaffold.test.mjs:34` and `:44` to the new contract; add the no-symlink `lstat` test; remove `@fission-ai/openspec` from `package.json`; regenerate `package-lock.json` with `npm install --package-lock-only` (through `lib/platform/npm.mjs`).
- [ ] 5.2 `ci.yml`: add `node scripts/install.mjs --openspec-only` before `node --test` on all legs; keep `node scripts/spec-validate.mjs` as the gate.

## 6. Windows evidence

- [ ] 6.1 Add the CRLF scenario as a test under `rules/test/` that runs only on `win32` (explicit `skip` reason elsewhere): create a temp git repo with `core.autocrlf=true`, a CRLF spec, apply one requirement through the vendored CLI, assert `git diff --numstat` shows additions only.
- [ ] 6.2 After the operator pushes, record in the child phase's `evidence/windows.md` the run and asserting test for: the build on `windows-latest`, the resolver, the CRLF scenario.

## 7. Close

- [ ] 7.1 Full battery; `.prometheus/decisions.md` entry: submodule over git-dependency, `--ignore-scripts` then explicit build, resolver precedence.
