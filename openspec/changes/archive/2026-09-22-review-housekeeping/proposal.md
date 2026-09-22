## Why

The child phase `the-boss-integration-prep` is grounded on two review inputs — `COMPARE.md` and `TOOL_ANALYSIS.md` — and on the OpenSpec change that produced the second, `analyze-rust-tools-windows-portability` (15/15 tasks ticked). All three are untracked in git, the change is unarchived, and it is unregistered in KBD. An assessment that cites files git does not hold is fragile; a completed change left active makes `openspec list` lie about what is open.

Separately, `CLAUDE.md` §0.2 requires reading `versions.toml` before any dependency decision, and the file has never existed. The analysis decided the operator authors it (agents may not edit it); this change gives that file a test that makes drift from the tree a failure, so the constitution's clause becomes checkable instead of aspirational.

## What Changes

- Commit `COMPARE.md`, `TOOL_ANALYSIS.md` and `openspec/changes/analyze-rust-tools-windows-portability/` as they are — another session's work, unmodified — then archive that change with the OpenSpec CLI so it moves under `openspec/changes/archive/`.
- Add `rules/lib/versions-toml.mjs`: `parseVersionsToml(text)` (a minimal reader for the documented shape, no dependency) and `compareToTree(parsed, { lsTree, packageJson })` returning a list of disagreements — the module the test below and the doctor's `mini.versions-toml` (change `pack-doctor`) both consume.
- Add `rules/test/versions-toml.test.mjs`, consuming that module: `versions.toml` exists at the root; every `[submodules]` entry names a path that `git ls-tree HEAD` shows as a gitlink at exactly that commit; `[node] minimum` equals `package.json` `engines.node`; every image entry has either a digest or an explicit `built_from_submodule = true`. The test is `todo` with the reason "operator has not authored versions.toml" until the file exists — the same pattern `lib/karpathy/hash.test.mjs` used for operator-supplied vectors.
- Document the file's shape in `docs/versions-toml.md` (the schema the test enforces), so the operator writes it once and correctly. The pins the analysis proposes are listed there as proposals, clearly labelled.

## Capabilities

### New Capabilities
- `project-tooling/versions-toml`: the version-authority file's shape and the test that binds it to the tree.

### Modified Capabilities
<!-- none -->

## Impact

- New tracked files: the two review documents and the archived change; `rules/test/versions-toml.test.mjs`; `docs/versions-toml.md`.
- No code under `lib/` or `scripts/` changes. No dependency.
- **The agent never writes `versions.toml`.** The change ends with the test in `todo` if the operator has not yet authored the file; that is the honest state, not a failure.

## Non-goals

- Registering `analyze-rust-tools-windows-portability` retroactively in KBD — it was never a KBD change; archiving it in OpenSpec is the record.
- Deciding any pin — the analysis proposed them; the operator decides.
