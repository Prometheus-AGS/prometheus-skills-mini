Each code task is test-first. A task that names a file either creates it or names the task that did.

## 1. Track and archive

- [x] 1.1 `git add COMPARE.md TOOL_ANALYSIS.md openspec/changes/analyze-rust-tools-windows-portability` and commit them unmodified, with a message naming the session that produced them as another session’s work.
  - Done in `351cf47`. Verified unmodified before committing: mtimes 03:26 / 03:53 (the other session’s), `git status --short` showed all three only as untracked, nothing staged from them was edited.
- [x] 1.2 Archive `analyze-rust-tools-windows-portability` with `node scripts/spec-validate.mjs`'s CLI (`spawnNodeCli('@fission-ai/openspec', 'openspec', ['archive', …])` — until change `openspec-fork-submodule` lands, the npm-pinned CLI); confirm `openspec list` no longer shows it and `openspec/changes/archive/` does.
  - Done via `spawnNodeCli("@fission-ai/openspec", "openspec", ["archive", "analyze-rust-tools-windows-portability", "--yes", "--skip-specs"])`, exit 0 — archived as `2026-09-22-analyze-rust-tools-windows-portability`. `--no-interactive` does **not** exist on `archive` (only `validate` has it); `--skip-specs` matches the change’s own `skip_specs: true`.
  - **Found while verifying:** `openspec list` still shows the PARENT phase’s two changes, `karpathy-progress-recorder` and `okf-v02-via-pk`, as `✓ Complete` but unarchived. Out of this task’s scope (this change tracks and archives the *analysis* change); recorded for the parent phase’s reflect stage, which is where a completed phase’s changes are archived.

## 2. versions.toml

- [x] 2.1 Write `docs/versions-toml.md`: the file's shape (`[node] minimum`, `[submodules] "<path>" = "<sha>"`, `[images] "<name>" = { image, digest | built_from_submodule }`, `[npm]` for `site/` pins), who writes it (the operator), and the proposed values from `analysis.md` Q1 labelled as proposals.
  - Written. Proposals table also carries Q1a (the two service submodules) and states plainly that `bc348fff` is the sycophancy **audit baseline**, not the pin.
- [x] 2.2 Write `rules/lib/versions-toml.test.mjs` first (unit: parser on fixture text; `compareToTree` with injected `lsTree` and `packageJson` returning named disagreements), then `rules/lib/versions-toml.mjs` exporting `parseVersionsToml` and `compareToTree` (no dependency).
  - RED first (`node --test rules/lib/versions-toml.test.mjs` → module not found), then GREEN 9/9. The parser implements only the documented subset and **raises** on arrays, arrays-of-tables, multi-line strings and a value before any table header — a version authority that silently drops an unparsed pin would be worse than one that refuses to load.
- [x] 2.2b Write `rules/test/versions-toml.test.mjs` consuming that module against the real tree: `git ls-tree HEAD <path>` spawned `shell: false`; `[node] minimum` vs `package.json` `engines.node`; every image has a digest or `built_from_submodule`; `{ todo: 'operator has not authored versions.toml' }` when the file is absent. Run it: `todo` today.
  - `node --test rules/test/versions-toml.test.mjs` → `tests 2 / pass 1 / fail 0 / todo 1`. The second test proves the gitlink reader is not vacuous: it finds `tools/prometheus-knowledge` and returns null for `lib/platform` (a plain directory) and a non-existent path.
- [x] 2.3 Mutation: with a scratch `versions.toml` naming a wrong pin, the test fails naming both commits; delete the scratch file; paste the output into the task.
  - Scratch `versions.toml` pinning `tools/prometheus-knowledge = "deadbee"`:
    ```
    ✖ versions.toml agrees with the tree
      AssertionError: versions.toml disagrees with the tree:
      tools/prometheus-knowledge: versions.toml pins deadbee, HEAD has abb6745e31da7577611d7c32005af26a72254484
    ```
    Both commits named, as the scenario requires. Scratch file deleted; `git status --short versions.toml` → empty; the test is `todo` again.

## 3. Close

- [x] 3.1 `node --test`, `node rules/build.mjs --check`, `node scripts/spec-validate.mjs`; record in `.prometheus/decisions.md` that the operator authors `versions.toml` and the test is the gate.
  - `node --test`: 378 tests, 375 pass, 0 fail, 2 skipped (Windows-only), 1 `todo` (the gate itself). `node rules/build.mjs --check`: 21 files current. `node scripts/spec-validate.mjs`: 20/20 (one fewer than before — the analysis change archived at 1.2). Four constraint gates re-run, all exit 1 (clean). Decisions entry written.
