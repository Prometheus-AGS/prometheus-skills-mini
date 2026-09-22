Each code task is test-first. Blocked on the operator's fork and merge, then on `versions.toml`.

## 0. Gate — versions.toml (operator-authored)

- [ ] 0.1 Before any task below: `node --test rules/test/versions-toml.test.mjs` reports the test **passing**, not `todo` — i.e. the operator has authored `versions.toml` and it agrees with the tree. If it is `todo`, stop and hand the phase back to the operator; do not proceed with a pin this file does not name.

## 1. The fork commit (proposed as a PR the operator merges)

- [ ] 1.1 Operator: fork `Know-Me-Tools/sycophancy-correction-skill` → `Prometheus-AGS/sycophancy-correction`.
- [ ] 1.2 In a branch of the fork: repoint `skill.toml:73` and `crates/sycophancy-core/src/config.rs:166` to `http://localhost:4000/v1`; write `scripts/smoke-test.mjs` (spawn the binary, pipe `initialize` → `notifications/initialized` → `tools/call skill_info`, assert one JSON-RPC response per request, `.exe` on win32) and delete `scripts/smoke-test.sh`; add `.github/workflows/ci.yml` (three OSes, `cargo test --workspace`, `cargo build --release`), `rust-version = "1.85"` (or the MSRV `cargo msrv` reports — recorded), `.gitattributes`; remove `ANTHROPIC_API_KEY` from `.mcp.json`, `.mcp.dev.json`, the smoke test; fix `main.rs:7`. Open the PR; **do not merge** (A-11 — the operator merges).
- [ ] 1.3 After merge: record the commit in `versions.toml` (operator).

## 2. Submodule and certification

- [ ] 2.1 `git submodule add https://github.com/Prometheus-AGS/sycophancy-correction.git tools/sycophancy-correction` at the pin; exempt from the no-shell gate in its own commit.
- [ ] 2.2 Write `tools/sycophancy-correction.test.mjs` first (in `rules/test/`): the four-fixes assertion over the submodule tree.
- [ ] 2.3 `ci.yml`: `sycophancy-certify` on three OSes; cache `target/`; record runs in `evidence/windows.md`.

## 3. Resolver and doctor

- [ ] 3.1 Write `lib/platform/sycophancy.test.mjs` first: precedence, script refusal, `mcpServerConfig()` shape.
- [ ] 3.2 Write `lib/platform/sycophancy.mjs`.
- [ ] 3.3 Wire `lib/platform/sycophancy.mjs` into `pack-doctor`'s existing `mini.sycophancy-correction` check as its injected resolver (one-line change in `lib/doctor/tools.mjs`; its tests already cover absent → warn and `:8181` → fail).

## 4. Close

- [ ] 4.1 `docs/guide/sycophancy-correction.md`; full battery; `.prometheus/decisions.md`: baseline vs pin, the four fixes, the gateway rule.
