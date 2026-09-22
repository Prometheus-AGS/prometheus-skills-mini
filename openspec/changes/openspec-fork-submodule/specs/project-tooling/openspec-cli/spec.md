## ADDED Requirements

### Requirement: The OpenSpec CLI comes from the vendored fork, built on install, resolved by path
The OpenSpec CLI SHALL be the Prometheus fork vendored at `tools/openspec`, pinned to the commit `versions.toml` names. `scripts/install.mjs` SHALL build it with `npm ci --ignore-scripts` followed by `node build.js`, invoking npm by its JavaScript entry through `process.execPath` and never through `npm.cmd` or a shell. `resolveNodeCli` SHALL resolve the CLI from `tools/openspec/bin/openspec.js` when that file exists and SHALL raise an error naming `scripts/install.mjs` when the submodule is present but unbuilt. The root `package.json` SHALL declare no dependencies.

#### Scenario: A clean checkout runs spec validation after install
- **WHEN** the repository is cloned with submodules, `node scripts/install.mjs --openspec-only` runs, and then `node scripts/spec-validate.mjs` runs
- **THEN** validation reports the same totals as before this change, and `tools/openspec/dist` exists

#### Scenario: An unbuilt submodule is a clear error, not a module-not-found
- **WHEN** `tools/openspec` exists but `tools/openspec/dist` does not
- **THEN** `resolveNodeCli('@fission-ai/openspec', 'openspec')` throws an error whose message names `scripts/install.mjs`

#### Scenario: npm is never spawned as a script
- **WHEN** `lib/platform/npm.mjs` resolves npm's entry
- **THEN** the resolved path ends in `npm-cli.js`, the spawn program is `process.execPath`, and `shell` is `false` — asserted on every OS by the existing carried-mjs scan and a unit test with an injected `process.execPath` location

#### Scenario: The CRLF fix is observed on Windows
- **WHEN** on `windows-latest` a spec under a `core.autocrlf=true` checkout is applied once through the vendored CLI
- **THEN** `git diff --numstat` for that file shows only the added lines, not a whole-file rewrite

#### Scenario: No symlink enters node_modules
- **WHEN** the top level of `node_modules` is listed with `lstat` after install
- **THEN** no entry is a symbolic link

### Requirement: The vendored tree is exempt from the shell ban, and nothing else is
`.kbd-orchestrator/constraints.md`'s no-shell gate SHALL exclude `tools/openspec` by pathspec, in a commit of its own, and SHALL continue to cover `lib/`, `scripts/`, `hooks/`, `rules/` and `skills/`.

#### Scenario: The gate still catches a shell script outside tools/
- **WHEN** a scratch `scripts/x.sh` exists
- **THEN** the gate reports it, and with the file removed the gate is clean
