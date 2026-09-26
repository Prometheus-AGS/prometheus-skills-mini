# Verification evidence

Verified at the completed Compass change boundary in `/private/tmp/compass-fix`.
All Cargo commands used the checkout-local target/build directory and `--locked`.

## MCP integration

- `cargo test -p compass-mcp --test protocol_conformance`: 3 passed. The public
  stdio path accepted 2025-11-25, 2025-06-18 and 2025-03-26, completed a real
  `tools/list` on each session, and retained the explicit 2026-07-28 initialize
  refusal.
- `cargo test -p compass-mcp --test http_protocol_conformance`: 1 passed. The
  public Streamable HTTP path established each legacy session, carried the
  session id through notification and `tools/list`, and exercised malformed
  protocol headers. After the adversarial review correction, the same test also
  filled the configured legacy-session capacity and verified that the next
  initialize received HTTP 429 / MCP `-32024`.
- A fresh Compass process accepted all three legacy revisions in raw JSON-RPC
  probes and refused initialize for 2026-07-28 with the discovery instruction.
- The Boss's installed `@modelcontextprotocol/sdk@1.27.1` connected to the fresh
  Compass stdio process as 2025-11-25 and listed all 18 Compass tools.
- The installed pre-change binary refused legacy initialize, preserving the
  negative control from the handoff.

## Storage and Windows release boundary

- The remote-only Windows build first reproduced missing `ProjectionError`
  variants and `ProjectionLimits::validate_plan`. Adding `remote` to the shared
  production projection cfgs fixed that observed release defect.
- A host binary built with `--features surreal-remote` reported JSON, SQLite,
  Surreal and Surreal remote capabilities enabled; SurrealKV and RocksDB were
  disabled.
- Against `surrealdb/surrealdb:v3.2.4` on loopback, Compass published a scratch
  Rust graph through the remote engine and a subsequent remote search for
  `greeting` returned both written symbols. The temporary database container and
  scratch source were removed afterward.
- `cargo xwin build --target x86_64-pc-windows-msvc --release -p compass-cli
  --bin compass --features surreal-remote` completed in the optimized release
  profile after the bounded-session correction. The result is a PE32+ x86-64
  Windows console executable, 195,035,136
  bytes, SHA-256
  `7d1a3d717168ac7fefeafb73685971fe3306df023e67fbbcd1807b49c0b9a918`.

## Static boundary checks

- `cargo fmt --all -- --check`: passed.
- `cargo clippy -p compass-graphdb-surreal --features remote -- -D warnings`:
  passed.
- `cargo clippy -p compass-cli --lib --bin compass --features surreal-remote
  -- -D warnings`: passed.
- Host debug builds passed both without and with `surreal-remote`.
- Windows debug and optimized release builds passed with `surreal-remote`.
- `actionlint` passed for both modified workflows.
- `git diff --check`: passed.

## Independent review

- The first isolated review (`gpt-5.5`, producer `gpt-6-astra`, verified
  distinct through the local REST gateway) blocked on unbounded legacy HTTP
  session state.
- Compass now serializes legacy-session admission, caps simultaneous sessions
  at 64, and returns a distinct capacity error. The affected HTTP integration
  and focused MCP Clippy target passed after the correction.
- The second isolated review passed with one warning about retaining coverage
  for the combined SurrealKV/remote source-build profile. The Linux SurrealDB
  boundary keeps that combined compile check. Windows qualifies the official
  release profile instead: unconditional JSON and SQLite plus `surreal-remote`.
  Embedded SurrealKV is not shipped in the Windows release and remains covered
  once on Linux, where its filesystem locking contract is supported.
- A final isolated review covered the later CI-boundary and dependency-policy
  delta. After the packet was supplied the unchanged full-suite, Linux-combined,
  and Windows-NASM context, its one remaining actionable finding was accepted:
  `deny.toml` now records the same scoped `RUSTSEC-2026-0235` SurrealDB/rkyv
  exception as `cargo-audit`. The corrective commit received a verified-distinct
  PASS with 0 critical, 0 warning and 0 suggestion findings; the anti-theater
  screen passed.
- A later pass warned that the new network boundaries were absent from
  `SECURITY.md`. The final diff now documents legacy-session admission and the
  release binary's opt-in SurrealDB remote boundary. The final isolated review
  passed with zero findings; its anti-theater screen also passed.

The Windows release build emitted one existing `unused_mut` warning in
`compass-history`; it is unrelated to this change. Once the stale review CLI
scenarios no longer stopped the full suite, the handoff's `code_query_tools`
failure resolved to five pre-envelope fixtures still recording
`maxCandidates: 20` after upstream commit `393183cd` raised the public default
to 64. Only those fixture values were refreshed; the completed MCP query
integration then passed 13/13 and its isolated review passed with no findings.
The next full-suite boundary exposed the same upstream drift in the discovery
snapshot: six input-schema hashes include that default limit. Only those six
digests were refreshed; the local and real transport discovery integrations
then passed 2/2, and the fixture-only correction received a verified-distinct
review PASS with no findings.

The final full workspace integration boundary (`cargo test --workspace --test
'*' --locked`) passed with exit code 0. It exposed one last stale
`compass-query` integration assertion: production already reports `NO EXACT
MATCH` for a missing affected-query target, while the test still expected the
older ambiguity text. The focused integration passed 5/5 after aligning that
assertion. The rustfmt-normalized final commit `776108a9` received a
verified-distinct review PASS with no findings, and the anti-theater screen
passed.
