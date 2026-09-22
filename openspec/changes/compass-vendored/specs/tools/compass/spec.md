## ADDED Requirements

### Requirement: compass is vendored at a tagged fork commit and certified on three OSes without ever being built on a user host
`tools/compass` SHALL be a submodule of `GQAdonis/compass` at the tagged commit `versions.toml` names, never at an untagged or dirty checkout. The mini's CI SHALL build and test `compass-mcp` and `compass-cli` on `ubuntu-latest`, `macos-latest` and `windows-latest` with the toolchain the submodule pins. No script in the pack SHALL invoke `cargo` on a user's machine.

#### Scenario: The pin is a tag on main
- **WHEN** `versions.toml` names the compass commit
- **THEN** `git -C tools/compass tag --points-at HEAD` prints a tag and `git -C tools/compass merge-base --is-ancestor HEAD origin/main` succeeds

#### Scenario: Certification is observed on Windows
- **WHEN** the `compass-certify` job runs on `windows-latest`
- **THEN** `cargo test -p compass-mcp -p compass-cli` passes and the run is recorded in the phase's `evidence/windows.md`

### Requirement: The pack launches compass only as a stdio MCP server, and the doctor fails anything else
`lib/platform/compass.mjs` SHALL resolve the binary from `COMPASS_BIN` then `PATH`, refusing any script resolution, and SHALL emit exactly `{ command, args: ['serve', '--transport', 'stdio'] }` as the server configuration. The doctor check `mini.compass` SHALL declare no `actions` (preserving `pack-doctor`'s invariant that only `mini.skill-copies` offers a fix), SHALL report `warn` when the binary is absent, `pass` with the version when present, and `fail` when any visible MCP registration launches compass with `--transport http` or configures `compass watch`.

#### Scenario: HTTP transport is a doctor failure
- **WHEN** a fixture `.mcp.json` registers `compass serve --transport http`
- **THEN** `mini.compass` is `fail` and its summary names the file and the flag

#### Scenario: Absent is a warning with the shipping note
- **WHEN** no compass binary resolves
- **THEN** `mini.compass` is `warn` and its summary says the-boss ships it and names `COMPASS_BIN` as the override

#### Scenario: The emitted configuration has no port
- **WHEN** `mcpServerConfig()` is serialised
- **THEN** it contains no `http`, no `--port`, and no `watch`
