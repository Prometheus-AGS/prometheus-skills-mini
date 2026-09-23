# rmcp 3.4.0 assessment

Operator requested the upgrade during A1 verification. Confirmed against crates.io metadata and the official tagged source: rmcp 3.4.0 was published 2026-09-15, is not yanked, and declares Rust 1.88 (Compass pins 1.97.1).

The [upstream changelog](https://github.com/modelcontextprotocol/rust-sdk/blob/rmcp-v3.4.0/crates/rmcp/CHANGELOG.md) identifies relevant improvements over 3.1.4:

- 3.2.0 fixes initialize negotiation so it only selects legacy lifecycle versions and allows concurrent Streamable HTTP requests.
- 3.3.0 adds ServerHandler::negotiate_initialize, avoiding duplicated negotiation logic in overrides.
- 3.4.0 fixes lifecycle-specific cancellation and first pre-initialize request dispatch, and introduces ServerConfig/ClientConfig aliases (deprecating ServerInfo/ClientInfo).

The upgrade alone cannot fix the original bug: Compass explicitly rejected initialize and advertised only 2026-07-28. The A1 acceptance list and legacy HTTP routing remain necessary. The Boss installed SDK 1.27.1 requests 2025-11-25. Compass now delegates legacy negotiation to the SDK helper while retaining the agreed modern initialize refusal.

The 3.1.4 verification process was terminated during linking after this steering request. It has no final result and must not be counted as passed. The 3.4.0 workspace all-target check passed (1m24s), workspace Clippy with warnings denied passed (6m18s), and formatting passed. The requested core/MCP suite is now running serially with one Cargo job to reduce linker contention. No Windows build or runtime interoperability claim is established by release notes alone.
