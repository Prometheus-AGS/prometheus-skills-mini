Four external repositories. Ordered by risk: the one that can fail in an unknown way goes first.

## 1. compass — the canary

- [ ] 1.1 Read `compass-release.yml` end to end and record what a successful run produces (asset names per target, the `.sha256` sidecar, the `compass-<target>/` strip prefix).
- [ ] 1.2 **Operator:** tag and run. Paste the run URL and the asset list. A failure here predicts the other two — triage before continuing.
- [ ] 1.3 Record each asset's SHA-256 for `the-boss-binary-shipping`.

## 2. rust-mcp-filesystem

- [ ] 2.1 **Operator:** merge GQAdonis/rust-mcp-filesystem#1 (adds `aarch64-pc-windows-msvc`). The release must be built AFTER this merge or the arm64 asset will not exist.
- [ ] 2.2 **Operator:** tag and run cargo-dist `release.yml`. Verify the matrix actually gained the arm64 Windows job — that is the claim PR #1 could not verify locally (`dist` was not installed).
- [ ] 2.3 Record asset names and SHA-256s.

## 3. openspec

- [ ] 3.1 **Operator:** run `release-prepare.yml`. Node package, so no platform matrix applies.
- [ ] 3.2 Record the released commit for `mini-vendor-submodules` task 2.3.

## 4. sycophancy-correction — the long pole

- [ ] 4.1 **Operator decision, then action:** the goals say this lands under `Prometheus-AGS`; the repository actually exists as `Know-Me-Tools/sycophancy-correction-skill` (operator-supplied, verified: Rust workspace, no workflows, 0 releases, not itself a fork). **The goal says `Prometheus-AGS`, so that is the default and the expected outcome:** fork or transfer to `Prometheus-AGS/sycophancy-correction` and work there. Keeping `Know-Me-Tools` instead is a GOAL CHANGE, not a task choice — it requires the operator to amend `goals.md` A-3 explicitly, and this task may not make that decision on their behalf. **Do not proceed with 4.2 until the target repository is settled** — the mini’s submodule URL and `versions.toml` pin both depend on it.
- [ ] 4.2 Fix the four blockers from `sycophancy-correction-vendored` task 1.2 in a branch: rewrite `scripts/smoke-test.sh` as `scripts/smoke-test.mjs` (no mkfifo, no `/tmp`, `.exe` on win32); repoint `skill.toml:73` and `crates/sycophancy-core/src/config.rs:166` to `http://localhost:4000/v1`; add `rust-version`, `.gitattributes`; remove stale `ANTHROPIC_API_KEY` references.
- [ ] 4.3 Add a release workflow covering the five targets with SHA-256 sidecars. Prefer cargo-dist for consistency with rust-mcp-filesystem.
- [ ] 4.4 Open the PR. **Do not merge** (A-11).
- [ ] 4.5 **Operator:** merge, tag, run. Record assets and digests.

## 5. Close

- [ ] 5.1 Assert all four have a non-empty `gh release list`; paste it. Record in `.prometheus/decisions.md` that the mini pins released commits only, and why.
