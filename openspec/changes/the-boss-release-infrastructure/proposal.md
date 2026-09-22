## Why

Goal A. Nothing downstream can proceed without release artifacts, and today there are none:

| Fork | Releases | Workflows |
|---|---|---|
| `GQAdonis/compass` | 0 | `compass-release.yml` — mature: contract tests, licence checks, provenance attestation, BOTH Windows arches |
| `GQAdonis/rust-mcp-filesystem` | 0 | cargo-dist `release.yml`; gained `aarch64-pc-windows-msvc` in PR #1 |
| `Prometheus-AGS/openspec` | 0 | `release-prepare.yml` |
| `Know-Me-Tools/sycophancy-correction-skill` | 0 | **none at all** |

Three have working workflows that have simply never run. The fourth has no CI whatsoever and
cannot be "tagged and released" — it needs a pipeline built first. That asymmetry is the whole
shape of this change.

## What Changes

- **Run the three existing workflows**, compass first: it is the most mature, and a failure there
  predicts the others. Each produces a release whose assets are what `the-boss` will download.
- **Build release CI for `sycophancy-correction`** — the four Windows blockers already scoped in
  change `sycophancy-correction-vendored` task 1.2 (the `scripts/smoke-test.sh` rewrite, the
  `:8181` → `:4000/v1` gateway default in `skill.toml` and `config.rs`, missing CI /
  `rust-version` / `.gitattributes`, and the stale `ANTHROPIC_API_KEY` references), plus a
  cargo-dist or matrix workflow covering the same five targets.
- **Record each release's asset names and SHA-256s** where change `the-boss-binary-shipping` can
  consume them; that change's `TOOLS[]` entries cannot be written until these exist.

## Capabilities

### New Capabilities
- `project-tooling/fork-releases`: which forks publish artifacts, the platform/arch matrix every
  Rust artifact must cover, and what counts as a usable release.

### Modified Capabilities
<!-- none -->

## Impact

- Changes live in FOUR external repositories, not this one. This change tracks and verifies them.
- **A-11: tagging a release and creating CI on a shared repository are operator-authorized.** An
  agent prepares the branch and the PR; the operator tags, merges and runs.
- Blocks: `mini-vendor-submodules`, `the-boss-binary-shipping`.
- Security (A-3): a release workflow with publish rights is a real trust boundary. No workflow
  gains a secret it did not already have, and none is granted `contents: write` beyond what the
  existing files already declare.

## Non-goals

- Changing what any tool does. This is packaging only.
- Publishing to npm/crates.io/Homebrew beyond what each workflow already does.
