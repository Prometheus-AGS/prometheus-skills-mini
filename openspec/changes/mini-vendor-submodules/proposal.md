## Why

Goal B4. The mini's own resolvers already assume vendored source that does not exist yet:
`lib/doctor/runtime.mjs` `BUILT[]` checks `tools/openspec/dist` and
`tools/prometheus-knowledge/target/release/pk`; the sycophancy resolver is specified to search
`tools/sycophancy-correction/target/release/` "for developer checkouts"
(`sycophancy-correction-vendored` proposal); `docs/versions-toml.md` pins each gitlink by commit.
Only `tools/prometheus-knowledge` is actually vendored today, so three of those checks point at
nothing.

This is DISTINCT from how `the-boss` consumes these tools. the-boss downloads built artifacts
(`scripts/download-binaries.js` `TOOLS[]`); the mini vendors source, because it is where they are
built, resolved and pinned. compass and rust-mcp-filesystem are therefore vendored **twice,
differently** — that is the design, not a duplication.

## What Changes

- Add four submodules under `tools/`, each pinned to a RELEASED commit (never a branch tip):
  `compass` (GQAdonis/compass), `rust-mcp-filesystem` (GQAdonis/rust-mcp-filesystem),
  `openspec` (Prometheus-AGS/openspec), `sycophancy-correction` — **source repository unsettled**: it exists as
  `Know-Me-Tools/sycophancy-correction-skill` while the goals name `Prometheus-AGS`. Change
  `the-boss-release-infrastructure` task 4.1 settles it; this change uses whatever that decides.
- Each pin is a commit that EXISTS ON THE REMOTE. A submodule pinned to an unpushed SHA gives every
  other clone, and CI, a checkout it cannot fetch.
- `.gitmodules` entries use `https://` URLs, not `git@`, so a clone works without SSH keys in CI.
- Extend `rules/test/versions-toml.test.mjs`'s existing gitlink completeness check — it already
  fails when `HEAD` has a gitlink under `tools/` that `versions.toml` does not name, so the four
  new submodules make the operator's `versions.toml` obligation mechanical rather than remembered.

## Capabilities

### New Capabilities
- `project-tooling/vendored-submodules`: which tools are vendored as source, how each is pinned,
  and what "released commit" means.

### Modified Capabilities
<!-- none -->

## Impact

- New: four `tools/` submodules, `.gitmodules` entries, a test asserting each pin resolves.
- **Blocked on:** a release existing for each (change `the-boss-release-infrastructure` /
  operator). `sycophancy-correction` has NO release workflow at all and is the long pole.
- **Blocked on:** `versions.toml` being authored — agents may not write it (CLAUDE.md §0.2).
- Clone cost: four Rust/Node checkouts. Acceptable in the mini (a development repo); explicitly
  NOT acceptable in the-boss, which is why it downloads artifacts instead.

## Non-goals

- Building any of them. `mini-submodules` warns when a vendored artifact is unbuilt; it does not build.
- Changing how the-boss consumes them.
