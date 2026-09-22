Each code task is test-first. Blocked until the operator tags a clean fork commit and `versions.toml` names it (see proposal).

## 0. Gate — versions.toml (operator-authored)

- [ ] 0.1 Before any task below: `node --test rules/test/versions-toml.test.mjs` reports the test **passing**, not `todo` — i.e. the operator has authored `versions.toml` and it agrees with the tree. If it is `todo`, stop and hand the phase back to the operator; do not proceed with a pin this file does not name.

## 1. Operator prerequisites (named, not performed here)

- [ ] 1.1 Operator: on `GQAdonis/compass`, merge or discard `docs/claude-md`, tag a clean `main` commit, run `compass-release.yml` on it; record the tag in `versions.toml`.

## 2. Submodule and certification

- [ ] 2.1 `git submodule add https://github.com/GQAdonis/compass.git tools/compass`; check out the tag; commit; exempt `tools/compass` from the no-shell gate in its own commit with the gate output pasted.
- [ ] 2.2 `ci.yml`: add `compass-certify` (three OSes; `rust-toolchain.toml` honoured; NASM via the fork's own step on Windows; `cargo test -p compass-mcp -p compass-cli`; `target/` cached per OS; `timeout-minutes` set). Record the first three green runs in `evidence/windows.md`.

## 3. Resolver and configuration

- [ ] 3.1 Write `lib/platform/compass.test.mjs` first: `COMPASS_BIN` precedence; `PATH` lookup refuses `.cmd`/`.ps1`; `--version` parsed; `mcpServerConfig()` shape and the no-port scan.
- [ ] 3.2 Write `lib/platform/compass.mjs`.

## 4. Doctor check

- [ ] 4.1 Write `lib/doctor/compass.test.mjs` first: absent → `warn`; present → `pass` with version; fixture registration with `--transport http` → `fail` naming file and flag; `compass watch` → `fail`.
- [ ] 4.2 Write `lib/doctor/compass.mjs` declaring **no `actions`** (the `pack-doctor` invariant "exactly `mini.skill-copies` declares an action" is preserved); register `mini.compass` in `lib/doctor/registry.mjs`; extend `lib/doctor/contract.test.mjs`'s expected check-id list by exactly `mini.compass` and confirm the actions invariant still passes.

## 5. Docs and handoff

- [ ] 5.1 Write `docs/guide/compass.md`; add the three the-boss items (download-verify-unpack, stdio registration, host `mini.compass`) to change `the-boss-handoff`'s document.

## 6. Close

- [ ] 6.1 Full battery; `.prometheus/decisions.md`: tagged-commit rule, stdio-only rule and where it is enforced.
