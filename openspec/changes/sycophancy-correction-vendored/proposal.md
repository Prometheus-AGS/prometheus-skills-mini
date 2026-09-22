## Why

The `adversarial-review` port (its own phase, per `config.yaml:88-90`) needs `sycophancy-correction` — a stdio MCP server — at review time on every host that runs the pack's CI. The hazard audit found the Rust clean on every Windows class and exactly four non-code blockers: `scripts/smoke-test.sh` (mkfifo, `/tmp`, no `.exe`), the `:8181` default in both `skill.toml:73` and `config.rs:166` (the excluded `openai-proxy`; the pack's gateway is `:4000/v1`), no CI / `rust-version` / `.gitattributes`, and stale `ANTHROPIC_API_KEY` references plus a doc line claiming a `--port` mode that does not exist. The audited commit `bc348fff` is the baseline; the landing pin is a fork commit that fixes those four.

## What Changes

- Operator prerequisite: fork `Know-Me-Tools/sycophancy-correction-skill` to `Prometheus-AGS/sycophancy-correction`.
- A fork commit (proposed as a PR the operator merges) with exactly the four fixes: repoint both defaults to `http://localhost:4000/v1`; replace the shell smoke test with `scripts/smoke-test.mjs` (spawn, stdin/stdout pipes, no fifo, `.exe` aware); add `.github/workflows/ci.yml` (three OSes, `cargo test --workspace`), `rust-version` in `Cargo.toml`, and `.gitattributes` (`* text=auto eol=lf`); remove the `ANTHROPIC_API_KEY` references from `.mcp.json`, `.mcp.dev.json` and the smoke test, and the `--port` doc line in `main.rs:7`.
- Add submodule `tools/sycophancy-correction` at that commit, pinned in `versions.toml`, exempt from the no-shell gate in its own commit.
- CI: `sycophancy-certify` on the three OSes runs `cargo test --workspace` in the submodule and builds the release binary; the Windows build is the certification the audit says is missing. No user host builds it.
- `lib/platform/sycophancy.mjs`: resolve the binary (`SYCOPHANCY_BIN`, then `PATH`, then `tools/sycophancy-correction/target/release/` for developer checkouts), refusing scripts; expose `mcpServerConfig()` = `{ command, args: ['--config', <path to skill.toml>] }`.
- The doctor check `mini.sycophancy-correction` is **owned by change `pack-doctor`**; this change only supplies the resolver (`lib/platform/sycophancy.mjs`) the check injects. No check is registered here.
- The stdio JSON-RPC client (`cand-303`) is **not** in this change — it belongs to `adversarial-review-node`; this change ships the server and the resolver.

## Capabilities

### New Capabilities
- `tools/sycophancy-correction`: the pin, the four fixes, the certification, the resolver, the gateway rule.

### Modified Capabilities
<!-- none: the doctor check is owned by pack-doctor and consumes this change's resolver by injection -->

## Impact

- New: `.gitmodules` entry, gitlink, `lib/platform/sycophancy.mjs` + test, CI job, `docs/guide/sycophancy-correction.md`; one-line wiring of the resolver into `pack-doctor`'s existing check; the fork PR lives in the fork's repository.
- **Blocked** on the operator's fork and merge, then on `versions.toml`.
- Security (A-3): the server sends prompts/completions to the gateway with `SYCOPHANCY_LLM_API_KEY` — a real boundary; the key stays in the environment, the resolver never logs it, and the doctor's `:4000` rule stops a config from pointing the server at an unlisted endpoint.

## Non-goals

- Calling the server from the mini (the review port does that).
- Any change to the server's Rust beyond the two default constants.
