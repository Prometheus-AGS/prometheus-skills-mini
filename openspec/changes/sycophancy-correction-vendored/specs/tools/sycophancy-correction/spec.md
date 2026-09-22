## ADDED Requirements

### Requirement: The vendored server is the post-fix fork commit, certified on three OSes
`tools/sycophancy-correction` SHALL be a submodule of `Prometheus-AGS/sycophancy-correction` at a commit that contains the four audit fixes, pinned in `versions.toml`. The mini's CI SHALL build and test it on `ubuntu-latest`, `macos-latest` and `windows-latest`. `bc348fff` SHALL NOT be the pin.

#### Scenario: The four fixes are present at the pin
- **WHEN** the submodule is inspected at the pinned commit
- **THEN** `skill.toml` and `crates/sycophancy-core/src/config.rs` default to `http://localhost:4000/v1`, `scripts/smoke-test.sh` does not exist and `scripts/smoke-test.mjs` does, `.github/workflows/ci.yml` and `.gitattributes` exist, `Cargo.toml` has `rust-version`, and no file references `ANTHROPIC_API_KEY` — asserted by a test in the mini that reads the submodule

#### Scenario: Windows certification is observed
- **WHEN** `sycophancy-certify` runs on `windows-latest`
- **THEN** `cargo test --workspace` passes and `target/release/sycophancy-correction.exe` exists; recorded in `evidence/windows.md`

### Requirement: The pack resolves the server without a shell and enforces the gateway rule
`lib/platform/sycophancy.mjs` SHALL resolve the binary from `SYCOPHANCY_BIN`, then `PATH`, then the submodule's release directory, refusing any script, and SHALL emit `{ command, args: ['--config', <skill.toml>] }`. The doctor check `mini.sycophancy-correction` (owned by change `pack-doctor`) SHALL consume this resolver by injection; its `warn`-when-absent and `fail`-on-foreign-gateway behaviour is specified there.

#### Scenario: A config pointing at :8181 fails the doctor
- **WHEN** a fixture `skill.toml` sets `base_url = "http://localhost:8181/v1"`
- **THEN** `mini.sycophancy-correction` is `fail` and names the file and the URL

#### Scenario: Absent is a warning naming the override
- **WHEN** nothing resolves
- **THEN** the check is `warn` and names `SYCOPHANCY_BIN`
