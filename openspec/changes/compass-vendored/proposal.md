## Why

The operator requires the `compass` fork — a Rust code-graph workbench with a CLI and an MCP server — in the mini and installed by `the-boss` as a platform-built Rust component. The audit (assessment addendum) finds it Windows-ready in a way no other candidate is: Windows is a *tested* CI target on two MSVC architectures, every Unix API is `cfg`-guarded, `HOME` falls back to `USERPROFILE`, and the stdio MCP path writes only JSON-RPC to stdout. Two facts constrain the change: the fork (`GQAdonis/compass`) is 37 commits ahead of upstream with **0 releases** and a dirty side-branch tree, while upstream ships MSVC tarballs on every release; and `compass serve --transport http` (binds `:8080`) and `compass watch` would each be a third resident process, which `config.yaml` forbids.

## What Changes

- Add submodule `tools/compass` → `https://github.com/GQAdonis/compass.git` at a **tagged clean commit on `main`** the operator creates (merging `docs/claude-md` first if those 37 commits are wanted); pinned in `versions.toml`; exempt from the no-shell gate (its `scripts/` are development tooling the binary never invokes).
- CI: a `compass-certify` job on the three OSes runs `cargo test -p compass-mcp -p compass-cli` in the submodule with the pinned toolchain `1.97.1`, NASM on Windows for `aws-lc-sys` as the fork's own workflow does — certification only; no user host ever builds compass.
- `lib/platform/compass.mjs`: resolve the binary (`COMPASS_BIN`, then `PATH`, refusing `.cmd`/`.ps1`), run `compass --version`, and expose `mcpServerConfig()` = `{ command: <resolved path>, args: ['serve', '--transport', 'stdio'] }` — the only configuration the pack ever emits.
- Doctor check `mini.compass` (in change `pack-doctor`'s registry, added by this change): binary resolvable and version reported (`warn` when absent); **`fail`** when any MCP registration the pack can see (the harness `.mcp.json`, the-boss's exported config if present) launches compass with `--transport http` or configures `compass watch`.
- `docs/guide/compass.md`: what it is, the stdio-only rule, the `.compass/config.toml` and `COMPASS_OUT` conventions, how the-boss ships it.
- Handoff item 10 (already written by change `the-boss-handoff` from `analysis.md` Q11; this change verifies it against the vendored tree, it does not append): the-boss downloads `compass-<target>.tar.gz` + `.sha256` from the fork's release at build time, verifies the digest, unpacks into `resources/compass/<target>/`, and registers the stdio server; the-boss's own doctor hosts `mini.compass`.

## Capabilities

### New Capabilities
- `tools/compass`: the pin, the certification, the resolver, the stdio-only rule and its enforcement.

### Modified Capabilities
- `doctor/checks`: one more check.

## Impact

- New: `.gitmodules` entry, `tools/compass` gitlink, `lib/platform/compass.mjs` + test, `lib/doctor/compass.mjs` + test, a CI job, `docs/guide/compass.md`; `constraints.md` exemption in its own commit.
- **Blocked** until the operator tags a clean fork commit and `versions.toml` names it; **the-boss shipping is blocked** until the fork's `compass-release.yml` has run on that tag (upstream's tarballs are usable for development only).
- Security (A-3): the MCP server reads source trees and writes `compass-out/`; it is launched only over stdio by a harness the user controls; the doctor's `fail` on HTTP transport is the enforcement of the two-service boundary at the one place it can be violated.
- Resource: the CI certification build is heavy (452k LOC, 944 packages, bundled SQLite, tree-sitter pack); cache `target/` per OS; user hosts pay nothing.

## Non-goals

- Running compass in the mini's own workflow (no hook invokes it; skills may call the MCP tools when a harness registers the server).
- SurrealDB-backed compass profiles (non-default features; the default build has no Surreal and does not attach to the pack's SurrealDB).
- The web UI, viewer, VS Code extension under `apps/`, `packages/`, `editors/`.
