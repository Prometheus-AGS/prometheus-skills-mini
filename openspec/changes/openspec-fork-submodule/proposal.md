## Why

The mini runs upstream `@fission-ai/openspec@1.10.0` from npm. The Prometheus fork (`Prometheus-AGS/OpenSpec`, 1.13.1, `d39ca5a`) is two commits ahead of upstream and one of them is a Windows fix the mini needs: on a CRLF checkout, upstream rewrites a whole spec file on every apply (21 insertions and 14 deletions for one added requirement); the fork preserves the file's line endings, and it spawns `npm` through its JavaScript entry rather than `npm.cmd`. The operator directed that the fork be vendored as a submodule.

A bare submodule is not enough: the fork's `dist/` is git-ignored and built by `node build.js` (its `prepare` script), and the two scaffold tests pin the current npm contract ("exact version, only dependency", "runs from its JavaScript entry"). An npm `file:` dependency would satisfy the resolver but creates a symlink in `node_modules`, which `config.yaml:18` forbids.

## What Changes

- Add submodule `tools/openspec` → `https://github.com/Prometheus-AGS/OpenSpec.git` at `d39ca5a` (the pin `versions.toml` names).
- Add `scripts/install.mjs` (the installer the README already names) with its first responsibility: build the submodule — `npm ci --ignore-scripts` then `node build.js` inside `tools/openspec`, both through `process.execPath` and npm's own `npm-cli.js` (resolved from `process.execPath`'s installation: `lib/node_modules/npm/bin/npm-cli.js` on POSIX, `node_modules/npm/bin/npm-cli.js` beside `node.exe` on Windows) — never `npm.cmd`, never a shell. `lib/platform/npm.mjs` owns that resolution.
- Extend `lib/platform/spawn.mjs` `resolveNodeCli`: before `require.resolve`, check `tools/<package-dir>/bin/<bin>.js` given a small map (`@fission-ai/openspec` → `tools/openspec`); a built submodule wins, an unbuilt one is a clear error naming `scripts/install.mjs`.
- Remove `@fission-ai/openspec` from `package.json`; the root ends with zero dependencies and `package-lock.json` reflects it.
- Rewrite the two scaffold tests deliberately: "the CLI comes from `tools/openspec` at the commit `versions.toml` names, and the root declares no dependencies"; "the CLI runs from `tools/openspec/bin/openspec.js` without a global install". Add a test that `node_modules` contains no symlink (`git ls-files -s` mode `120000` is not applicable to `node_modules`; use `lstat` over the top level).
- Exempt `tools/openspec` from the `.sh`-ban gate in `.kbd-orchestrator/constraints.md`, in its own commit, as `tools/prometheus-knowledge` is exempt.
- CI: `docs-pages.yml` is unaffected; `ci.yml` gains `node scripts/install.mjs --openspec-only` before `node --test` on all six legs, so the Windows build of the fork is observed, not assumed.

## Capabilities

### New Capabilities
- `project-tooling/openspec-cli`: where the OpenSpec CLI comes from, how it is built, and how it is resolved.

### Modified Capabilities
- `platform/spawn`: `resolveNodeCli` prefers a vendored tool directory.

## Impact

- `.gitmodules`, `tools/openspec` (gitlink), `scripts/install.mjs`, `lib/platform/npm.mjs`, `lib/platform/spawn.mjs`, `rules/test/scaffold.test.mjs`, `package.json`, `package-lock.json`, `.kbd-orchestrator/constraints.md`, `.github/workflows/ci.yml`.
- **Blocked until `versions.toml` exists** (change `review-housekeeping` §2 explains why) — the pin is read from it, not hardcoded twice.
- Security (A-3): `scripts/install.mjs` runs the fork's build; `--ignore-scripts` on `npm ci` keeps the fork's *dependencies'* lifecycle scripts from running; only the fork's own `build.js`, at a pinned commit, executes.

## Non-goals

- Publishing the fork to npm under a scoped name (recorded as the fallback in `analysis.md` Q4).
- Any change to the fork itself.
